export const API_BASE = "https://yowww.in/index.php/api/v1";

export async function fetchZones() {
  try {
    const res = await fetch(`${API_BASE}/zone/list`);

    const text = await res.text();

    console.log("STATUS:", res.status);
    console.log("RAW RESPONSE:", text.substring(0, 200));

    return JSON.parse(text);
  } catch (e) {
    console.log("API error:", e);
    return null;
  }
}
