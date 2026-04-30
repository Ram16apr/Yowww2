import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { SafeAreaView } from "react-native-safe-area-context";

const GOOGLE_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"; // 🔑 Replace with your key

export default function LocationScreen() {
  const [detecting, setDetecting] = useState(false);

  // ─────────────────────────────────────────
  // 📍 GPS AUTO DETECT
  // ─────────────────────────────────────────
  async function detectCurrentLocation() {
    setDetecting(true);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please allow location access to continue.",
          [{ text: "OK" }],
        );
        setDetecting(false);
        return;
      }

      // Get GPS coordinates
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const place = geocode[0];

      const address = [
        place?.name,
        place?.street,
        place?.district,
        place?.city,
        place?.region,
      ]
        .filter(Boolean)
        .join(", ");

      // Save to AsyncStorage
      await saveLocation({ latitude, longitude, address });
    } catch (e) {
      console.log("Location error:", e);
      Alert.alert("Error", "Could not detect location. Please try again.");
    }
    setDetecting(false);
  }

  // ─────────────────────────────────────────
  // 💾 SAVE LOCATION & NAVIGATE
  // ─────────────────────────────────────────
  async function saveLocation({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) {
    await AsyncStorage.setItem(
      "user_location",
      JSON.stringify({ latitude, longitude, address }),
    );
    console.log("Location saved:", { latitude, longitude, address });
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Location</Text>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          placeholder="Search for area, street name..."
          fetchDetails={true}
          onPress={(data, details = null) => {
            const lat = details?.geometry?.location?.lat ?? 0;
            const lng = details?.geometry?.location?.lng ?? 0;
            const address = data.description;
            saveLocation({ latitude: lat, longitude: lng, address });
          }}
          query={{
            key: GOOGLE_API_KEY,
            language: "en",
            components: "country:in",
          }}
          styles={{
            textInputContainer: styles.searchInputContainer,
            textInput: styles.searchInput,
            listView: styles.searchResults,
            row: styles.searchRow,
            description: styles.searchDescription,
            separator: styles.searchSeparator,
          }}
          renderLeftButton={() => (
            <View style={styles.searchIcon}>
              <Ionicons name="search" size={20} color="#888" />
            </View>
          )}
          enablePoweredByContainer={false}
          debounce={300}
          minLength={2}
          keepResultsAfterBlur={false}
        />
      </View>

      {/* ── USE CURRENT LOCATION BUTTON ── */}
      <TouchableOpacity
        style={styles.gpsButton}
        onPress={detectCurrentLocation}
        disabled={detecting}
      >
        {detecting ? (
          <ActivityIndicator size="small" color="#E3AE01" />
        ) : (
          <Ionicons name="locate" size={22} color="#E3AE01" />
        )}
        <View style={styles.gpsTextContainer}>
          <Text style={styles.gpsTitle}>
            {detecting ? "Detecting location..." : "Use current location"}
          </Text>
          <Text style={styles.gpsSubtitle}>Using GPS</Text>
        </View>
        {!detecting && (
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        )}
      </TouchableOpacity>

      {/* ── DIVIDER ── */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or search above</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* ── INFO TEXT ── */}
      <View style={styles.infoContainer}>
        <Ionicons name="location-outline" size={40} color="#ddd" />
        <Text style={styles.infoTitle}>Find restaurants near you</Text>
        <Text style={styles.infoSubtitle}>
          Allow location access or search for your area to discover restaurants
          nearby
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  backBtn: {
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },

  // ✅ Fixed: removed zIndex, just normal padding
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },

  searchInputContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 8,
  },

  searchInput: {
    backgroundColor: "#f5f5f5",
    fontSize: 15,
    color: "#222",
    height: 48,
  },

  // ✅ Fixed: not absolute, just normal flow
  searchResults: {
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginTop: 4,
    marginHorizontal: 0,
  },

  searchRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  searchDescription: {
    fontSize: 14,
    color: "#333",
  },

  searchSeparator: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },

  searchIcon: {
    justifyContent: "center",
    paddingLeft: 8,
    paddingRight: 4,
  },

  // ✅ Fixed: proper margin from search bar
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8, // ✅ reduced from 16
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  gpsTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  gpsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },

  gpsSubtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 24,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#f0f0f0",
  },

  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#aaa",
  },

  infoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    marginBottom: 60,
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginTop: 16,
    textAlign: "center",
  },

  infoSubtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
});
