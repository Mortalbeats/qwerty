/*
 * Netlify Function: desk-presence endpoint for the WiFi (ESP32) option.
 *
 *   POST /api/presence   {"device":"...","distance":38,"present":true}
 *   GET  /api/presence   -> latest stored state
 *
 * State is stored in Netlify Blobs (enable Blobs in your Netlify site
 * settings — it's included in the free tier).
 *
 * Deploy: place this file at  netlify/functions/presence.js  in your site
 * repo and redeploy. The `config.path` below maps it to /api/presence.
 */
import { getStore } from "@netlify/blobs";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*", // allow the ESP32 to POST cross-origin
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const store = getStore("desk-presence");

  if (req.method === "POST") {
    const body = await req.json();
    const state = {
      device: body.device || "focus-mirror",
      distance: typeof body.distance === "number" ? body.distance : null,
      present: !!body.present,
      updatedAt: new Date().toISOString(),
    };
    await store.setJSON("state", state);
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  if (req.method === "GET") {
    const state = (await store.get("state", { type: "json" })) || {
      device: null, distance: null, present: null, updatedAt: null,
    };
    return new Response(JSON.stringify(state), { headers });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405, headers,
  });
};

export const config = { path: "/api/presence" };
