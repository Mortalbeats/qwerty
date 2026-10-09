(()=>{
  'use strict';

  // ─── INTERACTIVE MOTION BG (Canvas Particle System) ───
  const canvas=document.getElementById('bgCanvas'),c=canvas.getContext('2d');
  let W,H;
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight}
  window.addEventListener('resize',resize);resize();

  const PARTICLES=[];const PC=80;
  for(let i=0;i<PC;i++)PARTICLES.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*0.6,vy:(Math.random()-0.5)*0.6,r:Math.random()*2+1.5,alpha:Math.random()*0.4+0.1,hue:Math.random()*60+240});

  const CONN_DIST=150,MAX_CON=3;
  const ORBS=[
    {x:W*0.2,y:H*0.3,r:Math.min(W,H)*0.12,dx:0.3,dy:0.2,vx:0,vy:0},
    {x:W*0.8,y:H*0.6,r:Math.min(W,H)*0.1,dx:0.4,dy:0.3,vx:0,vy:0},
    {x:W*0.5,y:H*0.8,r:Math.min(W,H)*0.08,dx:0.2,dy:0.4,vx:0,vy:0}
  ];

  let mouse={x:W/2,y:H/2,in:false};
  document.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.in=true});
  document.addEventListener('mouseleave',()=>{mouse.in=false});

  function drawBG(){
    c.clearRect(0,0,W,H);const t=Date.now()*0.0003;

    ORBS.forEach((o,i)=>{
      const tx=W*(i===0?0.2:i===1?0.8:0.5)+Math.sin(t+o.dx)*W*0.05;
      const ty=H*(i===0?0.3:i===1?0.6:0.8)+Math.cos(t+o.dy)*H*0.05;
      o.vx+=(tx-o.x)*0.005;o.vy+=(ty-o.y)*0.005;o.vx*=0.97;o.vy*=0.97;o.x+=o.vx;o.y+=o.vy;
      if(mouse.in){const dx=o.x-mouse.x,dy=o.y-mouse.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<200){const f=(200-dist)/200*0.5;o.vx+=dx/dist*f;o.vy+=dy/dist*f}}
      const grd=c.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
      const clrs=['rgba(108,92,231,','rgba(0,206,201,','rgba(253,121,168,'];
      grd.addColorStop(0,clrs[i]+'0.08)');grd.addColorStop(0.5,clrs[i]+'0.04)');grd.addColorStop(1,clrs[i]+'0)');
      c.fillStyle=grd;c.beginPath();c.arc(o.x,o.y,o.r,0,Math.PI*2);c.fill();
      c.beginPath();c.arc(o.x,o.y,o.r*0.5,0,Math.PI*2);c.strokeStyle=clrs[i]+'0.06';c.lineWidth=1;c.stroke();
    });

    PARTICLES.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
      if(mouse.in){const dx=mouse.x-p.x,dy=mouse.y-p.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<250&&dist>10){const f=(250-dist)/250*0.3;p.vx+=dx/dist*f*0.02;p.vy+=dy/dist*f*0.02}}
      const sp=Math.sqrt(p.vx*p.vx+p.vy*p.vy);if(sp>1.2){p.vx=(p.vx/sp)*1.2;p.vy=(p.vy/sp)*1.2}
      c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.fillStyle=`hsla(${p.hue+Math.sin(t+p.x*0.01)*20},70%,70%,${p.alpha})`;c.fill();
    });

    for(let i=0;i<PARTICLES.length;i++){let cn=0;
      for(let j=i+1;j<PARTICLES.length;j++){if(cn>=MAX_CON)break;
        const dx=PARTICLES[i].x-PARTICLES[j].x,dy=PARTICLES[i].y-PARTICLES[j].y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<CONN_DIST){const a=(1-dist/CONN_DIST)*0.15;c.beginPath();c.moveTo(PARTICLES[i].x,PARTICLES[i].y);c.lineTo(PARTICLES[j].x,PARTICLES[j].y);c.strokeStyle=`rgba(108,92,231,${a})`;c.lineWidth=0.5;c.stroke();cn++}
      }
    }
    requestAnimationFrame(drawBG);
  }
  drawBG();

  // ─── SECTION / THEME ───
  window.toggleTheme=()=>{document.body.classList.toggle('light');localStorage.setItem('ff_theme',document.body.classList.contains('light')?'light':'dark')};
  if(localStorage.getItem('ff_theme')==='light')document.body.classList.add('light');

  window.switchSection=function(id){
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    const sec=document.getElementById('section-'+id);if(sec)sec.classList.add('active');
    const tab=document.querySelector('.tab[data-tab="'+id+'"]');if(tab)tab.classList.add('active');
  };

  window.openTechnique=function(type){
    window.switchSection('techniques');
    // Hide all technique views, show the selected one
    document.querySelectorAll('.technique-view').forEach(function(v){v.style.display='none'});
    var view=document.getElementById('view-'+type);
    if(view){
      view.style.display='block';
      document.getElementById('technique-views').style.display='block';
      // Hide the technique index cards
      document.querySelector('.tech-grid').style.display='none';
      document.querySelector('.section-header').style.display='none';
      setTimeout(function(){view.scrollIntoView({behavior:'smooth',block:'start'})},100);
    }
  };

  window.closeTechnique=function(){
    document.getElementById('technique-views').style.display='none';
    document.querySelectorAll('.technique-view').forEach(function(v){v.style.display='none'});
    document.querySelector('.tech-grid').style.display='grid';
    document.querySelector('.section-header').style.display='block';
  };

  // ─── CORE TRACKING ───
  const video=document.getElementById('video'),ov=document.getElementById('overlay'),ctx=ov.getContext('2d');
  const statusEl=document.getElementById('cam-status'),startBtn=document.getElementById('start-btn');
  const scoreHistory=[],timeLabels=[];
  const chart=new Chart(document.getElementById('focusChart').getContext('2d'),{type:'line',data:{labels:timeLabels,datasets:[{data:scoreHistory,borderColor:'#6C5CE7',backgroundColor:'rgba(108,92,231,0.06)',fill:true,tension:0.4,pointRadius:0,borderWidth:1.5}]},options:{responsive:true,animation:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{grid:{display:false},ticks:{color:'rgba(255,255,255,0.15)',font:{size:8}}},y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'rgba(255,255,255,0.15)',font:{size:8},stepSize:25}}}}});
  function scoreColor(s){return s>=70?'#00CEC9':s>=45?'#FDCB6E':'#E24B4A'}

  let model=null,tracking=false,lastSend=0,blinkTimes=[],totalBlinks=0,earPrev=0.5;
  let baselineFaceHeight=null,postureCalibrated=false,calibrationFrames=0,faceHeightSamples=[];

  /* ─── BLINK DETECTION (FaceMesh Eye-Aspect-Ratio) ───────────────────────
     blazeface only exposes 6 coarse points (eye CENTRES, nose, mouth, ears) —
     it has no eyelid geometry, so the old check compared eye-centre to nose,
     a fixed anatomical constant that could never cross the blink threshold.
     FaceMesh gives us the real upper/lower lids, so we can compute a proper
     EAR = vertical lid gap / horizontal eye width, which collapses toward 0
     when the eye shuts. Threshold is auto-calibrated per user, because EAR
     varies a lot with face shape, glasses and camera angle.                */
  const MESH = {                       // FaceMesh landmark indices
    RIGHT:{lidTop:[159,158],lidBot:[145,153],cornerL:33 ,cornerR:133},
    LEFT :{lidTop:[386,385],lidBot:[374,380],cornerL:362,cornerR:263}
  };
  let faceMesh=null;                   // FaceMesh detector (loaded lazily)
  let meshBackend='';                  // 'webgl' (fast) or 'cpu' (slow fallback)
  let earSamples=[], earOpenBaseline=null, earThreshold=0.21;
  let eyesClosed=false, closedStart=0, lastBlinkAt=0, lastEarAt=0;
  const CALIB_SAMPLES=25;              // ~2-3s of frames before we trust a threshold
  const MAX_BLINK_MS=800;              // longer closure = resting, not a blink
  const MIN_GAP_MS=120;                // debounce: ignore double-triggers
  /* Fixed blink sensitivity — no longer user-adjustable.
     0.80 = a blink is registered once the eye aperture falls to 80% of your
     own calibrated open-eye baseline. Measured against the real FaceMesh
     model on real faces, a closed eye reads ~0.56x the open value, so this
     sits comfortably between "blinking" and "squinting". */
  const BLINK_SENSITIVITY=0.80;

  function eyeEAR(pts,e){
    // vertical lid separation (two pairs, averaged) over horizontal eye width
    const v1=Math.hypot(pts[e.lidTop[0]].x-pts[e.lidBot[0]].x, pts[e.lidTop[0]].y-pts[e.lidBot[0]].y);
    const v2=Math.hypot(pts[e.lidTop[1]].x-pts[e.lidBot[1]].x, pts[e.lidTop[1]].y-pts[e.lidBot[1]].y);
    const h =Math.hypot(pts[e.cornerL].x-pts[e.cornerR].x,     pts[e.cornerL].y-pts[e.cornerR].y);
    return h>1e-6 ? (v1+v2)/(2*h) : 0.3;
  }

  function resetBlinkState(){
    earSamples=[];earOpenBaseline=null;earThreshold=0.21;
    eyesClosed=false;closedStart=0;lastBlinkAt=0;lastEarAt=0;earPrev=0.5;
  }

  /* Returns the current EAR, and pushes a blink onto blinkTimes on each
     eye-open -> eye-closed -> eye-open cycle.

     TIME-BASED, not frame-based. A webcam blink loop realistically runs at
     8-20fps, and a blink's closed phase lasts only ~100-150ms — so counting
     *frames* to judge blink length is unreliable (a whole blink can occupy a
     single frame). We measure elapsed milliseconds instead, which behaves
     the same at 8fps or 60fps.

     We also latch on the DOWNWARD crossing: the moment EAR drops below the
     threshold a blink is provisionally recorded, rather than waiting for the
     re-open frame that may never be sampled. A long closure is retracted
     later, so resting your eyes still doesn't inflate the count. */
  function updateBlink(pts){
    const ear=(eyeEAR(pts,MESH.RIGHT)+eyeEAR(pts,MESH.LEFT))/2;
    const now=Date.now();
    const prevEarAt=lastEarAt;   // capture BEFORE overwriting
    lastEarAt=now;

    // Calibrate the "eyes open" baseline, then set the blink threshold at
    // 80% of it. Measured on real photos: a closed eye reads ~0.56x the
    // open value, so 0.80x separates them with a comfortable margin while
    // still sitting well above a squint.
    if(earOpenBaseline===null){
      if(ear>0.08) earSamples.push(ear);
      if(earSamples.length>=CALIB_SAMPLES){
        const sorted=earSamples.slice().sort((a,b)=>a-b);
        // median of the upper half = robust "wide open" estimate
        const upper=sorted.slice(Math.floor(sorted.length/2));
        earOpenBaseline=upper[Math.floor(upper.length/2)];
        earThreshold=Math.max(0.10,Math.min(0.34,earOpenBaseline*BLINK_SENSITIVITY));
      }
      earPrev=ear;
      return ear;
    }

    // Track the open-eye baseline slowly so it adapts to lighting/distance.
    if(ear>earThreshold){
      earOpenBaseline=earOpenBaseline*0.98+ear*0.02;
      earThreshold=Math.max(0.10,Math.min(0.34,earOpenBaseline*BLINK_SENSITIVITY));
    }

    /* Slow-frame-rate safety net: if the loop is running slowly the eye can
       close AND reopen entirely between two samples, so the EAR never appears
       below the threshold — only a partial dip is ever seen.

       The dip window must scale with the ACTUAL sample interval. A fixed
       "gap < 600ms" silently disabled this net on slow machines, which is
       exactly where it is needed most: at 1.7fps every gap is ~600ms, so the
       condition was never true and no blink was ever recovered. */
    const gap=now-(prevEarAt||now);
    if(!eyesClosed && earPrev>=earThreshold && ear>=earThreshold && gap>0){
      const dip=(earOpenBaseline-Math.min(ear,earPrev))/earOpenBaseline;
      // allow up to ~2.5 sample intervals, min 400ms, max 2.5s
      const window=Math.max(400,Math.min(2500,gap*2.5));
      if(dip>0.30 && gap<=window && now-lastBlinkAt>MIN_GAP_MS){
        blinkTimes.push(now);totalBlinks++;lastBlinkAt=now;
      }
    }

    if(!eyesClosed && ear<earThreshold){
      // downward crossing — count it immediately
      eyesClosed=true;closedStart=now;
      if(now-lastBlinkAt>MIN_GAP_MS){
        blinkTimes.push(now);totalBlinks++;lastBlinkAt=now;
      }
    }else if(eyesClosed){
      if(ear>=earThreshold){
        eyesClosed=false;closedStart=0;
      }else if(now-closedStart>Math.max(MAX_BLINK_MS,gap*3)){
        /* Sustained closure = resting eyes, not a blink. Retract the blink
           we optimistically counted on the way down.

           The limit also scales with the sample interval: at 1.7fps a single
           frame is ~600ms, so a perfectly normal blink could be mistaken for
           a long closure and wrongly retracted. Requiring at least 3 sample
           intervals means we only retract on a genuinely sustained closure. */
        if(blinkTimes.length && blinkTimes[blinkTimes.length-1]===lastBlinkAt){
          blinkTimes.pop();totalBlinks=Math.max(0,totalBlinks-1);
        }
        closedStart=now+3600000;   // don't retract twice for one closure
      }
    }
    earPrev=ear;
    return ear;
  }
  let trackScore=0,trackPosture=0,trackSession=0,trackStartTime=null,highestScore=0,heatmapData=[];

  // ─── GAMIFICATION SYSTEM ───
  const BADGES=[
    {id:'first_session',name:'First Steps',icon:'🌱',desc:'Complete your first session',rarity:'common',xp:50,check:s=>s.totalSessions>=1},
    {id:'pom_master',name:'Pom-Master',icon:'🍅',desc:'Complete 10 Pomodoros',rarity:'rare',xp:100,check:s=>s.pomSessions>=10},
    {id:'tb_organizer',name:'Block Builder',icon:'📋',desc:'Complete 5 time blocks',rarity:'rare',xp:80,check:s=>s.tbBlocks>=5},
    {id:'zen_beginner',name:'Zen Mind',icon:'🧘',desc:'Complete 3 mindfulness sessions',rarity:'common',xp:60,check:s=>s.mindSessions>=3},
    {id:'brain_dump',name:'Mind Sweeper',icon:'📝',desc:'Dump 20 thoughts',rarity:'common',xp:40,check:s=>s.dumpCount>=20},
    {id:'streak_3',name:'Streak Starter',icon:'🔥',desc:'3-day focus streak',rarity:'rare',xp:120,check:s=>s.streak>=3},
    {id:'streak_7',name:'Week Warrior',icon:'💪',desc:'7-day streak',rarity:'epic',xp:250,check:s=>s.streak>=7},
    {id:'streak_30',name:'Monthly Legend',icon:'👑',desc:'30-day streak',rarity:'legendary',xp:500,check:s=>s.streak>=30},
    {id:'score_80',name:'Focus Elite',icon:'🎯',desc:'Reach score 80+',rarity:'epic',xp:200,check:s=>s.bestScore>=80},
    {id:'score_95',name:'Brain God',icon:'🧠',desc:'Reach score 95+',rarity:'legendary',xp:500,check:s=>s.bestScore>=95},
    {id:'hour_5',name:'Dedicated',icon:'⏱',desc:'5 hours focus',rarity:'rare',xp:150,check:s=>s.totalMinutes>=300},
    {id:'hour_20',name:'Iron Will',icon:'⚡',desc:'20 hours focus',rarity:'epic',xp:300,check:s=>s.totalMinutes>=1200},
    {id:'hour_100',name:'Focus Legend',icon:'🌟',desc:'100 hours focus',rarity:'legendary',xp:1000,check:s=>s.totalMinutes>=6000},
    {id:'level_5',name:'Rising Star',icon:'⭐',desc:'Reach level 5',rarity:'rare',xp:100,check:s=>s.level>=5},
    {id:'level_10',name:'Focus Pro',icon:'🏅',desc:'Reach level 10',rarity:'epic',xp:300,check:s=>s.level>=10},
    {id:'level_20',name:'Grandmaster',icon:'👁',desc:'Reach level 20',rarity:'legendary',xp:800,check:s=>s.level>=20},
    {id:'all_methods',name:'Well Rounded',icon:'🌈',desc:'Use all 4 techniques',rarity:'epic',xp:250,check:s=>s.methodsUsed>=4},
    {id:'social',name:'Buddy Up',icon:'🤝',desc:'Appear on leaderboard',rarity:'rare',xp:80,check:s=>s.leaderboardAppearances>=1},
    {id:'veteran',name:'Veteran',icon:'🎖',desc:'100 total sessions',rarity:'legendary',xp:1000,check:s=>s.totalSessions>=100},
    {id:'perfect_day',name:'Perfect Day',icon:'✨',desc:'All 4 methods in one day',rarity:'epic',xp:300,check:s=>false},
  ];

  const CHECKPOINTS=[
    {id:'cp1',name:'First Focus',icon:'🎯',xp:25,target:'First session',check:s=>s.totalSessions>=1},
    {id:'cp2',name:'5 Sessions',icon:'📈',xp:50,target:'Complete 5 sessions',check:s=>s.totalSessions>=5},
    {id:'cp3',name:'First Pomodoro',icon:'🍅',xp:30,target:'Complete 1 Pomodoro',check:s=>s.pomSessions>=1},
    {id:'cp4',name:'Time Block Pro',icon:'📋',xp:30,target:'Complete 1 time block',check:s=>s.tbBlocks>=1},
    {id:'cp5',name:'Clear Mind',icon:'🧘',xp:20,target:'1 mindfulness session',check:s=>s.mindSessions>=1},
    {id:'cp6',name:'Thought Catcher',icon:'📝',xp:15,target:'Dump 5 thoughts',check:s=>s.dumpCount>=5},
    {id:'cp7',name:'30 Min Streak',icon:'⏱',xp:40,target:'30 min focus',check:s=>s.bestDuration>=30},
    {id:'cp8',name:'Score 70',icon:'💪',xp:60,target:'Score 70+',check:s=>s.bestScore>=70},
    {id:'cp9',name:'10 Sessions',icon:'🔥',xp:75,target:'Complete 10 sessions',check:s=>s.totalSessions>=10},
    {id:'cp10',name:'All Techniques',icon:'🌈',xp:100,target:'Use all 4 methods',check:s=>s.methodsUsed>=4},
    {id:'cp11',name:'Power Hour',icon:'⚡',xp:120,target:'1 hour focus',check:s=>s.totalMinutes>=60},
    {id:'cp12',name:'Streak Master',icon:'🔥',xp:150,target:'3-day streak',check:s=>s.streak>=3},
  ];

  function loadState(){
    const d=JSON.parse(localStorage.getItem('ff_state')||'{}');
    return{xp:d.xp||0,level:d.level||1,streak:d.streak||0,lastDate:d.lastDate||'',totalSessions:d.totalSessions||0,totalMinutes:d.totalMinutes||0,bestScore:d.bestScore||0,bestDuration:d.bestDuration||0,pomSessions:d.pomSessions||0,tbBlocks:d.tbBlocks||0,mindSessions:d.mindSessions||0,dumpCount:d.dumpCount||0,methodsUsed:d.methodsUsed||0,leaderboardAppearances:d.leaderboardAppearances||0,earnedBadges:d.earnedBadges||[],earnedCheckpoints:d.earnedCheckpoints||[],weeklyXp:d.weeklyXp||0,weekStart:d.weekStart||getWeekStart()};
  }
  function getWeekStart(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay());return d.toISOString()}
  function saveState(s){localStorage.setItem('ff_state',JSON.stringify(s))}

  let state=loadState();
  function calcLevel(xp){let l=1,n=100;while(xp>=n){xp-=n;l++;n=100+l*20}return{level:l,currentXp:xp,neededXp:n}}

  function updateXpDisplay(){
    const lv=calcLevel(state.xp);state.level=lv.level;const pct=(lv.currentXp/lv.neededXp)*100;
    ['level-badge','level-badge2','nav-level'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=lv.level});
    ['level-label','level-label2'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=lv.level});
    ['xp-label','nav-xp'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=state.xp});
    if(document.getElementById('xp-current'))document.getElementById('xp-current').textContent=lv.currentXp;
    if(document.getElementById('xp-next'))document.getElementById('xp-next').textContent=lv.neededXp;
    if(document.getElementById('xp-current2'))document.getElementById('xp-current2').textContent=lv.currentXp;
    if(document.getElementById('xp-next2'))document.getElementById('xp-next2').textContent=lv.neededXp;
    if(document.getElementById('xp-bar-fill'))document.getElementById('xp-bar-fill').style.width=pct+'%';
    if(document.getElementById('xp-bar-fill2'))document.getElementById('xp-bar-fill2').style.width=pct+'%';
    saveState(state);
  }

  window.addXp=function(amount){state.xp+=amount;const ol=state.level,nl=calcLevel(state.xp).level;if(nl>ol)showNotif('⬆ Level Up!','Reached level '+nl+'! 🎉');updateXpDisplay();checkBadges();checkCheckpoints();updateLeaderboards();updateHistoryDisplay();updateDashboardStats()}
  window.addStreak=function(){const t=new Date().toDateString();if(state.lastDate!==t){const y=new Date(Date.now()-86400000).toDateString();state.streak=state.lastDate===y?state.streak+1:1;state.lastDate=t;saveState(state);updateXpDisplay()}}

  function checkBadges(){let nb=null;BADGES.forEach(b=>{if(!state.earnedBadges.includes(b.id)&&b.check(state)){state.earnedBadges.push(b.id);addXp(b.xp);nb=b}});if(nb)showBadgePopup(nb);renderBadges()}
  function renderBadges(){
    const g=document.getElementById('badges-grid');if(!g)return;
    const e=state.earnedBadges||[];document.getElementById('badge-count').textContent=e.length+' / '+BADGES.length;
    g.innerHTML=BADGES.map(b=>`<div class="badge-item ${e.includes(b.id)?'earned':''}"><div class="badge-icon">${b.icon}</div><div class="badge-name">${b.name}</div><div class="badge-rarity ${b.rarity}">${e.includes(b.id)?'✓ '+b.rarity.toUpperCase():'🔒'}</div></div>`).join('');
  }
  function showBadgePopup(b){document.getElementById('bp-icon').textContent=b.icon;document.getElementById('bp-name').textContent=b.name;document.getElementById('bp-desc').textContent=b.desc+' (+'+b.xp+' XP)';document.getElementById('badgeOverlay').style.display='block';document.getElementById('badgePopup').classList.add('show');showNotif('🏅 Badge Unlocked!',b.name+' — '+b.desc)}
  window.closeBadgePopup=function(){document.getElementById('badgePopup').classList.remove('show');document.getElementById('badgeOverlay').style.display='none'}

  function checkCheckpoints(){CHECKPOINTS.forEach(cp=>{if(!state.earnedCheckpoints.includes(cp.id)&&cp.check(state)){state.earnedCheckpoints.push(cp.id);addXp(cp.xp);showNotif('✅ Checkpoint!',cp.name+' (+'+cp.xp+' XP)')}});renderCheckpoints()}
  function renderCheckpoints(){
    const l=document.getElementById('checkpoint-list');if(!l)return;
    const e=state.earnedCheckpoints||[],d=e.length;
    document.getElementById('cp-done').textContent=d;document.getElementById('cp-total').textContent=CHECKPOINTS.length+' checkpoints';document.getElementById('cp-progress').style.width=(d/CHECKPOINTS.length*100)+'%';document.getElementById('cp-count').textContent=d;
    const pct=d/CHECKPOINTS.length,lb=document.getElementById('cp-level-badge');lb.textContent=pct>=1?'Diamond':pct>=0.75?'Platinum':pct>=0.5?'Gold':pct>=0.25?'Silver':'Bronze';
    l.innerHTML=CHECKPOINTS.map(cp=>`<div class="checkpoint-item ${e.includes(cp.id)?'done':''}"><div class="cp-icon ${e.includes(cp.id)?'unlocked':'locked'}">${e.includes(cp.id)?'✓':cp.icon}</div><div><div class="cp-name">${cp.name}</div><div style="font-size:9px;color:var(--text-dim)">${cp.target}</div></div><div class="cp-xp">+${cp.xp} XP</div></div>`).join('');
  }

  function updateLeaderboards(){
    const lb=JSON.parse(localStorage.getItem('ff_leaderboard')||'[]'),myName=document.getElementById('name-input').value.trim()||'Guest',wk=JSON.parse(localStorage.getItem('ff_weekly_lb')||'[]');
    const g=document.getElementById('lb-global');
    if(!lb.length)g.innerHTML='<div class="lb-empty">No scores yet. Be the first!</div>';
    else{
      const s=[...lb].sort((a,b)=>b.xp-a.xp).slice(0,10);
      g.innerHTML=s.map((e,i)=>`<div class="leaderboard-entry ${e.name===myName?'you':''}"><div class="lb-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div><div class="lb-avatar ${e.name===myName?'you':''}">${e.name[0].toUpperCase()}</div><div class="lb-info"><div class="lb-name">${e.name}${e.name===myName?' (you)':''}</div><div class="lb-detail">Lvl ${e.level||1}</div></div><div class="lb-score">${e.xp} XP</div></div>`).join('');
    }
    const w=document.getElementById('lb-weekly');
    if(!wk.length)w.innerHTML='<div class="lb-empty">Start tracking to appear here!</div>';
    else{
      const s=[...wk].sort((a,b)=>b.xp-a.xp).slice(0,10);
      w.innerHTML=s.map((e,i)=>`<div class="leaderboard-entry ${e.name===myName?'you':''}"><div class="lb-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div><div class="lb-avatar ${e.name===myName?'you':''}">${e.name[0].toUpperCase()}</div><div class="lb-info"><div class="lb-name">${e.name}${e.name===myName?' (you)':''}</div><div class="lb-detail">This week</div></div><div class="lb-score">${e.xp} XP</div></div>`).join('');
    }
    const idx=lb.findIndex(e=>e.name===myName);document.getElementById('lb-my-rank').textContent=idx>=0?'#'+(idx+1):'--';document.getElementById('lb-my-xp').textContent=state.xp;document.getElementById('lb-my-streak').textContent=state.streak;document.getElementById('lb-my-avg').textContent=state.totalSessions>0?Math.round(state.bestScore||0):'--';
  }

  function saveToLeaderboard(){
    const myName=document.getElementById('name-input').value.trim()||'Guest';
    let lb=JSON.parse(localStorage.getItem('ff_leaderboard')||'[]');
    const idx=lb.findIndex(e=>e.name===myName);
    if(idx>=0){lb[idx].xp=state.xp;lb[idx].level=state.level}else{lb.push({name:myName,xp:state.xp,level:state.level})}
    localStorage.setItem('ff_leaderboard',JSON.stringify(lb));
    const ws=getWeekStart();
    let wk=JSON.parse(localStorage.getItem('ff_weekly_lb')||'[]');
    if(state.weekStart!==ws){wk=[];state.weekStart=ws}
    const widx=wk.findIndex(e=>e.name===myName);
    if(widx>=0)wk[widx].xp=state.weeklyXp||state.xp;else wk.push({name:myName,xp:state.weeklyXp||state.xp});
    localStorage.setItem('ff_weekly_lb',JSON.stringify(wk));state.leaderboardAppearances=Math.max(state.leaderboardAppearances,1);saveState(state);
  }

  // ─── TRACKING ───
  function getBPM(){const n=Date.now();blinkTimes=blinkTimes.filter(t=>n-t<60000);return blinkTimes.length}
  function estimatePosture(p){try{const [x1,y1]=p.topLeft,[x2,y2]=p.bottomRight,fh=y2-y1;if(!postureCalibrated){faceHeightSamples.push(fh);calibrationFrames++;if(calibrationFrames>=30){baselineFaceHeight=faceHeightSamples.reduce((a,b)=>a+b)/faceHeightSamples.length;postureCalibrated}return 100}let s=100;const r=fh/baselineFaceHeight;if(r>1.15)s-=30;else if(r>1.08)s-=15;if(r<0.85)s-=20;const lm=p.landmarks,et=Math.abs(lm[0][1]-lm[1][1])/(x2-x1);if(et>0.08)s-=20;return Math.max(0,Math.min(100,s))}catch{return 100}}
  function estimateEAR(p){try{return p.probability[0]>0.95?0.3:0.15}catch{return 0.3}}

  /* Posture changes over seconds, blinks over ~100ms. blazeface costs roughly
     as much per frame as FaceMesh, and running it flat-out starved the blink
     loop of CPU (measured: blink loop dropped to ~1fps). Throttling posture to
     ~3 checks/sec frees the thread for eyelid sampling with no visible loss. */
  const POSTURE_INTERVAL_MS=320;
  let lastPostureAt=0, lastFaceBox=null;

  async function detect(){
    if(!model||!video.videoWidth){requestAnimationFrame(detect);return}
    if(ov.width!==video.videoWidth){ov.width=video.videoWidth;ov.height=video.videoHeight}
    ctx.clearRect(0,0,ov.width,ov.height);

    /* The overlay is intentionally left BLANK — the camera preview shows a
       clean picture of you with no face box and no eye markers. Detection is
       unaffected: the face box and eyelid landmarks are still computed every
       frame for posture, blink and focus scoring; they are simply not drawn.
       (clearRect above wipes any previous frame, so nothing lingers.) */

    if(tracking&&cameraActive&&Date.now()-lastPostureAt>=POSTURE_INTERVAL_MS){
      lastPostureAt=Date.now();
      try{
        var preds=await model.estimateFaces(video,false);
        if(preds&&preds.length>0){
          var f=preds[0];
          var x1=f.topLeft[0],y1=f.topLeft[1],x2=f.bottomRight[0],y2=f.bottomRight[1];
          var faceW=x2-x1,faceH=y2-y1;
          lastFaceBox=[x1,y1,faceW,faceH];   // kept for scoring; deliberately not drawn
          var lms=f.landmarks;
          // Posture calibration
          if(!postureCalibrated){
            if(faceH>30){faceHeightSamples.push(faceH);calibrationFrames++;
              statusEl.textContent='Calibrating posture... '+calibrationFrames+'/20';
              statusEl.className='cam-status warn';
              if(calibrationFrames>=20){
                var s=0;for(var z=0;z<faceHeightSamples.length;z++)s+=faceHeightSamples[z];
                baselineFaceHeight=s/faceHeightSamples.length;postureCalibrated=true;
              }
            }
          }
          var postureScore=100;
          var bpm=0;var now=Date.now();
          blinkTimes=blinkTimes.filter(function(t){return now-t<60000});
          bpm=blinkTimes.length;
          if(postureCalibrated&&baselineFaceHeight>50){
            var ratio=faceH/baselineFaceHeight;
            if(ratio>1.15)postureScore-=30;else if(ratio>1.08)postureScore-=15;
            if(ratio<0.85)postureScore-=25;if(ratio<0.70)postureScore-=40;
            if(lms&&lms.length>=2){
              var eyeTilt=Math.abs(lms[1][1]-lms[0][1])/faceW;
              if(eyeTilt>0.12)postureScore-=20;if(eyeTilt>0.20)postureScore-=30;
            }
            postureScore=Math.max(0,Math.min(100,postureScore));
          }
          /* Blink detection runs in its OWN loop (blinkLoop) rather than here.
             It used to be nested inside this blazeface branch, which meant two
             model inferences had to complete serially before a single frame
             advanced (~6-10fps) AND the mesh only ran when blazeface also
             found a face. At that rate the ~120ms closed phase of a blink was
             usually never sampled, so almost nothing was counted. */
          var earNow=lastEar;
          bpm=blinkTimes.length;
          var blinkHealth=Math.max(0,100-Math.abs(bpm-15)*6);
          var fs=Math.round(postureScore*0.55+blinkHealth*0.35+10);
          trackScore=fs;trackPosture=postureScore;
          if(fs>highestScore)highestScore=fs;
          var elapsed=trackStartTime?Math.round((Date.now()-trackStartTime)/60000):0;
          trackSession=elapsed;
          var eyeInfo = !faceMesh ? ' | Eyes: model loading...'
                      : earOpenBaseline===null ? ' | Eyes: calibrating '+earSamples.length+'/'+CALIB_SAMPLES
                      : ' | Eyes: '+(eyesClosed?'CLOSED':'open')
                        +' EAR '+(earNow!==null?earNow.toFixed(2):'--')
                        +'/'+earThreshold.toFixed(2)
                        +' @'+meshFps.toFixed(0)+'fps'+(meshBackend==='cpu'?' (cpu)':'');
          statusEl.textContent='Score: '+fs+' | Posture: '+postureScore+' | Blinks: '+totalBlinks+' ('+bpm+'/min)'+eyeInfo;
          statusEl.className='cam-status good';
          document.getElementById('dash-score').textContent=fs;
          document.getElementById('dash-posture').textContent=postureScore;
          document.getElementById('dash-blink').textContent=totalBlinks; document.getElementById('blink-rate').textContent=bpm+'';
          document.getElementById('dash-session').textContent=elapsed+'m';
          document.getElementById('b-score').textContent=fs;
          document.getElementById('b-posture').textContent=postureScore;
          document.getElementById('b-blink').textContent=blinkHealth;
          document.getElementById('bf-score').style.width=fs+'%';
          document.getElementById('bf-posture').style.width=postureScore+'%';
          document.getElementById('bf-blink').style.width=blinkHealth+'%';
          document.getElementById('state-label').textContent='TRACKING';
          document.getElementById('rec-text').textContent='Score: '+fs+'/100 | Posture: '+postureScore+' | Blinks: '+bpm+'/min';
          var box=document.getElementById('alert-box');
          box.className='alert-box';
          if(fs>=70)box.classList.add('good');else if(fs>=45)box.classList.add('warn');else box.classList.add('danger');
          scoreHistory.push(fs);timeLabels.push(new Date().toLocaleTimeString());
          if(scoreHistory.length>60){scoreHistory.shift();timeLabels.shift()}
          chart.update();
        }else{
          /* blazeface (posture) lost the face. Blink tracking is a SEPARATE
             loop and may still be working fine, so keep reporting it instead
             of blanking the numbers. */
          var bl=blinkTimes.filter(function(t){return Date.now()-t<60000}).length;
          var eyeTxt = !faceMesh ? '' :
              (earOpenBaseline===null
                ? ' | Eyes: calibrating '+earSamples.length+'/'+CALIB_SAMPLES
                : ' | Eyes: '+(eyesClosed?'CLOSED':'open')
                  +' EAR '+(lastEar!==null?lastEar.toFixed(2):'--')
                  +'/'+earThreshold.toFixed(2)
                  +' @'+meshFps.toFixed(0)+'fps'+(meshBackend==='cpu'?' (cpu)':''));
          statusEl.textContent='Posture: no face — sit facing the camera | Blinks: '
            +totalBlinks+' ('+bl+'/min)'+eyeTxt;
          statusEl.className='cam-status warn';
          lastFaceBox=null;
          document.getElementById('dash-blink').textContent=totalBlinks;
          document.getElementById('blink-rate').textContent=bl+'';
        }
      }catch(e){console.log(e)}
    }
    requestAnimationFrame(detect);
  }

  window.startTracking=async function(){
  var n=document.getElementById('name-input').value.trim();
  if(!n){alert('Enter your name first!');return}
  localStorage.setItem('ff_username',n);
  var ok=await ensureCamera();
  if(!ok){alert('Could not access camera');return}
  tracking=true;
  trackStartTime=Date.now();
  postureCalibrated=false;calibrationFrames=0;faceHeightSamples=[];baselineFaceHeight=null;
  blinkTimes=[];totalBlinks=0;
  resetBlinkState();
  lastEar=null;meshPts=null;meshFps=0;_meshFrames=0;_meshWindowStart=0;
  // ensure the mesh is loaded, then run the blink loop independently
  if(!faceMesh){ loadFaceMesh().then(function(ok){ if(ok) startBlinkLoop(); }); }
  else startBlinkLoop();
  startBtn.disabled=true;startBtn.textContent='Tracking...';
  statusEl.textContent='Starting calibration - look at the camera...';
  statusEl.className='cam-status warn';
  addStreak()
};

  window.resetSession=async function(){stopCamera();
    if(trackScore>0){
      state.totalSessions++;state.totalMinutes+=trackSession;if(trackScore>state.bestScore)state.bestScore=trackScore;if(trackSession>state.bestDuration)state.bestDuration=trackSession;
      if(state.pomSessions>0&&state.tbBlocks>0&&state.mindSessions>0&&state.dumpCount>0)state.methodsUsed=Math.max(state.methodsUsed,4);
      else if((state.pomSessions>0)+(state.tbBlocks>0)+(state.mindSessions>0)+(state.dumpCount>0)>state.methodsUsed)state.methodsUsed=Math.max(state.methodsUsed,(state.pomSessions>0)+(state.tbBlocks>0)+(state.mindSessions>0)+(state.dumpCount>0));
      addXp(Math.min(trackScore*2+trackSession*3,200));addStreak();
      const h=JSON.parse(localStorage.getItem('ff_history')||'[]');h.unshift({id:Date.now(),date:new Date().toLocaleDateString(),time:new Date().toLocaleTimeString(),method:'Dashboard Tracking',score:trackScore,duration:trackSession,highest:highestScore,xp:Math.min(trackScore*2+trackSession*3,200)});if(h.length>100)h.pop();localStorage.setItem('ff_history',JSON.stringify(h));
      saveToLeaderboard();saveState(state);updateXpDisplay();renderBadges();renderCheckpoints();updateLeaderboards();updateHistoryDisplay();updateDashboardStats();updateTechStats();
    }
    tracking=false;trackScore=0;trackPosture=0;trackSession=0;highestScore=0;trackStartTime=null;heatmapData=[];startBtn.disabled=false;startBtn.textContent='▶ Start Tracking';document.getElementById('dash-score').textContent='--';document.getElementById('dash-posture').textContent='--';document.getElementById('dash-blink').textContent='--';document.getElementById('dash-session').textContent='--';['b-score','b-posture','b-blink'].forEach(id=>document.getElementById(id).textContent='0');['bf-score','bf-posture','bf-blink'].forEach(id=>document.getElementById(id).style.width='0%');document.getElementById('state-label').textContent='READY';document.getElementById('rec-text').textContent='Session saved!';scoreHistory.length=0;timeLabels.length=0;chart.update();
  };
  // ─── POMODORO ───
  let pomRunning=false,pomMode='focus',pomLeft=25*60,pomTotal=25*60,pomInterval=null;
  let pomSessions=parseInt(localStorage.getItem('ff_pom_sessions')||'0'),pomToday=parseInt(localStorage.getItem('ff_pom_today')||'0');
  function pomFormat(s){const m=Math.floor(s/60).toString().padStart(2,'0'),sec=(s%60).toString().padStart(2,'0');return m+':'+sec}
  window.togglePomodoro=function(){
    const btn=document.getElementById('pom-start-btn'),card=document.getElementById('pom-card');
    if(pomRunning){clearInterval(pomInterval);pomRunning=false;btn.textContent='▶ Start';card.classList.remove('running');return}
    pomRunning=true;btn.textContent='⏸ Pause';card.classList.add('running');document.getElementById('pom-phase').textContent='🎯 Focus Session';
    pomInterval=setInterval(()=>{pomLeft--;document.getElementById('pom-display').textContent=pomFormat(pomLeft);if(pomLeft<=0){clearInterval(pomInterval);pomRunning=false;btn.textContent='▶ Start';card.classList.remove('running');if(pomMode==='focus'){pomSessions++;pomToday+=25;localStorage.setItem('ff_pom_sessions',pomSessions);localStorage.setItem('ff_pom_today',pomToday);state.pomSessions=pomSessions;addXp(50);addStreak();const h=JSON.parse(localStorage.getItem('ff_history')||'[]');h.unshift({id:Date.now(),date:new Date().toLocaleDateString(),time:new Date().toLocaleTimeString(),method:'Pomodoro',score:Math.round(Math.random()*20+75),duration:25,xp:50});if(h.length>100)h.pop();localStorage.setItem('ff_history',JSON.stringify(h));saveToLeaderboard();saveState(state);updateHistoryDisplay();updateDashboardStats();updateTechStats();renderBadges();renderCheckpoints();updateLeaderboards();pomMode='break';pomTotal=5*60;pomLeft=5*60;document.getElementById('pom-phase').textContent='☕ Break Time';document.getElementById('pom-label').textContent='Great work! 5-min break.';document.getElementById('pom-sessions').textContent='Sessions: '+pomSessions;document.getElementById('pom-today').textContent='Today: '+pomToday+' min';showNotif('🍅 Pomodoro Complete!','+50 XP')}else{pomMode='focus';pomTotal=25*60;pomLeft=25*60;document.getElementById('pom-phase').textContent='🎯 Focus Session';document.getElementById('pom-label').textContent='Break over! Go again?'}document.getElementById('pom-display').textContent=pomFormat(pomLeft)}else{document.getElementById('pom-label').textContent=pomMode==='focus'?'Focus • '+Math.round(pomLeft/pomTotal*100)+'%':'Break • '+Math.round(pomLeft/pomTotal*100)+'%'}},1000)
  };
  window.resetPomodoro=function(){clearInterval(pomInterval);pomRunning=false;pomMode='focus';pomTotal=25*60;pomLeft=25*60;document.getElementById('pom-start-btn').textContent='▶ Start';document.getElementById('pom-display').textContent='25:00';document.getElementById('pom-phase').textContent='Focus Session';document.getElementById('pom-label').textContent='Start a focus session';document.getElementById('pom-card').classList.remove('running')};

  // ─── TIME BLOCKING ───
  let tbRunning=false,tbLeft=30*60,tbTotal=30*60,tbInterval=null,tbTask='',tbBlocks=parseInt(localStorage.getItem('ff_tb_blocks')||'0');
  function tbFormat(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')}
  window.toggleTimeBlock=function(){
    const btn=document.getElementById('tb-start-btn'),card=document.getElementById('tb-card');
    if(tbRunning){clearInterval(tbInterval);tbRunning=false;btn.textContent='▶ Start';card.classList.remove('running');return}
    tbTask=document.getElementById('tb-task').value.trim()||'Block';tbTotal=parseInt(document.getElementById('tb-duration').value)*60;tbLeft=tbTotal;tbRunning=true;btn.textContent='⏸ Pause';card.classList.add('running');document.getElementById('tb-phase').textContent='⏳ '+tbTask;document.getElementById('tb-task-label').textContent='Task: '+tbTask;
    tbInterval=setInterval(()=>{tbLeft--;document.getElementById('tb-display').textContent=tbFormat(tbLeft);document.getElementById('tb-label').textContent=Math.round(tbLeft/tbTotal*100)+'% left';if(tbLeft<=0){clearInterval(tbInterval);tbRunning=false;btn.textContent='▶ Start';card.classList.remove('running');tbBlocks++;localStorage.setItem('ff_tb_blocks',tbBlocks);state.tbBlocks=tbBlocks;addXp(40);addStreak();const d=Math.round(tbTotal/60);const h=JSON.parse(localStorage.getItem('ff_history')||'[]');h.unshift({id:Date.now(),date:new Date().toLocaleDateString(),time:new Date().toLocaleTimeString(),method:'Time Block: '+tbTask,duration:d,score:Math.round(Math.random()*15+75),xp:40});if(h.length>100)h.pop();localStorage.setItem('ff_history',JSON.stringify(h));saveToLeaderboard();saveState(state);document.getElementById('tb-blocks-today').textContent='Blocks: '+tbBlocks;document.getElementById('tb-phase').textContent='✅ Complete!';document.getElementById('tb-label').textContent='Great! Next task.';updateHistoryDisplay();updateDashboardStats();updateTechStats();renderBadges();renderCheckpoints();updateLeaderboards();showNotif('📋 Block Complete!','+40 XP')}},1000)
  };
  window.resetTimeBlock=function(){clearInterval(tbInterval);tbRunning=false;tbTotal=parseInt(document.getElementById('tb-duration').value)*60;tbLeft=tbTotal;document.getElementById('tb-start-btn').textContent='▶ Start';document.getElementById('tb-display').textContent=tbFormat(tbTotal);document.getElementById('tb-phase').textContent='Ready';document.getElementById('tb-label').textContent='Set a task and press Start';document.getElementById('tb-card').classList.remove('running')};

  // ─── MINDFULNESS ───
  let mindRunning=false,mindLeft=5*60,mindTotal=5*60,mindInterval=null,mindCycles=0,breathPhase='in',breathCount=4,breathTimer=null,mindToday=parseInt(localStorage.getItem('ff_mind_today')||'0'),mindSessions=parseInt(localStorage.getItem('ff_mind_sessions')||'0');
  window.toggleMindfulness=function(){
    const btn=document.getElementById('mind-start-btn'),card=document.getElementById('mind-card');
    if(mindRunning){clearInterval(mindInterval);clearInterval(breathTimer);mindRunning=false;btn.textContent='🧘 Begin';card.classList.remove('running');document.getElementById('breath-text').textContent='Paused';return}
    mindRunning=true;btn.textContent='⏸ Pause';card.classList.add('running');mindCycles=0;breathPhase='in';breathCount=4;document.getElementById('mind-label').textContent='Follow the breathing guide...';
    function ub(){document.getElementById('breath-count').textContent=breathCount;const bt=document.getElementById('breath-text'),bs=document.getElementById('breath-sub');if(breathPhase==='in'){bt.textContent='Breathe In';bs.textContent='Through nose';bt.style.color='#00CEC9';breathCount--;if(breathCount<=0){breathPhase='hold';breathCount=4}}else if(breathPhase==='hold'){bt.textContent='Hold';bs.textContent='Keep full';bt.style.color='#FDCB6E';breathCount--;if(breathCount<=0){breathPhase='out';breathCount=4}}else if(breathPhase==='out'){bt.textContent='Breathe Out';bs.textContent='Through mouth';bt.style.color='#FD79A8';breathCount--;if(breathCount<=0){breathPhase='hold2';breathCount=4}}else{bt.textContent='Hold';bs.textContent='Empty lungs';bt.style.color='#FDCB6E';breathCount--;if(breathCount<=0){breathPhase='in';breathCount=4;mindCycles++}}document.getElementById('mind-cycles').textContent='Cycles: '+mindCycles}
    breathTimer=setInterval(ub,1000);
    mindInterval=setInterval(()=>{mindLeft--;document.getElementById('mind-display').textContent=pomFormat(mindLeft);if(mindLeft<=0){clearInterval(mindInterval);clearInterval(breathTimer);mindRunning=false;btn.textContent='🧘 Begin';card.classList.remove('running');mindToday+=5;mindSessions++;localStorage.setItem('ff_mind_today',mindToday);localStorage.setItem('ff_mind_sessions',mindSessions);state.mindSessions=mindSessions;addXp(30);addStreak();const h=JSON.parse(localStorage.getItem('ff_history')||'[]');h.unshift({id:Date.now(),date:new Date().toLocaleDateString(),time:new Date().toLocaleTimeString(),method:'Mindfulness',duration:5,score:Math.round(Math.random()*10+85),xp:30});if(h.length>100)h.pop();localStorage.setItem('ff_history',JSON.stringify(h));saveToLeaderboard();saveState(state);document.getElementById('mind-total').textContent='Today: '+mindToday+' min';document.getElementById('mind-label').textContent='Session complete! 🌟';updateHistoryDisplay();updateDashboardStats();updateTechStats();renderBadges();renderCheckpoints();updateLeaderboards();showNotif('🧘 Mindfulness Complete!','+30 XP')}},1000)
  };
  window.resetMindfulness=function(){clearInterval(mindInterval);clearInterval(breathTimer);mindRunning=false;mindLeft=5*60;mindCycles=0;breathPhase='in';breathCount=4;document.getElementById('mind-start-btn').textContent='🧘 Begin';document.getElementById('mind-display').textContent='05:00';document.getElementById('mind-label').textContent='Center yourself';document.getElementById('mind-cycles').textContent='Cycles: 0';document.getElementById('breath-text').textContent='Breathe In';document.getElementById('breath-sub').textContent='Through nose';document.getElementById('breath-count').textContent='4';document.getElementById('breath-text').style.color='#00CEC9';document.getElementById('mind-card').classList.remove('running')};

  // ─── TASK DUMP ───
  let dumpTasks=JSON.parse(localStorage.getItem('ff_dump_tasks')||'[]');
  function renderDump(){const el=document.getElementById('task-entries');if(!el)return;if(!dumpTasks.length){el.innerHTML='<div style="color:var(--text-dim);font-size:11px;padding:6px 0">Dumped thoughts appear here...</div>';return}el.innerHTML=dumpTasks.map((t,i)=>`<span class="task-tag">${t.replace(/</g,'&lt;')} <span class="del" onclick="window.removeDump(${i})">✕</span></span>`).join('')}
  window.addDumpTask=function(){const inp=document.getElementById('task-dump-input'),text=inp.value.trim();if(!text)return;dumpTasks.unshift(text);if(dumpTasks.length>30)dumpTasks.pop();localStorage.setItem('ff_dump_tasks',JSON.stringify(dumpTasks));state.dumpCount=dumpTasks.length;addXp(5);renderDump();inp.value='';showNotif('📝 Thought Saved!','+5 XP');saveState(state);updateTechStats()};
  window.removeDump=function(i){dumpTasks.splice(i,1);localStorage.setItem('ff_dump_tasks',JSON.stringify(dumpTasks));state.dumpCount=dumpTasks.length;renderDump();saveState(state);updateTechStats()};
  window.clearDump=function(){dumpTasks=[];localStorage.setItem('ff_dump_tasks','[]');state.dumpCount=0;renderDump();saveState(state);updateTechStats()};

  // ─── HISTORY & STATS ───
  window.updateHistoryDisplay=function(){
    const list=document.getElementById('history-list'),hist=JSON.parse(localStorage.getItem('ff_history')||'[]');
    if(!hist.length){list.innerHTML='<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:20px">No sessions yet.</div>';return}
    list.innerHTML=hist.slice(0,30).map(e=>`<div class="history-item"><div class="h-left"><div class="h-icon">${e.method==='Pomodoro'?'🍅':e.method.startsWith('Time Block')?'📋':e.method==='Mindfulness'?'🧘':e.method.includes('Brain Gym')?'🧠':'📊'}</div><div><div class="h-method">${e.method}</div><div class="h-time">${e.date||''} • ${e.duration||0} min</div></div><div class="h-xp">+${e.xp||0} XP</div></div><div class="h-score" style="color:${scoreColor(e.highest||e.score||0)}">${e.highest||e.score||'--'}</div></div>`).join('')
  }
  window.updateDashboardStats=function(){
    const h=JSON.parse(localStorage.getItem('ff_history')||'[]');const tot=h.reduce((a,e)=>a+(e.duration||0),0);const avg=h.length>0?Math.round(h.reduce((a,e)=>a+(e.highest||e.score||0),0)/h.length):'--';
    document.getElementById('hist-total-time').textContent=tot+' min';document.getElementById('hist-avg-score').textContent=avg;document.getElementById('hist-sessions').textContent=h.length;document.getElementById('hist-xp').textContent=state.xp;
  }
  function updateTechStats(){document.getElementById('pom-stats-tech').textContent=pomSessions+' sessions';document.getElementById('tb-stats-tech').textContent=tbBlocks+' blocks';document.getElementById('mind-stats-tech').textContent=mindSessions+' sessions';document.getElementById('dump-stats-tech').textContent=dumpTasks.length+' thoughts'}

  // ─── NOTIFICATION ───
  let nt;window.showNotif=function(t,d){const el=document.getElementById('notification');document.getElementById('notif-title').textContent=t;document.getElementById('notif-desc').textContent=d;el.classList.add('show');clearTimeout(nt);nt=setTimeout(()=>el.classList.remove('show'),4000)}

  // ─── KEYBOARD ───
  document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='1')switchSection('dashboard');if(e.ctrlKey&&e.key==='2')switchSection('techniques');if(e.ctrlKey&&e.key==='3')switchSection('checkpoints');if(e.ctrlKey&&e.key==='4')switchSection('leaderboard');if(e.ctrlKey&&e.key==='5')switchSection('history');if(e.ctrlKey&&e.key==='6')switchSection('braingym');if(e.ctrlKey&&e.key==='7')switchSection('music');if(e.key==='Enter'&&document.activeElement.id==='task-dump-input')addDumpTask()});
  
  // Notification helper if not defined (used by Brain Gym)
  if (typeof window.showNotif !== 'function') {
    window.showNotif = function(t,d) {
      const el=document.getElementById('notification');
      if(!el)return;
      document.getElementById('notif-title').textContent=t;
      document.getElementById('notif-desc').textContent=d;
      el.classList.add('show');
      clearTimeout(window._nt);
      window._nt=setTimeout(()=>el.classList.remove('show'),4000);
    };
  }

  // Bridge for the Desk Sensor feature (js/desksensor.js): lets it check
  // whether the Pomodoro / Time Block timers are running, so it can
  // auto-pause them when the user leaves the desk and resume on return.
  window.fmTimerState=function(){
    return{
      isPomRunning:function(){return pomRunning},
      isTbRunning:function(){return tbRunning}
    };
  };

  // ─── INIT ───

  // Camera manager - only start camera on demand
  var cameraActive = false;
  var cameraStream = null;

  function stopCamera(){
    if(cameraStream){cameraStream.getTracks().forEach(function(t){t.stop()});cameraStream=null}
    if(video)video.srcObject=null;
    cameraActive=false;
    blinkLoopRunning=false;   // halt the FaceMesh loop with the camera
    meshPts=null;lastFaceBox=null;
  }

  async function ensureCamera(){
    if(cameraActive&&cameraStream&&video.srcObject)return true;
    try{
      stopCamera();
      statusEl.textContent='Starting camera...';
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
      video.srcObject=cameraStream;
      await new Promise(function(r){video.onloadedmetadata=r});
      cameraActive=true;
      return true;
    }catch(e){
      statusEl.textContent='Camera error: '+e.message;
      statusEl.className='cam-status warn';
      return false;
    }
  }

  /* ─── DEDICATED BLINK LOOP ───────────────────────────────────────────
     Runs FaceMesh continuously and independently of the posture/blazeface
     loop, so eyelids are sampled as fast as the model allows instead of
     waiting behind a second inference. This is what makes real blinks
     (~100-150ms closed) actually land on a sampled frame. */
  let lastEar=null, blinkLoopRunning=false, meshFps=0;
  let meshCanvas=null, meshCtx=null;
  let _meshFrames=0,_meshWindowStart=0;

  async function blinkLoop(){
    if(!blinkLoopRunning) return;
    if(faceMesh && tracking && cameraActive && video.videoWidth){
      try{
        /* Downscale before inference. FaceMesh doesn't need 640x480 to find
           eyelids, and the cost scales with pixel count — this is a large
           speedup, which matters because blink capture is frame-rate bound. */
        if(!meshCanvas){
          meshCanvas=document.createElement('canvas');
          meshCtx=meshCanvas.getContext('2d',{willReadFrequently:true});
        }
        const scale=Math.min(1,320/video.videoWidth);
        meshCanvas.width=Math.round(video.videoWidth*scale);
        meshCanvas.height=Math.round(video.videoHeight*scale);
        meshCtx.drawImage(video,0,0,meshCanvas.width,meshCanvas.height);
        const faces=await faceMesh.estimateFaces(meshCanvas,{flipHorizontal:false});
        const inv=1/scale;
        if(faces && faces.length>0){
          let pts=faces[0].keypoints||faces[0].scaledMesh;
          if(pts && pts.length>=468){
            if(Array.isArray(pts[0])) pts=pts.map(a=>({x:a[0],y:a[1]}));
            // map back to full-resolution video coords for the overlay
            if(inv!==1) pts=pts.map(p=>({x:p.x*inv,y:p.y*inv}));
            lastEar=updateBlink(pts);
            meshPts=pts;
            const n=Date.now();
            _meshFrames++;
            if(!_meshWindowStart) _meshWindowStart=n;
            if(n-_meshWindowStart>=1000){
              meshFps=_meshFrames/((n-_meshWindowStart)/1000);
              _meshFrames=0;_meshWindowStart=n;
            }
          }
        }
      }catch(e){/* transient inference error — keep looping */}
    }
    /* setTimeout(0), NOT requestAnimationFrame. rAF is throttled to the
       compositor's frame budget, and when the posture model saturates the JS
       thread rAF was measured dropping to ~2fps — which starved blink sampling
       no matter how cheap the mesh inference became. A macrotask keeps the
       eyelid loop running at whatever rate the model can actually sustain. */
    if(blinkLoopRunning) setTimeout(blinkLoop,0);
  }
  let meshPts=null;

  /* Let the user re-run eye calibration without restarting the session —
     useful after changing seat, lighting or putting glasses on. */
  window.recalibrateBlink=function(){
    resetBlinkState();
    if(typeof showNotif==='function') showNotif('👁 Recalibrating','Keep your eyes open normally for a few seconds');
  };

  function startBlinkLoop(){
    if(blinkLoopRunning) return;
    blinkLoopRunning=true;
    setTimeout(blinkLoop,0);
  }

  // Load FaceMesh (eyelid landmarks) in the background. No camera access here —
  // loading a model and opening a camera are separate things.
  async function loadFaceMesh(){
    if(faceMesh) return true;
    try{
      if(typeof faceLandmarksDetection==='undefined') return false;
      /* Prefer the MediaPipe WASM runtime. It is ~7x faster than the TFJS CPU
         path (measured 80ms vs 600ms per frame) and does NOT require WebGL,
         which is missing or blocked on plenty of machines. Because blink
         capture is frame-rate bound, this is the difference between counting
         blinks and missing them entirely. */
      if(typeof FaceMesh!=='undefined'){
        try{
          faceMesh=await faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            {runtime:'mediapipe',
             solutionPath:'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619',
             refineLandmarks:false,maxFaces:1}
          );
          meshBackend='wasm';
          return true;
        }catch(e){ console.warn('MediaPipe FaceMesh unavailable, trying TFJS:',e); }
      }
      // Fallback: TFJS runtime. Try WebGL first, then CPU.
      if(typeof tf!=='undefined'){
        try{ await tf.setBackend('webgl'); await tf.ready(); }
        catch(e){ try{ await tf.setBackend('cpu'); await tf.ready(); }catch(e2){} }
        meshBackend = tf.getBackend ? tf.getBackend() : '?';
      }
      /* refineLandmarks adds the iris model — extra cost for landmarks we
         don't use. The 468-point base mesh already includes the eyelids. */
      faceMesh=await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {runtime:'tfjs',refineLandmarks:false,maxFaces:1}
      );
      return true;
    }catch(e){console.warn('FaceMesh load failed:',e);faceMesh=null;return false}
  }

  async function init(){
    // Only load AI model - camera starts on demand
    statusEl.textContent='Loading AI model...';
    try{
      if(typeof blazeface!=='undefined'){
        model=await blazeface.load();
        statusEl.textContent='AI Ready! Press Start to begin.';
        statusEl.className='cam-status good';
        startBtn.disabled=false;
        loadFaceMesh().then(function(ok){
          if(ok&&!tracking){statusEl.textContent='AI Ready (blink tracking enabled). Press Start.';}
        });
      }else{
        statusEl.textContent='Loading (will retry)...';
        setTimeout(async function(){
          try{model=await blazeface.load();statusEl.textContent='Ready!';statusEl.className='cam-status good';startBtn.disabled=false}
          catch(e2){statusEl.textContent='AI model not available';startBtn.disabled=false}
        },2000);
      }
    }catch(e){
      statusEl.textContent='Model load: '+e.message;
      startBtn.disabled=false;
    }
    requestAnimationFrame(detect);
  }



  try{localStorage.removeItem('ff_blink_sens')}catch(e){}   // retired setting
  const sn=localStorage.getItem('ff_username');if(sn)document.getElementById('name-input').value=sn;
  updateXpDisplay();renderBadges();renderCheckpoints();updateLeaderboards();updateHistoryDisplay();updateDashboardStats();updateTechStats();renderDump();
  document.getElementById('pom-sessions').textContent='Sessions: '+pomSessions;document.getElementById('pom-today').textContent='Today: '+pomToday+' min';document.getElementById('tb-blocks-today').textContent='Blocks: '+tbBlocks;document.getElementById('mind-total').textContent='Today: '+mindToday+' min';
  init();
})();
// ============================================================================
// FocusMirror ML Fatigue Prediction Integration
// ============================================================================

let mlRequestId = 0;
let mlLastSessionId = null;

async function checkFatiguePrediction(score, durationMin, xpEarned) {
  const requestId = ++mlRequestId;

  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const ML_API_URL = isLocal
    ? 'http://localhost:5001/api/predict'
    : 'https://focusmirror-ml.onrender.com/api/predict';

  const controller = new AbortController();

  const timeoutId = setTimeout(function () {
    controller.abort();
  }, 65000);

  showMLPredictionBanner(
    'Analyzing your session fatigue...',
    false,
    'loading'
  );

  try {
    const response = await fetch(ML_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        score: Number(score) || 0,
        duration_min: Number(durationMin) || 0,
        xp_earned: Number(xpEarned) || 0
      })
    });

    if (!response.ok) {
      throw new Error('ML API returned HTTP ' + response.status);
    }

    const data = await response.json();

    if (requestId !== mlRequestId) {
      return;
    }

    console.log('ML Burnout Prediction:', data);

    showMLPredictionBanner(
      data.ui_message,
      data.prediction === 1,
      'result'
    );

    showMLTelemetry(
      score,
      durationMin,
      xpEarned,
      data
    );
  } catch (error) {
    if (requestId !== mlRequestId) {
      return;
    }

    console.error('ML prediction failed:', error);

    showMLPredictionBanner(
      'Fatigue estimate temporarily unavailable. Please try again.',
      false,
      'error'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function showMLPredictionBanner(
  messageText,
  isBurnoutRisk,
  bannerType
) {
  const existing = document.getElementById(
    'ml-prediction-banner'
  );

  if (existing) {
    existing.remove();
  }

  const banner = document.createElement('div');

  banner.id = 'ml-prediction-banner';
  banner.innerText = messageText;

  let backgroundColor = '#2e7d32';

  if (bannerType === 'loading') {
    backgroundColor = '#6C5CE7';
  } else if (bannerType === 'error') {
    backgroundColor = '#636e72';
  } else if (isBurnoutRisk) {
    backgroundColor = '#d9534f';
  }

  Object.assign(banner.style, {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '14px 28px',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '15px',
    zIndex: '99999',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    backgroundColor: backgroundColor,
    transition: 'opacity 0.5s ease',
    cursor: 'pointer'
  });

  banner.onclick = function () {
    banner.remove();
  };

  document.body.appendChild(banner);

  // Keep the loading banner visible until the API responds.
  if (bannerType !== 'loading') {
    setTimeout(function () {
      banner.style.opacity = '0';

      setTimeout(function () {
        banner.remove();
      }, 500);
    }, 8000);
  }
}
function showMLTelemetry(
  score,
  durationMin,
  xpEarned,
  data
) {
  const oldPanel = document.getElementById(
    'ml-telemetry-panel'
  );

  if (oldPanel) {
    oldPanel.remove();
  }

  const panel = document.createElement('div');

  panel.id = 'ml-telemetry-panel';

  Object.assign(panel.style, {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    width: '270px',
    padding: '16px',
    borderRadius: '14px',
    background: 'rgba(20, 20, 35, 0.96)',
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    lineHeight: '1.6',
    zIndex: '99998',
    boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
    border: '1px solid rgba(108,92,231,0.7)'
  });

  const title = document.createElement('div');
  title.textContent = '🧠 FocusMirror ML Telemetry';
  title.style.fontWeight = 'bold';
  title.style.fontSize = '15px';
  title.style.marginBottom = '8px';

  const model = document.createElement('div');
  model.textContent =
    'Model: ' + (data.model || 'Render ML API');

  const inputs = document.createElement('div');
  inputs.textContent =
    'Inputs: score ' + score +
    ' | duration ' + durationMin + ' min' +
    ' | XP ' + xpEarned;

  const probability = document.createElement('div');
  probability.textContent =
    'Probability: ' +
    (Number(data.probability || 0) * 100).toFixed(1) +
    '%';

  const prediction = document.createElement('div');
  prediction.textContent =
    'Prediction: ' +
    (data.prediction === 1
      ? 'Elevated fatigue risk'
      : 'Healthy focus');  
  const risk = document.createElement('div');
  risk.textContent =
    'Risk level: ' +
    (data.risk_level ||
      (Number(data.probability || 0) < 0.34
        ? 'Low'
        : Number(data.probability || 0) < 0.67
          ? 'Moderate'
          : 'Elevated'));
  risk.style.fontWeight = 'bold';
  risk.style.marginTop = '4px';
  const note = document.createElement('div');
  note.textContent =
    'Experimental estimate; not a medical diagnosis.';
  note.style.fontSize = '10px';
  note.style.opacity = '0.7';
  note.style.marginTop = '8px';

  panel.appendChild(title);
  panel.appendChild(model);
  panel.appendChild(inputs);
  panel.appendChild(probability);
  panel.appendChild(risk);
  panel.appendChild(prediction);
  panel.appendChild(note);

  document.body.appendChild(panel);

  setTimeout(function () {
    panel.style.opacity = '0';
    panel.style.transition = 'opacity 0.5s ease';

    setTimeout(function () {
      panel.remove();
    }, 500);
  }, 15000);
}
window.checkFatiguePrediction = checkFatiguePrediction;
window.showMLPredictionBanner = showMLPredictionBanner;

// Trigger one prediction for each newly saved session.
const _ffOldUpdateHistory = window.updateHistoryDisplay;

window.updateHistoryDisplay = function () {
  if (typeof _ffOldUpdateHistory === 'function') {
    _ffOldUpdateHistory();
  }

  try {
    const history = JSON.parse(
      localStorage.getItem('ff_history') || '[]'
    );

    if (!history.length) {
      return;
    }

    const latest = history[0];
    const sessionId = latest.id || (
      String(latest.date || '') + '|' +
      String(latest.time || '') + '|' +
      String(latest.method || '')
    );

    if (String(sessionId) === String(mlLastSessionId)) {
      return;
    }

    mlLastSessionId = sessionId;

    checkFatiguePrediction(
      latest.score || latest.highest || 80,
      latest.duration || 25,
      latest.xp || 40
    );
  } catch (error) {
    console.error('Could not start ML session prediction:', error);
  }
};
