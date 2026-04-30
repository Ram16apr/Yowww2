import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Configure how notifications appear when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─────────────────────────────────────────
// 📱 REGISTER FOR PUSH NOTIFICATIONS
// ─────────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications only work on physical devices");
    return null;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  // Android channel setup
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order Updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#E3AE01",
      sound: "default",
    });
  }

  // Get FCM token
  const token = await Notifications.getDevicePushTokenAsync();
  console.log("FCM Token:", token.data);

  // Save token to AsyncStorage
  await AsyncStorage.setItem("fcm_token", token.data);

  return token.data;
}

// ─────────────────────────────────────────
// 📤 SEND FCM TOKEN TO BACKEND
// ─────────────────────────────────────────
export async function sendFcmTokenToBackend(fcmToken: string) {
  try {
    const userStr = await AsyncStorage.getItem("user");
    const userData = userStr ? JSON.parse(userStr) : null;
    const authToken = userData?.token;

    if (!authToken) return;

    const res = await fetch(
      "https://yowww.in/index.php/api/v1/customer/cm-firebase-token",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-localization": "en",
        },
        body: JSON.stringify({
          cm_firebase_token: fcmToken,
        }),
      }
    );

    const data = await res.json();
    console.log("FCM token sent to backend:", data);
  } catch (e) {
    console.log("Error sending FCM token:", e);
  }
}