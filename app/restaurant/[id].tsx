import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { useCartStore } from "../../store/CartStore";
import CustomiseModal from "../../components/CustomiseModal";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function RestaurantMenu() {

  const params = useLocalSearchParams();

  const restaurantId = params?.id;
  const zoneId = params?.zoneId;
  const lat = params?.lat;
  const lng = params?.lng;

  
  const [menu, setMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const { items, addItem, removeItem } = useCartStore();
  const [customiseItem, setCustomiseItem] = useState<any>(null);
  

  const listRef = useRef<any>(null);
  const categoryRef = useRef<any>(null);
  const router = useRouter();

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);

const totalPrice = items.reduce(
  (sum, i) => sum + i.qty * i.price,
  0
);

  useEffect(() => {
    if (restaurantId) {
      loadMenu();
    }
  }, [restaurantId]);

  async function loadMenu() {
    try {
      // ── Fetch menu items ──
      const res = await fetch(
        `https://yowww.in/index.php/api/v1/products/latest?restaurant_id=${restaurantId}&category_id=all&limit=100&offset=1&zone_id=${zoneId}`,
        {
          headers: {
            zoneId: `[${zoneId}]`,
            latitude: lat,
            longitude: lng,
            "X-localization": "en",
          },
        }
      );

      const json = await res.json();
      const list = json?.products || json?.products?.data || json?.data || [];
      setMenu(list);

      // ── Fetch restaurant details for delivery fee ──
      const detailRes = await fetch(
        `https://yowww.in/index.php/api/v1/restaurants/details/${restaurantId}`,
        {
          headers: {
            zoneId: `[${zoneId}]`,
            latitude: lat,
            longitude: lng,
            "X-localization": "en",
          },
        }
      );

      const detailJson = await detailRes.json();
      console.log("🚚 RESTAURANT DETAILS:", JSON.stringify(detailJson, null, 2));

    } catch (error) {
      console.log("MENU ERROR:", error);
    } finally {
      setLoading(false);
    }
  }
  function getProductImage(item: any) {

    if (item?.image_full_url?.image)
      return item.image_full_url.image;

    if (item?.image && item.image !== "def.png") {
      return `https://yowww.in/storage/app/public/product/${item.image}`;
    }

    return "https://via.placeholder.com/300";
  }

const onViewableItemsChanged = useRef(({ viewableItems }: any) => {

  if (viewableItems.length > 0) {

    const category = viewableItems[0].item?.title;

    if (category) {

      setActiveCategory(category);

         const index = (groupedMenu || []).findIndex(
         (c: any) => c.title === category
        );

      if (index !== -1) {
        categoryRef.current?.scrollToIndex({
          index,
          animated: true,
        });
      }

    }

  }

}).current;

const viewConfigRef = useRef({
  viewAreaCoveragePercentThreshold: 50,
});

 function addToCart(item: any, selectedAddOns: any[] = []) {
  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  console.log("Adding to cart:", JSON.stringify(item, null, 2)); // 👈 add here
  console.log("Item ID:", item.id);  // 👈 what is this?
  console.log("Item name:", item.name);
  console.log("Item price:", item.price);
  addItem({
    id: item.id,
    name: item.name,
    price: item.price + addOnTotal,
    image: item.image,
    restaurant_id: item.restaurant_id,
    addOns: selectedAddOns,
  });
}

function removeFromCart(item: any) {
  removeItem(item.id);
}
    const MenuItem = React.memo(({ item }: any) => {

    const image = getProductImage(item);
    const qty = items.find((i) => i.id === item.id)?.qty || 0;

    return (

      <TouchableOpacity
  style={styles.gridCard}
  onPress={() => setSelectedFood(item)}
>

        <Image source={{ uri: image }} style={styles.gridImage} />

        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={styles.gridPrice}>
          ₹ {item.price}
        </Text>

        {qty === 0 ? (

          <TouchableOpacity
            style={styles.gridAddBtn}
            onPress={() => setCustomiseItem(item)}
          >
            <Text style={{ color:"#E3AE01", fontWeight:"700" }}>
              ADD
            </Text>
          </TouchableOpacity>

        ) : (

          <TouchableOpacity style={styles.stepper}>

            <TouchableOpacity onPress={() => removeFromCart(item)}>
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>

            <Text style={styles.qty}>
              {qty}
            </Text>

            <TouchableOpacity onPress={() => {
  const hasAddOns = item.add_ons && item.add_ons.length > 0;
  if (hasAddOns) {
    // Ask repeat or customise
    Alert.alert(
      "Add another?",
      "How would you like to add this item?",
      [
        {
          text: "Repeat last",
          onPress: () => {
            // Find existing item's add-ons from cart
            const existing = items.find((i) => i.id === item.id);
            addToCart(item, existing?.addOns || []);
          },
        },
        {
          text: "Customise",
          onPress: () => setCustomiseItem(item),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  } else {
    addToCart(item);
  }
}}>
  <Text style={styles.stepText}>+</Text>
</TouchableOpacity>
        
          </TouchableOpacity>

        )}

      </TouchableOpacity>

    );
  });
  
  if (loading) {

    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

const groupedMenu = Object.values(
  (menu || []).reduce((acc: any, item: any) => {

    const category =
      item?.category_name ||
      item?.category?.name ||
      "Menu";

    if (!acc[category]) {
      acc[category] = {
        title: category,
        items: [],
      };
    }

    acc[category].items.push(item);

    return acc;

  }, {})
);



  return (

    

    <SafeAreaView style={{ flex:1 }}>
      
  <FlatList
  ref={categoryRef}
  horizontal
  showsHorizontalScrollIndicator={false}
  data={groupedMenu}
  keyExtractor={(item: any) => item.title}

  getItemLayout={(data, index) => ({
    length: 110,
    offset: 110 * index,
    index,
  })}

  renderItem={({ item, index }) => (
    <TouchableOpacity
      style={styles.categoryTab}
      onPress={() => {
        listRef.current?.scrollToIndex({
          index: index,
          animated: true,
        });
      }}
    >
      <Text
        style={[
          styles.categoryText,
          activeCategory === item.title && styles.activeCategoryText
        ]}
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  )}
/>

 <FlatList
  ref={listRef}
  data={groupedMenu}
  keyExtractor={(item: any) => item.title}
  onViewableItemsChanged={onViewableItemsChanged}
  viewabilityConfig={viewConfigRef.current}
  renderItem={({ item }) => (
    <View>
      <Text style={styles.sectionHeader}>{item.title}</Text>

      <FlatList
        data={item.items}
        keyExtractor={(i, index) => String(i?.id ?? index)}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
        renderItem={({ item }) => <MenuItem item={item} />}
        scrollEnabled={false}
      />
    </View>
  )}
  contentContainerStyle={{ paddingBottom:120 }}
/>
<TouchableOpacity
  style={styles.menuFab}
  onPress={() => setMenuOpen(true)}
>
  <Text style={styles.menuFabText}>MENU</Text>
</TouchableOpacity>

{menuOpen && (
  <TouchableOpacity
    style={styles.menuOverlay}
    activeOpacity={1}
    onPress={() => setMenuOpen(false)}
  >
    <TouchableOpacity
      activeOpacity={1}
      style={styles.menuBottomSheet}
      onPress={(e) => e.stopPropagation()}
    >
      {/* Handle bar */}
      <View style={styles.handleBar} />

      {/* Category List */}
      <FlatList
        data={groupedMenu}
        keyExtractor={(item: any) => item.title}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.bottomSheetItem}
            onPress={() => {
              setMenuOpen(false);
              setTimeout(() => {
                listRef.current?.scrollToIndex({
                  index,
                  animated: true,
                });
              }, 200);
            }}
          >
            <Text
              style={[
                styles.bottomSheetItemText,
                activeCategory === item.title && styles.bottomSheetItemActive,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={styles.bottomSheetItemCount}>
              {item.items.length}
            </Text>
          </TouchableOpacity>
        )}
      />
    </TouchableOpacity>
  </TouchableOpacity>
)}

{selectedFood && (
  <View style={styles.foodOverlay}>
    <View style={styles.foodModal}>

      <Image
        source={{ uri: getProductImage(selectedFood) }}
        style={styles.foodImageLarge}
      />

      <Text style={styles.foodTitle}>
        {selectedFood.name}
      </Text>

      <Text style={styles.foodPrice}>
        ₹ {selectedFood.price}
      </Text>

      <Text style={styles.foodDesc}>
        {selectedFood.description || "Delicious item from this restaurant"}
      </Text>

      <TouchableOpacity
        style={styles.foodAddButton}
        onPress={() => {
          addToCart(selectedFood);
          setSelectedFood(null);
        }}
      >
        <Text style={{ color:"#fff", fontWeight:"700" }}>
          ADD TO CART
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.foodClose}
        onPress={() => setSelectedFood(null)}
      >
        <Text style={{ fontWeight:"600" }}>
          CLOSE
        </Text>
      </TouchableOpacity>

    </View>
  </View>
)}

      {totalItems > 0 && (

        <TouchableOpacity
  style={styles.cartBar}
  onPress={() => router.push("/cart")}
>

          <Text style={styles.cartText}>
            {totalItems} items | ₹ {totalPrice}
          </Text>

          <Text style={styles.cartBtn}>
            VIEW CART >
          </Text>

        </TouchableOpacity>

      )}

        <CustomiseModal
        visible={!!customiseItem}
        item={customiseItem}
        onClose={() => setCustomiseItem(null)}
        onAddToCart={addToCart}
        getProductImage={getProductImage}
      />


    </SafeAreaView>

  );
}

const styles = StyleSheet.create({

  center:{
    flex:1,
    justifyContent:"center",
    alignItems:"center"
  },

  gridCard:{
    width:"48%",
    backgroundColor:"#fff",
    borderRadius:12,
    marginBottom:18,
    padding:10,
    elevation:2
  },

  gridImage:{
    width:"100%",
    height:120,
    borderRadius:10
  },

  gridTitle:{
    fontSize:14,
    fontWeight:"600",
    marginTop:8
  },

  gridPrice:{
    fontSize:13,
    marginTop:4,
    marginBottom:8
  },

  gridAddBtn:{
    borderWidth:1,
    borderColor:"#E3AE01",
    borderRadius:8,
    paddingVertical:6,
    alignItems:"center"
  },

  stepper:{
    flexDirection:"row",
    backgroundColor:"#E3AE01",
    borderRadius:8,
    alignItems:"center",
    justifyContent:"space-between",
    paddingHorizontal:20,
    paddingVertical:6
  },

  stepText:{
    color:"#fff",
    fontSize:18
  },

  qty:{
    color:"#fff",
    fontWeight:"600"
  },

  cartBar:{
    position:"absolute",
    bottom:50,
    left:15,
    right:15,
    backgroundColor:"#E3AE01",
    paddingVertical:14,
    paddingHorizontal:16,
    borderRadius:10,
    flexDirection:"row",
    justifyContent:"space-between"
  },

  cartText:{
    color:"#fff",
    fontWeight:"700"
  },

  cartBtn:{
    color:"#fff",
    fontWeight:"700"
  },

  sectionHeader: {
  fontSize: 18,
  fontWeight: "700",
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: "#fff",
},

categoryTab: {
  backgroundColor: "#f3f3f3",
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 20,
  marginRight: 10,
},

categoryText: {
  fontWeight: "600",
},

menuFab:{
  position:"absolute",
  right:20,
  bottom:120,
  backgroundColor:"#000",
  width:70,
  height:70,
  borderRadius:35,
  justifyContent:"center",
  alignItems:"center",
  elevation:6
},

menuFabText:{
  color:"#fff",
  fontWeight:"700"
},

// ── Bottom Sheet Menu ──
menuOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 80,
  backgroundColor: "rgb(0, 0, 0, 0.5)",
  justifyContent: "flex-end",    // ✅ bottom
  alignItems: "flex-end",        // ✅ right side
},

menuBottomSheet: {
  backgroundColor: "#000",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingHorizontal: 20,
  paddingBottom: 60,
  maxHeight: "70%",
  width: "65%",                  // ✅ only right 65% of screen
},

handleBar: {
  width: 40,
  height: 4,
  backgroundColor: "#444",
  borderRadius: 2,
  alignSelf: "center",
  marginVertical: 12,
},

bottomSheetItem: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 14,           // ✅ no border line
},

bottomSheetItemText: {
  fontSize: 15,
  color: "#fff",
  fontWeight: "500",
  flex: 1,
  marginRight: 12,
},

bottomSheetItemActive: {
  color: "#fff",
  fontWeight: "700",
},

bottomSheetItemCount: {
  fontSize: 13,
  color: "#fff",
  fontWeight: "700",
},

activeCategoryText:{
  color:"#E3AE01",
  fontWeight:"700"
},

foodOverlay:{
  position:"absolute",
  top:0,
  left:0,
  right:0,
  bottom:0,
  backgroundColor:"rgba(0,0,0,0.5)",
  justifyContent:"center",
  alignItems:"center"
},

foodModal:{
  width:"90%",
  backgroundColor:"#fff",
  borderRadius:12,
  padding:20
},

foodImageLarge:{
  width:"100%",
  height:200,
  borderRadius:10
},

foodTitle:{
  fontSize:18,
  fontWeight:"700",
  marginTop:10
},

foodPrice:{
  fontSize:16,
  marginTop:6
},

foodDesc:{
  marginTop:8,
  color:"#666"
},

foodAddButton:{
  marginTop:16,
  backgroundColor:"#E3AE01",
  padding:14,
  borderRadius:10,
  alignItems:"center"
},

foodClose:{
  marginTop:10,
  alignItems:"center"
}

});