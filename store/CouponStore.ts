// store/CouponStore.ts
import { create } from "zustand";

export interface Coupon {
  id: number;
  code: string;
  coupon_type: string;
  discount: number;
  discount_type: "percent" | "amount";
  min_purchase: number;
  max_discount: number;
  expire_date: string;
  restaurant_id?: number;
  data?: string;
}

interface CouponState {
  availableCoupons: Coupon[];
  appliedCoupon: Coupon | null;
  discountAmount: number;
  loading: boolean;
  error: string | null;

  fetchCoupons: (zoneId: string, restaurantId: number, token: string) => Promise<void>;
  applyCoupon: (
    code: string,
    restaurantId: number,
    zoneId: string,
    cartTotal: number,
    token: string
  ) => Promise<void>;
  removeCoupon: () => void;
  recalculateDiscount: (cartTotal: number) => void; // ✅ NEW
}

const BASE_URL = "https://yowww.in/index.php/api/v1";

export const useCouponStore = create<CouponState>((set, get) => ({
  availableCoupons: [],
  appliedCoupon: null,
  discountAmount: 0,
  loading: false,
  error: null,

  // ─── FETCH ALL AVAILABLE COUPONS ───────────────────────────
  fetchCoupons: async (zoneId, restaurantId, token) => {
    set({ loading: true, error: null });
    try {
      const url = `${BASE_URL}/coupon/list`;
      console.log("🎟 Fetching coupons:", url);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          zoneId: `[${zoneId}]`,
          "X-localization": "en",
        },
      });

      const text = await res.text();
      console.log("🎟 Coupon response:", text);

      const data = JSON.parse(text);
      set({ availableCoupons: Array.isArray(data) ? data : [] });
    } catch (e) {
      console.log("🎟 Fetch error:", e);
      set({ error: "Failed to load coupons" });
    } finally {
      set({ loading: false });
    }
  },

  // ─── APPLY A COUPON CODE ───────────────────────────────────
  applyCoupon: async (code, restaurantId, zoneId, cartTotal, token) => {
    set({ loading: true, error: null });
    try {
      const url = `${BASE_URL}/coupon/apply?code=${code}&restaurant_id=${restaurantId}`;
      console.log("🎟 Applying coupon:", url);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          zoneId: `[${zoneId}]`,
          "X-localization": "en",
        },
      });

      const text = await res.text();
      console.log("🎟 Apply response:", text);

      const data = JSON.parse(text);

      // Backend returned an error
      if (data?.errors) {
        const msg = data.errors?.[0]?.message || "Invalid coupon";
        set({ error: msg, loading: false });
        return;
      }

      const coupon: Coupon = data;

      // Check minimum purchase amount
      if (cartTotal < coupon.min_purchase) {
        set({
          error: `Minimum order ₹${coupon.min_purchase} required for this coupon`,
          loading: false,
        });
        return;
      }

      // Calculate discount amount
      let discount = 0;
      if (coupon.discount_type === "percent") {
        discount = (cartTotal * coupon.discount) / 100;
        if (coupon.max_discount > 0) {
          discount = Math.min(discount, coupon.max_discount);
        }
      } else {
        discount = coupon.discount;
      }

      set({ appliedCoupon: coupon, discountAmount: discount, error: null });
    } catch (e) {
      console.log("🎟 Apply error:", e);
      set({ error: "Something went wrong. Try again." });
    } finally {
      set({ loading: false });
    }
  },

  // ─── REMOVE APPLIED COUPON ─────────────────────────────────
  removeCoupon: () =>
    set({ appliedCoupon: null, discountAmount: 0, error: null }),

  // ─── RECALCULATE DISCOUNT WHEN CART CHANGES ────────────────
  recalculateDiscount: (cartTotal) => {
    const { appliedCoupon } = get();
    if (!appliedCoupon) return;

    // Remove coupon if cart drops below minimum order
    if (cartTotal < appliedCoupon.min_purchase) {
      set({
        appliedCoupon: null,
        discountAmount: 0,
        error: `Coupon removed: minimum order ₹${appliedCoupon.min_purchase} not met`,
      });
      return;
    }

    // Recalculate fresh discount based on new cart total
    let discount = 0;
    if (appliedCoupon.discount_type === "percent") {
      discount = (cartTotal * appliedCoupon.discount) / 100;
      if (appliedCoupon.max_discount > 0) {
        discount = Math.min(discount, appliedCoupon.max_discount);
      }
    } else {
      discount = appliedCoupon.discount;
    }

    set({ discountAmount: discount });
  },
}));