import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // ✅ correct import

// ─────────────────────────────────────────
// 📋 FAQ DATA
// ─────────────────────────────────────────
const FAQS = [
  {
    question: "How do I track my order?",
    answer:
      "Once your order is placed, you can track it in real-time from the Orders tab. You will also receive notifications at each stage.",
  },
  {
    question: "How do I cancel my order?",
    answer:
      "You can cancel your order within 2 minutes of placing it. Go to Orders → Select order → Cancel Order.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept UPI, Credit/Debit cards, Net Banking, and Cash on Delivery (COD) for eligible orders.",
  },
  {
    question: "How do I get a refund?",
    answer:
      "Refunds are processed within 5-7 business days to your original payment method. Contact support if you face any issues.",
  },
  {
    question: "Why is my order delayed?",
    answer:
      "Delays can happen due to high demand, bad weather, or traffic. You can track your delivery partner's location in real-time.",
  },
  {
    question: "How do I change my delivery address?",
    answer:
      "You can change your delivery address before the restaurant accepts your order. Go to Orders → Active Order → Change Address.",
  },
];

export default function Account() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  async function logout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          router.replace("/login");
        },
      },
    ]);
  }

  function callSupport() {
    Linking.openURL("tel:+918296489005");
  }

  function chatSupport() {
    Linking.openURL(
      "https://wa.me/918296489005?text=Hi, I need help with my Yowww order.",
    );
  }

  function emailSupport() {
    Linking.openURL(
      "mailto:support@yowww.in?subject=Help Request&body=Hi, I need help with...",
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Account</Text>
        </View>

        {/* ── PROFILE CARD ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#E3AE01" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Yowww User</Text>
            <Text style={styles.profilePhone}>+91 8296489005</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={18} color="#E3AE01" />
          </TouchableOpacity>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(tabs)/orders")}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="receipt-outline" size={20} color="#E3AE01" />
            </View>
            <Text style={styles.menuText}>My Orders</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/location")}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="location-outline" size={20} color="#E3AE01" />
            </View>
            <Text style={styles.menuText}>Change Location</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* ── HELP & SUPPORT SECTION ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>

          {/* ✅ Chat Support — now INSIDE return() */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/chat")}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#fff8e1" }]}>
              <Ionicons name="chatbubbles-outline" size={20} color="#E3AE01" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Chat Support</Text>
              <Text style={styles.menuSubText}>Bot + Human Agent</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={callSupport}>
            <View style={[styles.menuIcon, { backgroundColor: "#e8f5e9" }]}>
              <Ionicons name="call-outline" size={20} color="#2e7d32" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Call Support</Text>
              <Text style={styles.menuSubText}>Mon-Sun, 9AM - 9PM</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={chatSupport}>
            <View style={[styles.menuIcon, { backgroundColor: "#e8f5e9" }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Chat on WhatsApp</Text>
              <Text style={styles.menuSubText}>Instant support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={emailSupport}>
            <View style={[styles.menuIcon, { backgroundColor: "#fff3e0" }]}>
              <Ionicons name="mail-outline" size={20} color="#E3AE01" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Email Support</Text>
              <Text style={styles.menuSubText}>support@yowww.in</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowHelpModal(true)}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#e3f2fd" }]}>
              <Ionicons name="help-circle-outline" size={20} color="#1565c0" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>FAQ</Text>
              <Text style={styles.menuSubText}>Frequently asked questions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* ── LOGOUT ── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color="#e53935" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Yowww v1.0.0</Text>
      </ScrollView>

      {/* ── FAQ MODAL ── */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
              <Ionicons name="close" size={24} color="#222" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalContactRow}>
              <TouchableOpacity
                style={styles.modalContactBtn}
                onPress={callSupport}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.modalContactText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalContactBtn, { backgroundColor: "#25D366" }]}
                onPress={chatSupport}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.modalContactText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalContactBtn, { backgroundColor: "#1565c0" }]}
                onPress={emailSupport}
              >
                <Ionicons name="mail" size={20} color="#fff" />
                <Text style={styles.modalContactText}>Email</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.faqSectionTitle}>Common Questions</Text>

            {FAQS.map((faq, index) => (
              <TouchableOpacity
                key={index}
                style={styles.faqItem}
                onPress={() =>
                  setExpandedFaq(expandedFaq === index ? null : index)
                }
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={expandedFaq === index ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#888"
                  />
                </View>
                {expandedFaq === index && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#222" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff8e1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E3AE01",
  },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 16, fontWeight: "700", color: "#222" },
  profilePhone: { fontSize: 13, color: "#888", marginTop: 2 },
  editBtn: { padding: 8 },
  section: { backgroundColor: "#fff", marginBottom: 12, paddingVertical: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff8e1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: { flex: 1 },
  menuText: { fontSize: 15, color: "#222", fontWeight: "500", flex: 1 },
  menuSubText: { fontSize: 12, color: "#888", marginTop: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#e53935" },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#bbb",
    marginVertical: 20,
  },
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#222" },
  modalContactRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalContactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E3AE01",
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalContactText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  faqSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  faqItem: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 14,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: { fontSize: 13, color: "#666", marginTop: 10, lineHeight: 20 },
});
