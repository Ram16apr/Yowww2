// components/CustomiseModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AddOn {
  id: number;
  name: string;
  price: number;
  group_name?: string;
}

interface Props {
  visible: boolean;
  item: any;
  onClose: () => void;
  onAddToCart: (item: any, selectedAddOns: AddOn[]) => void;
  getProductImage: (item: any) => string;
}

export default function CustomiseModal({
  visible,
  item,
  onClose,
  onAddToCart,
  getProductImage,
}: Props) {
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);

  if (!item) return null;

  const addOns: AddOn[] = item.add_ons || [];

  // Group add-ons by group_name
  const grouped = addOns.reduce((acc: any, addon: any) => {
    const group = addon.group_name || "Add-ons";
    if (!acc[group]) acc[group] = [];
    acc[group].push(addon);
    return acc;
  }, {});

  const toggleAddOn = (addon: AddOn) => {
    setSelectedAddOns((prev) =>
      prev.find((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = item.price + addOnTotal;

  const handleAdd = () => {
    onAddToCart(item, selectedAddOns);
    setSelectedAddOns([]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Overlay — tapping closes modal */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Item info */}
          <View style={styles.itemRow}>
            <Image
              source={{ uri: getProductImage(item) }}
              style={styles.itemImage}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
              {item.description ? (
                <Text style={styles.itemDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Add-ons */}
          {Object.keys(grouped).length > 0 && (
            <View style={styles.addOnsSection}>
              <Text style={styles.customiseTitle}>Customise your order</Text>

              {Object.entries(grouped).map(([groupName, addons]: any) => (
                <View key={groupName} style={styles.group}>
                  <Text style={styles.groupName}>{groupName}</Text>
                  {addons.map((addon: AddOn) => {
                    const selected = !!selectedAddOns.find((a) => a.id === addon.id);
                    return (
                      <TouchableOpacity
                        key={addon.id}
                        style={styles.addonRow}
                        onPress={() => toggleAddOn(addon)}
                      >
                        <View style={styles.addonLeft}>
                          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                            {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </View>
                          <Text style={styles.addonName}>{addon.name}</Text>
                        </View>
                        <Text style={styles.addonPrice}>+ ₹{addon.price}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer — total + add button */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerTotal}>₹{totalPrice}</Text>
            {addOnTotal > 0 && (
              <Text style={styles.footerBreakdown}>
                ₹{item.price} + ₹{addOnTotal} add-ons
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>
              {addOns.length > 0 ? "Add to Cart" : "ADD"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 99,
    alignSelf: "center",
    marginVertical: 12,
  },

  // ── Item info ──
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  itemName: { fontSize: 16, fontWeight: "700", color: "#222" },
  itemPrice: { fontSize: 15, fontWeight: "700", color: "#E3AE01", marginTop: 4 },
  itemDesc: { fontSize: 12, color: "#888", marginTop: 4 },

  // ── Add-ons ──
  addOnsSection: { marginBottom: 16 },
  customiseTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#222",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  group: { marginBottom: 16 },
  groupName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#f5f5f5",
  },
  addonLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ddd",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#E3AE01",
    borderColor: "#E3AE01",
  },
  addonName: { fontSize: 14, color: "#333" },
  addonPrice: { fontSize: 13, fontWeight: "600", color: "#555" },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
    marginTop: 8,
  },
  footerTotal: { fontSize: 18, fontWeight: "800", color: "#222" },
  footerBreakdown: { fontSize: 11, color: "#888", marginTop: 2 },
  addBtn: {
    backgroundColor: "#E3AE01",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
