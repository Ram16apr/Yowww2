import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCartStore } from "../store/CartStore";

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, clearCart, restaurantId } = useCartStore();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = 1;
  const tax = subtotal * 0.05;
  const total = subtotal + deliveryFee + tax;

  async function startPayment() {
    try {
      const cartItems = items.map((item) => ({
        item_id: item.id,
        item_type: "App\\Models\\Food",
        quantity: item.qty,
        price: item.price,
        variation: [],
        add_on_ids: [],
        add_on_qtys: [],
      }));

      console.log("Cart items being sent:", JSON.stringify(cartItems, null, 2));

      // ✅ Get user location
      const loc = await AsyncStorage.getItem("user_location");
      const parsed = loc ? JSON.parse(loc) : null;
      const userLat = String(
        parsed?.latitude ?? parsed?.coords?.latitude ?? "12.9716",
      );
      const userLng = String(
        parsed?.longitude ?? parsed?.coords?.longitude ?? "77.5946",
      );
      const userAddress = parsed?.address ?? "Bengaluru, Karnataka";
      console.log("User location:", userLat, userLng, userAddress);

      // ✅ Get user token
      const userStr = await AsyncStorage.getItem("user");
      const userData = userStr ? JSON.parse(userStr) : null;
      const authToken = userData?.token;
      console.log("Auth token:", authToken ? "found" : "missing");

      // ✅ Fetch real user info
      const userInfoRes = await fetch(
        "https://yowww.in/index.php/api/v1/customer/info",
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      const userInfo = await userInfoRes.json();
      console.log("User info:", JSON.stringify(userInfo, null, 2));

      // STEP 1 — Place food order FIRST
      console.log("Placing order with restaurant_id:", restaurantId);

      const orderResponse = await fetch(
        "https://yowww.in/index.php/api/v1/customer/order/place",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            order_amount: total,
            payment_method: "digital_payment",
            order_type: "delivery",
            distance: 3,
            address: userAddress,
            latitude: userLat,
            longitude: userLng,
            contact_person_name:
              `${userInfo?.f_name ?? ""} ${userInfo?.l_name ?? ""}`.trim(),
            contact_person_number: userInfo?.phone ?? "8296489005",
            is_buy_now: 1,
            cart: cartItems,
            
          }),
        },
      );

      const orderRaw = await orderResponse.text();
      console.log("Order raw:", orderRaw);
      const orderData = JSON.parse(orderRaw);
      console.log("📦 ORDER RESPONSE:", JSON.stringify(data, null, 2));
      console.log("Order created:", orderData);

      if (!orderData?.order_id) {
        alert("Failed to place order: " + JSON.stringify(orderData));
        return;
      }

      // Test tracking API
const trackRes = await fetch(
  `https://yowww.in/index.php/api/v1/customer/order/track?order_id=${orderData.order_id}`,
  {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  }
);
const trackData = await trackRes.json();
console.log("🗺️ TRACK DATA:", JSON.stringify(trackData, null, 2));


      // STEP 2 — Create Razorpay order WITH order_id as receipt
      const response = await fetch(
        "https://yowww.in/index.php/api/v1/razorpay/createOrder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            amount: total,
            receipt: String(orderData.order_id),
          }),
        },
      );

      const rawOrder = await response.text();
      console.log("Razorpay order raw:", rawOrder);

      let data;
      try {
        data = JSON.parse(rawOrder);
      } catch (e) {
        alert("Server error creating Razorpay order");
        return;
      }

      if (!data.success) {
        alert("Unable to create payment order: " + JSON.stringify(data));
        return;
      }

      // STEP 3 — Open Razorpay checkout
      const options = {
        description: "Yowww Food Order",
        image: "https://yowww.in/logo.png",
        currency: "INR",
        key: data.key,
        amount: data.amount,
        order_id: data.order_id,
        name: "Yowww",
        theme: { color: "#E3AE01" },
        prefill: {
          name: `${userInfo?.f_name ?? "Yowww"} ${userInfo?.l_name ?? "User"}`,
          email: userInfo?.email ?? "customer@yowww.in",
          contact: userInfo?.phone ?? "9999999999",
        },
      };

      const payment = await RazorpayCheckout.open(options);
      console.log("Payment success:", payment);

      // STEP 4 — Verify payment
      const verifyResponse = await fetch(
        "https://yowww.in/index.php/api/v1/razorpay/verifyPayment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            razorpay_payment_id: payment.razorpay_payment_id,
            razorpay_order_id: payment.razorpay_order_id,
            razorpay_signature: payment.razorpay_signature,
          }),
        },
      );

      const verifyRaw = await verifyResponse.text();
      console.log("Verify raw:", verifyRaw);
      const verifyData = JSON.parse(verifyRaw);
      console.log("Verify data:", verifyData);

      if (!verifyData.success) {
        alert("Payment verification failed: " + JSON.stringify(verifyData));
        return;
      }

      // STEP 5 — Clear cart and redirect
      clearCart();
      router.replace({
        pathname: "/order-success",
        params: {
          order_id: orderData.order_id,
          delivery_time: "30-40",
        },
      });
    } catch (error: any) {
      if (error?.code === "PAYMENT_CANCELLED") {
        alert("Payment cancelled");
      } else {
        console.log("Payment error:", error);
        alert("Payment failed: " + error?.message);
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.name} x {item.qty}
            </Text>
            <Text style={styles.itemPrice}>₹ {item.price * item.qty}</Text>
          </View>
        )}
      />

      <View style={styles.summary}>
        <View style={styles.row}>
          <Text>Subtotal</Text>
          <Text>₹ {subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Delivery</Text>
          <Text>₹ {deliveryFee}</Text>
        </View>
        <View style={styles.row}>
          <Text>Tax</Text>
          <Text>₹ {tax.toFixed(2)}</Text>
        </View>
        <View style={styles.rowTotal}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalText}>₹ {total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.payButton} onPress={startPayment}>
          <Text style={styles.payText}>PAY ₹ {total.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", padding: 16 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  itemName: { fontWeight: "500" },
  itemPrice: { fontWeight: "600" },
  summary: { padding: 20, borderTopWidth: 1, borderColor: "#eee" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  rowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  totalText: { fontSize: 18, fontWeight: "700" },
  payButton: {
    marginTop: 20,
    backgroundColor: "#E3AE01",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  payText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
