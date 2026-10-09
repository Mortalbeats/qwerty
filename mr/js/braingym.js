// ─── BRAIN GYM - HAND TRACKING FINGER EXERCISES ───
(function(){
  'use strict';

  // ─── EXERCISE DEFINITIONS (Scientifically Proven) ───
  /* Hand "scale" = wrist -> middle-finger knuckle distance. Dividing every
     measurement by this makes the checks independent of how near or far the
     hand is from the lens; raw distances alone only worked at one exact depth. */
  function handScale(lm){
    const d=Math.hypot(lm[9].x-lm[0].x, lm[9].y-lm[0].y);
    return d>1e-6?d:1;
  }
  // distance between two landmarks, expressed in hand-widths
  function relDist(lm,a,b){
    return Math.hypot(lm[a].x-lm[b].x, lm[a].y-lm[b].y)/handScale(lm);
  }

  const EXERCISES = {
    tapping: {
      name: 'Finger Tapping',
      icon: '👆',
      science: 'Activates premotor cortex & prefrontal cortex. Studies show 30% increase in neural firing rates.',
      duration: 30,
      xp: 25,
      targetReps: 10,
      sequence: ['index', 'middle', 'ring', 'pinky'],
      instruction: 'Tap your <span class="finger-name">{finger}</span> to your <span class="target-name">thumb</span>',
      check: function(landmarks, idx, finger) {
        // fingertip touching thumb tip, measured in hand-widths (scale-invariant)
        const fingerMap = {index: 8, middle: 12, ring: 16, pinky: 20};
        return relDist(landmarks, fingerMap[finger], 4) < 0.42;
      }
    },
    opposition: {
      name: 'Finger Opposition',
      icon: '🤏',
      science: 'Strengthens corpus callosum connectivity between brain hemispheres. Enhances fine motor control.',
      duration: 20,
      xp: 20,
      targetReps: 8,
      sequence: ['index', 'middle', 'ring', 'pinky'],
      instruction: 'Press <span class="finger-name">{finger}</span> firmly against <span class="target-name">thumb</span> and hold',
      check: function(landmarks, idx, finger) {
        // firmer press = slightly tighter tolerance than tapping
        const fingerMap = {index: 8, middle: 12, ring: 16, pinky: 20};
        return relDist(landmarks, fingerMap[finger], 4) < 0.34;
      }
    },
    roll: {
      name: 'Finger Roll',
      icon: '🎹',
      science: 'Activates cerebellar-thalamic circuit. Mimics piano playing which increases BDNF by 30%+.',
      duration: 25,
      xp: 25,
      targetReps: 8,
      sequence: ['index', 'middle', 'ring', 'pinky'],
      instruction: 'Lift your <span class="finger-name">{finger}</span> up while keeping others <span class="target-name">down</span>',
      check: function(landmarks, idx, finger) {
        /* "Lifted" = this finger extended while its neighbours stay curled.
           Measured along the hand's own axis so it still works when the hand
           is tilted, and scaled by hand size so distance from the lens
           doesn't matter. */
        const tipMap = {index: 8, middle: 12, ring: 16, pinky: 20};
        const mcpMap = {index: 5, middle: 9,  ring: 13, pinky: 17};
        const s = handScale(landmarks);
        const ext = f => (Math.hypot(landmarks[tipMap[f]].x-landmarks[0].x,
                                     landmarks[tipMap[f]].y-landmarks[0].y)
                        - Math.hypot(landmarks[mcpMap[f]].x-landmarks[0].x,
                                     landmarks[mcpMap[f]].y-landmarks[0].y)) / s;
        const me = ext(finger);
        const others = ['index','middle','ring','pinky'].filter(f => f !== finger).map(ext);
        // target finger clearly extended, and standing out from the rest
        return me > 0.55 && me > Math.max.apply(null, others) + 0.18;
      }
    },
    fist: {
      name: 'Fist Pump',
      icon: '✊',
      science: 'Rhythmic fist motion increases cerebral blood flow and dopamine release. Activates basal ganglia motor loop.',
      duration: 20,
      xp: 15,
      targetReps: 12,
      sequence: ['open'],
      instruction: '<span class="finger-name">Open</span> your hand wide then <span class="target-name">close</span> into a fist',
      check: function(landmarks, idx) {
        // fingertip -> wrist distance in hand-widths: ~1.7+ splayed open, ~1.0 curled
        const tips = [8, 12, 16, 20];
        const d = tips.map(t => relDist(landmarks, t, 0));
        if (idx % 2 === 0) {
          return Math.min.apply(null, d) > 1.45;   // hand open wide
        } else {
          return Math.max.apply(null, d) < 1.15;   // closed into a fist
        }
      }
    }
  };

  // ─── STATE ───
  let handDetector = null;
  let handTracking = false;
  let currentExercise = 'tapping';
  let exerciseRunning = false;
  let exerciseTimer = null;
  let stepIndex = 0;
  let repCount = 0;
  let correctSteps = 0;
  let totalSteps = 0;
  let exerciseStartTime = null;
  let stepStartTime = null;
  let inCorrectZone = false;
  let zoneHoldFrames = 0;
  const ZONE_HOLD_FRAMES = 5;
  const GOOD_STEP_FRAMES = 50;   // ~1.7s @30fps: a comfortably-paced rep = 100%
  let elapsedTicker = null;      // shows time spent (informational only)
  let attemptFrames = 0;         // frames spent hunting for the current step
  let repTimes = [];             // ms taken per completed rep
  let stepAccuracy = [];         // 0-1 cleanliness score for each completed step

  function fmtSecs(s){
    const m = Math.floor(s/60), r = s%60;
    return m > 0 ? m+'m '+String(r).padStart(2,'0')+'s' : r+'s';
  }

  /* Ticker shows elapsed time + the suggested target, so users still get a
     sense of pace now that nothing force-ends the session. */
  function updateElapsed(){
    if(!exerciseRunning || !exerciseStartTime) return;
    const ex = EXERCISES[currentExercise];
    const secs = Math.floor((Date.now()-exerciseStartTime)/1000);
    const el = document.getElementById('handTimer');
    if(el){
      el.textContent = fmtSecs(secs) + ' elapsed · target ~' + fmtSecs(ex.duration);
      el.style.color = secs > ex.duration ? 'var(--gold)' : 'var(--text-dim)';
    }
  }

  // Exercise stats
  let exStats = JSON.parse(localStorage.getItem('ff_exercise_stats') || '{}');
  if (!exStats.tapping) exStats = {tapping:0, opposition:0, roll:0, fist:0, total:0};

  const handVideo = document.getElementById('handVideo');
  const handOverlay = document.getElementById('handOverlay');
  const handCtx = handOverlay ? handOverlay.getContext('2d') : null;
  const handStatus = document.getElementById('handStatus');

  // ─── FINGER NAME MAP ───
  const FINGER_NAMES = {
    thumb: 'Thumb',
    index: 'Index Finger',
    middle: 'Middle Finger',
    ring: 'Ring Finger',
    pinky: 'Pinky Finger'
  };

  // ─── INITIALIZE HAND DETECTOR ───
  /* The old version put the TFJS fallback in the `else` of
     `typeof handPoseDetection !== 'undefined'` — so it only ran when the
     library was MISSING, and then immediately called a method on that missing
     library (plus referenced an undefined `model`). It was unreachable dead
     code. The fallback now correctly triggers when MediaPipe itself fails. */
  async function initHandDetector() {
    if (handDetector) return true;
    if (typeof handPoseDetection === 'undefined') {
      handStatus.textContent = '❌ Hand tracking library failed to load (check your connection)';
      return false;
    }
    const model = handPoseDetection.SupportedModels.MediaPipeHands;

    handStatus.textContent = '⏳ Loading hand tracking AI...';
    try {
      handDetector = await handPoseDetection.createDetector(model, {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
        modelType: 'full'
      });
      handStatus.textContent = '✅ Hand AI ready!';
      handStatus.style.color = 'var(--secondary)';
      return true;
    } catch(e) {
      console.warn('MediaPipe hand runtime failed, falling back to TFJS:', e);
      handStatus.textContent = '⏳ Trying TFJS fallback...';
      try {
        handDetector = await handPoseDetection.createDetector(model, {
          runtime: 'tfjs',
          modelType: 'full'
        });
        handStatus.textContent = '✅ Hand AI ready! (TFJS mode)';
        handStatus.style.color = 'var(--secondary)';
        return true;
      } catch(e2) {
        handStatus.textContent = '❌ Hand model failed to load: ' + e2.message;
        console.error('Hand detector fallback error:', e2);
        return false;
      }
    }
  }

  // ─── START CAMERA ───
  let handStream = null;
  async function startHandCamera() {
    try {
      if (handStream) {
        handStream.getTracks().forEach(t => t.stop());
      }
      handStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } },
        audio: false
      });
      handVideo.srcObject = handStream;
      await handVideo.play();
      return true;
    } catch(e) {
      handStatus.textContent = '❌ Camera error: ' + e.message;
      return false;
    }
  }

  // ─── SELECT EXERCISE ───
  function selectExercise(id) {
    currentExercise = id;
    document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('active', 'completed'));
    document.getElementById('ex-card-' + id).classList.add('active');
    resetHandExercise();
  }

  document.querySelectorAll('.exercise-card').forEach(card => {
    card.addEventListener('click', function() {
      selectExercise(this.dataset.exercise);
    });
  });

  // ─── HAND TRACKING LOOP ───
  /* COORDINATE SPACES — the bug that made the skeleton invisible:
     hand-pose-detection returns `keypoints` in IMAGE PIXEL space (e.g. x=0..640),
     not normalised 0..1. The old code drew at `p.x * canvas.width`, i.e.
     640 * 640 = 409,600px — every joint landed far off-canvas, so nothing was
     ever visible. Pixels are now used directly for drawing, and a separate
     normalised (0..1) copy is handed to the exercise checks, whose thresholds
     (dist < 0.05 etc.) were written for normalised units. */
  async function trackHand(){
    try{
      if(!handDetector||!handTracking||!handVideo.videoWidth){requestAnimationFrame(trackHand);return}
      handOverlay.width=handVideo.videoWidth;
      handOverlay.height=handVideo.videoHeight;
      var W=handOverlay.width,H=handOverlay.height;
      handCtx.clearRect(0,0,W,H);
      var hands=await handDetector.estimateHands(handVideo,{flipHorizontal:false});
      if(hands&&hands.length>0){
        var kps=hands[0].keypoints;

        // Some runtimes hand back normalised coords — detect and scale up.
        var maxX=0,maxY=0;
        for(var m=0;m<kps.length;m++){
          if(kps[m].x>maxX)maxX=kps[m].x;
          if(kps[m].y>maxY)maxY=kps[m].y;
        }
        var norm=(maxX<=1.5&&maxY<=1.5);
        var px=kps.map(function(p){return {x:norm?p.x*W:p.x, y:norm?p.y*H:p.y};});

        var conns=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
        handCtx.strokeStyle='rgba(108,92,231,0.85)';handCtx.lineWidth=3;
        handCtx.lineCap='round';handCtx.lineJoin='round';
        for(var cx=0;cx<conns.length;cx++){
          var a=px[conns[cx][0]],b=px[conns[cx][1]];
          if(a&&b){handCtx.beginPath();handCtx.moveTo(a.x,a.y);handCtx.lineTo(b.x,b.y);handCtx.stroke();}
        }
        // every joint
        for(var lx=0;lx<px.length;lx++){
          handCtx.beginPath();handCtx.arc(px[lx].x,px[lx].y,3.5,0,Math.PI*2);
          handCtx.fillStyle='#fff';handCtx.fill();
        }
        // fingertips highlighted
        var tips=[4,8,12,16,20];
        for(var tx=0;tx<tips.length;tx++){
          var p=px[tips[tx]];
          if(p){
            handCtx.beginPath();handCtx.arc(p.x,p.y,7,0,Math.PI*2);
            handCtx.fillStyle='rgba(0,206,201,0.9)';handCtx.fill();
            handCtx.lineWidth=2;handCtx.strokeStyle='#fff';handCtx.stroke();
          }
        }

        if(exerciseRunning===true){
          // Normalise against hand SIZE, not frame size, so the thresholds hold
          // whether the hand is near or far from the lens.
          var lmNorm=[];
          for(var l=0;l<px.length;l++) lmNorm.push({x:px[l].x/W, y:px[l].y/H, z:(kps[l].z||0)/W});
          checkExerciseStep(lmNorm, px);
        }
      }else{
        handCtx.fillStyle='rgba(255,255,255,0.45)';
        handCtx.font='600 15px Outfit';handCtx.textAlign='center';
        handCtx.fillText('Show your hand to the camera',W/2,H/2);
      }
    }catch(e){/* frame drop — keep looping */}
    requestAnimationFrame(trackHand);
  }

  // ─── DRAW HAND SKELETON ───
  function drawHandSkeleton(landmarks) {
    const w = handOverlay.width, h = handOverlay.height;
    
    // Connections
    const connections = [
      [0,1],[1,2],[2,3],[3,4],           // thumb
      [0,5],[5,6],[6,7],[7,8],           // index
      [0,9],[9,10],[10,11],[11,12],      // middle
      [0,13],[13,14],[14,15],[15,16],    // ring
      [0,17],[17,18],[18,19],[19,20],    // pinky
      [5,9],[9,13],[13,17]               // palm
    ];
    
    connections.forEach(([i,j]) => {
      const p1 = landmarks[i], p2 = landmarks[j];
      handCtx.beginPath();
      handCtx.moveTo(p1.x * w, p1.y * h);
      handCtx.lineTo(p2.x * w, p2.y * h);
      handCtx.strokeStyle = 'rgba(108,92,231,0.25)';
      handCtx.lineWidth = 1.5;
      handCtx.stroke();
    });
    
    // Finger tips
    const tipIndices = [4, 8, 12, 16, 20];
    tipIndices.forEach(i => {
      const p = landmarks[i];
      handCtx.beginPath();
      handCtx.arc(p.x * w, p.y * h, 5, 0, 2 * Math.PI);
      handCtx.fillStyle = 'rgba(108,92,231,0.6)';
      handCtx.fill();
    });
    
    // All landmarks
    landmarks.forEach((p, i) => {
      handCtx.beginPath();
      handCtx.arc(p.x * w, p.y * h, 2, 0, 2 * Math.PI);
      handCtx.fillStyle = 'rgba(255,255,255,0.3)';
      handCtx.fill();
    });
  }

  // ─── CHECK EXERCISE STEP ───
  function checkExerciseStep(landmarks, px) {
    const ex = EXERCISES[currentExercise];
    if (!ex) return;

    const seq = ex.sequence;
    const stepIndex2 = stepIndex % seq.length;
    const finger = seq[stepIndex2];

    // Update hand visual
    updateHandVisual(finger);

    let isCorrect = false;
    if (currentExercise === 'fist') {
      isCorrect = ex.check(landmarks, stepIndex);
    } else {
      isCorrect = ex.check(landmarks, stepIndex2, finger);
    }

    /* Live on-canvas feedback: ring the finger the user is meant to move and
       colour it green once the pose is recognised, so it's obvious whether a
       rep is registering. */
    if (px && handCtx) {
      const tipMap = {index: 8, middle: 12, ring: 16, pinky: 20};
      const target = currentExercise === 'fist' ? null : tipMap[finger];
      if (target != null && px[target]) {
        handCtx.beginPath();
        handCtx.arc(px[target].x, px[target].y, 15, 0, Math.PI*2);
        handCtx.strokeStyle = isCorrect ? '#00CEC9' : 'rgba(253,203,110,0.9)';
        handCtx.lineWidth = 3;
        handCtx.stroke();
      }
      handCtx.font = '700 15px Outfit';
      handCtx.textAlign = 'left';
      handCtx.fillStyle = isCorrect ? '#00CEC9' : 'rgba(255,255,255,0.65)';
      handCtx.fillText(isCorrect ? '✓ HOLD' : '● move as instructed', 12, 24);
    }

    attemptFrames++;

    if (isCorrect) {
      inCorrectZone = true;
      zoneHoldFrames++;
      if (zoneHoldFrames >= ZONE_HOLD_FRAMES) {
        /* Step completed. Accuracy = how cleanly the pose was hit. The old
           code did correctSteps++ and totalSteps++ on this same line, so the
           ratio was always exactly 1 and every session scored 100%. We now
           compare frames spent searching against the ideal (ZONE_HOLD_FRAMES),
           which gives a score that actually reflects performance. */
        correctSteps++;
        totalSteps++;
        /* Full marks for any step landed within a comfortable window
           (~1.7s at 30fps), tapering after that. Scoring against the
           theoretical minimum instead would punish normal human reaction
           time and rate a perfectly good session at ~17%. */
        stepAccuracy.push(Math.max(0.25, Math.min(1, GOOD_STEP_FRAMES / Math.max(attemptFrames, GOOD_STEP_FRAMES))));
        attemptFrames = 0;
        const nowT = Date.now();
        repTimes.push(nowT - (stepStartTime || nowT));
        stepStartTime = nowT;
        stepIndex++;
        zoneHoldFrames = 0;
        inCorrectZone = false;
        
        if (currentExercise !== 'fist') {
          repCount = Math.floor(stepIndex / seq.length);
        } else {
          repCount = Math.floor(stepIndex / 2);
        }
        
        updateExerciseUI();
        
        // Check if target reps reached
        if (repCount >= ex.targetReps) {
          completeExercise();
          return;   // stop here, or the lines below overwrite the "complete" message
        }
      }
    } else {
      zoneHoldFrames = 0;
      if (inCorrectZone) {
        inCorrectZone = false;
      }
    }
    
    // Update score
    const score = currentScore();
    const fingerName = currentExercise === 'fist' ? '' : FINGER_NAMES[finger] || finger;
    const inst = ex.instruction.replace('{finger}', fingerName);
    document.getElementById('handInstruction').innerHTML = inst;
    document.getElementById('handScoreDisplay').textContent =
      'Reps: ' + repCount + '/' + ex.targetReps + ' · Score: ' + score + '%';
  }

  // ─── UPDATE HAND VISUAL ───
  function updateHandVisual(activeFinger) {
    const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    fingers.forEach(f => {
      const el = document.getElementById('finger-' + f);
      if (el) {
        el.classList.remove('active', 'targeted', 'correct');
        if (f === activeFinger) {
          el.classList.add('active');
        }
      }
    });
  }

  /* Mean cleanliness across completed steps. Replaces correctSteps/totalSteps,
     which incremented in lockstep and therefore always returned 100%. */
  function currentScore(){
    if(!stepAccuracy.length) return 0;
    const sum = stepAccuracy.reduce((a,b)=>a+b,0);
    return Math.max(1, Math.round((sum/stepAccuracy.length)*100));
  }

  // ─── UPDATE EXERCISE UI ───
  function updateExerciseUI() {
    const ex = EXERCISES[currentExercise];
    const progress = document.getElementById('handProgress');
    if (!progress) return;
    
    const totalDots = ex.targetReps;
    progress.innerHTML = '';
    for (let i = 0; i < totalDots; i++) {
      const dot = document.createElement('div');
      dot.className = 'exercise-dot';
      if (i < repCount) dot.classList.add('done');
      else if (i === repCount) dot.classList.add('current');
      progress.appendChild(dot);
    }
  }

  // ─── COMPLETE EXERCISE ───
  function completeExercise(partial) {
    exerciseRunning = false;
    clearTimeout(exerciseTimer);
    clearInterval(elapsedTicker); elapsedTicker = null;

    const ex = EXERCISES[currentExercise];
    const score = currentScore();
    const elapsedSecs = exerciseStartTime ? Math.round((Date.now()-exerciseStartTime)/1000) : 0;
    // Partial finishes (user stopped early) earn pro-rata XP instead of nothing.
    const doneRatio = Math.min(1, repCount / ex.targetReps);
    const earnedXp = Math.max(0, Math.round(ex.xp * (score/100) * (partial ? doneRatio : 1)));
    
    // Update stats
    exStats[currentExercise]++;
    exStats.total++;
    localStorage.setItem('ff_exercise_stats', JSON.stringify(exStats));
    
    // Add XP to main game (if function available)
    if (typeof addXp === 'function') {
      addXp(earnedXp);
    }
    if (typeof addStreak === 'function') {
      addStreak();
    }
    
    // Save to history
    try {
      const hist = JSON.parse(localStorage.getItem('ff_history') || '[]');
      hist.unshift({
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        method: '🧠 Brain Gym: ' + ex.name + (partial ? ' (partial)' : ''),
        // history renders this field as MINUTES — the old code stored
        // ex.duration (seconds), booking 30 minutes for a 30-second drill
        duration: Math.max(1, Math.round(elapsedSecs/60)),
        reps: repCount,
        score: score,
        highest: score,
        xp: earnedXp
      });
      if (hist.length > 100) hist.pop();
      localStorage.setItem('ff_history', JSON.stringify(hist));
    } catch(e) {}
    
    // Update tech stats
    updateExStatsDisplay();
    if (typeof updateHistoryDisplay === 'function') updateHistoryDisplay();
    if (typeof updateDashboardStats === 'function') updateDashboardStats();
    
    const avgRep = repTimes.length ? (repTimes.reduce((a,b)=>a+b,0)/repTimes.length/1000) : 0;

    if (partial) {
      document.getElementById('handInstruction').innerHTML =
        '⏹ <span style="color:var(--gold)">Stopped at ' + repCount + '/' + ex.targetReps + ' reps</span>';
      document.getElementById('handSubInstruction').innerHTML =
        'Score: ' + score + '% &middot; +' + earnedXp + ' XP &middot; ' + fmtSecs(elapsedSecs);
    } else {
      document.getElementById('handInstruction').innerHTML =
        '🎉 <span style="color:var(--secondary)">All ' + ex.targetReps + ' reps complete!</span>';
      document.getElementById('handSubInstruction').innerHTML =
        'Score: ' + score + '% &middot; +' + earnedXp + ' XP &middot; ' + fmtSecs(elapsedSecs) +
        (avgRep ? ' &middot; ' + avgRep.toFixed(1) + 's/rep' : '');
    }
    const tEl = document.getElementById('handTimer');
    if (tEl) tEl.textContent = '';
    document.getElementById('handScoreDisplay').textContent =
      'Reps: ' + repCount + '/' + ex.targetReps + ' · Score: ' + score + '%';

    // Mark card as completed
    document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('active'));
    if (!partial) document.getElementById('ex-card-' + currentExercise).classList.add('completed');

    document.getElementById('handStartBtn').textContent = '▶ Start Exercise';

    showNotif(partial ? '🧠 Brain Gym Stopped' : '🧠 Brain Gym Complete!',
      ex.name + ' — ' + repCount + '/' + ex.targetReps + ' reps · +' + earnedXp + ' XP · Score: ' + score + '%');
  }

  // ─── UPDATE STATS DISPLAY ───
  function updateExStatsDisplay() {
    document.getElementById('tap-stats').textContent = exStats.tapping + ' reps';
    document.getElementById('opp-stats').textContent = exStats.opposition + ' reps';
    document.getElementById('roll-stats').textContent = exStats.roll + ' reps';
    document.getElementById('fist-stats').textContent = exStats.fist + ' reps';
  }

  // ─── START EXERCISE ───
  window.startHandExercise = async function() {
    const btn0 = document.getElementById('handStartBtn');

    // Stopping needs no camera/model work — handle it before anything else.
    if (exerciseRunning) {
      clearInterval(elapsedTicker); elapsedTicker = null;
      if (repCount > 0) {
        // bank what was actually achieved instead of discarding it
        completeExercise(true);
      } else {
        exerciseRunning = false;
        clearTimeout(exerciseTimer);
        btn0.textContent = '▶ Start Exercise';
        document.getElementById('handInstruction').textContent = 'Exercise stopped';
      }
      return;
    }

    // Camera + model are requested HERE, on an explicit user gesture — never at page load.
    if (!handStream || !handVideo.srcObject) {
      handStatus.textContent = '📷 Requesting camera access...';
      try{
        handStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
        handVideo.srcObject = handStream;
        await handVideo.play();
      }catch(e2){
        handStatus.textContent = '❌ Camera access denied or unavailable: ' + e2.message;
        return;
      }
    }
    if (!handDetector) {
      const ok = await initHandDetector();
      if (!ok) return;
    }
    // wait briefly for the first frame so videoWidth is non-zero
    for (let i=0; i<40 && !handVideo.videoWidth; i++) await new Promise(r=>setTimeout(r,50));

    const btn = document.getElementById('handStartBtn');
    handStatus.textContent = '✅ Tracking your hand — follow the instructions';
    handStatus.style.color = 'var(--secondary)';

    handTracking = true;
    exerciseRunning = true;
    stepIndex = 0;
    repCount = 0;
    correctSteps = 0;
    totalSteps = 0;
    zoneHoldFrames = 0;
    inCorrectZone = false;
    exerciseStartTime = Date.now();
    stepStartTime = Date.now();
    attemptFrames = 0;
    repTimes = [];
    stepAccuracy = [];
    
    btn.textContent = '⏸ Pause';
    document.getElementById('handSubInstruction').innerHTML = 'Follow the instructions and move your fingers!';
    
    updateExerciseUI();
    
    /* NO hard countdown any more.
       This used to be a setTimeout that called completeExercise() after
       ex.duration seconds whether or not the reps were finished — and the
       budget was physically impossible (e.g. tapping allowed 30s for 40
       steps = 0.75s each, when a single step needs 5 held frames plus the
       finger movement). The timer always won, so the counter froze midway.
       The exercise now ends only when every rep is genuinely completed, or
       when the user presses Pause/Reset. ex.duration is kept purely as the
       "suggested time" shown on the cards. */
    clearTimeout(exerciseTimer);
    exerciseTimer = null;
    elapsedTicker = setInterval(updateElapsed, 1000);
    updateElapsed();

    // Start tracking if not already
    trackHand();
    
    document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('active'));
    document.getElementById('ex-card-' + currentExercise).classList.add('active');
  };

  // ─── RESET EXERCISE ───
  window.resetHandExercise = function() {
    exerciseRunning = false;
    handTracking = false;
    clearTimeout(exerciseTimer);
    clearInterval(elapsedTicker); elapsedTicker = null;
    attemptFrames = 0; repTimes = []; stepAccuracy = []; exerciseStartTime = null;
    const tEl0 = document.getElementById('handTimer'); if (tEl0) tEl0.textContent = '';
    // release the camera so the hardware light goes out
    if (handStream) { handStream.getTracks().forEach(t => t.stop()); handStream = null; }
    if (handVideo) handVideo.srcObject = null;
    if (handCtx && handOverlay) handCtx.clearRect(0,0,handOverlay.width,handOverlay.height);
    if (handStatus) { handStatus.textContent = '📷 Camera off — press Start Exercise to begin'; handStatus.style.color = ''; }
    stepIndex = 0;
    repCount = 0;
    correctSteps = 0;
    totalSteps = 0;
    zoneHoldFrames = 0;
    inCorrectZone = false;
    
    document.getElementById('handStartBtn').textContent = '▶ Start Exercise';
    document.getElementById('handInstruction').innerHTML = 'Select an exercise and press <strong>Start</strong>';
    document.getElementById('handSubInstruction').innerHTML = 'Your hand will be tracked in real-time';
    document.getElementById('handScoreDisplay').textContent =
      'Reps: 0/' + (EXERCISES[currentExercise] ? EXERCISES[currentExercise].targetReps : 0) + ' · Score: 0%';
    document.getElementById('handProgress').innerHTML = '';
    
    document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('active', 'completed'));
    document.getElementById('ex-card-' + currentExercise).classList.add('active');
  };

  // ─── INIT ───
  function init() {
    updateExStatsDisplay();
    /* Deliberately does NOT touch the camera or load the model here.
       Previously this awaited startHandCamera() on page load, which fired
       getUserMedia() before any user interaction — so the browser threw up a
       camera permission prompt the moment the site opened. Both the model and
       the camera are now acquired inside startHandExercise(), i.e. only after
       the user presses Start. */
    if (handStatus) {
      handStatus.textContent = '📷 Camera off — press Start Exercise to begin';
      handStatus.style.color = '';
    }
  }

  init();
})();
