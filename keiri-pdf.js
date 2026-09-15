/* ============================================================
   keiri-pdf.js ― PDFを自分で描く（2026-09-12）

   🔴⭐なぜ作ったか
   ブラウザの印刷に紙を渡すやり方だと、⚠端末とブラウザの都合で紙が変わる。
   9/10・9/11・9/12 と3回直して、3回とも別の理由で崩れた（縮む・下が切れる・
   画面の文字が混ざる）。⭐iPhoneには余白の設定すら無く、使う側で直せない。
   → ⭐紙は自分で描く。mm で置けば、端末にもブラウザにも左右されない。

   ⭐画面の⑥確認（HTMLの紙）はそのまま残す。ここはPDFを作るときだけ動く。
   ⚠見た目は⑥確認に合わせてある（同じ位置・同じ大きさ）。⑥を直したらここも直す。
   ============================================================ */
(function (global) {
  'use strict';

  /* ⭐このファイルの隣の keiri-lib/ から道具とフォントを読む
     （ページは /keiri/mitsumori/ にあるので、相対の書き方を固定しない） */
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    if (!s) return 'keiri-lib/';
    return s.replace(/keiri-pdf\.js.*$/, '') + 'keiri-lib/';
  })();

  /* ========== 紙の寸法（⑥確認の .inv-sheet と同じ） ========== */
  var W = 210, H = 297, PAD = 20;      /* A4・余白20mm */
  var X0 = PAD, X1 = W - PAD;          /* 中身は 20〜190mm ＝ 170mm */
  var CW = X1 - X0;
  var BOTTOM = H - PAD;                /* 中身の下端 */

  /* 🔴⭐文字の大きさは⑥確認と同じものを使う。
     ⚠画面は 10.5pt から始めて、1枚に入らなければ 10・9.5…と小さくしていく
       （keiri.js の FONTS）。⭐その結果を KEIRI_LAST.em で受け取る。
     ⚠ここで勝手に決めると、⑥で見た紙とPDFの行数が変わる */
  var EM = 10.5;
  var pt = function (em) { return EM * em; };
  /* ⭐pt を mm に直す（1pt = 0.3528mm）。行の高さの計算に使う */
  var MM = function (p) { return p * 0.352778; };

  /* ⭐明細の列幅（⑥確認のCSSと同じ割合） */
  var COL = { no: 0.051, date: 0.09, code: 0.119, qty: 0.096, num: 0.13 };

  /* 🔴⭐行の高さは⑥確認を実測して合わせた（2026-09-12・10.5ptのとき
     見出し 7.83mm／明細 8.10mm）。⚠ここがずれると紙の行数が画面と変わる。
     ⭐中身＝文字の行（1.6倍）＋上下の余白（4px×2＝2.12mm）＋枠線 */
  var rowH = function () { return MM(pt(0.92) * 1.6) + 2.65; };
  var headH = function () { return MM(pt(0.92) * 1.6) + 2.4; };

  var lib = null;   /* 読み込み済みの道具とフォント（2回目からは使い回す） */

  /* ========== 道具とフォントを読む ========== */
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

  /* ========== 画面から値を取る ========== */
  function $(id) { return document.getElementById(id); }
  function val(id) { var e = $(id); return e ? String(e.value || '').trim() : ''; }
  function on(id) { var e = $(id); return !!(e && e.checked); }

  /* 🔴⭐keiri.js は (function(){ }) の中にあるので、⚠D・yen・INC などは外から見えない。
     ⭐⑥確認が KEIRI_LAST で手渡してくれたものを使う（keiri.js の stash） */
  function L() { return global.KEIRI_LAST || {}; }
  function D() { return L().d || {}; }

  /* ⚠金額と日付の書き方は画面と同じものを使う（別に持つと必ずずれる） */
  function yen(n) { return L().yen ? L().yen(n) : String(n); }
  function jpDate(v) { return L().jpDate ? L().jpDate(v) : v; }

  /* ========== 描く道具 ========== */
  function Pen(doc) {
    this.doc = doc;
    this.y = PAD;
  }
  Pen.prototype.font = function (em, bold) {
    this.doc.setFont('NJP', bold ? 'bold' : 'normal');
    this.doc.setFontSize(pt(em));
    return this;
  };
  /* ⭐baseline:'top' で置く＝上からの位置で考えられる（画面と同じ感覚） */
  Pen.prototype.put = function (s, x, y, opt) {
    var o = opt || {};
    o.baseline = o.baseline || 'top';
    this.doc.text(String(s == null ? '' : s), x, y, o);
  };
  /* ⭐折り返して置く。返すのは「使った高さ(mm)」 */
  Pen.prototype.block = function (s, x, y, w, lh) {
    var lines = this.doc.splitTextToSize(String(s == null ? '' : s), w);
    for (var i = 0; i < lines.length; i++) this.put(lines[i], x, y + i * lh);
    return lines.length * lh;
  };
  Pen.prototype.rule = function (x1, y, x2, w) {
    this.doc.setLineWidth(w || 0.2);
    this.doc.setDrawColor(0, 0, 0);
    this.doc.line(x1, y, x2, y);
  };

  /* ========== 紙の上半分（1枚目） ========== */
  function drawHead(pen, data) {
    var doc = pen.doc, d = D(), y = PAD;

    /* 表題＝中央・字間あけ（画面の h3 と同じ） */
    pen.font(1.7, true);
    pen.put(d.title || '', W / 2, y, { align: 'center', charSpace: MM(pt(1.7)) * 0.4 });
    y += MM(pt(1.7)) * 1.25 + 5.5;

    /* 右上＝番号と日付 */
    pen.font(0.92, false);
    var no = val('invNo');
    if (no) { pen.put('No. ' + no, X1, y, { align: 'right' }); y += MM(pt(0.92)) * 1.5; }
    pen.put(jpDate(val('invDate')), X1, y, { align: 'right' });
    y += MM(pt(0.92)) * 1.5 + 3;

    var topOfBlocks = y;

    /* 左＝宛先。名前の下に線を引く（画面と同じ） */
    pen.font(1.25, true);
    var toName = val('toName') || '　';
    var honor = val('toHonor');
    var toLine = toName + (honor ? '　' + honor : '');
    pen.put(toLine, X0, y);
    var tw = Math.max(doc.getTextWidth(toLine), CW * 0.33);
    var underY = y + MM(pt(1.25)) * 1.15;
    pen.rule(X0, underY, X0 + tw, 0.2);
    var ly = underY + 3;
    pen.font(0.92, false);
    ['toAddr', 'toPerson'].forEach(function (k) {
      var v = val(k);
      if (v) ly += pen.block(v, X0, ly, CW * 0.52, MM(pt(0.92)) * 1.5) + 1;
    });

    /* 右＝自分の情報（幅は72mmまで。画面と同じ） */
    var fx = X1 - 72, fw = 72, fy = topOfBlocks;
    if (data.logo) {
      try {
        /* 🔴⭐ロゴの縦横は、画面に出ている絵そのものから読む（2026-09-13 本人
           「PDFにすると、ロゴがつぶれた」）。
           ⚠前は「横44mm・縦はその1/3」と決め打ちしていた＝形が変わってつぶれた。
           ⭐入る大きさは⑥確認のCSSと同じ（横44mm・縦18mmまで）。⭐置き方も同じで中央 */
        var im = document.querySelector('#pages .inv-logo');
        var nw = im && im.naturalWidth, nh = im && im.naturalHeight;
        var lw = 44, lh2 = 18;
        if (nw && nh) {
          lw = Math.min(44, 18 * nw / nh);
          lh2 = lw * nh / nw;
        }
        /* 🔴⭐白い地に敷いてから貼る（2026-09-13 本人「ロゴがつぶれた」のあとに分かった）。
           ⚠すき通ったPNGをそのまま貼ると、⭐すき通った部分が黒くなる */
        var src = data.logo;
        if (im && nw && nh) {
          var cv = document.createElement('canvas');
          cv.width = nw; cv.height = nh;
          var cx = cv.getContext('2d');
          cx.fillStyle = '#fff';
          cx.fillRect(0, 0, nw, nh);
          cx.drawImage(im, 0, 0, nw, nh);
          src = cv.toDataURL('image/png');
        }
        doc.addImage(src, 'PNG', fx + (fw - lw) / 2, fy, lw, lh2);
        fy += lh2 + 1.3;
      } catch (e) { /* ⚠ロゴが読めなくても紙は出す */ }
    }
    data.from.forEach(function (row) {
      pen.font(row.big ? 1.08 : 0.92, !!row.bold);
      fy += pen.block(row.text, fx, fy, fw, MM(pt(row.big ? 1.08 : 0.92)) * 1.5);
    });

    y = Math.max(ly, fy) + 6;

    /* 件名・リード */
    pen.font(1, false);
    var subject = val('subject');
    if (subject) { y += pen.block('件名：' + subject, X0, y, CW, MM(pt(1)) * 1.6) + 2; }
    if (d.lead) { y += pen.block(d.lead, X0, y, CW, MM(pt(1)) * 1.6) + 2; }

    /* 合計の帯＝上下に太い線 */
    y += 4;
    pen.rule(X0, y, X1, 0.7);
    var boxTop = y;
    y += 3;
    pen.font(1, true);
    pen.put(d.amount || '', X0 + 3, y + MM(pt(1.5)) * 0.55 - MM(pt(1)) * 0.55);
    pen.font(1.5, true);
    pen.put(yen(data.total) + ' 円', X1 - 3, y, { align: 'right' });
    y += MM(pt(1.5)) * 1.2 + 3;
    pen.rule(X0, y, X1, 0.7);
    y += 6;
    return y;
  }

  /* ========== 2枚目からの見出し ========== */
  function drawCont(pen) {
    var y = PAD, d = D();
    pen.font(0.92, false);
    var no = val('invNo');
    pen.put((d.title || '') + (no ? '　No. ' + no : '') + '（続き）', X0, y);
    var to = val('toName');
    if (to) pen.put(to + (val('toHonor') ? '　' + val('toHonor') : ''), X1, y, { align: 'right' });
    y += MM(pt(0.92)) * 1.5 + 2;
    pen.rule(X0, y, X1, 0.2);
    return y + 5;
  }

  /* ========== 明細の表（⑥確認を実測した寸法で置く） ========== */
  /* ⭐列幅・行の高さ・行の中身は、ぜんぶ画面から渡ってくる（keiri.js の sheetGeo）。
     ⚠PDF側で計算し直すと、画面と紙で行数が変わる（2026-09-12 に1行ずれた） */
  function drawTableHead(pen, y, g, heads) {
    var doc = pen.doc, x = X0, h = g.headH;
    doc.setDrawColor(119, 119, 119);
    doc.setLineWidth(0.2);
    pen.font(0.92, true);
    g.cols.forEach(function (w, i) {
      /* 🔴⭐枠ごとに塗りの色を指定し直す（2026-09-13 本人「ナンバー以外が黒塗りになった」）。
         ⚠PDFでは「文字を描く」と塗りの色が文字の色（黒）に変わる。
           1回だけ灰色にしても、⭐2つ目の枠からは黒で塗られていた */
      doc.setFillColor(243, 244, 245);
      doc.rect(x, y, w, h, 'FD');
      pen.put(heads[i] || '', x + w / 2, y + (h - MM(pt(0.92))) / 2, { align: 'center' });
      x += w;
    });
    return h;
  }

  function drawRow(pen, y, g, row) {
    var doc = pen.doc, x = X0, h = row.h;
    doc.setDrawColor(119, 119, 119);
    doc.setLineWidth(0.2);
    pen.font(0.92, false);
    g.cols.forEach(function (w, i) {
      doc.rect(x, y, w, h, 'D');
      var cell = row.cells[i];
      if (cell && cell.text) {
        var ty = y + (h - MM(pt(0.92))) / 2;
        if (cell.al === 'center') pen.put(cell.text, x + w / 2, ty, { align: 'center' });
        else if (cell.al === 'right') pen.put(cell.text, x + w - 1.6, ty, { align: 'right' });
        else {
          /* ⚠品目が長いときは枠に入る分だけ（画面も枠の中で折り返している） */
          var lines = doc.splitTextToSize(cell.text, w - 3.2);
          pen.put(lines[0], x + 1.6, ty);
        }
      }
      x += w;
    });
    return h;
  }

  /* ⭐見出しの言葉は画面の表と同じ順で作る */
  function headLabels() {
    var h = ['No.'];
    if (on('colDate')) h.push('日付');
    h.push('品目');
    if (on('colCode')) h.push('品番');
    h.push('数量', '単価', '金額');
    return h;
  }

  /* ========== 紙の下半分（合計・支払い・備考） ========== */
  function footLines(data) {
    var useInv = on('useInvoice'), rows = [], d = D();
    var INC = L().inc, GROSS = L().gross || {}, WH = L().wh || {};
    if (INC) {
      rows.push({ th: '合計（税込）', td: yen(data.total), t: true });
      if (useInv) {
        if (GROSS[10]) rows.push({ th: '10%対象（税込）', td: yen(GROSS[10]) });
        if (GROSS[8]) rows.push({ th: '※8%対象（税込）', td: yen(GROSS[8]) });
      }
      if (data.tax10) rows.push({ th: '（うち消費税 10%）', td: yen(data.tax10) });
      if (data.tax8) rows.push({ th: '（うち消費税 8%）', td: yen(data.tax8) });
    } else {
      rows.push({ th: '小計', td: yen(data.sub) });
      if (useInv) {
        if (data.base[10]) rows.push({ th: '10%対象', td: yen(data.base[10]) });
        if (data.base[8]) rows.push({ th: '※8%対象', td: yen(data.base[8]) });
      }
      if (data.tax10) rows.push({ th: '消費税（10%）', td: yen(data.tax10) });
      if (data.tax8) rows.push({ th: '消費税（8%）', td: yen(data.tax8) });
      rows.push({ th: '合計', td: yen(data.total), t: true });
    }
    if (WH.on) {
      rows.push({ th: '源泉徴収税額', td: '-' + yen(WH.tax) });
      rows.push({ th: d.payLabel || 'お支払額', td: yen(data.total - WH.tax), t: true });
    }
    return rows;
  }

  function drawFoot(pen, y, data) {
    var doc = pen.doc, d = D(), useInv = on('useInvoice');
    var INC = L().inc, GROSS = L().gross || {}, WH = L().wh || {};

    /* 合計の表＝右寄せ */
    var rows = footLines(data);
    var lh = MM(pt(0.94)) * 1.9;
    var tdR = X1, thR = X1 - 32;
    rows.forEach(function (r) {
      if (r.t) {
        pen.rule(thR - 24, y, tdR, 0.2);
        y += 1.4;
      }
      pen.font(0.94, !!r.t);
      pen.put(r.th, thR - 24, y);
      pen.put(r.td, tdR, y, { align: 'right' });
      y += lh;
    });

    /* ただし書き */
    var notes = [];
    if (INC) notes.push('※単価・金額は税込です。');
    if (useInv && (INC ? GROSS[8] : data.base[8])) notes.push('※は軽減税率（8%）の対象です。');
    if (WH.on) {
      notes.push('源泉徴収税額は' + (WH.gross ? '合計（税込）' : '報酬額（税抜）') +
        ' ' + yen(WH.base) + '円 に対する額です。');
    }
    if (notes.length) {
      y += 2;
      pen.font(0.85, false);
      notes.forEach(function (s) { y += pen.block(s, X0, y, CW, MM(pt(0.85)) * 1.5); });
    }

    /* 支払いについて */
    var pay = [];
    if (val('dueDate')) pay.push((d.dueLabel || '') + '　' + jpDate(val('dueDate')));
    if (d.showBank && val('bank')) pay.push(val('bank'));
    if (pay.length) {
      y += 6;
      pen.font(0.92, true);
      var ttl = d.showBank ? 'お支払いについて' : (d.dueLabel || '');
      pen.put(ttl, X0, y);
      var w = doc.getTextWidth(ttl);
      pen.rule(X0, y + MM(pt(0.92)) * 1.2, X0 + w, 0.2);
      y += MM(pt(0.92)) * 1.2 + 2.5;
      pen.font(0.92, false);
      pay.forEach(function (s) { y += pen.block(s, X0, y, CW, MM(pt(0.92)) * 1.5); });
    }

    /* 備考 */
    if (val('note')) {
      y += 5;
      pen.font(0.9, false);
      y += pen.block(val('note'), X0, y, CW, MM(pt(0.9)) * 1.5);
    }
    return y;
  }

  /* ========== SAMPLE の透かし ========== */
  function drawSample(doc) {
    doc.saveGraphicsState();
    if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.25 }));
    doc.setTextColor(233, 150, 175);
    doc.setFont('NJP', 'bold');
    doc.setFontSize(76);
    doc.text('SAMPLE', W / 2, H / 2, { align: 'center', angle: 30, baseline: 'middle' });
    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
  }

  function addFonts(doc) {
    doc.addFileToVFS('NJP-R.ttf', lib.reg);
    doc.addFont('NJP-R.ttf', 'NJP', 'normal');
    doc.addFileToVFS('NJP-B.ttf', lib.bold);
    doc.addFont('NJP-B.ttf', 'NJP', 'bold');
    doc.setFont('NJP', 'normal');
    doc.setTextColor(0, 0, 0);
  }

  /* ========== 自分の情報を行に組む（画面と同じ並び） ========== */
  function fromRows() {
    var useInv = on('useInvoice');
    var me = val('meName');
    var solo = me && !/(事務所|工房|デザイン|オフィス|スタジオ|商店|工務店|企画|製作所|舎|堂|屋|Studio|Office|Design|Works|Lab)/i.test(me);
    var name = me ? { text: me, bold: !solo, big: !solo } : null;
    var zip = val('meZip') ? { text: '〒' + val('meZip') } : null;
    var addr = val('meAddr') ? { text: val('meAddr') } : null;
    var tel = val('meTel') ? { text: 'TEL ' + val('meTel') } : null;
    var mail = val('meMail') ? { text: val('meMail') } : null;
    var out = (solo ? [zip, addr, name, tel, mail] : [name, zip, addr, tel, mail])
      .filter(function (x) { return x; });
    if (useInv && val('meTno')) out.push({ text: '登録番号 ' + val('meTno') });
    return out;
  }

  /* ========== ここが本体 ========== */
  function build() {
    var data = global.KEIRI_LAST;
    if (!data) throw new Error('先に⑥確認の中身を作ってください');
    EM = (data.em > 4) ? data.em : 10.5;   /* ⭐⑥確認が選んだ字の大きさに合わせる */

    var doc = new lib.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    addFonts(doc);

    var sample = !!data.sample;
    var geo = data.geo || [];
    var heads = headLabels();
    var pen = new Pen(doc);

    /* 🔴⭐紙の枚数も、行の位置も、⑥確認が出した答えをそのまま使う。
       ⚠PDF側で組み直さない（2026-09-12。組み直したら1行ずれた） */
    geo.forEach(function (g, i) {
      if (i > 0) doc.addPage();
      if (sample) drawSample(doc);

      if (i === 0) {
        drawHead(pen, { total: data.total, from: fromRows(), logo: data.logo || '' });
      } else {
        drawCont(pen);
      }

      if (g.tableTop != null) {
        var yy = g.tableTop;
        yy += drawTableHead(pen, yy, g, heads);
        g.rows.forEach(function (row) { yy += drawRow(pen, yy, g, row); });
      }
      if (g.footTop != null) drawFoot(pen, g.footTop, data);

      /* ページ番号（2枚以上のときだけ。⭐画面と同じ右下 16mm・8mm） */
      if (geo.length > 1) {
        pen.font(0.85, false);
        doc.setTextColor(51, 51, 51);
        pen.put((i + 1) + ' / ' + geo.length, W - 16, H - 8 - MM(pt(0.85)), { align: 'right' });
        doc.setTextColor(0, 0, 0);
      }
    });

    return doc;
  }

  /* ========== 外から呼ぶ口 ========== */
  global.KEIRI_PDF = {
    /* ⭐保存する（画面のボタンから呼ぶ） */
    save: function (name) {
      return ready().then(function () {
        var doc = build();
        doc.save((name || 'document') + '.pdf');
      });
    },
    /* ⚠中を見るため（作ったものを確かめるときに使う） */
    output: function (kind) {
      return ready().then(function () { return build().output(kind || 'blob'); });
    }
  };

})(window);
