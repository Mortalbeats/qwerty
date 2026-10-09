/* ─────────────── RELAX BAR · BRAIN GAMES ───────────────
   Replaces the old music player. Two goals from the brief:
     1. Short cognitive-training games (Sudoku + Memory Match)
     2. A hard 5-minute daily budget so the break can't become a distraction
   Access rule: usable BEFORE a focus session starts, or AFTER one finishes —
   never while the dashboard is actively tracking. */
(function(){
  'use strict';

  var BUDGET_MS = 5*60*1000;          // 5 minutes per day
  var tickTimer=null, activeGame=null, budgetUsed=0, budgetDay='';
  var lastTickAt=0;

  /* ── daily budget persistence ── */
  function today(){ return new Date().toISOString().slice(0,10); }
  function loadBudget(){
    try{
      var raw=JSON.parse(localStorage.getItem('ff_rb_budget')||'{}');
      if(raw.day===today()){ budgetUsed=raw.used||0; budgetDay=raw.day; }
      else { budgetUsed=0; budgetDay=today(); saveBudget(); }
    }catch(e){ budgetUsed=0; budgetDay=today(); }
  }
  function saveBudget(){
    try{ localStorage.setItem('ff_rb_budget',JSON.stringify({day:today(),used:budgetUsed})); }catch(e){}
  }
  function remaining(){ return Math.max(0, BUDGET_MS-budgetUsed); }

  function fmtClock(ms){
    var t=Math.max(0,Math.ceil(ms/1000));
    return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
  }

  function paintBudget(){
    var clock=document.getElementById('rb-clock');
    var fill=document.getElementById('rb-fill');
    if(!clock||!fill) return;
    var rem=remaining(), pct=(rem/BUDGET_MS)*100;
    clock.textContent=fmtClock(rem);
    fill.style.width=pct+'%';
    fill.classList.toggle('low', pct<=25);
    clock.style.color = rem<=0 ? 'var(--danger)' : (pct<=25?'var(--gold)':'var(--secondary)');
  }

  /* ── access gate ──
     window.tracking isn't exported, so we read the dashboard's own UI state:
     the Start button is disabled and reads "Tracking..." during a session. */
  function sessionActive(){
    var btn=document.getElementById('start-btn');
    if(!btn) return false;
    return btn.disabled && /tracking/i.test(btn.textContent||'');
  }
  function sessionsDone(){
    try{ return (JSON.parse(localStorage.getItem('ff_state')||'{}').totalSessions)||0; }
    catch(e){ return 0; }
  }

  function gateState(){
    if(sessionActive()) return {ok:false, why:'during'};
    if(remaining()<=0)  return {ok:false, why:'spent'};
    return {ok:true, why: sessionsDone()>0 ? 'after' : 'before'};
  }

  function paintGate(){
    var g=gateState();
    var box=document.getElementById('rb-gate');
    var ic=document.getElementById('rb-gate-ic');
    var tt=document.getElementById('rb-gate-title');
    var ds=document.getElementById('rb-gate-desc');
    if(!box) return;
    box.classList.toggle('ok', g.ok);
    if(g.why==='during'){
      ic.textContent='🔒';
      tt.textContent='Locked while a focus session is running';
      ds.innerHTML='Finish or reset your session on the <strong>Dashboard</strong>, then come back for a break.';
    }else if(g.why==='spent'){
      ic.textContent='⏳';
      tt.textContent="Today's 5 minutes are used up";
      ds.textContent='The Relax Bar is a short break, not a study substitute. Your allowance refreshes tomorrow.';
    }else if(g.why==='after'){
      ic.textContent='✅';
      tt.textContent='Break unlocked — well earned';
      ds.textContent='You have finished a focus session. Enjoy up to 5 minutes of brain training.';
    }else{
      ic.textContent='✅';
      tt.textContent='Break unlocked — warm up before you study';
      ds.textContent='Play now to prime your focus, or come back after a session. 5 minutes per day.';
    }
    document.querySelectorAll('.game-card').forEach(function(c){
      c.classList.toggle('locked', !g.ok);
    });
    if(!g.ok && activeGame) stopGame(g.why);
    paintBudget();
  }

  /* ── the 5-minute countdown (only runs while a game is open) ── */
  function startTick(){
    if(tickTimer) return;
    lastTickAt=Date.now();
    tickTimer=setInterval(function(){
      var now=Date.now();
      budgetUsed += now-lastTickAt;
      lastTickAt=now;
      if(budgetUsed>BUDGET_MS) budgetUsed=BUDGET_MS;
      saveBudget();
      paintBudget();
      if(remaining()<=0){
        stopGame('spent');
        paintGate();
        if(typeof showNotif==='function')
          showNotif('⏳ Break over','Your 5 minutes are up — back to focus!');
      }
    },1000);
  }
  function stopTick(){
    if(tickTimer){
      budgetUsed += Date.now()-lastTickAt;
      if(budgetUsed>BUDGET_MS) budgetUsed=BUDGET_MS;
      saveBudget();
      clearInterval(tickTimer); tickTimer=null;
    }
    paintBudget();
  }

  function stopGame(reason){
    activeGame=null;
    stopTick();
    document.querySelectorAll('.game-card').forEach(function(c){c.classList.remove('active')});
    var body=document.getElementById('gs-body'), empty=document.getElementById('gs-empty');
    if(body){ body.style.display='none'; body.innerHTML=''; }
    if(empty){
      empty.style.display='block';
      if(reason==='spent'){
        empty.innerHTML='<div class="big">⏳</div><div class="t">Break time finished</div>'
          +'<div class="s">You have used today&rsquo;s 5 minutes. Head back to the Dashboard — your allowance resets tomorrow.</div>';
      }else if(reason==='during'){
        empty.innerHTML='<div class="big">🔒</div><div class="t">Session in progress</div>'
          +'<div class="s">The Relax Bar is available before you start a session or after you finish one.</div>';
      }else{
        empty.innerHTML='<div class="big">🧠</div><div class="t">Pick a game to begin</div>'
          +'<div class="s">Your 5-minute break timer starts when the first game opens and pauses the moment you leave.</div>';
      }
    }
  }

  window.rbResetBudget=function(){
    budgetUsed=0; saveBudget(); paintBudget(); paintGate();
    if(typeof showNotif==='function') showNotif('↺ Break timer reset','5 minutes available again');
  };

  function openGame(id){
    var g=gateState();
    if(!g.ok){ paintGate(); return; }
    activeGame=id;
    document.querySelectorAll('.game-card').forEach(function(c){
      c.classList.toggle('active', c.dataset.game===id);
    });
    document.getElementById('gs-empty').style.display='none';
    var body=document.getElementById('gs-body');
    body.style.display='block';
    if(id==='sudoku') renderSudoku(body); else renderMemory(body);
    startTick();
  }

  /* ═════════ SUDOKU ═════════ */
  var sud={puzzle:null,solution:null,given:null,sel:-1,mistakes:0,solvedCells:0};

  function makeSolvedGrid(){
    var g=new Array(81).fill(0);
    function ok(i,v){
      var r=Math.floor(i/9), c=i%9, br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
      for(var k=0;k<9;k++){
        if(g[r*9+k]===v) return false;
        if(g[k*9+c]===v) return false;
        if(g[(br+Math.floor(k/3))*9+(bc+k%3)]===v) return false;
      }
      return true;
    }
    function fill(i){
      if(i===81) return true;
      var nums=[1,2,3,4,5,6,7,8,9];
      for(var j=nums.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1));var t=nums[j];nums[j]=nums[k];nums[k]=t;}
      for(var n=0;n<9;n++){
        if(ok(i,nums[n])){ g[i]=nums[n]; if(fill(i+1)) return true; g[i]=0; }
      }
      return false;
    }
    fill(0);
    return g;
  }

  function makePuzzle(holes){
    var sol=makeSolvedGrid();
    var pz=sol.slice();
    var idx=[]; for(var i=0;i<81;i++) idx.push(i);
    for(var j=idx.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1));var t=idx[j];idx[j]=idx[k];idx[k]=t;}
    for(var h=0;h<holes;h++) pz[idx[h]]=0;
    return {puzzle:pz, solution:sol};
  }

  function renderSudoku(root){
    var made=makePuzzle(40);
    sud.puzzle=made.puzzle.slice();
    sud.solution=made.solution;
    sud.given=made.puzzle.map(function(v){return v!==0});
    sud.sel=-1; sud.mistakes=0;
    sud.solvedCells=sud.puzzle.filter(function(v){return v!==0}).length;

    root.innerHTML =
      '<div class="gs-head">'
      + '<div class="gs-title">🔢 Mini Sudoku</div>'
      + '<span class="gs-stat" id="sud-filled">0 / 40 filled</span>'
      + '<span class="gs-stat" id="sud-mistakes">Mistakes: 0</span>'
      + '<button class="btn btn-secondary btn-sm" onclick="rbNewSudoku()">↺ New puzzle</button>'
      + '</div>'
      + '<div class="sud-wrap"><div class="sud-grid" id="sud-grid"></div>'
      + '<div class="sud-pad" id="sud-pad"></div></div>';

    var grid=document.getElementById('sud-grid');
    for(var i=0;i<81;i++){
      var c=document.createElement('div');
      var r=Math.floor(i/9), col=i%9;
      c.className='sud-cell'+(sud.given[i]?' fixed':'')
        +((col===2||col===5)?' br':'')+((r===2||r===5)?' bb':'');
      c.dataset.i=i;
      c.textContent=sud.puzzle[i]||'';
      c.addEventListener('click',function(){ selectCell(+this.dataset.i); });
      grid.appendChild(c);
    }
    var pad=document.getElementById('sud-pad');
    [1,2,3,4,5,6,7,8,9].forEach(function(n){
      var k=document.createElement('div');
      k.className='sud-key'; k.textContent=n;
      k.addEventListener('click',function(){ enterDigit(n); });
      pad.appendChild(k);
    });
    var e=document.createElement('div');
    e.className='sud-key erase'; e.textContent='⌫';
    e.addEventListener('click',function(){ enterDigit(0); });
    pad.appendChild(e);
    updateSudStats();
  }

  window.rbNewSudoku=function(){
    var body=document.getElementById('gs-body');
    if(body && activeGame==='sudoku') renderSudoku(body);
  };

  function selectCell(i){
    if(sud.given[i]) { sud.sel=-1; }
    else sud.sel=i;
    paintSud();
  }

  function paintSud(){
    var cells=document.querySelectorAll('#sud-grid .sud-cell');
    if(!cells.length) return;
    var selVal = sud.sel>=0 ? sud.puzzle[sud.sel] : 0;
    var sr = sud.sel>=0 ? Math.floor(sud.sel/9) : -1;
    var sc = sud.sel>=0 ? sud.sel%9 : -1;
    cells.forEach(function(c,i){
      c.classList.remove('sel','peer','same');
      var r=Math.floor(i/9), col=i%9;
      if(sud.sel>=0){
        if(i===sud.sel) c.classList.add('sel');
        else if(r===sr||col===sc||
          (Math.floor(r/3)===Math.floor(sr/3)&&Math.floor(col/3)===Math.floor(sc/3))) c.classList.add('peer');
        if(selVal && sud.puzzle[i]===selVal && i!==sud.sel) c.classList.add('same');
      }
      c.textContent=sud.puzzle[i]||'';
    });
  }

  function updateSudStats(){
    var blanks=sud.given.filter(function(g){return !g}).length;
    var done=0;
    for(var i=0;i<81;i++) if(!sud.given[i] && sud.puzzle[i]!==0) done++;
    var f=document.getElementById('sud-filled');
    var m=document.getElementById('sud-mistakes');
    if(f) f.textContent=done+' / '+blanks+' filled';
    if(m) m.textContent='Mistakes: '+sud.mistakes;
  }

  function enterDigit(n){
    if(sud.sel<0 || sud.given[sud.sel]) return;
    var cell=document.querySelector('#sud-grid .sud-cell[data-i="'+sud.sel+'"]');
    if(n===0){
      sud.puzzle[sud.sel]=0;
      if(cell) cell.classList.remove('bad');
    }else{
      sud.puzzle[sud.sel]=n;
      var right = (n===sud.solution[sud.sel]);
      if(cell) cell.classList.toggle('bad', !right);
      if(!right){ sud.mistakes++; }
    }
    paintSud(); updateSudStats();
    // solved?
    var complete=true;
    for(var i=0;i<81;i++) if(sud.puzzle[i]!==sud.solution[i]){ complete=false; break; }
    if(complete){
      if(typeof addXp==='function') addXp(30);
      if(typeof showNotif==='function') showNotif('🔢 Sudoku solved!','Nice logic work — +30 XP');
      var head=document.querySelector('#gs-body .gs-title');
      if(head) head.innerHTML='🎉 Sudoku solved!';
    }
  }

  // keyboard support for sudoku
  document.addEventListener('keydown',function(e){
    if(activeGame!=='sudoku') return;
    var sec=document.getElementById('section-music');
    if(!sec||getComputedStyle(sec).display==='none') return;
    if(e.key>='1'&&e.key<='9'){ enterDigit(+e.key); e.preventDefault(); }
    else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){ enterDigit(0); e.preventDefault(); }
    else if(sud.sel>=0 && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key)!==-1){
      var r=Math.floor(sud.sel/9), c=sud.sel%9;
      if(e.key==='ArrowUp') r=(r+8)%9;
      if(e.key==='ArrowDown') r=(r+1)%9;
      if(e.key==='ArrowLeft') c=(c+8)%9;
      if(e.key==='ArrowRight') c=(c+1)%9;
      sud.sel=r*9+c; paintSud(); e.preventDefault();
    }
  });

  /* ═════════ MEMORY MATCH ═════════ */
  var mem={first:-1,second:-1,lock:false,moves:0,pairs:0,cards:[]};

  function renderMemory(root){
    var SYMBOLS=['🧠','⚡','🎯','🌱','🔥','💡','🌊','⭐'];
    var deck=SYMBOLS.concat(SYMBOLS);
    for(var j=deck.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1));var t=deck[j];deck[j]=deck[k];deck[k]=t;}
    mem={first:-1,second:-1,lock:false,moves:0,pairs:0,cards:deck};

    root.innerHTML =
      '<div class="gs-head">'
      + '<div class="gs-title">🧩 Memory Match</div>'
      + '<span class="gs-stat" id="mem-moves">Moves: 0</span>'
      + '<span class="gs-stat" id="mem-pairs">Pairs: 0 / 8</span>'
      + '<button class="btn btn-secondary btn-sm" onclick="rbNewMemory()">↺ Shuffle</button>'
      + '</div><div class="mem-grid" id="mem-grid"></div>';

    var grid=document.getElementById('mem-grid');
    deck.forEach(function(sym,i){
      var card=document.createElement('div');
      card.className='mem-card'; card.dataset.i=i;
      card.innerHTML='<div class="mem-face mem-back">?</div>'
                   + '<div class="mem-face mem-front">'+sym+'</div>';
      card.addEventListener('click',function(){ flipCard(+this.dataset.i); });
      grid.appendChild(card);
    });
  }

  window.rbNewMemory=function(){
    var body=document.getElementById('gs-body');
    if(body && activeGame==='memory') renderMemory(body);
  };

  function flipCard(i){
    if(mem.lock) return;
    var el=document.querySelector('#mem-grid .mem-card[data-i="'+i+'"]');
    if(!el || el.classList.contains('matched') || el.classList.contains('flipped')) return;
    el.classList.add('flipped');
    if(mem.first<0){ mem.first=i; return; }
    if(i===mem.first) return;
    mem.second=i;
    mem.moves++;
    var mv=document.getElementById('mem-moves');
    if(mv) mv.textContent='Moves: '+mem.moves;
    mem.lock=true;

    var a=mem.first, b=mem.second;
    if(mem.cards[a]===mem.cards[b]){
      setTimeout(function(){
        [a,b].forEach(function(x){
          var c=document.querySelector('#mem-grid .mem-card[data-i="'+x+'"]');
          if(c){ c.classList.add('matched'); c.classList.remove('flipped'); }
        });
        mem.pairs++;
        var pp=document.getElementById('mem-pairs');
        if(pp) pp.textContent='Pairs: '+mem.pairs+' / 8';
        mem.first=-1; mem.second=-1; mem.lock=false;
        if(mem.pairs===8){
          if(typeof addXp==='function') addXp(25);
          if(typeof showNotif==='function')
            showNotif('🧩 All pairs matched!','Sharp recall — +25 XP in '+mem.moves+' moves');
          var head=document.querySelector('#gs-body .gs-title');
          if(head) head.innerHTML='🎉 Cleared in '+mem.moves+' moves!';
        }
      },380);
    }else{
      setTimeout(function(){
        [a,b].forEach(function(x){
          var c=document.querySelector('#mem-grid .mem-card[data-i="'+x+'"]');
          if(c) c.classList.remove('flipped');
        });
        mem.first=-1; mem.second=-1; mem.lock=false;
      },780);
    }
  }

  /* ── wiring ── */
  function init(){
    if(!document.getElementById('rb-gate')) return;
    loadBudget();
    paintBudget();
    paintGate();

    document.querySelectorAll('.game-card').forEach(function(c){
      c.addEventListener('click',function(){
        if(c.classList.contains('locked')) { paintGate(); return; }
        openGame(c.dataset.game);
      });
    });

    // pause the countdown whenever the user leaves the Relax Bar
    var base=window.switchSection;
    if(typeof base==='function'){
      window.switchSection=function(id){
        if(id!=='music' && activeGame) stopGame();
        base(id);
        if(id==='music'){ loadBudget(); paintGate(); }
      };
    }
    // also pause if the tab is hidden
    document.addEventListener('visibilitychange',function(){
      if(document.hidden && tickTimer) stopTick();
      else if(!document.hidden && activeGame) startTick();
    });
    // keep the gate honest while a session starts/stops elsewhere
    setInterval(function(){
      var sec=document.getElementById('section-music');
      if(sec && getComputedStyle(sec).display!=='none') paintGate();
    },2000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
