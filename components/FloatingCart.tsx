import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../store/CartStore";

export default function FloatingCart() {
  const { items } = useCartStore();

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  if (count === 0) return null;

  return (
    <TouchableOpacity
      onPress={() => router.push("/cart")}
      style={styles.container}
      activeOpacity={0.9}
    >
      {/* Left — item count badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>

      {/* Center — label */}
      <Text style={styles.label}>View Cart</Text>

      {/* Right — total */}
      <View style={styles.right}>
        <Text style={styles.total}>₹ {total.toFixed(0)}</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 95,          // ✅ sits above tab bar (tab bar is ~65px)
    left: 16,
    right: 16,
    backgroundColor: "#E3AE01",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  badge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  label: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
    textAlign: "center",
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  total: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});