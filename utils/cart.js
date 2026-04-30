import AsyncStorage from "@react-native-async-storage/async-storage";

let cart = [];
let restaurantId = null;
let listeners = [];

function notify() {
  listeners.forEach((fn) => fn([...cart]));
}

async function saveCart() {
  await AsyncStorage.setItem("cart", JSON.stringify({ cart, restaurantId }));
}

export async function loadCart() {
  const data = await AsyncStorage.getItem("cart");

  if (data) {
    const parsed = JSON.parse(data);

    cart = parsed.cart || [];
    restaurantId = parsed.restaurantId || null;

    notify();
  }
}

export function subscribe(fn) {
  listeners.push(fn);

  return () => (listeners = listeners.filter((l) => l !== fn));
}

function getItemPrice(item) {
  if (item.price) return Number(item.price);

  if (item.variations?.length) return Number(item.variations[0].price);

  return 0;
}

export function addToCart(item, restId) {
  if (restaurantId && restaurantId !== restId) {
    cart = [];
  }

  restaurantId = restId;

  const existing = cart.find((i) => i.id == item.id);

  if (existing) existing.qty++;
  else
    cart.push({
      ...item,
      qty: 1,
      price: getItemPrice(item),
    });

  saveCart();
  notify();
}

export function decreaseQty(id) {
  const item = cart.find((i) => i.id == id);

  if (!item) return;

  item.qty--;

  if (item.qty <= 0) cart = cart.filter((i) => i.id != id);

  saveCart();
  notify();
}

export function getCart() {
  return cart;
}

export function getQty(id) {
  const item = cart.find((i) => i.id == id);

  return item ? item.qty : 0;
}

export function getCartCount() {
  return cart.reduce((t, i) => t + i.qty, 0);
}

export function getCartTotal() {
  return cart.reduce((t, i) => t + i.qty * i.price, 0);
}

export function clearCart() {
  cart = [];
  restaurantId = null;

  saveCart();
  notify();
}
