import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { LogBox } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  registerForPushNotifications,
  sendFcmTokenToBackend,
} from "../utils/notifications";

LogBox.ignoreLogs(["Unable to activate keep awake"]);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    ...Ionicons.font,
  });

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      console.log("App started");
      setupNotifications();
    }
  }, [loaded]);

  async function setupNotifications() {
    // Register and get FCM token
    const token = await registerForPushNotifications();
    if (token) {
      await sendFcmTokenToBackend(token);
    }

    // ✅ Listen for notifications received while app is open
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

    // ✅ Listen for when user taps a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("Notification tapped:", data);

        // ✅ Navigate based on notification type
        if (data?.type === "order_status" || data?.order_id) {
          router.push({
            pathname: "/order-tracking",
            params: { order_id: data.order_id },
          });
        } else if (data?.type === "message") {
          router.push("/chat");
        }
      });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }

  if (!loaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="splash">
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="location" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="order-tracking" />
    </Stack>
  );
}