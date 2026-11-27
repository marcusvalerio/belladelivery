import { send, readBody, kvSet, kvGet, ctx } from "./_lib.js";
const ALLOWED = ["zones","hours","holidays","wa","coupons","loyal","cats","products","stock","autoOut","riders","users","paused","caixa","store"];
const DONO_ONLY = ["users","zones","store","hours","holidays","wa","cats","products"];
// PUT /api/kv?t=loja {chave: valor, ...}
export default async function handler(req, res) {
  try {
    const c = await ctx(req, res, true); if (!c) return; const { t, a } = c;
    if (req.method !== "PUT") return send(res, 405, { error: "método" });
    const body = await readBody(req);
    for (const [k, v] of Object.entries(body)) {
      if (!ALLOWED.includes(k)) continue;
      if (DONO_ONLY.includes(k) && a.role !== "dono" && k !== "products") continue;
      if (k === "users") {
        const old = (await kvGet(t, "users")) || [];
        for (const u of v) if (!/^\d{4}$/.test(String(u.pin || ""))) {
          const prev = (old.find(o => o.id === u.id) || {}).pin;
          if (!prev) return send(res, 400, { error: `PIN inválido para ${u.name || "funcionário"}: use 4 números.` });
          u.pin = prev;
        }
      }
      await kvSet(t, k, v);
    }
    send(res, 200, { ok: true });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
