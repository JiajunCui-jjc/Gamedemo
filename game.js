'use strict';

// =============================================
//  London Flat Pixel Game
//  小崔 & 小叶 — Two friends in a London flat
//  P1 (小崔): Arrow keys    P2 (小叶): WASD
// =============================================

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

// Canvas size
const W = 800;
const H = 560;
canvas.width  = W;
canvas.height = H;
ctx.imageSmoothingEnabled = false;

// One "pixel" unit for drawing (2 canvas px → crisp retro look)
const U = 2;

// =============================================
//  COLOR PALETTE  — peaceful, warm greens
// =============================================
const C = {
  // ── Outdoor scene through window ──
  skyHi:    '#cce8f8',
  skyLo:    '#a8cce8',
  treeD:    '#1c4a1c',
  treeM:    '#2a6828',
  treeMl:   '#3e8838',
  treeL:    '#58a84a',
  treeLl:   '#78c860',
  chimney:  '#8a8078',
  chimDark: '#6a6058',
  roofDark: '#6a7878',
  roofMid:  '#8a9898',
  bigBen:   '#a0a890',

  // ── Room shell ──
  wall:     '#ede0cc',
  wallPat:  '#d8c8a8',
  skirting: '#f4eee0',
  skirtLn:  '#d0c8b8',
  floorA:   '#c89568',
  floorB:   '#b88558',
  floorC:   '#d4a87a',
  floorLn:  '#a87848',

  // ── Window frame ──
  winFr:    '#f8f4ec',
  winFrSh:  '#c8c0b0',
  winSill:  '#e8e0ce',

  // ── Sofa ──
  sofaB:    '#788aaa',
  sofaD:    '#566888',
  sofaL:    '#9aaacc',
  sofaLeg:  '#6a4a30',
  sofaCush: '#8a9abb',

  // ── Bookshelf ──
  shelfWd:  '#9a7050',
  shelfDk:  '#7a5030',
  shelfBk:  '#c4a070',
  books:    ['#c84040','#4080c0','#40a048','#c09030','#9040b0','#c06030','#30a0a0','#a0a040','#d06080','#40b0a0'],

  // ── Kitchen ──
  kitBase:  '#90b888',
  kitDark:  '#709878',
  kitTop:   '#d0c8a8',
  kettle:   '#d0d0d0',
  kettleDk: '#a8a8a8',

  // ── Plants ──
  pot:      '#b87050',
  potDk:    '#986050',
  leaf:     '#388030',
  leafL:    '#58a845',
  leafD:    '#286820',

  // ── Coffee table ──
  tableTop: '#c8a870',
  tableLeg: '#8a6040',

  // ── Rug ──
  rug:      '#a87868',
  rugPat:   '#c89888',
  rugBord:  '#885848',

  // ── Characters ──
  skin:     '#f0c898',
  skinD:    '#d0a870',
  eye:      '#1a0808',
  hair1:    '#180800',   // 小崔 dark hair
  hair2:    '#3a2000',   // 小叶 slightly warmer
  body1:    '#5070b0',   // 小崔 blue
  body1D:   '#384890',
  body2:    '#b05070',   // 小叶 rose
  body2D:   '#882050',
  pants:    '#384858',
  pantsD:   '#283848',
  shoe:     '#201810',

  // ── UI ──
  uiBg:     'rgba(15,25,15,0.72)',
  uiTxt:    '#b0d898',
  p1c:      '#7898d0',
  p2c:      '#d07898',
};

// =============================================
//  INPUT
// =============================================
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  // Prevent arrow keys from scrolling the page
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

// =============================================
//  ROOM CONSTANTS (canvas pixels)
// =============================================
const WALL_H  = 230;  // y where back-wall meets floor
const WIN_X1  = 220, WIN_Y1 = 18, WIN_W = 360, WIN_H = 195;  // window rect
const WIN_X2  = WIN_X1 + WIN_W, WIN_Y2 = WIN_Y1 + WIN_H;

// Walk boundaries (character feet position)
const WALK_TOP    = 295;
const WALK_BOTTOM = 540;
const WALK_LEFT   = 50;
const WALK_RIGHT  = 750;

// Char dims (canvas px)
const CHAR_HW = 10;  // half-width for collision
const CHAR_H  = 32;  // height (feet to top)

// =============================================
//  OBSTACLES  (x, y, w, h) — canvas coords
//  Characters' feet-bounding-box cannot enter
// =============================================
const obstacles = [
  { x: 200, y: 265, w: 310, h: 72,  label: 'sofa'      },
  { x: 640, y: 240, w: 118, h: 200, label: 'bookshelf' },
  { x:  38, y: 242, w: 175, h:  98, label: 'kitchen'   },
  { x: 272, y: 356, w: 180, h:  56, label: 'table'     },
  { x:  38, y: 350, w:  80, h: 115, label: 'bigplant'  },
  { x: 640, y: 440, w:  60, h:  95, label: 'plant2'    },
];

// =============================================
//  PLAYERS
// =============================================
function makePlayer(x, y, dir, name, hair, body, bodyD, controls) {
  return { x, y, dir, name, hair, body, bodyD, controls,
           animFrame: 0, animTimer: 0, moving: false };
}

const players = [
  makePlayer(330, 420,  1, '小崔', C.hair1, C.body1, C.body1D,
    { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' }),
  makePlayer(480, 420, -1, '小叶', C.hair2, C.body2, C.body2D,
    { up:'w', down:'s', left:'a', right:'d' }),
];

const SPEED = 2.2;

// =============================================
//  COLLISION RESOLUTION
// =============================================
function resolvePlayer(p) {
  // Clamp to walk area
  p.x = Math.max(WALK_LEFT,  Math.min(WALK_RIGHT,  p.x));
  p.y = Math.max(WALK_TOP,   Math.min(WALK_BOTTOM, p.y));

  for (const obs of obstacles) {
    // Character collision box (feet at p.y)
    const cx1 = p.x - CHAR_HW, cx2 = p.x + CHAR_HW;
    const cy1 = p.y - CHAR_H,  cy2 = p.y;
    const ox1 = obs.x, ox2 = obs.x + obs.w;
    const oy1 = obs.y, oy2 = obs.y + obs.h;

    if (cx2 > ox1 && cx1 < ox2 && cy2 > oy1 && cy1 < oy2) {
      const oL = cx2 - ox1;
      const oR = ox2 - cx1;
      const oT = cy2 - oy1;
      const oB = oy2 - cy1;
      const min = Math.min(oL, oR, oT, oB);
      if      (min === oL) p.x -= oL;
      else if (min === oR) p.x += oR;
      else if (min === oT) p.y -= oT;
      else                 p.y += oB;
    }
  }
}

// =============================================
//  UPDATE
// =============================================
function update() {
  for (const p of players) {
    const { controls: ct } = p;
    let dx = 0, dy = 0;
    if (keys[ct.left])  dx -= 1;
    if (keys[ct.right]) dx += 1;
    if (keys[ct.up])    dy -= 1;
    if (keys[ct.down])  dy += 1;

    // Normalise diagonal
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    p.moving = (dx !== 0 || dy !== 0);
    if (dx !== 0) p.dir = dx > 0 ? 1 : -1;

    p.x += dx * SPEED;
    p.y += dy * SPEED;
    resolvePlayer(p);

    // Animation
    if (p.moving) {
      p.animTimer++;
      if (p.animTimer >= 9) { p.animTimer = 0; p.animFrame = (p.animFrame + 1) % 4; }
    } else {
      p.animFrame = 0; p.animTimer = 0;
    }
  }
}

// =============================================
//  DRAWING HELPERS
// =============================================
function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function rectU(gx, gy, gw, gh, color) {
  // Draw in "U" units (each unit = U canvas px)
  ctx.fillStyle = color;
  ctx.fillRect(gx * U, gy * U, gw * U, gh * U);
}

// =============================================
//  DRAW: OUTDOOR VIEW (through window)
// =============================================
function drawWindowView() {
  const wx = WIN_X1, wy = WIN_Y1, ww = WIN_W, wh = WIN_H;

  // Sky — top band lighter
  rect(wx, wy,      ww, Math.ceil(wh * 0.40), C.skyHi);
  rect(wx, wy + Math.ceil(wh * 0.40), ww, Math.ceil(wh * 0.60), C.skyLo);

  // Distant London rooftops/silhouettes
  const bldData = [
    [0,  28, 38],[40, 18, 30],[72, 36, 25],[99, 22, 35],
    [136,32, 28],[166,14, 20],[188,40, 30],[220,25, 35],
    [257,30, 28],[287,18, 40],[329,34, 31],
  ];
  const bldBaseY = wy + Math.floor(wh * 0.42);
  ctx.fillStyle = C.roofMid;
  for (const [bx, bh, bw] of bldData) {
    if (bx + bw <= ww) ctx.fillRect(wx + bx, bldBaseY - bh, bw, bh);
  }
  // Dark rooftops
  ctx.fillStyle = C.roofDark;
  for (const [bx, bh, bw] of bldData) {
    if (bx + bw <= ww) ctx.fillRect(wx + bx, bldBaseY - bh, bw, 4);
  }

  // Chimneys
  ctx.fillStyle = C.chimney;
  const chims = [[10,8],[52,6],[85,10],[145,7],[200,9],[234,8],[270,6],[310,9]];
  for (const [cx, cw] of chims) {
    if (cx + cw <= ww) {
      const bld = bldData.find(b => cx >= b[0] && cx < b[0] + b[2]);
      if (bld) {
        const baseY = bldBaseY - bld[1];
        ctx.fillRect(wx + cx, baseY - 12, cw, 12);
      }
    }
  }

  // Big Ben silhouette (right side)
  ctx.fillStyle = C.bigBen;
  ctx.fillRect(wx + 298, bldBaseY - 60, 22, 60);
  ctx.fillRect(wx + 300, bldBaseY - 68, 18, 10);
  ctx.fillRect(wx + 303, bldBaseY - 74, 12, 8);
  ctx.fillRect(wx + 306, bldBaseY - 80, 6, 8);

  // ── Tree layers (dense green, fills most of window) ──
  // Layer 1: dark back
  ctx.fillStyle = C.treeD;
  rect(wx, wy + Math.floor(wh * 0.44), ww, Math.ceil(wh * 0.56));
  // Bumps
  for (let bx = 0; bx < ww; bx += 28) {
    const bh = 16 + (bx * 7 + 5) % 18;
    ctx.fillRect(wx + bx, wy + Math.floor(wh * 0.44) - bh, 32, bh + 4);
  }

  // Layer 2: medium
  ctx.fillStyle = C.treeM;
  rect(wx, wy + Math.floor(wh * 0.54), ww, Math.ceil(wh * 0.46));
  for (let bx = 6; bx < ww; bx += 22) {
    const bh = 12 + (bx * 11 + 3) % 14;
    ctx.fillRect(wx + bx, wy + Math.floor(wh * 0.54) - bh, 26, bh + 3);
  }

  // Layer 3: mid-light
  ctx.fillStyle = C.treeMl;
  rect(wx, wy + Math.floor(wh * 0.62), ww, Math.ceil(wh * 0.38));
  for (let bx = 2; bx < ww; bx += 18) {
    const bh = 10 + (bx * 9 + 7) % 12;
    ctx.fillRect(wx + bx, wy + Math.floor(wh * 0.62) - bh, 22, bh + 3);
  }

  // Layer 4: bright front canopy
  ctx.fillStyle = C.treeL;
  rect(wx, wy + Math.floor(wh * 0.70), ww, Math.ceil(wh * 0.30));
  for (let bx = 0; bx < ww; bx += 14) {
    const bh = 8 + (bx * 13 + 1) % 12;
    ctx.fillRect(wx + bx, wy + Math.floor(wh * 0.70) - bh, 18, bh + 3);
  }

  // Sunlit highlights
  ctx.fillStyle = C.treeLl;
  for (let bx = 4; bx < ww; bx += 26) {
    const bh = 5 + (bx * 7 + 9) % 7;
    ctx.fillRect(wx + bx, wy + Math.floor(wh * 0.70) - bh - 4, 12, bh);
  }
  for (let bx = 14; bx < ww; bx += 38) {
    ctx.fillRect(wx + bx, wy + Math.floor(wh * 0.62) - 10, 8, 6);
  }
}

// =============================================
//  DRAW: WINDOW FRAME
// =============================================
function drawWindowFrame() {
  const wx = WIN_X1, wy = WIN_Y1, ww = WIN_W, wh = WIN_H;
  const fw = 8; // frame thickness

  // Outer white frame
  ctx.fillStyle = C.winFr;
  ctx.fillRect(wx - fw, wy - fw, ww + fw * 2, fw);              // top
  ctx.fillRect(wx - fw, wy,       fw, wh);                       // left
  ctx.fillRect(wx + ww, wy,       fw, wh);                       // right

  // Sill (thicker, extends out)
  ctx.fillStyle = C.winSill;
  ctx.fillRect(wx - fw - 6, wy + wh, ww + fw * 2 + 12, 14);
  ctx.fillStyle = C.winFrSh;
  ctx.fillRect(wx - fw - 6, wy + wh + 12, ww + fw * 2 + 12, 2);

  // Frame shadow / depth
  ctx.fillStyle = C.winFrSh;
  ctx.fillRect(wx - fw, wy - fw, 2, wh + fw);
  ctx.fillRect(wx - fw, wy - fw, ww + fw * 2, 2);

  // Internal cross-bars (window panes: 2×2 grid)
  ctx.fillStyle = C.winFr;
  const midX = wx + Math.floor(ww / 2) - 2;
  const midY = wy + Math.floor(wh / 2) - 2;
  ctx.fillRect(midX, wy, 4, wh);   // vertical bar
  ctx.fillRect(wx, midY, ww, 4);   // horizontal bar

  // Bar shadows
  ctx.fillStyle = C.winFrSh;
  ctx.fillRect(midX + 3, wy, 1, wh);
  ctx.fillRect(wx, midY + 3, ww, 1);

  // Windowsill plants (little pots on sill)
  // Small round plant left
  rect(WIN_X1 - fw + 4, WIN_Y2 - 4, 16, 10, C.pot);
  rect(WIN_X1 - fw + 6, WIN_Y2 - 14, 12, 12, C.leaf);
  rect(WIN_X1 - fw + 8, WIN_Y2 - 18, 8, 6, C.leafL);
  // Small plant right
  rect(WIN_X2 - 24, WIN_Y2 - 4, 16, 10, C.pot);
  rect(WIN_X2 - 22, WIN_Y2 - 14, 12, 12, C.leaf);
  rect(WIN_X2 - 20, WIN_Y2 - 18, 8, 6, C.leafL);
  // Tiny herbs between
  rect(WIN_X1 + 30, WIN_Y2 + 1, 12, 8, C.pot);
  rect(WIN_X1 + 31, WIN_Y2 - 7, 10, 10, C.leafL);
}

// =============================================
//  DRAW: ROOM BACKGROUND (walls + floor)
// =============================================
function drawRoom() {
  // ── Back wall ──
  rect(0, 0, W, WALL_H + 4, C.wall);

  // Subtle wallpaper dot grid
  ctx.fillStyle = C.wallPat;
  for (let x = 12; x < W; x += 28) {
    for (let y = 12; y < WALL_H; y += 28) {
      ctx.fillRect(x, y, U, U);
      ctx.fillRect(x + 14, y + 14, U, U);
    }
  }

  // Skirting board (wall-floor junction)
  rect(0, WALL_H,      W, 10, C.skirting);
  rect(0, WALL_H + 10, W,  3, C.skirtLn);

  // ── Floor (wooden planks) ──
  const FLOOR_Y = WALL_H + 13;
  const PLANK   = 22;
  for (let y = FLOOR_Y, row = 0; y < H; y += PLANK, row++) {
    ctx.fillStyle = row % 2 === 0 ? C.floorA : C.floorB;
    ctx.fillRect(0, y, W, PLANK - 2);
    // plank seam
    ctx.fillStyle = C.floorLn;
    ctx.fillRect(0, y + PLANK - 2, W, 2);
  }
  // Vertical plank joints (staggered per row)
  ctx.fillStyle = C.floorLn;
  for (let y = FLOOR_Y, row = 0; y < H; y += PLANK, row++) {
    const offset = (row % 2) * 60;
    for (let x = offset; x < W; x += 120) {
      ctx.fillRect(x, y, 1, PLANK - 2);
    }
  }

  // Floor rug (centre)
  const rx = 185, ry = 348, rw = 275, rh = 100;
  rect(rx, ry, rw, rh, C.rug);
  // Rug border
  ctx.strokeStyle = C.rugBord;
  ctx.lineWidth = 4;
  ctx.strokeRect(rx + 4, ry + 4, rw - 8, rh - 8);
  // Rug pattern lines
  ctx.fillStyle = C.rugPat;
  for (let px2 = rx + 18; px2 < rx + rw - 10; px2 += 22) {
    ctx.fillRect(px2, ry + 8, 2, rh - 16);
  }
  ctx.fillRect(rx + 8, ry + rh / 2 - 1, rw - 16, 2);
}

// =============================================
//  DRAW: KITCHEN (left wall)
// =============================================
function drawKitchen() {
  const x = 38, y = 248, w = 172, h = 90;

  // Cabinet body
  rect(x, y, w, h - 18, C.kitBase);
  // Cabinet door lines
  rect(x + w / 2 - 1, y + 4, 2, h - 22, C.kitDark);
  // Door handles (brass)
  rect(x + w / 4 - 6, y + (h - 22) / 2 - 2, 12, 4, '#c8b870');
  rect(x + 3 * w / 4 - 6, y + (h - 22) / 2 - 2, 12, 4, '#c8b870');

  // Counter top
  rect(x - 3, y + h - 20, w + 6, 20, C.kitTop);
  rect(x - 3, y + h - 22, w + 6,  4, '#e0d8b8');

  // ── Kettle ──
  rect(x + 14, y + h - 42, 28, 22, C.kettle);
  rect(x + 14, y + h - 42, 28,  5, C.kettleDk);
  rect(x + 38, y + h - 36,  8, 10, C.kettleDk);  // spout
  rect(x +  8, y + h - 32,  6,  8, C.kettleDk);  // handle
  rect(x + 18, y + h - 21, 14,  5, '#888');        // base ring

  // ── Mugs ──
  rect(x + 54, y + h - 28, 14, 10, '#f8f0e8');
  rect(x + 72, y + h - 26, 12,  9, '#e8f0f0');
  rect(x + 54, y + h - 30,  4,  4, '#f8f0e8');  // handle

  // ── Jam jar ──
  rect(x + 96, y + h - 34, 14, 16, '#e8904a');
  rect(x + 96, y + h - 36, 14,  4, '#c0c0c0');  // lid

  // ── Small herb on counter ──
  rect(x + 122, y + h - 22, 18, 12, C.pot);
  rect(x + 124, y + h - 40, 14, 20, C.leaf);
  rect(x + 126, y + h - 44, 10,  7, C.leafL);
}

// =============================================
//  DRAW: BOOKSHELF (right wall)
// =============================================
function drawBookshelf() {
  const x = 640, y = 240, w = 118, h = 200;

  // Frame
  rect(x,     y, w, h, C.shelfDk);
  rect(x + 6, y + 4, w - 12, h - 8, C.shelfBk);

  // Horizontal shelves
  const shelves = [y + 8, y + 52, y + 96, y + 140];
  for (const sy of shelves) {
    rect(x, sy, w, 8, C.shelfWd);
  }
  // Bottom board
  rect(x, y + h - 8, w, 8, C.shelfWd);
  // Side boards
  rect(x, y, 8, h, C.shelfWd);
  rect(x + w - 8, y, 8, h, C.shelfWd);

  // ── Books on each shelf ──
  const bookColors = C.books;
  let bi = 0;

  // Shelf 1 — thin books
  for (let bx = x + 10; bx < x + w - 14; bx += 11) {
    rect(bx, y + 16, 9, 34, bookColors[bi % bookColors.length]);
    bi++;
  }
  // Shelf 2 — medium books
  for (let bx = x + 10; bx < x + w - 14; bx += 14) {
    rect(bx, y + 60, 12, 38, bookColors[bi % bookColors.length]);
    bi++;
  }
  // Shelf 3 — wide books
  for (let bx = x + 10; bx < x + w - 14; bx += 16) {
    rect(bx, y + 104, 14, 34, bookColors[bi % bookColors.length]);
    bi++;
  }
  // Shelf 4 — misc: framed photo, mug, small plant
  rect(x + 12, y + 148, 22, 36, '#d8d0c8');   // photo frame
  rect(x + 15, y + 150, 16, 28, '#c8e8f0');   // photo (blue sky)
  rect(x + 40, y + 154, 14, 24, '#f8f0e8');   // mug
  rect(x + 56, y + 148, 18, 14, C.pot);        // little pot
  rect(x + 57, y + 134, 16, 16, C.leafL);      // plant
  rect(x + 80, y + 148, 22, 40, '#d0c8b8');   // book stack
}

// =============================================
//  DRAW: SOFA (centre)
// =============================================
function drawSofa() {
  const x = 195, y = 262, w = 320;

  // ── Armrests ──
  rect(x - 12, y +  6, 18, 72, C.sofaD);
  rect(x - 12, y +  6, 18, 64, C.sofaB);
  rect(x - 12, y +  6, 18,  8, C.sofaL);  // arm top
  rect(x + w - 6, y + 6, 18, 72, C.sofaD);
  rect(x + w - 6, y + 6, 18, 64, C.sofaB);
  rect(x + w - 6, y + 6, 18,  8, C.sofaL);

  // ── Backrest ──
  rect(x, y,     w, 42, C.sofaD);
  rect(x, y + 2, w, 36, C.sofaB);
  rect(x, y + 2, w,  8, C.sofaL);  // highlight on top

  // ── Seat ──
  rect(x, y + 38, w, 40, C.sofaD);
  rect(x, y + 40, w, 38, C.sofaB);
  // Seat cushion dividers
  rect(x + w / 3 - 1,       y + 42, 2, 36, C.sofaD);
  rect(x + (w / 3) * 2 - 1, y + 42, 2, 36, C.sofaD);
  // Cushion highlights
  ctx.fillStyle = C.sofaL;
  ctx.fillRect(x + 6,               y + 42, Math.floor(w / 3) - 12, 6);
  ctx.fillRect(x + Math.floor(w/3) + 6, y + 42, Math.floor(w / 3) - 12, 6);
  ctx.fillRect(x + Math.floor(w/3)*2+6, y + 42, Math.floor(w / 3) - 12, 6);

  // ── Legs ──
  rect(x + 4,          y + 76, 10, 10, C.sofaLeg);
  rect(x + w - 14,     y + 76, 10, 10, C.sofaLeg);
  rect(x + w / 3 - 4,  y + 76, 10, 10, C.sofaLeg);
  rect(x + (w/3)*2 -4, y + 76, 10, 10, C.sofaLeg);
}

// =============================================
//  DRAW: COFFEE TABLE
// =============================================
function drawCoffeeTable() {
  const x = 272, y = 356, w = 180, h = 16;

  // Surface
  rect(x, y, w, h, C.tableTop);
  rect(x, y,  w, 3, '#e8d090');  // highlight

  // Legs
  rect(x + 8,       y + h, 8, 22, C.tableLeg);
  rect(x + w - 16,  y + h, 8, 22, C.tableLeg);
  rect(x + w/2 - 4, y + h, 8, 22, C.tableLeg);

  // Items on table
  rect(x + 20,  y - 10, 28, 12, '#f8f4ec');  // book / magazine
  rect(x + 22,  y - 12, 24,  4, '#c84848');  // book cover
  rect(x + 100, y - 14, 18, 18, '#d0e8e8');  // teacup
  rect(x + 102, y - 10,  3,  6, '#d0e8e8');  // cup handle
  rect(x + 140, y -  6, 22,  8, '#e8c860');  // small plate
}

// =============================================
//  DRAW: LARGE PLANT (left corner)
// =============================================
function drawLargePlant(ox, oy) {
  // Pot
  rect(ox + 8,  oy + 72, 50, 42, C.potDk);
  rect(ox + 10, oy + 72, 46, 40, C.pot);
  rect(ox + 4,  oy + 68, 58,  8, C.potDk);  // rim
  rect(ox + 6,  oy + 66, 54,  6, '#c88060'); // rim top

  // Soil
  rect(ox + 12, oy + 74, 42, 10, '#604030');

  // Stems
  rect(ox + 29, oy + 20, 4, 52, C.leafD);   // main stem
  rect(ox + 10, oy + 38, 22, 3, C.leafD);   // left branch
  rect(ox + 31, oy + 26, 22, 3, C.leafD);   // right branch

  // Leaves — spread wide
  rect(ox,      oy + 12, 38, 26, C.leaf);
  rect(ox + 2,  oy + 14, 20, 14, C.leafL);

  rect(ox + 28, oy +  2, 40, 26, C.leaf);
  rect(ox + 30, oy +  4, 20, 14, C.leafL);

  rect(ox + 12, oy -  6, 38, 28, C.leaf);
  rect(ox + 14, oy -  4, 18, 14, C.leafL);

  rect(ox + 4,  oy + 32, 28, 18, C.leafD);
  rect(ox + 32, oy + 22, 30, 20, C.leaf);

  // Tips
  ctx.fillStyle = C.treeLl;
  ctx.fillRect(ox + 2,  oy + 12, 10, 5);
  ctx.fillRect(ox + 38, oy +  4, 10, 5);
  ctx.fillRect(ox + 18, oy -  4, 10, 5);
}

// =============================================
//  DRAW: SMALL PLANT (right area)
// =============================================
function drawSmallPlant(ox, oy) {
  rect(ox + 4,  oy + 42, 28, 28, C.pot);
  rect(ox + 2,  oy + 38, 32,  6, C.potDk);
  rect(ox + 8,  oy + 14, 20, 28, C.leaf);
  rect(ox + 10, oy + 10, 16, 10, C.leafL);
  rect(ox + 12, oy + 44,  8, 10, '#604030');
}

// =============================================
//  DRAW CHARACTER
// =============================================
function drawCharacter(p) {
  const { x, y, dir, animFrame, moving, body, bodyD, hair, name } = p;

  // Sprite is drawn at (x - 10, y - 32) .. (x + 10, y)
  // Each sprite-unit = 2 canvas px → sprite is 10u wide, 16u tall
  const S  = 2;    // sprite pixel size
  const sx = x - 10;
  const sy = y - 32;

  // Helper: draw sprite-pixel at grid (col, row), respecting direction flip
  const sp = (col, row, w2, h2, color) => {
    if (!color) return;
    const drawX = dir > 0
      ? sx + col * S
      : sx + (10 - col - w2) * S;
    ctx.fillStyle = color;
    ctx.fillRect(drawX, sy + row * S, w2 * S, h2 * S);
  };

  // ── Hair ──
  sp(2, 0,  6, 1, hair);
  sp(1, 1,  8, 1, hair);
  sp(1, 2,  1, 2, hair);   // left side
  sp(8, 2,  1, 2, hair);   // right side

  // P2 has slightly longer hair (extra row)
  if (p === players[1]) sp(1, 4, 8, 1, hair);

  // ── Face ──
  sp(2, 2, 6, 2, C.skin);
  sp(2, 3, 6, 2, C.skin);
  // Eyes
  sp(3, 3, 1, 1, C.eye);
  sp(6, 3, 1, 1, C.eye);
  // Cheek shading
  sp(2, 4, 1, 1, C.skinD);
  sp(7, 4, 1, 1, C.skinD);

  // ── Shirt / body ──
  sp(2, 5, 6, 1, body);    // collar
  sp(1, 6, 8, 4, body);    // torso
  sp(1, 6, 1, 4, bodyD);   // shadow on torso left

  // ── Belt ──
  sp(1, 10, 8, 1, C.pantsD);

  // ── Legs (animated) ──
  const walkFrame = moving ? animFrame : 0;
  if (walkFrame === 0 || walkFrame === 2) {
    // Standing or mid-step
    sp(1, 11, 4, 4, C.pants);
    sp(5, 11, 4, 4, C.pants);
    sp(1, 11, 1, 4, C.pantsD);
    sp(5, 11, 1, 4, C.pantsD);
    sp(1, 14, 4, 2, C.shoe);
    sp(5, 14, 4, 2, C.shoe);
  } else if (walkFrame === 1) {
    // Left leg forward
    sp(0, 11, 4, 4, C.pants);    // left leg forward
    sp(5, 11, 4, 4, C.pants);    // right leg back
    sp(0, 11, 1, 4, C.pantsD);
    sp(5, 11, 1, 4, C.pantsD);
    sp(0, 14, 4, 2, C.shoe);
    sp(5, 14, 4, 2, C.shoe);
  } else {
    // Right leg forward
    sp(1, 11, 4, 4, C.pants);
    sp(6, 11, 4, 4, C.pants);
    sp(1, 11, 1, 4, C.pantsD);
    sp(6, 11, 1, 4, C.pantsD);
    sp(1, 14, 4, 2, C.shoe);
    sp(6, 14, 4, 2, C.shoe);
  }

  // ── Name label ──
  ctx.font = 'bold 11px "Courier New", monospace';
  const tw = ctx.measureText(name).width;
  const lx = x - tw / 2 - 4;
  const ly = sy - 14;
  rect(lx, ly, tw + 8, 13, 'rgba(10,20,10,0.65)');
  ctx.fillStyle = p === players[0] ? C.p1c : C.p2c;
  ctx.fillText(name, x - tw / 2, ly + 10);
}

// =============================================
//  DRAW: HUD overlay
// =============================================
function drawHUD() {
  // Bottom-left: P1 info
  rect(6, H - 30, 140, 24, C.uiBg);
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = C.p1c;
  ctx.fillText('P1 小崔  ↑↓←→', 12, H - 13);

  // Bottom-right: P2 info
  rect(W - 148, H - 30, 142, 24, C.uiBg);
  ctx.fillStyle = C.p2c;
  ctx.textAlign = 'right';
  ctx.fillText('P2 小叶  WASD', W - 12, H - 13);
  ctx.textAlign = 'left';

  // Top-right: title
  const title = 'London Flat 🏡';
  rect(W - 134, 6, 128, 20, C.uiBg);
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = C.uiTxt;
  ctx.textAlign = 'right';
  ctx.fillText('London Flat', W - 12, 20);
  ctx.textAlign = 'left';
}

// =============================================
//  RENDER — painter's algorithm
// =============================================
function render() {
  ctx.clearRect(0, 0, W, H);

  // 1. Room shell (walls, floor)
  drawRoom();

  // 2. Outdoor view then window frame
  drawWindowView();
  drawWindowFrame();

  // 3. Wall art / painting (left of window)
  rect(52,  42, 80, 60, '#d8c8a8');   // frame
  rect(56,  46, 72, 52, '#c8e0d0');   // painting bg
  rect(58,  48, 22, 48, C.treeD);     // tree left
  rect(80,  52, 18, 44, C.treeM);
  rect(98,  56, 22, 40, C.treeL);
  rect(60,  88, 64,  8, '#a8c8a0');   // grass

  // 4. Kitchen (draws on wall at top of floor)
  drawKitchen();

  // 5. Bookshelf (right)
  drawBookshelf();

  // 6. Sofa
  drawSofa();

  // 7. Coffee table
  drawCoffeeTable();

  // 8. Large plant
  drawLargePlant(38, 348);

  // 9. Small plant right
  drawSmallPlant(640, 438);

  // 10. Characters — sorted by y (back characters drawn first)
  const sorted = [...players].sort((a, b) => a.y - b.y);
  for (const p of sorted) drawCharacter(p);

  // 11. HUD
  drawHUD();
}

// =============================================
//  GAME LOOP
// =============================================
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
