// app/order-tracking.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Order status steps in order ──
const STATUS_STEPS = [
  { key: "pending",    label: "Order Placed",      icon: "receipt-outline" },
  { key: "accepted",   label: "Accepted",           icon: "checkmark-circle-outline" },
  { key: "confirmed",  label: "Confirmed",          icon: "thumbs-up-outline" },
  { key: "processing", label: "Being Prepared",     icon: "restaurant-outline" },
  { key: "handover",   label: "Ready for Pickup",   icon: "bag-handle-outline" },
  { key: "picked_up",  label: "Out for Delivery",   icon: "bicycle-outline" },
  { key: "delivered",  label: "Delivered",          icon: "home-outline" },
];

export default function OrderTracking() {
  const { order_id } = useLocalSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const pollRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      const t = await AsyncStorage.getItem("token");
      if (t) {
        setToken(t);
        fetchTracking(t);
      }
    };
    init();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Poll every 15 seconds ──
  useEffect(() => {
    if (!token) return;
    pollRef.current = setInterval(() => {
      fetchTracking(token);
    }, 15000);
    return () => clearInterval(pollRef.current);
  }, [token]);

  async function fetchTracking(t: string) {
    try {
      const res = await fetch(
        `https://yowww.in/index.php/api/v1/customer/order/track?order_id=${order_id}`,
        {
          headers: {
            Authorization: `Bearer ${t}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      setOrder(data);

      // Stop polling when delivered or cancelled
      if (data.order_status === "delivered" || data.order_status === "canceled") {
        clearInterval(pollRef.current);
      }
    } catch (e) {
      console.log("Tracking error:", e);
    } finally {
      setLoading(false);
    }
  }

  function getCurrentStepIndex() {
    if (!order) return 0;
    const idx = STATUS_STEPS.findIndex((s) => s.key === order.order_status);
    return idx === -1 ? 0 : idx;
  }

  function getStatusTime(key: string) {
    if (!order?.[key]) return null;
    const date = new Date(order[key]);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function callRider() {
    if (order?.rider_phone_number) {
      Linking.openURL(`tel:${order.rider_phone_number}`);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#E3AE01" />
          <Text style={styles.loadingText}>Fetching your order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Order not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = getCurrentStepIndex();
  const isCancelled = order.order_status === "canceled";
  const isDelivered = order.order_status === "delivered";

  const userLat = parseFloat(order.delivery_address?.latitude || "12.9716");
  const userLng = parseFloat(order.delivery_address?.longitude || "77.5946");
  const restLat = parseFloat(order.restaurant?.latitude || "12.9716");
  const restLng = parseFloat(order.restaurant?.longitude || "77.5946");

  const midLat = (userLat + restLat) / 2;
  const midLng = (userLng + restLng) / 2;
  const latDelta = Math.abs(userLat - restLat) * 2 + 0.05;
  const lngDelta = Math.abs(userLng - restLng) * 2 + 0.05;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={22} color="#222" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Track Order</Text>
          <Text style={styles.headerSub}>#{order.id}</Text>
        </View>
        {order.rider_phone_number && (
          <TouchableOpacity style={styles.callBtn} onPress={callRider}>
            <Ionicons name="call" size={18} color="#fff" />
            <Text style={styles.callBtnText}>Call Rider</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── MAP ── */}
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: midLat,
              longitude: midLng,
              latitudeDelta: latDelta,
              longitudeDelta: lngDelta,
            }}
          >
            {/* User location marker */}
            <Marker
              coordinate={{ latitude: userLat, longitude: userLng }}
              title="Your Location"
              description={order.delivery_address?.address}
            >
              <View style={styles.markerUser}>
                <Ionicons name="home" size={16} color="#fff" />
              </View>
            </Marker>

            {/* Restaurant marker */}
            <Marker
              coordinate={{ latitude: restLat, longitude: restLng }}
              title={order.restaurant?.name}
              description={order.restaurant?.address}
            >
              <View style={styles.markerRestaurant}>
                <Ionicons name="restaurant" size={16} color="#fff" />
              </View>
            </Marker>

            {/* Dotted line between restaurant and user */}
            <Polyline
              coordinates={[
                { latitude: restLat, longitude: restLng },
                { latitude: userLat, longitude: userLng },
              ]}
              strokeColor="#E3AE01"
              strokeWidth={2}
              lineDashPattern={[8, 4]}
            />
          </MapView>

          {/* Status pill over map */}
          <View style={[
            styles.statusPill,
            isCancelled && styles.statusPillCancelled,
            isDelivered && styles.statusPillDelivered,
          ]}>
            <View style={[
              styles.statusDot,
              !isCancelled && !isDelivered && styles.statusDotPulse,
            ]} />
            <Text style={styles.statusPillText}>
              {isCancelled ? "❌ Order Cancelled" :
               isDelivered ? "✅ Delivered!" :
               STATUS_STEPS[currentStep]?.label || "Processing"}
            </Text>
          </View>
        </View>

        {/* ── ORDER INFO CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{order.restaurant?.name}</Text>
              <Text style={styles.restaurantAddress} numberOfLines={1}>
                {order.restaurant?.address}
              </Text>
            </View>
            <View style={styles.amountWrap}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={styles.amountValue}>₹{order.order_amount}</Text>
            </View>
          </View>

          {/* OTP */}
          {order.otp && !isDelivered && (
            <View style={styles.otpRow}>
              <Ionicons name="lock-closed-outline" size={14} color="#888" />
              <Text style={styles.otpText}>
                Delivery OTP: <Text style={styles.otpCode}>{order.otp}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* ── STATUS STEPS ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Progress</Text>

          {isCancelled ? (
            <View style={styles.cancelledWrap}>
              <Ionicons name="close-circle" size={40} color="#e53935" />
              <Text style={styles.cancelledText}>Order Cancelled</Text>
              {order.cancellation_reason && (
                <Text style={styles.cancelledReason}>{order.cancellation_reason}</Text>
              )}
            </View>
          ) : (
            STATUS_STEPS.map((step, index) => {
              const isDone = index <= currentStep;
              const isActive = index === currentStep;
              const time = getStatusTime(step.key);
              const isLast = index === STATUS_STEPS.length - 1;

              return (
                <View key={step.key} style={styles.stepRow}>
                  {/* Line + Icon */}
                  <View style={styles.stepLeft}>
                    <View style={[
                      styles.stepIcon,
                      isDone && styles.stepIconDone,
                      isActive && styles.stepIconActive,
                    ]}>
                      <Ionicons
                        name={isDone ? "checkmark" : step.icon as any}
                        size={16}
                        color={isDone ? "#fff" : "#ccc"}
                      />
                    </View>
                    {!isLast && (
                      <View style={[styles.stepLine, isDone && index < currentStep && styles.stepLineDone]} />
                    )}
                  </View>

                  {/* Label + time */}
                  <View style={styles.stepRight}>
                    <Text style={[
                      styles.stepLabel,
                      isDone && styles.stepLabelDone,
                      isActive && styles.stepLabelActive,
                    ]}>
                      {step.label}
                    </Text>
                    {time && <Text style={styles.stepTime}>{time}</Text>}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── DELIVERY ADDRESS ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Address</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color="#E3AE01" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.addressName}>
                {order.delivery_address?.contact_person_name}
              </Text>
              <Text style={styles.addressText}>
                {order.delivery_address?.address}
              </Text>
            </View>
          </View>
        </View>

        {/* ── RIDER INFO ── */}
        {order.rider_name && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Delivery Partner</Text>
            <View style={styles.riderRow}>
              <View style={styles.riderAvatar}>
                <Ionicons name="person" size={24} color="#E3AE01" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.riderName}>{order.rider_name}</Text>
                <Text style={styles.riderPhone}>{order.rider_phone_number}</Text>
              </View>
              <TouchableOpacity style={styles.riderCallBtn} onPress={callRider}>
                <Ionicons name="call" size={20} color="#E3AE01" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── ACTIONS ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(tabs)/orders")}
          >
            <Ionicons name="list-outline" size={18} color="#E3AE01" />
            <Text style={styles.actionBtnText}>All Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => router.push("/")}
          >
            <Ionicons name="home-outline" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>Home</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontSize: 15, color: "#888" },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
    gap: 12,
  },
  backIcon: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#222" },
  headerSub: { fontSize: 12, color: "#888", marginTop: 1 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E3AE01",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // ── Map ──
  mapWrap: { position: "relative", height: 260 },
  map: { width: "100%", height: "100%" },
  markerUser: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#E3AE01",
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "#fff",
    elevation: 4,
  },
  markerRestaurant: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#1a73e8",
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "#fff",
    elevation: 4,
  },
  statusPill: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    left: 16, right: 16,
    backgroundColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
    elevation: 6,
  },
  statusPillCancelled: { backgroundColor: "#e53935" },
  statusPillDelivered: { backgroundColor: "#48c479" },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#E3AE01",
  },
  statusDotPulse: { backgroundColor: "#E3AE01" },
  statusPillText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // ── Card ──
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#222", marginBottom: 14 },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  restaurantInfo: { flex: 1, marginRight: 12 },
  restaurantName: { fontSize: 15, fontWeight: "700", color: "#222" },
  restaurantAddress: { fontSize: 12, color: "#888", marginTop: 2 },
  amountWrap: { alignItems: "flex-end" },
  amountLabel: { fontSize: 11, color: "#888" },
  amountValue: { fontSize: 18, fontWeight: "800", color: "#222" },
  otpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#fff8e1",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E3AE01",
  },
  otpText: { fontSize: 13, color: "#555" },
  otpCode: { fontWeight: "800", color: "#E3AE01", fontSize: 16, letterSpacing: 2 },

  // ── Status Steps ──
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 52,
  },
  stepLeft: { alignItems: "center", width: 36, marginRight: 14 },
  stepIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#eee",
  },
  stepIconDone: { backgroundColor: "#48c479", borderColor: "#48c479" },
  stepIconActive: { backgroundColor: "#E3AE01", borderColor: "#E3AE01" },
  stepLine: {
    width: 2, flex: 1,
    backgroundColor: "#eee",
    marginVertical: 2,
    minHeight: 20,
  },
  stepLineDone: { backgroundColor: "#48c479" },
  stepRight: { flex: 1, paddingTop: 6, paddingBottom: 16 },
  stepLabel: { fontSize: 14, color: "#aaa", fontWeight: "500" },
  stepLabelDone: { color: "#555" },
  stepLabelActive: { color: "#222", fontWeight: "700" },
  stepTime: { fontSize: 12, color: "#aaa", marginTop: 2 },

  // ── Cancelled ──
  cancelledWrap: { alignItems: "center", paddingVertical: 20, gap: 8 },
  cancelledText: { fontSize: 18, fontWeight: "700", color: "#e53935" },
  cancelledReason: { fontSize: 13, color: "#888", textAlign: "center" },

  // ── Address ──
  addressRow: { flexDirection: "row", alignItems: "flex-start" },
  addressName: { fontSize: 14, fontWeight: "600", color: "#222" },
  addressText: { fontSize: 13, color: "#888", marginTop: 2, lineHeight: 18 },
  backBtn: {
    backgroundColor: "#E3AE01", paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 10,
  },
  backBtnText: { color: "#fff", fontWeight: "700" },

  // ── Rider ──
  riderRow: { flexDirection: "row", alignItems: "center" },
  riderAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#fff8e1",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "#E3AE01",
  },
  riderName: { fontSize: 15, fontWeight: "700", color: "#222" },
  riderPhone: { fontSize: 13, color: "#888", marginTop: 2 },
  riderCallBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: "#E3AE01",
    justifyContent: "center", alignItems: "center",
  },

  // ── Actions ──
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E3AE01",
    backgroundColor: "#fff",
  },
  actionBtnPrimary: { backgroundColor: "#E3AE01", borderColor: "#E3AE01" },
  actionBtnText: { fontSize: 14, fontWeight: "700", color: "#E3AE01" },
});