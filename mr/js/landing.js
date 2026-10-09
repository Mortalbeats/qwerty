/* ── Landing-page helpers (additive; nothing above is modified) ── */
(function(){
  'use strict';

  // Smooth-scroll to a landing anchor, switching to Home first if needed.
  window.scrollHome = function(anchor){
    if(typeof window.switchSection === 'function') window.switchSection('home');
    var el = document.getElementById('home-' + anchor);
    if(!el) return;
    requestAnimationFrame(function(){
      el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  };

  // Build the equalizer bars in the phone mockup.
  var eq = document.getElementById('ph-eq');
  if(eq){
    for(var i=0;i<11;i++){
      var b = document.createElement('i');
      b.style.animationDelay = (i*0.11).toFixed(2)+'s';
      b.style.animationDuration = (1.2 + (i%4)*0.22).toFixed(2)+'s';
      eq.appendChild(b);
    }
  }

  // Ctrl+0 jumps home, matching the existing Ctrl+1..6 shortcuts.
  document.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.key === '0'){ e.preventDefault(); window.switchSection('home'); }
  });

  // Any tab switch should start at the top of the new view.
  var base = window.switchSection;
  if(typeof base === 'function'){
    window.switchSection = function(id){
      base(id);
      window.scrollTo({top:0, behavior:'smooth'});
    };
  }

  /* ── Hover-reveal tab bar ──
     CSS :hover does the work; this only briefly flashes the bar open when the
     section changes from elsewhere (nav buttons, Ctrl+1..6), so you can see
     which tab became active. */
  var dock = document.getElementById('tabsDock');
  if(dock){
    var pinTimer;
    function flashTabs(ms){
      dock.classList.add('pinned');
      clearTimeout(pinTimer);
      pinTimer = setTimeout(function(){ dock.classList.remove('pinned'); }, ms || 1400);
    }
    // don't collapse while the pointer is still inside the dock
    dock.addEventListener('mouseenter', function(){ clearTimeout(pinTimer); dock.classList.remove('pinned'); });

    // A mouse click leaves the button focused, which would hold the bar open.
    // Blur it so the bar collapses normally once the pointer leaves.
    dock.addEventListener('mouseup', function(e){
      var t = e.target.closest('.tab');
      if(t) setTimeout(function(){ t.blur(); }, 0);
    });

    // Keyboard fallback for browsers without :has() — reveal while tabbing through.
    dock.addEventListener('focusin', function(e){
      if(e.target.matches && e.target.matches('.tab:focus-visible')) dock.classList.add('kbd');
    });
    dock.addEventListener('focusout', function(){
      setTimeout(function(){
        if(!dock.contains(document.activeElement)) dock.classList.remove('kbd');
      }, 0);
    });

    var prev = window.switchSection;
    window.switchSection = function(id){
      prev(id);
      if(!dock.matches(':hover')) flashTabs(1400);
    };
  }
})();
