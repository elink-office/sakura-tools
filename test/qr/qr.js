/* QRコード作成（2026-09-26 たたき台・開発室）
   ⭐外から何も読み込まない。QRの符号化はこのファイルの中で全部やる（ISO/IEC 18004 の形）
     バイトモード・UTF-8／誤り訂正 L・M・Q・H／型番は入る中でいちばん小さいもの（1〜40）／マスクは8種から減点がいちばん少ないもの
   ⭐入れた文字はどこにも送らない・どこにも残さない（保存の箱なし） */
(function () {
"use strict";

/* =====================================================================
   1. 符号化（QR本体）
   ===================================================================== */
var QR = {};

/* 誤り訂正の並び：L=0 M=1 Q=2 H=3。形式情報に入れる2ビットは L=01 M=00 Q=11 H=10 */
var ECL_FORMAT = [1, 0, 3, 2];

/* 1ブロックあたりの誤り訂正コード語の数 [誤り訂正][型番]（型番0は使わない） */
var ECC_PER_BLOCK = [
  [-1, 7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
  [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]
];
/* ブロックの数 [誤り訂正][型番] */
var NUM_BLOCKS = [
  [-1,1,1,1,1,1,2,2,2,2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
  [-1,1,1,1,2,2,4,4,4,5, 5, 5, 8, 9, 9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
  [-1,1,1,2,2,4,4,6,6,8, 8, 8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
  [-1,1,1,2,4,4,4,5,6,8, 8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]
];

/* 型番ごとの、データを置けるマスの数（機能パターン・形式情報・型番情報を除く） */
function rawModules(ver) {
  var r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    var na = Math.floor(ver / 7) + 2;
    r -= (25 * na - 10) * na - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
function dataCodewords(ver, ecl) {
  return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * NUM_BLOCKS[ecl][ver];
}

/* 位置合わせパターンの中心の座標 */
function alignPositions(ver) {
  if (ver === 1) return [];
  var na = Math.floor(ver / 7) + 2, size = ver * 4 + 17;
  var step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
  var res = [6];
  for (var pos = size - 7; res.length < na; pos -= step) res.splice(1, 0, pos);
  return res;
}

/* ---- ガロア体 GF(256)・原始多項式 x^8+x^4+x^3+x^2+1（0x11D） ---- */
function gfMul(x, y) {
  var z = 0;
  for (var i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11D);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xFF;
}
/* 生成多項式（最高次の1は省く・係数は高次から） */
function rsDivisor(degree) {
  var res = [];
  for (var i = 0; i < degree - 1; i++) res.push(0);
  res.push(1);
  var root = 1;
  for (var k = 0; k < degree; k++) {
    for (var j = 0; j < res.length; j++) {
      res[j] = gfMul(res[j], root);
      if (j + 1 < res.length) res[j] ^= res[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return res;
}
function rsRemainder(data, divisor) {
  var res = divisor.map(function () { return 0; });
  data.forEach(function (b) {
    var factor = b ^ res.shift();
    res.push(0);
    divisor.forEach(function (coef, i) { res[i] ^= gfMul(coef, factor); });
  });
  return res;
}

/* ---- UTF-8 のバイト列 ---- */
function utf8(str) {
  if (typeof TextEncoder !== "undefined") return Array.prototype.slice.call(new TextEncoder().encode(str));
  var s = unescape(encodeURIComponent(str)), out = [];
  for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  return out;
}

/* ---- データのビット列 → コード語 ---- */
function buildCodewords(bytes, ver, ecl) {
  var bits = [];
  function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
  put(4, 4);                                   /* バイトモード 0100 */
  put(bytes.length, ver <= 9 ? 8 : 16);        /* 文字数（型番1〜9は8ビット、10〜40は16ビット） */
  bytes.forEach(function (b) { put(b, 8); });
  var cap = dataCodewords(ver, ecl) * 8;
  put(0, Math.min(4, cap - bits.length));      /* 終端パターン（最大4ビット） */
  put(0, (8 - bits.length % 8) % 8);           /* 8ビットの区切りまで0 */
  for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);  /* 埋め草 11101100 / 00010001 */
  var data = [];
  for (var i = 0; i < bits.length; i += 8) {
    var v = 0;
    for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    data.push(v);
  }
  return data;
}

/* ---- ブロックに分けて誤り訂正を付け、交互に並べる ---- */
function addEccAndInterleave(data, ver, ecl) {
  var numBlocks = NUM_BLOCKS[ecl][ver], eccLen = ECC_PER_BLOCK[ecl][ver];
  var rawCw = Math.floor(rawModules(ver) / 8);
  var numShort = numBlocks - rawCw % numBlocks;
  var shortLen = Math.floor(rawCw / numBlocks);
  var div = rsDivisor(eccLen), blocks = [], k = 0;
  for (var i = 0; i < numBlocks; i++) {
    var dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
    k += dat.length;
    var ecc = rsRemainder(dat, div);
    if (i < numShort) dat.push(0);             /* 短いブロックの穴（並べるときに飛ばす） */
    blocks.push(dat.concat(ecc));
  }
  var res = [], blockOf = [];
  for (var c = 0; c < blocks[0].length; c++) {
    for (var b = 0; b < blocks.length; b++) {
      if (c !== shortLen - eccLen || b >= numShort) { res.push(blocks[b][c]); blockOf.push(b); }
    }
  }
  /* ⭐blockOf＝並べたあとのコード語が、どのブロックのものか（真ん中の文字で隠れる量を数えるのに使う） */
  res.blockOf = blockOf;
  return res;
}

/* ---- マスの図 ---- */
function Grid(ver) {
  this.ver = ver;
  this.size = ver * 4 + 17;
  this.m = []; this.fn = []; this.cw = [];
  for (var y = 0; y < this.size; y++) {
    this.m.push(new Array(this.size).fill(false));
    this.fn.push(new Array(this.size).fill(false));
    this.cw.push(new Array(this.size).fill(-1));   /* そのマスが何番目のコード語か（-1＝コード語ではない） */
  }
}
Grid.prototype.setFn = function (x, y, dark) { this.m[y][x] = dark; this.fn[y][x] = true; };

function drawFunctionPatterns(g) {
  var s = g.size, i, j;
  /* タイミングパターン */
  for (i = 0; i < s; i++) { g.setFn(6, i, i % 2 === 0); g.setFn(i, 6, i % 2 === 0); }
  /* 位置検出パターン（分離パターンも含めて9×9） */
  [[3, 3], [s - 4, 3], [3, s - 4]].forEach(function (c) {
    for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
      var d = Math.max(Math.abs(dx), Math.abs(dy)), x = c[0] + dx, y = c[1] + dy;
      if (x >= 0 && x < s && y >= 0 && y < s) g.setFn(x, y, d !== 2 && d !== 4);
    }
  });
  /* 位置合わせパターン */
  var ap = alignPositions(g.ver), n = ap.length;
  for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
    for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++)
      g.setFn(ap[i] + dx2, ap[j] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
  }
  /* 形式情報の場所を先に取っておく（中身はあとで） */
  drawFormat(g, 0, 0);
  drawVersion(g);
}

function formatBits(ecl, mask) {
  var data = (ECL_FORMAT[ecl] << 3) | mask, rem = data;
  for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}
function drawFormat(g, ecl, mask) {
  var bits = formatBits(ecl, mask), s = g.size, i;
  function bit(k) { return ((bits >>> k) & 1) !== 0; }
  /* 1つ目（左上のまわり） */
  for (i = 0; i <= 5; i++) g.setFn(8, i, bit(i));
  g.setFn(8, 7, bit(6));
  g.setFn(8, 8, bit(7));
  g.setFn(7, 8, bit(8));
  for (i = 9; i < 15; i++) g.setFn(14 - i, 8, bit(i));
  /* 2つ目（右上と左下） */
  for (i = 0; i < 8; i++) g.setFn(s - 1 - i, 8, bit(i));
  for (i = 8; i < 15; i++) g.setFn(8, s - 15 + i, bit(i));
  g.setFn(8, s - 8, true);                     /* いつも黒のマス */
}
function drawVersion(g) {
  if (g.ver < 7) return;
  var rem = g.ver;
  for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
  var bits = (g.ver << 12) | rem;
  for (var k = 0; k < 18; k++) {
    var b = ((bits >>> k) & 1) !== 0, a = g.size - 11 + k % 3, c = Math.floor(k / 3);
    g.setFn(a, c, b);
    g.setFn(c, a, b);
  }
}

/* コード語を右下から2列ずつジグザグに置く */
function drawCodewords(g, cw) {
  var s = g.size, i = 0, total = cw.length * 8;
  for (var right = s - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;                /* 縦のタイミングパターンの列は飛ばす */
    for (var v = 0; v < s; v++) {
      for (var j = 0; j < 2; j++) {
        var x = right - j, up = ((right + 1) & 2) === 0, y = up ? s - 1 - v : v;
        if (!g.fn[y][x] && i < total) {
          g.m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          g.cw[y][x] = i >>> 3;
          i++;
        }
      }
    }
  }
}

var MASKS = [
  function (x, y) { return (x + y) % 2 === 0; },
  function (x, y) { return y % 2 === 0; },
  function (x, y) { return x % 3 === 0; },
  function (x, y) { return (x + y) % 3 === 0; },
  function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
  function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
  function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
  function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
];
function applyMask(g, mask) {
  var f = MASKS[mask];
  for (var y = 0; y < g.size; y++) for (var x = 0; x < g.size; x++)
    if (!g.fn[y][x] && f(x, y)) g.m[y][x] = !g.m[y][x];
}

/* 減点（規格の4つの決まり） */
function penalty(g) {
  var s = g.size, m = g.m, score = 0, x, y, dark = 0;
  function lineScore(get) {
    var sc = 0, run = 1;
    for (var i = 1; i < s; i++) {
      if (get(i) === get(i - 1)) { run++; if (run === 5) sc += 3; else if (run > 5) sc += 1; }
      else run = 1;
    }
    /* 1:1:3:1:1 の並び＋片側に白4つ（外は白として数える） */
    var P1 = [1,0,1,1,1,0,1,0,0,0,0], P2 = [0,0,0,0,1,0,1,1,1,0,1];
    for (var st = -4; st <= s - 7; st++) {
      var ok1 = true, ok2 = true;
      for (var k = 0; k < 11; k++) {
        var p = st + k, v = (p >= 0 && p < s) ? (get(p) ? 1 : 0) : 0;
        if (v !== P1[k]) ok1 = false;
        if (v !== P2[k]) ok2 = false;
        if (!ok1 && !ok2) break;
      }
      if (ok1) sc += 40;
      if (ok2) sc += 40;
    }
    return sc;
  }
  for (y = 0; y < s; y++) score += lineScore(function (i) { return m[y][i]; });
  for (x = 0; x < s; x++) score += lineScore(function (i) { return m[i][x]; });
  for (y = 0; y < s - 1; y++) for (x = 0; x < s - 1; x++) {
    var c = m[y][x];
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
  }
  for (y = 0; y < s; y++) for (x = 0; x < s; x++) if (m[y][x]) dark++;
  var total = s * s;
  score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  return score;
}

/* 入り口：文字 → { size, modules[y][x], ver, ecl, mask } ／入りきらないときは null */
QR.encode = function (text, ecl, forceMask, minVer) {
  var bytes = utf8(text), ver;
  for (ver = minVer || 1; ver <= 40; ver++) {
    var need = 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8;
    if (need <= dataCodewords(ver, ecl) * 8) break;
  }
  if (ver > 40) return null;
  var cw = addEccAndInterleave(buildCodewords(bytes, ver, ecl), ver, ecl);
  var base = new Grid(ver);
  drawFunctionPatterns(base);
  drawCodewords(base, cw);
  var best = null, bestScore = Infinity;
  var list = (typeof forceMask === "number") ? [forceMask] : [0, 1, 2, 3, 4, 5, 6, 7];
  list.forEach(function (mask) {
    var g = new Grid(ver);
    g.m = base.m.map(function (r) { return r.slice(); });
    g.fn = base.fn;
    applyMask(g, mask);
    drawFormat(g, ecl, mask);
    var sc = penalty(g);
    if (sc < bestScore) { bestScore = sc; best = { g: g, mask: mask }; }
  });
  return { size: best.g.size, modules: best.g.m, ver: ver, ecl: ecl, mask: best.mask, bytes: bytes.length,
           cwAt: base.cw, blockOf: cw.blockOf, eccLen: ECC_PER_BLOCK[ecl][ver], numBlocks: NUM_BLOCKS[ecl][ver], fn: base.fn };
};

/* ⭐真ん中を隠しても読めるか（2026-09-29 本人「QRコードに文字入れられないの？」）
   隠れたマスが入っているコード語を、ブロックごとに数える。
   1ブロックで直せるのは 誤り訂正のコード語の半分まで。⭐その7割までに抑える（汚れ・印刷のにじみの分を残す）
   ⚠位置検出パターン（3つの角の大きい四角）にかかるときは読めないものとする
   box＝{x0,y0,x1,y1}（マスの番号・x1,y1 は含まない） */
QR.coverOk = function (q, box) {
  var hit = {}, perBlock = [], b, x, y, s = q.size;
  for (b = 0; b < q.numBlocks; b++) perBlock.push(0);
  for (y = Math.max(0, box.y0); y < Math.min(s, box.y1); y++) {
    for (x = Math.max(0, box.x0); x < Math.min(s, box.x1); x++) {
      if ((x < 9 && y < 9) || (x >= s - 8 && y < 9) || (x < 9 && y >= s - 8)) return { ok: false, worst: 1 };
      var k = q.cwAt[y][x];
      if (k >= 0 && !hit[k]) { hit[k] = true; perBlock[q.blockOf[k]]++; }
    }
  }
  var limit = Math.floor(Math.floor(q.eccLen / 2) * 0.7), worst = 0;
  for (b = 0; b < perBlock.length; b++) worst = Math.max(worst, perBlock[b] / Math.max(1, limit));
  return { ok: worst <= 1, worst: worst };
};
QR._formatBits = formatBits;
QR._alignPositions = alignPositions;
QR._dataCodewords = dataCodewords;
window.SakuraQR = QR;   /* 確かめる用（画面の動きには使わない） */

/* =====================================================================
   2. 画面
   ===================================================================== */
var $ = function (id) { return document.getElementById(id); };
var SIZES = { s: 256, m: 512, l: 1024 };      /* PNGのおよその大きさ（ピクセル） */
var ECL_NAME = ["L", "M", "Q", "H"];
var cur = null;                               /* いま出ているQR */

var FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","BIZ UDPGothic",Meiryo,sans-serif';

function opts() {
  var size = document.querySelector('input[name="qrSize"]:checked').value;
  var ecl = parseInt(document.querySelector('input[name="qrEcl"]:checked').value, 10);
  var mid = $("qrMid").value.replace(/^\s+|\s+$/g, ""), under = $("qrUnder").value.replace(/^\s+|\s+$/g, "");
  return { size: size, ecl: mid ? 3 : ecl, eclPicked: ecl, color: $("qrColor").value || "#000000",
           quiet: $("qrQuiet").checked ? 4 : 0, mid: mid, under: under };
}

/* 色番号（#1a3a6b・1a3a6b・#abc）→ #rrggbb ／読めないときは null */
function normHex(v) {
  v = (v || "").replace(/\s/g, "").replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.replace(/(.)/g, "$1$1");
  return /^[0-9a-fA-F]{6}$/.test(v) ? "#" + v.toLowerCase() : null;
}

/* 文字の幅（1文字の高さ＝1 として）。canvas で測る */
var measureCtx = null;
function textWidth(t, weight) {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = weight + " 100px " + FONT;
  return measureCtx.measureText(t).width / 100;
}

/* ⭐並べ方（単位＝マス）。真ん中の白い四角・下の文字の場所
   真ん中＝高さはQRの約14%（奇数マス・3マス以上）、幅は文字に合わせる。⚠QRの幅の半分を超えたら入らない
   下の文字＝字の高さはQRの幅の7%。長いときは幅に収まるまで小さくする */
function layout(q, o) {
  var n = q.size + o.quiet * 2, L = { n: n, w: n, h: n, mid: null, under: null };
  if (o.mid) {
    var hM = Math.max(3, Math.round(q.size * 0.14)); if (hM % 2 === 0) hM++;
    var fs = hM * 0.6, tw = textWidth(o.mid, 700) * fs;
    var wM = Math.max(hM, Math.ceil(tw + hM * 0.55)); if ((q.size - wM) % 2 !== 0) wM++;
    var x0 = (q.size - wM) / 2, y0 = (q.size - hM) / 2;
    L.mid = { x0: x0, y0: y0, x1: x0 + wM, y1: y0 + hM, fs: fs, tooWide: wM > q.size * 0.5 };
  }
  if (o.under) {
    var ufs = q.size * 0.07, maxW = n * 0.92, uw = textWidth(o.under, 700) * ufs;
    if (uw > maxW) ufs *= maxW / uw;
    var gap = o.quiet ? 0 : ufs * 0.6, uh = gap + ufs * 1.9;
    L.under = { fs: ufs, y: n + gap + ufs * 0.95, h: uh };
    L.h = n + uh;
  }
  return L;
}

/* 色が明るすぎないか（白い紙の上で読めるか） */
function tooLight(hex) {
  var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return (1.05) / (L + 0.05) < 4.5;            /* 白との明るさの差が小さい */
}

function drawCanvas(canvas, q, o, scale, L) {
  L = L || layout(q, o);
  var W = L.w * scale, H = Math.ceil(L.h * scale), qz = o.quiet;
  canvas.width = W; canvas.height = H;
  var c = canvas.getContext("2d");
  c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H);
  c.fillStyle = o.color;
  for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++)
    if (q.modules[y][x]) c.fillRect((x + qz) * scale, (y + qz) * scale, scale, scale);
  c.textAlign = "center"; c.textBaseline = "middle";
  if (L.mid) {
    var m = L.mid;
    c.fillStyle = "#ffffff";
    c.fillRect((m.x0 + qz) * scale, (m.y0 + qz) * scale, (m.x1 - m.x0) * scale, (m.y1 - m.y0) * scale);
    c.fillStyle = o.color; c.font = "700 " + (m.fs * scale) + "px " + FONT;
    c.fillText(o.mid, (qz + q.size / 2) * scale, (qz + q.size / 2) * scale + m.fs * scale * 0.04);
  }
  if (L.under) {
    c.fillStyle = o.color; c.font = "700 " + (L.under.fs * scale) + "px " + FONT;
    c.fillText(o.under, (L.w / 2) * scale, L.under.y * scale);
  }
}
function pngScale(q, o) {
  var n = q.size + o.quiet * 2;
  return Math.max(1, Math.round(SIZES[o.size] / n));
}
function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function render() {
  var text = $("qrText").value.replace(/^\s+|\s+$/g, "");
  var o = opts(), box = $("qrPreview"), msg = $("qrMsg"), info = $("qrInfo");
  $("qrColorWarn").hidden = !tooLight(o.color);
  $("qrBytes").textContent = text ? utf8(text).length + "バイト" : "";
  if (!text) {
    cur = null; box.classList.add("empty"); msg.textContent = "①に入れると、QRコードが出ます。"; info.textContent = "";
    setSave(false); return;
  }
  $("qrMidNote").hidden = !o.mid;
  var q = QR.encode(text, o.ecl);
  if (!q) {
    cur = null; box.classList.add("empty");
    msg.textContent = o.mid
      ? "文字が多すぎて、真ん中に文字を入れるとQRコードに入りません。①の文字を減らすか、③の中の真ん中の文字を消してください。"
      : o.ecl > 0
      ? "文字が多すぎて、QRコードに入りません。文字を減らすか、②の中の誤り訂正をLにしてください。"
      : "文字が多すぎて、QRコードに入りません。文字を減らしてください。";
    info.textContent = ""; setSave(false); return;
  }
  var L = layout(q, o);
  if (L.mid) {
    var cv = L.mid.tooWide ? { ok: false } : QR.coverOk(q, L.mid);
    /* ⭐隠れる量が多いときは、QRを少し大きく（型番を上げて）作り直す＝誤り訂正のコード語が増えて、真ん中の四角の割合も小さくなる。6段まで */
    for (var up = 1; !cv.ok && up <= 6 && q.ver + 1 <= 40; up++) {
      var q2 = QR.encode(text, o.ecl, undefined, q.ver + 1);
      if (!q2) break;
      q = q2; L = layout(q, o);
      cv = L.mid.tooWide ? { ok: false } : QR.coverOk(q, L.mid);
    }
    if (!cv.ok) {
      cur = null; box.classList.add("empty");
      msg.textContent = "真ん中の文字が長すぎて、読み取れなくなるおそれがあります。③の中の真ん中の文字を短くしてください。";
      info.textContent = ""; setSave(false); return;
    }
  }
  cur = { q: q, o: o, L: L };
  box.classList.remove("empty"); msg.textContent = "";
  drawCanvas($("qrCanvas"), q, o, Math.max(2, Math.floor(240 / L.w)), L);
  var sc = pngScale(q, o), pw = L.w * sc, ph = Math.ceil(L.h * sc);
  info.textContent = q.size + "×" + q.size + "マス（型番" + q.ver + "・誤り訂正" + ECL_NAME[q.ecl] + "）／PNGは" + pw + "×" + ph + "ピクセル";
  setSave(true);
}
function setSave(on) { $("savePng").disabled = !on; $("saveSvg").disabled = !on; }

function download(blob, name) {
  var a = document.createElement("a"), url = URL.createObjectURL(blob);
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
/* ⭐保存の知らせ＝ボタンの下の案内の1行を書きかえて、3.5秒で元の文に戻す（ページの型 8-a「案内の1行は空にしない」） */
var msgTimer = null, MSG0 = null;
function saveMsg(t) {
  var el = $("saveMsg"); if (MSG0 === null) MSG0 = el.textContent;
  el.textContent = t; el.classList.add("saved");
  clearTimeout(msgTimer); msgTimer = setTimeout(function () { el.textContent = MSG0; el.classList.remove("saved"); }, 3500);
}

function savePng() {
  if (!cur) return;
  var cv = document.createElement("canvas");
  drawCanvas(cv, cur.q, cur.o, pngScale(cur.q, cur.o), cur.L);
  if (cv.toBlob) {
    cv.toBlob(function (b) { if (b) { download(b, "qrcode.png"); saveMsg("PNG画像を保存しました"); } }, "image/png");
  } else {
    var a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "qrcode.png";
    document.body.appendChild(a); a.click(); a.remove(); saveMsg("PNG画像を保存しました");
  }
}
function saveSvg() {
  if (!cur) return;
  var q = cur.q, o = cur.o, L = cur.L, n = L.w, H = +L.h.toFixed(3), qz = o.quiet, d = [];
  for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++)
    if (q.modules[y][x]) d.push("M" + (x + qz) + "," + (y + qz) + "h1v1h-1z");
  var extra = "", ff = ' font-family=\'' + FONT.replace(/"/g, "") + '\' font-weight="700" text-anchor="middle" dominant-baseline="central"';
  if (L.mid) {
    var m = L.mid;
    extra += '<rect x="' + (m.x0 + qz) + '" y="' + (m.y0 + qz) + '" width="' + (m.x1 - m.x0) + '" height="' + (m.y1 - m.y0) + '" fill="#ffffff"/>\n' +
      '<text x="' + (qz + q.size / 2) + '" y="' + (qz + q.size / 2) + '" font-size="' + m.fs.toFixed(3) + '" fill="' + o.color + '"' + ff + '>' + esc(o.mid) + '</text>\n';
  }
  if (L.under) {
    extra += '<text x="' + (n / 2) + '" y="' + L.under.y.toFixed(3) + '" font-size="' + L.under.fs.toFixed(3) + '" fill="' + o.color + '"' + ff + '>' + esc(o.under) + '</text>\n';
  }
  var svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + " " + H + '" width="' + n * 8 + '" height="' + Math.round(H * 8) + '">\n' +
    '<rect width="' + n + '" height="' + H + '" fill="#ffffff"/>\n' +
    '<path fill="' + o.color + '" shape-rendering="crispEdges" d="' + d.join("") + '"/>\n' + extra + '</svg>\n';
  download(new Blob([svg], { type: "image/svg+xml" }), "qrcode.svg");
  saveMsg("SVGを保存しました");
}

/* 「？」の開け閉め（見出しのすぐ下の .tip-body を出し入れ。長いものは tip.js がポップアップにする） */
document.addEventListener("click", function (e) {
  var b = e.target.closest(".tip-btn"); if (!b) return;
  var host = b.closest("h2,summary,p,label"), body = host && host.nextElementSibling;
  if (!body || !body.classList.contains("tip-body")) return;
  e.preventDefault(); body.hidden = !body.hidden; b.setAttribute("aria-expanded", body.hidden ? "false" : "true");
});

function start() {
  $("qrText").addEventListener("input", render);
  document.querySelectorAll('input[name="qrSize"],input[name="qrEcl"],#qrQuiet').forEach(function (el) {
    el.addEventListener("change", render);
  });
  /* ⭐色は2通り（2026-09-29 本人「色番号で指示できるようにもしたほうがいいね」）＝色の見本から選ぶ／色番号を打つ。どちらを変えても、もう片方がそろう */
  $("qrColor").addEventListener("input", function () { $("qrHex").value = $("qrColor").value; $("qrHexWarn").hidden = true; render(); });
  $("qrHex").addEventListener("input", function () {
    var h = normHex($("qrHex").value);
    $("qrHexWarn").hidden = !!h || !$("qrHex").value;
    if (h) { $("qrColor").value = h; render(); }
  });
  $("qrHex").addEventListener("change", function () { var h = normHex($("qrHex").value); if (h) $("qrHex").value = h; });
  $("qrColorReset").addEventListener("click", function () { $("qrColor").value = "#000000"; $("qrHex").value = "#000000"; $("qrHexWarn").hidden = true; render(); });
  $("qrMid").addEventListener("input", render);
  $("qrUnder").addEventListener("input", render);
  $("qrClear").addEventListener("click", function () { $("qrText").value = ""; render(); $("qrText").focus(); });
  $("savePng").addEventListener("click", savePng);
  $("saveSvg").addEventListener("click", saveSvg);
  render();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
