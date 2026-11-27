import crypto from "node:crypto";
import { sql, send, readBody, kvSet, q, ctx } from "./_lib.js";
// POST /api/img {data:"data:image/jpeg;base64,..."} -> {url}   |   GET /api/img?id=...
export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const v = (await sql`select value from kv where key=${"img:" + q(req, "id")} limit 1`)[0]?.value;
      if (!v) return send(res, 404, { error: "imagem não encontrada" });
      const [, mime, b64] = /^data:([^;]+);base64,(.*)$/.exec(v.d) || [];
      res.statusCode = 200; res.setHeader("content-type", mime || "image/jpeg");
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
      return res.end(Buffer.from(b64 || "", "base64"));
    }
    const c = await ctx(req, res, true); if (!c) return;
    const { data } = await readBody(req);
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(data || "") || data.length > 1_500_000) return send(res, 400, { error: "Imagem inválida ou grande demais" });
    const id = crypto.randomBytes(8).toString("hex");
    await kvSet(c.t, "img:" + id, { d: data });
    send(res, 200, { url: "/api/img?id=" + id });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}
