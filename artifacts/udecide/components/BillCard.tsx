import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Bill } from "@/types/politics";
import { formatDateShort } from "@/utils/formatters";

interface BillCardProps {
  bill: Bill;
  onPress?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  Enrolled: "#2E7D32",
  "Signed": "#2E7D32",
  "Passed House": "#1A4A8A",
  "Passed Senate": "#1A4A8A",
  "Passed": "#1A4A8A",
  "In Committee": "#D4AF37",
  "Failed": "#C41E3A",
  "Vetoed": "#C41E3A",
};

export function BillCard({ bill, onPress }: BillCardProps) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[bill.status] ?? colors.mutedForeground;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={[styles.numberBadge, { backgroundColor: colors.navy + "15" }]}>
          <Text style={[styles.number, { color: colors.navy }]}>{bill.number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <Text
            style={[styles.statusText, { color: statusColor }]}
            numberOfLines={1}
          >
            {bill.status}
          </Text>
        </View>
      </View>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {bill.title}
      </Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
        {bill.description}
      </Text>
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <MaterialIcons name="event" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {formatDateShort(bill.lastActionDate)}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialIcons name="info-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {bill.lastAction}
          </Text>
        </View>
      </View>
      {onPress ? (
        <View style={styles.viewMore}>
          <Text style={[styles.viewMoreText, { color: colors.accent }]}>View Details</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.accent} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  numberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  number: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 1,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 21,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  footer: {
    gap: 4,
    marginTop: 2,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  viewMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  viewMoreText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
