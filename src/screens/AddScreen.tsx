// Add Screen: Camera & Multi-Select Upload, Resize Queue, AI Analysis & Tag Review
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  uploadGarmentPhoto,
  deleteGarmentPhoto,
  analyzeGarment,
  addGarment,
} from '../lib/api';
import {
  CATEGORIES,
  GARMENT_TYPES,
  COLOR_PALETTE,
  STYLES,
  PATTERNS,
  Category,
  GarmentType,
  Style,
  Pattern,
  Color,
} from '../config';
import { useTheme } from '../theme';

interface PendingGarment {
  id: string;
  localUri: string;
  storagePath?: string;
  signedUrl?: string;
  analyzing: boolean;
  error?: string;
  analysis?: {
    name: string;
    category: Category;
    garment_type: GarmentType;
    primary_color: Color;
    pattern: Pattern;
    style: Style;
    weave_knit: string;
    office_suitability: number;
    formal_meeting_suitability: number;
    pairing_rules?: any;
    raw_analysis?: any;
    analysis_model?: string;
    analysis_version?: string;
  };
}

interface AddScreenProps {
  onClose: () => void;
  onAddedSuccess: () => void;
}

export const AddScreen: React.FC<AddScreenProps> = ({ onClose, onAddedSuccess }) => {
  const { colors, isDark } = useTheme();

  const [queue, setQueue] = useState<PendingGarment[]>([]);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Request permissions and launch camera
  const handleLaunchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to capture garments.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      processSelectedAssets(result.assets);
    }
  };

  // Launch library with multi-select enabled
  const handleLaunchLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo gallery access is required to select garments.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      processSelectedAssets(result.assets);
    }
  };

  // Queue resize, upload and analysis
  const processSelectedAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const newItems: PendingGarment[] = assets.map((a, i) => ({
      id: `pending_${Date.now()}_${i}`,
      localUri: a.uri,
      analyzing: true,
    }));

    setQueue((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        // Step 1: Resize to 1024px & upload to private storage
        const { storagePath, signedUrl } = await uploadGarmentPhoto(item.localUri);

        // Update with storage path & signed URL
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, storagePath, signedUrl } : q
          )
        );

        // Step 2: Call analyze-garment Edge Function
        const analysis = await analyzeGarment(storagePath);

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  analyzing: false,
                  analysis: {
                    name: analysis.name || 'Men Garment',
                    category: analysis.category || 'top',
                    garment_type: analysis.garment_type || 'other',
                    primary_color: analysis.primary_color || 'white',
                    pattern: analysis.pattern || 'solid',
                    style: analysis.style || 'business_casual',
                    weave_knit: analysis.weave_knit || 'plain',
                    office_suitability: analysis.office_suitability ?? 0.5,
                    formal_meeting_suitability: analysis.formal_meeting_suitability ?? 0.5,
                    pairing_rules: analysis.pairing_rules,
                    raw_analysis: analysis.raw_analysis,
                    analysis_model: analysis.analysis_model,
                    analysis_version: analysis.analysis_version,
                  },
                }
              : q
          )
        );
      } catch (err: any) {
        console.error('Processing failed for item:', err);
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, analyzing: false, error: err.message || 'Analysis failed' }
              : q
          )
        );
      }
    }
  };

  const handleCancelItem = async (index: number) => {
    const item = queue[index];
    if (item.storagePath) {
      await deleteGarmentPhoto(item.storagePath).catch(console.error);
    }
    const updated = queue.filter((_, i) => i !== index);
    setQueue(updated);
    if (activeReviewIndex >= updated.length) {
      setActiveReviewIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleSaveItem = async (index: number) => {
    const item = queue[index];
    if (!item.analysis || !item.storagePath) return;

    setSaving(true);
    try {
      await addGarment({
        name: item.analysis.name,
        category: item.analysis.category,
        garment_type: item.analysis.garment_type,
        color: item.analysis.primary_color,
        pattern: item.analysis.pattern,
        weave_knit: item.analysis.weave_knit,
        style: item.analysis.style,
        office_suitability: item.analysis.office_suitability,
        formal_meeting_suitability: item.analysis.formal_meeting_suitability,
        pairing_rules: item.analysis.pairing_rules,
        raw_analysis: item.analysis.raw_analysis,
        analysis_model: item.analysis.analysis_model || 'gpt-4o-mini',
        analysis_version: item.analysis.analysis_version || 'v2',
        image_path: item.storagePath,
        active: true,
      });

      const updated = queue.filter((_, i) => i !== index);
      setQueue(updated);
      if (updated.length === 0) {
        onAddedSuccess();
        onClose();
      } else if (activeReviewIndex >= updated.length) {
        setActiveReviewIndex(Math.max(0, updated.length - 1));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const readyItems = queue.filter((q) => q.analysis && q.storagePath);
    if (readyItems.length === 0) return;

    setSaving(true);
    try {
      for (const item of readyItems) {
        if (!item.analysis || !item.storagePath) continue;
        await addGarment({
          name: item.analysis.name,
          category: item.analysis.category,
          garment_type: item.analysis.garment_type,
          color: item.analysis.primary_color,
          pattern: item.analysis.pattern,
          weave_knit: item.analysis.weave_knit,
          style: item.analysis.style,
          office_suitability: item.analysis.office_suitability,
          formal_meeting_suitability: item.analysis.formal_meeting_suitability,
          pairing_rules: item.analysis.pairing_rules,
          raw_analysis: item.analysis.raw_analysis,
          analysis_model: item.analysis.analysis_model || 'gpt-4o-mini',
          analysis_version: item.analysis.analysis_version || 'v2',
          image_path: item.storagePath,
          active: true,
        });
      }

      onAddedSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentItem = queue[activeReviewIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add to Wardrobe</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {queue.length === 0 ? (
        /* Empty / Initial State: Camera or Multi-Upload Buttons */
        <View style={styles.emptyState}>
          <View style={[styles.heroIconBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="camera-outline" size={48} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Catalog Your Pieces</Text>
          <Text style={[styles.emptySub, { color: colors.foregroundMuted }]}>
            Snap photos of your shirts, trousers, or shoes. Azure gpt-4o-mini analyzes each garment once with structured AI tags.
          </Text>

          <View style={styles.buttonStack}>
            <TouchableOpacity
              onPress={handleLaunchCamera}
              style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="camera" size={20} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Take a Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLaunchLibrary}
              style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="images-outline" size={20} color={colors.foreground} />
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                Upload Photos (Multi-Select)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Queue & Review Screen */
        <View style={styles.reviewContainer}>
          {/* Thumbnails Queue Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailQueue}
            contentContainerStyle={styles.thumbnailQueueContent}
          >
            {queue.map((item, idx) => {
              const isSelected = activeReviewIndex === idx;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setActiveReviewIndex(idx)}
                  style={[
                    styles.thumbnailItem,
                    isSelected && { borderColor: colors.accent, borderWidth: 2 },
                  ]}
                >
                  <Image source={{ uri: item.signedUrl || item.localUri }} style={styles.thumbImage} />
                  {item.analyzing && (
                    <View style={styles.thumbOverlay}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                  {item.error && (
                    <View style={[styles.thumbOverlay, { backgroundColor: 'rgba(239, 68, 68, 0.7)' }]}>
                      <Ionicons name="alert" size={14} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Garment Review Panel */}
          {currentItem && (
            <ScrollView style={styles.reviewScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.reviewHero}>
                <Image
                  source={{ uri: currentItem.signedUrl || currentItem.localUri }}
                  style={styles.reviewImage}
                  resizeMode="cover"
                />

                {currentItem.analyzing && (
                  <View style={[styles.analyzingOverlay, { backgroundColor: colors.cardOverlay }]}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={[styles.analyzingText, { color: colors.foreground }]}>
                      Analyzing garment with Azure gpt-4o-mini...
                    </Text>
                  </View>
                )}
              </View>

              {currentItem.analysis && (
                <View style={styles.formContainer}>
                  {/* Editable Name */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.foregroundMuted }]}>Item Name</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.cardBorder },
                      ]}
                      value={currentItem.analysis.name}
                      onChangeText={(val: string) => {
                        setQueue((prev) =>
                          prev.map((q, i) =>
                            i === activeReviewIndex && q.analysis
                              ? { ...q, analysis: { ...q.analysis, name: val } }
                              : q
                          )
                        );
                      }}
                    />
                  </View>

                  {/* Category Selector */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.foregroundMuted }]}>Category</Text>
                    <View style={styles.chipRow}>
                      {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => {
                            setQueue((prev) =>
                              prev.map((q, i) =>
                                i === activeReviewIndex && q.analysis
                                  ? { ...q, analysis: { ...q.analysis, category: cat } }
                                  : q
                              )
                            );
                          }}
                          style={[
                            styles.chip,
                            currentItem.analysis?.category === cat && { backgroundColor: colors.accent },
                            { borderColor: colors.cardBorder },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: currentItem.analysis?.category === cat ? '#ffffff' : colors.foreground },
                            ]}
                          >
                            {cat.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Garment Type Selector */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.foregroundMuted }]}>Garment Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                      {GARMENT_TYPES.map((gt) => (
                        <TouchableOpacity
                          key={gt}
                          onPress={() => {
                            setQueue((prev) =>
                              prev.map((q, i) =>
                                i === activeReviewIndex && q.analysis
                                  ? { ...q, analysis: { ...q.analysis, garment_type: gt } }
                                  : q
                              )
                            );
                          }}
                          style={[
                            styles.chip,
                            currentItem.analysis?.garment_type === gt && { backgroundColor: colors.accent },
                            { borderColor: colors.cardBorder },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: currentItem.analysis?.garment_type === gt ? '#ffffff' : colors.foreground },
                            ]}
                          >
                            {gt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Style Tag Selector */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.foregroundMuted }]}>Style</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                      {STYLES.map((st) => (
                        <TouchableOpacity
                          key={st}
                          onPress={() => {
                            setQueue((prev) =>
                              prev.map((q, i) =>
                                i === activeReviewIndex && q.analysis
                                  ? { ...q, analysis: { ...q.analysis, style: st } }
                                  : q
                              )
                            );
                          }}
                          style={[
                            styles.chip,
                            currentItem.analysis?.style === st && { backgroundColor: colors.accent },
                            { borderColor: colors.cardBorder },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: currentItem.analysis?.style === st ? '#ffffff' : colors.foreground },
                            ]}
                          >
                            {st.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Actions for current item: Save Item, Cancel Item */}
                  <View style={styles.itemActionRow}>
                    <TouchableOpacity
                      onPress={() => handleSaveItem(activeReviewIndex)}
                      disabled={saving}
                      style={[styles.saveItemBtn, { backgroundColor: colors.accent }]}
                    >
                      {saving ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.saveItemBtnText}>Save This Garment</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCancelItem(activeReviewIndex)}
                      style={[styles.cancelItemBtn, { borderColor: colors.danger }]}
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                      <Text style={[styles.cancelItemBtnText, { color: colors.danger }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Bottom Bar: Save All */}
          {queue.length > 1 && (
            <View style={[styles.bottomSaveAllBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                onPress={handleSaveAll}
                disabled={saving}
                style={[styles.saveAllBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.saveAllBtnText}>Save All ({queue.length}) Garments</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 54,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  buttonStack: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewContainer: {
    flex: 1,
  },
  thumbnailQueue: {
    maxHeight: 74,
    marginBottom: 12,
  },
  thumbnailQueueContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  thumbnailItem: {
    width: 56,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reviewHero: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  analyzingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  formContainer: {
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  horizontalScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  itemActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  saveItemBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveItemBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelItemBtn: {
    width: 90,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cancelItemBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSaveAllBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveAllBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAllBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
