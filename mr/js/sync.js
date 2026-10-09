/* ═══════════════════════════════════════════════════════════════
   FocusMirror · cloud sync + real leaderboard
   ───────────────────────────────────────────────────────────────
   Local-first: localStorage stays the source of truth for the UI so
   the app never blocks on the network. This layer mirrors progress
   up to Supabase and pulls the shared leaderboard down.

   Merge rule on sign-in: take the HIGHER of local vs cloud for every
   cumulative stat. A user who played offline then signs in keeps that
   progress; a user on a fresh device inherits their cloud progress.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  window.FM = window.FM || {};
  var pushTimer = null;
  var lastPush = 0;
  var PUSH_DEBOUNCE = 4000;   // don't hammer the API on every XP tick

  function c() { return window.FM.client && window.FM.client(); }
  function me() { return window.FM.user && window.FM.user(); }

  function localState() {
    try { return JSON.parse(localStorage.getItem('ff_state') || '{}'); }
    catch (e) { return {}; }
  }
  function saveLocalState(s) {
    try { localStorage.setItem('ff_state', JSON.stringify(s)); } catch (e) {}
  }
  function localHistory() {
    try { return JSON.parse(localStorage.getItem('ff_history') || '[]'); }
    catch (e) { return []; }
  }

  /* ── PUSH: local → cloud ── */
  function pushStats(immediate) {
    var sb = c(), u = me();
    if (!sb || !u) return Promise.resolve();

    var run = function () {
      lastPush = Date.now();
      var s = localState();
      var row = {
        user_id: u.id,
        xp: Math.max(0, s.xp | 0),
        level: Math.max(1, s.level | 0),
        streak: Math.max(0, s.streak | 0),
        best_streak: Math.max(0, s.streak | 0),
        total_sessions: Math.max(0, s.totalSessions | 0),
        total_minutes: Math.max(0, s.totalMinutes | 0),
        best_score: Math.min(100, Math.max(0, s.bestScore | 0)),
        badges: s.earnedBadges || [],
        checkpoints: s.earnedCheckpoints || [],
        weekly_xp: Math.max(0, s.weeklyXp | 0),
        updated_at: new Date().toISOString()
      };
      return sb.from('user_stats').upsert(row, { onConflict: 'user_id' })
        .then(function (r) {
          if (r.error) console.warn('[FM] stat push failed:', r.error.message);
          return r;
        });
    };

    clearTimeout(pushTimer);
    if (immediate || Date.now() - lastPush > PUSH_DEBOUNCE) return run();
    return new Promise(function (res) {
      pushTimer = setTimeout(function () { run().then(res); }, PUSH_DEBOUNCE);
    });
  }
  window.FM.pushStats = pushStats;

  /* one row per completed session — the audit trail behind the XP */
  window.FM.logSession = function (entry) {
    var sb = c(), u = me();
    if (!sb || !u || !entry) return Promise.resolve();
    return sb.from('sessions').insert({
      user_id: u.id,
      method: String(entry.method || 'Session').slice(0, 60),
      score: Math.min(100, Math.max(0, entry.score | 0)),
      duration_min: Math.min(600, Math.max(0, entry.duration | 0)),
      xp_earned: Math.min(500, Math.max(0, entry.xp | 0))
    }).then(function (r) {
      if (r.error) console.warn('[FM] session log failed:', r.error.message);
      return pushStats(true);
    });
  };

  /* ── PULL + MERGE on sign-in ── */
  window.FM.onSignIn = function (user) {
    var sb = c();
    if (!sb) return Promise.resolve();

    return sb.from('user_stats').select('*').eq('user_id', user.id).maybeSingle()
      .then(function (r) {
        if (r.error) { console.warn('[FM] stat pull failed:', r.error.message); return; }
        var cloud = r.data;
        var local = localState();

        if (!cloud) return pushStats(true);   // first sign-in on this account

        // higher-of-both merge, so neither side loses progress
        var merged = Object.assign({}, local, {
          xp:            Math.max(local.xp | 0,            cloud.xp | 0),
          level:         Math.max(local.level | 1,         cloud.level | 1),
          streak:        Math.max(local.streak | 0,        cloud.streak | 0),
          totalSessions: Math.max(local.totalSessions | 0, cloud.total_sessions | 0),
          totalMinutes:  Math.max(local.totalMinutes | 0,  cloud.total_minutes | 0),
          bestScore:     Math.max(local.bestScore | 0,     cloud.best_score | 0),
          weeklyXp:      Math.max(local.weeklyXp | 0,      cloud.weekly_xp | 0),
          earnedBadges:      union(local.earnedBadges,      cloud.badges),
          earnedCheckpoints: union(local.earnedCheckpoints, cloud.checkpoints)
        });
        saveLocalState(merged);

        // repaint whatever the app exposes
        ['updateXpDisplay','renderBadges','renderCheckpoints',
         'updateHistoryDisplay','updateDashboardStats'].forEach(function (fn) {
          if (typeof window[fn] === 'function') { try { window[fn](); } catch (e) {} }
        });
        if (typeof window.reloadState === 'function') window.reloadState();

        return pushStats(true);
      })
      .then(function () { return loadLeaderboard(); });
  };

  window.FM.onSignOut = function () { renderSignedOut(); };

  function union(a, b) {
    var out = {}, res = [];
    (a || []).concat(b || []).forEach(function (x) { if (x && !out[x]) { out[x] = 1; res.push(x); } });
    return res;
  }

  /* ── REAL LEADERBOARD ── */
  function medal(i) { return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1); }

  function rowHtml(e, i, key, mine) {
    var val = key === 'weekly_xp' ? (e.weekly_xp | 0) : (e.xp | 0);
    return '<div class="lb-row' + (mine ? ' me' : '') + '">'
      + '<span class="lb-rank">' + medal(i) + '</span>'
      + '<span class="lb-name">' + esc(e.display_name || 'Student') + (mine ? ' <b>(you)</b>' : '') + '</span>'
      + '<span class="lb-val">' + val.toLocaleString() + ' XP</span>'
      + '</div>';
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function skeletonRows(n) {
    var h = '';
    for (var i = 0; i < (n || 5); i++) {
      h += '<div class="lb-row"><span class="skel" style="width:26px;height:12px"></span>'
        + '<span class="skel" style="flex:1;height:12px;margin:0 10px"></span>'
        + '<span class="skel" style="width:54px;height:12px"></span></div>';
    }
    return h;
  }

  function renderSignedOut() {
    ['lb-global', 'lb-weekly'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = '<div class="lb-empty">Sign in to join the global leaderboard.</div>';
    });
  }

  function loadLeaderboard() {
    var sb = c();
    var g = document.getElementById('lb-global');
    var w = document.getElementById('lb-weekly');
    if (!g || !w) return Promise.resolve();

    if (!sb) {
      g.innerHTML = '<div class="lb-empty">Cloud leaderboard unavailable offline.</div>';
      w.innerHTML = '<div class="lb-empty">Cloud leaderboard unavailable offline.</div>';
      return Promise.resolve();
    }

    g.innerHTML = skeletonRows(5);
    w.innerHTML = skeletonRows(5);
    var u = me();

    return Promise.all([
      sb.from('leaderboard').select('*').order('xp', { ascending: false }).limit(25),
      sb.from('leaderboard').select('*').order('weekly_xp', { ascending: false }).limit(25)
    ]).then(function (res) {
      var all = res[0], wk = res[1];

      if (all.error) {
        var msg = /schema cache|does not exist/i.test(all.error.message)
          ? 'Leaderboard tables not created yet — run <code>schema.sql</code> in Supabase.'
          : esc(all.error.message);
        g.innerHTML = '<div class="lb-empty">' + msg + '</div>';
        w.innerHTML = '<div class="lb-empty">' + msg + '</div>';
        return;
      }

      var rowsA = (all.data || []).filter(function (e) { return (e.xp | 0) > 0; });
      var rowsW = (wk.data || []).filter(function (e) { return (e.weekly_xp | 0) > 0; });

      g.innerHTML = rowsA.length
        ? rowsA.map(function (e, i) { return rowHtml(e, i, 'xp', u && e.id === u.id); }).join('')
        : '<div class="lb-empty">No scores yet — be the first!</div>';
      w.innerHTML = rowsW.length
        ? rowsW.map(function (e, i) { return rowHtml(e, i, 'weekly_xp', u && e.id === u.id); }).join('')
        : '<div class="lb-empty">No XP earned this week yet.</div>';

      // personal rank cards
      if (u) {
        var idx = rowsA.findIndex(function (e) { return e.id === u.id; });
        var mine = idx >= 0 ? rowsA[idx] : null;
        setText('lb-my-rank', idx >= 0 ? '#' + (idx + 1) : '--');
        if (mine) {
          setText('lb-my-xp', (mine.xp | 0).toLocaleString());
          setText('lb-my-streak', mine.streak | 0);
          setText('lb-my-avg', mine.best_score ? mine.best_score : '--');
        }
      }
    }).catch(function (e) {
      g.innerHTML = '<div class="lb-empty">Could not reach the leaderboard.</div>';
      w.innerHTML = '<div class="lb-empty">Could not reach the leaderboard.</div>';
    });
  }
  window.FM.loadLeaderboard = loadLeaderboard;

  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }

  /* ── hooks into the existing app ── */
  function init() {
    // refresh the board whenever the tab is opened
    var base = window.switchSection;
    if (typeof base === 'function') {
      window.switchSection = function (id) {
        base(id);
        if (id === 'leaderboard') loadLeaderboard();
      };
    }

    // mirror XP changes upward
    var addXp = window.addXp;
    if (typeof addXp === 'function') {
      window.addXp = function (n) { var r = addXp(n); pushStats(false); return r; };
    }

    // log finished sessions
    var reset = window.resetSession;
    if (typeof reset === 'function') {
      window.resetSession = function () {
        var before = localHistory().length;
        var out = reset.apply(this, arguments);
        setTimeout(function () {
          var h = localHistory();
          if (h.length > before && h[0]) window.FM.logSession(h[0]);
        }, 400);
        return out;
      };
    }

    // flush on exit so nothing is lost
    window.addEventListener('beforeunload', function () {
      if (me() && c()) { clearTimeout(pushTimer); pushStats(true); }
    });

    if (!me()) renderSignedOut();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
