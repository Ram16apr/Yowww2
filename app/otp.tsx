import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  registerForPushNotifications,
  sendFcmTokenToBackend,
} from "../utils/notifications";

export default function OTPScreen() {
  const { phone } = useLocalSearchParams();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<any[]>([]);

  const handleChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      inputs.current[index + 1].focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");

    if (code.length < 4) {
      alert("Please enter the complete OTP");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "https://yowww.in/index.php/api/v1/auth/verify_login_otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            phone: phone,
            otp: code,
          }),
        }
      );

      const raw = await res.text();
      console.log("OTP verify raw:", raw);

      const data = JSON.parse(raw);
      console.log("OTP verify data:", JSON.stringify(data, null, 2));

      if (data?.token) {
        // ✅ Save token and user info
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("user", JSON.stringify(data?.user ?? data));

        console.log("Token saved:", data.token);
        console.log("User saved:", JSON.stringify(data?.user));

        // ✅ Register FCM token and send to backend
        try {
          const fcmToken = await registerForPushNotifications();
          if (fcmToken) {
            await sendFcmTokenToBackend(fcmToken);
            console.log("✅ FCM token registered after login");
          }
        } catch (fcmError) {
          console.log("FCM error (non-blocking):", fcmError);
          // Don't block navigation if FCM fails
        }

        router.replace("/(tabs)");
      } else {
        alert("Invalid OTP: " + (data?.message ?? JSON.stringify(data)));
      }
    } catch (e) {
      console.log("OTP verify error:", e);
      alert("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>Sent to {phone}</Text>

      <View style={styles.row}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref)}
            style={styles.box}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={verifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "600" }}>Verify OTP</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    color: "#666",
    marginBottom: 30,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 30,
  },
  box: {
    width: 55,
    height: 60,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 22,
  },
  button: {
    backgroundColor: "#E3AE01",
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
  },
});