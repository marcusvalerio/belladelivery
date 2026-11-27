import crypto from "node:crypto";
import { sql, send, readBody, sign, auth, kvSet, kvGet } from "./_lib.js";
import { DEFAULTS } from "./_defaults.js";
// Admin central: cria e gerencia restaurantes.
// POST {action:"login", senha} | GET (lista) | POST {action:"create"|"toggle"|"pin", ...}
const SENHA = process.env.CENTRAL_PASSWORD || "";
function ok(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }
export default async function handler(req, res) {
  try {
    const b = req.method === "POST" ? await readBody(req) : {};
    if (b.action === "login") {
      await new Promise(r => setTimeout(r, 400));
      if (!SENHA || !ok(b.senha || "", SENHA)) return send(res, 401, { error: "Senha incorreta" });
      return send(res, 200, { token: sign({ central: true }) });
    }
    const a = auth(req); if (!a || !a.central) return send(res, 401, { error: "auth" });

    if (req.method === "GET") {
      const rows = await sql`
        select t.slug, t.name, t.active, t.owner, t.phone, t.created_at,
          (select count(*)::int from orders o where o.tenant=t.slug and o.created_at > now() - interval '1 day') as hoje,
          (select count(*)::int from orders o where o.tenant=t.slug and o.created_at > now() - interval '30 days') as mes,
          (select coalesce(sum((data->>'sub')::int - coalesce((data->>'desc')::int,0) + coalesce((data->>'fee')::int,0)),0)::bigint
             from orders o where o.tenant=t.slug and o.status <> 'cancelado' and o.created_at > now() - interval '30 days') as fat_mes,
          (select max(created_at) from orders o where o.tenant=t.slug) as ultimo
        from tenants t order by t.created_at`;
      return send(res, 200, rows);
    }
    if (req.method !== "POST") return send(res, 405, { error: "método" });

    const slug = String(b.slug || "").trim().toLowerCase();
    if (b.action === "create") {
      const name = String(b.name || "").trim().slice(0, 60), owner = String(b.owner || "").trim().slice(0, 40);
      const phone = String(b.phone || "").replace(/[^\d() +-]/g, "").slice(0, 20);
      const pin = String(b.pin || "");
      if (!/^[a-z0-9-]{2,40}$/.test(slug) || ["api","admin","central","img","painel","prototipos"].includes(slug))
        return send(res, 400, { error: "Endereço inválido: use letras minúsculas, números e hífen." });
      if (!name || !owner) return send(res, 400, { error: "Informe o nome do restaurante e do dono." });
      if (!/^\d{4}$/.test(pin)) return send(res, 400, { error: "O PIN precisa ter 4 números." });
      const ex = await sql`select 1 from tenants where slug=${slug}`;
      if (ex[0]) return send(res, 409, { error: "Esse endereço já está em uso." });
      await sql`insert into tenants(slug,name,owner,phone) values(${slug}, ${name}, ${owner}, ${phone})`;
      const seed = { ...DEFAULTS,
        store: { ...DEFAULTS.store, name, addr: "Endereço não configurado: ajuste em Configurações › Loja" },
        users: [{ id: "u1", name: owner, role: "dono", pin }],
        riders: [], coupons: [], caixa: { open: false }, paused: true,
        cats: [], products: [], stock: [], zones: [], holidays: [],
        hours: [0,1,2,3,4,5,6].map(() => ({ on: false, a: "11:00", b: "23:00" })) };
      for (const [k, v] of Object.entries(seed)) await kvSet(slug, k, v);
      return send(res, 200, { ok: true });
    }
    const T = (await sql`select slug from tenants where slug=${slug}`)[0];
    if (!T) return send(res, 404, { error: "Restaurante não encontrado" });
    if (b.action === "delete") {
      if (slug === "bella") return send(res, 400, { error: "A loja principal não pode ser excluída." });
      if (String(b.confirm || "") !== slug) return send(res, 400, { error: "Confirmação não confere." });
      await sql`delete from orders where tenant=${slug}`; await sql`delete from kv where tenant=${slug}`; await sql`delete from tenants where slug=${slug}`;
      return send(res, 200, { ok: true });
    }
    if (b.action === "toggle") { await sql`update tenants set active=${!!b.active} where slug=${slug}`; return send(res, 200, { ok: true }); }
    if (b.action === "pin") {
      if (!/^\d{4}$/.test(String(b.pin || ""))) return send(res, 400, { error: "O PIN precisa ter 4 números." });
      const users = (await kvGet(slug, "users")) || [];
      const u = users.find(x => x.role === "dono");
      if (!u) return send(res, 400, { error: "Loja sem usuário dono" });
      u.pin = String(b.pin); await kvSet(slug, "users", users);
      return send(res, 200, { ok: true });
    }
    send(res, 400, { error: "ação" });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
