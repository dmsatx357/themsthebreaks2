  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#07000d";

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

  const SONG_URL = "https://raw.githubusercontent.com/dmsatx357/whalers-test/main/THEMS%20THE%20BREAKS%20DIG%20MASTER%2001_07.mp3";
  const CAR_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/car.png";
  const SKYLINE_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/skyline.png";
  const SUN_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/sun.png";
  const LOGO_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/WHALERS%20logo.png";
  const COIN_URL = "https://raw.githubusercontent.com/dmsatx357/themsthebreaks2/main/neon_face_coin.png";

  const horizonY = h * 0.81;
  const roadBottomLeft = w * 0.28;
  const roadBottomRight = w * 0.72;
  const roadTopLeft = w * 0.465;
  const roadTopRight = w * 0.535;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

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

  function setupAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(song);
    analyser = new AnalyserNode(audioCtx, { fftSize: 256 });
    freqData = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  async function startSong() {
    try {
      setupAudio();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      await song.play();
    } catch (e) {
      console.log("song blocked", e);
    }
  }

  function stopSong() {
    song.pause();
    song.currentTime = 0;
  }

  function updateAudio() {
    if (!analyser) {
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

  const [carTexture, skylineTexture, sunTexture, logoTexture, coinTexture] =
    await Promise.all([
      PIXI.Assets.load(CAR_URL),
      PIXI.Assets.load(SKYLINE_URL),
      PIXI.Assets.load(SUN_URL),
      PIXI.Assets.load(LOGO_URL),
      PIXI.Assets.load(COIN_URL)
    ]);

  let gameState = "title";
  let targetX = w / 2;
  let stunnedUntil = 0;
  let gridScroll = 0;
  let hazardSpawnTimer = 0;
  let coinSpawnTimer = 0;
  let flashAlpha = 0;
  let touchHeld = false;
  let touchSide = null;
  let coinCount = 0;

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
  sun.y = horizonY - 95;
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

  function drawSideLines(scroll) {
    sideLines.clear();

    for (let i = 0; i < 8; i++) {
      let t = (i / 8 + scroll) % 1;
      t = t * t;

      const y = lerp(horizonY + 10, h, t);
      const leftRoadX = lerp(roadTopLeft, roadBottomLeft, t);
      const rightRoadX = lerp(roadTopRight, roadBottomRight, t);
      const leftEnd = leftRoadX - lerp(20, 60, t);
      const rightStart = rightRoadX + lerp(20, 60, t);

      const baseAlpha = lerp(0.05, 0.18, t);
      const flashBoost = beat > 0.14 ? (0.16 + beat * 0.38) : 0;
      const shouldFlash = i % 2 === 0 || beat > 0.22;

      sideLines.moveTo(0, y);
      sideLines.lineTo(leftEnd, y);
      sideLines.stroke({
        color: 0x4f79b7,
        width: lerp(1, 3, t),
        alpha: baseAlpha
      });

      sideLines.moveTo(rightStart, y);
      sideLines.lineTo(w, y);
      sideLines.stroke({
        color: 0x4f79b7,
        width: lerp(1, 3, t),
        alpha: baseAlpha
      });

      if (shouldFlash && beat > 0.14) {
        sideLines.moveTo(0, y);
        sideLines.lineTo(leftEnd, y);
        sideLines.stroke({
          color: 0xeafcff,
          width: lerp(1.2, 3.2, t),
          alpha: flashBoost
        });

        sideLines.moveTo(rightStart, y);
        sideLines.lineTo(w, y);
        sideLines.stroke({
          color: 0xeafcff,
          width: lerp(1.2, 3.2, t),
          alpha: flashBoost
        });
      }
    }
  }

  const car = new PIXI.Sprite(carTexture);
  car.anchor.set(0.5);
  car.x = w / 2;
  car.y = h - 54;
  car.scale.set(0.16);
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
  world.addChild(obstacleContainer);
  const obstacles = [];

  function laneX(lane, depth) {
    const top = [0.12, 0.32, 0.50, 0.68, 0.88];
    const bottom = [0.08, 0.30, 0.50, 0.70, 0.92];
    return lerp(
      lerp(roadTopLeft, roadTopRight, top[lane]),
      lerp(roadBottomLeft, roadBottomRight, bottom[lane]),
      depth
    );
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
    o.x = laneX(o.lane, depth);
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
    const aHalfW = 24;
    const aHalfH = 38;
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

  const titleScreen = new PIXI.Container();
  ui.addChild(titleScreen);

  const titleFade = new PIXI.Graphics();
  titleFade.rect(0, 0, w, h).fill({ color: 0x050008, alpha: 0.60 });
  titleScreen.addChild(titleFade);

  const titleBox = new PIXI.Graphics();
  titleBox.roundRect(w / 2 - 290, h / 2 - 170, 580, 340, 24).fill({ color: 0x0b0610, alpha: 0.88 });
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
  title1.y = h / 2 - 105;
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
  title2.y = h / 2 - 55;
  titleScreen.addChild(title2);

  const instructions = new PIXI.Text({
    text: "AVOID THE EMPs\nCOLLECT MITCH COINS\nHIT AN EMP AND YOU LOSE ALL COINS",
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
  instructions.y = h / 2 + 18;
  titleScreen.addChild(instructions);

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
  title3.y = h / 2 + 120;
  titleScreen.addChild(title3);

  const endedScreen = new PIXI.Container();
  endedScreen.visible = false;
  ui.addChild(endedScreen);

  const endedFade = new PIXI.Graphics();
  endedFade.rect(0, 0, w, h).fill({ color: 0x040008, alpha: 0.5 });
  endedScreen.addChild(endedFade);

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
  endedText.y = h / 2;
  endedScreen.addChild(endedText);

  function clearAll() {
    for (const s of smoke) smokeContainer.removeChild(s);
    smoke.length = 0;

    for (const o of obstacles) obstacleContainer.removeChild(o);
    obstacles.length = 0;
  }

  async function startGame() {
    clearAll();
    targetX = w / 2;
    car.x = w / 2;
    stunnedUntil = 0;
    flashAlpha = 0;
    gridScroll = 0;
    hazardSpawnTimer = 0;
    coinSpawnTimer = 0;
    coinCount = 0;
    counterValue.text = "0";
    gameState = "playing";
    titleScreen.visible = false;
    endedScreen.visible = false;
    await startSong();
  }

  async function restartGame() {
    stopSong();
    await startGame();
  }

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

  window.addEventListener("pointerdown", async (e) => {
    if (gameState === "title") {
      await startGame();
      return;
    }
    if (gameState === "ended") {
      await restartGame();
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

  app.ticker.add(() => {
    const now = performance.now();

    updateAudio();

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
    drawSideLines(gridScroll);

    counterValue.text = String(coinCount);

    if (gameState !== "playing") {
      flashAlpha *= 0.88;
      flash.alpha = flashAlpha;
      return;
    }

    if (touchHeld && touchSide && now >= stunnedUntil) {
      targetX += touchSide === "left" ? -18 : 18;
      targetX = clamp(targetX, roadBottomLeft + 38, roadBottomRight - 38);
    }

    car.x += (targetX - car.x) * 0.14;

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

    hazardSpawnTimer += 1;
    if (hazardSpawnTimer > 62) {
      spawnEMP();
      hazardSpawnTimer = 0;
    }

    coinSpawnTimer += 1;
    if (coinSpawnTimer > 92) {
      spawnCoin();
      coinSpawnTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      updateObstacle(o, 0.012 * (1 + beat * 0.25), now);

      if (!o.hit && now >= stunnedUntil && isColliding(car, o)) {
        o.hit = true;

        if (o.kind === "coin") {
          coinCount += 1;
          obstacleContainer.removeChild(o);
          obstacles.splice(i, 1);
          continue;
        } else {
          stunnedUntil = now + 600;
          coinCount = 0;
          flashAlpha = 0.18 + beat * 0.22;
        }
      }

      if (o.progress > 1.05) {
        obstacleContainer.removeChild(o);
        obstacles.splice(i, 1);
      }
    }

    flashAlpha *= 0.87;
    if (flashAlpha < 0.01) flashAlpha = 0;
    flash.alpha = flashAlpha;
  });

  song.addEventListener("ended", () => {
    if (gameState === "playing") {
      gameState = "ended";
      endedScreen.visible = true;
    }
  });
