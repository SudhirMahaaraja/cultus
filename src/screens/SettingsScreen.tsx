// Settings Screen: Theme Switcher, Blocked Outfits with Restore, Re-Analyze & Sign Out
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import {
  fetchBlockedOutfits,
  unblockOutfit,
  fetchGarments,
  analyzeGarment,
  updateGarment,
  Garment,
} from '../lib/api';
import { APP_CONFIG } from '../config';
import { useTheme, ThemeMode } from '../theme';

interface SettingsScreenProps {
  onSignOut: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onSignOut }) => {
  const { colors, mode, setMode } = useTheme();

  const [userEmail, setUserEmail] = useState('');
  const [blockedList, setBlockedList] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);

  // Re-analyze state
  const [olderGarments, setOlderGarments] = useState<Garment[]>([]);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
    loadBlocked();
    checkOlderGarments();
  }, []);

  const loadBlocked = async () => {
    setLoadingBlocked(true);
    try {
      const blocked = await fetchBlockedOutfits();
      setBlockedList(blocked);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const checkOlderGarments = async () => {
    try {
      const all = await fetchGarments();
      const older = all.filter(
        (g) => (g.analysis_version || 'v1') !== APP_CONFIG.currentAnalysisVersion
      );
      setOlderGarments(older);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRestoreOutfit = async (feedbackId: string) => {
    try {
      await unblockOutfit(feedbackId);
      await loadBlocked();
      Alert.alert('Restored', 'This outfit combination can now be suggested again.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleReanalyzeAll = async () => {
    if (olderGarments.length === 0) return;

    Alert.alert(
      'Re-Analyze Garments',
      `Upgrade ${olderGarments.length} garments to analysis version ${APP_CONFIG.currentAnalysisVersion}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Now',
          onPress: async () => {
            setReanalyzing(true);
            try {
              for (const g of olderGarments) {
                const analysis = await analyzeGarment(g.image_path);
                await updateGarment(g.id, {
                  name: analysis.name || g.name,
                  garment_type: analysis.garment_type || g.garment_type,
                  office_suitability: analysis.office_suitability ?? g.office_suitability,
                  formal_meeting_suitability: analysis.formal_meeting_suitability ?? g.formal_meeting_suitability,
                  analysis_version: APP_CONFIG.currentAnalysisVersion,
                  raw_analysis: analysis.raw_analysis,
                });
              }
              await checkOlderGarments();
              Alert.alert('Complete', 'All older garments upgraded successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setReanalyzing(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          onSignOut();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerSub, { color: colors.foregroundMuted }]}>
          Preferences & Governance
        </Text>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
      </View>

      {/* Theme Selection Card */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
        <Text style={[styles.sectionSub, { color: colors.foregroundMuted }]}>
          Both light and dark themes feature custom sartorial mesh backgrounds.
        </Text>

        <View style={styles.themeRow}>
          {(['system', 'dark', 'light'] as ThemeMode[]).map((t) => {
            const isSelected = mode === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setMode(t)}
                style={[
                  styles.themeButton,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.muted,
                    borderColor: isSelected ? colors.accent : colors.cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name={
                    t === 'system'
                      ? 'phone-portrait-outline'
                      : t === 'dark'
                      ? 'moon-outline'
                      : 'sunny-outline'
                  }
                  size={18}
                  color={isSelected ? '#ffffff' : colors.foreground}
                />
                <Text
                  style={[
                    styles.themeBtnText,
                    {
                      color: isSelected ? '#ffffff' : colors.foreground,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Re-Analyze Older Items Card */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>AI Model Version</Text>
          <View style={[styles.badge, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
            <Text style={[styles.badgeText, { color: colors.accent }]}>
              {APP_CONFIG.currentAnalysisVersion}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionSub, { color: colors.foregroundMuted }]}>
          {olderGarments.length > 0
            ? `${olderGarments.length} garments were analyzed on an older prompt version.`
            : 'All garments are up-to-date with current structured analysis prompts.'}
        </Text>

        {olderGarments.length > 0 && (
          <TouchableOpacity
            onPress={handleReanalyzeAll}
            disabled={reanalyzing}
            style={[styles.reanalyzeBtn, { backgroundColor: colors.accent }]}
          >
            {reanalyzing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#ffffff" />
                <Text style={styles.reanalyzeBtnText}>
                  Re-Analyze {olderGarments.length} Older Items
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Blocked Outfits with Restore Card */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Blocked Combinations ({blockedList.length})
        </Text>
        <Text style={[styles.sectionSub, { color: colors.foregroundMuted }]}>
          Combinations marked 'Don't suggest' are excluded from daily ranking.
        </Text>

        {loadingBlocked ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
        ) : blockedList.length === 0 ? (
          <Text style={[styles.emptyBlocked, { color: colors.foregroundMuted }]}>
            No combinations currently blocked.
          </Text>
        ) : (
          <View style={styles.blockedList}>
            {blockedList.map((item) => (
              <View
                key={item.id}
                style={[styles.blockedItem, { borderColor: colors.cardBorder, backgroundColor: colors.muted }]}
              >
                <View style={styles.blockedInfo}>
                  <Text style={[styles.blockedText, { color: colors.foreground }]} numberOfLines={1}>
                    {item.shirt?.name || 'Top'} + {item.bottom?.name || 'Bottom'} + {item.footwear?.name || 'Shoes'}
                  </Text>
                  <Text style={[styles.blockedSub, { color: colors.foregroundMuted }]}>
                    Blocked on {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleRestoreOutfit(item.id)}
                  style={[styles.restoreBtn, { borderColor: colors.accent }]}
                >
                  <Text style={[styles.restoreBtnText, { color: colors.accent }]}>Restore</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Account & Sign Out */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account</Text>
        <Text style={[styles.sectionSub, { color: colors.foregroundMuted }]}>
          Signed in as {userEmail || 'Active User'}
        </Text>

        <TouchableOpacity
          onPress={handleSignOut}
          style={[styles.signOutBtn, { borderColor: colors.danger }]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[styles.signOutBtnText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    marginBottom: 20,
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
  sectionCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  themeBtnText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reanalyzeBtn: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  reanalyzeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBlocked: {
    fontSize: 13,
    fontStyle: 'italic',
    marginVertical: 4,
  },
  blockedList: {
    gap: 8,
  },
  blockedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  blockedInfo: {
    flex: 1,
    marginRight: 10,
  },
  blockedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  blockedSub: {
    fontSize: 11,
    marginTop: 2,
  },
  restoreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  signOutBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
