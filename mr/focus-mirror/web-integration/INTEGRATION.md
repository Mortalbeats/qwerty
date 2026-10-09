# Integrating the desk-presence sensor with focusmirror.netlify.app

> **This guide is now implemented for your actual codebase** — see
> `../site/`, a ready-to-deploy mirror of your site with the feature
> already built in (toggleable Desk Sensor card on the Dashboard).
> `../site/SITE-INTEGRATION.md` explains exactly what changed.
> The generic drop-in widget below is kept for reference.

Your site is a static SPA served over **HTTPS on Netlify**, which means the
browser's **Web Serial API** works on the live site — the Arduino plugs into
the same computer via USB and the website reads it directly. No backend,
no server, no changes to your hosting.

There are two options. **Option A is recommended** — it's a single JS file.

---

## Option A — USB / Web Serial (simplest)

### 1. Flash the Arduino

Upload `../arduino/desk_presence_serial.ino` to your Arduino
(baud rate 115200). It prints:

```
DISTANCE:42
STATUS:1
```

Verify in the Serial Monitor first (distance changes when you sit/stand).

### 2. Add the feature to your site

Copy `desk-sensor.js` into your site's static assets (e.g. `public/` or
`src/` next to your other JS).

On your **Dashboard** page, add a container and initialize it:

```html
<div id="desk-sensor"></div>
<script src="/desk-sensor.js"></script>
<script>
  DeskSensor.init(document.getElementById("desk-sensor"));
</script>
```

Good spot: in the right-hand column, under the "Live Biometrics" card.

The widget renders as a **toggleable feature card** that matches the
dashboard style: a "DESK SENSOR" row with an on/off switch. Toggling it on
reveals the sensor panel (status dot, live distance, Connect button);
toggling it off hides the panel and disconnects the Arduino. The toggle
state is saved in `localStorage`, so it stays on across visits.

API: `DeskSensor.init(el)`, `DeskSensor.setEnabled(bool)`,
`DeskSensor.showRemote(present, distance)`, `DeskSensor.supported()`.

### 3. React to presence in your app (optional but recommended)

While the feature is enabled, the widget fires a `deskpresence` event on
`document` (toggling the feature off disconnects and stops events):

```js
document.addEventListener("deskpresence", (e) => {
  // e.detail = { connected, present, distance }
  if (e.detail.connected && e.detail.present === false) {
    pauseMyFocusTimer();   // your existing pause function
  }
});
```

This auto-pauses your Pomodoro when someone stands up — a natural fit for
FocusMirror.

### 4. Redeploy

Commit and push — Netlify redeploys automatically. Open
https://focusmirror.netlify.app/ in **Chrome or Edge**, go to the Dashboard,
click **Connect Arduino**, pick the serial port, and you're live.

### Requirements / limits

- Chrome or Edge on **desktop** only (Web Serial isn't in Safari, Firefox,
  or mobile browsers — the widget shows "Needs Chrome/Edge on desktop" there)
- HTTPS — already satisfied by Netlify
- The Arduino must be plugged into the computer viewing the site
- The Connect click satisfies the browser's user-gesture requirement

---

## Option B — WiFi (ESP32/ESP8266, no USB cable)

Use this if the sensor should be wireless, or the site is viewed on a
different device than the one the Arduino is attached to.

### 1. Add the serverless endpoint

Copy `netlify/functions/presence.js` into your repo at
`netlify/functions/presence.js` and redeploy. It exposes:

- `POST /api/presence` — stores the latest reading in Netlify Blobs
- `GET  /api/presence` — returns the latest reading

(Enable **Blobs** in your Netlify site settings if it isn't already.)

### 2. Flash the WiFi sketch

Edit `../arduino/desk_presence_wifi.ino`:

```cpp
const char* SERVER_URL = "https://focusmirror.netlify.app/api/presence";
```

plus your WiFi credentials. The ESP32 POSTs every 2 seconds.

### 3. Poll from the website

```js
setInterval(async () => {
  try {
    const res = await fetch("/api/presence");
    const s = await res.json();
    if (s && s.present !== null) DeskSensor.showRemote(s.present, s.distance);
  } catch (e) { /* sensor offline */ }
}, 2000);
```

`DeskSensor.showRemote()` feeds the card without a Connect button and
auto-enables the feature toggle.

---

## Test the widget before touching your site

Open `demo.html` (in this folder) in Chrome/Edge — it loads `desk-sensor.js`,
shows the card, and logs every `deskpresence` event. Connect your Arduino and
confirm "At your desk" / "Desk empty" flips as you sit and stand.

## Files

- `desk-sensor.js` — drop-in widget (both options)
- `demo.html` — standalone test page
- `netlify/functions/presence.js` — serverless endpoint (Option B)
- `../arduino/desk_presence_serial.ino` — USB sketch (Option A)
- `../arduino/desk_presence_wifi.ino` — ESP32 sketch (Option B)
