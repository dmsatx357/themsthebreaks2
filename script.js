  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#07000d";
  document.body.style.touchAction = "none";
  document.body.tabIndex = 0;
  document.body.focus();

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const app = new PIXI.Application();
  await app.init({
    resizeTo: window,
    background: "#07000d",
    antialias: true
  });
  document.body.appendChild(app.canvas);
  app.canvas.style.display = "block";
  app.canvas.style.touchAction = "none";

  const w = app.screen.width;
  const h = app.screen.height;
  const isMobile = w < 768;

  const SONG_URL = "https://raw.githubusercontent.com/dmsatx357/whalers-test/main/THEMS%20THE%20BREAKS%20DIG%20MASTER%2001_07.mp3";
  const CAR_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/car.png";
  const SKYLINE_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/skyline.png";
  const SUN_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/sun.png";
  const LOGO_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/WHALERS%20logo.png";
  const COIN_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/neon_face_coin.png";
  const BEST_KEY = "whalers_best_coins_v4";

  const TIMES = {
    intro: 0,
    verse: 9,
    prechorus: 41,
    chorus1: 58,
    chorusOutro: 90,
    guitarSolo: 106,
    chorus2: 123,
    bridge: 139,
    outro: 164
  };

  const SECTION_PACING = {
    intro: { empEvery: 130, coinEvery: 150, cooldown: 34, speed: 0.0105 },
    verse: { empEvery: 108, coinEvery: 128, cooldown: 30, speed: 0.0115 },
    prechorus: { empEvery: 92, coinEvery: 132, cooldown: 28, speed: 0.0125 },
    chorus1: { empEvery: 76, coinEvery: 142, cooldown: 24, speed: 0.0145 },
    chorusOutro: { empEvery: 98, coinEvery: 126, cooldown: 28, speed: 0.0120 },
    guitarSolo: { empEvery: 86, coinEvery: 118, cooldown: 24, speed: 0.0140 },
    chorus2: { empEvery: 72, coinEvery: 136, cooldown: 22, speed: 0.0150 },
    bridge: { empEvery: 120, coinEvery: 108, cooldown: 30, speed: 0.0110 },
    outro: { empEvery: 112, coinEvery: 116, cooldown: 30, speed: 0.0105 }
  };

  const horizonY = h * 0.81;

  const roadBottomLeft = isMobile ? w * 0.12 : w * 0.28;
  const roadBottomRight = isMobile ? w * 0.88 : w * 0.72;
  const roadTopLeft = isMobile ? w * 0.40 : w * 0.465;
  const roadTopRight = isMobile ? w * 0.60 : w * 0.535;

  const laneTopFractions = isMobile
    ? [0.08, 0.29, 0.50, 0.71, 0.92]
    : [0.12, 0.32, 0.50, 0.68, 0.88];

  const laneBottomFractions = isMobile
    ? [0.05, 0.27, 0.50, 0.73, 0.95]
    : [0.08, 0.30, 0.50, 0.70, 0.92];

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function getSection(t) {
    if (t >= TIMES.outro) return "outro";
    if (t >= TIMES.bridge) return "bridge";
    if (t >= TIMES.chorus2) return "chorus2";
    if (t >= TIMES.guitarSolo) return "guitarSolo";
    if (t >= TIMES.chorusOutro) return "chorusOutro";
    if (t >= TIMES.chorus1) return "chorus1";
    if (t >= TIMES.prechorus) return "prechorus";
    if (t >= TIMES.verse) return "verse";
    return "intro";
  }

  function laneBottomX(lane) {
    return lerp(roadBottomLeft, roadBottomRight, laneBottomFractions[lane]);
  }

  function laneWorldX(lane, depth) {
    return lerp(
      lerp(roadTopLeft, roadTopRight, laneTopFractions[lane]),
      lerp(roadBottomLeft, roadBottomRight, laneBottomFractions[lane]),
      depth
    );
  }

  function getBestCoins() {
    try {
      return Number(localStorage.getItem(BEST_KEY) || 0);
    } catch {
      return 0;
    }
  }

  function saveBestCoins(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch {}
  }

  let bestCoins = getBestCoins();

  const song = new Audio(SONG_URL);
  song.preload = "auto";
  song.crossOrigin = "anonymous";
  song.playsInline = true;

  let audioCtx = null;
  let analyser = null;
  let freqData = null;
  let beat = 0;
  let low = 0;
  let mid = 0;
  let high = 0;
  let audioReady = false;

  function setupAudio() {
    if (audioReady) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(song);
    analyser = new AnalyserNode(audioCtx, { fftSize: 256 });
    freqData = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    audioReady = true;
  }

  async function primeAudio() {
    try {
      setupAudio();
      if (audioCtx && audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
    } catch (e) {
      console.log("audio prime blocked", e);
    }
  }

  async function startSong() {
    try {
      setupAudio();
      if (audioCtx && audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      if (song.paused) {
        await song.play();
      }
    } catch (e) {
      console.log("song blocked", e);
    }
  }

  function stopSong() {
    song.pause();
    song.currentTime = 0;
  }

  function updateAudio() {
    if (!analyser || !freqData) {
      beat *= 0.9;
      low *= 0.9;
      mid *= 0.9;
      high *= 0.9;
      return;
    }

    analyser.getByteFrequencyData(freqData);

    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    const n = freqData.length;

    for (let i = 0; i < n; i++) {
      const v = freqData[i] / 255;
      if (i < n * 0.18) lowSum += v;
      else if (i < n * 0.5) midSum += v;
      else highSum += v;
    }

    const lowAvg = lowSum / Math.max(1, Math.floor(n * 0.18));
    const midAvg = midSum / Math.max(1, Math.floor(n * 0.32));
    const highAvg = highSum / Math.max(1, Math.floor(n * 0.5));

    low = low * 0.76 + lowAvg * 0.24;
    mid = mid * 0.76 + midAvg * 0.24;
    high = high * 0.76 + highAvg * 0.24;

    const combined = low * 0.62 + mid * 0.25 + high * 0.13;
    beat = Math.max(beat * 0.78, combined);
  }

  function playCoinPing() {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = "square";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

      osc2.frequency.setValueAtTime(800, now);
      osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.18);
      osc2.stop(now + 0.18);
    } catch (e) {}
  }

  function playWhoosh() {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  const [carTexture, skylineTexture, sunTexture, logoTexture, coinTexture] =
    await Promise.all([
      PIXI.Assets.load(CAR_URL),
      PIXI.Assets.load(SKYLINE_URL),
      PIXI.Assets.load(SUN_URL),
      PIXI.Assets.load(LOGO_URL),
      PIXI.Assets.load(COIN_URL)
    ]);

  let gameState = "title";
  let currentLane = 2;
  let targetX = laneBottomX(currentLane);
  let stunnedUntil = 0;
  let gridScroll = 0;
  let hazardSpawnTimer = 0;
  let coinSpawnTimer = 0;
  let globalSpawnCooldown = 0;
  let flashAlpha = 0;
  let coinCount = 0;
  let shakeIntensity = 0;
  let glitchTimer = 0;
  let empWarningTimer = 0;
  let comboCount = 0;
  let bestCombo = 0;
  let comboFlash = 0;

  const world = new PIXI.Container();
  const ui = new PIXI.Container();
  app.stage.addChild(world);
  app.stage.addChild(ui);

  const sky = new PIXI.Graphics();
  world.addChild(sky);

  const stars = new PIXI.Container();
  world.addChild(stars);
  for (let i = 0; i < 60; i++) {
    const s = new PIXI.Graphics();
    s.circle(0, 0, Math.random() * 1.4 + 0.4).fill(0xffffff);
    s.x = Math.random() * w;
    s.y = Math.random() * (horizonY - 140);
    s.speed = Math.random() * 0.004 + 0.0015;
    s.offset = Math.random() * 1000;
    stars.addChild(s);
  }

  const sunGlow = new PIXI.Graphics();
  world.addChild(sunGlow);

  const sun = new PIXI.Sprite(sunTexture);
  sun.anchor.set(0.5);
  sun.x = w / 2;
  sun.y = horizonY - (isMobile ? 140 : 95);
  sun.scale.set(0.48);
  world.addChild(sun);

  const logoGlow = new PIXI.Graphics();
  world.addChild(logoGlow);

  const logo = new PIXI.Sprite(logoTexture);
  logo.anchor.set(0.5);
  logo.x = w / 2;
  logo.y = horizonY - 345;
  logo.scale.set(0.28);
  world.addChild(logo);

  const skyline = new PIXI.Sprite(skylineTexture);
  skyline.anchor.set(0.5, 0.5);
  skyline.x = w / 2;
  skyline.y = horizonY - 105;
  skyline.scale.set(0.78);
  world.addChild(skyline);

  const road = new PIXI.Graphics();
  road.moveTo(roadBottomLeft, h);
  road.lineTo(roadTopLeft, horizonY);
  road.lineTo(roadTopRight, horizonY);
  road.lineTo(roadBottomRight, h);
  road.closePath();
  road.fill(0x0f0f12);
  world.addChild(road);

  const leftEdge = new PIXI.Graphics();
  leftEdge.moveTo(roadBottomLeft, h);
  leftEdge.lineTo(roadTopLeft, horizonY);
  leftEdge.stroke({ color: 0x6e1a3a, width: 3, alpha: 0.9 });
  world.addChild(leftEdge);

  const rightEdge = new PIXI.Graphics();
  rightEdge.moveTo(roadBottomRight, h);
  rightEdge.lineTo(roadTopRight, horizonY);
  rightEdge.stroke({ color: 0x23456a, width: 3, alpha: 0.9 });
  world.addChild(rightEdge);

  const sideLines = new PIXI.Graphics();
  world.addChild(sideLines);

  function drawSideLines(scroll, section) {
    sideLines.clear();

    const isFinalRun = section === "outro";
    const baseColor = isFinalRun ? 0xb32f6a : 0x4f79b7;
    const flashColor = isFinalRun ? 0xff5b9f : 0xeafcff;
    const widthBoost = isFinalRun ? 1.25 : 1;

    for (let i = 0; i < 8; i++) {
      let t = (i / 8 + scroll) % 1;
      t = t * t;

      const y = lerp(horizonY + 10, h, t);
      const leftRoadX = lerp(roadTopLeft, roadBottomLeft, t);
      const rightRoadX = lerp(roadTopRight, roadBottomRight, t);
      const leftEnd = leftRoadX - lerp(20, 60, t);
      const rightStart = rightRoadX + lerp(20, 60, t);

      const baseAlpha = lerp(0.05, isFinalRun ? 0.26 : 0.18, t);
      const flashBoost = beat > 0.14
        ? (isFinalRun ? 0.28 + beat * 0.55 : 0.16 + beat * 0.38)
        : 0;
      const shouldFlash = i % 2 === 0 || beat > 0.22 || isFinalRun;

      sideLines.moveTo(0, y);
      sideLines.lineTo(leftEnd, y);
      sideLines.stroke({
        color: baseColor,
        width: lerp(1, 3 * widthBoost, t),
        alpha: baseAlpha
      });

      sideLines.moveTo(rightStart, y);
      sideLines.lineTo(w, y);
      sideLines.stroke({
        color: baseColor,
        width: lerp(1, 3 * widthBoost, t),
        alpha: baseAlpha
      });

      if (shouldFlash && beat > 0.10) {
        sideLines.moveTo(0, y);
        sideLines.lineTo(leftEnd, y);
        sideLines.stroke({
          color: flashColor,
          width: lerp(1.2, 3.4 * widthBoost, t),
          alpha: flashBoost
        });

        sideLines.moveTo(rightStart, y);
        sideLines.lineTo(w, y);
        sideLines.stroke({
          color: flashColor,
          width: lerp(1.2, 3.4 * widthBoost, t),
          alpha: flashBoost
        });
      }
    }
  }

  const car = new PIXI.Sprite(carTexture);
  car.anchor.set(0.5);
  car.x = targetX;
  car.y = h - (isMobile ? 72 : 54);
  car.scale.set(isMobile ? 0.18 : 0.16);
  car.bump = 0;
  world.addChild(car);

  const smokeContainer = new PIXI.Container();
  world.addChild(smokeContainer);
  const smoke = [];

  function spawnSmoke() {
    const puff = new PIXI.Graphics();
    puff.circle(0, 0, 12).fill({ color: 0xffffff, alpha: 0.16 });
    puff.x = car.x + (Math.random() * 24 - 12);
    puff.y = car.y + 24;
    puff.vx = Math.random() * 0.6 - 0.3;
    puff.vy = -0.8 - Math.random() * 0.4;
    puff.life = 1;
    smokeContainer.addChild(puff);
    smoke.push(puff);
  }

  const obstacleContainer = new PIXI.Container();
  const fxContainer = new PIXI.Container();
  world.addChild(obstacleContainer);
  ui.addChild(fxContainer);

  const obstacles = [];
  const pickupBursts = [];
  const floatingTexts = [];

  function spawnCoinBurst(x, y) {
    for (let i = 0; i < 10; i++) {
      const spark = new PIXI.Graphics();
      spark.circle(0, 0, Math.random() * 3 + 1.5).fill(
        i % 2 === 0 ? 0xfff7b2 : 0xff8fd2
      );
      spark.x = x;
      spark.y = y;
      spark.vx = (Math.random() - 0.5) * 5.5;
      spark.vy = (Math.random() - 0.5) * 5.5 - 1;
      spark.life = 1;
      fxContainer.addChild(spark);
      pickupBursts.push(spark);
    }

    const txt = new PIXI.Text({
      text: "+1",
      style: {
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: "900",
        fill: "#fff5bf",
        stroke: "#ff4fa3",
        strokeThickness: 2
      }
    });
    txt.anchor.set(0.5);
    txt.x = x;
    txt.y = y - 10;
    txt.life = 1;
    txt.vy = -1.1;
    fxContainer.addChild(txt);
    floatingTexts.push(txt);
  }

  function makeEMP() {
    const g = new PIXI.Graphics();
    g.kind = "emp";
    g.redraw = () => {
      g.clear();
      for (let i = 0; i < 3; i++) {
        let x = 0;
        let y = -20;
        g.moveTo(x, y);
        for (let j = 0; j < 6; j++) {
          x += (Math.random() - 0.5) * 15;
          y += 8;
          g.lineTo(x, y);
        }
        g.stroke({ color: 0xb8f1ff, width: 3, alpha: 0.95 });
      }
    };
    g.redraw();
    return g;
  }

  function makeCoin() {
    const wrap = new PIXI.Container();

    const glow = new PIXI.Graphics();
    glow.circle(0, 0, 40).fill({ color: 0xfff2a8, alpha: 0.14 });
    wrap.addChild(glow);

    const coin = new PIXI.Sprite(coinTexture);
    coin.anchor.set(0.5);
    wrap.addChild(coin);

    wrap.kind = "coin";
    wrap.coin = coin;
    wrap.glow = glow;
    wrap.spinOffset = Math.random() * 1000;
    return wrap;
  }

  function spawnEMP() {
    const lane = Math.floor(Math.random() * 5);
    const obj = makeEMP();
    obj.lane = lane;
    obj.progress = 0;
    obj.hit = false;
    obstacleContainer.addChild(obj);
    obstacles.push(obj);
  }

  function spawnCoin() {
    const lane = Math.floor(Math.random() * 5);
    const obj = makeCoin();
    obj.lane = lane;
    obj.progress = 0;
    obj.hit = false;
    obstacleContainer.addChild(obj);
    obstacles.push(obj);
  }

  function updateObstacle(o, speed, now) {
    o.progress += speed;
    const depth = o.progress * o.progress;
    o.x = laneWorldX(o.lane, depth);
    o.y = lerp(horizonY + 12, h + 70, depth);

    if (o.kind === "coin") {
      const s = lerp(0.03, 0.18, depth);
      o.scale.set(s);
      o.alpha = lerp(0.6, 1, depth);
      o.rotation = Math.sin(now * 0.01 + o.spinOffset) * 0.15;
      o.coin.scale.x = 0.9 + Math.abs(Math.sin(now * 0.012 + o.spinOffset)) * 0.35;
      o.glow.alpha = lerp(0.10, 0.22, depth) * (1 + beat * 0.18);
    } else {
      const s = lerp(0.18, 1.6, depth);
      o.scale.set(s);
      o.alpha = lerp(0.4, 1, depth);
      if (Math.random() < 0.18) o.redraw();
      o.rotation = Math.sin(now * 0.01) * 0.06;
    }
  }

  function isColliding(a, b) {
    const aHalfW = isMobile ? 30 : 24;
    const aHalfH = isMobile ? 44 : 38;
    const bScale = b.scale.x || 1;
    const bHalfW = b.kind === "coin" ? 85 * bScale : 18 * bScale;
    const bHalfH = b.kind === "coin" ? 85 * bScale : 24 * bScale;

    return (
      Math.abs(a.x - b.x) < aHalfW + bHalfW &&
      Math.abs(a.y - b.y) < aHalfH + bHalfH
    );
  }

  const flash = new PIXI.Graphics();
  flash.rect(0, 0, w, h).fill(0xffffff);
  flash.alpha = 0;
  ui.addChild(flash);

  const glitchOverlay = new PIXI.Graphics();
  glitchOverlay.alpha = 0;
  ui.addChild(glitchOverlay);

  const warningOverlay = new PIXI.Graphics();
  warningOverlay.alpha = 0;
  ui.addChild(warningOverlay);

  const counterLabel = new PIXI.Text({
    text: "MITCH COINS",
    style: {
      fontFamily: "Arial",
      fontSize: 16,
      fontWeight: "700",
      fill: "#f3e9ff",
      letterSpacing: 2
    }
  });
  counterLabel.x = 22;
  counterLabel.y = 18;
  ui.addChild(counterLabel);

  const counterValue = new PIXI.Text({
    text: "0",
    style: {
      fontFamily: "Arial",
      fontSize: 34,
      fontWeight: "900",
      fill: "#ffffff",
      stroke: "#ff4fa3",
      strokeThickness: 2
    }
  });
  counterValue.x = 20;
  counterValue.y = 36;
  ui.addChild(counterValue);

  const bestLabel = new PIXI.Text({
    text: "BEST",
    style: {
      fontFamily: "Arial",
      fontSize: 16,
      fontWeight: "700",
      fill: "#f3e9ff",
      letterSpacing: 2
    }
  });
  bestLabel.anchor.set(1, 0);
  bestLabel.x = w - 22;
  bestLabel.y = 18;
  ui.addChild(bestLabel);

  const bestValue = new PIXI.Text({
    text: String(bestCoins),
    style: {
      fontFamily: "Arial",
      fontSize: 34,
      fontWeight: "900",
      fill: "#ffffff",
      stroke: "#69d5ff",
      strokeThickness: 2
    }
  });
  bestValue.anchor.set(1, 0);
  bestValue.x = w - 20;
  bestValue.y = 36;
  ui.addChild(bestValue);

  const comboLabel = new PIXI.Text({
    text: "COMBO",
    style: {
      fontFamily: "Arial",
      fontSize: 14,
      fontWeight: "700",
      fill: "#f3e9ff",
      letterSpacing: 2
    }
  });
  comboLabel.anchor.set(0.5, 0);
  comboLabel.x = w / 2;
  comboLabel.y = 18;
  ui.addChild(comboLabel);

  const comboValue = new PIXI.Text({
    text: "x0",
    style: {
      fontFamily: "Arial",
      fontSize: 28,
      fontWeight: "900",
      fill: "#fff7bf",
      stroke: "#ff4fa3",
      strokeThickness: 2
    }
  });
  comboValue.anchor.set(0.5, 0);
  comboValue.x = w / 2;
  comboValue.y = 34;
  ui.addChild(comboValue);

  const mobileControls = new PIXI.Container();
  ui.addChild(mobileControls);
  mobileControls.visible = false;

  const leftButton = new PIXI.Graphics();
  const rightButton = new PIXI.Graphics();

  function drawMobileButtons(leftActive = false, rightActive = false) {
    leftButton.clear();
    rightButton.clear();

    leftButton.roundRect(18, h - 92, 74, 58, 16).fill({
      color: leftActive ? 0x4fc3ff : 0xffffff,
      alpha: leftActive ? 0.18 : 0.08
    });
    leftButton.stroke({
      color: leftActive ? 0xeafcff : 0x7fdcff,
      width: 2,
      alpha: leftActive ? 0.7 : 0.35
    });

    rightButton.roundRect(w - 92, h - 92, 74, 58, 16).fill({
      color: rightActive ? 0x4fc3ff : 0xffffff,
      alpha: rightActive ? 0.18 : 0.08
    });
    rightButton.stroke({
      color: rightActive ? 0xeafcff : 0x7fdcff,
      width: 2,
      alpha: rightActive ? 0.7 : 0.35
    });
  }

  mobileControls.addChild(leftButton);
  mobileControls.addChild(rightButton);

  const leftArrow = new PIXI.Text({
    text: "◀",
    style: {
      fontFamily: "Arial",
      fontSize: 30,
      fontWeight: "900",
      fill: "#d7f4ff"
    }
  });
  leftArrow.anchor.set(0.5);
  leftArrow.x = 55;
  leftArrow.y = h - 63;
  mobileControls.addChild(leftArrow);

  const rightArrow = new PIXI.Text({
    text: "▶",
    style: {
      fontFamily: "Arial",
      fontSize: 30,
      fontWeight: "900",
      fill: "#d7f4ff"
    }
  });
  rightArrow.anchor.set(0.5);
  rightArrow.x = w - 55;
  rightArrow.y = h - 63;
  mobileControls.addChild(rightArrow);

  const titleScreen = new PIXI.Container();
  ui.addChild(titleScreen);

  const titleFade = new PIXI.Graphics();
  titleFade.rect(0, 0, w, h).fill({ color: 0x050008, alpha: 0.60 });
  titleScreen.addChild(titleFade);

  const titleBox = new PIXI.Graphics();
  titleBox.roundRect(w / 2 - 290, h / 2 - 185, 580, 380, 24).fill({ color: 0x0b0610, alpha: 0.88 });
  titleBox.stroke({ color: 0x294866, width: 2, alpha: 0.55 });
  titleScreen.addChild(titleBox);

  const title1 = new PIXI.Text({
    text: "WHALERS",
    style: {
      fontFamily: "Arial",
      fontSize: 58,
      fontWeight: "900",
      fill: "#e9dbe1",
      stroke: "#7d193d",
      strokeThickness: 2,
      letterSpacing: 8
    }
  });
  title1.anchor.set(0.5);
  title1.x = w / 2;
  title1.y = h / 2 - 120;
  titleScreen.addChild(title1);

  const title2 = new PIXI.Text({
    text: "THEMS THE BREAKS",
    style: {
      fontFamily: "Arial",
      fontSize: 26,
      fontWeight: "700",
      fill: "#93a7bf",
      letterSpacing: 4
    }
  });
  title2.anchor.set(0.5);
  title2.x = w / 2;
  title2.y = h / 2 - 70;
  titleScreen.addChild(title2);

  const instructions = new PIXI.Text({
    text: isMobile
      ? "TAP LEFT / RIGHT\nAVOID THE EMPs\nCOLLECT MITCH COINS"
      : "ARROW KEYS\nAVOID THE EMPs\nCOLLECT MITCH COINS",
    style: {
      fontFamily: "Arial",
      fontSize: 22,
      fontWeight: "700",
      fill: "#f2f2f2",
      align: "center",
      lineHeight: 34,
      letterSpacing: 1
    }
  });
  instructions.anchor.set(0.5);
  instructions.x = w / 2;
  instructions.y = h / 2 + 10;
  titleScreen.addChild(instructions);

  const titleBest = new PIXI.Text({
    text: `BEST COINS: ${bestCoins}`,
    style: {
      fontFamily: "Arial",
      fontSize: 22,
      fontWeight: "900",
      fill: "#fff5bf",
      stroke: "#ff4fa3",
      strokeThickness: 2,
      letterSpacing: 1
    }
  });
  titleBest.anchor.set(0.5);
  titleBest.x = w / 2;
  titleBest.y = h / 2 + 95;
  titleScreen.addChild(titleBest);

  const title3 = new PIXI.Text({
    text: "PRESS START",
    style: {
      fontFamily: "Arial",
      fontSize: 22,
      fontWeight: "900",
      fill: "#d7d1d5",
      letterSpacing: 4
    }
  });
  title3.anchor.set(0.5);
  title3.x = w / 2;
  title3.y = h / 2 + 150;
  titleScreen.addChild(title3);

  const endedScreen = new PIXI.Container();
  endedScreen.visible = false;
  ui.addChild(endedScreen);

  const endedFade = new PIXI.Graphics();
  endedFade.rect(0, 0, w, h).fill({ color: 0x040008, alpha: 0.55 });
  endedScreen.addChild(endedFade);

  const endedBox = new PIXI.Graphics();
  endedBox.roundRect(w / 2 - 250, h / 2 - 135, 500, 270, 22).fill({ color: 0x0b0610, alpha: 0.88 });
  endedBox.stroke({ color: 0x7d193d, width: 2, alpha: 0.6 });
  endedScreen.addChild(endedBox);

  const endedText = new PIXI.Text({
    text: "RUN IT BACK",
    style: {
      fontFamily: "Arial",
      fontSize: 34,
      fontWeight: "900",
      fill: "#e9dbe1",
      stroke: "#7d193d",
      strokeThickness: 2
    }
  });
  endedText.anchor.set(0.5);
  endedText.x = w / 2;
  endedText.y = h / 2 - 66;
  endedScreen.addChild(endedText);

  const endedScore = new PIXI.Text({
    text: "COINS: 0",
    style: {
      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: "900",
      fill: "#fff5bf",
      stroke: "#ff4fa3",
      strokeThickness: 2
    }
  });
  endedScore.anchor.set(0.5);
  endedScore.x = w / 2;
  endedScore.y = h / 2 - 18;
  endedScreen.addChild(endedScore);

  const endedBest = new PIXI.Text({
    text: `BEST: ${bestCoins}`,
    style: {
      fontFamily: "Arial",
      fontSize: 20,
      fontWeight: "900",
      fill: "#d9f6ff",
      stroke: "#23456a",
      strokeThickness: 2
    }
  });
  endedBest.anchor.set(0.5);
  endedBest.x = w / 2;
  endedBest.y = h / 2 + 18;
  endedScreen.addChild(endedBest);

  const endedCombo = new PIXI.Text({
    text: "BEST COMBO: 0",
    style: {
      fontFamily: "Arial",
      fontSize: 20,
      fontWeight: "900",
      fill: "#fff5bf",
      stroke: "#ff4fa3",
      strokeThickness: 2
    }
  });
  endedCombo.anchor.set(0.5);
  endedCombo.x = w / 2;
  endedCombo.y = h / 2 + 52;
  endedScreen.addChild(endedCombo);

  const endedBadge = new PIXI.Text({
    text: "",
    style: {
      fontFamily: "Arial",
      fontSize: 20,
      fontWeight: "900",
      fill: "#fff5bf",
      stroke: "#ff4fa3",
      strokeThickness: 2
    }
  });
  endedBadge.anchor.set(0.5);
  endedBadge.x = w / 2;
  endedBadge.y = h / 2 + 88;
  endedScreen.addChild(endedBadge);

  function updateBestDisplays() {
    bestValue.text = String(bestCoins);
    titleBest.text = `BEST COINS: ${bestCoins}`;
    endedBest.text = `BEST: ${bestCoins}`;
  }

  function maybeUpdateBest() {
    if (coinCount > bestCoins) {
      bestCoins = coinCount;
      saveBestCoins(bestCoins);
      updateBestDisplays();
      return true;
    }
    return false;
  }

  function clearAll() {
    for (const s of smoke) smokeContainer.removeChild(s);
    smoke.length = 0;

    for (const o of obstacles) obstacleContainer.removeChild(o);
    obstacles.length = 0;

    for (const p of pickupBursts) fxContainer.removeChild(p);
    pickupBursts.length = 0;

    for (const t of floatingTexts) fxContainer.removeChild(t);
    floatingTexts.length = 0;
  }

  async function startGame() {
    clearAll();
    currentLane = 2;
    targetX = laneBottomX(currentLane);
    car.x = targetX;
    car.bump = 0;
    stunnedUntil = 0;
    flashAlpha = 0;
    gridScroll = 0;
    hazardSpawnTimer = 0;
    coinSpawnTimer = 0;
    globalSpawnCooldown = 0;
    coinCount = 0;
    comboCount = 0;
    bestCombo = 0;
    comboFlash = 0;
    shakeIntensity = 0;
    glitchTimer = 0;
    empWarningTimer = 0;
    counterValue.text = "0";
    comboValue.text = "x0";
    endedBadge.text = "";
    gameState = "playing";
    titleScreen.visible = false;
    endedScreen.visible = false;
    mobileControls.visible = isMobile;
    await startSong();
  }

  async function restartGame() {
    stopSong();
    await startGame();
  }

  function moveLane(dir) {
    if (gameState !== "playing") return;
    if (performance.now() < stunnedUntil) return;

    const prevLane = currentLane;
    currentLane = clamp(currentLane + dir, 0, 4);

    if (currentLane !== prevLane) {
      targetX = laneBottomX(currentLane);
      playWhoosh();
      car.bump = 1;
    }
  }

  async function handlePress(clientX) {
    document.body.focus();
    await primeAudio();

    if (gameState === "title") {
      await startGame();
      return;
    }

    if (gameState === "ended") {
      await restartGame();
      return;
    }

    if (clientX < w / 2) moveLane(-1);
    else moveLane(1);
  }

  document.addEventListener("touchstart", primeAudio, { passive: true });
  document.addEventListener("click", primeAudio, { passive: true });

  document.addEventListener("keydown", async (e) => {
    if (audioCtx && audioCtx.state === "suspended") {
      try { await audioCtx.resume(); } catch {}
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveLane(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveLane(1);
    }
  });

  app.canvas.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await handlePress(e.clientX);
  });

  app.ticker.add(() => {
    const now = performance.now();
    const t = song.currentTime || 0;
    const section = getSection(t);
    const pacing = SECTION_PACING[section];

    updateAudio();

    let sectionSpeed = pacing.speed;
    if (t > 160) sectionSpeed *= 1.12;
    if (t > 180) sectionSpeed *= 1.18;
    if (t > 200) sectionSpeed *= 1.22;

    sky.clear();
    sky.rect(0, 0, w, h).fill(0x07000d);

    for (const s of stars.children) {
      s.alpha = 0.10 + Math.abs(Math.sin(now * s.speed + s.offset)) * 0.5;
      s.scale.set(0.9 + Math.abs(Math.sin(now * s.speed * 1.7 + s.offset)) * 0.7);
    }

    sun.scale.set(0.48 + beat * 0.08);

    sunGlow.clear();
    sunGlow.circle(w / 2, horizonY - 70, 128).fill({
      color: 0x5f1636,
      alpha: 0.16 + beat * 0.08
    });

    logoGlow.clear();
    logoGlow.circle(logo.x, logo.y + 6, 110).fill({
      color: 0xffffff,
      alpha: 0.05 + beat * 0.10
    });
    logo.alpha = 0.70 + beat * 0.25;
    logo.scale.set(0.28 + beat * 0.025);

    gridScroll += 0.008 * (1 + beat * 0.3);
    if (gridScroll >= 1) gridScroll = 0;
    drawSideLines(gridScroll, section);

    counterValue.text = String(coinCount);
    bestValue.text = String(bestCoins);

    comboFlash *= 0.88;
    const comboScale = 1 + comboFlash * 0.3;
    comboValue.text = `x${comboCount}`;
    comboValue.scale.set(comboScale);
    comboLabel.alpha = comboCount > 0 ? 1 : 0.45;
    comboValue.alpha = comboCount > 0 ? 1 : 0.55;

    if (isMobile) {
      mobileControls.visible = gameState === "playing";
      const pulse = 0.18 + Math.abs(Math.sin(now * 0.004)) * 0.10;
      const leftActive = car.bump > 0 && targetX < car.x;
      const rightActive = car.bump > 0 && targetX > car.x;
      drawMobileButtons(leftActive, rightActive);
      leftArrow.alpha = 0.78 + Math.abs(Math.sin(now * 0.005)) * 0.16;
      rightArrow.alpha = 0.78 + Math.abs(Math.sin(now * 0.005)) * 0.16;
      if (!leftActive && !rightActive) {
        leftButton.alpha = pulse;
        rightButton.alpha = pulse;
      }
    }

    if (gameState !== "playing") {
      flashAlpha *= 0.88;
      flash.alpha = flashAlpha;
      world.x = 0;
      world.y = 0;
      glitchOverlay.clear();
      glitchOverlay.alpha = 0;
      warningOverlay.clear();
      warningOverlay.alpha = 0;
      return;
    }

    car.x += (targetX - car.x) * (isMobile ? 0.24 : 0.18);

    if (car.bump) {
      car.bump *= 0.82;
      const squash = 1 + car.bump * 0.25;
      const stretch = 1 - car.bump * 0.15;
      car.scale.set(
        (isMobile ? 0.18 : 0.16) * squash,
        (isMobile ? 0.18 : 0.16) * stretch
      );
      if (car.bump < 0.02) {
        car.bump = 0;
        car.scale.set(isMobile ? 0.18 : 0.16);
      }
    }

    if (Math.random() < 0.35) spawnSmoke();
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.x += p.vx;
      p.y += p.vy;
      p.scale.x = (p.scale.x || 1) + 0.01;
      p.scale.y = (p.scale.y || 1) + 0.01;
      p.life -= 0.02;
      p.alpha = p.life * 0.18;
      if (p.life <= 0) {
        smokeContainer.removeChild(p);
        smoke.splice(i, 1);
      }
    }

    for (let i = pickupBursts.length - 1; i >= 0; i--) {
      const p = pickupBursts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= 0.035;
      p.alpha = Math.max(0, p.life);
      p.scale.set(0.9 + (1 - p.life) * 0.8);
      if (p.life <= 0) {
        fxContainer.removeChild(p);
        pickupBursts.splice(i, 1);
      }
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const txt = floatingTexts[i];
      txt.y += txt.vy;
      txt.life -= 0.025;
      txt.alpha = Math.max(0, txt.life);
      txt.scale.set(1 + (1 - txt.life) * 0.25);
      if (txt.life <= 0) {
        fxContainer.removeChild(txt);
        floatingTexts.splice(i, 1);
      }
    }

    if (globalSpawnCooldown > 0) globalSpawnCooldown -= 1;

    if (hazardSpawnTimer > pacing.empEvery - 16 && globalSpawnCooldown <= 0) {
      empWarningTimer = Math.max(empWarningTimer, 12);
    }

    hazardSpawnTimer += 1;
    if (hazardSpawnTimer > pacing.empEvery && globalSpawnCooldown <= 0) {
      spawnEMP();
      hazardSpawnTimer = 0;
      globalSpawnCooldown = pacing.cooldown;
      empWarningTimer = 0;
    }

    coinSpawnTimer += 1;
    if (coinSpawnTimer > pacing.coinEvery && globalSpawnCooldown <= 0) {
      spawnCoin();
      coinSpawnTimer = 0;
      globalSpawnCooldown = pacing.cooldown;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      updateObstacle(o, sectionSpeed * (1 + beat * 0.25), now);

      if (o.kind === "coin") {
        const dx = car.x - o.x;
        const dy = car.y - o.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          o.x += dx * 0.08;
          o.y += dy * 0.08;
        }
      }

      if (!o.hit && now >= stunnedUntil && isColliding(car, o)) {
        o.hit = true;

        if (o.kind === "coin") {
          coinCount += 1;
          comboCount += 1;
          bestCombo = Math.max(bestCombo, comboCount);
          comboFlash = 1;
          maybeUpdateBest();
          playCoinPing();
          spawnCoinBurst(o.x, o.y);
          obstacleContainer.removeChild(o);
          obstacles.splice(i, 1);
          continue;
        } else {
          stunnedUntil = now + 600;
          coinCount = 0;
          comboCount = 0;
          comboFlash = 0;
          flashAlpha = 0.24 + beat * 0.28;
          shakeIntensity = isMobile ? 16 : 12;
          glitchTimer = 220;
        }
      }

      if (o.progress > 1.05) {
        obstacleContainer.removeChild(o);
        obstacles.splice(i, 1);
      }
    }

    if (shakeIntensity > 0.05) {
      world.x = (Math.random() - 0.5) * shakeIntensity;
      world.y = (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity *= 0.82;
    } else {
      world.x = 0;
      world.y = 0;
      shakeIntensity = 0;
    }

    if (glitchTimer > 0) {
      glitchTimer -= app.ticker.deltaMS;
      glitchOverlay.clear();

      for (let i = 0; i < 7; i++) {
        const gh = 6 + Math.random() * 20;
        const gy = Math.random() * h;
        const gx = (Math.random() - 0.5) * 24;
        glitchOverlay.rect(gx, gy, w + 40, gh).fill({
          color: i % 2 === 0 ? 0xffffff : 0x7fdcff,
          alpha: 0.04 + Math.random() * 0.10
        });
      }
      glitchOverlay.alpha = glitchTimer / 220;
    } else {
      glitchOverlay.clear();
      glitchOverlay.alpha = 0;
    }

    if (empWarningTimer > 0) {
      empWarningTimer -= 1;
      warningOverlay.clear();
      const alpha = 0.06 + Math.abs(Math.sin(now * 0.04)) * 0.14;
      warningOverlay.rect(0, 0, w, h).fill({ color: 0xff4f8d, alpha: alpha * 0.12 });
      warningOverlay.alpha = 1;
    } else {
      warningOverlay.clear();
      warningOverlay.alpha = 0;
    }

    flashAlpha *= 0.87;
    if (flashAlpha < 0.01) flashAlpha = 0;
    flash.alpha = flashAlpha;
  });

  song.addEventListener("ended", () => {
    if (gameState === "playing") {
      const wasNewBest = maybeUpdateBest();
      endedScore.text = `COINS: ${coinCount}`;
      endedBest.text = `BEST: ${bestCoins}`;
      endedCombo.text = `BEST COMBO: ${bestCombo}`;
      endedBadge.text = wasNewBest ? "NEW BEST" : comboCount >= 10 ? "HOT STREAK" : "";
      gameState = "ended";
      endedScreen.visible = true;
      mobileControls.visible = false;
    }
  });

  updateBestDisplays();
  drawMobileButtons(false, false);
