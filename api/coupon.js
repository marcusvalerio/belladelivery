import { send, kvGet, applyCoupon, q } from "./_lib.js";
// GET /api/coupon?code=X&sub=centavos&fee=centavos
export default async function handler(req, res) {
  try {
    const r = applyCoupon(await kvGet("coupons"), q(req, "code"), +q(req, "sub") || 0, +q(req, "fee") || 0);
    send(res, 200, { d: r.d, err: r.err || null, code: r.c ? r.c.code : null });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
