import crypto from "node:crypto";
import { sql, send, readBody, kvMany, kvSet, proj, zoneFor, storeOpen, applyCoupon, q } from "./_lib.js";
// POST /api/order  -> cliente faz o pedido pelo site (preços e taxa recalculados aqui, não confiamos no navegador)
// GET  /api/order?id=...  -> acompanhamento do pedido
export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const r = await sql`select num,status,data from orders where id=${q(req, "id") || ""}`;
      if (!r[0]) return send(res, 404, { error: "Pedido não encontrado" });
      const o = r[0].data, k = await kvMany(["riders"]);
      const rider = (k.riders || []).find(x => x.id === o.rider);
      return send(res, 200, { num: r[0].num, status: r[0].status, rider: rider ? rider.name : null, code: o.code, problem: o.problem || null,
        items: o.items, total: o.sub - o.desc + o.fee, fee: o.fee, type: o.type });
    }
    if (req.method !== "POST") return send(res, 405, { error: "método" });
    const b = await readBody(req);
    const k = await kvMany(["products","zones","store","hours","holidays","paused","coupons"]);
    if (!storeOpen(k.hours, k.holidays, k.paused)) return send(res, 409, { error: "A loja está fechada agora." });
    const nome = String(b.cliente || "").trim().slice(0, 60), fone = String(b.fone || "").replace(/[^\d() +-]/g, "").slice(0, 20);
    if (!nome || fone.replace(/\D/g, "").length < 10) return send(res, 400, { error: "Informe nome e telefone com DDD." });
    const items = [];
    for (const it of (b.items || []).slice(0, 40)) {
      const p = (k.products || []).find(x => x.id === it.pid && x.on && !x.out);
      if (!p) return send(res, 400, { error: "Um dos pratos acabou de esgotar. Atualize a página." });
      let price = p.price; const lines = [];
      for (const [i, st] of (p.steps || []).entries()) {
        const ch = [...new Set(((it.sel || {})[i] || []).filter(n => st.opts.some(o => o[0] === n)))];
        if (ch.length < st.min || ch.length > st.max) return send(res, 400, { error: `Monte o prato: “${st.name}”.` });
        ch.forEach(n => (price += st.opts.find(o => o[0] === n)[1]));
        if (ch.length) lines.push(`${st.name}: ${ch.join(", ")}`);
      }
      const extra = (it.adds || []).filter(n => p.addons.some(a => a[0] === n));
      extra.forEach(n => (price += p.addons.find(a => a[0] === n)[1]));
      const adds = [...lines, ...extra];
      items.push({ pid: p.id, name: p.name, qty: Math.max(1, Math.min(20, it.qty | 0)), adds, price, note: String(it.note || "").slice(0, 120) });
    }
    if (!items.length) return send(res, 400, { error: "Sacola vazia." });
    const type = b.type === "retirada" ? "retirada" : "delivery";
    let pt = null, z = null;
    if (type === "delivery") {
      if (!isFinite(b.lat) || !isFinite(b.lng)) return send(res, 400, { error: "Confirme o endereço no mapa." });
      pt = proj(+b.lat, +b.lng, k.store); z = zoneFor(pt, k.zones || []);
      if (!z) return send(res, 400, { error: "Ainda não entregamos nesse endereço." });
    }
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0), fee = z ? z.fee : 0;
    const cp = applyCoupon(k.coupons, b.cupom, sub, fee);
    if (cp.c) { cp.c.uses++; await kvSet("coupons", k.coupons); }
    const id = crypto.randomBytes(6).toString("hex");
    const pay = ["pix", "cartao", "dinheiro"].includes(b.pay) ? b.pay : "pix";
    const obs = [String(b.obs || "").slice(0, 200), ...items.filter(i => i.note).map(i => `${i.name}: ${i.note}`)].filter(Boolean).join(" · ");
    const data = { id, src: "Site", type, cliente: nome, fone, bairro: String(b.bairro || "").slice(0, 60), addr: String(b.addr || "").slice(0, 160),
      lat: +b.lat || null, lng: +b.lng || null, pt, items, sub, desc: cp.d, fee, zone: z ? z.name : null, pay,
      troco: pay === "dinheiro" ? Math.max(0, +b.troco | 0) : 0, status: "novo", t: Date.now(), rider: null, seq: 0,
      code: String(crypto.randomInt(1000, 10000)), mesa: null, obs, problem: null, dAt: null, km: 0, settled: false, arrived: false, msgs: [], cupom: cp.c ? cp.c.code : null };
    const r = await sql`insert into orders(id,status,data) values(${id}, 'novo', ${JSON.stringify(data)}::jsonb) returning num`;
    send(res, 200, { id, num: r[0].num, code: data.code, total: sub - cp.d + fee, eta: z ? z.eta : "20–30" });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
