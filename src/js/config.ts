/**
 * config.ts — ÚNICO lugar donde vive la dirección de la API (la W del stack).
 * Cambia aquí el host si redepliegas el worker con otro nombre.
 */
export const API = 'https://orbe-api.jeffaporta.workers.dev';

/** Misma URL pero para WebSocket. */
export const API_WS = API.replace(/^http/, 'ws');
