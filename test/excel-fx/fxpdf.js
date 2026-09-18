/* ============================================================
   fxpdf.js ― 関数早見表を、A4の紙1枚のPDFにする（2026-09-18）

   🔴⭐ページの型 17-c（2026-09-13 本人）に合わせた。
     🚫window.print() に紙を渡さない（端末とブラウザで紙が変わる／
        iPhoneで縮む／SafariはCSSの @page の余白を読まない）。
     ⭐道具は経理と共通の paper-pdf.js（jsPDF）。⚠2つ持たない。

   ⭐紙は2種類（2026-09-18 本人「覚える順のPDFもあったらいいのにな」）
     ①分類ごと ②覚える順（1〜46・3つの区切り）
   ⭐中身は fx.js の DATA をそのまま使う。⚠同じ表を2か所に持たない。
   ⭐紙は押したときに作って、作り終わったら消す（画面には出さない）。
   ============================================================ */
(function () {
  'use strict';

  var MM = 3.7795275591;                 /* 1mm あたりの点（96dpi） */
  var PAD = 12;                          /* 紙のふち（mm） */

  /* ⭐覚える順の区切り（fx.js の LVNAME と同じ言い方。番号は DATA から数える）*/
  var LVTITLE = { 1: 'まず覚えたい', 2: 'つぎに覚えたい', 3: '慣れてきたら' };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ⭐紙をひとつ作る（画面の外に置く。PDFにしたら消す）*/
  function buildPaper(kind) {
    var paper = el('div', 'fxpaper');
    paper.style.cssText =
      'position:fixed;left:-3000px;top:0;background:#fff;color:#000;' +
      'width:' + (210 * MM) + 'px;height:' + (297 * MM) + 'px;' +
      'padding:' + (PAD * MM) + 'px;box-sizing:border-box;' +
      'font-family:"Noto Sans JP",system-ui,sans-serif;';

    var head = el('div', 'fxpaper-head');
    head.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;' +
                         'margin:0 0 ' + (3 * MM) + 'px;';
    head.appendChild(el('div', null,
      'Excel関数 早見表　46個' + (kind === 'lv' ? '（覚える順）' : '（分類ごと）')))
      .style.cssText = 'font-weight:700;font-size:15px;';
    head.appendChild(el('div', null, 'sakura-tools.com'))
      .style.cssText = 'font-size:10px;color:#666;';
    paper.appendChild(head);

    var table = el('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;';
    paper.appendChild(table);

    groups(kind).forEach(function (g) {
      var tr = el('tr'), th = el('th', null, g.name);
      th.colSpan = 3;
      th.style.cssText = 'text-align:left;background:#ececec;font-weight:700;' +
                         'border-bottom:.6px solid #888;';
      tr.appendChild(th); table.appendChild(tr);

      g.items.forEach(function (d) {
        var r = el('tr');
        var c1 = el('td', null, (kind === 'lv' ? d.no + '. ' : '') + d.n);
        var c2 = el('td', null, d.w);
        var c3 = el('td', null, d.h);
        c1.style.cssText = 'font-weight:700;white-space:nowrap;width:' + (kind === 'lv' ? 30 : 25) * MM + 'px;';
        c2.style.cssText = 'width:' + 60 * MM + 'px;';
        c3.style.cssText = 'white-space:nowrap;';
        [c1, c2, c3].forEach(function (c) {
          c.style.cssText += 'border-bottom:.6px solid #ccc;vertical-align:top;text-align:left;';
          r.appendChild(c);
        });
        table.appendChild(r);
      });
    });
    return paper;
  }

  /* ⭐並び（分類ごと／覚える順）。DATA は fx.js が持っている */
  function groups(kind) {
    var out = [];
    if (kind === 'lv') {
      [1, 2, 3].forEach(function (lv) {
        var items = DATA.filter(function (d) { return d.lv === lv; })
                        .sort(function (a, b) { return a.no - b.no; });
        if (!items.length) return;
        out.push({ name: LVTITLE[lv] + '　' + items[0].no + ' → ' + items[items.length - 1].no,
                   items: items });
      });
    } else {
      DATA.forEach(function (d) {
        var g = out.filter(function (x) { return x.name === d.c; })[0];
        if (!g) { g = { name: d.c, items: [] }; out.push(g); }
        g.items.push(d);
      });
    }
    return out;
  }

  /* 🔴⭐紙に収まるまで字を小さくする。⚠はみ出したぶんは紙の外になって切れる。
     ⚠scrollHeight は はみ出しを数えない（padding のぶんで止まる）ので、
       ⭐表の下端と見出しの上端を測る（2026-09-18 ここで一度つまずいた）*/
  function fit(paper) {
    var innerH = (297 - PAD * 2) * MM, innerW = (210 - PAD * 2) * MM;
    var table = paper.querySelector('table'), head = paper.querySelector('.fxpaper-head');
    for (var px = 14; px >= 6; px -= 0.25) {
      paper.style.fontSize = px + 'px';
      paper.style.lineHeight = '1.28';
      var h = table.getBoundingClientRect().bottom - head.getBoundingClientRect().top;
      var w = table.getBoundingClientRect().width;
      /* ⭐高さも幅も収まったら、その大きさで刷る（余りは 4mm 見る）*/
      if (h <= innerH - 4 * MM && w <= innerW + 0.5) return px;
    }
    return 6;
  }

  function save(kind) {
    var paper = buildPaper(kind);
    document.body.appendChild(paper);
    fit(paper);
    var name = 'Excel関数早見表_' + (kind === 'lv' ? '覚える順' : '分類ごと');
    /* ⭐紙のふちは paper の padding で作ってある。⚠ここでさらに margin を足すと二重になって縮む */
    return PAPER_PDF.save(paper, { name: name, landscape: false, margin: 0 })
      .catch(function (e) { alert('PDFを作れませんでした。もう一度お試しください。'); throw e; })
      .then(function () { paper.remove(); },
            function () { paper.remove(); });
  }

  /* ⚠中を確かめるとき用（paper-pdf.js と同じ考え方）*/
  window.FX_PDF = { build: buildPaper, fit: fit, save: save };

  var a = document.getElementById('fxPdfCat'), b = document.getElementById('fxPdfLv');
  if (a) a.addEventListener('click', function () { save('cat'); });
  if (b) b.addEventListener('click', function () { save('lv'); });
})();
