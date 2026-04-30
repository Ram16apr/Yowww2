import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CouponSection from "../components/CouponSection";
import { useCartStore } from "../store/CartStore";
import { useCouponStore } from "../store/CouponStore";

export default function CartScreen() {
  const router = useRouter();
  const { items, restaurantId, addItem, removeItem } = useCartStore();
  const { discountAmount, removeCoupon, recalculateDiscount } = useCouponStore();

  const [userToken, setUserToken] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [showBill, setShowBill] = useState(false);
  const [cutlery, setCutlery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);  // ✅ only one declaration
  const [loadingFee, setLoadingFee] = useState(false);

  // ─────────────────────────────────────────
  // 🚚 FETCH DELIVERY CHARGE FROM BACKEND
  // ─────────────────────────────────────────
 async function fetchDeliveryCharge(zid: string, latitude: string, longitude: string) {
  if (!zid) return;
  setLoadingFee(true);

  try {
    const res = await fetch(
      `https://yowww.in/index.php/api/v1/zone/list`,
      {
        headers: {
          zoneId: `[${zid}]`,
          latitude: String(latitude),
          longitude: String(longitude),
          "X-localization": "en",
        },
      }
    );

    const data = await res.json();
    const zones = data?.zones || data?.data || data || [];
    const zone = Array.isArray(zones)
      ? zones.find((z: any) => String(z.id) === String(zid))
      : null;

    console.log("Zone charges:", JSON.stringify({
      minimum_shipping_charge: zone?.minimum_shipping_charge,
      per_km_shipping_charge: zone?.per_km_shipping_charge,
      maximum_shipping_charge: zone?.maximum_shipping_charge,
    }, null, 2));

    if (zone) {
      const minCharge = parseFloat(zone?.minimum_shipping_charge) || 15;
      const perKm = parseFloat(zone?.per_km_shipping_charge) || 8;
      const maxCharge = parseFloat(zone?.maximum_shipping_charge) || 0;

      // ✅ Calculate distance between user and restaurant
      const restaurantRes = await fetch(
        `https://yowww.in/index.php/api/v1/restaurants/details/${restaurantId}`,
        {
          headers: {
            zoneId: `[${zid}]`,
            latitude: String(latitude),
            longitude: String(longitude),
            "X-localization": "en",
          },
        }
      );
      const restaurantData = await restaurantRes.json();
      const restLat = parseFloat(restaurantData?.latitude);
      const restLng = parseFloat(restaurantData?.longitude);

      // ✅ Haversine distance formula
      function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }

      const distance = getDistanceKm(
        parseFloat(latitude),
        parseFloat(longitude),
        restLat,
        restLng
      );

      console.log("Distance to restaurant:", distance.toFixed(2), "km");

      // ✅ Apply zone formula: max(minimum, distance × perKm)
      let fee = Math.max(minCharge, distance * perKm);

      // ✅ Cap at maximum if set
      if (maxCharge > 0 && fee > maxCharge) {
        fee = maxCharge;
      }

      console.log("Calculated delivery fee: ₹", fee.toFixed(0));
      setDeliveryFee(parseFloat(fee.toFixed(2)));

    } else {
      setDeliveryFee(15); // fallback to minimum
    }

  } catch (e) {
    console.log("Delivery fee error:", e);
    setDeliveryFee(15);
  }
  setLoadingFee(false);
}

  // ─────────────────────────────────────────
  // 📦 LOAD TOKEN + ZONE + DELIVERY FEE
  // ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const t = await AsyncStorage.getItem("token");
      if (t) setUserToken(t);

      const loc = await AsyncStorage.getItem("user_location");
      if (loc) {
        const parsed = JSON.parse(loc);
        const latitude = parsed.latitude;
        const longitude = parsed.longitude;

        if (latitude && longitude) {
          const zoneRes = await fetch(
            `https://yowww.in/index.php/api/v1/config/get-zone-id?lat=${latitude}&lng=${longitude}`
          );
          const zoneJson = await zoneRes.json();
          const zid = zoneJson?.zone_data?.[0]?.id ?? zoneJson?.zone_id ?? zoneJson?.data?.id;
          if (zid) {
            setZoneId(String(zid));
            // ✅ Fetch delivery charge right here
            await fetchDeliveryCharge(String(zid), String(latitude), String(longitude));
          }
        }
      }
    };
    load();
  }, [restaurantId]); // ✅ re-runs if restaurant changes

  // ─────────────────────────────────────────
  // 🧮 CALCULATIONS
  // ─────────────────────────────────────────
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * 0.05;
  const total = discountedSubtotal + deliveryFee + tax;

  useEffect(() => {
    if (items.length === 0) removeCoupon();
  }, [items.length]);

  useEffect(() => {
    recalculateDiscount(subtotal);
  }, [subtotal]);

  // ─────────────────────────────────────────
  // 🛒 EMPTY STATE
  // ─────────────────────────────────────────
  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add items from a restaurant to get started</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.browseBtnText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >

        {/* ── DELIVERY ADDRESS ── */}
        <TouchableOpacity style={styles.addressBar}>
          <Ionicons name="location" size={16} color="#E3AE01" />
          <Text style={styles.addressText} numberOfLines={1}>
            Delivering to your location
          </Text>
          <Ionicons name="chevron-down" size={16} color="#888" />
        </TouchableOpacity>

        {/* ── CART ITEMS ── */}
        <View style={styles.card}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.vegIndicator}>
                <View style={styles.vegDot} />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemPrice}>₹ {item.price}</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => removeItem(item.id)}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{item.qty}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => addItem(item)}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.itemTotal}>₹ {item.price * item.qty}</Text>
            </View>
          ))}

          <View style={styles.sectionDivider} />

          {/* Cutlery toggle */}
          <TouchableOpacity
            style={styles.cutleryRow}
            onPress={() => setCutlery(!cutlery)}
          >
            <Ionicons name="restaurant-outline" size={18} color="#888" />
            <View style={styles.cutleryInfo}>
              <Text style={styles.cutleryTitle}>Cutlery Needed</Text>
              <Text style={styles.cutlerySub}>Avoid plastic - request only if needed</Text>
            </View>
            <View style={[styles.toggle, cutlery && styles.toggleOn]}>
              <View style={[styles.toggleThumb, cutlery && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── COUPON SECTION ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag" size={16} color="#E3AE01" />
            <Text style={styles.sectionHeaderText}>Savings Corner</Text>
          </View>
          <CouponSection
            zoneId={zoneId}
            restaurantId={restaurantId ?? 0}
            cartTotal={subtotal}
            token={userToken}
          />
        </View>

        {/* ── BILL DETAILS ── */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.billHeader}
            onPress={() => setShowBill(!showBill)}
          >
            <View style={styles.billHeaderLeft}>
              <Ionicons name="receipt-outline" size={18} color="#222" />
              <Text style={styles.billHeaderText}>
  To Pay ₹{total.toFixed(2)}
</Text>
            </View>
            <View style={styles.billHeaderRight}>
              <Text style={styles.billIncl}>Incl. all taxes & charges</Text>
              <Ionicons
                name={showBill ? "chevron-up" : "chevron-down"}
                size={16}
                color="#888"
              />
            </View>
          </TouchableOpacity>

          {showBill && (
            <View style={styles.billDetails}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total</Text>
                <Text style={styles.billValue}>₹ {subtotal.toFixed(2)}</Text>
              </View>

              {/* ✅ Delivery fee from backend */}
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                {loadingFee ? (
                  <ActivityIndicator size="small" color="#E3AE01" />
                ) : (
                  <Text style={[
  styles.billValue,
  deliveryFee === 0 && { color: "#48c479" }
]}>
  {deliveryFee === 0 ? "FREE" : `₹ ${deliveryFee.toFixed(2)}`}
</Text>
                )}
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>GST & Restaurant Charges</Text>
                <Text style={styles.billValue}>₹ {tax.toFixed(2)}</Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: "#48c479" }]}>
                    Coupon Discount
                  </Text>
                  <Text style={[styles.billValue, { color: "#48c479" }]}>
                    - ₹ {discountAmount.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>To Pay</Text>
                <Text style={styles.totalValue}>₹ {total.toFixed(2)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── CANCELLATION POLICY ── */}
        <View style={styles.policyBox}>
          <Text style={styles.policyTitle}>Cancellation Policy</Text>
          <Text style={styles.policyText}>
            Please double-check your order and address details. Orders are non-refundable once placed.
          </Text>
        </View>

      </ScrollView>

      {/* ── STICKY BOTTOM BAR ── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Text style={styles.bottomTotal}>₹ {total.toFixed(2)}</Text>
          <TouchableOpacity onPress={() => setShowBill(true)}>
            <Text style={styles.viewBill}>View Detailed Bill</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push("/checkout")}
        >
          <Text style={styles.checkoutText}>Proceed to Pay</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  headerTitle: { fontSize: 18, fontWeight: "700", color: "#222" },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },

  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#222", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 24 },

  browseBtn: {
    backgroundColor: "#E3AE01",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },

  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  addressBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  addressText: { flex: 1, fontSize: 13, color: "#444", fontWeight: "500" },

  card: {
    backgroundColor: "#fff",
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },

  vegIndicator: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: "#2e7d32",
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2e7d32",
  },

  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#222" },
  itemPrice: { fontSize: 13, color: "#888", marginTop: 3 },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E3AE01",
    borderRadius: 8,
    overflow: "hidden",
  },

  stepBtn: {
    width: 30,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  stepBtnText: {
    fontSize: 18,
    color: "#E3AE01",
    fontWeight: "700",
    lineHeight: 22,
  },

  qty: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E3AE01",
    paddingHorizontal: 10,
  },

  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    minWidth: 60,
    textAlign: "right",
  },

  sectionDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 8,
  },

  cutleryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },

  cutleryInfo: { flex: 1 },
  cutleryTitle: { fontSize: 14, fontWeight: "600", color: "#222" },
  cutlerySub: { fontSize: 11, color: "#888", marginTop: 2 },

  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ddd",
    padding: 2,
    justifyContent: "center",
  },

  toggleOn: { backgroundColor: "#E3AE01" },

  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  toggleThumbOn: { alignSelf: "flex-end" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  billHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  billHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  billHeaderText: { fontSize: 16, fontWeight: "700", color: "#222" },

  billHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  billIncl: { fontSize: 11, color: "#48c479", fontWeight: "600" },

  billDetails: { marginTop: 16, gap: 10 },

  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  billLabel: { fontSize: 14, color: "#666" },
  billValue: { fontSize: 14, color: "#222", fontWeight: "600" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
    marginTop: 4,
  },

  totalLabel: { fontSize: 16, fontWeight: "700", color: "#222" },
  totalValue: { fontSize: 16, fontWeight: "700", color: "#222" },

  policyBox: { padding: 16, marginBottom: 8 },
  policyTitle: { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 4 },
  policyText: { fontSize: 12, color: "#aaa", lineHeight: 18 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 60,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  bottomLeft: { flex: 1 },

  bottomTotal: { fontSize: 18, fontWeight: "700", color: "#222" },

  viewBill: {
    fontSize: 12,
    color: "#E3AE01",
    fontWeight: "600",
    marginTop: 2,
  },

  checkoutBtn: {
    backgroundColor: "#48c479",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },

  checkoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});