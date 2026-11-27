import { kvSet, send, readBody, sign, auth, ensureSeed, kvGet, q, ctx } from "./_lib.js";
// GET /api/login?t=loja | ?me=1 | POST {id,pin}
export default async function handler(req, res) {
  try {
    const c = await ctx(req, res, false); if (!c) return; const { t, T } = c;
    await ensureSeed(t);
    const users = (await kvGet(t, "users")) || [];
    if (req.method === "GET") {
      if (q(req, "me")) { const a = auth(req); const u = a && (a.t || "bella") === t && users.find(x => x.id === a.id); return u ? send(res, 200, { id: u.id, role: u.role }) : send(res, 401, { error: "auth" }); }
      return send(res, 200, users.map(u => ({ id: u.id, name: u.name, role: u.role })));
    }
    if (req.method === "POST") {
      const { id, pin, newPin } = await readBody(req);
      const u = users.find(x => x.id === id);
      await new Promise(r => setTimeout(r, 300));
      if (!u || String(u.pin) !== String(pin)) return send(res, 401, { error: "PIN incorreto" });
      if (u.mustChange) {
        if (!newPin) return send(res, 200, { mustChange: true });
        if (!/^\d{4}$/.test(String(newPin)) || String(newPin) === String(u.pin)) return send(res, 400, { error: "PIN novo inválido: 4 números, diferente do provisório." });
        u.pin = String(newPin); delete u.mustChange; await kvSet(t, "users", users);
      }
      return send(res, 200, { token: sign({ t, id: u.id, role: u.role }), user: { id: u.id, name: u.name, role: u.role }, loja: T.name });
    }
    send(res, 405, { error: "método" });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
