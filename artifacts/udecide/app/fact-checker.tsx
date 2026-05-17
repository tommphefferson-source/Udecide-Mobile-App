import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { sendGeminiMessage } from "@/services/geminiApi";
import type { GeminiMessage } from "@/services/geminiApi";

const SUGGESTED_PROMPTS = [
  "Summarize a bill in plain English",
  "What does the Electoral College do?",
  "Explain how a bill becomes law",
  "What are the three branches of government?",
  "How do I check my voting record?",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function FactCheckerScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to UDecide's nonpartisan Fact Checker, powered by Gemini AI.\n\nI can help you:\n• Understand government processes and legislation\n• Fact-check political claims against public records\n• Summarize bills in plain language\n• Explain voting records neutrally\n\nI remain strictly neutral and do not endorse any candidate, party, or policy. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString() + "u",
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [userMsg, ...prev]);
    setInput("");
    setLoading(true);

    const history: GeminiMessage[] = [...messages]
      .reverse()
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role === "user" ? "user" : "model", content: m.content }));
    history.push({ role: "user", content: text });

    const result = await sendGeminiMessage(history);
    setLoading(false);

    const assistantMsg: ChatMessage = {
      id: Date.now().toString() + "a",
      role: "assistant",
      content: result.error ?? result.text,
      timestamp: new Date(),
    };
    setMessages((prev) => [assistantMsg, ...prev]);
  }

  function handleSuggestedPrompt(prompt: string) {
    setInput(prompt);
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.navy }]}>
            <MaterialIcons name="balance" size={16} color="#FFF" />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.accent }]
              : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}
        >
          <Text style={[styles.bubbleText, { color: isUser ? "#FFF" : colors.foreground }]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, { color: isUser ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
            {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.navy, colors.navyLight]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.headerTitleRow}>
          <View style={[styles.headerIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <MaterialIcons name="fact-check" size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.screenTitle}>Fact Checker</Text>
            <Text style={styles.screenSubtitle}>Nonpartisan · Powered by Gemini AI</Text>
          </View>
        </View>
      </LinearGradient>

      {!apiKey && (
        <View style={[styles.devWarning, { backgroundColor: "#D4AF3720", borderColor: "#D4AF3740" }]}>
          <MaterialIcons name="warning" size={16} color="#D4AF37" />
          <Text style={[styles.devWarningText, { color: colors.foreground }]}>
            GEMINI_API_KEY not set. Using demo responses. Add your key to .env for live AI responses.
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            loading ? (
              <View style={[styles.typingIndicator, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
                <Text style={[styles.typingText, { color: colors.mutedForeground }]}>Analyzing...</Text>
              </View>
            ) : null
          }
        />

        {messages.length === 1 && (
          <View style={styles.suggestedRow}>
            <Text style={[styles.suggestedLabel, { color: colors.mutedForeground }]}>Suggested:</Text>
            <FlatList
              horizontal
              data={SUGGESTED_PROMPTS}
              keyExtractor={(p) => p}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.suggestedChip,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => handleSuggestedPrompt(item)}
                >
                  <Text style={[styles.suggestedChipText, { color: colors.foreground }]}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ask about a political claim, bill, or government process..."
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: input.trim() && !loading ? colors.accent : colors.muted, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            <MaterialIcons name="send" size={20} color={input.trim() && !loading ? "#FFF" : colors.mutedForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  backBtn: { alignSelf: "flex-start", marginBottom: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  devWarning: { flexDirection: "row", gap: 8, padding: 10, borderBottomWidth: 1, alignItems: "flex-start" },
  devWarningText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  messageRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  userRow: { flexDirection: "row-reverse" },
  assistantRow: {},
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 12, gap: 4 },
  userBubble: { borderBottomRightRadius: 4 },
  assistantBubble: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  timestamp: { fontSize: 10, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  typingIndicator: { flexDirection: "row", gap: 8, alignItems: "center", borderRadius: 12, padding: 10, borderWidth: 1, alignSelf: "flex-start", marginBottom: 8 },
  typingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  suggestedRow: { gap: 6, paddingVertical: 8 },
  suggestedLabel: { fontSize: 12, fontFamily: "Inter_500Medium", paddingHorizontal: 16 },
  suggestedChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, maxWidth: 200 },
  suggestedChipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputBar: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, alignItems: "flex-end" },
  input: { flex: 1, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
