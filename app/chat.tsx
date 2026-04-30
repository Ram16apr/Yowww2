import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─────────────────────────────────────────
// 🤖 BOT CONFIGURATION
// ─────────────────────────────────────────
const BOT_TOPICS = [
  {
    id: "order",
    label: "Order Issues",
    subtitle: "Track, cancel, modify",
    icon: "receipt-outline",
    color: "#FFF3CD",
    iconColor: "#E3AE01",
  },
  {
    id: "payment",
    label: "Payment & Refund",
    subtitle: "Refunds, billing",
    icon: "card-outline",
    color: "#E8F5E9",
    iconColor: "#2E7D32",
  },
  {
    id: "delivery",
    label: "Delivery Issues",
    subtitle: "Late, wrong address",
    icon: "bicycle-outline",
    color: "#E3F2FD",
    iconColor: "#1565C0",
  },
  {
    id: "other",
    label: "Other Issues",
    subtitle: "Account, general",
    icon: "help-circle-outline",
    color: "#F3E5F5",
    iconColor: "#6A1B9A",
  },
];

const BOT_RESPONSES: Record<string, { message: string; options: string[] }> = {
  order: {
    message: "I can help with your order! What's the issue?",
    options: ["My order is late", "Wrong items delivered", "Order not received", "Want to cancel order", "Talk to human agent"],
  },
  payment: {
    message: "I can help with payment issues! What do you need?",
    options: ["Refund not received", "Payment deducted but order failed", "Wrong amount charged", "Talk to human agent"],
  },
  delivery: {
    message: "I can help with delivery issues! What happened?",
    options: ["Delivery partner not responding", "Wrong delivery address", "Food spilled or damaged", "Talk to human agent"],
  },
  other: {
    message: "I'll connect you to our support team right away!",
    options: ["Talk to human agent"],
  },
  "My order is late": {
    message: "Sorry about the delay! Your delivery partner is on the way. Need to talk to someone?",
    options: ["Talk to human agent", "It's okay, I'll wait"],
  },
  "Wrong items delivered": {
    message: "We're sorry! Please keep the wrong items and we'll arrange a refund or replacement.",
    options: ["Talk to human agent", "Request refund"],
  },
  "Order not received": {
    message: "We're sorry! Let me connect you with our support team immediately.",
    options: ["Talk to human agent"],
  },
  "Want to cancel order": {
    message: "Orders can be cancelled within 2 minutes. If it's been longer, please talk to our agent.",
    options: ["Talk to human agent", "Go to My Orders"],
  },
  "Refund not received": {
    message: "Refunds typically take 5-7 business days. If it's been longer, our team will help.",
    options: ["Talk to human agent", "It's okay"],
  },
  "Payment deducted but order failed": {
    message: "Don't worry! Refund will be processed in 5-7 days. Want to escalate?",
    options: ["Talk to human agent", "I'll wait for refund"],
  },
  "Wrong amount charged": {
    message: "Let me connect you with our billing team.",
    options: ["Talk to human agent"],
  },
  "Delivery partner not responding": {
    message: "Let me connect you to our team to track your delivery partner.",
    options: ["Talk to human agent"],
  },
  "Wrong delivery address": {
    message: "If your order is still being prepared, we might be able to change the address.",
    options: ["Talk to human agent"],
  },
  "Food spilled or damaged": {
    message: "We're really sorry! Please share a photo with our support team for a quick resolution.",
    options: ["Talk to human agent"],
  },
  "Request refund": {
    message: "I'll connect you with our team to process your refund immediately.",
    options: ["Talk to human agent"],
  },
  "Go to My Orders": { message: "Redirecting you to your orders...", options: [] },
  "It's okay, I'll wait": { message: "Thank you for your patience! 😊", options: ["Back to main menu"] },
  "I'll wait for refund": { message: "Your refund will be credited in 5-7 business days. 😊", options: ["Back to main menu"] },
  "It's okay": { message: "Thank you! Feel free to reach out anytime. 😊", options: ["Back to main menu"] },
  "Back to main menu": {
    message: "How else can I help you today?",
    options: BOT_TOPICS.map((t) => t.label),
  },
};

interface ChatMessage {
  id: string;
  text: string;
  sender: "bot" | "user" | "human";
  timestamp: Date;
  options?: string[];
  isTyping?: boolean;
  showTopics?: boolean;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isEscalated, setIsEscalated] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string>("");
  const [showRating, setShowRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<any>(null);
  const lastMessageIdRef = useRef<number>(0);

  useEffect(() => {
    initBot();
    loadToken();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  async function loadToken() {
    const userStr = await AsyncStorage.getItem("user");
    const userData = userStr ? JSON.parse(userStr) : null;
    setAuthToken(userData?.token ?? "");
  }

  function getTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function initBot() {
    setMessages([{
      id: "welcome",
      text: "Hi there! I'm your Yowww support assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
      showTopics: true,
    }]);
  }

  function startPolling(convId: number, token: string) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      await pollMessages(convId, token);
    }, 3000);
  }

  async function pollMessages(convId: number, token: string) {
    try {
      const res = await fetch(
        `https://yowww.in/index.php/api/v1/customer/message/details?conversation_id=${convId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-localization": "en",
          },
        }
      );
      const data = await res.json();
      const newMessages: any[] = data?.messages || [];
      if (newMessages.length === 0) return;

      const freshMessages = newMessages
        .filter((m: any) => m.id > lastMessageIdRef.current)
        .reverse();

      if (freshMessages.length === 0) return;
      lastMessageIdRef.current = freshMessages[freshMessages.length - 1].id;

      const agentMessages: ChatMessage[] = freshMessages
        .filter((m: any) => m.message && m.message !== "")
        .map((m: any) => ({
          id: `poll_${m.id}`,
          text: m.message,
          sender: "human" as const,
          timestamp: new Date(m.created_at),
        }));

      if (agentMessages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((msg) => msg.id));
          const unique = agentMessages.filter((m) => !existingIds.has(m.id));
          return [...prev, ...unique];
        });
      }
    } catch (e) {
      console.log("Polling error:", e);
    }
  }

  async function handleTopicSelect(topic: typeof BOT_TOPICS[0]) {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      text: topic.label,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const response = BOT_RESPONSES[topic.id];
    if (response) {
      const typingMsg: ChatMessage = {
        id: "typing",
        text: "...",
        sender: "bot",
        timestamp: new Date(),
        isTyping: true,
      };
      setMessages((prev) => [...prev, typingMsg]);

      setTimeout(() => {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== "typing");
          return [...filtered, {
            id: `bot_${Date.now()}`,
            text: response.message,
            sender: "bot" as const,
            timestamp: new Date(),
            options: response.options,
          }];
        });
      }, 800);
    }
  }

  async function handleQuickReply(option: string) {
    if (option === "Talk to human agent") {
      escalateToHuman();
      return;
    }
    if (option === "Go to My Orders") {
      router.push("/(tabs)/orders");
      return;
    }

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      text: option,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const response = BOT_RESPONSES[option];
    if (response) {
      const typingMsg: ChatMessage = {
        id: "typing",
        text: "...",
        sender: "bot",
        timestamp: new Date(),
        isTyping: true,
      };
      setMessages((prev) => [...prev, typingMsg]);

      setTimeout(() => {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== "typing");
          return [...filtered, {
            id: `bot_${Date.now()}`,
            text: response.message,
            sender: "bot" as const,
            timestamp: new Date(),
            options: response.options,
          }];
        });
      }, 800);
    }
  }

  async function escalateToHuman() {
    setIsEscalated(true);
    setLoading(true);

    setMessages((prev) => [...prev, {
      id: "escalation",
      text: "Connecting you to a human agent... Please wait.",
      sender: "bot",
      timestamp: new Date(),
    }]);

    try {
      const res = await fetch(
        "https://yowww.in/index.php/api/v1/customer/message/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            "X-localization": "en",
          },
          body: JSON.stringify({
            receiver_type: "admin",
            message: "Customer needs help — escalated from support bot.",
          }),
        }
      );

      const data = await res.json();
      const convId = data?.conversation?.id;
      if (convId) {
        setConversationId(convId);
        const msgs = data?.messages || [];
        if (msgs.length > 0) lastMessageIdRef.current = msgs[0].id;
        startPolling(convId, authToken);
      }

      setMessages((prev) => [...prev, {
        id: "connected",
        text: "✅ You are now connected to a human agent. They will respond shortly. Type your message below.",
        sender: "bot",
        timestamp: new Date(),
      }]);
    } catch (e) {
      console.log("Escalation error:", e);
      setMessages((prev) => [...prev, {
        id: "error",
        text: "Sorry, couldn't connect to an agent. Please try WhatsApp or call support.",
        sender: "bot",
        timestamp: new Date(),
      }]);
      setIsEscalated(false);
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      text,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const body: any = { receiver_type: "admin", message: text };
      if (conversationId) body.conversation_id = conversationId;

      const res = await fetch(
        "https://yowww.in/index.php/api/v1/customer/message/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            "X-localization": "en",
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data?.conversation?.id && !conversationId) {
        setConversationId(data.conversation.id);
        startPolling(data.conversation.id, authToken);
      }
    } catch (e) {
      console.log("Send error:", e);
    }
    setSending(false);
  }

  function endChat() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setShowRating(true);
  }

  async function submitRating() {
    setRatingSubmitted(true);
    setTimeout(() => {
      setShowRating(false);
      router.back();
    }, 1500);
  }

  // ─────────────────────────────────────────
  // 🎨 RENDER MESSAGE
  // ─────────────────────────────────────────
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === "user";
    const isBot = item.sender === "bot";

    return (
      <View style={{ marginBottom: 16 }}>

        {/* Bot / Agent message */}
        {!isUser && (
          <View style={styles.botRow}>
            {/* Avatar */}
            <View style={styles.botAvatar}>
              <Ionicons
                name={isBot ? "flash" : "person"}
                size={14}
                color="#fff"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.senderLabel}>
                {isBot ? "Yowww Bot" : "Support Agent"}
              </Text>

              {/* Typing indicator */}
              {item.isTyping ? (
                <View style={[styles.botBubble, { paddingVertical: 14 }]}>
                  <View style={styles.typingRow}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={styles.typingDot} />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.botBubble}>
                  <Text style={styles.botText}>{item.text}</Text>
                </View>
              )}

              <Text style={styles.timeLabel}>
                {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>

              {/* Topic cards grid */}
              {item.showTopics && (
                <View style={styles.topicsGrid}>
                  {BOT_TOPICS.map((topic) => (
                    <TouchableOpacity
                      key={topic.id}
                      style={styles.topicCard}
                      onPress={() => handleTopicSelect(topic)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.topicIconBox, { backgroundColor: topic.color }]}>
                        <Ionicons name={topic.icon as any} size={18} color={topic.iconColor} />
                      </View>
                      <Text style={styles.topicLabel}>{topic.label}</Text>
                      <Text style={styles.topicSub}>{topic.subtitle}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Quick reply options */}
              {item.options && item.options.length > 0 && (
                <View style={styles.optionsWrap}>
                  {item.options.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionChip,
                        option === "Talk to human agent" && styles.escalateChip,
                      ]}
                      onPress={() => handleQuickReply(option)}
                    >
                      {option === "Talk to human agent" && (
                        <Ionicons name="person" size={12} color="#fff" style={{ marginRight: 4 }} />
                      )}
                      <Text style={[
                        styles.optionChipText,
                        option === "Talk to human agent" && styles.escalateChipText,
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* User message */}
        {isUser && (
          <View style={styles.userRow}>
            <View>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{item.text}</Text>
              </View>
              <Text style={[styles.timeLabel, { textAlign: "right" }]}>
                {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── GOLD HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          <Ionicons name="flash" size={18} color="#E3AE01" />
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Yowww Support</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {isEscalated ? "Agent Connected" : "Bot Active"}
            </Text>
          </View>
        </View>

        {isEscalated && (
          <TouchableOpacity style={styles.endBtn} onPress={endChat}>
            <Text style={styles.endBtnText}>End Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── MESSAGES ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E3AE01" />
            <Text style={styles.loadingText}>Connecting to agent...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* ── HUMAN AGENT BANNER (before escalation) ── */}
        {!isEscalated && (
          <TouchableOpacity style={styles.agentBanner} onPress={escalateToHuman}>
            <View style={styles.agentBannerLeft}>
              <View style={styles.agentBannerAvatar}>
                <Ionicons name="person" size={16} color="#E3AE01" />
              </View>
              <View>
                <Text style={styles.agentBannerTitle}>Talk to a human agent</Text>
                <Text style={styles.agentBannerSub}>Available 9AM - 9PM</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#E3AE01" />
          </TouchableOpacity>
        )}

        {/* ── INPUT BAR (after escalation) ── */}
        {isEscalated && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#aaa"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnOff]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── RATING MODAL ── */}
      <Modal
        visible={showRating}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRating(false)}
      >
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingCard}>
            {ratingSubmitted ? (
              <View style={styles.thankYouBox}>
                <Text style={styles.thankYouEmoji}>🎉</Text>
                <Text style={styles.thankYouTitle}>Thank you!</Text>
                <Text style={styles.thankYouSub}>Your feedback helps us improve.</Text>
              </View>
            ) : (
              <>
                <View style={styles.ratingHandle} />
                <Text style={styles.ratingTitle}>Rate your experience</Text>
                <Text style={styles.ratingSub}>How was your support today?</Text>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                      <Ionicons
                        name={selectedRating >= star ? "star" : "star-outline"}
                        size={42}
                        color={selectedRating >= star ? "#E3AE01" : "#ddd"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedRating > 0 && (
                  <Text style={styles.ratingEmoji}>
                    {["", "😞 Very Poor", "😐 Poor", "🙂 Average", "😊 Good", "🤩 Excellent!"][selectedRating]}
                  </Text>
                )}

                <View style={styles.ratingBtns}>
                  <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={() => { setShowRating(false); router.back(); }}
                  >
                    <Text style={styles.skipText}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, selectedRating === 0 && { backgroundColor: "#ddd" }]}
                    onPress={submitRating}
                    disabled={selectedRating === 0}
                  >
                    <Text style={styles.submitText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  // ── Header ──
  header: {
    backgroundColor: "#E3AE01",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    elevation: 4,
  },

  backBtn: { padding: 4 },

  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerInfo: { flex: 1 },

  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#fff",
  },

  statusText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },

  endBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  endBtnText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },

  // ── Messages ──
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },

  botRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },

  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E3AE01",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    flexShrink: 0,
  },

  senderLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: "600",
  },

  botBubble: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "90%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  botText: {
    fontSize: 14,
    color: "#222",
    lineHeight: 20,
  },

  timeLabel: {
    fontSize: 10,
    color: "#bbb",
    marginTop: 4,
    marginLeft: 4,
  },

  userRow: {
    alignItems: "flex-end",
  },

  userBubble: {
    backgroundColor: "#E3AE01",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "75%",
  },

  userText: {
    fontSize: 14,
    color: "#fff",
    lineHeight: 20,
  },

  // Typing dots
  typingRow: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 4,
  },

  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
  },

  // Topics grid
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  topicCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: "#eee",
    elevation: 1,
  },

  topicIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  topicLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },

  topicSub: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },

  // Quick reply chips
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },

  optionChip: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E3AE01",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  escalateChip: {
    backgroundColor: "#E3AE01",
    borderColor: "#E3AE01",
  },

  optionChipText: {
    fontSize: 12,
    color: "#E3AE01",
    fontWeight: "600",
  },

  escalateChipText: {
    color: "#fff",
  },

  // Human agent banner
  agentBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3AE01",
    elevation: 2,
  },

  agentBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  agentBannerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
  },

  agentBannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },

  agentBannerSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 1,
  },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 8,
  },

  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
    maxHeight: 100,
  },

  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3AE01",
    justifyContent: "center",
    alignItems: "center",
  },

  sendBtnOff: { backgroundColor: "#ddd" },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    color: "#888",
  },

  // Rating modal
  ratingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  ratingCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
  },

  ratingHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    marginBottom: 20,
  },

  ratingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },

  ratingSub: {
    fontSize: 14,
    color: "#888",
    marginTop: 6,
    marginBottom: 24,
  },

  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  ratingEmoji: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E3AE01",
    marginBottom: 24,
  },

  ratingBtns: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },

  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },

  skipText: { fontSize: 15, color: "#888", fontWeight: "600" },

  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E3AE01",
    alignItems: "center",
  },

  submitText: { fontSize: 15, color: "#fff", fontWeight: "700" },

  thankYouBox: { alignItems: "center", paddingVertical: 20 },
  thankYouEmoji: { fontSize: 48, marginBottom: 12 },
  thankYouTitle: { fontSize: 22, fontWeight: "700", color: "#222" },
  thankYouSub: { fontSize: 14, color: "#888", marginTop: 8 },
});