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
  var res = [];
  for (var c = 0; c < blocks[0].length; c++) {
    for (var b = 0; b < blocks.length; b++) {
      if (c !== shortLen - eccLen || b >= numShort) res.push(blocks[b][c]);
    }
  }
  return res;
}

/* ---- マスの図 ---- */
function Grid(ver) {
  this.ver = ver;
  this.size = ver * 4 + 17;
  this.m = []; this.fn = [];
  for (var y = 0; y < this.size; y++) {
    this.m.push(new Array(this.size).fill(false));
    this.fn.push(new Array(this.size).fill(false));
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
QR.encode = function (text, ecl, forceMask) {
  var bytes = utf8(text), ver;
  for (ver = 1; ver <= 40; ver++) {
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
  return { size: best.g.size, modules: best.g.m, ver: ver, ecl: ecl, mask: best.mask, bytes: bytes.length };
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

function opts() {
  var size = document.querySelector('input[name="qrSize"]:checked').value;
  var ecl = parseInt(document.querySelector('input[name="qrEcl"]:checked').value, 10);
  return { size: size, ecl: ecl, color: $("qrColor").value || "#000000", quiet: $("qrQuiet").checked ? 4 : 0 };
}

/* 色が明るすぎないか（白い紙の上で読めるか） */
function tooLight(hex) {
  var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return (1.05) / (L + 0.05) < 4.5;            /* 白との明るさの差が小さい */
}

function drawCanvas(canvas, q, o, scale) {
  var n = q.size + o.quiet * 2, px = n * scale;
  canvas.width = px; canvas.height = px;
  var c = canvas.getContext("2d");
  c.fillStyle = "#ffffff"; c.fillRect(0, 0, px, px);
  c.fillStyle = o.color;
  for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++)
    if (q.modules[y][x]) c.fillRect((x + o.quiet) * scale, (y + o.quiet) * scale, scale, scale);
}
function pngScale(q, o) {
  var n = q.size + o.quiet * 2;
  return Math.max(1, Math.round(SIZES[o.size] / n));
}

function render() {
  var text = $("qrText").value.replace(/^\s+|\s+$/g, "");
  var o = opts(), box = $("qrPreview"), msg = $("qrMsg"), info = $("qrInfo");
  $("qrColorWarn").hidden = !tooLight(o.color);
  $("qrBytes").textContent = text ? utf8(text).length + "バイト" : "";
  if (!text) {
    cur = null; box.classList.add("empty"); msg.textContent = "①に入れると、QRコードが出ます。"; info.textContent = "";
    setSave(false); return;
  }
  var q = QR.encode(text, o.ecl);
  if (!q) {
    cur = null; box.classList.add("empty");
    msg.textContent = o.ecl > 0
      ? "文字が多すぎて、QRコードに入りません。文字を減らすか、②の中の誤り訂正をLにしてください。"
      : "文字が多すぎて、QRコードに入りません。文字を減らしてください。";
    info.textContent = ""; setSave(false); return;
  }
  cur = { q: q, o: o };
  box.classList.remove("empty"); msg.textContent = "";
  drawCanvas($("qrCanvas"), q, o, Math.max(2, Math.floor(240 / (q.size + o.quiet * 2))));
  var sc = pngScale(q, o), px = (q.size + o.quiet * 2) * sc;
  info.textContent = q.size + "×" + q.size + "マス（型番" + q.ver + "・誤り訂正" + ECL_NAME[q.ecl] + "）／PNGは" + px + "×" + px + "ピクセル";
  setSave(true);
}
function setSave(on) { $("savePng").disabled = !on; $("saveSvg").disabled = !on; }

function download(blob, name) {
  var a = document.createElement("a"), url = URL.createObjectURL(blob);
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
var msgTimer = null;
function saveMsg(t) {
  var el = $("saveMsg"); el.textContent = t;
  clearTimeout(msgTimer); msgTimer = setTimeout(function () { el.textContent = ""; }, 3500);
}

function savePng() {
  if (!cur) return;
  var cv = document.createElement("canvas");
  drawCanvas(cv, cur.q, cur.o, pngScale(cur.q, cur.o));
  if (cv.toBlob) {
    cv.toBlob(function (b) { if (b) { download(b, "qrcode.png"); saveMsg("PNG画像を保存しました"); } }, "image/png");
  } else {
    var a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "qrcode.png";
    document.body.appendChild(a); a.click(); a.remove(); saveMsg("PNG画像を保存しました");
  }
}
function saveSvg() {
  if (!cur) return;
  var q = cur.q, o = cur.o, n = q.size + o.quiet * 2, d = [];
  for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++)
    if (q.modules[y][x]) d.push("M" + (x + o.quiet) + "," + (y + o.quiet) + "h1v1h-1z");
  var svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + " " + n + '" width="' + n * 8 + '" height="' + n * 8 + '" shape-rendering="crispEdges">\n' +
    '<rect width="' + n + '" height="' + n + '" fill="#ffffff"/>\n' +
    '<path fill="' + o.color + '" d="' + d.join("") + '"/>\n</svg>\n';
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
  $("qrColor").addEventListener("input", render);
  $("qrColorReset").addEventListener("click", function () { $("qrColor").value = "#000000"; render(); });
  $("qrClear").addEventListener("click", function () { $("qrText").value = ""; render(); $("qrText").focus(); });
  $("savePng").addEventListener("click", savePng);
  $("saveSvg").addEventListener("click", saveSvg);
  render();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
