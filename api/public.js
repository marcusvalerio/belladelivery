import { send, ensureSeed, kvMany, storeOpen } from "./_lib.js";
// GET /api/public -> o que o site do cliente precisa (sem dados internos)
export default async function handler(req, res) {
  try {
    await ensureSeed();
    const k = await kvMany(["products","cats","zones","hours","holidays","paused","store","loyal"]);
    const products = (k.products || []).filter(p => p.on).map(({ rec, autoOut, ...p }) => p);
    res.setHeader("cache-control", "no-store");
    send(res, 200, { products, cats: k.cats || [], zones: (k.zones || []).filter(z => z.on), hours: k.hours, holidays: k.holidays,
      open: storeOpen(k.hours, k.holidays, k.paused), paused: !!k.paused, store: k.store, loyal: k.loyal });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
