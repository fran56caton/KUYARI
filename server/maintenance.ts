// Temporary closure requested by the owner. Restore normal routing in vercel.json
// and set this flag to false to reopen; no catalogue or order records are changed.
export const maintenanceEnabled = true;

const message = 'La página está temporalmente fuera de servicio. Vuelve más adelante.';
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#4a1734"><title>KUYARI · Pausa temporal</title><style>html{color-scheme:light;background:#faf4ef;color:#4a1734;font-family:Georgia,serif}body{margin:0;min-height:100svh;display:grid;place-items:center}main{padding:48px 24px;text-align:center;max-width:38rem}strong{font-family:Arial,sans-serif;font-size:1.15rem;letter-spacing:.24em}h1{font-size:clamp(2rem,7vw,3.5rem);font-weight:400;line-height:1.1;margin:40px 0 20px}p{font-family:Arial,sans-serif;color:#67515c;line-height:1.7;font-size:1rem;margin:0;max-width:38ch;margin-inline:auto}::selection{background:#4a1734;color:#fffdfb}</style></head><body><main><strong>KUYARI</strong><h1>Estamos en una<br>pausa temporal.</h1><p>${message}</p></main></body></html>`;

/** Runs before session creation, body parsing, storage or commerce handlers. */
export function maintenanceResponse(url: string, method = 'GET'): Response | undefined {
  if (!maintenanceEnabled) return undefined;
  const path = new URL(url, 'https://kuyari.invalid').pathname;
  const api = path === '/api' || path.startsWith('/api/');
  return new Response(method === 'HEAD' ? null : api ? JSON.stringify({ error: message, code: 'MAINTENANCE' }) : html, {
    status: 503,
    headers: {
      'Content-Type': api ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      'Retry-After': '3600',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    },
  });
}
