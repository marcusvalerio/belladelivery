import { send, kvGet, applyCoupon, q, ctx } from "./_lib.js";
export default async function handler(req, res) {
  try {
    const c = await ctx(req, res, false); if (!c) return;
    const r = applyCoupon(await kvGet(c.t, "coupons"), q(req, "code"), +q(req, "sub") || 0, +q(req, "fee") || 0);
    send(res, 200, { d: r.d, err: r.err || null, code: r.c ? r.c.code : null });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
