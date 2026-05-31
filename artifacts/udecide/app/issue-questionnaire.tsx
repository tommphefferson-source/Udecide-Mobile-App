import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  getQuestionnaires,
  type IssueQuestionnaire,
} from "@/services/questionnairesApi";

export default function IssueQuestionnaireScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { authToken } = useAuth();

  const [questionnaires, setQuestionnaires] = useState<IssueQuestionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Local-only record of the stance the user taps per question (questionId ->
  // option index). Stances are not submitted upstream — this is informational.
  const [stances, setStances] = useState<Record<string, number>>({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getQuestionnaires();
      setQuestionnaires(data);
      setSelectedId((prev) =>
        prev && data.some((q) => q.id === prev) ? prev : (data[0]?.id ?? null),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => questionnaires.find((q) => q.id === selectedId) ?? null,
    [questionnaires, selectedId],
  );

  function selectStance(questionId: string, optionIndex: number) {
    setStances((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.screenTitle}>Issue Questionnaire</Text>
        <Text style={styles.screenSubtitle}>
          Explore where you stand on the issues
        </Text>
      </LinearGradient>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState
          message="We couldn't load the questionnaire right now."
          onRetry={() => void load()}
        />
      ) : questionnaires.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="ballot" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No Questions
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No issue questions are available right now.
          </Text>
        </View>
      ) : (
        <>
          <View
            style={[
              styles.filterContainer,
              { backgroundColor: colors.card, borderBottomColor: colors.border },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}
            >
              {questionnaires.map((item) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.topicChip,
                      active && { backgroundColor: colors.accent },
                      {
                        borderColor: active ? colors.accent : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => setSelectedId(item.id)}
                  >
                    <Text
                      style={[
                        styles.topicChipText,
                        { color: active ? "#FFF" : colors.mutedForeground },
                      ]}
                    >
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 16,
              gap: 14,
              paddingBottom: bottomPad,
            }}
            showsVerticalScrollIndicator={false}
          >
            {selected?.questions.map((question, qIdx) => (
              <View
                key={question.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.questionNumber, { color: colors.accent }]}>
                  Question {qIdx + 1}
                </Text>
                <Text style={[styles.questionText, { color: colors.foreground }]}>
                  {question.prompt}
                </Text>
                <View style={styles.optionsWrap}>
                  {question.options.map((option, oIdx) => {
                    const chosen = stances[question.id] === oIdx;
                    return (
                      <Pressable
                        key={`${question.id}-${oIdx}`}
                        style={({ pressed }) => [
                          styles.option,
                          {
                            borderColor: chosen ? colors.accent : colors.border,
                            backgroundColor: chosen
                              ? colors.accent + "12"
                              : pressed
                                ? colors.muted
                                : "transparent",
                          },
                        ]}
                        onPress={() => selectStance(question.id, oIdx)}
                      >
                        <MaterialIcons
                          name={
                            chosen
                              ? "radio-button-checked"
                              : "radio-button-unchecked"
                          }
                          size={20}
                          color={chosen ? colors.accent : colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.optionText,
                            {
                              color: chosen
                                ? colors.foreground
                                : colors.mutedForeground,
                            },
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <View
              style={[
                styles.neutralityCard,
                { backgroundColor: colors.navy + "10", borderColor: colors.border },
              ]}
            >
              <MaterialIcons name="info-outline" size={18} color={colors.navy} />
              <Text
                style={[styles.neutralityText, { color: colors.mutedForeground }]}
              >
                Your selections are kept on this device to help you reflect on
                where you stand. UDecide does not rank or endorse any stance.
              </Text>
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  backBtn: { marginBottom: 8 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  filterContainer: { paddingVertical: 10, borderBottomWidth: 1 },
  topicChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  topicChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  questionNumber: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  questionText: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  optionsWrap: { gap: 8, marginTop: 2 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 19 },
  neutralityCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  neutralityText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
