// Minimal backend for the WiFi option (ESP32/ESP8266 posts here).
// Run:  npm install express && node server.js
// Then open http://localhost:3000 — it serves index.html too.

const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // serves index.html

let state = { device: null, distance: null, present: false, updatedAt: null };

app.post("/api/presence", (req, res) => {
  state = {
    device: req.body.device || "unknown",
    distance: typeof req.body.distance === "number" ? req.body.distance : null,
    present: !!req.body.present,
    updatedAt: new Date().toISOString(),
  };
  console.log("Presence update:", state);
  res.json({ ok: true });
});

app.get("/api/presence", (req, res) => res.json(state));

const PORT = 3000;
app.listen(PORT, () => console.log(`Focus Mirror server running on http://localhost:${PORT}`));
