// History Screen: Confirmed Outfits by Date with Thumbnails and Wear Stats
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchHistory, fetchGarments, Garment } from '../lib/api';
import { useTheme } from '../theme';

const { width } = Dimensions.get('window');
const THUMB_SIZE = (width - 40 - 24) / 3;

export const HistoryScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [history, setHistory] = useState<any[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [histData, garmData] = await Promise.all([
        fetchHistory(),
        fetchGarments(),
      ]);
      setHistory(histData);
      setGarments(garmData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Compute most and least worn items
  const sortedByWear = [...garments].sort((a, b) => b.wear_count - a.wear_count);
  const mostWorn = sortedByWear.length > 0 && sortedByWear[0].wear_count > 0 ? sortedByWear[0] : null;
  const leastWorn = sortedByWear.length > 0 ? sortedByWear[sortedByWear.length - 1] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerSub, { color: colors.foregroundMuted }]}>
          Wear Record & Rotation
        </Text>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Outfit History</Text>
      </View>

      {/* Rotation Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statHeader}>
            <Ionicons name="flame" size={16} color="#f59e0b" />
            <Text style={[styles.statLabel, { color: colors.foregroundMuted }]}>Most Worn</Text>
          </View>
          {mostWorn ? (
            <View style={styles.statContent}>
              <Text style={[styles.statName, { color: colors.foreground }]} numberOfLines={1}>
                {mostWorn.name}
              </Text>
              <Text style={[styles.statCount, { color: colors.accent }]}>
                {mostWorn.wear_count} times
              </Text>
            </View>
          ) : (
            <Text style={[styles.statEmpty, { color: colors.foregroundMuted }]}>No logs yet</Text>
          )}
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statHeader}>
            <Ionicons name="time" size={16} color={colors.foregroundMuted} />
            <Text style={[styles.statLabel, { color: colors.foregroundMuted }]}>Needs Wear</Text>
          </View>
          {leastWorn ? (
            <View style={styles.statContent}>
              <Text style={[styles.statName, { color: colors.foreground }]} numberOfLines={1}>
                {leastWorn.name}
              </Text>
              <Text style={[styles.statCount, { color: colors.foregroundMuted }]}>
                {leastWorn.wear_count} times
              </Text>
            </View>
          ) : (
            <Text style={[styles.statEmpty, { color: colors.foregroundMuted }]}>No logs yet</Text>
          )}
        </View>
      </View>

      {/* Confirmed History Outfits */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={44} color={colors.foregroundMuted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No logged outfits yet</Text>
          <Text style={[styles.emptySub, { color: colors.foregroundMuted }]}>
            Confirm your first outfit on the Today tab with 'Wear this'.
          </Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {history.map((item) => (
            <View
              key={item.id}
              style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              {/* Date and Badges Row */}
              <View style={styles.historyHeader}>
                <View>
                  <Text style={[styles.historyDate, { color: colors.foreground }]}>
                    {new Date(item.worn_on).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  {item.source === 'manual' && (
                    <Text style={[styles.sourceBadge, { color: colors.foregroundMuted }]}>
                      Manual Selection
                    </Text>
                  )}
                </View>

                {item.ai_score && (
                  <View style={[styles.scoreBadge, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <Text style={[styles.scoreBadgeText, { color: colors.accent }]}>
                      {item.ai_score}% Match
                    </Text>
                  </View>
                )}
              </View>

              {/* 3 Thumbnails: Shirt, Bottom, Shoes */}
              <View style={styles.thumbsRow}>
                <View style={[styles.thumbBox, { width: THUMB_SIZE, height: THUMB_SIZE * (4 / 3) }]}>
                  {item.top?.signed_url ? (
                    <Image source={{ uri: item.top.signed_url }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.thumbPlaceholder, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.thumbCatText, { color: colors.foregroundMuted }]}>Top</Text>
                    </View>
                  )}
                  <Text style={[styles.thumbCaption, { color: colors.foregroundMuted }]} numberOfLines={1}>
                    {item.top?.name || 'Top'}
                  </Text>
                </View>

                <View style={[styles.thumbBox, { width: THUMB_SIZE, height: THUMB_SIZE * (4 / 3) }]}>
                  {item.bottom?.signed_url ? (
                    <Image source={{ uri: item.bottom.signed_url }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.thumbPlaceholder, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.thumbCatText, { color: colors.foregroundMuted }]}>Bottom</Text>
                    </View>
                  )}
                  <Text style={[styles.thumbCaption, { color: colors.foregroundMuted }]} numberOfLines={1}>
                    {item.bottom?.name || 'Bottom'}
                  </Text>
                </View>

                <View style={[styles.thumbBox, { width: THUMB_SIZE, height: THUMB_SIZE * (4 / 3) }]}>
                  {item.shoes?.signed_url ? (
                    <Image source={{ uri: item.shoes.signed_url }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.thumbPlaceholder, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.thumbCatText, { color: colors.foregroundMuted }]}>Shoes</Text>
                    </View>
                  )}
                  <Text style={[styles.thumbCaption, { color: colors.foregroundMuted }]} numberOfLines={1}>
                    {item.shoes?.name || 'Shoes'}
                  </Text>
                </View>
              </View>

              {item.ai_reason && (
                <Text style={[styles.reasonSnippet, { color: colors.foregroundMuted }]} numberOfLines={2}>
                  {item.ai_reason}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statContent: {
    marginTop: 2,
  },
  statName: {
    fontSize: 13,
    fontWeight: '700',
  },
  statCount: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  statEmpty: {
    fontSize: 12,
    marginTop: 4,
  },
  centerContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  historyList: {
    gap: 16,
  },
  historyCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  sourceBadge: {
    fontSize: 11,
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  thumbsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  thumbBox: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '80%',
    borderRadius: 14,
  },
  thumbPlaceholder: {
    width: '100%',
    height: '80%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCatText: {
    fontSize: 11,
    fontWeight: '600',
  },
  thumbCaption: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  reasonSnippet: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});
