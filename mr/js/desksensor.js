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

  let port = null, reader = null, writer = null, scoreTimer = null;
  let connected = false, remote = false, enabled = false;
  const state = { present: null, distance: null, noise: null };

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
      const nl = noiseLabel();
      els.meta.textContent = (state.distance != null ? state.distance + ' cm from sensor' : '—') + (nl ? ' · ' + nl : '');
      els.btn.style.display = '';
    }
    els.btn.textContent = connected && !remote ? 'Disconnect' : 'Connect Arduino';
    updateNoiseUI();
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
        } else if (line.startsWith('Distance:')) {
      // also accepts desk_presence_simple.ino:
      //   "Distance: 42 cm  ->  PERSON AT DESK"  |  "desk empty"
      const m = line.match(/Distance:\s*(-?\d+)/);
      if (m) {
        const d = parseInt(m[1], 10);
        if (!isNaN(d) && d > 0) state.distance = d;
      }
      let present = null;
      if (/PERSON AT DESK/i.test(line)) present = true;
      else if (/desk empty/i.test(line)) present = false;
      else if (m) {
        const d2 = parseInt(m[1], 10);
        present = (d2 > 0 && d2 <= 70);
      }
      if (present !== null && present !== state.present) {
        state.present = present;
        emit();
      }
      render();
    } else if (line.startsWith('NOISE:')) {
      const n = parseInt(line.slice(6), 10);
      if (!isNaN(n)) state.noise = Math.max(0, Math.min(100, n));
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

  /* ---- Room Noise UI (injected with JS, so index.html needs no edits) ---- */
  let noiseRow = null, noiseFill = null, noiseTxt = null;
  function ensureNoiseUI() {
    const body = document.getElementById('ds-body');
    if (!body || document.getElementById('ds-noise-row')) return;
    noiseRow = document.createElement('div');
    noiseRow.id = 'ds-noise-row';
    noiseRow.style.cssText = 'margin-top:12px';
    const label = document.createElement('div');
    label.textContent = 'ROOM NOISE';
    label.style.cssText = 'font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:2px;font-weight:700;font-family:var(--font-grotesk);margin-bottom:6px';
    const track = document.createElement('div');
    track.style.cssText = 'height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden';
    noiseFill = document.createElement('div');
    noiseFill.style.cssText = 'height:100%;width:0%;background:var(--secondary);transition:width .3s,background .3s';
    track.appendChild(noiseFill);
    noiseTxt = document.createElement('div');
    noiseTxt.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:4px';
    noiseTxt.textContent = '\u2014';
    noiseRow.appendChild(label); noiseRow.appendChild(track); noiseRow.appendChild(noiseTxt);
    const btn = document.getElementById('ds-btn');
    if (btn && btn.parentNode === body) body.insertBefore(noiseRow, btn);
    else body.appendChild(noiseRow);
  }
  function updateNoiseUI() {
    if (!connected) {
      if (noiseRow && noiseRow.parentNode) noiseRow.parentNode.removeChild(noiseRow);
      noiseRow = null; noiseFill = null; noiseTxt = null;
      return;
    }
    ensureNoiseUI();
    if (!noiseFill || !noiseTxt) return;
    const n = state.noise;
    if (n == null) {
      noiseTxt.textContent = 'waiting for mic data\u2026';
      noiseFill.style.width = '0%';
      return;
    }
    noiseTxt.textContent = noiseLabel();
    noiseFill.style.width = Math.max(2, Math.min(100, n)) + '%';
    noiseFill.style.background = n < 25 ? 'var(--secondary)' : n < 60 ? 'var(--gold)' : 'var(--danger)';
  }

  function noiseLabel() {
    const n = state.noise;
    if (n == null) return '';
    if (n < 25) return '\u{1F3A3} Quiet (' + n + ')';
    if (n < 60) return '\u{1F3A3} Noise ' + n;
    return '\u{1F3A3} LOUD room (' + n + ')';
  }

  /* Sends the live camera Focus Score down the USB cable as "S<0-100>",
     so the LCD shows it and the buzzer can react. Reads the same number
     the dashboard shows (#b-score) once per second. */
  function startScoreWriter() {
    stopScoreWriter();
    scoreTimer = setInterval(() => {
      if (!connected || !writer) return;
      const el = document.getElementById('b-score');
      if (!el) return;
      const v = parseInt(el.textContent, 10);
      if (!isNaN(v) && v >= 0 && v <= 100) {
        try { writer.write('S' + v + '\n'); } catch (e) {}
      }
    }, 1000);
  }

  async function stopScoreWriter() {
    if (scoreTimer) { clearInterval(scoreTimer); scoreTimer = null; }
    if (writer) { try { await writer.close(); } catch (e) {} writer = null; }
  }

  async function connect() {
    try {
      // This is the browser prompt asking for access to the serial port.
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      connected = true;
      render();
      readLoop();
      try {   // one-way link: website -> Arduino ("S<score>")
        const enc = new TextEncoderStream();
        enc.readable.pipeTo(port.writable);
        writer = enc.writable.getWriter();
        startScoreWriter();
      } catch (e) { console.warn('DeskSensor write setup failed:', e); }
    } catch (e) {
      console.warn('DeskSensor connect failed:', e);
      connected = false;
      render();
    }
  }

  async function disconnect() {
    await stopScoreWriter();
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
