(async () => {
  alert("we're alive");

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js";
  document.head.appendChild(script);

  await new Promise(r => script.onload = r);

  const app = new PIXI.Application();
  await app.init({ resizeTo: window });

  document.body.appendChild(app.canvas);

  const box = new PIXI.Graphics();
  box.rect(100, 100, 200, 200).fill(0xff0000);
  app.stage.addChild(box);
})();
