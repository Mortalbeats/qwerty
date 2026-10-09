/* ═══════════════════════════════════════════════════════════════════════
   FocusMirror · Desk Sensor feature
   ───────────────────────────────────────────────────────────────────
   Connects an Arduino (HC-SR04 ultrasonic sensor) to the dashboard over
   USB using the browser's Web Serial API. Clicking "Connect Arduino"
   makes the browser ask for access to the serial port, then the live
   Arduino readings show whether the person is sitting at their desk.

   Arduino side: flash focus-mirror/arduino/desk_presence_serial.ino
   (115200 baud). It prints lines:   DISTANCE:<cm>   and   STATUS:<0|1>

   Markup lives in index.html (ids: desk-sensor, ds-*). Styles: .ds-* in
   css/styles.css. Toggle state persists in localStorage ('fm_desk_sensor').

   While enabled, a "deskpresence" CustomEvent fires on document whenever
   the presence state CHANGES (or the sensor connects/disconnects):
     event.detail = { connected: bool, present: true/false/null, distance: number|null }
   This file also listens for it to auto-pause/resume the Pomodoro and
   Time Block timers when the user leaves/returns to the desk.

   Requires Chrome/Edge on desktop (Web Serial) — the site is served over
   HTTPS by Netlify, which Web Serial requires. Safari/Firefox/mobile get
   a disabled switch with an explanatory note.
   ═══════════════════════════════════════════════════════════════════════ */

window.DeskSensor = (() => {
  'use strict';

  const STORAGE_KEY = 'fm_desk_sensor';

  const els = {
    desc:   document.getElementById('ds-desc'),
    switch: document.getElementById('ds-switch'),
    body:   document.getElementById('ds-body'),
    dot:    document.getElementById('ds-dot'),
    state:  document.getElementById('ds-state'),
    meta:   document.getElementById('ds-meta'),
    btn:    document.getElementById('ds-btn'),
  };

  let port = null, reader = null;
  let connected = false, remote = false, enabled = false;
  const state = { present: null, distance: null };

  function supported() { return 'serial' in navigator; }

  function emit() {
    document.dispatchEvent(new CustomEvent('deskpresence', {
      detail: {
        connected: enabled && connected,
        present: state.present,
        distance: state.distance,
      },
    }));
  }

  function render() {
    const p = state.present;
    els.dot.className = 'ds-dot' + (p === null ? '' : p ? ' on' : ' off');
    if (remote) {
      els.state.textContent = p === null ? 'Waiting…' : p ? 'At your desk' : 'Desk empty';
      els.meta.textContent = (state.distance != null ? state.distance + ' cm from sensor' : '—') + ' · WiFi';
      els.btn.style.display = 'none';
    } else if (!connected) {
      els.state.textContent = 'Offline';
      els.meta.textContent = supported() ? 'Arduino not connected' : 'Needs Chrome/Edge';
      els.btn.style.display = '';
    } else if (p === null) {
      els.state.textContent = 'Waiting…';
      els.meta.textContent = 'Reading from sensor';
      els.btn.style.display = '';
    } else {
      els.state.textContent = p ? 'At your desk' : 'Desk empty';
      els.meta.textContent = state.distance != null ? state.distance + ' cm from sensor' : '—';
      els.btn.style.display = '';
    }
    els.btn.textContent = connected && !remote ? 'Disconnect' : 'Connect Arduino';
  }

  async function setEnabled(on) {
    enabled = on;
    try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch (e) {}
    els.switch.setAttribute('aria-checked', String(on));
    els.body.hidden = !on;
    if (on) {
      render();
    } else {
      if (connected) {
        await disconnect(); // also emits
      } else {
        state.present = null; state.distance = null;
        render(); emit();
      }
    }
  }

  // ─── Web Serial (USB) ───
  function handleLine(line) {
    if (line.startsWith('DISTANCE:')) {
      const d = parseInt(line.slice(9), 10);
      if (!isNaN(d) && d > 0) state.distance = d;
      render();
    } else if (line.startsWith('STATUS:')) {
      const present = line.slice(7).trim() === '1';
      if (present !== state.present) {   // only fire events on change
        state.present = present;
        emit();
      }
      render();
    }
  }

  async function readLoop() {
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    reader = decoder.readable.getReader();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let i;
        while ((i = buffer.indexOf('\n')) >= 0) {
          handleLine(buffer.slice(0, i).trim());
          buffer = buffer.slice(i + 1);
        }
      }
    } catch (e) {
      console.warn('DeskSensor read error:', e);
    }
    if (connected) disconnect();
  }

  async function connect() {
    try {
      // This is the browser prompt asking for access to the serial port.
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      connected = true;
      render();
      readLoop();
    } catch (e) {
      console.warn('DeskSensor connect failed:', e);
      connected = false;
      render();
    }
  }

  async function disconnect() {
    try { if (reader) await reader.cancel(); } catch (e) {}
    try { if (port) await port.close(); } catch (e) {}
    connected = false; port = null; reader = null;
    state.present = null; state.distance = null;
    render(); emit();
  }

  /* WiFi option: push server-fetched state in (e.g. polled from a
     Netlify function fed by an ESP32). Hides the Connect button. */
  function showRemote(present, distance) {
    remote = true;
    const changed = present !== state.present;
    state.present = present;
    state.distance = distance;
    connected = true;
    if (!enabled) setEnabled(true);
    render();
    if (changed) emit();
  }

  // ─── Auto-pause / auto-resume timers on presence change ───
  let lastPresent = null, autoPausedPom = false, autoPausedTb = false;
  document.addEventListener('deskpresence', (e) => {
    const d = e.detail;
    if (!d.connected) {
      lastPresent = null; autoPausedPom = false; autoPausedTb = false;
      return;
    }
    if (d.present === lastPresent) return;   // edge-triggered
    lastPresent = d.present;
    const ts = window.fmTimerState ? window.fmTimerState() : null;
    const notif = (t, m) => { if (window.showNotif) window.showNotif(t, m); };

    if (d.present === false) {
      if (ts && ts.isPomRunning() && typeof window.togglePomodoro === 'function') {
        window.togglePomodoro();
        autoPausedPom = true;
        notif('🪑 Desk empty', 'Pomodoro paused — you stepped away');
      }
      if (ts && ts.isTbRunning() && typeof window.toggleTimeBlock === 'function') {
        window.toggleTimeBlock();
        autoPausedTb = true;
        notif('🪑 Desk empty', 'Time block paused — you stepped away');
      }
    } else if (d.present === true) {
      if (autoPausedPom && typeof window.togglePomodoro === 'function') {
        window.togglePomodoro();
        autoPausedPom = false;
        notif('🪑 Back at your desk', 'Pomodoro resumed');
      }
      if (autoPausedTb && typeof window.toggleTimeBlock === 'function') {
        window.toggleTimeBlock();
        autoPausedTb = false;
        notif('🪑 Back at your desk', 'Time block resumed');
      }
    }
  });

  // ─── Wire up ───
  els.switch.addEventListener('click', () => setEnabled(!enabled));
  els.btn.addEventListener('click', () => (connected ? disconnect() : connect()));

  if (!supported()) {
    els.switch.disabled = true;
    els.desc.textContent = 'Chrome/Edge on desktop only';
  } else {
    navigator.serial.addEventListener('disconnect', (e) => {
      if (connected && port === e.target) disconnect();
    });
  }

  // Restore toggle state from last visit
  let saved = false;
  try { saved = localStorage.getItem(STORAGE_KEY) === 'on'; } catch (e) {}
  setEnabled(saved);

  return { setEnabled, showRemote, supported };
})();
