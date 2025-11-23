"use strict";
const STATE_MENU = 0,
  STATE_ACT_INTRO = 1,
  STATE_PLAY = 2,
  STATE_LEVEL_COMPLETE = 3,
  STATE_GAMEOVER = 4,
  STATE_ENDING = 5;
const STATE_TUTORIAL = 6;
const TOTAL_LEVELS = 3;
const FONT_UI = "Nunito, sans-serif";
const FONT_MONO = "Fira Code, monospace";
const FONT_CINZEL = "Cinzel, serif";
const scr = (x, y) => {
  const w = overlayCanvas ? overlayCanvas.width : 1280;
  const h = overlayCanvas ? overlayCanvas.height : 720;
  return vec2(w * x, h * y);
};
function dist2(a, b) {
  const dx = a.x - b.x,
    dy = a.y - b.y;
  return dx * dx + dy * dy;
}
const COLLECT_RADIUS = 0.85;
const COLLECT_RADIUS2 = COLLECT_RADIUS * COLLECT_RADIUS;
const NEG_ORB_RADIUS = 0.55;
const NEG_ORB_RADIUS2 = NEG_ORB_RADIUS * NEG_ORB_RADIUS;
const NEGATIVE_ORB_MESSAGES = [
  "The dream forgets what warmth felt like.",
  "Echoes devour echoes nothing remains whole.",
  "The dream splits apart into screaming fragments.",
  "Something older wakes beneath the fading light.",
  "The void remembers what you tried to forget.",
  "The dream unravels thread by bleeding thread.",
  "False stars whisper lies that taste like truth.",
  "The dreamer is gone but something still dreams.",
  "The light collapses inward and you fall with it.",
  "Small shadows with teeth gnaw at your edges.",
];
const CAMERA_BASE_SCALE = 28;
function insideButton(pos, size) {
  const mx = mousePosScreen.x,
    my = mousePosScreen.y;
  return (
    mx >= pos.x - size.x / 2 &&
    mx <= pos.x + size.x / 2 &&
    my >= pos.y - size.y / 2 &&
    my <= pos.y + size.y / 2
  );
}
function drawUIButton(label, pos, size, textSize = 26, font = FONT_CINZEL) {
  const hovered = insideButton(pos, size);
  const bg = hovered ? hsl(0.62, 0.55, 0.35, 0.95) : hsl(0.62, 0.55, 0.28, 0.9);
  const border = rgb(0.1, 0.12, 0.16, 0.9);
  drawRectGradient(
    pos,
    size,
    bg,
    hsl(0.62, 0.55, 0.22, 0.9),
    0,
    false,
    true,
    overlayContext
  );
  drawLineList(
    [
      pos.add(vec2(-size.x / 2, -size.y / 2)),
      pos.add(vec2(size.x / 2, -size.y / 2)),
      pos.add(vec2(size.x / 2, size.y / 2)),
      pos.add(vec2(-size.x / 2, size.y / 2)),
      pos.add(vec2(-size.x / 2, -size.y / 2)),
    ],
    3,
    border,
    true,
    vec2(),
    0,
    false,
    true,
    overlayContext
  );
  drawTextScreen(
    label,
    pos,
    textSize,
    rgb(1, 1, 1, 0.96),
    0,
    BLACK,
    "center",
    font
  );
  return hovered;
}
if (typeof window !== "undefined") {
  if (typeof window.clamp !== "function")
    window.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  if (typeof window.lerp !== "function")
    window.lerp = (a, b, t) => a + (b - a) * t;
  if (typeof window.mix !== "function")
    window.mix = (a, b, t) => a + (b - a) * t;
  if (typeof window.smoothstep !== "function")
    window.smoothstep = (edge0, edge1, x) => {
      const t = window.clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    };
}
let gameState = STATE_MENU;
let currentLevel = 1;
let orbsRequired = 0;
let player;
let ui;
let memoryOrbs = [];
let collected = 0;
let pendingLevelComplete = false;
let levelCompleteTimer;
let gameOver = false;
let gameWon = false;
let dreamTimer;
let dreamTimerStart = 60;
let dreamTimerInitial = 60;
let dreamTimerCurrentTotal = 60;
const FX_WHITE_DUR = 0.35;
const FX_NEG_DUR = 0.45;
let fxWhitePulse = 0;
let fxNegPulse = 0;
let endingTimer;
let endingOrbs = [];
let endingAmbientPlayed = false;
let endingNextChimeT = 0;
let endingNextAmbientT = 0;
let endingSustainPlayed = false;
let endingCameraScaleStart = 28;
let sfx_pulse = { play: () => {} };
let sfx_collect = { play: () => {} };
let tutorial = { pages: [], index: 0 };
let tutorialSeen = false;
let tutorialReturnToMenu = false;
function getTutorialPages() {
  return [
    "A small dream flickers in the dark…\nIt remembers your name.",
    "Move with W A S D or Arrow Keys.\nFollow where the light feels gentle.",
    "Collect the white dream orbs.\nEach one helps the dream remember.",
    "Beware the red ones.\nThey take time — and unmake your progress.",
  ];
}
function orbsRequiredForLevel(level) {
  return level === 1 ? 4 : level === 2 ? 6 : 8;
}
function memoryLineOffsetForLevel(level) {
  return level === 1 ? 0 : level === 2 ? 4 : 10;
}
function timeForLevel(level) {
  return level === 1 ? 30 : level === 2 ? 45 : 60;
}
function spawnLevelContent(level) {
  const { cols, rows } = mazeSizeForLevel(level);
  const maze = generateMaze(cols, rows);
  const geom = buildMazeObjects(maze);
  const startC = Math.floor(cols / 2),
    startR = Math.floor(rows / 2);
  const startPos = geom.centerOf(startC, startR);
  if (player)
    player.pos = startPos.copy ? startPos.copy() : vec2(startPos.x, startPos.y);
  const cells = maze.cells;
  const inBounds = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows;
  const dirs = [
    [0, -1, 0],
    [1, 0, 1],
    [0, 1, 2],
    [-1, 0, 3],
  ]; // dx,dy,wallIdx
  const openNeighbors = (c, r) => {
    const res = [];
    for (const [dx, dy, wi] of dirs) {
      const nc = c + dx,
        nr = r + dy;
      if (!inBounds(nc, nr)) continue;
      if (!cells[r][c].w[wi]) res.push([nc, nr]); // wall open
    }
    return res;
  };
  const degree = (c, r) => openNeighbors(c, r).length;
  const allCells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!(c === startC && r === startR)) allCells.push([c, r]);
  const farEnough = (c, r) =>
    geom.centerOf(c, r).distance(startPos) >= ORB_MIN_FROM_PLAYER;
  const deadEnds = allCells.filter(
    ([c, r]) => farEnough(c, r) && degree(c, r) <= 1
  );
  const corridors = allCells.filter(
    ([c, r]) => farEnough(c, r) && degree(c, r) >= 2
  );
  for (let i = deadEnds.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = deadEnds[i];
    deadEnds[i] = deadEnds[j];
    deadEnds[j] = t;
  }
  for (let i = corridors.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = corridors[i];
    corridors[i] = corridors[j];
    corridors[j] = t;
  }
  const base = memoryLineOffsetForLevel(level);
  const required = orbsRequiredForLevel(level);
  const whitesDesired = required + 2;
  const negDesired = Math.floor(whitesDesired / 2);
  const whiteCells = [];
  let usedDead = 0,
    usedCorr = 0;
  while (whiteCells.length < required && usedDead < deadEnds.length)
    whiteCells.push(deadEnds[usedDead++]);
  while (whiteCells.length < required && usedCorr < corridors.length)
    whiteCells.push(corridors[usedCorr++]);
  while (
    whiteCells.length < whitesDesired &&
    (usedDead < deadEnds.length || usedCorr < corridors.length)
  ) {
    if (usedDead < deadEnds.length) whiteCells.push(deadEnds[usedDead++]);
    else if (usedCorr < corridors.length)
      whiteCells.push(corridors[usedCorr++]);
    else break;
  }
  const usedKeys = new Set(whiteCells.map(([c, r]) => `${c},${r}`));
  const negPool = [];
  for (let i = usedDead; i < deadEnds.length; i++) {
    const cr = deadEnds[i];
    const k = `${cr[0]},${cr[1]}`;
    if (!usedKeys.has(k)) negPool.push(cr);
  }
  for (let i = usedCorr; i < corridors.length; i++) {
    const cr = corridors[i];
    const k = `${cr[0]},${cr[1]}`;
    if (!usedKeys.has(k)) negPool.push(cr);
  }
  const negCells = negPool.slice(0, Math.min(negDesired, negPool.length));
  for (let i = 0; i < whiteCells.length; i++) {
    const [c, r] = whiteCells[i];
    memoryOrbs.push(new MemoryOrb(geom.centerOf(c, r), base + i));
  }
  for (let i = 0; i < negCells.length; i++) {
    const [c, r] = negCells[i];
    new NegativeOrb(geom.centerOf(c, r));
  }
}
let vignetteLayer;
let trailEmitter;
const memoryLines = [
  "A faint light stirs within the dark.",
  "Memories hum like distant stars.",
  "Shapes form where silence once slept.",
  "The small dream begins to breathe.",
  "The dream stretches, reaching for forgotten warmth.",
  "Whispers trace the outline of something once known.",
  "Each fragment hums a note of hope.",
  "Colors bleed into the void — gentle and shy.",
  "The dream starts to remember its name.",
  "In the stillness, the heart awakens.",
  "The stars fall closer, drawn by the dream’s pulse.",
  "Every shard glows with a piece of truth.",
  "The small dream no longer fears the vastness.",
  "Echoes become voices, soft but certain.",
  "The dream finds its reflection in the void.",
  "Light and shadow dance without end.",
  "The world feels smaller, yet whole again.",
  "The small dream opens its eyes — and becomes real.",
];
const TITLE_FONT = "Cinzel Decorative, serif";
const SPAWN_BOUNDS = Object.freeze({
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
});
const ORB_MIN_FROM_PLAYER = 1.6;
const ORB_MIN_BETWEEN = 1.2;
const OBSTACLE_BUFFER = 1.0;
const WALL_THICKNESS = 0.22;
function mazeSizeForLevel(level) {
  if (level === 1) return { cols: 7, rows: 7 };
  if (level === 2) return { cols: 9, rows: 9 };
  return { cols: 11, rows: 11 };
}
function generateMaze(cols, rows) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++)
      row.push({ v: false, w: [true, true, true, true] });
    cells.push(row);
  }
  const stack = [];
  const startC = Math.floor(cols / 2),
    startR = Math.floor(rows / 2);
  cells[startR][startC].v = true;
  stack.push({ c: startC, r: startR });
  const dirs = [
    [0, -1, 0, 2],
    [1, 0, 1, 3],
    [0, 1, 2, 0],
    [-1, 0, 3, 1],
  ]; // dx,dy, wallIdx, oppositeIdx
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const neigh = [];
    for (const [dx, dy, wi, oi] of dirs) {
      const nc = cur.c + dx,
        nr = cur.r + dy;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (!cells[nr][nc].v) neigh.push({ nc, nr, wi, oi });
    }
    if (!neigh.length) {
      stack.pop();
      continue;
    }
    const n = neigh[(Math.random() * neigh.length) | 0];
    cells[cur.r][cur.c].w[n.wi] = false;
    cells[n.nr][n.nc].w[n.oi] = false; // remove opposite wall on neighbor
    cells[n.nr][n.nc].v = true;
    stack.push({ c: n.nc, r: n.nr });
  }
  return { cols, rows, cells };
}
function buildMazeObjects(maze) {
  const { cols, rows, cells } = maze;
  const usableW = SPAWN_BOUNDS.xMax - SPAWN_BOUNDS.xMin;
  const usableH = SPAWN_BOUNDS.yMax - SPAWN_BOUNDS.yMin;
  const cellSize = Math.min(usableW / cols, usableH / rows);
  const width = cols * cellSize,
    height = rows * cellSize;
  const left = -width / 2,
    top = -height / 2;
  const centers = [];
  const centerOf = (c, r) =>
    vec2(left + c * cellSize + cellSize / 2, top + r * cellSize + cellSize / 2);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) centers.push(centerOf(c, r));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cc = centerOf(c, r);
      const w = cells[r][c].w;
      if (w[0])
        new MazeWall(
          cc.add(vec2(0, -cellSize / 2)),
          vec2(cellSize, WALL_THICKNESS)
        ); // North
      if (w[3])
        new MazeWall(
          cc.add(vec2(-cellSize / 2, 0)),
          vec2(WALL_THICKNESS, cellSize)
        ); // West
    }
  }
  new MazeWall(
    vec2(0, top - WALL_THICKNESS / 2),
    vec2(width + WALL_THICKNESS, WALL_THICKNESS)
  ); // top
  new MazeWall(
    vec2(0, -top + WALL_THICKNESS / 2),
    vec2(width + WALL_THICKNESS, WALL_THICKNESS)
  ); // bottom
  new MazeWall(
    vec2(left - WALL_THICKNESS / 2, 0),
    vec2(WALL_THICKNESS, height + WALL_THICKNESS)
  ); // left
  new MazeWall(
    vec2(-left + WALL_THICKNESS / 2, 0),
    vec2(WALL_THICKNESS, height + WALL_THICKNESS)
  ); // right
  return { cellSize, left, top, width, height, centers, centerOf };
}
function secondsLeft() {
  if (!dreamTimer) return 0;
  const p = clamp(dreamTimer.getPercent(), 0, 1);
  return Math.max(0, Math.ceil(dreamTimerCurrentTotal * (1 - p)));
}
function applyTimePenalty(sec) {
  if (!dreamTimer) return;
  const p = clamp(dreamTimer.getPercent(), 0, 1);
  const remaining = Math.max(0, dreamTimerCurrentTotal * (1 - p));
  const newRemaining = Math.max(0, remaining - sec);
  dreamTimer = new Timer();
  dreamTimer.set(newRemaining);
  dreamTimerCurrentTotal = newRemaining;
  if (newRemaining <= 0) endDream(false);
}
class Player extends EngineObject {
  constructor(pos) {
    super(pos, vec2(0.48, 0.48));
    this.color = rgb(1, 1, 1);
    this.additiveColor = rgb(0.3, 0.5, 1, 0.8);
    this.mass = 1;
    this.damping = 0.92;
    this.setCollision(true, false, true, true);
    this.renderOrder = 2;
  }
  update() {
    if (gameState !== STATE_PLAY) return;
    const dir = keyDirection("ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight");
    const wasd = keyDirection("KeyW", "KeyS", "KeyA", "KeyD");
    const input = dir.add(wasd).clampLength(1);
    const speed = 6.5;
    this.velocity = input.scale(speed * timeDelta);
    cameraPos = cameraPos.lerp(this.pos, 0.08);
    super.update();
    if (trailEmitter) {
      trailEmitter.pos = this.pos;
      trailEmitter.angle = this.velocity?.angle?.() ?? 0;
    }
    if (rand() < 0.003) sfx_pulse.play(this.pos, 0.15, 1 + rand(-0.02, 0.02));
  }
  render() {
    const pulse = 0.05 * Math.sin(time * 3);
    const outer = this.size.x * 0.65;
    const inner = this.size.x * 0.3;
    drawCircle(this.pos, outer + pulse, rgb(0.4, 0.7, 1, 0.5));
    drawCircle(this.pos, inner, rgb(0.7, 0.85, 1, 1));
  }
}
class MemoryOrb extends EngineObject {
  constructor(pos, lineIndex) {
    super(pos, vec2(1.0, 1.0));
    this.lineIndex = lineIndex;
    this.pulse = rand(0.7, 1.1);
    this.renderOrder = 1;
  }
  update() {
    if (gameState !== STATE_PLAY) return;
    if (pendingLevelComplete) return;
    this.pos.y += Math.sin(time * 2 + this.pulse) * 0.003;
    if (rand() < 0.002) sfx_pulse.play(this.pos, 0.12, 1.5);
    if (dist2(this.pos, player.pos) < COLLECT_RADIUS2) {
      sfx_collect.play(this.pos, 0.5);
      fxWhitePulse = FX_WHITE_DUR;
      this.destroy();
      const isFinalAct = currentLevel >= TOTAL_LEVELS;
      const willBeLastOrb = collected + 1 >= orbsRequired;
      if (isFinalAct && willBeLastOrb) {
        collected++;
        setupEnding();
        return;
      } else {
        const base = memoryLineOffsetForLevel(currentLevel);
        const idx = base + collected; // collected is count BEFORE increment
        showMemoryLine(idx);
        collected++;
        if (collected >= orbsRequired) {
          pendingLevelComplete = true;
          levelCompleteTimer.set(1.5);
        }
      }
    }
  }
  render() {
    const r = 0.32 + 0.04 * Math.sin(time * 6 + this.pulse);
    drawCircle(this.pos, r * 4.2, rgb(0.4, 0.7, 1, 0.12));
    drawCircle(this.pos, r * 2.5, rgb(0.4, 0.7, 1, 0.2));
    drawCircle(this.pos, r, rgb(0.95, 0.99, 1, 0.92));
  }
}
class NegativeOrb extends EngineObject {
  constructor(pos) {
    super(pos, vec2(1.0, 1.0));
    this.pulse = rand(0.7, 1.1);
    this.angle = rand(0, Math.PI * 2);
    this.angleVelocity = rand(-2, 2);
    this.renderOrder = 1;
  }
  update() {
    if (gameState !== STATE_PLAY) return;
    this.pos.y += Math.sin(time * 2 + this.pulse) * 0.003;
    if (rand() < 0.002) sfx_pulse.play(this.pos, 0.12, 0.7);
    if (dist2(this.pos, player.pos) < NEG_ORB_RADIUS2) {
      sfx_pulse.play(this.pos, 0.5, 0.6);
      fxNegPulse = FX_NEG_DUR;
      this.destroy();
      collected = Math.max(0, collected - 1);
      pendingLevelComplete = false;
      levelCompleteTimer = new Timer();
      applyTimePenalty(5);
      const randomMsg =
        NEGATIVE_ORB_MESSAGES[
          (Math.random() * NEGATIVE_ORB_MESSAGES.length) | 0
        ];
      if (ui) ui.flashText(randomMsg, true);
    }
  }
  render() {
    const r = 0.32 + 0.04 * Math.sin(time * 6 + this.pulse);
    drawRect(
      this.pos,
      vec2(r * 2.5, r * 2.5),
      rgb(0.8, 0.1, 0.1, 0.2),
      this.angle
    );
    drawRect(
      this.pos,
      vec2(r * 1.5, r * 1.5),
      rgb(1.0, 0.2, 0.15, 0.5),
      this.angle
    );
    drawRect(
      this.pos,
      vec2(r * 0.8, r * 0.8),
      rgb(1.0, 0.3, 0.2, 0.95),
      this.angle
    );
  }
}
class MazeWall extends EngineObject {
  constructor(pos, size) {
    super(pos, size);
    this.mass = 0;
    this.setCollision(true, true, true, true);
    this.color = rgb(0.2, 0.3, 0.5, 0.5);
    this.renderOrder = 0;
  }
  render() {
    drawRect(this.pos, this.size, rgb(0.16, 0.24, 0.42, 0.95));
    drawRect(this.pos, this.size.scale(1.1), rgb(0.35, 0.55, 0.9, 0.2));
  }
}
function showMemoryLine(i) {
  const t = memoryLines[i] || "";
  ui.flashText(t);
}
class UIOverlay {
  constructor() {
    this.text = "";
    this.textTimer = new Timer();
    this.textIsNegative = false;
  }
  flashText(t, isNegative = false) {
    this.text = t;
    this.textIsNegative = !!isNegative;
    this.textTimer.set(3.5);
  }
  render() {
    const pTimer = clamp(dreamTimer.getPercent(), 0, 1);
    const secsLeft = Math.max(0, dreamTimerCurrentTotal * (1 - pTimer));
    const pRemaining = dreamTimerInitial > 0 ? secsLeft / dreamTimerInitial : 0;
    const fade = clamp(pRemaining, 0, 1);
    const darkness = 0.25 + 0.5 * (1 - fade);
    const camSize = getCameraSize();
    drawRect(cameraPos, camSize, rgb(0, 0, 0, darkness));
    const p = clamp(dreamTimer.getPercent(), 0, 1);
    const secondsLeft = Math.max(
      0,
      Math.ceil(dreamTimerCurrentTotal * (1 - p))
    );
    drawTextScreen(
      `${secondsLeft}s`,
      scr(0.96, 0.06),
      18,
      rgb(0.8, 0.85, 1, 0.7)
    );
    if (this.textTimer.active()) {
      const p = 1 - this.textTimer.getPercent();
      const isNeg = this.textIsNegative;
      const color = isNeg ? rgb(1.0, 0.7, 0.75, 0.95) : rgb(0.9, 0.95, 1, 0.9);
      const size = isNeg ? 22 : 24;
      drawTextScreen(
        this.text,
        scr(0.5, 0.9),
        size,
        color,
        0,
        BLACK,
        "center",
        FONT_MONO
      );
    }
    const dots =
      "●".repeat(collected) + "○".repeat(Math.max(0, orbsRequired - collected));
    drawTextScreen(dots, scr(0.5, 0.06), 22, rgb(0.8, 0.85, 1, 0.8));
    if (gameOver) {
      const msg = gameWon
        ? "the dream dissolves into light"
        : "the dream fades to dark";
      drawRect(cameraPos, getCameraSize(), rgb(0, 0, 0, 0.3));
      if (gameWon) {
        drawTextScreen(msg, scr(0.5, 0.5), 32, rgb(1, 1, 1, 0.95));
      } else {
        drawTextScreen(
          msg,
          scr(0.5, 0.5),
          32,
          rgb(1, 1, 1, 0.95),
          0,
          BLACK,
          "center",
          FONT_CINZEL
        );
      }
      drawTextScreen(
        "Press R to restart",
        scr(0.5, 0.57),
        20,
        rgb(1, 1, 1, 0.7)
      );
    }
  }
}
function endDream(won) {
  gameOver = true;
  gameWon = !!won;
  gameState = STATE_GAMEOVER;
}
function onLevelComplete() {
  gameOver = false;
  gameWon = true;
  if (currentLevel >= TOTAL_LEVELS) {
    setupEnding();
  } else {
    gameState = STATE_LEVEL_COMPLETE;
  }
}
function resetGame(level = currentLevel) {
  currentLevel = level;
  orbsRequired = orbsRequiredForLevel(level);
  dreamTimerStart = timeForLevel(level);
  engineObjectsDestroy();
  memoryOrbs = [];
  collected = 0;
  gameOver = false;
  gameWon = false;
  dreamTimer = new Timer();
  pendingLevelComplete = false;
  levelCompleteTimer = new Timer();
  gameState = STATE_ACT_INTRO;
  cameraScale = CAMERA_BASE_SCALE;
  endingTimer = undefined;
  endingOrbs = [];
  endingAmbientPlayed = false;
  endingNextChimeT = 0;
  endingNextAmbientT = 0;
  endingSustainPlayed = false;
  player = new Player(vec2(0, 0));
  spawnLevelContent(currentLevel);
  trailEmitter = new ParticleEmitter(
    player.pos,
    0,
    0,
    0,
    25,
    PI,
    undefined,
    rgb(0.7, 0.9, 1, 0.15),
    rgb(0.5, 0.8, 1, 0.12),
    rgb(0.4, 0.7, 1, 0),
    rgb(0.4, 0.7, 1, 0),
    0.35,
    0.04,
    0.18,
    0.0,
    0.0,
    0.99,
    1.0,
    0,
    PI,
    0.05,
    0.5,
    false,
    true,
    true,
    undefined,
    false
  );
  trailEmitter.trailScale = 3;
}
function startGame() {
  ui = new UIOverlay();
  currentLevel = 1;
  resetGame(currentLevel);
  try {
    tutorialSeen = !!(
      localStorage && localStorage.getItem("asd_tutorial_seen")
    );
  } catch {}
  if (currentLevel === 1 && !tutorialSeen) {
    tutorial.pages = getTutorialPages();
    tutorial.index = 0;
    gameState = STATE_TUTORIAL;
  }
}
function restartLevel() {
  resetGame(currentLevel);
}
function nextLevel() {
  if (currentLevel < TOTAL_LEVELS) {
    currentLevel++;
    resetGame(currentLevel);
  } else {
    setupEnding();
  }
}
function setupEnding() {
  gameState = STATE_ENDING;
  endingTimer = new Timer();
  endingTimer.set(22.0); // extended duration to include credits card
  endingOrbs = [];
  endingAmbientPlayed = false;
  if (player)
    cameraPos = player.pos.copy
      ? player.pos.copy()
      : vec2(player.pos.x, player.pos.y);
  const count = orbsRequiredForLevel(3); // 8
  const radius = 0.6; // start close
  for (let i = 0; i < count; i++) {
    endingOrbs.push({
      angle: (i / count) * (PI * 2),
      radius: radius + 0.02 * i,
      glow: 0.0,
    });
  }
  endingCameraScaleStart = cameraScale;
}
function gameInit() {
  gameState = STATE_MENU;
}
function drawEndingSequence() {
  if (!endingTimer) return;
  const total = 22.0;
  const t = clamp(endingTimer.getPercent(), 0, 1) * total;
  const camSize = getCameraSize();
  const whiteFade = smoothstep(3.0, 6.0, t);
  const whiteAlpha = clamp(whiteFade, 0, 1);
  const zoom = mix(
    endingCameraScaleStart,
    endingCameraScaleStart * 1.6,
    smoothstep(3.0, 6.0, t)
  );
  cameraScale = zoom;
  if (player) cameraPos = player.pos;
  const bloom = smoothstep(3.0, 6.0, t);
  const glowR1 = 0.28 + 1.2 * bloom;
  const glowR2 = 0.12 + 0.9 * bloom;
  drawCircle(player.pos, glowR1, rgb(1, 1, 1, 0.22 + 0.35 * bloom));
  drawCircle(player.pos, glowR2, rgb(1, 1, 1, 0.85 + 0.1 * bloom));
  const orbRise = smoothstep(0.0, 3.0, t);
  const dissolve = smoothstep(3.0, 6.0, t);
  const orbitCenter = player.pos;
  const count = endingOrbs.length;
  for (let i = 0; i < count; i++) {
    const o = endingOrbs[i];
    const speed = mix(0.6, 1.2, orbRise);
    o.angle += speed * timeDelta;
    let r = mix(0.7, 1.1, orbRise) + i * 0.02;
    r *= 1 + 0.03 * Math.sin(time * 0.7 + i * 0.6) * (0.3 + 0.7 * bloom);
    const pos = orbitCenter.add(
      vec2(Math.cos(o.angle), Math.sin(o.angle)).scale(r)
    );
    const a = (1 - dissolve) * 0.9;
    drawCircle(pos, 0.25, rgb(0.9, 0.97, 1, a));
    drawCircle(pos, 0.5, rgb(0.5, 0.8, 1, 0.12 * a));
  }
  drawRect(cameraPos, camSize, rgb(1, 1, 1, whiteAlpha * 0.95));
  const lines = ["The small dream…", "opens its eyes…", "and becomes real."];
  const schedule = [6.0, 6.7, 7.4];
  for (let i = 0; i < lines.length; i++) {
    const start = schedule[i];
    const end = start + 3.0;
    if (t >= start - 0.2 && t <= end + 0.5) {
      const p = clamp((t - start) / 3.0, 0, 1);
      const alpha =
        p < 0.5 ? smoothstep(0.0, 0.5, p) : 1 - smoothstep(0.5, 1.0, p);
      const y = 0.44 + i * 0.08;
      const b = whiteAlpha;
      const darkAmt = clamp(b, 0, 1),
        lightAmt = 1 - darkAmt;
      if (darkAmt > 0.01)
        drawTextScreen(
          lines[i],
          scr(0.5, y),
          30,
          rgb(0.05, 0.06, 0.08, alpha * darkAmt * 0.95),
          2,
          rgb(0, 0, 0, alpha * darkAmt * 0.25),
          "center",
          FONT_CINZEL
        );
      if (lightAmt > 0.01)
        drawTextScreen(
          lines[i],
          scr(0.5, y),
          30,
          rgb(1, 1, 1, alpha * lightAmt * 0.98),
          0,
          BLACK,
          "center",
          FONT_CINZEL
        );
    }
  }
  if (t >= 8.0 && t < 10.0) drawRect(cameraPos, camSize, rgb(1, 1, 1, 1.0));
  if (t >= 10.0 && t < 12.0) {
    const a = smoothstep(10.0, 12.0, t);
    drawRect(cameraPos, camSize, rgb(0, 0, 0, a));
  }
  if (t >= 12.0) {
    drawRect(cameraPos, camSize, rgb(0, 0, 0, 1));
    const p = clamp((t - 12.0) / 1.5, 0, 1);
    const fadeOut = smoothstep(16.0, 17.0, t);
    const a = smoothstep(0, 1, p) * (1 - fadeOut);
    if (a > 0) {
      const pos = scr(0.5, 0.5);
      drawTextScreen(
        "“And even the smallest spark remembers.”",
        pos,
        24,
        rgb(0.98, 0.99, 1, a),
        0,
        BLACK,
        "center",
        FONT_CINZEL
      );
    }
  }
  if (t >= 17.0) {
    drawRect(cameraPos, camSize, rgb(0, 0, 0, 1));
    const fadeIn = smoothstep(17.0, 18.0, t);
    const titlePos = scr(0.5, 0.46);
    const byPos = scr(0.5, 0.56);
    const tpShadow = vec2(titlePos.x, titlePos.y + 2);
    drawTextScreen(
      "A Small Dream",
      tpShadow,
      42,
      rgb(0, 0, 0, fadeIn * 0.22),
      0,
      BLACK,
      "center",
      TITLE_FONT
    );
    drawTextScreen(
      "A Small Dream",
      titlePos,
      42,
      rgb(1, 1, 1, fadeIn * 0.96),
      0,
      BLACK,
      "center",
      TITLE_FONT
    );
    const byAlpha = clamp(fadeIn - 0.15, 0, 1);
    drawTextScreen(
      "by Debmalya Pyne",
      byPos,
      22,
      rgb(1, 1, 1, byAlpha * 0.92),
      0,
      BLACK,
      "center",
      FONT_CINZEL
    );
  }
  if (endingTimer.elapsed()) {
    cameraScale = CAMERA_BASE_SCALE;
    gameState = STATE_MENU;
  }
}
function gameUpdate() {
  if (keyWasPressed("KeyP"))
    try {
      debugPhysics = !debugPhysics;
    } catch {}
  if (gameState === STATE_TUTORIAL) {
    const advance =
      keyWasPressed("Enter") || keyWasPressed("Space") || mouseWasPressed(0);
    const skip = keyWasPressed("Escape");
    if (advance) {
      if (tutorial.index < tutorial.pages.length - 1) {
        tutorial.index++;
      } else {
        try {
          if (localStorage) localStorage.setItem("asd_tutorial_seen", "1");
        } catch {}
        tutorialSeen = true;
        if (tutorialReturnToMenu) {
          tutorialReturnToMenu = false;
          gameState = STATE_MENU;
        } else {
          gameState = STATE_ACT_INTRO;
          levelCompleteTimer = new Timer(); // ensure fade timer exists
        }
      }
    } else if (skip) {
      try {
        if (localStorage) localStorage.setItem("asd_tutorial_seen", "1");
      } catch {}
      tutorialSeen = true;
      if (tutorialReturnToMenu) {
        tutorialReturnToMenu = false;
        gameState = STATE_MENU;
      } else {
        gameState = STATE_ACT_INTRO;
        levelCompleteTimer = new Timer();
      }
    }
    return;
  }
  if (gameState === STATE_ACT_INTRO) {
    if (!levelCompleteTimer.active()) levelCompleteTimer.set(2.0);
    const advance =
      keyWasPressed("Enter") ||
      keyWasPressed("Space") ||
      mouseWasPressed(0) ||
      levelCompleteTimer.elapsed();
    if (advance) {
      dreamTimer = new Timer();
      dreamTimer.set(dreamTimerStart);
      dreamTimerInitial = dreamTimerStart;
      dreamTimerCurrentTotal = dreamTimerStart;
      gameState = STATE_PLAY;
    }
    return;
  }
  if (gameState === STATE_ENDING) {
    if (
      keyWasPressed("Enter") ||
      keyWasPressed("Space") ||
      mouseWasPressed(0)
    ) {
      cameraScale = CAMERA_BASE_SCALE;
      gameState = STATE_MENU;
      return;
    }
    return;
  }
  if (
    gameState === STATE_PLAY &&
    pendingLevelComplete &&
    levelCompleteTimer.elapsed()
  ) {
    onLevelComplete();
    return;
  }
  if (gameState === STATE_MENU) {
    if (keyWasPressed("Enter") || keyWasPressed("Space")) startGame();
    if (keyWasPressed("KeyH")) {
      tutorial.pages = getTutorialPages();
      tutorial.index = 0;
      tutorialReturnToMenu = true;
      gameState = STATE_TUTORIAL;
    }
    if (mouseWasPressed(0)) {
      const btnSize = vec2(280, 64);
      const startPos = scr(0.5, 0.6);
      const helpPos = scr(0.5, 0.78);
      if (insideButton(startPos, btnSize)) startGame();
      else if (insideButton(helpPos, btnSize)) {
        tutorial.pages = getTutorialPages();
        tutorial.index = 0;
        tutorialReturnToMenu = true;
        gameState = STATE_TUTORIAL;
      }
    }
    return;
  }
  if (gameState === STATE_LEVEL_COMPLETE) {
    if (keyWasPressed("KeyR")) return void restartLevel();
    if (keyWasPressed("Enter") || keyWasPressed("Space"))
      return void (currentLevel < TOTAL_LEVELS
        ? nextLevel()
        : (gameState = STATE_MENU));
    if (mouseWasPressed(0)) {
      const w = overlayCanvas ? overlayCanvas.width : 1280;
      const h = overlayCanvas ? overlayCanvas.height : 720;
      const toScr = (x, y) => vec2(w * x, h * y);
      const btnSize = vec2(260, 60);
      const restartPos = toScr(0.5 - 0.18, 0.55);
      const nextPos = toScr(0.5 + 0.18, 0.55);
      const mx = mousePosScreen.x,
        my = mousePosScreen.y;
      const inside = (pos) =>
        mx >= pos.x - btnSize.x / 2 &&
        mx <= pos.x + btnSize.x / 2 &&
        my >= pos.y - btnSize.y / 2 &&
        my <= pos.y + btnSize.y / 2;
      if (inside(restartPos)) return void restartLevel();
      if (inside(nextPos))
        return void (currentLevel < TOTAL_LEVELS
          ? nextLevel()
          : (gameState = STATE_MENU));
    }
    return;
  }
  if (gameOver) {
    if (keyWasPressed("KeyR")) resetGame();
    return;
  }
  if (gameState === STATE_PLAY && dreamTimer.elapsed()) {
    endDream(false);
    return;
  }
}
function gameUpdatePost() {}
function gameRender() {
  const camSize = getCameraSize();
  const t = time * 0.1;
  const c1 = hsl(0.62, 0.55, 0.12 + 0.05 * Math.sin(t));
  const c2 = hsl(0.72, 0.55, 0.08 + 0.05 * Math.cos(t * 0.8));
  drawRect(cameraPos, camSize, c1);
  drawRect(cameraPos, camSize, c2);
}
function gameRenderPost() {
  if (gameState === STATE_PLAY || gameState === STATE_GAMEOVER) {
    ui.render();
    if (player && gameState === STATE_PLAY) {
      player.render();
    }
  } else if (gameState === STATE_MENU) {
    drawTitleScreen();
  } else if (gameState === STATE_LEVEL_COMPLETE) {
    drawLevelCompleteScreen();
  } else if (gameState === STATE_ACT_INTRO) {
    drawActIntroScreen();
  } else if (gameState === STATE_TUTORIAL) {
    drawTutorialScreen();
  } else if (gameState === STATE_ENDING) {
    drawEndingSequence();
  }
}
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
function drawTitleScreen() {
  const titlePos = scr(0.5, 0.32);
  const titleSize = 48;
  drawTextScreen(
    "A Small Dream",
    titlePos,
    titleSize,
    rgb(0, 0, 0, 0.85),
    4,
    rgb(0, 0, 0, 0.85),
    "center",
    TITLE_FONT
  );
  drawTextScreen(
    "A Small Dream",
    titlePos,
    titleSize,
    rgb(1, 1, 1, 0.97),
    0,
    BLACK,
    "center",
    TITLE_FONT
  );
  drawTextScreen(
    "A tiny spark inside a fading dream",
    scr(0.5, 0.38),
    18,
    rgb(0.9, 0.95, 1, 0.75),
    0,
    BLACK,
    "center",
    FONT_CINZEL
  );
  const bob = 0.12 * Math.sin(time * 2.2);
  const ballPos = cameraPos.add(vec2(0, -0.3 + bob));
  drawCircle(ballPos, 0.28, rgb(0.4, 0.7, 1, 0.5));
  drawCircle(ballPos, 0.12, rgb(0.7, 0.85, 1, 1));
  const startPos = scr(0.5, 0.6);
  const helpPos = scr(0.5, 0.78);
  const btnSize = vec2(280, 64);
  const startHovered = drawUIButton(
    "Start",
    startPos,
    btnSize,
    26,
    FONT_CINZEL
  );
  const helpHovered = drawUIButton(
    "How to Play",
    helpPos,
    btnSize,
    26,
    FONT_CINZEL
  );
  drawTextScreen(
    "Press Enter or Space",
    startPos.add(vec2(0, 48)),
    16,
    rgb(0.86, 0.9, 1, 0.85),
    0,
    BLACK,
    "center",
    FONT_UI
  );
  drawTextScreen(
    "Press H",
    helpPos.add(vec2(0, 48)),
    14,
    rgb(0.86, 0.9, 1, 0.75),
    0,
    BLACK,
    "center",
    FONT_UI
  );
}
function drawLevelCompleteScreen() {
  drawRect(cameraPos, getCameraSize(), rgb(0, 0, 0, 0.35));
  const title =
    currentLevel < TOTAL_LEVELS ? "Act Complete" : "All Memories Found";
  drawTextScreen(
    title,
    scr(0.5, 0.35),
    36,
    rgb(1, 1, 1, 0.97),
    3,
    rgb(0, 0, 0, 0.85),
    "center",
    TITLE_FONT
  );
  const btnSize = vec2(260, 60);
  const restartPos = scr(0.5 - 0.18, 0.55);
  const nextPos = scr(0.5 + 0.18, 0.55);
  const drawButton = (label, pos) =>
    drawUIButton(label, pos, btnSize, 24, FONT_CINZEL) && mouseWasPressed(0);
  const nextLabel = currentLevel < TOTAL_LEVELS ? "Next Act" : "Menu";
  if (drawButton("Restart", restartPos)) restartLevel();
  if (drawButton(nextLabel, nextPos))
    currentLevel < TOTAL_LEVELS ? nextLevel() : (gameState = STATE_MENU);
  const hintColor = rgb(0.86, 0.9, 1, 0.85);
  const hintFont = FONT_UI;
  drawTextScreen(
    "Press R",
    restartPos.add(vec2(0, 48)),
    16,
    hintColor,
    0,
    BLACK,
    "center",
    hintFont
  );
  drawTextScreen(
    "Press Enter or Space",
    nextPos.add(vec2(0, 48)),
    16,
    hintColor,
    0,
    BLACK,
    "center",
    hintFont
  );
  if (keyWasPressed("KeyR")) restartLevel();
  if (keyWasPressed("Enter") || keyWasPressed("Space"))
    currentLevel < TOTAL_LEVELS ? nextLevel() : (gameState = STATE_MENU);
}
function actNameFor(level) {
  return level === 1
    ? "The First Dream"
    : level === 2
    ? "Echoes of a Memory"
    : "Where Light Remembers";
}
function drawActIntroScreen() {
  drawRect(cameraPos, getCameraSize(), rgb(0, 0, 0, 0.55));
  const actLine = `Act ${currentLevel}`;
  const titleLine = actNameFor(currentLevel);
  if (!levelCompleteTimer.active()) levelCompleteTimer.set(2.0);
  const p = clamp(levelCompleteTimer.getPercent(), 0, 1);
  const alpha = p < 0.2 ? p / 0.2 : p > 0.8 ? (1 - p) / 0.2 : 1;
  const headerColor = rgb(1, 1, 1, 0.95 * alpha);
  const subColor = rgb(0.95, 0.98, 1, 0.92 * alpha);
  drawTextScreen(
    actLine,
    scr(0.5, 0.44),
    34,
    headerColor,
    3,
    rgb(0, 0, 0, 0.75 * alpha),
    "center",
    FONT_CINZEL
  );
  drawTextScreen(
    titleLine,
    scr(0.5, 0.52),
    28,
    subColor,
    0,
    BLACK,
    "center",
    "Cinzel Decorative, serif"
  );
  drawTextScreen(
    "Press Enter or Click to continue",
    scr(0.5, 0.66),
    14,
    rgb(0.86, 0.9, 1, 0.75 * alpha),
    0,
    BLACK,
    "center",
    FONT_UI
  );
}
function drawTutorialScreen() {
  drawRect(cameraPos, getCameraSize(), rgb(0, 0, 0, 0.55));
  const panelSize = vec2(720, 300);
  const panelPos = scr(0.5, 0.5);
  drawRectGradient(
    panelPos,
    panelSize,
    rgb(0.1, 0.12, 0.18, 0.92),
    rgb(0.08, 0.1, 0.14, 0.92),
    0,
    false,
    true,
    overlayContext
  );
  const y = -panelSize.y / 2 + 52;
  drawLineList(
    [
      panelPos.add(vec2(-panelSize.x / 2 + 16, y)),
      panelPos.add(vec2(panelSize.x / 2 - 16, y)),
    ],
    2,
    rgb(1, 1, 1, 0.12),
    true,
    vec2(),
    0,
    false,
    true,
    overlayContext
  );
  drawTextScreen(
    "A Memory",
    panelPos.add(vec2(0, -panelSize.y / 2 + 28)),
    22,
    rgb(1, 1, 1, 0.96),
    0,
    BLACK,
    "center",
    FONT_CINZEL
  );
  const text = tutorial.pages[tutorial.index] || "";
  const lines = text.split("\n");
  const baseY = panelPos.y - 18;
  for (let i = 0; i < lines.length; i++) {
    drawTextScreen(
      lines[i],
      vec2(panelPos.x, baseY + i * 28),
      20,
      rgb(0.9, 0.95, 1, 0.92),
      0,
      BLACK,
      "center",
      FONT_UI
    );
  }
  const isLast = tutorial.index >= tutorial.pages.length - 1;
  const hint = isLast
    ? "Press Enter / Click to begin"
    : "Press Enter / Click to continue";
  drawTextScreen(
    hint,
    panelPos.add(vec2(0, panelSize.y / 2 - 28)),
    14,
    rgb(0.86, 0.9, 1, 0.8),
    0,
    BLACK,
    "center",
    FONT_UI
  );
  drawTextScreen(
    "Press Esc to skip",
    panelPos.add(vec2(0, panelSize.y / 2 - 54)),
    12,
    rgb(0.86, 0.9, 1, 0.6),
    0,
    BLACK,
    "center",
    FONT_UI
  );
}
