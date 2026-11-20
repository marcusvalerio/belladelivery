import { sql, send, auth, readBody } from "./_lib.js";
// PUT /api/orders {orders:[...]} -> grava/atualiza; devolve o número de cada pedido
export default async function handler(req, res) {
  try {
    const a = auth(req); if (!a) return send(res, 401, { error: "auth" });
    if (req.method !== "PUT") return send(res, 405, { error: "método" });
    const { orders = [] } = await readBody(req);
    const out = [];
    for (const o of orders.slice(0, 200)) {
      if (!o || !o.id || !o.status) continue;
      const { num, ...data } = o;
      const r = await sql`insert into orders(id,status,data) values(${o.id}, ${o.status}, ${JSON.stringify(data)}::jsonb)
        on conflict(id) do update set status=excluded.status, data=excluded.data, updated_at=now() returning num`;
      out.push({ id: o.id, num: r[0].num });
    }
    send(res, 200, out);
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
