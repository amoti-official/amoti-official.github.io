/**
 * AMOTI 共有モード用 Cloudflare Worker（1ワークスペース＝1データ）
 *  セットアップ：KV名前空間を作成 → このWorkerに「AMOTI」という名前でバインド
 *  任意：環境変数 ALLOW_ORIGIN（例 https://amoti-official.github.io）。未設定なら *
 *  API：
 *    POST /?ws=<ws>&token=<t>   body=DBのJSON  → 初回は作成(200/created)、以後は更新。token不一致は409
 *    GET  /?ws=<ws>&token=<t>                  → { updatedAt, db }（未作成のwsは404、token不一致は401）
 *    OPTIONS                                    → 204（CORS）
 */
function json(o, status, cors) {
  return new Response(JSON.stringify(o), { status: status, headers: Object.assign({ 'Content-Type': 'application/json' }, cors) });
}
export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': (env && env.ALLOW_ORIGIN) || '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    const ws = (url.searchParams.get('ws') || '').trim();
    const token = (url.searchParams.get('token') || '').trim();
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(ws)) return json({ error: 'ws required: 3-64 chars [A-Za-z0-9_-]' }, 400, cors);
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) return json({ error: 'token required (8+ chars)' }, 400, cors);
    if (!env || !env.AMOTI) return json({ error: 'KV binding "AMOTI" is missing' }, 500, cors);
    const authKey = 'auth:' + ws, dataKey = 'data:' + ws;
    const stored = await env.AMOTI.get(authKey);

    if (req.method === 'POST') {
      if (stored && stored !== token) return json({ error: 'workspace exists (token mismatch)' }, 409, cors);
      const body = await req.text();
      if (!body || body.length < 10) return json({ error: 'empty body' }, 400, cors);
      if (body.length > 5000000) return json({ error: 'too large (max 5MB)' }, 413, cors);
      let db = null;
      try { db = JSON.parse(body); } catch (e) { return json({ error: 'invalid json' }, 400, cors); }
      if (!db || !Array.isArray(db.accounts)) return json({ error: 'db.accounts is required' }, 400, cors);
      const createdAt = !stored;
      if (createdAt) await env.AMOTI.put(authKey, token);
      const updatedAt = new Date().toISOString();
      await env.AMOTI.put(dataKey, JSON.stringify({ updatedAt: updatedAt, db: db }));
      return json({ ok: true, created: createdAt, updatedAt: updatedAt }, 200, cors);
    }
    if (req.method === 'GET') {
      if (!stored) return json({ error: 'workspace not found' }, 404, cors);
      if (stored !== token) return json({ error: 'unauthorized' }, 401, cors);
      const raw = await env.AMOTI.get(dataKey);
      if (!raw) return json({ updatedAt: null, db: null }, 200, cors);
      return new Response(raw, { status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, cors) });
    }
    return json({ error: 'method not allowed' }, 405, cors);
  }
};
