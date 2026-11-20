import { send, kvGet, q } from "./_lib.js";
// GET /api/geocode?q=endereço -> [{label,lat,lng}]  (OpenStreetMap / Nominatim, perto da loja)
export default async function handler(req, res) {
  try {
    const text = String(q(req, "q") || "").trim().slice(0, 200);
    if (text.length < 4) return send(res, 200, []);
    const st = (await kvGet("store")) || { lat: -23.55, lng: -46.63 };
    const d = 0.35, vb = [st.lng - d, st.lat + d, st.lng + d, st.lat - d].join(",");
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=br&viewbox=${vb}&q=${encodeURIComponent(text)}`;
    const r = await fetch(url, { headers: { "user-agent": "BellaDelivery/1.0", "accept-language": "pt-BR" } });
    if (!r.ok) return send(res, 502, { error: "Busca de endereço indisponível" });
    const j = await r.json();
    send(res, 200, j.map(x => {
      const a = x.address || {};
      const rua = [a.road, a.house_number].filter(Boolean).join(", ");
      const bairro = a.suburb || a.neighbourhood || a.quarter || a.city_district || "";
      return { label: x.display_name, rua: rua || x.name || "", bairro, cidade: a.city || a.town || a.village || "", lat: +x.lat, lng: +x.lon };
    }));
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
