import { sql, send, readBody, ctx, nextNum } from "./_lib.js";
// PUT /api/orders?t=loja {orders:[...]}
export default async function handler(req, res) {
  try {
    const c = await ctx(req, res, true); if (!c) return; const { t } = c;
    if (req.method !== "PUT") return send(res, 405, { error: "método" });
    const { orders = [] } = await readBody(req);
    const out = [];
    for (const o of orders.slice(0, 200)) {
      if (!o || !o.id || !o.status) continue;
      const { num, ...data } = o;
      const ex = await sql`select tenant,num from orders where id=${o.id}`;
      if (ex[0] && ex[0].tenant !== t) continue; // pedido de outra loja: ignora
      if (ex[0]) {
        await sql`update orders set status=${o.status}, data=${JSON.stringify(data)}::jsonb, updated_at=now() where id=${o.id}`;
        out.push({ id: o.id, num: ex[0].num });
      } else {
        const n = await nextNum(t);
        await sql`insert into orders(id,tenant,num,status,data) values(${o.id}, ${t}, ${n}, ${o.status}, ${JSON.stringify(data)}::jsonb)`;
        out.push({ id: o.id, num: n });
      }
    }
    send(res, 200, out);
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
