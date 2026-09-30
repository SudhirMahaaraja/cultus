// Wardrobe Screen: Category Chips, 14+ Days Filter, Grid/Stack Toggle, and Detail Modal
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardGrid } from '../components/CardGrid';
import { CardStack } from '../components/CardStack';
import { Garment, fetchGarments, updateGarment, retireGarment } from '../lib/api';
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

const STORAGE_VIEW_KEY = '@cultus_wardrobe_view_mode';

export const WardrobeScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | Category>('all');
  const [filter14Days, setFilter14Days] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'stack'>('grid');

  // Edit / Details Modal State
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<GarmentType>('other');
  const [editStyle, setEditStyle] = useState<Style>('business_casual');
  const [editOfficeSuitability, setEditOfficeSuitability] = useState<number>(0.5);
  const [editFormalSuitability, setEditFormalSuitability] = useState<number>(0.5);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadWardrobe();
    AsyncStorage.getItem(STORAGE_VIEW_KEY).then((v: string | null) => {
      if (v === 'grid' || v === 'stack') setViewMode(v);
    });
  }, []);

  const loadWardrobe = async () => {
    setLoading(true);
    try {
      const items = await fetchGarments();
      setGarments(items);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleViewMode = () => {
    const nextMode = viewMode === 'grid' ? 'stack' : 'grid';
    setViewMode(nextMode);
    AsyncStorage.setItem(STORAGE_VIEW_KEY, nextMode).catch(() => {});
  };

  const openDetails = (garment: Garment) => {
    setSelectedGarment(garment);
    setEditName(garment.name);
    setEditType(garment.garment_type);
    setEditStyle(garment.style || 'business_casual');
    setEditOfficeSuitability(garment.office_suitability ?? 0.5);
    setEditFormalSuitability(garment.formal_meeting_suitability ?? 0.5);
  };

  const handleSaveOverrides = async () => {
    if (!selectedGarment) return;
    setSavingEdit(true);
    try {
      const userOverrides = {
        ...(selectedGarment.user_overrides || {}),
        garment_type: editType,
        style: editStyle,
        office_suitability: editOfficeSuitability,
        formal_meeting_suitability: editFormalSuitability,
      };

      await updateGarment(selectedGarment.id, {
        name: editName,
        garment_type: editType,
        style: editStyle,
        office_suitability: editOfficeSuitability,
        formal_meeting_suitability: editFormalSuitability,
        user_overrides: userOverrides,
      });

      setSelectedGarment(null);
      await loadWardrobe();
      Alert.alert('Saved', 'Garment details and overrides updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRetire = async () => {
    if (!selectedGarment) return;
    Alert.alert(
      'Retire Garment',
      'This garment will be hidden and excluded from future outfit suggestions, but its wear history will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retire Item',
          style: 'destructive',
          onPress: async () => {
            try {
              await retireGarment(selectedGarment.id);
              setSelectedGarment(null);
              await loadWardrobe();
              Alert.alert('Retired', 'Garment retired successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Filter garments
  const now = Date.now();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  const filteredGarments = garments.filter((g) => {
    if (selectedCategory !== 'all' && g.category !== selectedCategory) {
      return false;
    }
    if (filter14Days) {
      if (!g.last_worn_at) return true;
      const diff = now - new Date(g.last_worn_at).getTime();
      return diff >= fourteenDaysMs;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerSub, { color: colors.foregroundMuted }]}>
            {garments.length} Items Cataloged
          </Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Wardrobe</Text>
        </View>

        {/* View Switcher: Grid vs 3D Stack */}
        <TouchableOpacity
          onPress={toggleViewMode}
          style={[styles.modeToggle, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <Ionicons
            name={viewMode === 'grid' ? 'layers-outline' : 'grid-outline'}
            size={18}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Filter and Category Chips */}
      <View style={styles.chipsSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {/* Category Chips */}
          {(['all', 'top', 'bottom', 'shoes'] as const).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.card,
                    borderColor: isSelected ? colors.accent : colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? '#ffffff' : colors.foreground,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {cat === 'all' ? 'All Pieces' : cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* 14+ Days Not Worn Filter Chip */}
          <TouchableOpacity
            onPress={() => setFilter14Days((prev) => !prev)}
            style={[
              styles.chip,
              styles.filterChip,
              {
                backgroundColor: filter14Days ? 'rgba(99, 102, 241, 0.2)' : colors.card,
                borderColor: filter14Days ? colors.accent : colors.cardBorder,
              },
            ]}
          >
            <Ionicons
              name={filter14Days ? 'funnel' : 'funnel-outline'}
              size={13}
              color={filter14Days ? colors.accent : colors.foregroundMuted}
            />
            <Text
              style={[
                styles.chipText,
                { color: filter14Days ? colors.accent : colors.foregroundMuted },
              ]}
            >
              Not Worn in 14+ Days
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content: Grid or 3D Vertical Stack */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : viewMode === 'grid' ? (
        <CardGrid
          garments={filteredGarments}
          onSelectGarment={openDetails}
          emptyMessage="No garments match your active filters."
        />
      ) : (
        <CardStack
          garments={filteredGarments}
          onSelectGarment={openDetails}
          emptyMessage="No garments match your active filters."
        />
      )}

      {/* Garment Details & Tag Editing Modal */}
      <Modal visible={!!selectedGarment} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Garment Details</Text>
              <TouchableOpacity onPress={() => setSelectedGarment(null)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {selectedGarment && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Photo Preview & Wear Stats Badge */}
                <View style={styles.modalHero}>
                  {selectedGarment.signed_url && (
                    <Image
                      source={{ uri: selectedGarment.signed_url }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={[styles.heroStatsRow, { backgroundColor: colors.cardOverlay }]}>
                    <Text style={[styles.heroStatsText, { color: colors.foreground }]}>
                      Worn {selectedGarment.wear_count} times
                    </Text>
                    <Text style={[styles.heroStatsText, { color: colors.foregroundMuted }]}>
                      {selectedGarment.last_worn_at
                        ? `Last: ${new Date(selectedGarment.last_worn_at).toLocaleDateString()}`
                        : 'Never worn'}
                    </Text>
                  </View>
                </View>

                {/* Editable Name */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foregroundMuted }]}>Name</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.cardBorder },
                    ]}
                    value={editName}
                    onChangeText={setEditName}
                  />
                </View>

                {/* Garment Type Selector */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foregroundMuted }]}>Garment Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                    {GARMENT_TYPES.map((gt) => (
                      <TouchableOpacity
                        key={gt}
                        onPress={() => setEditType(gt)}
                        style={[
                          styles.subChip,
                          editType === gt && { backgroundColor: colors.accent },
                          { borderColor: colors.cardBorder },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subChipText,
                            { color: editType === gt ? '#ffffff' : colors.foreground },
                          ]}
                        >
                          {gt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Style Selector */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foregroundMuted }]}>Style Tag</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                    {STYLES.map((st) => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setEditStyle(st)}
                        style={[
                          styles.subChip,
                          editStyle === st && { backgroundColor: colors.accent },
                          { borderColor: colors.cardBorder },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subChipText,
                            { color: editStyle === st ? '#ffffff' : colors.foreground },
                          ]}
                        >
                          {st.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Suitability Ratings (1-10) */}
                <View style={styles.ratingsRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.label, { color: colors.foregroundMuted }]}>
                      Office Fit ({editOfficeSuitability}/10)
                    </Text>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        onPress={() => setEditOfficeSuitability((p) => Math.max(1, p - 1))}
                        style={[styles.stepperBtn, { backgroundColor: colors.muted }]}
                      >
                        <Ionicons name="remove" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperVal, { color: colors.foreground }]}>
                        {editOfficeSuitability}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setEditOfficeSuitability((p) => Math.min(10, p + 1))}
                        style={[styles.stepperBtn, { backgroundColor: colors.muted }]}
                      >
                        <Ionicons name="add" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.label, { color: colors.foregroundMuted }]}>
                      Formal Fit ({editFormalSuitability}/10)
                    </Text>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        onPress={() => setEditFormalSuitability((p) => Math.max(1, p - 1))}
                        style={[styles.stepperBtn, { backgroundColor: colors.muted }]}
                      >
                        <Ionicons name="remove" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperVal, { color: colors.foreground }]}>
                        {editFormalSuitability}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setEditFormalSuitability((p) => Math.min(10, p + 1))}
                        style={[styles.stepperBtn, { backgroundColor: colors.muted }]}
                      >
                        <Ionicons name="add" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Save and Retire Buttons */}
                <TouchableOpacity
                  onPress={handleSaveOverrides}
                  disabled={savingEdit}
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                >
                  {savingEdit ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Tag Overrides</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRetire}
                  style={[styles.retireBtn, { borderColor: colors.danger }]}
                >
                  <Ionicons name="archive-outline" size={16} color={colors.danger} />
                  <Text style={[styles.retireBtnText, { color: colors.danger }]}>
                    Retire Garment (Preserve Wear History)
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsSection: {
    marginBottom: 12,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalScroll: {
    flex: 1,
  },
  modalHero: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  heroStatsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatsText: {
    fontSize: 12,
    fontWeight: '600',
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
  typeRow: {
    flexDirection: 'row',
  },
  subChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
  },
  subChipText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  ratingsRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  retireBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  retireBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
