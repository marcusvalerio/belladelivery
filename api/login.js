import { send, readBody, sign, auth, ensureSeed, kvGet, q } from "./_lib.js";
// GET  /api/login        -> lista de pessoas (sem PIN) para a tela de entrada
// GET  /api/login?me=1   -> quem é o dono do token
// POST /api/login {id,pin} -> token
export default async function handler(req, res) {
  try {
    await ensureSeed();
    const users = (await kvGet("users")) || [];
    if (req.method === "GET") {
      if (q(req, "me")) { const a = auth(req); const u = a && users.find(x => x.id === a.id); return u ? send(res, 200, { id: u.id, role: u.role }) : send(res, 401, { error: "auth" }); }
      return send(res, 200, users.map(u => ({ id: u.id, name: u.name, role: u.role })));
    }
    if (req.method === "POST") {
      const { id, pin } = await readBody(req);
      const u = users.find(x => x.id === id);
      await new Promise(r => setTimeout(r, 300)); // freia tentativa e erro
      if (!u || String(u.pin) !== String(pin)) return send(res, 401, { error: "PIN incorreto" });
      return send(res, 200, { token: sign({ id: u.id, role: u.role }), user: { id: u.id, name: u.name, role: u.role } });
    }
    send(res, 405, { error: "método" });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
