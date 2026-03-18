(async function () {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#07000d";

  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap";
  document.head.appendChild(fontLink);

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

  const w = app.screen.width;
  const h = app.screen.height;

  const SONG_URL =
    "https://raw.githubusercontent.com/dmsatx357/whalers-test/main/THEMS%20THE%20BREAKS%20DIG%20MASTER%2001_07.mp3";

  const PALM_URL =
    "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/Palm%20tree.png";
  const CAR_URL =
    "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/car.png";
  const SKYLINE_URL =
    "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/skyline.png";
  const SUN_URL =
    "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/sun.png";
  const TANK_URL =
    "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/tank.png";

  const TIMES = {
    intro: 0,
    verse: 9,
    prechorus: 41,
    chorus1: 58,
    chorusOutro: 90,
    guitarSolo: 106,
    chorus2: 123,
    bridge: 139,
    outro: 164,
    end: 222
  };

  const horizonY = h * 0.81;
  const roadBottomLeft = w * 0.28;
  const roadBottomRight = w * 0.72;
  const roadTopLeft = w * 0.465;
  const roadTopRight = w * 0.535;

  let gameState = "title";
  let flashAlpha = 0;
  let targetX = w / 2;
  let stunnedUntil = 0;
  let gridScroll = 0;
  let spawnTimer = 0;
  let palmSpawnTimer = 0;
  let fogScroll = 0;
  let touchHeld = false;
  let touchSide = null;

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

  const SECTION_STYLE = {
    intro: {
      bg: 0x07000d,
      glow: 0.32,
      gridSpeed: 0.0035,
      gridAlpha: 0.28,
      obstacleSpeed: 0.0075,
      sun: 0.52,
      skyline: 0.42,
      flashTint: 0xffffff,
      fog: 0.55,
      palmRate: 80
    },
    verse: {
      bg: 0x0a0011,
      glow: 0.68,
      gridSpeed: 0.007,
      gridAlpha: 0.52,
      obstacleSpeed: 0.0105,
      sun: 0.82,
      skyline: 0.65,
      flashTint: 0xffffff,
      fog: 0.75,
      palmRate: 58
    },
    prechorus: {
      bg: 0x120016,
      glow: 1.0,
      gridSpeed: 0.010,
      gridAlpha: 0.68,
      obstacleSpeed: 0.0125,
      sun: 0.96,
      skyline: 0.84,
      flashTint: 0xffc8d8,
      fog: 0.95,
      palmRate: 48
    },
    chorus1: {
      bg: 0x180018,
      glow: 1.45,
      gridSpeed: 0.016,
      gridAlpha: 1.02,
      obstacleSpeed: 0.016,
      sun: 1.02,
      skyline: 1.0,
      flashTint: 0xff4fa3,
      fog: 1.2,
      palmRate: 38
    },
    chorusOutro: {
      bg: 0x130014,
      glow: 0.95,
      gridSpeed: 0.010,
      gridAlpha: 0.68,
      obstacleSpeed: 0.0115,
      sun: 0.82,
      skyline: 0.78,
      flashTint: 0xffdbe7,
      fog: 0.85,
      palmRate: 52
    },
    guitarSolo: {
      bg: 0x190014,
      glow: 1.65,
      gridSpeed: 0.020,
      gridAlpha: 1.12,
      obstacleSpeed: 0.0175,
      sun: 0.9,
      skyline: 0.86,
      flashTint: 0x9fd8ff,
      fog: 1.1,
      palmRate: 42
    },
    chorus2: {
      bg: 0x1a0019,
      glow: 1.6,
      gridSpeed: 0.018,
      gridAlpha: 1.08,
      obstacleSpeed: 0.017,
      sun: 1.04,
      skyline: 1.04,
      flashTint: 0xff4fa3,
      fog: 1.2,
      palmRate: 36
    },
    bridge: {
      bg: 0x050008,
      glow: 0.18,
      gridSpeed: 0.004,
      gridAlpha: 0.18,
      obstacleSpeed: 0.0085,
      sun: 0.28,
      skyline: 0.25,
      flashTint: 0xffffff,
      fog: 0.45,
      palmRate: 120
    },
    outro: {
      bg: 0x06000b,
      glow: 0.4,
      gridSpeed: 0.0045,
      gridAlpha: 0.28,
      obstacleSpeed: 0.007,
      sun: 0.4,
      skyline: 0.35,
      flashTint: 0xffffff,
      fog: 0.65,
      palmRate: 95
    }
  };

  const song = new Audio();
  song.src = SONG_URL;
  song.preload = "auto";
  song.crossOrigin = "anonymous";

  let audioCtx = null;
  let analyser = null;
  let freqData = null;
  let audioReady = false;
  let beat = 0;
  let low = 0;
  let mid = 0;
  let high = 0;

  function setupAudioAnalysis() {
    if (audioReady) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(song);
    analyser = new AnalyserNode(audioCtx, { fftSize: 256 });
    freqData = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    audioReady = true;
  }

  function updateAudioReactive() {
    if (!analyser || !freqData) {
      beat *= 0.9;
      low *= 0.9;
      mid *= 0.9;
      high *= 0.9;
      return;
    }

    analyser.getByteFrequencyData(freqData);

    let lowSum = 0, midSum = 0, highSum = 0;
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

  song.addEventListener("ended", () => {
    if (gameState === "playing") {
      gameState = "ended";
      endedScreen.visible = true;
    }
  });

  function startSong() {
    setupAudioAnalysis();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    song.currentTime = 0;
    song.play().catch(() => {});
  }

  function stopSong() {
    song.pause();
    song.currentTime = 0;
  }

  let palmTexture, carTexture, skylineTexture, sunTexture, tankTexture;
  [palmTexture, carTexture, skylineTexture, sunTexture, tankTexture] =
    await Promise.all([
      PIXI.Assets.load(PALM_URL),
      PIXI.Assets.load(CAR_URL),
      PIXI.Assets.load(SKYLINE_URL),
      PIXI.Assets.load(SUN_URL),
      PIXI.Assets.load(TANK_URL)
    ]);

  const world = new PIXI.Container();
  app.stage.addChild(world);
  const ui = new PIXI.Container();
  app.stage.addChild(ui);

  const sky = new PIXI.Graphics();
  sky.rect(0, 0, w, h).fill(0x07000d);
  world.addChild(sky);

  const megaGlow = new PIXI.Graphics();
  megaGlow
    .ellipse(w / 2, horizonY - 120, w * 0.42, h * 0.18)
    .fill({ color: 0x51103f, alpha: 0.14 });
  world.addChild(megaGlow);

  const sideGlowLeft = new PIXI.Graphics();
  sideGlowLeft
    .ellipse(w * 0.16, horizonY - 10, 220, 80)
    .fill({ color: 0x2b153d, alpha: 0.05 });
  world.addChild(sideGlowLeft);

  const sideGlowRight = new PIXI.Graphics();
  sideGlowRight
    .ellipse(w * 0.84, horizonY - 10, 220, 80)
    .fill({ color: 0x102842, alpha: 0.05 });
  world.addChild(sideGlowRight);

  const stars = new PIXI.Container();
  world.addChild(stars);
  for (let i = 0; i < 60; i++) {
    const star = new PIXI.Graphics();
    star.circle(0, 0, Math.random() * 1.6 + 0.3).fill(0xffffff);
    star.x = Math.random() * w;
    star.y = Math.random() * (horizonY - 140);
    star.alpha = Math.random() * 0.55 + 0.05;
    star.twinkleSpeed = Math.random() * 0.004 + 0.0015;
    star.offset = Math.random() * 1000;
    stars.addChild(star);
  }

  const sunGlow = new PIXI.Graphics();
  sunGlow.circle(w / 2, horizonY - 70, 128).fill({ color: 0x5f1636, alpha: 0.16 });
  world.addChild(sunGlow);

  const sun = new PIXI.Sprite(sunTexture);
  sun.anchor.set(0.5);
  sun.x = w / 2;
  sun.y = horizonY - 95;
  sun.scale.set(0.48);
  world.addChild(sun);

  const horizonFog = new PIXI.Graphics();
  horizonFog.rect(0, horizonY - 6, w, 18).fill({ color: 0x52112d, alpha: 0.1 });
  world.addChild(horizonFog);

  const skylineGlow = new PIXI.Graphics();
  skylineGlow.rect(0, horizonY - 22, w, 80).fill({ color: 0x3d0d2f, alpha: 0.08 });
  world.addChild(skylineGlow);

  const skyline = new PIXI.Sprite(skylineTexture);
  skyline.anchor.set(0.5, 0.5);
  skyline.x = w / 2;
  skyline.y = horizonY - 105;
  skyline.scale.set(0.78);
  world.addChild(skyline);

  const buildingLights = new PIXI.Graphics();
  function drawBuildingLights(intensity = 1) {
    buildingLights.clear();
    const dots = [
      [w * 0.16, horizonY - 90], [w * 0.16, horizonY - 65],
      [w * 0.32, horizonY - 125], [w * 0.32, horizonY - 95],
      [w * 0.43, horizonY - 155], [w * 0.43, horizonY - 125], [w * 0.43, horizonY - 95],
      [w * 0.64, horizonY - 135], [w * 0.64, horizonY - 105],
      [w * 0.84, horizonY - 120], [w * 0.84, horizonY - 90]
    ];
    for (const [x, y] of dots) {
      buildingLights.rect(x, y, 5, 8).fill({ color: 0x8dc9ff, alpha: 0.12 * intensity });
    }
  }
  world.addChild(buildingLights);

  const horizonGlow = new PIXI.Graphics();
  horizonGlow.rect(0, horizonY, w, 3).fill({ color: 0x6e1a3a, alpha: 0.7 });
  world.addChild(horizonGlow);

  const grid = new PIXI.Graphics();
  world.addChild(grid);

  function drawGrid(scroll, boost = 1) {
    grid.clear();
    for (let i = 0; i < 11; i++) {
      let t = (i / 11 + scroll) % 1;
      t = t * t;
      const y = lerp(horizonY, h, t);

      grid.moveTo(0, y);
      grid.lineTo(w, y);
      grid.stroke({
        color: 0x6c1b3b,
        width: lerp(1, 3.3, t),
        alpha: lerp(0.04, 0.22 * boost, t)
      });
    }

    const vanishX = w / 2;
    const rayCount = 18;
    for (let i = 0; i <= rayCount; i++) {
      const x = lerp(0, w, i / rayCount);
      grid.moveTo(vanishX, horizonY);
      grid.lineTo(x, h);
      grid.stroke({
        color: 0x17324d,
        width: 1,
        alpha: 0.08 * boost
      });
    }
  }

  const sideMotionLines = new PIXI.Graphics();
  world.addChild(sideMotionLines);

  function drawSideMotionLines(scroll, intensity = 1) {
    sideMotionLines.clear();

    for (let i = 0; i < 8; i++) {
      let t = (i / 8 + scroll) % 1;
      t = t * t;

      const y = lerp(horizonY + 10, h, t);
      const leftRoadX = lerp(roadTopLeft, roadBottomLeft, t);
      const rightRoadX = lerp(roadTopRight, roadBottomRight, t);

      sideMotionLines.moveTo(0, y);
      sideMotionLines.lineTo(leftRoadX - lerp(20, 60, t), y);
      sideMotionLines.moveTo(rightRoadX + lerp(20, 60, t), y);
      sideMotionLines.lineTo(w, y);

      sideMotionLines.stroke({
        color: 0x5e89b8,
        width: lerp(1, 3, t),
        alpha: lerp(0.04, 0.16 * intensity, t)
      });
    }
  }

  const fogBands = new PIXI.Graphics();
  world.addChild(fogBands);

  function drawFogBands(scroll, intensity = 1) {
    fogBands.clear();

    for (let i = 0; i < 4; i++) {
      const t = ((i / 4) + scroll) % 1;
      const depth = t * t;
      const y = lerp(horizonY + 10, h + 20, depth);
      const leftX = lerp(roadTopLeft, roadBottomLeft, depth);
      const rightX = lerp(roadTopRight, roadBottomRight, depth);

      fogBands.moveTo(leftX - 80, y);
      fogBands.lineTo(rightX + 80, y);
      fogBands.stroke({
        color: 0xffffff,
        width: lerp(4, 16, depth),
        alpha: lerp(0.01, 0.05 * intensity, depth)
      });
    }
  }

  const roadShadow = new PIXI.Graphics();
  roadShadow.moveTo(roadBottomLeft - 12, h);
  roadShadow.lineTo(roadTopLeft - 4, horizonY);
  roadShadow.lineTo(roadTopRight + 4, horizonY);
  roadShadow.lineTo(roadBottomRight + 12, h);
  roadShadow.closePath();
  roadShadow.fill({ color: 0x000000, alpha: 0.35 });
  world.addChild(roadShadow);

  const road = new PIXI.Graphics();
  road.moveTo(roadBottomLeft, h);
  road.lineTo(roadTopLeft, horizonY);
  road.lineTo(roadTopRight, horizonY);
  road.lineTo(roadBottomRight, h);
  road.closePath();
  road.fill(0x0f0f12);
  world.addChild(road);

  const roadSheen = new PIXI.Graphics();
  roadSheen.moveTo(w * 0.487, h);
  roadSheen.lineTo(w * 0.497, horizonY);
  roadSheen.lineTo(w * 0.503, horizonY);
  roadSheen.lineTo(w * 0.513, h);
  roadSheen.closePath();
  roadSheen.fill({ color: 0xffffff, alpha: 0.015 });
  world.addChild(roadSheen);

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

  const palmGlowContainer = new PIXI.Container();
  world.addChild(palmGlowContainer);

  const palmContainer = new PIXI.Container();
  world.addChild(palmContainer);
  const palms = [];

  function makePalm(side = "left") {
    const glow = new PIXI.Graphics();
    glow.circle(0, 0, 40).fill({
      color: side === "left" ? 0x7d193d : 0x294866,
      alpha: 0.18
    });

    const palm = new PIXI.Sprite(palmTexture);
    palm.anchor.set(0.5, 1);

    const item = { side, progress: 0, glow, palm };
    palmGlowContainer.addChild(glow);
    palmContainer.addChild(palm);
    palms.push(item);
  }

  const smokeContainer = new PIXI.Container();
  world.addChild(smokeContainer);
  const smokePuffs = [];

  function spawnSmoke() {
    const puff = new PIXI.Graphics();
    puff.circle(0, 0, 12).fill({ color: 0xffffff, alpha: 0.18 });
    puff.x = car.x + (Math.random() * 24 - 12);
    puff.y = car.y + 26;
    puff.vx = Math.random() * 0.6 - 0.3;
    puff.vy = -0.7 - Math.random() * 0.5;
    puff.life = 1;
    smokeContainer.addChild(puff);
    smokePuffs.push(puff);
  }

  const carGlow = new PIXI.Graphics();
  world.addChild(carGlow);

  const car = new PIXI.Sprite(carTexture);
  car.anchor.set(0.5, 0.5);
  car.x = w / 2;
  car.y = h - 54;
  car.scale.set(0.16);
  world.addChild(car);

  carGlow.x = car.x;
  carGlow.y = car.y;

  const flash = new PIXI.Graphics();
  flash.rect(0, 0, w, h).fill(0xffffff);
  flash.alpha = 0;
  ui.addChild(flash);

  const scanlines = new PIXI.Graphics();
  for (let y = 0; y < h; y += 4) {
    scanlines.rect(0, y, w, 1).fill({ color: 0xffffff, alpha: 0.028 });
  }
  ui.addChild(scanlines);

  const vignette = new PIXI.Graphics();
  vignette.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.18 });
  ui.addChild(vignette);

  window.addEventListener("keydown", (e) => {
    if (gameState !== "playing") return;
    if (performance.now() < stunnedUntil) return;
    if (e.key === "ArrowLeft") targetX -= 130;
    if (e.key === "ArrowRight") targetX += 130;
    targetX = clamp(targetX, roadBottomLeft + 38, roadBottomRight - 38);
  });

  function handleTouchMove(clientX) {
    if (gameState !== "playing") return;
    if (performance.now() < stunnedUntil) return;

    if (clientX < w / 2) targetX -= 18;
    else targetX += 18;

    targetX = clamp(targetX, roadBottomLeft + 38, roadBottomRight - 38);
  }

  window.addEventListener("pointerdown", (e) => {
    if (gameState === "title") {
      startGame();
      return;
    }
    if (gameState === "ended") {
      restartGame();
      return;
    }

    touchHeld = true;
    touchSide = e.clientX < w / 2 ? "left" : "right";
    handleTouchMove(e.clientX);
  });

  window.addEventListener("pointermove", (e) => {
    if (!touchHeld || gameState !== "playing") return;
    touchSide = e.clientX < w / 2 ? "left" : "right";
  });

  window.addEventListener("pointerup", () => {
    touchHeld = false;
    touchSide = null;
  });

  window.addEventListener("pointercancel", () => {
    touchHeld = false;
    touchSide = null;
  });

  const obstacleContainer = new PIXI.Container();
  world.addChild(obstacleContainer);
  const obstacles = [];

  function getLaneX(lane, depth) {
    const top = [
      lerp(roadTopLeft, roadTopRight, 0.12),
      lerp(roadTopLeft, roadTopRight, 0.32),
      lerp(roadTopLeft, roadTopRight, 0.50),
      lerp(roadTopLeft, roadTopRight, 0.68),
      lerp(roadTopLeft, roadTopRight, 0.88)
    ];

    const bottom = [
      lerp(roadBottomLeft, roadBottomRight, 0.08),
      lerp(roadBottomLeft, roadBottomRight, 0.30),
      lerp(roadBottomLeft, roadBottomRight, 0.50),
      lerp(roadBottomLeft, roadBottomRight, 0.70),
      lerp(roadBottomLeft, roadBottomRight, 0.92)
    ];

    return lerp(top[lane], bottom[lane], depth);
  }

  function makeEmpGraphic() {
    const g = new PIXI.Graphics();
    g.kind = "emp";
    g.jitter = Math.random() * 1000;

    g.redraw = function () {
      g.clear();
      g.circle(0, 0, 12).fill({ color: 0x8fd8ff, alpha: 0.10 });

      for (let bolt = 0; bolt < 3; bolt++) {
        let x = 0;
        let y = -18 + bolt * 6;
        g.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
          x += (Math.random() - 0.5) * 14;
          y += 8;
          g.lineTo(x, y);
        }
        g.stroke({ color: 0xb8f1ff, width: 3, alpha: 0.95 });
      }
    };

    g.redraw();
    return g;
  }

  function makeTankSprite() {
    const wrap = new PIXI.Container();

    const glow = new PIXI.Graphics();
    glow.circle(0, 0, 34).fill({ color: 0xff4fa3, alpha: 0.10 });
    wrap.addChild(glow);

    const tank = new PIXI.Sprite(tankTexture);
    tank.anchor.set(0.5, 0.5);
    tank.tint = 0xdcdcdc;
    wrap.addChild(tank);

    wrap.kind = "tank";
    wrap.tankSprite = tank;
    return wrap;
  }

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * 5);
    const useTank = Math.random() > 0.5;
    const sprite = useTank ? makeTankSprite() : makeEmpGraphic();

    sprite.lane = lane;
    sprite.progress = 0;
    sprite.hit = false;

    obstacleContainer.addChild(sprite);
    obstacles.push(sprite);
  }

  function updateObstacle(o, speed, now) {
    o.progress += speed;
    const depth = o.progress * o.progress;
    o.x = getLaneX(o.lane, depth);
    o.y = lerp(horizonY + 12, h + 70, depth);

    if (o.kind === "tank") {
      const s = lerp(0.015, 0.14, depth);
      o.scale.set(s);
      o.alpha = lerp(0.5, 1, depth);
      if (o.tankSprite) {
        o.tankSprite.tint = 0xdcdcdc;
      }
    } else {
      const s = lerp(0.18, 1.6, depth);
      o.scale.set(s);
      o.alpha = lerp(0.4, 1, depth);

      if (Math.random() < 0.18) {
        o.redraw();
      }

      o.rotation = Math.sin(now * 0.01 + o.jitter) * 0.06;
    }
  }

  function isColliding(a, b) {
    const aHalfW = 24;
    const aHalfH = 38;

    const bScale = b.scale.x || 1;
    const bHalfW = b.kind === "tank" ? 220 * bScale : 18 * bScale;
    const bHalfH = b.kind === "tank" ? 120 * bScale : 24 * bScale;

    return (
      Math.abs(a.x - b.x) < aHalfW + bHalfW &&
      Math.abs(a.y - b.y) < aHalfH + bHalfH
    );
  }

  const titleScreen = new PIXI.Container();
  ui.addChild(titleScreen);

  const titleFade = new PIXI.Graphics();
  titleFade.rect(0, 0, w, h).fill({ color: 0x050008, alpha: 0.55 });
  titleScreen.addChild(titleFade);

  const titleBoxGlow = new PIXI.Graphics();
  titleBoxGlow.roundRect(w / 2 - 260, h / 2 - 150, 520, 280, 26).fill({ color: 0x7d193d, alpha: 0.06 });
  titleScreen.addChild(titleBoxGlow);

  const titleBox = new PIXI.Graphics();
  titleBox.roundRect(w / 2 - 245, h / 2 - 135, 490, 250, 24).fill({ color: 0x0b0610, alpha: 0.84 });
  titleBox.stroke({ color: 0x294866, width: 2, alpha: 0.55 });
  titleScreen.addChild(titleBox);

  const titleBack = new PIXI.Text({
    text: "WHALERS",
    style: {
      fontFamily: "Orbitron, Arial",
      fontSize: 68,
      fontWeight: "900",
      fill: "#7d193d",
      letterSpacing: 8
    }
  });
  titleBack.anchor.set(0.5);
  titleBack.x = w / 2;
  titleBack.y = h / 2 - 58;
  titleBack.alpha = 0.16;
  titleBack.scale.set(1.08);
  titleScreen.addChild(titleBack);

  const titleMid = new PIXI.Text({
    text: "WHALERS",
    style: {
      fontFamily: "Orbitron, Arial",
      fontSize: 62,
      fontWeight: "900",
      fill: "#294866",
      letterSpacing: 8
    }
  });
  titleMid.anchor.set(0.5);
  titleMid.x = w / 2 + 2;
  titleMid.y = h / 2 - 60;
  titleMid.alpha = 0.18;
  titleScreen.addChild(titleMid);

  const titleMain = new PIXI.Text({
    text: "WHALERS",
    style: {
      fontFamily: "Orbitron, Arial",
      fontSize: 60,
      fontWeight: "900",
      fill: "#e9dbe1",
      stroke: "#7d193d",
      strokeThickness: 2,
      letterSpacing: 8
    }
  });
  titleMain.anchor.set(0.5);
  titleMain.x = w / 2;
  titleMain.y = h / 2 - 60;
  titleScreen.addChild(titleMain);

  const songGlow = new PIXI.Text({
    text: "THEMS THE BREAKS",
    style: {
      fontFamily: "Orbitron, Arial",
      fontSize: 30,
      fontWeight: "700",
      fill: "#7d193d",
      letterSpacing: 4
    }
  });
  songGlow.anchor.set(0.5);
  songGlow.x = w / 2;
  songGlow.y = h / 2 + 8;
  songGlow.alpha = 0.14;
  songGlow.scale.set(1.05);
  titleScreen.addChild(songGlow);

  const songTitle = new PIXI.Text({
    text: "THEMS THE BREAKS",
    style: {
      fontFamily: "Orbitron, Arial",
      fontSize: 28,
      fontWeight: "700",
      fill: "#93a7bf",
      stroke: "#050008",
      strokeThickness: 1,
      letterSpacing: 4
    }
  });
  songTitle.anchor.set(0.5);
  songTitle.x = w / 2;
  songTitle.y = h / 2 + 8;
  titleScreen.addChild(songTitle);

  const startGlow = new PIXI.Text({
    text: "PRESS START",
    style: {
      fontFamily: "Orbitron, Arial",
      fontSize: 24,
      fontWeight: "900",
      fill: "#294866",
      letterSpacing: 4
    }
  });
  startGlow.anchor.set(0.5);
  startGlow.x = w / 2;
  startGlow.y = h / 2 + 82;
  startGlow.alpha = 0.12;
  startGlow.scale.set(1.06);
  titleScreen.addChild(startGlow);

  const startText = new PIXI.Text({
    text: "PRESS START",
    style: {
      fontFamily: "Orbitron, Arial",
      fontSize: 22,
      fontWeight: "900",
      fill: "#d7d1d5",
      stroke: "#294866",
      strokeThickness: 2,
      letterSpacing: 4
    }
  });
  startText.anchor.set(0.5);
  startText.x = w / 2;
  startText.y = h / 2 + 82;
  titleScreen.addChild(startText);

  const endedScreen = new PIXI.Container();
  endedScreen.visible = false;
  ui.addChild(endedScreen);

  const endedFade = new PIXI.Graphics();
  endedFade.rect(0, 0, w, h).fill({ color: 0x040008, alpha: 0.5 });
  endedScreen.addChild(endedFade);

  const endedBox = new PIXI.Graphics();
  endedBox.roundRect(w / 2 - 210, h / 2 - 92, 420, 184, 22).fill({ color: 0x0b0610, alpha: 0.84 });
  endedBox.stroke({ color: 0x7d193d, width: 2, alpha: 0.6 });
  endedScreen.addChild(endedBox);

  const endedText = new PIXI.Text({
    text: "RUN IT BACK",
    style: {
      fontFamily: "Orbitron, Arial",
      fontSize: 34,
      fontWeight: "900",
      fill: "#e9dbe1",
      stroke: "#7d193d",
      strokeThickness: 2,
      letterSpacing: 4
    }
  });
  endedText.anchor.set(0.5);
  endedText.x = w / 2;
  endedText.y = h / 2 - 12;
  endedScreen.addChild(endedText);

  const replayText = new PIXI.Text({
    text: "CLICK TO REPLAY",
    style: {
      fontFamily: "Orbitron, Arial",
      fontSize: 18,
      fontWeight: "700",
      fill: "#93a7bf",
      letterSpacing: 3
    }
  });
  replayText.anchor.set(0.5);
  replayText.x = w / 2;
  replayText.y = h / 2 + 36;
  endedScreen.addChild(replayText);

  function clearObstacles() {
    for (const o of obstacles) obstacleContainer.removeChild(o);
    obstacles.length = 0;
  }

  function clearPalms() {
    for (const item of palms) {
      palmGlowContainer.removeChild(item.glow);
      palmContainer.removeChild(item.palm);
    }
    palms.length = 0;
  }

  function clearSmoke() {
    for (const puff of smokePuffs) smokeContainer.removeChild(puff);
    smokePuffs.length = 0;
  }

  function resetGame() {
    targetX = w / 2;
    car.x = w / 2;
    carGlow.x = car.x;
    car.alpha = 1;
    stunnedUntil = 0;
    flashAlpha = 0;
    spawnTimer = 0;
    palmSpawnTimer = 0;
    fogScroll = 0;
    beat = 0;
    low = 0;
    mid = 0;
    high = 0;
    clearObstacles();
    clearPalms();
    clearSmoke();
  }

  function startGame() {
    resetGame();
    titleScreen.visible = false;
    endedScreen.visible = false;
    gameState = "playing";
    startSong();
  }

  function restartGame() {
    stopSong();
    startGame();
  }

  app.ticker.add(() => {
    const now = performance.now();
    const time = song.currentTime || 0;
    const section = getSection(time);
    const cfg = SECTION_STYLE[section];

    updateAudioReactive();

    const liveBoost = 1 + beat * 0.7;
    const glowBoost = cfg.glow * liveBoost;

    sky.tint = cfg.bg;
    megaGlow.alpha = 0.05 + 0.11 * glowBoost + beat * 0.08;
    sideGlowLeft.alpha = 0.015 + 0.05 * glowBoost + low * 0.025;
    sideGlowRight.alpha = 0.015 + 0.05 * glowBoost + low * 0.025;

    for (const star of stars.children) {
      star.alpha =
        0.10 +
        Math.abs(Math.sin(now * star.twinkleSpeed + star.offset)) *
          (0.34 + high * 0.24);
      const tw =
        0.85 +
        Math.abs(Math.sin(now * (star.twinkleSpeed * 1.7) + star.offset)) * 0.8;
      star.scale.set(tw);
    }

    sun.tint = section === "bridge" ? 0x8c6088 : 0xffffff;
    const sunPulse = 1 + (0.006 + beat * 0.08) * cfg.sun;
    sun.scale.set(0.48 * sunPulse);
    sunGlow.scale.set(1 + 0.01 * cfg.sun + beat * 0.07);

    skyline.tint = section === "bridge" ? 0x8f89a2 : 0xffffff;
    skylineGlow.alpha = 0.03 + 0.09 * cfg.skyline + beat * 0.05;
    horizonFog.alpha = 0.03 + 0.08 * cfg.glow + mid * 0.05;
    horizonGlow.alpha = 0.28 + 0.22 * cfg.glow + beat * 0.12;

    drawBuildingLights(0.3 + cfg.skyline + high * 0.45);

    gridScroll += cfg.gridSpeed * (1 + beat * 0.4);
    if (gridScroll >= 1) gridScroll = 0;
    drawGrid(gridScroll, cfg.gridAlpha * (1 + beat * 0.25));
    drawSideMotionLines(gridScroll * 1.15, cfg.gridAlpha * 0.9);

    fogScroll += 0.0025 * cfg.fog * (1 + low * 0.25);
    if (fogScroll >= 1) fogScroll = 0;
    drawFogBands(fogScroll, cfg.fog);

    roadSheen.alpha = 0.01 + beat * 0.02;
    flash.tint = cfg.flashTint;

    titleBack.alpha = 0.12 + Math.sin(now * 0.003) * 0.04;
    titleMid.alpha = 0.12 + Math.sin(now * 0.004) * 0.05;
    songGlow.alpha = 0.08 + Math.sin(now * 0.0035) * 0.03;

    if (gameState === "title") {
      startGlow.alpha = 0.08 + Math.sin(now * 0.005) * 0.04;
      startText.alpha = 0.68 + Math.random() * 0.18;
    }

    if (gameState === "ended") {
      replayText.alpha = 0.65 + Math.sin(now * 0.004) * 0.18;
    }

    if (gameState !== "playing") {
      flashAlpha *= 0.88;
      flash.alpha = flashAlpha;
      return;
    }

    if (touchHeld && touchSide && now >= stunnedUntil) {
      targetX += touchSide === "left" ? -18 : 18;
      targetX = clamp(targetX, roadBottomLeft + 38, roadBottomRight - 38);
    }

    if (now < stunnedUntil) {
      car.alpha = 0.38 + Math.sin(now * 0.04) * 0.20;
      carGlow.alpha = 0.03 + Math.sin(now * 0.05) * 0.02;
    } else {
      car.alpha = 1;
      carGlow.alpha = 0.10 + beat * 0.10;
      car.x += (targetX - car.x) * 0.14;
      carGlow.x = car.x;
    }
    carGlow.y = car.y;

    if (Math.random() < 0.35) spawnSmoke();

    for (let i = smokePuffs.length - 1; i >= 0; i--) {
      const puff = smokePuffs[i];
      puff.x += puff.vx;
      puff.y += puff.vy;
      puff.scale.x = (puff.scale.x || 1) + 0.01;
      puff.scale.y = (puff.scale.y || 1) + 0.01;
      puff.life -= 0.02;
      puff.alpha = puff.life * 0.18;

      if (puff.life <= 0) {
        smokeContainer.removeChild(puff);
        smokePuffs.splice(i, 1);
      }
    }

    spawnTimer += 1;
    if (spawnTimer > lerp(88, 52, Math.min(cfg.obstacleSpeed / 0.018, 1))) {
      spawnObstacle();
      spawnTimer = 0;
    }

    palmSpawnTimer += 1;
    if (palmSpawnTimer > cfg.palmRate) {
      makePalm(Math.random() > 0.5 ? "left" : "right");
      palmSpawnTimer = 0;
    }

    for (let i = palms.length - 1; i >= 0; i--) {
      const item = palms[i];
      item.progress += 0.008 * (1 + beat * 0.2);

      const depth = item.progress * item.progress;
      const leftRoadX = lerp(roadTopLeft, roadBottomLeft, depth);
      const rightRoadX = lerp(roadTopRight, roadBottomRight, depth);
      const outsideOffset = lerp(34, 104, depth);

      const x = item.side === "left" ? leftRoadX - outsideOffset : rightRoadX + outsideOffset;
      const y = lerp(horizonY, h + 60, depth);

      item.palm.x = x;
      item.palm.y = y;
      item.glow.x = x;
      item.glow.y = y - 30;

      const s = lerp(0.035, 0.35, depth);
      item.palm.scale.set(s);
      item.palm.alpha = lerp(0.18, 0.95, depth);

      item.glow.scale.set(lerp(0.2, 1.5, depth));
      item.glow.alpha = lerp(0.04, 0.16, depth) * (1 + beat * 0.3);

      if (item.progress > 1.1) {
        palmGlowContainer.removeChild(item.glow);
        palmContainer.removeChild(item.palm);
        palms.splice(i, 1);
      }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      updateObstacle(o, cfg.obstacleSpeed * (1 + beat * 0.25), now);

      if (!o.hit && now >= stunnedUntil && isColliding(car, o)) {
        o.hit = true;
        stunnedUntil = now + 600;
        flashAlpha = 0.18 + beat * 0.22;
      }

      if (o.progress > 1.05) {
        obstacleContainer.removeChild(o);
        obstacles.splice(i, 1);
      }
    }

    if (section === "chorus1" || section === "chorus2" || section === "guitarSolo") {
      flashAlpha = Math.max(flashAlpha, beat * 0.04);
    }

    flashAlpha *= 0.87;
    if (flashAlpha < 0.01) flashAlpha = 0;
    flash.alpha = flashAlpha;
  });
})();
