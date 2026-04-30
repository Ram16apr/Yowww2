import { colors, spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import FloatingCart from "../../components/FloatingCart";
import { Switch } from "react-native";

import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";

const CATEGORIES = [
  { label: "Biryani", emoji: "🍛" },
  { label: "Burger", emoji: "🍔" },
  { label: "Pizza", emoji: "🍕" },
  { label: "Noodles", emoji: "🍜" },
  { label: "Dessert", emoji: "🍦" },
  { label: "Rolls", emoji: "🌯" },
];

const FILTERS = ["All", "Rating 4.0+", "Fast Delivery", "Offers", "Free Delivery"];

export default function Home() {
  const localRouter = useRouter(); // ✅ add this line
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [zoneId, setZoneId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [address, setAddress] = useState("Select location");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [banners, setBanners] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [topCoupons, setTopCoupons] = useState<any[]>([]);
  const [pureVegOnly, setPureVegOnly] = useState(false);

  useEffect(() => {
    const load = async () => {
      const loc = await AsyncStorage.getItem("user_location");
      if (loc) {
        const parsed = JSON.parse(loc);
        setAddress(parsed.address || "Select location");
      }
    };
    load();
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, []);

  async function loadRestaurants() {
    try {
      const loc = await AsyncStorage.getItem("user_location");
      if (!loc) { setLoading(false); return; }

      const parsed = JSON.parse(loc);
      const latitude = parsed.latitude ?? parsed.coords?.latitude;
      const longitude = parsed.longitude ?? parsed.coords?.longitude;
      if (!latitude || !longitude) { setLoading(false); return; }

      setLat(String(latitude));
      setLng(String(longitude));

      const zoneRes = await fetch(
        `https://yowww.in/index.php/api/v1/config/get-zone-id?lat=${latitude}&lng=${longitude}`
      );
      const zoneText = await zoneRes.text();
      let zoneJson;
      try { zoneJson = JSON.parse(zoneText); }
      catch (e) { setLoading(false); return; }

      const zid = zoneJson?.zone_data?.[0]?.id ?? zoneJson?.zone_id ?? zoneJson?.data?.id;
      if (!zid) { setLoading(false); return; }
      setZoneId(String(zid));

      // ── Fetch Restaurants ──
      const res = await fetch(
        `https://yowww.in/index.php/api/v1/restaurants/get-restaurants/all?limit=50&offset=1&type=all`,
        {
          headers: {
            zoneId: `[${zid}]`,
            latitude: String(latitude),
            longitude: String(longitude),
            "X-localization": "en",
          },
        }
      );
      const json = await res.json();
      const list = json?.restaurants?.data || json?.restaurants || json?.data || [];
      setRestaurants(list);

      // ── Fetch Banners ──
      const bannerRes = await fetch(`https://yowww.in/index.php/api/v1/banners`, {
        headers: {
          zoneId: `[${zid}]`,
          latitude: String(latitude),
          longitude: String(longitude),
          "X-localization": "en",
        },
      });
      const bannerJson = JSON.parse(await bannerRes.text());
      setBanners(bannerJson?.banners || []);

      // ── Fetch Coupons ──
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const couponRes = await fetch(
          `https://yowww.in/index.php/api/v1/coupon/list`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              zoneId: `[${zid}]`,
              "X-localization": "en",
            },
          }
        );
        const couponJson = await couponRes.json();
        const coupons = Array.isArray(couponJson)
          ? couponJson
          : couponJson?.coupons || couponJson?.data || [];
        setTopCoupons(coupons.slice(0, 5)); // ✅ show up to 5 coupons
      }

    } catch (e) {
      console.log("Load error:", e);
    }
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadRestaurants();
    setRefreshing(false);
  }

  // ── Apply filters ──
  const filtered = restaurants
    .filter((r: any) => r?.name?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => {
      if (pureVegOnly && r.veg !== 1) return false;
      if (activeCategory) {
        const cuisines = Array.isArray(r.cuisine)
          ? r.cuisine.map((c: any) => c.name.toLowerCase())
          : [];
        const name = r.name?.toLowerCase() || "";
        if (!cuisines.some((c: string) => c.includes(activeCategory.toLowerCase())) &&
            !name.includes(activeCategory.toLowerCase())) return false;
      }
      if (activeFilter === "Rating 4.0+") return parseFloat(r.avg_rating) >= 4.0;
      if (activeFilter === "Fast Delivery") return (r.min_delivery_time || 60) <= 30;
      if (activeFilter === "Offers") return r.discount > 0;
      if (activeFilter === "Free Delivery") return r.free_delivery;
      return true;
    });

  function getRestaurantImage(item: any) {
    if (item?.cover_photo_full_url?.image) return item.cover_photo_full_url.image;
    if (typeof item?.cover_photo_full_url === "string" && item.cover_photo_full_url.startsWith("http"))
      return item.cover_photo_full_url;
    if (item?.logo_full_url?.image) return item.logo_full_url.image;
    if (typeof item?.logo_full_url === "string" && item.logo_full_url.startsWith("http"))
      return item.logo_full_url;
    if (item?.cover_photo && item.cover_photo !== "def.png")
      return `https://yowww.in/storage/app/public/restaurant/cover/${item.cover_photo}`;
    if (item?.logo && item.logo !== "def.png")
      return `https://yowww.in/storage/app/public/restaurant/${item.logo}`;
    return `https://picsum.photos/seed/${item?.id}/600/300`;
  }

  // ─────────────────────────────────────────
  // 🃏 RESTAURANT CARD
  // ─────────────────────────────────────────
  const renderRestaurant = ({ item }: any) => {
    const image = getRestaurantImage(item);
    const cuisines = Array.isArray(item.cuisine)
      ? item.cuisine.map((c: any) => c.name).join(", ")
      : "Restaurant";
    const rating = item?.avg_rating && parseFloat(item.avg_rating) > 0
      ? parseFloat(item.avg_rating).toFixed(1) : null;
    const ratingCount = item?.rating_count || 0;
    const isTopRated = rating && parseFloat(rating) >= 4.1;
    const isVeg = item.veg === 1;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/restaurant/[id]",
            params: { id: item.id, zoneId, lat, lng },
          })
        }
      >
        {/* ── COVER IMAGE ── */}
        <View style={styles.cardImageContainer}>
          <Image source={{ uri: image }} style={styles.cardImage} resizeMode="cover" />

          {/* Veg tag */}
          {isVeg && (
            <View style={styles.vegTag}>
              <Text style={styles.vegTagText}>🌿 VEG</Text>
            </View>
          )}

          {/* Offer badge */}
          {item.discount > 0 && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerText}>
                🏷 {item.discount}% OFF up to ₹{item.discount_amount || 80}
              </Text>
            </View>
          )}

          {/* Time badge */}
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>
              🕐 {item.min_delivery_time && item.max_delivery_time
                ? `${item.min_delivery_time}-${item.max_delivery_time} min`
                : item.delivery_time || "30-40 min"}
            </Text>
          </View>
        </View>

        {/* ── RESTAURANT INFO ── */}
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            {rating && ratingCount > 0 ? (
              <View style={[styles.ratingBadge, {
                backgroundColor: parseFloat(rating) >= 4.0 ? "#48c479" : "#f97316"
              }]}>
                <Ionicons name="star" size={10} color="#fff" />
                <Text style={styles.ratingText}> {rating} ({ratingCount})</Text>
              </View>
            ) : (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardCuisine} numberOfLines={1}>{cuisines}</Text>

          <View style={styles.cardFooterRow}>
            <View style={styles.cardFooterLeft}>
              <View style={styles.footerInfo}>
                <Ionicons name="bicycle-outline" size={12} color="#888" />
                <Text style={styles.footerInfoText}>
                  {item.free_delivery ? "Free Delivery" : `₹${item.delivery_fee} delivery`}
                </Text>
              </View>
              {item.distance && (
                <View style={styles.footerInfo}>
                  <Ionicons name="location-outline" size={12} color="#888" />
                  {/* ✅ Fixed decimal places */}
                  <Text style={styles.footerInfoText}>
                    {parseFloat(item.distance).toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cardBadges}>
              {isTopRated && (
                <View style={styles.topRatedBadge}>
                  <Text style={styles.topRatedText}>🏆 Top Rated</Text>
                </View>
              )}
              {item.free_delivery && (
                <View style={styles.freeDeliveryBadge}>
                  <Text style={styles.freeDeliveryText}>🛵 Free</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────
  // ⏳ LOADING SKELETON
  // ─────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ScrollView style={{ padding: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonImage} />
              <View style={{ padding: 12 }}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: "60%", marginTop: 8 }]} />
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <FlatList
        key="1-column"
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRestaurant}
        numColumns={1}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <>
            {/* ── HEADER ── */}
            <View style={styles.header}>
  {/* Address — left side */}
  <TouchableOpacity
    style={styles.addressSection}
    onPress={() => router.push("/location")}
  >
    <View style={styles.addressRow}>
      <View style={styles.locationDot} />
      <Text style={styles.addressLabel}>Home</Text>
      <Ionicons name="chevron-down" size={14} color="#222" />
    </View>
    <Text numberOfLines={1} style={styles.addressText}>{address}</Text>
  </TouchableOpacity>

  {/* Right side — isolated from address touch area */}
  <View style={styles.headerRight}>
    <View style={styles.vegToggleWrap}>
      <Text style={[styles.vegToggleLabel, pureVegOnly && styles.vegToggleLabelActive]}>
        🌿 Veg
      </Text>
      <Switch
        value={pureVegOnly}
        onValueChange={(v) => setPureVegOnly(v)}
        trackColor={{ false: "#eee", true: "#a5d6a7" }}
        thumbColor={pureVegOnly ? "#2e7d32" : "#ccc"}
        ios_backgroundColor="#eee"
      />
    </View>

    <TouchableOpacity
      onPress={() => {
        console.log("👤 Pressed");
        router.push("/(tabs)/account");
      }}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
    >
      <View style={styles.profileAvatar}>
        <Ionicons name="person" size={20} color="#E3AE01" />
      </View>
    </TouchableOpacity>
  </View>
</View>

            {/* ── SEARCH BAR ── */}
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search for restaurants, dishes..."
                placeholderTextColor="#aaa"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color="#aaa" />
                </TouchableOpacity>
              )}
            </View>

            {/* ── COUPON CARDS (horizontal scroll) ── */}
            {topCoupons.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 16 }}
              >
                {topCoupons.map((coupon: any, i: number) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.9}
                    style={[styles.couponCard, { marginLeft: i === 0 ? 16 : 10 }]}
                    onPress={() => router.push("/cart")}
                  >
                    {/* Left — discount amount */}
                    <View style={styles.couponCardLeft}>
                      <Text style={styles.couponCardValue}>
                        {coupon.discount_type === "percent"
                          ? `${coupon.discount}%`
                          : `₹${coupon.discount}`}
                      </Text>
                      <Text style={styles.couponCardOff}>OFF</Text>
                    </View>

                    {/* Dashed divider */}
                    <View style={styles.couponCardDivider} />

                    {/* Right — details */}
                    <View style={styles.couponCardRight}>
                      <Text style={styles.couponCardCode}>{coupon.code}</Text>
                      <Text style={styles.couponCardMin}>
                        Min ₹{coupon.min_purchase}
                      </Text>
                      {coupon.max_discount > 0 && (
                        <Text style={styles.couponCardMax}>
                          Upto ₹{coupon.max_discount}
                        </Text>
                      )}
                      <View style={styles.couponCardBtn}>
                        <Text style={styles.couponCardBtnText}>Apply →</Text>
                      </View>
                    </View>

                    {/* Decorative circles */}
                    <View style={[styles.couponCircle, styles.couponCircleTop]} />
                    <View style={[styles.couponCircle, styles.couponCircleBottom]} />
                  </TouchableOpacity>
                ))}
                <View style={{ width: 16 }} />
              </ScrollView>
            )}

            {/* ── BANNERS ── */}
            {banners.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 16 }}
              >
                {banners.map((banner: any, i: number) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.9}
                    style={{ marginLeft: 16, borderRadius: 16, overflow: "hidden" }}
                    onPress={() =>
                      router.push({
                        pathname: "/restaurant/[id]",
                        params: { id: banner?.restaurant?.id, zoneId, lat, lng },
                      })
                    }
                  >
                    <Image
                      source={{ uri: banner?.image_full_url }}
                      style={{ width: 320, height: 160, borderRadius: 16 }}
                      resizeMode="cover"
                    />
                    <View style={styles.bannerOverlay}>
                      <Text style={styles.bannerTitle}>{banner?.title}</Text>
                      <Text style={styles.bannerSub}>{banner?.restaurant?.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={{ width: 16 }} />
              </ScrollView>
            )}

            {/* ── CATEGORIES ── */}
            <Text style={styles.sectionTitle}>What's on your mind?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
            >
              {CATEGORIES.map((cat, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.categoryCard,
                    activeCategory === cat.label && styles.categoryCardActive,
                  ]}
                  onPress={() =>
                    setActiveCategory(activeCategory === cat.label ? null : cat.label)
                  }
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryLabel,
                    activeCategory === cat.label && styles.categoryLabelActive,
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 16 }} />
            </ScrollView>

            {/* ── FILTER CHIPS ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 14 }}
            >
              {FILTERS.map((f, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.filterChip,
                    activeFilter === f && styles.filterChipActive,
                    { marginLeft: i === 0 ? 16 : 8 },
                  ]}
                  onPress={() => setActiveFilter(f)}
                >
                  <Text style={[
                    styles.filterChipText,
                    activeFilter === f && styles.filterChipTextActive,
                  ]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 16 }} />
            </ScrollView>

            {/* ── DIVIDER ── */}
            <View style={styles.divider} />

            {/* ── ALL RESTAURANTS HEADER ── */}
            <View style={styles.allRestaurantsHeader}>
              <Text style={styles.sectionTitle}>All Restaurants</Text>
              <Text style={styles.restaurantCount}>{filtered.length} places</Text>
            </View>
          </>
        }
      />

      {/* ── FLOATING CART ── */}
      <FloatingCart />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  addressSection: { flex: 1 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E3AE01" },
  addressLabel: { fontSize: 16, fontWeight: "800", color: "#222" },
  addressText: { fontSize: 12, color: "#888", marginTop: 2, marginLeft: 14 },
  profileBtn: { marginLeft: 8 },
  profileAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#fff8e1",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "#E3AE01",
  },

  headerRight: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  zIndex: 10,
},

  // ── Veg Toggle ──
  vegToggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  vegToggleLabel: { fontSize: 12, fontWeight: "700", color: "#888" },
  vegToggleLabelActive: { color: "#2e7d32" },

  // ── Search ──
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#eee",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#222" },

  // ── Coupon Cards ──
  couponCard: {
    width: 220,
    backgroundColor: "#E3AE01",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#E3AE01",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: "relative",
  },

  couponCardLeft: {
    width: 70,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },

  couponCardValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 28,
  },

  couponCardOff: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 2,
  },

  couponCardDivider: {
    width: 1.5,
    height: "60%",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
  },

  couponCardRight: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  couponCardCode: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
  },

  couponCardMin: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

  couponCardMax: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },

  couponCardBtn: {
    marginTop: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  couponCardBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E3AE01",
  },

  // Decorative notch circles on coupon
  couponCircle: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },

  couponCircleTop: {
    top: -8,
    left: 62,
  },

  couponCircleBottom: {
    bottom: -8,
    left: 62,
  },

  // ── Categories ──
  sectionTitle: {
    fontSize: 18, fontWeight: "700", color: "#222",
    marginHorizontal: 16, marginTop: 20, marginBottom: 4,
  },
  categoryCard: {
    alignItems: "center",
    marginLeft: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#eee",
    minWidth: 72,
  },
  categoryCardActive: { borderColor: "#E3AE01", backgroundColor: "#fff8e1" },
  categoryEmoji: { fontSize: 26 },
  categoryLabel: { fontSize: 11, fontWeight: "600", color: "#555", marginTop: 4 },
  categoryLabelActive: { color: "#E3AE01" },

  // ── Filter Chips ──
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  filterChipActive: { backgroundColor: "#222", borderColor: "#222" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#555" },
  filterChipTextActive: { color: "#fff" },

  // ── Banners ──
  bannerOverlay: {
    position: "absolute", bottom: 10, left: 10,
    backgroundColor: "#000000bb",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  bannerTitle: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bannerSub: { color: "#ddd", fontSize: 11, marginTop: 1 },

  // ── Divider ──
  divider: { height: 8, backgroundColor: "#f0f0f0", marginTop: 20 },

  allRestaurantsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  restaurantCount: { fontSize: 13, color: "#888", marginTop: 20 },

  // ── Restaurant Card ──
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardImageContainer: { position: "relative" },
  cardImage: { width: "100%", height: 180 },
  vegTag: {
    position: "absolute", top: 10, left: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1.5, borderColor: "#2e7d32",
  },
  vegTagText: { fontSize: 10, fontWeight: "700", color: "#2e7d32" },
  offerBadge: {
    position: "absolute", bottom: 10, left: 10,
    backgroundColor: "#1a73e8",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  offerText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  timeBadge: {
    position: "absolute", bottom: 10, right: 10,
    backgroundColor: "#ffffffee",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  timeBadgeText: { fontSize: 11, fontWeight: "700", color: "#222" },
  cardBody: { padding: 12 },
  cardTitleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  cardName: { fontSize: 16, fontWeight: "700", color: "#222", flex: 1, marginRight: 8 },
  ratingBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  ratingText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  newBadge: {
    backgroundColor: "#fff3e0", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: "#E3AE01",
  },
  newBadgeText: { fontSize: 11, color: "#E3AE01", fontWeight: "700" },
  cardCuisine: { fontSize: 13, color: "#888", marginTop: 4, marginBottom: 8 },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#f5f5f5",
  },
  cardFooterLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerInfoText: { fontSize: 12, color: "#666", fontWeight: "600" },
  cardBadges: { flexDirection: "row", gap: 6 },
  topRatedBadge: {
    backgroundColor: "#fff8e1", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: "#E3AE01",
  },
  topRatedText: { fontSize: 10, color: "#E3AE01", fontWeight: "600" },
  freeDeliveryBadge: {
    backgroundColor: "#e8f5e9", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: "#4caf50",
  },
  freeDeliveryText: { fontSize: 10, color: "#2e7d32", fontWeight: "600" },

  // ── Skeleton ──
  skeletonCard: {
    backgroundColor: "#fff", borderRadius: 16, marginBottom: 12, overflow: "hidden",
  },
  skeletonImage: { width: "100%", height: 160, backgroundColor: "#e0e0e0" },
  skeletonLine: {
    height: 14, backgroundColor: "#e0e0e0", borderRadius: 7, width: "80%",
  },
});