# Desk Sensor — integrated into FocusMirror

The Arduino ultrasonic desk-presence feature is built into the site as a
**toggleable feature card on the Dashboard**, styled to match the app.

The website lives at the workspace root:

```
index.html          ← dashboard page (Desk Sensor card added here)
css/styles.css      ← .ds-* styles appended
js/app.js           ← fmTimerState() bridge added
js/desksensor.js    ← NEW: the whole feature (Web Serial + toggle + auto-pause)
js/…                ← all your other files, untouched
```

Your original uploads are preserved untouched in `uploads/`.

## What changed in YOUR files (additions only, nothing removed)

| File | Change |
|---|---|
| `index.html` | Desk Sensor card markup in the dashboard right column (below the READY alert box) + `<script src="js/desksensor.js">` after `app.js` |
| `js/desksensor.js` | **New file** — Web Serial client + toggle logic + auto-pause wiring |
| `js/app.js` | Added `window.fmTimerState()` bridge (10 lines, before the INIT section) so the sensor can read whether the Pomodoro / Time Block timers are running |
| `css/styles.css` | Appended the `.ds-*` styles at the end (uses your CSS variables, light-theme included) |

## How it works

1. User flips the **Desk Sensor** switch ON (saved in `localStorage`)
2. The panel appears with a **Connect Arduino** button
3. Clicking it makes the browser ask for access to the serial port
   (Web Serial's port picker)
4. The Arduino (HC-SR04, sketch `focus-mirror/arduino/desk_presence_serial.ino`,
   115200 baud) sends `DISTANCE:<cm>` / `STATUS:<0|1>` twice per second
5. The card shows a teal dot + **"At your desk"** or a red dot +
   **"Desk empty"**, with the live distance
6. Bonus: when the person leaves the desk, any running **Pomodoro** or
   **Time Block** timer auto-pauses (with a notification) and auto-resumes
   on return. Toggling the feature OFF disconnects the Arduino.

## Test locally

```bash
python3 serve.py
```

Open the printed `http://localhost:PORT` URL in **Chrome or Edge**, go to
**Dashboard**, flip the Desk Sensor switch on, click **Connect Arduino**,
pick the port. Close the Arduino IDE Serial Monitor first — only one
program can hold the serial port at a time.

> Web Serial needs Chrome/Edge on desktop and an HTTPS (or localhost)
> origin. The live Netlify site satisfies this. Safari/Firefox/mobile get
> a disabled switch with a note.

## Deploy (no GitHub needed)

Go to app.netlify.com → your FocusMirror site → **Deploys** tab → drag the
workspace folder (or a zip of its contents, with `index.html` at the zip
root) into "Deploy manually". Your site updates at focusmirror.netlify.app.

## Arduino side

Flash `focus-mirror/arduino/desk_presence_serial.ino`:

- HC-SR04: VCC→5V, GND→GND, Trig→D9, Echo→D10 (direct jumper wires, no breadboard)
- Tune `PRESENCE_THRESHOLD_CM` from Serial Monitor readings
  (sitting distance vs. away distance; default 70)

## Optional: WiFi instead of USB

`DeskSensor.showRemote(present, distance)` feeds the same card from a
remote source. See `focus-mirror/web-integration/netlify/functions/presence.js`
(a Netlify function) + `focus-mirror/arduino/desk_presence_wifi.ino`
(ESP32 sketch). Poll `/api/presence` every 2 s and call `showRemote`.
