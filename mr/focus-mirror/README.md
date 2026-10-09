# Focus Mirror — Desk Presence Detector

An ultrasonic sensor tells your website whether someone is sitting at the desk.
The page shows live presence, a distance readout, and a 25-minute focus timer
that **pauses automatically when you step away** and resumes when you return.

## Hardware

- Arduino Uno / Nano / Mega (USB option) **or** ESP32 / ESP8266 (WiFi option)
- HC-SR04 ultrasonic sensor
- Jumper wires

### Wiring (HC-SR04 → Arduino)

| HC-SR04 | Arduino |
|---------|---------|
| VCC     | 5V      |
| GND     | GND     |
| Trig    | D9      |
| Echo    | D10     |

> Echo outputs 5V — fine for 5V boards (Uno/Nano/Mega). For 3.3V boards
> (ESP32), add a voltage divider: Echo → 1kΩ → pin, and 2kΩ from pin → GND.

Mount the sensor pointing at the chair / person's torso — e.g. under the front
edge of the desk, or on a shelf above the desk.

## Option A — USB (Arduino Uno/Nano/Mega, no server needed)

1. Flash `arduino/desk_presence_serial.ino` (baud rate 115200).
2. Open `index.html` in **Chrome or Edge** (Web Serial needs HTTPS or `localhost`).
3. Click **Connect Arduino**, pick the serial port.
4. Sit down / stand up and watch the status change.

## Option B — WiFi (ESP32/ESP8266)

1. Edit `arduino/desk_presence_wifi.ino`: set `WIFI_SSID`, `WIFI_PASSWORD`,
   and `SERVER_URL` (your computer's IP on the same network, e.g.
   `http://192.168.1.20:3000/api/presence`).
2. On your computer: `npm install express && node server.js`
3. The ESP32 POSTs `{"device","distance","present"}` every 2 s to
   `POST /api/presence`; the server stores it and `GET /api/presence`
   returns the latest state. Wire that into your page with `fetch()` +
   `setInterval`, or extend `index.html`.

## Tuning

`PRESENCE_THRESHOLD_CM` in the sketch decides what counts as "at the desk":

1. Upload the sketch, open **Tools → Serial Monitor** (115200 baud).
2. Sit at the desk → note the distance (e.g. ~40 cm).
3. Leave the desk → note the distance (e.g. ~150 cm).
4. Set the threshold between the two values (default: 70 cm).

The sketch takes the **median of 5 readings**, so a hand waving in front of
the sensor won't cause flicker.

## Demo mode

`index.html` has a **Demo mode** toggle that simulates the sensor (toggles
presence every 7 s) — handy for developing the page before the hardware
is wired up.

## Files

- `arduino/desk_presence_serial.ino` — Uno/Nano/Mega over USB
- `arduino/desk_presence_wifi.ino` — ESP32/ESP8266 over WiFi
- `index.html` — the mirror website (Web Serial + focus timer + demo mode)
- `server.js` — tiny Express backend for the WiFi option
