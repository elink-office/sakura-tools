/* ============================================================
   paper-pdf.js ― 画面の紙を、そのままPDFにする（2026-09-13）

   🔴⭐本人がいちばん大事だと言っていること
   「**PDFのレイアウト、見本と一緒っていうのがすごく最重要**」
   「**PDFが綺麗に出るんだったら、もう絶対に印刷もきれいに出る**」
   → ⭐だからこの部品は「作り直す」のではなく、⭐**画面の紙を測って写す**。

   🔴⭐なぜ作ったか
   ブラウザの印刷に紙を渡すと、⚠端末とブラウザの都合で紙が変わる
   （iPhoneで0.87倍に縮む／下が切れる／画面用の文字が混ざる。2026-09-12）。
   ⚠iPhoneには余白の設定が無く、使う側では直せない。
   ⭐経理（keiri-pdf.js）で先に解決した考え方を、座席表・席次表にも使う。

   ⭐使い方＝ PAPER_PDF.save(document.getElementById('sheet'), { name:'座席表', landscape:true })

   ⚠絵文字（🌸😊🍀✏️⭐）はフォントに入っていないので、⭐小さな絵にして貼る。
     ★（U+2605）は文字として入っているのでそのまま出る。
   ============================================================ */
(function (global) {
  'use strict';

  /* ⭐道具とフォントは経理と共通（test/keiri-lib/）。⚠2つ持たない */
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    if (!s) return 'keiri-lib/';
    return s.replace(/paper-pdf\.js.*$/, '') + 'keiri-lib/';
  })();

  var PX = 3.7795275591;          /* 1mm あたりの画面の点（96dpi） */
  var lib = null;

  /* ========== 道具とフォントを読む（経理と同じ） ========== */
  function loadScript(src) {
    return new Promise(function (ok, ng) {
      if (document.querySelector('script[src="' + src + '"]')) return ok();
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { ok(); };
      s.onerror = function () { ng(new Error('読み込めませんでした: ' + src)); };
      document.head.appendChild(s);
    });
  }
  /* 🔴⭐フォントは <script> で読む（2026-09-13）。
     ⚠fetch で .ttf を取りに行く形にしていたが、⭐**ファイルを直接開いたとき**（file:///…）
       ブラウザが止めるので「Failed to fetch」になった（本人のPCで発生）。
     ⭐<script> なら、直接開いてもサイトから開いても同じように読める */
  function ready() {
    if (lib) return Promise.resolve(lib);
    return loadScript(BASE + 'jspdf.umd.min.js')
      .then(function () { return loadScript(BASE + 'NotoSansJP-Regular.js'); })
      .then(function () { return loadScript(BASE + 'NotoSansJP-Bold.js'); })
      .then(function () {
        var f = global.NJP_FONT || {};
        if (!f.reg || !f.bold) throw new Error('フォントを読み込めませんでした');
        lib = { jsPDF: global.jspdf.jsPDF, reg: f.reg, bold: f.bold };
        return lib;
      });
  }

  function addFonts(doc) {
    doc.addFileToVFS('NJP-R.ttf', lib.reg);
    doc.addFont('NJP-R.ttf', 'NJP', 'normal');
    doc.addFileToVFS('NJP-B.ttf', lib.bold);
    doc.addFont('NJP-B.ttf', 'NJP', 'bold');
    doc.setFont('NJP', 'normal');
  }

  /* ========== 絵文字 ========== */
  /* ⚠フォントに入っていない字。⭐★(2605)は入っているので外す */
  var EMOJI = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[✀-➿⬀-⯿]|️/;
  function hasEmoji(s) { return EMOJI.test(s); }

  /* ⭐絵文字を小さな絵にする（文字として置けないため） */
  function emojiImage(s, px) {
    var k = 4;                                   /* ⭐4倍で描く＝拡大してもぼやけない */
    var cv = document.createElement('canvas');
    cv.width = Math.ceil(px * k); cv.height = Math.ceil(px * k);
    var x = cv.getContext('2d');
    x.clearRect(0, 0, cv.width, cv.height);
    x.font = (px * k) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(s, cv.width / 2, cv.height / 2);
    return cv.toDataURL('image/png');
  }

  /* ⭐CSSのかたむきを、PDFの角度に直す（⚠画面は下向きがプラス、PDFは上向きがプラス） */
  function angleOf(cs) {
    var t = cs.transform;
    if (!t || t === 'none') return 0;
    var a = t.indexOf('('), b = t.lastIndexOf(')');
    if (a < 0 || b < 0) return 0;
    var n = t.slice(a + 1, b).split(',').map(function (v) { return parseFloat(v); });
    if (n.length < 4) return 0;
    var deg = Math.atan2(n[1], n[0]) * 180 / Math.PI;
    return -deg;
  }

  /* ========== 色 ========== */
  function rgb(s) {
    if (!s) return null;
    var m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    var p = m[1].split(',').map(function (v) { return parseFloat(v); });
    if (p.length > 3 && p[3] === 0) return null;   /* すき通っている＝塗らない */
    return [p[0], p[1], p[2], (p.length > 3 ? p[3] : 1)];
  }

  /* 🔴⭐換算の決まり（2026-09-13 ここを間違えて、文字も飾りも3.6倍になっていた）
     ⭐getBoundingClientRect の値＝画面に出ている大きさ（縮小が効いている）→ ⭐/ shrink して素の大きさに戻す
     ⭐getComputedStyle の値（font-size・border・radius・left/top）＝⭐素の大きさのまま → ⚠割らない */

  /* ========== 本体 ========== */
  function newDoc(opt) {
    var doc = new lib.jsPDF({
      orientation: opt.landscape ? 'landscape' : 'portrait',
      unit: 'mm', format: 'a4'
    });
    addFonts(doc);
    return doc;
  }

  /* ⭐紙1枚を、いまの doc の今のページに描く */
  function drawSheetInto(doc, el, opt) {
    var PW = opt.landscape ? 297 : 210;
    var PH = opt.landscape ? 210 : 297;
    var M = (opt.margin == null) ? 8 : opt.margin;     /* 紙のふち */

    /* ⭐画面で縮めて見せていることがあるので、実寸に戻して測る */
    var box = el.getBoundingClientRect();
    var shrink = box.width / el.offsetWidth || 1;
    var W = el.offsetWidth, H = el.offsetHeight;

    /* 🔴⭐紙いっぱいに、形を変えずに収める（本人「用紙いっぱいにしたかった」2026-09-01） */
    var k = Math.min((PW - M * 2) / W, (PH - M * 2) / H);
    var ox = (PW - W * k) / 2, oy = (PH - H * k) / 2;

    /* 画面の座標(px) → 紙の座標(mm) */
    function X(px) { return ox + (px - box.left / shrink) * k; }
    function Y(px) { return oy + (px - box.top / shrink) * k; }
    function mm(px) { return px * k; }
    function rectOf(node) {
      var r = (node.getBoundingClientRect ? node.getBoundingClientRect() : node);
      return {
        x: X(r.left / shrink), y: Y(r.top / shrink),
        w: mm(r.width / shrink), h: mm(r.height / shrink)
      };
    }

    /* ---------- 箱（地の色・枠） ---------- */
    function drawBox(node, cs) {
      var r = rectOf(node);
      if (r.w <= 0 || r.h <= 0) return;
      var bg = rgb(cs.backgroundColor);
      var rad = parseFloat(cs.borderTopLeftRadius) || 0;
      rad = Math.min(mm(rad), Math.min(r.w, r.h) / 2);
      var bw = parseFloat(cs.borderTopWidth) || 0;
      var bc = rgb(cs.borderTopColor);
      var style = '';
      if (bg) { doc.setFillColor(bg[0], bg[1], bg[2]); style += 'F'; }
      if (bw > 0 && bc && cs.borderTopStyle !== 'none') {
        doc.setDrawColor(bc[0], bc[1], bc[2]);
        doc.setLineWidth(Math.max(mm(bw), 0.1));
        style += 'D';
      }
      if (!style) return;
      if (rad > 0.2) doc.roundedRect(r.x, r.y, r.w, r.h, rad, rad, style);
      else doc.rect(r.x, r.y, r.w, r.h, style);
    }

    /* ---------- 文字 ---------- */
    function put(text, r, cs, sizePx, extra) {
      text = text.replace(/\s+/g, ' ').trim();
      if (!text) return;
      var col = rgb(cs.color) || [0, 0, 0];
      var size = mm(sizePx) / 0.352778;                    /* mm → pt */
      if (hasEmoji(text)) {
        /* ⭐絵文字は絵にして、文字と同じ場所に同じ大きさで置く */
        try {
          var img = emojiImage(text, Math.max(sizePx, 12));
          var s = mm(sizePx) * 1.15;
          doc.addImage(img, 'PNG', r.x + (r.w - s) / 2, r.y + (r.h - s) / 2, s, s);
        } catch (e) { /* ⚠出せなくても紙は出す */ }
        return;
      }
      doc.setTextColor(col[0], col[1], col[2]);
      var w = parseInt(cs.fontWeight, 10);
      doc.setFont('NJP', (w >= 600 || cs.fontWeight === 'bold') ? 'bold' : 'normal');
      doc.setFontSize(size);
      /* 🔴⭐測った枠に必ず収める（2026-09-13 本人「これ、ひどい」）。
         ⚠画面の書体とPDFの書体は幅がちがう。同じ大きさで置くと⭐はみ出して、
           となりの文字（名前と「様」、フリガナ）と重なる。
         ⭐はみ出すぶんだけ小さくする＝画面と同じ枠の中に必ず入る */
      var fitW = Math.max(r.w - 0.3, 0.5);
      var tw = doc.getTextWidth(text);
      var k1 = (tw > fitW) ? (fitW / tw) : 1;
      var k2 = ((size * 0.352778) > r.h && r.h > 0) ? (r.h / (size * 0.352778)) : 1;
      var kk = Math.min(k1, k2);
      if (kk < 0.999) {
        size = size * kk;
        doc.setFontSize(size);
      }
      var o = { align: 'center', baseline: 'middle' };
      if (extra && extra.angle) o.angle = extra.angle;      /* ⭐かたむき（SAMPLEの透かし） */
      var thin = (col.length > 3 && col[3] < 1) ? col[3] : 1;
      if (thin < 1 && doc.GState) {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: thin }));
      }
      /* ⭐その行の枠のまん中に置く＝画面で見えている位置そのもの */
      doc.text(text, r.x + r.w / 2, r.y + r.h / 2, o);
      if (thin < 1 && doc.GState) doc.restoreGraphicsState();
    }

    /* ⭐文字は「行ごとの枠」を測って置く。⚠折り返しも画面のとおりになる */
    function drawText(node, cs) {
      var size = parseFloat(cs.fontSize) || 12;
      for (var i = 0; i < node.childNodes.length; i++) {
        var n = node.childNodes[i];
        if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
        var range = document.createRange();
        range.selectNodeContents(n);
        var rects = range.getClientRects();
        if (rects.length === 1) {
          put(n.nodeValue, rectOf(rects[0]), cs, size);
        } else if (rects.length > 1) {
          /* ⚠2行以上に折り返している。⭐行の枠ごとに、文字を割り振って置く */
          var s = n.nodeValue.replace(/\s+/g, ' ').trim(), pos = 0;
          for (var j = 0; j < rects.length; j++) {
            var share = Math.round(s.length * (rects[j].width / range.getBoundingClientRect().width));
            var part = (j === rects.length - 1) ? s.slice(pos) : s.substr(pos, Math.max(share, 1));
            pos += part.length;
            put(part, rectOf(rects[j]), cs, size);
          }
        }
      }
    }

    /* ---------- ::before / ::after（★など） ---------- */
    function drawPseudo(node, which) {
      var cs = global.getComputedStyle(node, which);
      var c = cs.content;
      if (!c || c === 'none' || c === 'normal') return;
      var text = c.replace(/^["']|["']$/g, '');
      if (!text) return;
      var r = rectOf(node);
      var size = parseFloat(cs.fontSize) || 12;
      var w = mm(size), h = w;
      var left = parseFloat(cs.left), right = parseFloat(cs.right);
      var top = parseFloat(cs.top), bottom = parseFloat(cs.bottom);
      var bx = r.x + (r.w - w) / 2, by = r.y + (r.h - h) / 2;
      /* ⭐四方が指定されている（inset:0 など）＝親いっぱいの枠。SAMPLEの透かしがこれ */
      if (!isNaN(left) && !isNaN(right)) {
        bx = r.x + mm(left);
        w = r.w - mm(left + right);
      } else if (!isNaN(right)) {
        bx = r.x + r.w - mm(right) - w;
      } else if (!isNaN(left)) {
        bx = r.x + mm(left);
      }
      if (!isNaN(top) && !isNaN(bottom)) {
        by = r.y + mm(top);
        h = r.h - mm(top + bottom);
      } else if (!isNaN(bottom)) {
        by = r.y + r.h - mm(bottom) - h;
      } else if (!isNaN(top)) {
        by = r.y + mm(top);
      }
      put(text, { x: bx, y: by, w: w, h: h }, cs, size, { angle: angleOf(cs) });
    }

    /* ---------- 紙をひとつずつ回る ---------- */
    function walk(node) {
      if (node.nodeType !== 1) return;
      var cs = global.getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden' || node.hidden) return;
      if (node.classList && node.classList.contains('noprint')) return;
      if (parseFloat(cs.opacity) === 0) return;

      drawBox(node, cs);
      drawText(node, cs);
      drawPseudo(node, '::before');
      drawPseudo(node, '::after');
      for (var i = 0; i < node.children.length; i++) walk(node.children[i]);
    }

    walk(el);
  }

  function buildMany(els, opt) {
    var doc = newDoc(opt);
    els.forEach(function (el, i) {
      if (i > 0) doc.addPage();
      drawSheetInto(doc, el, opt);
    });
    return doc;
  }

  global.PAPER_PDF = {
    /* ⭐紙1枚 */
    save: function (el, opt) {
      opt = opt || {};
      return ready().then(function () {
        buildMany([el], opt).save((opt.name || 'sakura') + '.pdf');
      });
    },
    /* ⭐何枚かまとめて（座席表の「3案まとめて」） */
    saveMany: function (els, opt) {
      opt = opt || {};
      return ready().then(function () {
        buildMany(els, opt).save((opt.name || 'sakura') + '.pdf');
      });
    },
    /* ⚠中を確かめるとき用 */
    output: function (els, opt) {
      return ready().then(function () {
        return buildMany([].concat(els), opt || {}).output('blob');
      });
    }
  };

})(window);
