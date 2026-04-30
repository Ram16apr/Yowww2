// components/CouponSection.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useCouponStore } from "../store/CouponStore";

interface Props {
  zoneId: string;
  restaurantId: number;
  cartTotal: number;
  token: string;
}

export default function CouponSection({ zoneId, restaurantId, cartTotal, token }: Props) {
  const {
    availableCoupons,
    appliedCoupon,
    discountAmount,
    loading,
    error,
    fetchCoupons,
    applyCoupon,
    removeCoupon,
  } = useCouponStore();

  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (restaurantId && zoneId && token) {
      fetchCoupons(zoneId, restaurantId, token);
    }
  }, [restaurantId, zoneId, token]);

const handleApply = (couponCode?: string) => {
  const finalCode = (couponCode ?? code ?? "").trim();
  if (!finalCode) return;
  applyCoupon(finalCode, restaurantId, zoneId, cartTotal, token);
  setCode("");
  setShowModal(false);
};

  // ── APPLIED STATE — single green row ──
  if (appliedCoupon) {
    return (
      <View style={styles.appliedRow}>
        <View style={styles.appliedLeft}>
          <View style={styles.appliedIconWrap}>
            <Ionicons name="pricetag" size={16} color="#fff" />
          </View>
          <View>
            <Text style={styles.appliedCode}>{appliedCoupon.code} applied</Text>
            <Text style={styles.appliedSaving}>You save ₹{discountAmount.toFixed(0)} with this coupon!</Text>
          </View>
        </View>
        <TouchableOpacity onPress={removeCoupon}>
          <Text style={styles.removeText}>REMOVE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── DEFAULT STATE — single tappable row ──
  return (
    <>
      <TouchableOpacity style={styles.couponRow} onPress={() => setShowModal(true)}>
        <View style={styles.couponRowLeft}>
          <View style={styles.couponIconWrap}>
            <Ionicons name="pricetag-outline" size={16} color="#E3AE01" />
          </View>
          <Text style={styles.couponRowText}>
            {availableCoupons.length > 0
              ? `${availableCoupons.length} coupon${availableCoupons.length > 1 ? "s" : ""} available`
              : "Apply Coupon"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </TouchableOpacity>

      {/* ── BOTTOM SHEET MODAL ── */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        />
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Title row */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply Coupon</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={22} color="#222" />
            </TouchableOpacity>
          </View>

          {/* Code input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter coupon code"
              placeholderTextColor="#aaa"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.applyBtn, !code.trim() && styles.applyBtnDisabled]}
              onPress={() => handleApply()}
              disabled={!code.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.applyBtnText}>APPLY</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error && (
            <Text style={styles.errorText}>⚠ {error}</Text>
          )}

          {/* Divider */}
          {availableCoupons.length > 0 && (
            <Text style={styles.availableTitle}>Available Coupons</Text>
          )}

          {/* Coupon list */}
          <FlatList
            data={availableCoupons}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.couponCard}>
                {/* Top row */}
                <View style={styles.couponCardTop}>
                  <View style={styles.couponBadge}>
                    <Text style={styles.couponBadgeText}>{item.code}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.tapApplyBtn}
                    onPress={() => handleApply(item.code)}
                  >
                    <Text style={styles.tapApplyText}>APPLY</Text>
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <Text style={styles.couponDesc}>
                  {item.discount_type === "percent"
                    ? `${item.discount}% off${item.max_discount > 0 ? ` up to ₹${item.max_discount}` : ""}`
                    : `Flat ₹${item.discount} off`}
                </Text>
                <Text style={styles.couponMin}>Min order ₹{item.min_purchase}</Text>

                {/* Dashed divider */}
                <View style={styles.dashedLine} />
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({

  // ── Applied state ──
  appliedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  appliedLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  appliedIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#48c479",
    justifyContent: "center", alignItems: "center",
  },
  appliedCode: { fontSize: 13, fontWeight: "700", color: "#222" },
  appliedSaving: { fontSize: 12, color: "#48c479", marginTop: 2 },
  removeText: { fontSize: 12, fontWeight: "700", color: "#E3AE01" },

  // ── Default row ──
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  couponRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  couponIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#fff8e1",
    justifyContent: "center", alignItems: "center",
  },
  couponRowText: { fontSize: 14, fontWeight: "600", color: "#222" },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000055",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "75%",
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: "#ddd",
    borderRadius: 99,
    alignSelf: "center",
    marginTop: 12, marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#222" },

  // ── Input ──
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E3AE01",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
    letterSpacing: 1,
  },
  applyBtn: {
    backgroundColor: "#E3AE01",
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtnDisabled: { backgroundColor: "#f0d98a" },
  applyBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  errorText: { color: "#e53935", fontSize: 12, marginBottom: 10 },

  availableTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },

  // ── Coupon card ──
  couponCard: { paddingVertical: 14 },
  couponCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  couponBadge: {
    backgroundColor: "#fff8e1",
    borderWidth: 1.5,
    borderColor: "#E3AE01",
    borderStyle: "dashed",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  couponBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#E3AE01",
    letterSpacing: 1,
  },
  tapApplyBtn: {
    borderWidth: 1.5,
    borderColor: "#E3AE01",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  tapApplyText: { color: "#E3AE01", fontWeight: "800", fontSize: 12 },
  couponDesc: { fontSize: 13, color: "#222", fontWeight: "600" },
  couponMin: { fontSize: 12, color: "#888", marginTop: 2 },
  dashedLine: {
    borderBottomWidth: 1,
    borderColor: "#eee",
    borderStyle: "dashed",
    marginTop: 14,
  },
});
