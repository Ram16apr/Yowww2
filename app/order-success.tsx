import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrderSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const orderId = params?.order_id || "10001";
  const deliveryTime = params?.delivery_time || "30-40";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Order Confirmed 🎉</Text>

        <Text style={styles.subtitle}>
          Your restaurant has received the order.
        </Text>

        <Text style={styles.delivery}>Delivery in {deliveryTime} minutes</Text>

        <Text style={styles.orderId}>Order #{orderId}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.trackButton}
          // Change the "Track Order" button to:
        onPress={() => router.push({pathname: "/order-tracking",params: { order_id: orderId }})}
        >
          <Text style={styles.trackText}>TRACK ORDER</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/")}>
          <Text style={styles.homeText}>GO TO HOME</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "space-between",
  },

  center: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
  },

  animation: {
    width: 220,
    height: 220,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 10,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },

  delivery: {
    marginTop: 12,
    fontSize: 16,
    color: "#E3AE01",
    fontWeight: "700",
  },

  orderId: {
    marginTop: 14,
    fontSize: 14,
    color: "#999",
  },

  actions: {
    padding: 24,
  },

  trackButton: {
    backgroundColor: "#E3AE01",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  trackText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  homeText: {
    marginTop: 18,
    textAlign: "center",
    color: "#444",
    fontWeight: "600",
  },
});
