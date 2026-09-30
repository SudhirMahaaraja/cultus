// 2-Column Responsive Card Grid for Garments (3:4 Aspect Ratio)
import React from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  Dimensions,
} from 'react-native';
import { Garment } from '../lib/api';
import { GarmentCard } from './GarmentCard';
import { useTheme } from '../theme';

interface CardGridProps {
  garments: Garment[];
  onSelectGarment?: (garment: Garment) => void;
  emptyMessage?: string;
  ListHeaderComponent?: React.ReactElement | null;
}

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GAP = 12;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GAP) / 2;

export const CardGrid: React.FC<CardGridProps> = ({
  garments,
  onSelectGarment,
  emptyMessage = 'No garments found.',
  ListHeaderComponent,
}) => {
  const { colors } = useTheme();

  return (
    <FlatList
      data={garments}
      keyExtractor={(item: Garment) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.contentContainer}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.foregroundMuted }]}>
            {emptyMessage}
          </Text>
        </View>
      }
      renderItem={({ item }: { item: Garment }) => (
        <View style={{ width: CARD_WIDTH }}>
          <GarmentCard
            garment={item}
            aspectRatio={3 / 4}
            onPress={onSelectGarment ? () => onSelectGarment(item) : undefined}
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 8,
    paddingBottom: 110,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: GAP,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
