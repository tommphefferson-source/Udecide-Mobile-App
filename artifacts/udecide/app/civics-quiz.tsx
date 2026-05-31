import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useColors } from "@/hooks/useColors";
import { getQuiz, type QuizQuestion } from "@/services/quizApi";

export default function CivicsQuizScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  const correctColor = "#2E7D32";
  const wrongColor = colors.red;

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const quiz = await getQuiz();
      setQuestions(quiz.questions);
      setIndex(0);
      setSelected(null);
      setScore(0);
      setFinished(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  const current = questions[index];
  const total = questions.length;
  const answered = selected !== null;

  const scoreLabel = useMemo(() => {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    if (pct === 100) return "Perfect score!";
    if (pct >= 75) return "Great job!";
    if (pct >= 50) return "Nice effort!";
    return "Keep learning!";
  }, [score, total]);

  function handleSelect(optionIndex: number) {
    if (answered || !current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(optionIndex);
    if (optionIndex === current.answerIndex) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function handleRestart() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.navy, colors.navyLight]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.screenTitle}>Civics 101 Quiz</Text>
        <Text style={styles.screenSubtitle}>
          {loading
            ? "Loading questions…"
            : error
              ? "Couldn't load quiz"
              : finished
                ? "Your results"
                : `Question ${index + 1} of ${total}`}
        </Text>
        {!finished && !loading && !error && total > 0 && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((index + (answered ? 1 : 0)) / total) * 100}%`, backgroundColor: colors.gold },
              ]}
            />
          </View>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: bottomPad }}>
        {loading ? (
          <LoadingState rows={3} />
        ) : error || !current ? (
          <ErrorState message="No quiz questions available." onRetry={() => void loadQuiz()} />
        ) : finished ? (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.resultBadge, { backgroundColor: colors.gold + "20" }]}>
              <MaterialIcons name="emoji-events" size={40} color={colors.gold} />
            </View>
            <Text style={[styles.resultScore, { color: colors.foreground }]}>
              {score} / {total}
            </Text>
            <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>{scoreLabel}</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleRestart}
            >
              <MaterialIcons name="refresh" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Retake Quiz</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Back to Home</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.questionText, { color: colors.foreground }]}>{current.question}</Text>
            </View>

            <View style={styles.options}>
              {current.options.map((option, i) => {
                const isCorrect = i === current.answerIndex;
                const isSelected = i === selected;
                let borderColor = colors.border;
                let bg = colors.card;
                let icon: "radio-button-unchecked" | "check-circle" | "cancel" = "radio-button-unchecked";
                let iconColor = colors.mutedForeground;

                if (answered) {
                  if (isCorrect) {
                    borderColor = correctColor;
                    bg = correctColor + "12";
                    icon = "check-circle";
                    iconColor = correctColor;
                  } else if (isSelected) {
                    borderColor = wrongColor;
                    bg = wrongColor + "12";
                    icon = "cancel";
                    iconColor = wrongColor;
                  }
                }

                return (
                  <Pressable
                    key={i}
                    disabled={answered}
                    style={({ pressed }) => [
                      styles.optionRow,
                      { backgroundColor: bg, borderColor, opacity: pressed && !answered ? 0.8 : 1 },
                    ]}
                    onPress={() => handleSelect(i)}
                  >
                    <MaterialIcons name={icon} size={20} color={iconColor} />
                    <Text style={[styles.optionText, { color: colors.foreground }]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>

            {answered && (
              <View style={[styles.explanationCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <MaterialIcons
                  name={selected === current.answerIndex ? "lightbulb" : "info-outline"}
                  size={16}
                  color={selected === current.answerIndex ? correctColor : colors.mutedForeground}
                />
                <Text style={[styles.explanationText, { color: colors.foreground }]}>{current.explanation}</Text>
              </View>
            )}

            {answered && (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleNext}
              >
                <Text style={styles.primaryBtnText}>{index + 1 >= total ? "See Results" : "Next Question"}</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
              </Pressable>
            )}
          </>
        )}

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Nonpartisan civic education based on official U.S. government sources.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  backBtn: { marginBottom: 8 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)", marginTop: 12, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  questionCard: { borderRadius: 16, borderWidth: 1, padding: 18 },
  questionText: { fontSize: 18, fontFamily: "Inter_600SemiBold", lineHeight: 25 },
  options: { gap: 10 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 16 },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 21 },
  explanationCard: { flexDirection: "row", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  explanationText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, padding: 15 },
  primaryBtnText: { color: "#FFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: { alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 10 },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  resultCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 8 },
  resultBadge: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  resultScore: { fontSize: 44, fontFamily: "Inter_700Bold" },
  resultLabel: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 16 },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic", textAlign: "center", marginTop: 8 },
});
