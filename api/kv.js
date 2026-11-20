import { send, auth, readBody, kvSet, kvGet } from "./_lib.js";
const ALLOWED = ["zones","hours","holidays","wa","coupons","loyal","cats","products","stock","autoOut","riders","users","paused","caixa","store"];
const DONO_ONLY = ["users","zones","store","hours","holidays","wa","cats","products"];
// PUT /api/kv {chave: valor, ...}
export default async function handler(req, res) {
  try {
    const a = auth(req); if (!a) return send(res, 401, { error: "auth" });
    if (req.method !== "PUT") return send(res, 405, { error: "método" });
    const body = await readBody(req);
    for (const [k, v] of Object.entries(body)) {
      if (!ALLOWED.includes(k)) continue;
      // produtos: atendente/cozinha podem marcar esgotado; o resto só o dono
      if (DONO_ONLY.includes(k) && a.role !== "dono" && k !== "products") continue;
      if (k === "users") { // não deixa apagar PIN por engano
        const old = (await kvGet("users")) || [];
        v.forEach(u => { if (!/^\d{4}$/.test(String(u.pin || ""))) u.pin = (old.find(o => o.id === u.id) || {}).pin || "0000"; });
      }
      await kvSet(k, v);
    }
    send(res, 200, { ok: true });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
