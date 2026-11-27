import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";
import { DEFAULTS } from "./_defaults.js";

export const sql = neon(process.env.DATABASE_URL);
const SECRET = process.env.APP_SECRET || "dev-secret-troque";

/* ---------- respostas ---------- */
export function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}
export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch { return {}; }
}
export const q = (req, k) => new URL(req.url, "http://x").searchParams.get(k);

/* ---------- restaurantes (multi-loja) ---------- */
// Cada chamada traz ?t=slug. Sem t = "bella" (loja original).
export async function tenant(req) {
  const t = String(q(req, "t") || "bella").toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(t)) return null;
  const r = await sql`select slug,name,active from tenants where slug=${t}`;
  return r[0] || null;
}
// resolve a loja e confere se o token (quando houver) é dessa loja
export async function ctx(req, res, needAuth) {
  const T = await tenant(req);
  if (!T) { send(res, 404, { error: "Restaurante não encontrado" }); return null; }
  if (!T.active && needAuth !== "public-ok") { send(res, 403, { error: "Restaurante desativado. Fale com o suporte." }); return null; }
  let a = null;
  if (needAuth === true) {
    a = auth(req);
    if (!a || (a.t || "bella") !== T.slug) { send(res, 401, { error: "auth" }); return null; }
  }
  return { t: T.slug, T, a };
}

/* ---------- token assinado (sem dependências) ---------- */
export function sign(p) {
  const b = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + 14 * 864e5 })).toString("base64url");
  return b + "." + crypto.createHmac("sha256", SECRET).update(b).digest("base64url");
}
export function auth(req) {
  const t = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [b, s] = t.split(".");
  if (!b || !s) return null;
  const e = crypto.createHmac("sha256", SECRET).update(b).digest("base64url");
  if (e.length !== s.length || !crypto.timingSafeEqual(Buffer.from(e), Buffer.from(s))) return null;
  try { const p = JSON.parse(Buffer.from(b, "base64url").toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
}

/* ---------- chave/valor ---------- */
export async function ensureSeed(t) {
  const r = await sql`select count(*)::int as n from kv where tenant=${t} and key not like 'img:%'`;
  if (r[0].n) return;
  for (const [k, v] of Object.entries(DEFAULTS))
    await sql`insert into kv(tenant,key,value) values(${t}, ${k}, ${JSON.stringify(v)}::jsonb) on conflict do nothing`;
}
export async function kvGet(t, k) { const r = await sql`select value from kv where tenant=${t} and key=${k}`; return r[0]?.value; }
export async function kvMany(t, keys) {
  const r = await sql`select key,value from kv where tenant=${t} and key = any(${keys})`;
  const o = {}; r.forEach(x => (o[x.key] = x.value)); return o;
}
export async function kvSet(t, k, v) {
  await sql`insert into kv(tenant,key,value,updated_at) values(${t}, ${k}, ${JSON.stringify(v)}::jsonb, now())
            on conflict(tenant,key) do update set value=excluded.value, updated_at=now()`;
}
export async function nextNum(t) {
  const r = await sql`select coalesce(max(num),0)+1 as n from orders where tenant=${t}`; return r[0].n;
}

/* ---------- geografia (mesma conta do painel) ---------- */
const U = 10; // metros por unidade do mapa
export function proj(lat, lng, st) {
  const k = 111320 * Math.cos((st.lat * Math.PI) / 180);
  return { x: 600 + ((lng - st.lng) * k) / U, y: 410 - ((lat - st.lat) * 110540) / U };
}
function inPoly(p, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) c = !c; } return c; }
export function zoneFor(p, zones) {
  return zones.filter(z => z.on && (z.type === "circle" ? Math.hypot(p.x - z.cx, p.y - z.cy) <= z.r : inPoly(p, z.pts)))
    .sort((a, b) => a.fee - b.fee)[0] || null;
}

/* ---------- horário de São Paulo ---------- */
export function storeOpen(hours, holidays, paused) {
  if (paused) return false;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
    .formatToParts(new Date()).map(p => [p.type, p.value]));
  const iso = `${parts.year}-${parts.month}-${parts.day}`;
  if ((holidays || []).some(h => h.d === iso)) return false;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const d = (hours || [])[dow]; if (!d || !d.on) return false;
  const m = +parts.hour * 60 + +parts.minute, t = s => +s.slice(0, 2) * 60 + +s.slice(3, 5);
  return m >= t(d.a) && m < t(d.b);
}

export function applyCoupon(coupons, code, sub, fee) {
  code = String(code || "").trim().toUpperCase(); if (!code) return { d: 0 };
  const c = (coupons || []).find(x => x.code === code);
  if (!c || !c.on) return { d: 0, err: "Cupom inválido" };
  if (sub < c.min) return { d: 0, err: `Esse cupom vale a partir de R$ ${(c.min / 100).toFixed(2).replace(".", ",")}` };
  return { c, d: c.type === "pct" ? Math.round((sub * c.v) / 100) : c.type === "brl" ? Math.min(c.v, sub) : fee };
}
