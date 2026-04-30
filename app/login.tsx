import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  const sendOTP = async () => {
    try {
      const response = await fetch("https://yowww.in/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone,
        }),
      });

      const data = await response.json();

      console.log("LOGIN RESPONSE:", data);

      if (data.otp_required) {
        router.push({
          pathname: "/otp",
          params: { phone: phone },
        });
      }
    } catch (error) {
      console.log("LOGIN ERROR:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/yowww_logo.png")}
        style={styles.logo}
      />

      <Text style={styles.label}>Enter Phone Number</Text>

      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        maxLength={10}
      />

      <TouchableOpacity style={styles.button} onPress={sendOTP}>
        <Text style={styles.buttonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    padding: 24,
  },

  logo: {
    width: "100%",
    height: 180,
    resizeMode: "contain",
    marginBottom: 20,
  },

  tagline: {
    textAlign: "center",
    color: "#E3AE01",
    fontSize: 16,
    marginBottom: 40,
  },

  label: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
  },

  input: {
    height: 55,
    borderWidth: 2,
    borderColor: "#E3AE01",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 30,
  },

  actionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },

  actionText: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 40,
  },

  button: {
    backgroundColor: "#E3AE01",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
