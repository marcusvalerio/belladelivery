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
export async function ensureSeed() {
  const r = await sql`select count(*)::int as n from kv where key not like 'img:%'`;
  if (r[0].n) return;
  for (const [k, v] of Object.entries(DEFAULTS))
    await sql`insert into kv(key,value) values(${k}, ${JSON.stringify(v)}::jsonb) on conflict do nothing`;
}
export async function kvGet(k) { const r = await sql`select value from kv where key=${k}`; return r[0]?.value; }
export async function kvMany(keys) {
  const r = await sql`select key,value from kv where key = any(${keys})`;
  const o = {}; r.forEach(x => (o[x.key] = x.value)); return o;
}
export async function kvSet(k, v) {
  await sql`insert into kv(key,value,updated_at) values(${k}, ${JSON.stringify(v)}::jsonb, now())
            on conflict(key) do update set value=excluded.value, updated_at=now()`;
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
