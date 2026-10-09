/* ═══════════════════════════════════════════════════════════════
   FocusMirror · authentication (Supabase)
   ───────────────────────────────────────────────────────────────
   Replaces the old localStorage "demo" auth. Real accounts, real
   password hashing (handled by Supabase/GoTrue — we never see or
   store a password), real sessions that survive a reload.

   Degrades gracefully: if Supabase is unreachable or ENABLE_CLOUD
   is false, the app still runs fully offline in guest mode.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CFG = window.FM_CONFIG || {};
  var sb = null;            // supabase client
  var mode = 'signin';
  var currentUser = null;   // { id, email, name }

  window.FM = window.FM || {};

  /* ── client bootstrap ── */
  function client() {
    if (sb) return sb;
    if (!CFG.ENABLE_CLOUD) return null;
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) return null;
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return null;
    try {
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    } catch (e) {
      console.warn('[FM] Supabase client failed to init:', e);
      sb = null;
    }
    return sb;
  }
  window.FM.client = client;
  window.FM.user = function () { return currentUser; };
  window.FM.isCloud = function () { return !!client(); };

  /* ── UI painting ── */
  function initials(name, email) {
    var src = (name || email || 'U').trim();
    var parts = src.split(/[\s@._-]+/).filter(Boolean);
    return ((parts[0] || 'U')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function paintUser() {
    var u = currentUser;
    var btn = document.getElementById('btn-signin');
    var chip = document.getElementById('user-chip');
    if (!btn || !chip) return;
    document.body.classList.toggle('signed-in', !!u);
    if (u) {
      btn.style.display = 'none';
      chip.style.display = 'inline-flex';
      document.getElementById('user-av').textContent = initials(u.name, u.email);
      document.getElementById('user-nm').textContent = u.name || u.email;
      document.getElementById('um-name').textContent = u.name || '—';
      document.getElementById('um-email').textContent = u.email || '';
      var ni = document.getElementById('name-input');
      if (ni && !ni.value.trim() && u.name) {
        ni.value = u.name;
        try { localStorage.setItem('ff_username', u.name); } catch (e) {}
      }
    } else {
      btn.style.display = 'inline-flex';
      chip.style.display = 'none';
      closeUserMenu();
    }
    var sync = document.getElementById('sync-badge');
    if (sync) {
      if (!client())      { sync.textContent = '○ Offline';  sync.className = 'sync-badge off'; }
      else if (u)         { sync.textContent = '● Synced';   sync.className = 'sync-badge on'; }
      else                { sync.textContent = '○ Local only'; sync.className = 'sync-badge off'; }
    }
  }
  window.FM.paintUser = paintUser;

  /* ── modal ── */
  window.setAuthMode = function (m) {
    mode = m;
    var up = (m === 'signup');
    document.getElementById('auth-title').textContent = up ? 'Create your account' : 'Welcome back';
    document.getElementById('auth-sub').textContent = up
      ? 'Your XP, streaks and history sync across every device.'
      : 'Sign in to sync your focus sessions, XP and streaks.';
    document.getElementById('field-name').style.display = up ? 'block' : 'none';
    document.getElementById('auth-submit').textContent = up ? 'Create account' : 'Sign in';
    document.getElementById('auth-pass').setAttribute('autocomplete', up ? 'new-password' : 'current-password');
    document.getElementById('auth-swap').innerHTML = up
      ? 'Already have an account? <b onclick="setAuthMode(\'signin\')">Sign in</b>'
      : 'New here? <b onclick="setAuthMode(\'signup\')">Create an account</b>';
    setMsg('', '');
  };

  function setMsg(kind, msg) {
    var e = document.getElementById('auth-err');
    if (!e) return;
    e.innerHTML = msg;
    e.className = 'auth-err' + (msg ? ' show' : '') + (kind ? ' ' + kind : '');
  }

  window.openAuth = function (m) {
    setAuthMode(m || 'signin');
    document.getElementById('auth-overlay').classList.add('open');
    document.getElementById('auth-modal').classList.add('open');
    if (!client()) {
      setMsg('warn', '⚠ Cloud sync is not configured — you can still use the app locally.');
    }
    setTimeout(function () {
      var f = document.getElementById(mode === 'signup' ? 'auth-name' : 'auth-email');
      if (f) f.focus();
    }, 60);
  };
  window.closeAuth = function () {
    document.getElementById('auth-overlay').classList.remove('open');
    document.getElementById('auth-modal').classList.remove('open');
    setMsg('', '');
  };

  /* ── submit ── */
  window.submitAuth = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    setMsg('', '');

    var name = (document.getElementById('auth-name').value || '').trim();
    var email = (document.getElementById('auth-email').value || '').trim();
    var pass = document.getElementById('auth-pass').value || '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setMsg('', 'Please enter a valid email address.'); return false; }
    if (pass.length < 6) { setMsg('', 'Password must be at least 6 characters.'); return false; }
    if (mode === 'signup' && !name) { setMsg('', 'Please enter your name.'); return false; }

    var c = client();
    if (!c) { setMsg('', 'Cloud sync unavailable. Check your connection, then try again.'); return false; }

    var btn = document.getElementById('auth-submit');
    var label = btn.textContent;
    btn.textContent = 'Please wait…';
    btn.disabled = true;

    var op = (mode === 'signup')
      ? c.auth.signUp({ email: email, password: pass, options: { data: { display_name: name } } })
      : c.auth.signInWithPassword({ email: email, password: pass });

    op.then(function (res) {
      if (res.error) throw res.error;

      // Email confirmation ON → signUp returns a user but NO session.
      if (mode === 'signup' && !res.data.session) {
        setMsg('warn',
          '📧 Check your inbox — we sent a confirmation link to <b>' + email +
          '</b>. Click it, then sign in.');
        btn.textContent = label; btn.disabled = false;
        setTimeout(function () { setAuthMode('signin'); }, 100);
        return;
      }

      return adoptSession(res.data.session, res.data.user).then(function () {
        closeAuth();
        document.getElementById('auth-form').reset();
        if (typeof showNotif === 'function') {
          showNotif(mode === 'signup' ? '🎉 Account created' : '👋 Welcome back',
                    'Signed in as ' + (currentUser.name || currentUser.email));
        }
      });
    }).catch(function (err) {
      var m = (err && err.message) || 'Something went wrong.';
      if (/Invalid login credentials/i.test(m)) m = 'Wrong email or password.';
      else if (/Email not confirmed/i.test(m)) m = 'Please confirm your email first — check your inbox.';
      else if (/already registered|User already/i.test(m)) m = 'That email already has an account. Try signing in.';
      else if (/rate limit|too many/i.test(m)) m = 'Too many attempts. Wait a minute and try again.';
      setMsg('', m);
    }).finally(function () {
      btn.textContent = label;
      btn.disabled = false;
    });

    return false;
  };

  /* ── session handling ── */
  function adoptSession(session, user) {
    var u = user || (session && session.user);
    if (!u) { currentUser = null; paintUser(); return Promise.resolve(); }
    currentUser = {
      id: u.id,
      email: u.email,
      name: (u.user_metadata && u.user_metadata.display_name) || (u.email || '').split('@')[0]
    };
    paintUser();
    // hand off to sync.js
    if (window.FM.onSignIn) return window.FM.onSignIn(currentUser);
    return Promise.resolve();
  }

  window.signOut = function () {
    var c = client();
    var done = function () {
      currentUser = null;
      paintUser();
      closeUserMenu();
      if (window.FM.onSignOut) window.FM.onSignOut();
      if (typeof showNotif === 'function') showNotif('↩ Signed out', 'Your local progress stays on this device.');
    };
    if (c) c.auth.signOut().then(done).catch(done); else done();
  };

  /* ── dropdown ── */
  window.toggleUserMenu = function (ev) {
    if (ev) ev.stopPropagation();
    var m = document.getElementById('user-menu');
    if (m) m.classList.toggle('open');
  };
  window.closeUserMenu = function () {
    var m = document.getElementById('user-menu');
    if (m) m.classList.remove('open');
  };
  document.addEventListener('click', function (e) {
    var w = document.getElementById('nav-user-wrap');
    if (w && !w.contains(e.target)) closeUserMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeUserMenu();
    var m = document.getElementById('auth-modal');
    if (m && m.classList.contains('open')) closeAuth();
  });

  /* XP pill is app furniture, not landing-page furniture */
  function syncNavContext(id) {
    var pill = document.getElementById('xp-pill');
    if (pill) pill.style.display = (id === 'home') ? 'none' : 'inline-flex';
  }

  function init() {
    paintUser();

    var base = window.switchSection;
    if (typeof base === 'function') {
      window.switchSection = function (id) { base(id); syncNavContext(id); };
    }
    var active = document.querySelector('.section.active');
    syncNavContext(active ? active.id.replace('section-', '') : 'home');

    var c = client();
    if (!c) { paintUser(); return; }

    c.auth.getSession().then(function (res) {
      if (res.data && res.data.session) return adoptSession(res.data.session);
      paintUser();
    });

    c.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_OUT') { currentUser = null; paintUser(); return; }
      if (session) adoptSession(session);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
