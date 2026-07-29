/**
 * router.ts — navegación por un solo parámetro `?s=` (JSON en base64 url-safe).
 * Misma idea que el resto del kit: una sola dirección real, cero configuración
 * de servidor, estado compuesto en el enlace.
 */

export type Route = { v: 'spaces' } | { v: 'space'; id: number };

export const RUTA_INICIAL: Route = { v: 'spaces' };

export function encodeState(state: Route): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeState(raw: string | null): Route {
  if (!raw) return RUTA_INICIAL;
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Route;
    return isRoute(parsed) ? parsed : RUTA_INICIAL;
  } catch {
    return RUTA_INICIAL;
  }
}

function isRoute(x: unknown): x is Route {
  if (!x || typeof x !== 'object') return false;
  const v = (x as { v?: unknown }).v;
  return v === 'spaces' || v === 'space';
}

export function currentRoute(): Route {
  return decodeState(new URLSearchParams(window.location.search).get('s'));
}

export function href(state: Route): string {
  return `?s=${encodeState(state)}`;
}

export function navigate(state: Route): void {
  window.history.pushState(state, '', href(state));
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
}
