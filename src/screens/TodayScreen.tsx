// Today Screen: Daily Context Switch, AI Suggestions, Wear This, and Manual Change
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GarmentCard } from '../components/GarmentCard';
import { CardStack } from '../components/CardStack';
import {
  Garment,
  OutfitRecommendation,
  suggestOutfit,
  confirmOutfit,
  rejectOutfit,
  blockOutfitTriple,
  fetchConfirmedOutfitForDate,
  saveManualOutfit,
  fetchGarments,
  saveOfficeDay,
} from '../lib/api';
import { useTheme } from '../theme';

const { width } = Dimensions.get('window');
const TRIPLE_CARD_WIDTH = (width - 48 - 16) / 3;

export const TodayScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [todayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isOfficeDay, setIsOfficeDay] = useState(true);
  const [isFormalMeeting, setIsFormalMeeting] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [confirmedOutfit, setConfirmedOutfit] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'row' | 'stack'>('row');

  // Manual Change Modal State
  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [allGarments, setAllGarments] = useState<Garment[]>([]);
  const [manualTop, setManualTop] = useState<Garment | null>(null);
  const [manualBottom, setManualBottom] = useState<Garment | null>(null);
  const [manualShoes, setManualShoes] = useState<Garment | null>(null);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    setLoading(true);
    try {
      // 1. Check if an outfit is already confirmed today
      const alreadyConfirmed = await fetchConfirmedOutfitForDate(todayDate);
      if (alreadyConfirmed) {
        setConfirmedOutfit(alreadyConfirmed);
      } else {
        // 2. Fetch fresh recommendation
        await fetchSuggestions(isFormalMeeting);
      }
    } catch (err: any) {
      console.error('Error loading today data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (formal: boolean) => {
    setGenerating(true);
    try {
      const recs = await suggestOutfit({
        meeting_type: formal ? 'formal' : 'regular',
        meeting_notes: meetingNotes,
        date: todayDate,
      });
      setRecommendations(recs);
      setCurrentIndex(0);
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Could not generate suggestions. Ensure wardrobe has clothes added.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleFormal = (formal: boolean) => {
    setIsFormalMeeting(formal);
    saveOfficeDay({
      date: todayDate,
      is_office_day: isOfficeDay,
      meeting_status: formal ? 'yes' : 'no',
      meeting_type: formal ? 'formal' : 'regular',
      meeting_notes: meetingNotes,
    }).catch(console.error);

    if (!confirmedOutfit) {
      fetchSuggestions(formal);
    }
  };

  const handleToggleOfficeDay = (office: boolean) => {
    setIsOfficeDay(office);
    saveOfficeDay({
      date: todayDate,
      is_office_day: office,
      meeting_status: isFormalMeeting ? 'yes' : 'no',
      meeting_type: isFormalMeeting ? 'formal' : 'regular',
      meeting_notes: meetingNotes,
    }).catch(console.error);
  };

  const currentOutfit = recommendations[currentIndex];

  const handleWearThis = async () => {
    if (!currentOutfit) return;
    try {
      await confirmOutfit(currentOutfit.outfit_id, todayDate);
      const updated = await fetchConfirmedOutfitForDate(todayDate);
      setConfirmedOutfit(updated);
      Alert.alert('Logged', 'Outfit confirmed and wear history updated!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to confirm outfit');
    }
  };

  const handleShowAnother = async () => {
    if (!currentOutfit) return;
    try {
      if (currentOutfit.outfit_id) {
        await rejectOutfit(currentOutfit.outfit_id);
      }
      if (currentIndex + 1 < recommendations.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Re-generate list excluding today's rejected
        fetchSuggestions(isFormalMeeting);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleBlockTriple = async () => {
    if (!currentOutfit) return;
    Alert.alert(
      "Don't Suggest This Triple",
      'Cultus will never recommend this exact combination of shirt, trousers, and footwear again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block Combination',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockOutfitTriple(
                currentOutfit.shirt_id,
                currentOutfit.bottom_id,
                currentOutfit.footwear_id
              );
              handleShowAnother();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const openManualChangeModal = async () => {
    try {
      const garments = await fetchGarments();
      setAllGarments(garments);
      if (confirmedOutfit) {
        setManualTop(confirmedOutfit.top);
        setManualBottom(confirmedOutfit.bottom);
        setManualShoes(confirmedOutfit.shoes);
      }
      setChangeModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const saveManualChange = async () => {
    if (!manualTop || !manualBottom || !manualShoes) {
      Alert.alert('Missing Garment', 'Please select a top, bottom, and shoes.');
      return;
    }

    try {
      await saveManualOutfit(manualTop.id, manualBottom.id, manualShoes.id, todayDate);
      const updated = await fetchConfirmedOutfitForDate(todayDate);
      setConfirmedOutfit(updated);
      setChangeModalVisible(false);
      Alert.alert('Updated', "Today's outfit updated manually.");
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.foregroundMuted }]}>
          Loading your sartorial plan...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Date & Controls */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.dateSub, { color: colors.foregroundMuted }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Today's Look</Text>
        </View>

        {/* View Toggle (Row vs 3D Stack) */}
        <TouchableOpacity
          onPress={() => setViewMode((prev) => (prev === 'row' ? 'stack' : 'row'))}
          style={[styles.modeToggle, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <Ionicons
            name={viewMode === 'row' ? 'layers-outline' : 'grid-outline'}
            size={18}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Context Control Card */}
      <View style={[styles.contextCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {/* Office Day Toggle */}
        <View style={styles.contextRow}>
          <View style={styles.contextLabelCol}>
            <Text style={[styles.contextTitle, { color: colors.foreground }]}>Office Day</Text>
            <Text style={[styles.contextSub, { color: colors.foregroundMuted }]}>
              {isOfficeDay ? 'Work attire active' : 'Day off / remote'}
            </Text>
          </View>
          <Switch
            value={isOfficeDay}
            onValueChange={handleToggleOfficeDay}
            trackColor={{ false: colors.muted, true: colors.accent }}
            thumbColor="#ffffff"
          />
        </View>

        {isOfficeDay && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Regular Day vs Formal Meeting Switch */}
            <View style={styles.contextRow}>
              <View style={styles.contextLabelCol}>
                <Text style={[styles.contextTitle, { color: colors.foreground }]}>Formal Meeting</Text>
                <Text style={[styles.contextSub, { color: colors.foregroundMuted }]}>
                  {isFormalMeeting ? 'Elevated corporate contrast' : 'Smart office regular'}
                </Text>
              </View>
              <Switch
                value={isFormalMeeting}
                onValueChange={handleToggleFormal}
                trackColor={{ false: colors.muted, true: colors.accent }}
                thumbColor="#ffffff"
              />
            </View>
          </>
        )}
      </View>

      {!isOfficeDay ? (
        <View style={[styles.dayOffCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="sunny-outline" size={40} color={colors.accent} />
          <Text style={[styles.dayOffTitle, { color: colors.foreground }]}>No Office Today</Text>
          <Text style={[styles.dayOffSub, { color: colors.foregroundMuted }]}>
            Enjoy your day off or relaxed remote work routine.
          </Text>
        </View>
      ) : confirmedOutfit ? (
        /* Worn Today View */
        <View style={styles.wornSection}>
          <View style={styles.wornBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            <Text style={styles.wornBadgeText}>WORN TODAY</Text>
          </View>

          {/* Outfit Cards Row */}
          <View style={styles.outfitRow}>
            {confirmedOutfit.top && (
              <View style={{ width: TRIPLE_CARD_WIDTH }}>
                <GarmentCard garment={confirmedOutfit.top} aspectRatio={3 / 4} showCategoryBadge />
              </View>
            )}
            {confirmedOutfit.bottom && (
              <View style={{ width: TRIPLE_CARD_WIDTH }}>
                <GarmentCard garment={confirmedOutfit.bottom} aspectRatio={3 / 4} showCategoryBadge />
              </View>
            )}
            {confirmedOutfit.shoes && (
              <View style={{ width: TRIPLE_CARD_WIDTH }}>
                <GarmentCard garment={confirmedOutfit.shoes} aspectRatio={3 / 4} showCategoryBadge />
              </View>
            )}
          </View>

          {/* Stylist Rationale */}
          <View style={[styles.rationaleBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.rationaleTitle, { color: colors.foreground }]}>Stylist Note</Text>
            <Text style={[styles.rationaleText, { color: colors.foregroundMuted }]}>
              {confirmedOutfit.ai_reason}
            </Text>
          </View>

          {/* Change Option Button */}
          <TouchableOpacity
            onPress={openManualChangeModal}
            style={[styles.secondaryButton, { backgroundColor: colors.muted, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="repeat" size={18} color={colors.foreground} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              Change Outfit Manually
            </Text>
          </TouchableOpacity>
        </View>
      ) : generating ? (
        <View style={styles.generatingBox}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.generatingText, { color: colors.foregroundMuted }]}>
            Curating best combination for {isFormalMeeting ? 'Formal Meeting' : 'Regular Day'}...
          </Text>
        </View>
      ) : currentOutfit ? (
        /* Active Recommendation Display */
        <View style={styles.recommendationSection}>
          {/* Match Score & Candidate Counter */}
          <View style={styles.scoreRow}>
            <View style={[styles.scorePill, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Ionicons name="sparkles" size={14} color={colors.accent} />
              <Text style={[styles.scoreText, { color: colors.accent }]}>
                {currentOutfit.ai_score}% Match
              </Text>
            </View>
            <Text style={[styles.candidateCounter, { color: colors.foregroundMuted }]}>
              Option {currentIndex + 1} of {recommendations.length}
            </Text>
          </View>

          {/* Garments Display: 3 Cards Row vs 3D Stack */}
          {viewMode === 'row' ? (
            <View style={styles.outfitRow}>
              <View style={{ width: TRIPLE_CARD_WIDTH }}>
                <GarmentCard garment={currentOutfit.top} aspectRatio={3 / 4} showCategoryBadge />
              </View>
              <View style={{ width: TRIPLE_CARD_WIDTH }}>
                <GarmentCard garment={currentOutfit.bottom} aspectRatio={3 / 4} showCategoryBadge />
              </View>
              <View style={{ width: TRIPLE_CARD_WIDTH }}>
                <GarmentCard garment={currentOutfit.shoes} aspectRatio={3 / 4} showCategoryBadge />
              </View>
            </View>
          ) : (
            <View style={{ height: 420 }}>
              <CardStack
                garments={[currentOutfit.top, currentOutfit.bottom, currentOutfit.shoes]}
              />
            </View>
          )}

          {/* Rationale & Wearing Tips */}
          <View style={[styles.rationaleBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.rationaleTitle, { color: colors.foreground }]}>Stylist Rationale</Text>
            <Text style={[styles.rationaleText, { color: colors.foregroundMuted }]}>
              {currentOutfit.ai_reason}
            </Text>

            {currentOutfit.ai_tips && currentOutfit.ai_tips.length > 0 && (
              <View style={styles.tipsList}>
                {currentOutfit.ai_tips.map((tip, idx) => (
                  <View key={idx} style={styles.tipItem}>
                    <Ionicons name="checkmark-outline" size={15} color={colors.accent} />
                    <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Action Buttons: Wear This, Show Another, Don't Suggest This */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={handleWearThis}
              style={[styles.primaryActionBtn, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="checkmark" size={20} color="#ffffff" />
              <Text style={styles.primaryActionBtnText}>Wear this</Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleShowAnother}
                style={[styles.actionBtnHalf, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Ionicons name="arrow-forward" size={17} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Show another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleBlockTriple}
                style={[styles.actionBtnHalf, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Ionicons name="close-circle-outline" size={17} color={colors.danger} />
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Don't suggest</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyWardrobe}>
          <Ionicons name="shirt-outline" size={44} color={colors.foregroundMuted} />
          <Text style={[styles.emptyWardrobeTitle, { color: colors.foreground }]}>
            Wardrobe needs items
          </Text>
          <Text style={[styles.emptyWardrobeSub, { color: colors.foregroundMuted }]}>
            Add a top, bottom, and shoes via the '+' button to get smart suggestions.
          </Text>
        </View>
      )}

      {/* Manual Change Modal */}
      <Modal visible={changeModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Pick Today's Garments</Text>
              <TouchableOpacity onPress={() => setChangeModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.pickerCategoryTitle, { color: colors.foreground }]}>Select Top</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPicker}>
                {allGarments.filter((g) => g.category === 'top').map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setManualTop(g)}
                    style={[
                      styles.pickCard,
                      manualTop?.id === g.id && { borderColor: colors.accent, borderWidth: 2 },
                    ]}
                  >
                    <GarmentCard garment={g} aspectRatio={3 / 4} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.pickerCategoryTitle, { color: colors.foreground }]}>Select Bottom</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPicker}>
                {allGarments.filter((g) => g.category === 'bottom').map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setManualBottom(g)}
                    style={[
                      styles.pickCard,
                      manualBottom?.id === g.id && { borderColor: colors.accent, borderWidth: 2 },
                    ]}
                  >
                    <GarmentCard garment={g} aspectRatio={3 / 4} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.pickerCategoryTitle, { color: colors.foreground }]}>Select Shoes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPicker}>
                {allGarments.filter((g) => g.category === 'shoes').map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setManualShoes(g)}
                    style={[
                      styles.pickCard,
                      manualShoes?.id === g.id && { borderColor: colors.accent, borderWidth: 2 },
                    ]}
                  >
                    <GarmentCard garment={g} aspectRatio={3 / 4} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            <TouchableOpacity
              onPress={saveManualChange}
              style={[styles.primaryActionBtn, { backgroundColor: colors.accent, marginTop: 14 }]}
            >
              <Text style={styles.primaryActionBtnText}>Confirm Manual Outfit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  dateSub: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  screenTitle: {
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
  contextCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextLabelCol: {
    flex: 1,
  },
  contextTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  contextSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  dayOffCard: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  dayOffTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  dayOffSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  wornSection: {
    alignItems: 'center',
  },
  wornBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  wornBadgeText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  outfitRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  candidateCounter: {
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationSection: {
    width: '100%',
  },
  rationaleBox: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 18,
  },
  rationaleTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  rationaleText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  tipsList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    gap: 6,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  actionsContainer: {
    gap: 10,
  },
  primaryActionBtn: {
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
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnHalf: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  generatingBox: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingText: {
    marginTop: 14,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyWardrobe: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWardrobeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyWardrobeSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '80%',
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
  pickerCategoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  horizontalPicker: {
    flexDirection: 'row',
  },
  pickCard: {
    width: 110,
    marginRight: 10,
    borderRadius: 24,
    overflow: 'hidden',
  },
});
