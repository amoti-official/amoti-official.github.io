/**
 * AMOTI 端末間同期用 Cloudflare Worker（KV保存）
 *  必要な設定：KV名前空間を作成してこのWorkerに「AMOTI」という名前でバインド
 *  任意：環境変数 ALLOW_ORIGIN（例 https://amoti-official.github.io）。未設定なら *
 *  使い方： GET  https://<worker>/?key=<同期コード>   → { updatedAt, db }
 *          POST https://<worker>/?key=<同期コード>   body=DBのJSON → { ok, updatedAt }
 */
function json(o, status, cors) {
  return new Response(JSON.stringify(o), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}

export default {
  async fetch(req, env) {
    const origin = (env && env.ALLOW_ORIGIN) || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    const key = (url.searchParams.get('key') || '').trim();
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(key)) {
      return json({ error: 'key required: 6-64 chars [A-Za-z0-9_-]' }, 400, cors);
    }
    if (!env || !env.AMOTI) return json({ error: 'KV binding "AMOTI" is missing' }, 500, cors);

    if (req.method === 'GET') {
      const raw = await env.AMOTI.get(key);
      if (!raw) return json({ error: 'not found' }, 404, cors);
      return new Response(raw, { status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, cors) });
    }
    if (req.method === 'POST') {
      const body = await req.text();
      if (!body || body.length < 10) return json({ error: 'empty body' }, 400, cors);
      if (body.length > 5000000) return json({ error: 'too large (max 5MB)' }, 413, cors);
      let db = null;
      try { db = JSON.parse(body); } catch (e) { return json({ error: 'invalid json' }, 400, cors); }
      if (!db || !Array.isArray(db.accounts)) return json({ error: 'db.accounts is required' }, 400, cors);
      const updatedAt = new Date().toISOString();
      await env.AMOTI.put(key, JSON.stringify({ updatedAt: updatedAt, db: db }));
      return json({ ok: true, updatedAt: updatedAt }, 200, cors);
    }
    return json({ error: 'method not allowed' }, 405, cors);
  }
};
