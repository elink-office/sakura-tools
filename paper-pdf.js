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
  /* 🔴⭐明朝・丸文字（2026-09-23 本人「見本と同じ…フォントでお願い」「基本的には見本と一緒がいい」）。
     ⭐画面の紙と同じ書体（Google Fonts の Noto Serif JP ／ M PLUS Rounded 1c）をPDFにも入れる。
     ⚠1つ5MBほどあるので、⭐紙がその書体を使っているときだけ読む */
  var EXTRA = {
    serif: { test: /Noto Serif JP/i, files: ['NotoSerifJP-Regular.js', 'NotoSerifJP-Bold.js'], reg: 'serifReg', bold: 'serifBold', name: 'NSJ' },
    /* ⭐丸文字＝M PLUS Rounded 1c（2026-09-23 本人「②でいこうか」。Zen Maru Gothic は本人「なんか変な丸文字」でやめた）。
       ⚠第2水準の漢字が入っていない（邉・濵・栁・德など）→ ⭐その字だけゴシック（NJP）で出す（missing） */
    maru:  { test: /M PLUS Rounded 1c/i, files: ['MPLUSRounded1c-Regular.js', 'MPLUSRounded1c-Bold.js'], reg: 'maruReg', bold: 'maruBold', name: 'MPR', missing: 'maruMissing' }
  };
  /* ⭐紙のどこかでその書体を使っているか */
  function fontsIn(els) {
    var need = {};
    [].concat(els).forEach(function (el) {
      if (!el) return;
      var all = [el].concat([].slice.call(el.querySelectorAll('*')));
      all.forEach(function (n) {
        var ff = global.getComputedStyle(n).fontFamily || '';
        for (var k in EXTRA) if (EXTRA[k].test.test(firstFamily(ff))) need[k] = true;
      });
    });
    return need;
  }
  /* ⭐書体の並びのいちばん前＝画面で実際に使っている書体 */
  function firstFamily(ff) { return String(ff || '').split(',')[0].replace(/["']/g, '').trim(); }
  function familyOf(cs) {
    var f = firstFamily(cs.fontFamily);
    for (var k in EXTRA) if (EXTRA[k].test.test(f) && lib && lib[k]) return EXTRA[k].name;
    return 'NJP';
  }
  function readyFor(els) {
    var need = fontsIn(els);
    return ready().then(function () {
      var chain = Promise.resolve();
      Object.keys(need).forEach(function (k) {
        if (lib[k]) return;
        var e = EXTRA[k];
        chain = chain.then(function () { return loadScript(BASE + e.files[0]); })
          .then(function () { return loadScript(BASE + e.files[1]); })
          .then(function () {
            var f = global.NJP_FONT || {};
            if (!f[e.reg] || !f[e.bold]) throw new Error('フォントを読み込めませんでした');
            lib[k] = { reg: f[e.reg], bold: f[e.bold], missing: e.missing ? (f[e.missing] || '') : '' };
          });
      });
      return chain.then(function () { return lib; });
    });
  }

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
    for (var k in EXTRA) {
      if (!lib[k]) continue;
      var nm = EXTRA[k].name;
      doc.addFileToVFS(nm + '-R.ttf', lib[k].reg);
      doc.addFont(nm + '-R.ttf', nm, 'normal');
      doc.addFileToVFS(nm + '-B.ttf', lib[k].bold);
      doc.addFont(nm + '-B.ttf', nm, 'bold');
    }
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

    /* ⭐薄い色を、白い紙に置いたときの色にする（薄さ1＝そのまま） */
    function mixWhite(c) {
      if (!c || c.length < 4 || c[3] >= 1) return c;
      var a = c[3];
      return [0, 1, 2].map(function (k) { return Math.round(c[k] * a + 255 * (1 - a)); });
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
      /* 🔴⭐薄い色（rgba）は、紙の白と混ぜてから塗る（2026-09-23 本人「色が全く違うものがPDFになる」）。
         ⚠前は薄さ（4つ目の数）を捨てて、元の色をそのまま塗っていた。
           グループの塗り（.06）が濃い色になり、同じ色で書いた「A」「B」が塗りに溶けて消えていた。
         ⭐紙は白なので、白と混ぜれば画面と同じ色になる */
      bg = mixWhite(bg); bc = mixWhite(bc);
      if (bg) { doc.setFillColor(bg[0], bg[1], bg[2]); style += 'F'; }
      var dash = null;
      if (bw > 0 && bc && cs.borderTopStyle !== 'none') {
        doc.setDrawColor(bc[0], bc[1], bc[2]);
        doc.setLineWidth(Math.max(mm(bw), 0.1));
        style += 'D';
        /* ⭐点線も画面のとおりに（⚠前は実線になっていた） */
        var lw = Math.max(mm(bw), 0.1);
        if (cs.borderTopStyle === 'dashed') dash = [lw * 3, lw * 2.5];
        else if (cs.borderTopStyle === 'dotted') dash = [lw, lw * 1.5];
      }
      if (!style) return;
      if (dash && doc.setLineDashPattern) doc.setLineDashPattern(dash, 0);
      if (rad > 0.2) doc.roundedRect(r.x, r.y, r.w, r.h, rad, rad, style);
      else doc.rect(r.x, r.y, r.w, r.h, style);
      if (dash && doc.setLineDashPattern) doc.setLineDashPattern([], 0);
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
      var fam = familyOf(cs), wt = (w >= 600 || cs.fontWeight === 'bold') ? 'bold' : 'normal';
      doc.setFont(fam, wt);
      doc.setFontSize(size);
      /* ⭐書体に無い字は、ゴシック（NJP）に切り替えて出す（画面の CSS も「丸文字 → Noto Sans JP」の順） */
      var runs = splitRuns(text, fam);
      function runsW() {
        var t = 0;
        runs.forEach(function (u) { doc.setFont(u.f, wt); t += doc.getTextWidth(u.t); });
        doc.setFont(fam, wt);
        return t;
      }
      /* 🔴⭐測った枠に必ず収める（2026-09-13 本人「これ、ひどい」）。
         ⚠画面の書体とPDFの書体は幅がちがう。同じ大きさで置くと⭐はみ出して、
           となりの文字（名前と「様」、フリガナ）と重なる。
         ⭐はみ出すぶんだけ小さくする＝画面と同じ枠の中に必ず入る */
      var fitW = Math.max(r.w - 0.3, 0.5);
      var tw = (runs.length > 1) ? runsW() : doc.getTextWidth(text);
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
      if (runs.length > 1 && !o.angle) {
        /* ⭐字の書体が混ざるときは、左から順に並べる（全体でまん中） */
        var x0 = r.x + r.w / 2 - runsW() / 2;
        runs.forEach(function (u) {
          doc.setFont(u.f, wt);
          doc.text(u.t, x0, r.y + r.h / 2, { baseline: 'middle' });
          x0 += doc.getTextWidth(u.t);
        });
        doc.setFont(fam, wt);
      } else {
        doc.text(text, r.x + r.w / 2, r.y + r.h / 2, o);
      }
      if (thin < 1 && doc.GState) doc.restoreGraphicsState();
    }

    /* ⭐書体に無い字のところで区切る → [{t:'渡', f:'MPR'}, {t:'邉', f:'NJP'}, …] */
    function splitRuns(text, fam) {
      var miss = '';
      for (var k in EXTRA) if (EXTRA[k].name === fam && lib[k]) miss = lib[k].missing || '';
      if (!miss) return [{ t: text, f: fam }];
      var out = [];
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var f = (miss.indexOf(ch) >= 0) ? 'NJP' : fam;
        if (out.length && out[out.length - 1].f === f) out[out.length - 1].t += ch;
        else out.push({ t: ch, f: f });
      }
      return out;
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
      return readyFor(el).then(function () {
        buildMany([el], opt).save((opt.name || 'sakura') + '.pdf');
      });
    },
    /* ⭐何枚かまとめて（座席表の「3案まとめて」） */
    saveMany: function (els, opt) {
      opt = opt || {};
      return readyFor(els).then(function () {
        buildMany(els, opt).save((opt.name || 'sakura') + '.pdf');
      });
    },
    /* ⚠中を確かめるとき用 */
    output: function (els, opt) {
      return readyFor(els).then(function () {
        return buildMany([].concat(els), opt || {}).output('blob');
      });
    }
  };

})(window);
