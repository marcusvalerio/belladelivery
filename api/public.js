import { send, ensureSeed, kvMany, storeOpen, ctx } from "./_lib.js";
// GET /api/public?t=loja
export default async function handler(req, res) {
  try {
    const c = await ctx(req, res, false); if (!c) return; const { t } = c;
    await ensureSeed(t);
    const k = await kvMany(t, ["products","cats","zones","hours","holidays","paused","store","loyal"]);
    const products = (k.products || []).filter(p => p.on).map(({ rec, autoOut, ...p }) => p);
    send(res, 200, { products, cats: k.cats || [], zones: (k.zones || []).filter(z => z.on), hours: k.hours, holidays: k.holidays,
      open: storeOpen(k.hours, k.holidays, k.paused), paused: !!k.paused, store: k.store, loyal: k.loyal });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
