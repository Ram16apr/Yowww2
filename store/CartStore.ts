// store/CartStore.ts
import { create } from "zustand";
import { Alert } from "react-native";

export interface AddOn {
  id: number;
  name: string;
  price: number;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  image?: string;
  qty: number;
  restaurant_id: number | string;
  addOns?: AddOn[];  // ✅ selected add-ons per item
}

interface CartState {
  items: CartItem[];
  restaurantId: number | string | null;
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  restaurantId: null,

  addItem: (item) => {
    const { items, restaurantId } = get();

    // Item already in cart — just increment qty
    const existing = items.find((i) => i.id === item.id);
    if (existing) {
      set({
        items: items.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        ),
      });
      return;
    }

    // Cart has items from a DIFFERENT restaurant
    if (items.length > 0 && restaurantId !== item.restaurant_id) {
      Alert.alert(
        "Start new cart?",
        "Your cart has items from another restaurant. Do you want to clear it and add this item?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, start fresh",
            style: "destructive",
            onPress: () =>
              set({
                items: [{ ...item, qty: 1 }],
                restaurantId: item.restaurant_id,
              }),
          },
        ]
      );
      return;
    }

    // Same restaurant or empty cart — just add
    set({
      items: [...items, { ...item, qty: 1 }],
      restaurantId: item.restaurant_id,
    });
  },

  removeItem: (id) =>
    set((state) => {
      const updated = state.items
        .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0);
      return {
        items: updated,
        restaurantId: updated.length === 0 ? null : state.restaurantId,
      };
    }),

  clearCart: () => set({ items: [], restaurantId: null }),
}));