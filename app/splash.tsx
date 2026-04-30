import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  registerForPushNotifications,
  sendFcmTokenToBackend,
} from "../utils/notifications";

export default function Splash() {
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeApp();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  async function initializeApp() {
    try {
      const userStr = await AsyncStorage.getItem("user");
      const userData = userStr ? JSON.parse(userStr) : null;
      const token = userData?.token ?? await AsyncStorage.getItem("token");

      // ── Get Location ──
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        let address = "Unknown location";
        if (reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          address = [place.name, place.street, place.city]
            .filter(Boolean)
            .join(", ");
        }

        await AsyncStorage.setItem(
          "user_location",
          JSON.stringify({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            address,
          })
        );
      }

      // ── Register FCM if logged in ──
      if (token) {
        try {
          const fcmToken = await registerForPushNotifications();
          if (fcmToken) {
            await sendFcmTokenToBackend(fcmToken);
            console.log("✅ FCM token registered");
          }
        } catch (e) {
          console.log("FCM registration error:", e);
          // Don't block navigation if FCM fails
        }

        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    } catch (error) {
      console.log("Initialization error:", error);
      router.replace("/login");
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800", color: "#E3AE01" }}>
        Yowww 🍔
      </Text>
      <ActivityIndicator size="large" color="#E3AE01" style={{ marginTop: 20 }} />
      <Text style={{ color: "#888", marginTop: 12 }}>Loading...</Text>
    </View>
  );
}