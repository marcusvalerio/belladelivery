import { sql, send, auth, ensureSeed, q } from "./_lib.js";
// GET /api/state[?since=ISO] -> configurações e pedidos (tudo, ou só o que mudou desde "since")
export default async function handler(req, res) {
  try {
    const a = auth(req); if (!a) return send(res, 401, { error: "auth" });
    await ensureSeed();
    const now = (await sql`select now() as n`)[0].n;
    const since = q(req, "since");
    const kvRows = since
      ? await sql`select key,value from kv where key not like 'img:%' and updated_at > ${since}`
      : await sql`select key,value from kv where key not like 'img:%'`;
    const ord = since
      ? await sql`select num,status,data from orders where updated_at > ${since}`
      : await sql`select num,status,data from orders where status not in ('entregue','cancelado') or created_at > now() - interval '35 days' order by created_at`;
    const kv = {};
    kvRows.forEach(r => {
      kv[r.key] = r.key === "users" && a.role !== "dono" ? r.value.map(({ pin, ...u }) => u) : r.value;
    });
    send(res, 200, { now, kv, orders: ord.map(r => ({ ...r.data, num: r.num, status: r.status })) });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
