import { sql, send, ensureSeed, q, ctx } from "./_lib.js";
// GET /api/state?t=loja[&since=ISO]
export default async function handler(req, res) {
  try {
    const c = await ctx(req, res, true); if (!c) return; const { t, a } = c;
    await ensureSeed(t);
    const now = (await sql`select now() as n`)[0].n;
    const since = q(req, "since");
    const kvRows = since
      ? await sql`select key,value from kv where tenant=${t} and key not like 'img:%' and updated_at > ${since}`
      : await sql`select key,value from kv where tenant=${t} and key not like 'img:%'`;
    const ord = since
      ? await sql`select num,status,data from orders where tenant=${t} and updated_at > ${since}`
      : await sql`select num,status,data from orders where tenant=${t} and (status not in ('entregue','cancelado') or created_at > now() - interval '35 days') order by created_at`;
    const kv = {};
    kvRows.forEach(r => { kv[r.key] = r.key === "users" && a.role !== "dono" ? r.value.map(({ pin, ...u }) => u) : r.value; });
    send(res, 200, { now, kv, orders: ord.map(r => ({ ...r.data, num: r.num, status: r.status })) });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
