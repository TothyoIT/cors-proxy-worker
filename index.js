addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname; // যেমন: "/proxy/https%3A%2F%2F…"

  // ১) Preflight (OPTIONS) চেক
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  // ২) Path থেকে "/proxy/" রিপ্লেস করে এনকোড করা URL বের করা
  const prefix = '/proxy/';
  if (!path.startsWith(prefix)) {
    return new Response('Invalid path. Use /proxy/<ENCODED_URL>', { status: 400 });
  }
  const encoded = path.slice(prefix.length);             // "https%3A%2F%2F…"
  let target;
  try {
    target = decodeURIComponent(encoded);                // "https://d1e7rcqq4o2ma.cloudfront.net/…1709.m3u8"
  } catch (err) {
    return new Response('Bad URL encoding', { status: 400 });
  }

  // ৩) টার্গেটে রিকোয়েস্ট পাঠানো
  let resp;
  try {
    resp = await fetch(target, {
      // প্রয়োজনমত হেডার পাস করতে পারেন
      headers: { 'User-Agent': 'CF-Proxy-Worker' }
    });
  } catch (err) {
    return new Response('Error fetching target: ' + err.message, { status: 502 });
  }

  // ৪) CORS হেডার সহ নতুন রেসপন্স
  const newHeaders = new Headers(resp.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', '*');

  return new Response(resp.body, {
    status: resp.status,
    headers: newHeaders
  });
}
