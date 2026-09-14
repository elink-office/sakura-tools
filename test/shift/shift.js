/* ============================================================
   シフト表メーカー（2026-09-14 新規）
   ⭐本人「代表がPDFで保存したもののほうが、間違いがない」＝作るのは1人・配るのはPDF
   ⭐本人「中小規模の店舗系でPDFで運用で考えてみようか」
   🚫勤怠とつながない・CSVも出さない（本人「重くて間違えそうなのは（CSVの扱い）やめておこう」）
   ⭐保存の箱は「シフト」を新しく作った（名簿の箱に入れると、座席表の一覧にスタッフ名が出るため）
   ⭐勤務の種類は社員とパート・アルバイトで別々（2026-09-14 本人「社員の時間とアルバイトの時間は絶対違う」）
     ⭐人数は「記号」でまとめて数える＝社員の「早」とアルバイトの「早」は同じ「早」
   ============================================================ */
(function () {
  'use strict';

  var global = window;
  var $ = function (id) { return document.getElementById(id); };
  var KEY_SCREEN = 'sakura-shift-screen-v1';   /* 画面の保存（1つだけ） */
  var KEY_DATA = 'sakura-shift-v1';            /* 保存したデータ（20件） */
  var MAX_DATA = 20, MAX_STAFF = 40, MAX_CODES = 12, KEEP_MONTHS = 13;
  var PAPER_W = 1123, PAPER_H = 794;
  /* ⭐紙が2枚以上になるときの行の高さ（ふつうの行間）。これで入らない人を次の紙へ送る
     （2026-09-14 本人「なんでこんなにツメツメの行間にするの？最初にしてた行間がいい。それではみ出した部分を２ページ目にして」） */
  var ROW_PREF = 26;
  var SPOT2 = 29;   /* サンプル②のスポットの人数＝紙2枚でちょうどよくなる数（2026-09-14 実測：29人で23人＋15人。30人で3枚） */           /* A4横（96dpi）＝297×210mm */
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  /* ⭐区分＝社員／レギュラー（いつも入る人）／スポット（たまに入る人）（2026-09-14 本人「レギュラーとスポットだわ」）。
     ⭐スポットの勤務はレギュラーのものを使う（本人「時間もアルバイトと同じと考える」）。⚠中の記号は p＝レギュラー、h＝スポット */
  var KIND = { s: '社員', p: 'レギュラー', h: 'スポット' };
  function ckind(k) { return k === 'h' ? 'p' : k; }
  var pdfMode = false;   /* ⭐PDFを作る間だけ true＝1日も入っていないヘルプの行を出さない */
  var reqType = 'off';   /* ③希望日＝off（休み）／ok（出勤） */
  /* ⭐塗り＝タイピング練習の七色（typing.js の BLOCKCOL）を、白に8割近く寄せて薄くした（2026-09-14 本人） */
  var COLORS = [
    { v: '#f8dae3', n: 'ピンク' }, { v: '#fbe5d4', n: 'オレンジ' }, { v: '#faefd1', n: '黄' },
    { v: '#d6ede1', n: '緑' }, { v: '#d1ecf1', n: '水色' }, { v: '#d7def4', n: '青' }, { v: '#e5dbf5', n: '紫' },
    { v: '#eeeeee', n: 'グレー' }, { v: '#ffffff', n: '白' }
  ];
  /* ⭐文字の色（2026-09-14 本人「塗りつぶしと文字が２つ条件があてられるように」）。薄い塗りの上で読める濃さ */
  var INKS = [
    { v: '#222222', n: '黒' }, { v: '#c2406a', n: 'ピンク' }, { v: '#c0651f', n: 'オレンジ' },
    { v: '#8f700a', n: '黄' }, { v: '#2e8a5e', n: '緑' }, { v: '#1f8698', n: '水色' }, { v: '#3a57b5', n: '青' },
    { v: '#7348b8', n: '紫' }, { v: '#6b6b6b', n: 'グレー' },   /* ⭐グレーの地の上でも読める濃さ（2026-09-14） */
    { v: '#e58c8b', n: 'うすい赤' }   /* ⚠2026-09-14 本人「もう少し薄く」で #d9605f → #e58c8b */   /* ⭐休みの字（2026-09-14 本人「塗りつぶしをなくして、薄い赤の文字にしてみて」） */
  ];

  /* ---------- 小さな道具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function flash(id, text) {
    var el = $(id); if (!el) return;
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.textContent = ''; }, 4000);
  }
  function bg(c) { return COLORS[c.color] ? COLORS[c.color].v : COLORS[0].v; }
  function ink(c) { return INKS[c.ink] ? INKS[c.ink].v : INKS[0].v; }

  /* ---------- 月 ---------- */
  function ymOf(y, m) { return y + '-' + pad(m); }
  function ymSplit(ym) { var p = ym.split('-'); return { y: +p[0], m: +p[1] }; }
  function daysIn(ym) { var p = ymSplit(ym); return new Date(p.y, p.m, 0).getDate(); }
  function prevYm(ym) { var p = ymSplit(ym); return p.m === 1 ? ymOf(p.y - 1, 12) : ymOf(p.y, p.m - 1); }
  function nextYm() {
    var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1);
    return ymOf(d.getFullYear(), d.getMonth() + 1);
  }

  /* ---------- 祝日（内閣府「国民の祝日」について・2026-09-14 確認） ----------
     ⭐祝日法どおり＝固定日／第n月曜／春分・秋分／振替休日／国民の休日
     ⚠春分・秋分は国立天文台が前年2月に官報で公表。先の年は計算式での推定
       （2026・2027は内閣府の一覧と一致を確認済み） */
  var holCache = {};
  function holidays(y) {
    if (holCache[y]) return holCache[y];
    var H = {};
    function key(m, d) { return m + '/' + d; }
    function add(m, d, n) { H[key(m, d)] = n; }
    function nthMon(m, n) {
      var first = new Date(y, m - 1, 1).getDay();
      return 1 + ((8 - first) % 7) + (n - 1) * 7;
    }
    var t = y - 1980;
    add(1, 1, '元日');
    add(1, nthMon(1, 2), '成人の日');
    add(2, 11, '建国記念の日');
    add(2, 23, '天皇誕生日');
    add(3, Math.floor(20.8431 + 0.242194 * t - Math.floor(t / 4)), '春分の日');
    add(4, 29, '昭和の日');
    add(5, 3, '憲法記念日');
    add(5, 4, 'みどりの日');
    add(5, 5, 'こどもの日');
    add(7, nthMon(7, 3), '海の日');
    add(8, 11, '山の日');
    add(9, nthMon(9, 3), '敬老の日');
    add(9, Math.floor(23.2488 + 0.242194 * t - Math.floor(t / 4)), '秋分の日');
    add(10, nthMon(10, 2), 'スポーツの日');
    add(11, 3, '文化の日');
    add(11, 23, '勤労感謝の日');

    /* 国民の休日＝前日と翌日が祝日の日 */
    var extra = {};
    var d = new Date(y, 0, 2);
    while (d.getFullYear() === y) {
      var k = key(d.getMonth() + 1, d.getDate());
      if (!H[k]) {
        var a = new Date(d); a.setDate(a.getDate() - 1);
        var b = new Date(d); b.setDate(b.getDate() + 1);
        if (H[key(a.getMonth() + 1, a.getDate())] && H[key(b.getMonth() + 1, b.getDate())] && b.getFullYear() === y) {
          extra[k] = '国民の休日';
        }
      }
      d.setDate(d.getDate() + 1);
    }
    Object.keys(extra).forEach(function (k) { H[k] = extra[k]; });

    /* 振替休日＝祝日が日曜なら、そのあとの最も近い祝日でない日 */
    Object.keys(H).forEach(function (k) {
      var p = k.split('/'), dd = new Date(y, +p[0] - 1, +p[1]);
      if (dd.getDay() !== 0 || H[k] === '国民の休日') return;
      var n = new Date(dd);
      do { n.setDate(n.getDate() + 1); } while (H[key(n.getMonth() + 1, n.getDate())]);
      if (n.getFullYear() === y) H[key(n.getMonth() + 1, n.getDate())] = '振替休日';
    });
    holCache[y] = H;
    return H;
  }
  function dayInfo(ym, d) {
    var p = ymSplit(ym), dt = new Date(p.y, p.m - 1, d), wd = dt.getDay();
    var hol = holidays(p.y)[p.m + '/' + d] || '';
    var mo = S.months[ym];
    return { wd: wd, hol: hol, we: wd === 0 || wd === 6 || !!hol, closed: !!(mo && mo.closed[d]) };
  }

  /* ---------- 状態 ---------- */
  function defaultCodes() {
    return [
      /* ⭐はじめは塗りなし（白）・休みだけグレー（2026-09-14 本人「デフォルトで色がついてると見づらい」「休みだけ、背景グレーにして」）。
         ⚠グレーの上に桜色の字は読みにくいので、休みの字も黒（ページの型 14-2） */
      { id: 's1', kind: 's', mark: '早', name: '早番', time: '7:00〜16:00', hours: 8, color: 8, ink: 0, work: true },
      { id: 's2', kind: 's', mark: '中A', name: '中番A', time: '10:00〜19:00', hours: 8, color: 8, ink: 0, work: true },
      { id: 's3', kind: 's', mark: '遅', name: '遅番', time: '13:00〜22:00', hours: 8, color: 8, ink: 0, work: true },
      /* ⭐休みの字はグレー（2026-09-14 本人「出勤と同等にしたくない。気になる人は自分で変更すればいい」） */
      /* ⚠2026-09-14 本人「休はグレーの太字なしに変更」＝字はグレー（太字なしは④の表で人数に数えない記号すべて） */
      { id: 's4', kind: 's', mark: '休', name: '公休', time: '', hours: 0, color: 8, ink: 8, work: false },
      { id: 's5', kind: 's', mark: '有', name: '有給', time: '', hours: 0, color: 8, ink: 0, work: false },
      { id: 'p1', kind: 'p', mark: '早', name: '早番', time: '9:00〜13:00', hours: 4, color: 8, ink: 0, work: true },
      /* ⭐中番は「中A」と「中B」の2つ・時間をずらす（2026-09-14 本人「中Aと中Bにして」。前は「中」「中★」）。
         ⭐社員の中番も「中A」にした＝人数の行が「中番A」にまとまる（記号でまとめて数えるため） */
      { id: 'p2', kind: 'p', mark: '中A', name: '中番A', time: '11:00〜16:00', hours: 5, color: 8, ink: 0, work: true },
      { id: 'p5', kind: 'p', mark: '中B', name: '中番B', time: '12:00〜17:00', hours: 5, color: 8, ink: 0, work: true },
      { id: 'p3', kind: 'p', mark: '遅', name: '遅番', time: '17:00〜22:00', hours: 5, color: 8, ink: 0, work: true },
      { id: 'p4', kind: 'p', mark: '休', name: '公休', time: '', hours: 0, color: 8, ink: 8, work: false }
    ];
  }
  function fresh(ym) {
    return { v: 2, ym: ym || nextYm(), place: '', memo: '', staff: [], codes: defaultCodes(), need: {}, months: {}, sample: false, showReq: true, seq: 10 };
  }
  var S = fresh();
  function newId(p) { S.seq = (S.seq || 10) + 1; return p + S.seq; }
  function month(ym, make) {
    if (!S.months[ym] && make) S.months[ym] = { cells: {}, closed: {}, req: {}, ok: {} };
    var mo = S.months[ym] || null;
    if (mo && !mo.req) mo.req = {};
    if (mo && !mo.ok) mo.ok = {};
    return mo;
  }
  function codeById(id) { for (var i = 0; i < S.codes.length; i++) if (S.codes[i].id === id) return S.codes[i]; return null; }
  function staffById(id) { for (var i = 0; i < S.staff.length; i++) if (S.staff[i].id === id) return S.staff[i]; return null; }
  function codeFor(kind, mark) {
    kind = ckind(kind);
    for (var i = 0; i < S.codes.length; i++) if (S.codes[i].kind === kind && S.codes[i].mark === mark) return S.codes[i];
    return null;
  }
  /* 記号の一覧（社員が先・重ならない）。fn で絞る */
  function marks(fn) {
    var out = [];
    /* ⭐レギュラーの勤務の順を先に（早・中A・中B・遅）。⚠社員を先にすると、社員に無い中Bが遅番のあとに回った（2026-09-14） */
    ['p', 's'].forEach(function (k) {
      S.codes.forEach(function (c) {
        if (c.kind !== k || !c.mark || out.indexOf(c.mark) >= 0) return;
        if (!fn || fn(c)) out.push(c.mark);
      });
    });
    return out;
  }
  function workMarks() { return marks(function (c) { return c.work; }); }
  function firstCode(mark) { return codeFor('s', mark) || codeFor('p', mark); }
  function cellOf(ym, sid, d) {
    var mo = S.months[ym];
    return (mo && mo.cells[sid] && mo.cells[sid][d]) || null;
  }
  function cellCode(ym, sid, d) { var ce = cellOf(ym, sid, d); return ce ? codeById(ce.c) : null; }
  function needOf(mark, we) {
    var n = S.need[mark];
    var v = n && n[we ? 'we' : 'wd'];
    return { t: (v && +v.t) || 0, s: (v && +v.s) || 0 };
  }

  /* ---------- 数える（記号でまとめる） ---------- */
  function countMark(ym, d, mark) {
    var t = 0, s = 0;
    S.staff.forEach(function (st) {
      var c = cellCode(ym, st.id, d);
      if (c && c.work && c.mark === mark) { t++; if (st.kind === 's') s++; }
    });
    return { t: t, s: s };
  }
  function computeChecks(ym) {
    var nd = daysIn(ym), items = [], short = {}, anyNeed = false, wm = workMarks();
    wm.forEach(function (m) {
      var a = needOf(m, false), b = needOf(m, true);
      if (a.t || a.s || b.t || b.s) anyNeed = true;
    });
    for (var d = 1; d <= nd; d++) {
      var info = dayInfo(ym, d), label = ymSplit(ym).m + '/' + d + '（' + WD[info.wd] + '）';
      if (info.closed) {
        var who = [];
        S.staff.forEach(function (st) { var c = cellCode(ym, st.id, d); if (c && c.work) who.push(st.name); });
        if (who.length) items.push(label + '　定休日に勤務が入っています（' + who.join('・') + '）');
        continue;
      }
      wm.forEach(function (m) {
        var need = needOf(m, info.we);
        if (!need.t && !need.s) return;
        var n = countMark(ym, d, m), fc = firstCode(m), nm = fc ? (fc.name || m) : m, bad = false;
        if (need.t && n.t < need.t) { items.push(label + '　' + nm + '：' + n.t + '人（必要' + need.t + '人）'); bad = true; }
        if (need.s && n.s < need.s) { items.push(label + '　' + nm + '：社員' + n.s + '人（必要' + need.s + '人）'); bad = true; }
        if (bad) { short[m] = short[m] || {}; short[m][d] = true; }
      });
    }
    return { items: items, short: short, anyNeed: anyNeed };
  }

  /* ---------- 下の人数の行に出すか（2026-09-14 本人「下の行のカウント、社員はいらないと思う。社員以外の件数が選べるようにしたらいい」）
     ⭐S.countHide[記号]＝true で出さない。決めていない記号は、社員だけの勤務なら出さない・それ以外は出す。'__staff'＝うち社員 */
  function countShown(m) {
    if (S.countHide && Object.prototype.hasOwnProperty.call(S.countHide, m)) return !S.countHide[m];
    if (m === '__staff') return true;
    return !!codeFor('p', m);
  }
  function renderCountPick() {
    var el = $('countPick'); if (!el) return;
    var items = workMarks().map(function (m) { var fc = firstCode(m); return { k: m, n: fc ? (fc.name || m) : m }; });
    el.innerHTML = '<span class="hint" style="margin:0 8px 0 0">下の人数に出す行：</span>' + items.map(function (it) {
      return '<label class="chk-inline" style="margin-right:12px"><input type="checkbox" data-k="' + esc(it.k) + '"' +
        (countShown(it.k) ? ' checked' : '') + '> ' + esc(it.n) + '</label>';
    }).join('');
  }

  /* ---------- 紙（表）を組む ---------- */
  function buildGrid(gridEl, ym, opt) {
    opt = opt || {};
    /* ⭐希望の行（2026-09-14 本人「希望日が正しいかとか、入れ替えるときは上下がいい」「PDFにするときに外せたらいいね」）
       ＝画面だけ。PDF・先月の表には出さない */
    var reqRows = S.showReq !== false && !pdfMode && !opt.readonly && !opt.noReq;
    var nd = daysIn(ym), showHours = S.codes.some(function (c) { return c.work && +c.hours > 0; });
    gridEl.style.gridTemplateColumns = '118px repeat(' + nd + ',minmax(0,1fr)) 42px' + (showHours ? ' 46px' : '');
    var h = [], infos = [];
    for (var d = 1; d <= nd; d++) infos.push(dayInfo(ym, d));
    function wcls(i) { return i.closed ? ' cl' : (i.hol || i.wd === 0) ? ' sun' : i.wd === 6 ? ' sat' : ''; }
    function tail() { h.push('<div class="sf-c sf-k"></div>'); if (showHours) h.push('<div class="sf-c sf-k"></div>'); }

    /* 見出し 2行 */
    h.push('<div class="sf-c hd">日付</div>');
    infos.forEach(function (i, x) { h.push('<div class="sf-c hd' + wcls(i) + '"' + (i.hol ? ' title="' + esc(i.hol) + '"' : '') + '>' + (x + 1) + '</div>'); });
    h.push('<div class="sf-c hd">出勤</div>');
    if (showHours) h.push('<div class="sf-c hd">時間</div>');
    h.push('<div class="sf-c hd">曜日</div>');
    infos.forEach(function (i) { h.push('<div class="sf-c hd' + wcls(i) + '">' + WD[i.wd] + (i.hol ? '祝' : '') + '</div>'); });
    h.push('<div class="sf-c hd">日</div>');
    if (showHours) h.push('<div class="sf-c hd">h</div>');

    var rows = 0;
    if (!S.staff.length) h.push('<div class="sf-c sf-empty">①に名前を入れると、ここに並びます</div>');
    ['s', 'p', 'h'].forEach(function (kind) {
      var list = S.staff.filter(function (st) {
        if (st.kind !== kind) return false;
        if (opt.ids && opt.ids.indexOf(st.id) < 0) return false;   /* ⭐紙を分けたときは、その紙の人だけ */
        /* ⭐PDFでは、その月に1日も入っていないヘルプの人を出さない（画面では記号を入れるために出す） */
        if (kind === 'h' && (pdfMode || opt.readonly)) {
          var cs = S.months[ym] && S.months[ym].cells[st.id];
          return !!(cs && Object.keys(cs).length);
        }
        return true;
      });
      if (!list.length) return;
      /* ⭐「社員（3人）」などの行はやめた（2026-09-14 本人「社員３人とかレギュラー５人とかの行をなくそう」）。
         区分の境目は太めの線1本だけ＝行を増やさない */
      if (rows > 0) h.push('<div class="sf-c sf-sep"></div>');
      list.forEach(function (st) {
        rows++;
        var days = 0, hours = 0;
        h.push('<div class="sf-c sf-n">' + esc(st.name) + '</div>');
        infos.forEach(function (i, x) {
          var ce = cellOf(ym, st.id, x + 1), c = ce && codeById(ce.c);
          var style = '', cls = 'sf-c sf-d';
          if (c) {
            /* ⭐塗りが「白」の勤務は、土日祝の色を見せる（2026-09-14 本人「その場合、土日祝の色を付けて」） */
            var cb = bg(c);
            /* ⭐定休日は、勤務が入っていてもグレー（2026-09-14 本人「第３日曜日だけ休みの設定にしたら、社員とレギュラーに塗りつぶしグレーが付かなかった」）
               ⚠前は空いたマスだけグレーで、勤務の入ったマスは白のままだった */
            if (c.color === 8) cb = i.closed ? '#f2f2f2' : (i.hol || i.wd === 0) ? '#fdf3f5' : i.wd === 6 ? '#f3f7fd' : cb;
            /* ⭐休み（人数に数えない記号）は太字にしない（2026-09-14 本人「休みは…太字解除してみて」） */
            style = ' style="background:' + cb + ';color:' + ink(c) + (c.work ? '' : ';font-weight:normal') + '"';
            if (c.work) { days++; hours += (+c.hours || 0); }
          } else cls += wcls(i);   /* 空いたマスも、土・日祝・定休日の色 */
          if (ce && ce.h) cls += ' hope';
          else if (!c && !reqRows) {   /* ⚠希望の行を出しているときは、二重になるので出さない */
            var okm = S.months[ym] && S.months[ym].ok, ngm = S.months[ym] && S.months[ym].req;
            if (okm && okm[st.id] && okm[st.id][x + 1]) cls += ' okd';
            /* ⭐休みの希望＝「×」（2026-09-14 本人「出勤の希望日には〇が入るから、休みの希望日に×を付けて」） */
            else if (ngm && ngm[st.id] && ngm[st.id][x + 1]) cls += ' ngd';
          }
          h.push('<div class="' + cls + '" data-s="' + st.id + '" data-d="' + (x + 1) + '"' + style + '>' + (c ? esc(c.mark) : '') + '</div>');
        });
        h.push('<div class="sf-c sf-t">' + days + '</div>');
        if (showHours) h.push('<div class="sf-c sf-t">' + (Math.round(hours * 10) / 10) + '</div>');
        if (reqRows) {
          var mo2 = S.months[ym] || {}, oks = (mo2.ok && mo2.ok[st.id]) || {}, ngs = (mo2.req && mo2.req[st.id]) || {};
          h.push('<div class="sf-c sf-rqr sf-rqn">希望</div>');
          infos.forEach(function (i, x) {
            var d = x + 1, t = oks[d] ? '○' : ngs[d] ? '×' : '';
            /* ⭐希望の行にも土日祝の色（2026-09-14 本人「土日祝の色の塗りつぶし、希望にも全部つけて」） */
            var cls = 'sf-c sf-rqr' + (i.closed ? ' cl' : ' sf-rqc' + ((i.hol || i.wd === 0) ? ' sun' : i.wd === 6 ? ' sat' : '')) +
              (oks[d] ? ' o' : ngs[d] ? ' x' : '');
            h.push('<div class="' + cls + '" data-s="' + st.id + '" data-d="' + d + '">' + t + '</div>');
          });
          h.push('<div class="sf-c sf-rqr"></div>');
          if (showHours) h.push('<div class="sf-c sf-rqr"></div>');
        }
      });
    });

    /* 人数の行（記号ごと） */
    /* ⭐下に出す人数の行は選べる（countShown）。はじめは社員だけの勤務（社早など）は出さない */
    var wm = workMarks().filter(countShown);
    var staffRow = false;   /* ⭐「うち社員」の行は削除（2026-09-14 本人「うち社員もいらないな。削除で」） */
    /* ⭐紙を分けたときは、人数の行は最後の紙だけ（2026-09-14 本人「その時は出勤のカウントは２ページ目に」） */
    if (S.staff.length && (wm.length || staffRow) && opt.counts !== false) {
      h.push('<div class="sf-c sf-sep"></div>');   /* 人数の行との境目も線だけ */
      wm.forEach(function (m) {
        var fc = firstCode(m);
        h.push('<div class="sf-c sf-n sf-k">' + esc(fc ? (fc.name || m) : m) + '</div>');
        infos.forEach(function (i, x) {
          var n = countMark(ym, x + 1, m).t;
          var bad = opt.short && opt.short[m] && opt.short[m][x + 1];
          /* ⭐人数の数字にも土日祝の色（2026-09-14 本人「数値に、曜日の色付けて」） */
          h.push('<div class="sf-c sf-k' + wcls(i) + (bad ? ' short' : '') + '">' + (i.closed && !n ? '' : n) + '</div>');
        });
        tail();
      });
      if (staffRow) {
        h.push('<div class="sf-c sf-n sf-k">うち社員</div>');
        infos.forEach(function (i, x) {
          var n = 0;
          S.staff.forEach(function (st) {
            if (st.kind !== 's') return;
            var c = cellCode(ym, st.id, x + 1);
            if (c && c.work) n++;
          });
          h.push('<div class="sf-c sf-k' + wcls(i) + '">' + (i.closed && !n ? '' : n) + '</div>');
        });
        tail();
      }
    }
    gridEl.innerHTML = h.join('');
    return rows;
  }

  /* ⭐紙を A4横の形に合わせてから、画面の幅に丸ごと縮める。
     ⚠たたんでいる間は測れない（幅0）ので何もしない（ページの型 16-b） */
  function fitSheet(sheet, box, gridEl, rows, forceRh) {
    if (!sheet || sheet.offsetWidth < 10 || box.clientWidth < 10) return;
    sheet.style.transform = 'none';
    sheet.style.marginBottom = '';
    gridEl.style.setProperty('--rowH', '26px');
    if (forceRh) {
      gridEl.style.setProperty('--rowH', forceRh + 'px');   /* ⭐紙が2枚以上のときは、決めた高さにそろえる */
    } else if (rows > 0) {
      var h = sheet.offsetHeight;
      var rh = Math.floor(26 + (PAPER_H - h) / rows);
      rh = Math.max(16, Math.min(40, rh));
      gridEl.style.setProperty('--rowH', rh + 'px');
    }
    /* ⭐大きくして作る間は、画面の幅いっぱいまで拡大する（1倍より大きくてよい）。
       ⭐紙ごとに箱（.sf-pagebox）があり、箱の高さ＝縮めた（広げた）紙の高さ。これで大きいときも下までスクロールできる */
    var big = document.body.classList.contains('sf-big') && box.classList.contains('sf-pagebox');
    var s = big ? box.clientWidth / PAPER_W : Math.min(1, box.clientWidth / PAPER_W);
    sheet.style.transform = 'scale(' + s + ')';
    box.style.height = Math.ceil(sheet.offsetHeight * s) + 'px';
  }

  var lastRows = 0, prevRows = 0, pageInfo = [];

  /* 表に出す人（区分の順）。PDFのときは、1日も入っていないスポットを外す */
  function visibleIds() {
    var out = [];
    ['s', 'p', 'h'].forEach(function (k) {
      S.staff.forEach(function (st) {
        if (st.kind !== k) return;
        if (k === 'h' && pdfMode) {
          var cs = S.months[S.ym] && S.months[S.ym].cells[st.id];
          if (!(cs && Object.keys(cs).length)) return;
        }
        out.push(st.id);
      });
    });
    return out;
  }
  /* 表の下の説明
     ⭐出すのはレギュラー・スポットの勤務と時間だけ（2026-09-14 本人「社員の出勤時間書かなくていい。休みも有休も。
       レギュラーっていうキーワードもいらない。この早中遅も、この時間じゃないのも出てくるはず」） */
  function legendHTML() {
    /* ⭐社員の勤務は、レギュラーに同じ記号が無いときだけ出す（2026-09-14 本人「社員さんの時間帯も表示しよう」＝社早・社中・社遅など）。
       ⚠同じ記号（早など）の社員の時間は、今までどおり出さない */
    var list = S.codes.filter(function (c) { return c.kind === 'p' && c.work && c.mark; })
      .concat(S.codes.filter(function (c) { return c.kind === 's' && c.work && c.mark && !codeFor('p', c.mark); }));
    return list.map(function (c) {
      return '<span class="sf-lg"><span class="sf-sw" style="background:' + bg(c) + ';color:' + ink(c) + '">' + esc(c.mark) + '</span>' +
        esc(c.name) + (c.time ? '　' + esc(c.time) : '') + '</span>';
    }).join('') + (Object.keys((month(S.ym) || {}).closed || {}).length ? '<span class="sf-lg"><span class="sf-sw" style="background:#f2f2f2"></span>定休日</span>' : '');
  }
  /* 紙1枚ぶんの入れ物。表の下の説明とメモは最後の紙だけ */
  function pageHTML(last) {
    return '<div class="sf-pagebox"><div class="sheet sf-sheet">' +
      '<div class="sf-head"><div class="sf-title"></div><div class="sf-place"></div></div>' +
      '<div class="sf-grid"></div>' +
      (last ? '<div class="sf-legend"></div><div class="sf-memo"></div>' : '') +
      '<div class="sf-credit">さくらツール　sakura-tools.com</div></div></div>';
  }
  function fillPage(el, ids, last, n, idx, short, noReq) {
    var p = ymSplit(S.ym);
    el.querySelector('.sf-title').textContent = p.y + '年' + p.m + '月　シフト表' + (n > 1 ? '（' + (idx + 1) + '／' + n + '）' : '');
    /* ⭐右上に作成日（店名の左）（2026-09-14 本人「作成日も右上に入れてね。店舗名の左でもいい」）＝表を作った日（今日） */
    var t = new Date();
    el.querySelector('.sf-place').textContent = '作成日 ' + t.getFullYear() + '年' + (t.getMonth() + 1) + '月' + t.getDate() + '日' + (S.place ? '　' + S.place : '');
    if (last) {
      el.querySelector('.sf-legend').innerHTML = legendHTML();
      el.querySelector('.sf-memo').textContent = S.memo || '';
    }
    return buildGrid(el.querySelector('.sf-grid'), S.ym, { short: short, ids: ids, counts: last, noReq: noReq });
  }
  function renderSheet(short) {
    var box = $('pages'), ids = visibleIds(), groups = [ids];
    $('showReq').checked = S.showReq !== false;
    $('splitKind').checked = !!S.splitKind;
    renderCountPick();
    $('bigShowReq').checked = S.showReq !== false;   /* 大きくして作るの右上と同じ */
    $('sampleNote').hidden = !S.sample;
    /* ⭐人が多くてA4の1枚に入らないときは、紙をふやす（2026-09-14 本人「増えたら、用紙をふやして。２ページに。
         その時は出勤のカウントは２ページ目に」）
       ① 希望の行なし・行の高さ16px（いちばん詰めた形）で1枚に並べて測る
       ② 入らなければ、何人ずつ分けるかを決める。人数の行と表の下の説明は、最後の紙だけ
       ⚠たたんでいて測れないときは1枚のまま（開いたときに測り直す） */
    box.innerHTML = pageHTML(true);
    var probe = box.querySelector('.sf-sheet'), pg = probe.querySelector('.sf-grid');
    fillPage(probe, ids, true, 1, 0, short, true);
    /* ⚠前は行の高さ16px（いちばん詰めた形）で測っていた＝1枚に詰め込みすぎて行間がツメツメになった。
       ⭐今はふつうの行間（ROW_PREF）で測り、入らない人を次の紙へ送る */
    pg.style.setProperty('--rowH', ROW_PREF + 'px');
    /* ⭐区分で紙を分ける（2026-09-14 本人「私もCと思った。日付は共通で」）＝社員・レギュラーで1枚、スポットで1枚 */
    var byKind = !!S.splitKind && ids.some(function (id) { var st = staffById(id); return st && st.kind === 'h'; }) &&
      ids.some(function (id) { var st = staffById(id); return st && st.kind !== 'h'; });
    if (probe.offsetWidth > 10 && ids.length > 1 && (byKind || probe.offsetHeight > PAPER_H)) {
      var ROW = ROW_PREF + 1, total = ids.length;
      var ks = pg.querySelectorAll('.sf-k');
      var countH = ks.length ? (ks[ks.length - 1].offsetTop + ks[ks.length - 1].offsetHeight - ks[0].offsetTop + 3) : 0;
      var lg = probe.querySelector('.sf-legend'), mm = probe.querySelector('.sf-memo');
      var tailH = lg.offsetHeight + 8 + (mm.textContent ? mm.offsetHeight + 6 : 0);
      var fixed = probe.offsetHeight - total * ROW - countH - tailH + 8;   /* ⚠区分の線などのぶん 8px 余らせる */
      /* ⭐人数の行・説明・メモは最後の紙だけ（2026-09-14 本人「全ページに入れてと言ったのは前言撤回」
           「上部に固定で表示されるなら、１ページ目には不要」「PDFには必要。張り出しをした時に見たい」）
         ⭐1枚目から詰める。最後の紙は人数の行のぶん人が少なく、下が空く */
      var capMid = Math.max(1, Math.floor((PAPER_H - fixed) / ROW));
      var capLast = Math.max(1, Math.floor((PAPER_H - fixed - countH - tailH) / ROW));
      /* ⭐最後の紙にも人を回す（2026-09-14 本人と「1人だけの紙は不自然」で決めた）＝最後の紙は人数の行が入るぎりぎりまで入れ、
         残りを途中の紙に同じくらいずつ分ける。⚠前は1枚目に詰めて、最後の紙が1人になった（23人＋1人） */
      function splitSeg(seg, withLast) {
        var out = [], L = seg.length;
        if (!withLast) {
          var nA = Math.ceil(L / capMid), perA = Math.ceil(L / nA);
          for (var a = 0; a < L; a += perA) out.push(seg.slice(a, a + perA));
          return out;
        }
        if (L <= capLast) return [seg];
        /* ⭐できるだけ同じ人数ずつ（最後の紙は人数の行が入る数まで）。⚠前は 1人＋15人 のように分かれた */
        var nM = Math.ceil((L - capLast) / capMid);
        var lastN = Math.min(capLast, Math.max(Math.ceil(L / (nM + 1)), L - capMid * nM));
        var rem = L - lastN, per = Math.ceil(rem / nM);
        for (var b = 0; b < rem; b += per) out.push(seg.slice(b, Math.min(b + per, rem)));
        out.push(seg.slice(rem));
        return out;
      }
      var segs = byKind
        ? [ids.filter(function (id) { return staffById(id).kind !== 'h'; }), ids.filter(function (id) { return staffById(id).kind === 'h'; })]
        : [ids];
      groups = [];
      segs.forEach(function (seg, k) { groups = groups.concat(splitSeg(seg, k === segs.length - 1)); });
    }
    box.innerHTML = groups.map(function (g, i) { return pageHTML(i === groups.length - 1); }).join('');
    pageInfo = [];
    [].forEach.call(box.querySelectorAll('.sf-pagebox'), function (pb, i) {
      var sh = pb.querySelector('.sf-sheet');
      var rows = fillPage(sh, groups[i], i === groups.length - 1, groups.length, i, short, false);
      pageInfo.push({ sheet: sh, box: pb, grid: sh.querySelector('.sf-grid'), rows: rows });
    });
    lastRows = pageInfo.length ? pageInfo[0].rows : 0;
    refitPages();
  }
  function refitPages() {
    if (pageInfo.length > 1) {
      /* ⭐紙が2枚以上のときは、どの紙も同じ行の高さ（いちばん低い紙にそろえる）。
         紙の高さはA4ぶんにする＝最後の紙は上に寄って、下が空く（PDFでも上から始まる）
         （2026-09-14 本人「１ページ目の行が太かった。２ページ目は上によってもいいから、（下を空白にしてOK）同じ行の高さでそろえて」） */
      var rh = ROW_PREF;   /* ⭐紙が2枚以上のときは、ふつうの行間を上限にする（入りきらない紙があればそれに合わせて下げる） */
      pageInfo.forEach(function (p) {
        p.sheet.style.minHeight = '';
        var v = rowHFor(p.sheet, p.grid, p.rows);
        if (v != null) rh = Math.min(rh, v);
      });
      pageInfo.forEach(function (p) {
        p.sheet.style.minHeight = PAPER_H + 'px';
        fitSheet(p.sheet, p.box, p.grid, p.rows, rh);
      });
    } else {
      pageInfo.forEach(function (p) { p.sheet.style.minHeight = ''; fitSheet(p.sheet, p.box, p.grid, p.rows); });
    }
    updateBigHead(true);
  }
  /* その紙だけで、A4いっぱいにしたときの行の高さ（測れないときは null） */
  function rowHFor(sheet, grid, rows) {
    if (!sheet || sheet.offsetWidth < 10 || rows <= 0) return null;
    sheet.style.transform = 'none';
    grid.style.setProperty('--rowH', '26px');
    var h = sheet.offsetHeight;
    return Math.max(16, Math.min(40, Math.floor(26 + (PAPER_H - h) / rows)));
  }
  /* ⭐大きくして作る間の、見出しの固定（2026-09-14 本人「エクセルみたいに日付を固定」）
     ＝1枚目の表の見出し（日付・曜日の2行）を写して、表の見出しが上に消えたときだけ出す。
     ⚠横はスクロールしない画面なので、列の位置は紙の箱の左端と拡大の倍率を合わせるだけでそろう */
  function updateBigHead(rebuild) {
    var hd = $('bigHead');
    if (!hd) return;
    if (!document.body.classList.contains('sf-big') || !pageInfo.length) {
      hd.hidden = true; $('sheetBox').style.paddingTop = ''; return;
    }
    var pi = pageInfo[0], g = pi.grid, pb = pi.box;
    if (rebuild || !hd.firstChild) {
      hd.innerHTML = '<div class="sf-bighead-in"><div class="sf-grid"></div></div>';
      var ng = hd.querySelector('.sf-grid');
      ng.style.gridTemplateColumns = g.style.gridTemplateColumns;
      [].forEach.call(g.children, function (c) { if (c.classList.contains('hd')) ng.appendChild(c.cloneNode(true)); });
      /* ⭐日付の下に人数の行も固定する（2026-09-14 本人「そこに下の人数に出す行を表示して、固定して、あとをスクロール」）
         ＝最後の紙の人数の行（最後の区切り線から下）を写す。足りない日の赤もそのまま */
      var lg = pageInfo[pageInfo.length - 1].grid, kids = [].slice.call(lg.children), seps = [];
      kids.forEach(function (c, k) { if (c.classList.contains('sf-sep')) seps.push(k); });
      if (lg.querySelector('.sf-k') && seps.length) {
        kids.slice(seps[seps.length - 1]).forEach(function (c) { ng.appendChild(c.cloneNode(true)); });
      }
    }
    var inner = hd.firstChild, s = pb.clientWidth / PAPER_W, r = pb.getBoundingClientRect();
    hd.hidden = false;
    inner.style.transform = 'scale(' + s + ')';
    hd.style.left = r.left + 'px';
    hd.style.width = r.width + 'px';
    var hh = 50 + Math.ceil(inner.offsetHeight * s);
    hd.style.height = hh + 'px';
    /* ⭐人数も見たいので、全画面のあいだは いつも出しておく。紙はその下から始める（隠れないように） */
    $('sheetBox').style.paddingTop = (hh + 8) + 'px';
  }

  function renderPrev() {
    var pv = prevYm(S.ym), mo = S.months[pv], p = ymSplit(pv);
    var has = mo && Object.keys(mo.cells).some(function (k) { return Object.keys(mo.cells[k]).length; });
    $('prevBox').hidden = !has;
    $('prevNote').textContent = has ? '' : p.m + '月の表はまだありません。' + p.m + '月もこの画面で作って保存すると、ここに出ます。';
    if (!has) return;
    $('prevTitle').textContent = p.y + '年' + p.m + '月　シフト表';
    prevRows = buildGrid($('prevGrid'), pv, { readonly: true });
    fitSheet($('prevSheet'), $('prevBox'), $('prevGrid'), prevRows);
  }

  function renderChecks(ck) {
    var list = $('checkList'), sum = $('checkSum');
    if (!S.staff.length) { sum.textContent = '①に名前を入れると、ここで確かめられます。'; list.innerHTML = ''; return; }
    var head = ck.anyNeed ? '' : '詳細設定の「必要な人数」に人数を入れていないので、足りない日は調べていません。';
    sum.textContent = ck.items.length ? '直したほうがよいところが ' + ck.items.length + '件 あります。' + head :
      (ck.anyNeed ? '足りない日はありません。' : head);
    var html = ck.items.slice(0, 60).map(function (t) { return '<li>' + esc(t) + '</li>'; });
    if (ck.items.length > 60) html.push('<li class="more">ほか ' + (ck.items.length - 60) + '件</li>');
    list.innerHTML = html.join('');
  }

  function refresh() {
    var ck = computeChecks(S.ym);
    renderChecks(ck);
    renderSheet(ck.short);
    renderReqSum();
    renderPrev();
    persist();
  }

  /* ---------- 日付のボタン（② 定休日・③ 休みの希望で共通） ---------- */
  function dayButtons(ym, fn) {
    var nd = daysIn(ym), first = dayInfo(ym, 1).wd, h = [];
    WD.forEach(function (w) { h.push('<div class="hint" style="text-align:center;margin:0">' + w + '</div>'); });
    for (var b = 0; b < first; b++) h.push('<button type="button" class="sf-day blank" tabindex="-1" aria-hidden="true">.</button>');
    for (var d = 1; d <= nd; d++) {
      var i = dayInfo(ym, d), o = fn(d, i);
      h.push('<button type="button" class="sf-day' + o.cls + '" data-d="' + d + '"' + (o.disabled ? ' disabled' : '') + '>' + d +
        '<small>' + (i.hol ? '祝' : WD[i.wd]) + '</small></button>');
    }
    return h.join('');
  }
  function weCls(i) { return (i.hol || i.wd === 0) ? ' sun' : i.wd === 6 ? ' sat' : ''; }

  /* ---------- ① スタッフ ---------- */
  function renderStaff() {
    $('staffCount').textContent = S.staff.length + '人';
    /* ⭐勤務の種類と同じ表の形（2026-09-14 本人「1. も同じでやってみて」）。⚠行の class は sf-srow のまま（押したときの処理が使う） */
    var n = S.staff.length;
    var body = n ? S.staff.map(function (st, i) {
      return '<tr class="sf-srow" data-i="' + i + '"><td class="idx">' + (i + 1) + '</td>' +
        '<td class="nm"><input type="text" class="st-name" value="' + esc(st.name) + '" aria-label="名前"></td>' +
        '<td class="knd"><select class="st-kind" aria-label="区分"><option value="s"' + (st.kind === 's' ? ' selected' : '') + '>社員</option>' +
        '<option value="p"' + (st.kind === 'p' ? ' selected' : '') + '>レギュラー</option>' +
        '<option value="h"' + (st.kind === 'h' ? ' selected' : '') + '>スポット</option></select></td>' +
        '<td class="mv"><button type="button" class="mvbtn st-up" aria-label="上へ"' + (i === 0 ? ' disabled' : '') + '>▲</button> ' +
        '<button type="button" class="mvbtn st-down" aria-label="下へ"' + (i === n - 1 ? ' disabled' : '') + '>▼</button></td>' +
        '<td class="del"><button type="button" class="mvbtn st-del" aria-label="外す">×</button></td></tr>';
    }).join('') : '<tr><td colspan="5" class="empty">上の欄に名前を入れて「入れる」を押すと、ここに並びます。</td></tr>';
    $('staffList').innerHTML = '<div class="sf-ctbl onwhite"><table><thead><tr><th>番号</th><th>名前</th><th>区分</th><th>順番</th><th>消す</th></tr></thead>' +
      '<tbody>' + body + '</tbody></table></div>';
  }
  function parseNames(text) {
    var out = [];
    text.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var parts = line.split(/\t|,|，/).map(function (s) { return s.trim(); }).filter(Boolean);
      var kind = 'p', name = '';
      parts.forEach(function (s) {
        if (/^(正)?社員$|^正規$/.test(s)) kind = 's';
        else if (/^(レギュラー|パート|アルバイト|バイト|パート・アルバイト)$/.test(s)) kind = 'p';
        else if (/^(スポット|ヘルプ)$/.test(s)) kind = 'h';
        else if (!name) name = s;
      });
      /* 「山田 花子　社員」のように空白で区分が付いているとき */
      var m = /^(.*?)[\s　]+(正社員|社員|レギュラー|パート|アルバイト|バイト|スポット|ヘルプ)$/.exec(name || line.trim());
      if (m) { name = m[1]; kind = /社員/.test(m[2]) ? 's' : /スポット|ヘルプ/.test(m[2]) ? 'h' : 'p'; }
      if (name) out.push({ name: name, kind: kind });
    });
    return out;
  }
  /* ⭐区分を変えたら、入っているマスを同じ記号の「新しい区分の勤務」に置きかえる */
  function remapStaff(st) {
    Object.keys(S.months).forEach(function (k) {
      var cells = S.months[k].cells[st.id]; if (!cells) return;
      Object.keys(cells).forEach(function (d) {
        var c = codeById(cells[d].c);
        if (c && c.kind === ckind(st.kind)) return;
        var nc = c ? codeFor(st.kind, c.mark) : null;
        if (nc) cells[d].c = nc.id; else delete cells[d];
      });
    });
  }

  /* ---------- ② 月と定休日 ---------- */
  function renderMonthUI() {
    var p = ymSplit(S.ym), now = new Date().getFullYear(), ys = [];
    for (var y = Math.min(now - 1, p.y); y <= Math.max(now + 2, p.y); y++) ys.push(y);
    $('ySel').innerHTML = ys.map(function (y) { return '<option value="' + y + '"' + (y === p.y ? ' selected' : '') + '>' + y + '年</option>'; }).join('');
    var ms = []; for (var m = 1; m <= 12; m++) ms.push('<option value="' + m + '"' + (m === p.m ? ' selected' : '') + '>' + m + '月</option>');
    $('mSel').innerHTML = ms.join('');
    $('place').value = S.place || '';
    $('memo').value = S.memo || '';
    var hl = [];
    $('dayChips').innerHTML = dayButtons(S.ym, function (d, i) {
      if (i.hol) hl.push(p.m + '/' + d + ' ' + i.hol);
      return { cls: i.closed ? ' on' : weCls(i) };
    });
    $('holList').textContent = hl.length ? 'この月の祝日・休日：' + hl.join('、') : 'この月は祝日がありません。';
  }

  /* ---------- 詳細設定の「勤務の種類」 勤務の種類（社員／パート・アルバイトを切り替え） ---------- */
  var codeKind = 's';
  function renderCodes() {
    [].forEach.call($('codeTabs').querySelectorAll('button'), function (b) { b.classList.toggle('on', b.dataset.k === codeKind); });
    function opts(list, sel) {
      return list.map(function (o, k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + o.n + '</option>'; }).join('');
    }
    var list = S.codes.filter(function (c) { return c.kind === codeKind; });
    /* ⭐スライドの表（スライドにする順番）と同じ形の表にした（2026-09-14 本人「スライドの表でやろう」
         「縦に線が入っていたほうがいいかな？」「項目名は中央揃えにしてほしい」
         「順番の上下のボタンと消すボタンは薄くていい」「文字のサイズはスライドにする順番くらい小さくていい」）
       ⚠行の class は sf-crow のまま（押したときの処理が closest('.sf-crow') で行を探すため） */
    var head = '<thead><tr><th>記号</th><th>名前</th><th>時間</th><th>時間数</th><th>塗り</th><th>文字</th>' +
      '<th>人数に数える</th><th>順番</th><th>消す</th></tr></thead>';
    var body = list.length ? list.map(function (c, i) {
      return '<tr class="sf-crow" data-id="' + c.id + '">' +
        '<td class="mk"><input type="text" class="cd-mark" maxlength="2" value="' + esc(c.mark) + '" aria-label="記号" style="background:' + bg(c) + ';color:' + ink(c) + '"></td>' +
        '<td class="nm"><input type="text" class="cd-name" value="' + esc(c.name) + '" placeholder="名前" aria-label="名前"></td>' +
        '<td class="tm"><input type="text" class="cd-time" value="' + esc(c.time) + '" placeholder="9:00〜18:00" aria-label="時間"></td>' +
        '<td class="hr"><input type="number" class="cd-hours" min="0" max="24" step="0.5" value="' + (+c.hours || 0) + '" aria-label="時間数"><span class="u">時間</span></td>' +
        '<td class="col"><select class="cd-color" aria-label="塗り">' + opts(COLORS, c.color) + '</select></td>' +
        '<td class="col"><select class="cd-ink" aria-label="文字の色">' + opts(INKS, c.ink || 0) + '</select></td>' +
        '<td class="chk"><input type="checkbox" class="cd-work"' + (c.work ? ' checked' : '') + ' aria-label="必要な人数に数える"></td>' +
        '<td class="mv"><button type="button" class="mvbtn cd-up" aria-label="上へ"' + (i === 0 ? ' disabled' : '') + '>▲</button> ' +
        '<button type="button" class="mvbtn cd-down" aria-label="下へ"' + (i === list.length - 1 ? ' disabled' : '') + '>▼</button></td>' +
        '<td class="del"><button type="button" class="mvbtn cd-del" aria-label="削除">×</button></td></tr>';
    }).join('') : '<tr><td colspan="9" class="empty">' + KIND[codeKind] + 'の勤務はまだありません。「＋ 勤務を追加」で足してください。</td></tr>';
    $('codeList').innerHTML = '<div class="sf-ctbl"><table>' + head + '<tbody>' + body + '</tbody></table></div>';
  }

  /* ---------- 詳細設定の「必要な人数」 必要な人数（記号ごと） ---------- */
  function renderNeed() {
    var wm = workMarks();
    if (!wm.length) { $('needBox').innerHTML = '<p class="hint">詳細設定の「勤務の種類」で「人数に数える」にチェックの入った勤務が、ここに並びます。</p>'; return; }
    function inp(m, side, f) {
      var v = S.need[m] && S.need[m][side] ? (+S.need[m][side][f] || 0) : 0;
      return '<input type="number" min="0" max="99" value="' + v + '" data-m="' + esc(m) + '" data-side="' + side + '" data-f="' + f + '">';
    }
    $('needBox').innerHTML =
      /* ⭐説明は表の上（2026-09-14 本人「この文字は上に書いて」） */
      '<p class="hint" style="margin:0 0 8px">人数を入れたら、足りない日は色を付けて知らせます。社員・レギュラー・スポットは、同じ記号を使った場合、まとめて数えます。</p>' +
      '<div class="sf-ctbl"><table class="sf-need"><thead><tr><th rowspan="2"></th><th colspan="2">平日</th><th colspan="2">土日祝</th></tr>' +
      '<tr><th>人数</th><th>うち社員</th><th>人数</th><th>うち社員</th></tr></thead><tbody>' +
      wm.map(function (m) {
        var fc = firstCode(m);
        return '<tr><td>' + esc(m) + '　' + esc(fc ? fc.name : '') + '</td><td>' + inp(m, 'wd', 't') + '</td><td>' + inp(m, 'wd', 's') +
          '</td><td>' + inp(m, 'we', 't') + '</td><td>' + inp(m, 'we', 's') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---------- ③ 希望日（2026-09-14 本人「希望日の一覧は、③の希望日の中に入れて、そこで行で〇×を入れるといいかも。ここ重複してるよね」）
     ⭐入れる場所＝○×の表だけ。休み／出勤の切り替え・スタッフの選択・日付ボタンはやめた ---------- */
  function renderReq() {
    var csel = $('reqCode'), ckeep = csel.value, all = marks();
    csel.innerHTML = all.map(function (m) { var fc = firstCode(m); return '<option value="' + esc(m) + '">' + esc(m) + '　' + esc(fc ? fc.name : '') + '</option>'; }).join('');
    var rest = marks(function (c) { return !c.work; })[0];
    csel.value = all.indexOf(ckeep) >= 0 ? ckeep : (rest || all[0] || '');
    renderReqSum();
  }

  /* ---------- ③ 希望日の表（○×を入れる場所。PDFには出さない）
     ⭐○×の表（2026-09-14 本人「多分全員に聞く」「〇と×の表にして。文字で書かれてもわかりにくい」）＝全員を並べる
     ⭐○の日に勤務を入れたら うすい緑／×の日に勤務が入っていたら赤（時間帯を動かしたときの見落とし防止） */
  function renderReqSum() {
    var ym = S.ym, mo = S.months[ym], nd = daysIn(ym), h = [], bads = [], infos = [];
    for (var d0 = 1; d0 <= nd; d0++) infos.push(dayInfo(ym, d0));
    function wc(i) { return i.closed ? ' cl' : (i.hol || i.wd === 0) ? ' sun' : i.wd === 6 ? ' sat' : ''; }
    if (!S.staff.length) {
      $('reqSum').innerHTML = '<p class="hint">①に名前を入れると、ここに並びます。</p>';
      return;
    }
    h.push('<div class="hd">日付</div>');
    infos.forEach(function (i, x) { h.push('<div class="hd' + wc(i) + '">' + (x + 1) + '</div>'); });
    h.push('<div class="hd">入/○</div>');
    h.push('<div class="hd">曜日</div>');
    infos.forEach(function (i) { h.push('<div class="hd' + wc(i) + '">' + WD[i.wd] + '</div>'); });
    h.push('<div class="hd"></div>');
    var sepDone = false;
    ['s', 'p', 'h'].forEach(function (kind) {
      var list = S.staff.filter(function (st) { return st.kind === kind; });
      if (!list.length) return;
      if (sepDone) h.push('<div class="sep"></div>');   /* ⭐区分の名前の行はやめて、境目は線だけ（④と同じ） */
      sepDone = true;
      list.forEach(function (st) {
        var offs = (mo && mo.req && mo.req[st.id]) || {}, oks = (mo && mo.ok && mo.ok[st.id]) || {};
        var nOk = 0, inn = 0, bad = [];
        h.push('<div class="n">' + esc(st.name) + '</div>');
        infos.forEach(function (i, x) {
          var d = x + 1, c = cellCode(ym, st.id, d), work = c && c.work, cls = wc(i), t = '';
          if (!i.closed) cls += ' sf-rqc';                /* ⭐押せるマス（定休日は押せない） */
          if (oks[d]) { nOk++; t = '○'; cls += ' o'; if (work) { inn++; cls += ' in'; } }
          else if (offs[d]) { t = '×'; cls += ' x'; if (work) { cls += ' bad'; bad.push(d); } }
          h.push('<div class="' + cls.trim() + '" data-s="' + st.id + '" data-d="' + d + '">' + t + '</div>');
        });
        h.push('<div class="t">' + (nOk ? inn + '/' + nOk : '') + '</div>');
        if (bad.length) bads.push(esc(st.name) + ' ' + bad.join('・') + '日');
      });
    });
    $('reqSum').innerHTML =
      '<div class="sf-rqkey"><span><b class="o">○</b> 出勤の希望</span><span><b class="x">×</b> 休みの希望</span>' +
      '<span><i style="background:#dcefe3"></i>○の日に勤務を入れた</span><span><i style="background:#f6c9c6"></i>×の日に勤務が入っている</span>' +
      '<span>入/○＝入った日／出勤の希望の日</span></div>' +
      '<div class="sf-rq" style="grid-template-columns:6.5rem repeat(' + nd + ',minmax(0,1fr)) 2.6rem">' + h.join('') + '</div>' +
      (bads.length ? '<p class="sf-rqbad">×の日に勤務あり：' + bads.join('／') + '</p>' : '');
  }

  /* ---------- ④ 記号（社員とパート・アルバイトで共通のボタン。入るのは区分ごとの勤務） ---------- */
  /* ⭐はじめは「リストで選ぶ」＝マスを押すとリストが出る（2026-09-14 本人「２回もクリックしたくない」）。
     記号のボタンを選んだときだけ、押したマスにそのまま入る（まとめて入れる用） */
  var MENU = '__menu';
  var tool = MENU;
  function renderPalette() {
    if (!$('palette')) return;   /* ⭐記号のボタンの列はやめた（2026-09-14 本人「リストで選べるから」） */
    var all = marks();
    if (tool && tool !== MENU && all.indexOf(tool) < 0) tool = MENU;
    $('palette').innerHTML = '<button type="button" class="menu' + (tool === MENU ? ' on' : '') + '" data-m="' + MENU + '">リストで選ぶ</button>' + all.map(function (m) {
      var fc = firstCode(m), s = codeFor('s', m), p = codeFor('p', m);
      var only = (s && !p) ? '<small>社員だけ</small>' : (!s && p) ? '<small>レギュラー・スポットだけ</small>' : '';
      return '<button type="button" data-m="' + esc(m) + '"' + (tool === m ? ' class="on"' : '') + '><span class="sw" style="background:' +
        bg(fc) + ';color:' + ink(fc) + '">' + esc(m) + '</span>' + esc(fc.name) + only + '</button>';
    }).join('') + '<button type="button" data-m=""' + (tool === '' ? ' class="on"' : '') + '>消す</button>';
  }

  function renderAll() {
    renderStaff(); renderMonthUI(); renderCodes(); renderNeed(); renderReq(); renderPalette(); refresh(); renderDataSel();
  }

  /* ---------- マスに入れる ---------- */
  var undoStack = [];
  function pushUndo() {
    undoStack.push({ ym: S.ym, m: JSON.stringify(month(S.ym, true)) });
    if (undoStack.length > 50) undoStack.shift();
    $('undo').disabled = false;
  }
  function dropUndo() { undoStack.pop(); $('undo').disabled = !undoStack.length; }
  var stroke = null;   /* なぞっている間の「入れる／消す」 */
  /* ⭐入れられなかったとき false（その人の区分に、その記号の勤務が無い） */
  function paint(sid, d, first) {
    var st = staffById(sid); if (!st) return false;
    var mo = month(S.ym, true);
    /* ⭐○（出勤の希望）のマスに入れたら、右上の印にする */
    var hope = !!(mo.ok[sid] && mo.ok[sid][d]) || !!(mo.req[sid] && mo.req[sid][d]);
    mo.cells[sid] = mo.cells[sid] || {};
    var cur = mo.cells[sid][d], code = tool ? codeFor(st.kind, tool) : null;
    if (tool && !code) return false;
    if (first) stroke = (code && !(cur && cur.c === code.id && !!cur.h === hope)) ? 'set' : 'clear';
    if (stroke === 'set') { if (!code) return false; mo.cells[sid][d] = hope ? { c: code.id, h: 1 } : { c: code.id }; }
    else delete mo.cells[sid][d];
    return true;
  }
  function noCodeMsg(sid) {
    var st = staffById(sid); if (!st) return;
    flash('paintMsg', st.name + 'さんは' + KIND[st.kind] + 'です。' + KIND[ckind(st.kind)] + 'の勤務に「' + tool + '」がありません（詳細設定の「勤務の種類」で足せます）');
  }
  var dragging = false, skipClick = false;
  function cellFrom(t) {
    while (t && t !== document.body) { if (t.classList && t.classList.contains('sf-d')) return t; t = t.parentElement; }
    return null;
  }

  /* ---------- 保存 ---------- */
  function trimMonths(o) {
    var keys = Object.keys(o.months).sort().reverse();
    keys.slice(KEEP_MONTHS).forEach(function (k) { if (k !== o.ym) delete o.months[k]; });
  }
  function persist() {
    if (!$('save').checked || S.sample) return;
    trimMonths(S);
    if (lsSet(KEY_SCREEN, JSON.stringify(S))) flash('savingLabel', 'この画面を保存しました');
    else flash('savingLabel', '保存できませんでした（ブラウザの設定で保存が止められています）');
  }
  function readBox() {
    try { var o = JSON.parse(lsGet(KEY_DATA) || 'null'); if (o && o.items) return o; } catch (e) { }
    return { v: 1, items: [] };
  }
  function writeBox(o) { return lsSet(KEY_DATA, JSON.stringify(o)); }
  function renderDataSel() {
    var box = readBox(), keep = $('dataSel').value;
    var opts = '<option value="">－</option>' + box.items.map(function (it) { return '<option value="' + esc(it.id) + '">' + esc(it.label) + '</option>'; }).join('');
    $('dataSel').innerHTML = opts; $('dataSel2').innerHTML = opts;
    if (keep) $('dataSel').value = keep;
    $('dataCount').textContent = box.items.length + '／' + MAX_DATA + '件';
    $('quickLoad').hidden = !box.items.length;
  }
  /* ⚠勤務の種類が1つだけだった形（v1）で保存したものは、社員・パート共通の勤務を両方に写して読む */
  function migrate(o) {
    if (o.v >= 2) return o;
    var old = o.codes || [], ids = {};
    var codes = [];
    ['s', 'p'].forEach(function (k) {
      old.forEach(function (c) {
        var nc = clone(c); nc.kind = k; nc.id = k + '_' + c.id; if (nc.ink == null) nc.ink = 0;
        codes.push(nc); ids[k + c.id] = nc.id;
      });
    });
    var staffKind = {}; (o.staff || []).forEach(function (st) { staffKind[st.id] = st.kind; });
    Object.keys(o.months || {}).forEach(function (ym) {
      var cells = o.months[ym].cells || {};
      Object.keys(cells).forEach(function (sid) {
        Object.keys(cells[sid]).forEach(function (d) {
          var nid = ids[(staffKind[sid] || 'p') + cells[sid][d].c];
          if (nid) cells[sid][d].c = nid; else delete cells[sid][d];
        });
      });
    });
    var need = {};
    Object.keys(o.need || {}).forEach(function (id) {
      var c = old.filter(function (x) { return x.id === id; })[0];
      if (c && c.mark) need[c.mark] = o.need[id];
    });
    o.codes = codes; o.need = need; o.v = 2;
    return o;
  }
  function restore(o) {
    o = migrate(o);
    var base = fresh(o.ym);
    Object.keys(base).forEach(function (k) { if (o[k] === undefined) o[k] = base[k]; });
    o.codes.forEach(function (c) { if (c.ink == null) c.ink = 0; });
    o.sample = false;
    S = o; undoStack = []; $('undo').disabled = true;
  }

  /* ---------- サンプル ---------- */
  function fillSample(many) {
    var ym = S.ym;
    S = fresh(ym);
    S.sample = true;
    S.sampleMany = !!many;   /* サンプル②（人数多め）かどうか */
    S.place = 'さくら食堂 駅前店';
    S.memo = '交代するときは、店長に連絡してください';
    /* ⭐社員を4人に。4人目の中島さんは社員のヘルプ（2026-09-14 本人「社員さんが全然休みとってない。社員４人にしたら回るかな？
         社員もヘルプがいる店舗多いからさ、追加して程よく入れてみて」） */
    var names = [['山田 花子', 's'], ['佐藤 健', 's'], ['鈴木 美咲', 's'], ['中島 誠', 's'], ['高橋 翔', 'p'], ['田中 さくら', 'p'], ['伊藤 優', 'p'], ['渡辺 陽菜', 'p'], ['小林 蓮', 'p']];
    names.forEach(function (n) { S.staff.push({ id: newId('s'), name: n[0], kind: n[1] }); });
    /* ⭐スポットの見本は4人（2026-09-14 本人「人数を増やして、土日に〇×をランダムにつけて、平日も丸を少し入れて」） */
    var spotNames = ['中村 由美', '松本 大輝', '井上 美月', '木村 陸'];
    /* ⭐サンプル②＝スポットを26人にして、全部で34人（2026-09-14 本人「人数多めのサンプル作って。スポット増やせばいいので」）
       ＝A4の1枚に入らず、紙が2枚に分かれる見本にもなる */
    /* ⚠2026-09-14 本人「３枚だと見にくいから、スポットを少し減らして」＝26人→16人（紙2枚に収まる人数） */
    /* ⭐サンプル②の人数＝区分で分けずに、紙2枚でちょうどよくなる数（2026-09-14 本人「２枚でちょうどよくなるサンプルの数にして」） */
    if (many) spotNames = spotNames.concat(['林 健太', '清水 あおい', '山口 大和', '森 結衣', '池田 颯', '橋本 陽葵',
      '阿部 蒼', '石川 凛', '前田 湊', '藤田 芽依', '小川 悠真', '岡田 咲良', '後藤 樹', '長谷川 心春', '村上 律',
      '近藤 紬', '坂本 湊斗', '遠藤 美桜', '青木 蓮', '藤井 杏', '西村 奏太', '福田 花音', '太田 陽向', '三浦 美羽',
      '原田 大翔', '中野 心結']).slice(0, SPOT2);   /* ⚠SPOT2 は最初の4人を含めたスポットの人数 */
    var spots = spotNames.map(function (nm) {
      var st = { id: newId('s'), name: nm, kind: 'h' };
      S.staff.push(st);
      return st;
    });
    /* ⭐必要な人数（2026-09-14 本人「中Aと中Bにして、中Bを増やして（必要な人数も変えてね）」）
       ⭐遅番はスポット（大学生）が主（本人「スポットの人を遅番をたくさん入れて、レギュラーの遅番をほとんどなしにして」） */
    S.need = {
      '早': { wd: { t: 2, s: 1 }, we: { t: 3, s: 2 } },
      '中A': { wd: { t: 1, s: 0 }, we: { t: 1, s: 0 } },
      '中B': { wd: { t: 2, s: 0 }, we: { t: 2, s: 0 } },
      '遅': { wd: { t: 3, s: 1 }, we: { t: 4, s: 1 } }
    };
    /* ⭐サンプル②は勤務の種類をふやす＝人数が多いといろいろ組めると伝える（2026-09-14 本人「社員さんの時間帯も表示しよう。
         人数多いといろいろできるって伝えたい」「社員早番＝社早、社員中＝社中、社員遅番＝社遅／早、中A、中B、通A、通B、遅」
         「通しは、9：00～18：00、13：00～22：00で」） */
    if (many) {
      S.codes = [
        { id: 's1', kind: 's', mark: '社早', name: '社員早番', time: '7:00〜16:00', hours: 8, color: 8, ink: 0, work: true },
        { id: 's2', kind: 's', mark: '社中', name: '社員中番', time: '10:00〜19:00', hours: 8, color: 8, ink: 0, work: true },
        { id: 's3', kind: 's', mark: '社遅', name: '社員遅番', time: '13:00〜22:00', hours: 8, color: 8, ink: 0, work: true },
        { id: 's4', kind: 's', mark: '休', name: '公休', time: '', hours: 0, color: 8, ink: 8, work: false },
        { id: 's5', kind: 's', mark: '有', name: '有給', time: '', hours: 0, color: 8, ink: 0, work: false },
        { id: 'p1', kind: 'p', mark: '早', name: '早番', time: '9:00〜13:00', hours: 4, color: 8, ink: 0, work: true },
        { id: 'p2', kind: 'p', mark: '中A', name: '中番A', time: '11:00〜16:00', hours: 5, color: 8, ink: 0, work: true },
        { id: 'p5', kind: 'p', mark: '中B', name: '中番B', time: '12:00〜17:00', hours: 5, color: 8, ink: 0, work: true },
        { id: 'p6', kind: 'p', mark: '通A', name: '通しA', time: '9:00〜18:00', hours: 8, color: 8, ink: 0, work: true },
        { id: 'p7', kind: 'p', mark: '通B', name: '通しB', time: '13:00〜22:00', hours: 8, color: 8, ink: 0, work: true },
        { id: 'p3', kind: 'p', mark: '遅', name: '遅番', time: '17:00〜22:00', hours: 5, color: 8, ink: 0, work: true },
        { id: 'p4', kind: 'p', mark: '休', name: '公休', time: '', hours: 0, color: 8, ink: 8, work: false }
      ];
      S.need = {
        '早': { wd: { t: 1, s: 0 }, we: { t: 2, s: 0 } },
        '中A': { wd: { t: 1, s: 0 }, we: { t: 1, s: 0 } },
        '中B': { wd: { t: 1, s: 0 }, we: { t: 2, s: 0 } },
        '通A': { wd: { t: 1, s: 0 }, we: { t: 1, s: 0 } },
        '通B': { wd: { t: 1, s: 0 }, we: { t: 2, s: 0 } },
        '遅': { wd: { t: 2, s: 0 }, we: { t: 3, s: 0 } },
        '社早': { wd: { t: 1, s: 1 }, we: { t: 1, s: 1 } },
        '社遅': { wd: { t: 1, s: 1 }, we: { t: 1, s: 1 } }
      };
    }
    var mo = month(ym, true), nd = daysIn(ym);
    for (var d = 1; d <= nd; d++) if (dayInfo(ym, d).wd === 3) mo.closed[d] = 1;
    var sh = S.staff.filter(function (st) { return st.kind === 's'; });
    var pt = S.staff.filter(function (st) { return st.kind === 'p'; });
    S.staff.forEach(function (st) { mo.cells[st.id] = {}; });
    function rot(a, k) { if (!a.length) return []; k = k % a.length; return a.slice(k).concat(a.slice(0, k)); }
    function put(st, mark, dd, h) {
      if (!st) return;
      var c = codeFor(st.kind, mark); if (!c) return;
      mo.cells[st.id][dd] = h ? { c: c.id, h: 1 } : { c: c.id };
    }
    function take(list) { return list.length ? list.shift() : null; }
    /* ⭐社員の休み＝常勤の社員は1人ずつ休む曜日を決める（月・木・日）。定休日の水曜と合わせて週2日休める。
       ⭐足りない日（日曜など）だけ、ヘルプの社員（中島さん）が入る。ヘルプの人は入らない日は空のまま（休にしない） */
    var helpSt = sh.filter(function (st) { return st.name === '中島 誠'; })[0];
    var fullSh = sh.filter(function (st) { return st !== helpSt; });
    var OFF_WD = [1, 4, 0];
    function staffDay(dd) {
      var wd = dayInfo(ym, dd).wd;
      var avail = fullSh.filter(function (st, i) { return OFF_WD[i % OFF_WD.length] !== wd; });
      var off = fullSh.filter(function (st, i) { return OFF_WD[i % OFF_WD.length] === wd; });
      return { avail: rot(avail, dd).concat(helpSt ? [helpSt] : []), off: off };
    }
    function notHelp(st) { return st !== helpSt; }

    /* ⭐スポットの希望を先に決める＝土日は○×をランダム、平日は○を少し（×も少し）。遅番は×の日には入れない
       ⚠決まった種から数を作る＝サンプルを入れるたびに同じ並びになる（毎回変わると見本にならない） */
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    spots.forEach(function (st) {
      mo.ok[st.id] = {}; mo.req[st.id] = {};
      for (d = 1; d <= nd; d++) {
        var inf = dayInfo(ym, d);
        if (inf.closed) continue;
        var r = rnd();
        if (inf.we) {
          if (r < 0.45) mo.ok[st.id][d] = 1;
          else if (r < 0.8) mo.req[st.id][d] = 1;
        } else if (r < 0.3) mo.ok[st.id][d] = 1;
        else if (r < 0.4) mo.req[st.id][d] = 1;
      }
    });

    /* ⭐サンプル②の並べ方＝社員は社早・社遅（土日は社中も）／レギュラーは早・中A・中B・通A（土日は早・通A）／
       スポットは通B・遅（土日は中A・中B・通B・遅＝大学生は土日にフル） */
    for (d = 1; many && d <= nd; d++) {
      if (mo.closed[d]) continue;
      var we2 = dayInfo(ym, d).we, sd2 = staffDay(d), s2 = sd2.avail, p2 = rot(pt, d * 2);
      var free2 = rot(spots.filter(function (st) { return !mo.req[st.id][d]; }), d * 3);
      free2.sort(function (a, b) { return (mo.ok[b.id][d] ? 1 : 0) - (mo.ok[a.id][d] ? 1 : 0); });   /* ○の人を先に */
      put(take(s2), '社早', d);
      put(take(s2), '社遅', d);
      if (we2) put(take(s2), '社中', d);
      (we2 ? ['早', '通A'] : ['早', '中A', '中B', '通A']).forEach(function (m) {
        for (var k = 0; k < needOf(m, we2).t; k++) put(take(p2) || take(free2), m, d);
      });
      (we2 ? ['中A', '中B', '通B', '遅'] : ['通B', '遅']).forEach(function (m) {
        for (var k = 0; k < needOf(m, we2).t; k++) put(take(free2) || take(p2), m, d);
      });
      s2.filter(notHelp).concat(sd2.off).concat(p2).forEach(function (st, i) {
        if ((i + d) % 4 === 0) {
          put(st, '休', d, true);
          mo.req[st.id] = mo.req[st.id] || {}; mo.req[st.id][d] = 1;
        } else put(st, '休', d);
      });
    }
    /* ⭐並べ方＝早・中A・中Bは社員とレギュラー、遅番は社員（うち社員のぶん）＋スポット。
       スポットが足りない日だけレギュラーが遅番に入る */
    for (d = 1; !many && d <= nd; d++) {   /* サンプル① */
      if (mo.closed[d]) continue;
      var we = dayInfo(ym, d).we, sd1 = staffDay(d), s1 = sd1.avail, p1 = rot(pt, d * 2);
      var free = rot(spots.filter(function (st) { return !mo.req[st.id][d]; }), d * 3);
      free.sort(function (a, b) { return (mo.ok[b.id][d] ? 1 : 0) - (mo.ok[a.id][d] ? 1 : 0); });   /* ○の人を先に */
      var n = needOf('早', we), a, b;
      for (a = 0; a < n.s; a++) put(take(s1), '早', d);
      for (b = n.s; b < n.t; b++) put(take(p1) || take(s1), '早', d);
      /* ⭐土日は大学生（スポット）が中A・中Bにも入る（2026-09-14 本人「大学生、土日にフルで入るから、土日に中Aか、中Bを入れてみて」）
         ⚠遅番に回すスポットのぶんは残しておく（遅番がレギュラーに回らないように） */
      var lateSpot = needOf('遅', we).t - needOf('遅', we).s;
      ['中A', '中B'].forEach(function (m) {
        var nn = needOf(m, we);
        for (var k = 0; k < nn.t; k++) {
          var w = (we && free.length > lateSpot) ? take(free) : null;
          put(w || take(p1) || take(s1), m, d);
        }
      });
      n = needOf('遅', we);
      for (a = 0; a < n.s; a++) put(take(s1), '遅', d);
      for (b = n.s; b < n.t; b++) put(take(free) || take(p1) || take(s1), '遅', d);
      s1.filter(notHelp).concat(sd1.off).concat(p1).forEach(function (st, i) {
        /* ⭐印の付いた休み＝③休みの希望から入れたもの、という見本にする */
        if ((i + d) % 4 === 0) {
          put(st, '休', d, true);
          mo.req[st.id] = mo.req[st.id] || {}; mo.req[st.id][d] = 1;
        } else put(st, '休', d);
      });
    }
    /* ⭐社員・レギュラーの○はやめた（2026-09-14 本人「社員さんの〇をなしに。レギュラーの人も〇はなくていい」）。×はそのまま */
    /* ⭐2日だけわざと遅番を1人足りなくする（赤の見本を見せるため） */
    [5, 19].forEach(function (dd) {
      if (mo.closed[dd]) return;
      spots.some(function (st) {
        var c = cellCode(ym, st.id, dd);
        if (c && c.mark === '遅') { delete mo.cells[st.id][dd]; return true; }
        return false;
      });
    });
  }

  /* ---------- 画面を動かす ---------- */
  function openAndShow(id) {
    var det = $(id); det.open = true;
    det.scrollIntoView({ block: 'start' });
  }

  /* ============================================================
     つなぐ
     ============================================================ */
  function bind() {
    /* ① */
    $('addNames').addEventListener('click', function () {
      var list = parseNames($('names').value);
      if (!list.length) { flash('inMsg', '名前が入っていません'); return; }
      if (S.sample) { var ym = S.ym; S = fresh(ym); }
      var added = 0, over = false;
      list.forEach(function (n) {
        if (S.staff.some(function (st) { return st.name === n.name; })) return;
        if (S.staff.length >= MAX_STAFF) { over = true; return; }
        S.staff.push({ id: newId('s'), name: n.name, kind: n.kind }); added++;
      });
      renderAll();
      if (added) $('chSheet').open = true;   /* ⭐名前を入れたら④シフト表を開く（画面は動かさない・2026-09-14 本人） */
      if (over) alert('スタッフは' + MAX_STAFF + '人までです。入りきらなかった名前があります。');
      flash('inMsg', added ? added + '人入れました。②へ進みましょう' : 'もう入っています');
    });
    /* ⭐「サンプル①」＝入れて④シフト表を開く（画面は動かさない）。
       ⚠「サンプルを見る」はやめた＝サンプル②を出していても①に入れかわっていた（2026-09-14 本人） */
    $('sampleBtn').addEventListener('click', function () {
      if (S.sample && !S.sampleMany) { flash('sampleMsg', 'もう入っています'); return; }
      if (S.staff.length && !S.sample) { alert('サンプルは、①のスタッフが0人のときに入れられます。'); return; }
      fillSample(false); renderAll();
      $('chSheet').open = true;
      flash('sampleMsg', 'サンプル①（' + S.staff.length + '人）を入れました');
    });
    /* ⭐「①に戻る」＝サンプル①②のボタンが見える位置まで戻す（2026-09-14 本人）。
       ⚠上に貼り付くヘッダー（桜色の帯まで69px）の高さを測って、そのぶんと12px下げる。60pxで決め打ちしたら9px隠れた */
    $('backTo1').addEventListener('click', function () {
      $('ch1').open = true;
      var bar = document.querySelector('.sf-sample'), head = document.querySelector('.site-head');
      var headH = head ? head.getBoundingClientRect().height : 60;
      window.scrollTo(0, bar.getBoundingClientRect().top + window.scrollY - headH - 12);
    });
    /* ---------- サンプル②（人数多め・2026-09-14 本人「もしかしたら削除するかも」）
       ⚠消すときは、この節・index.html のボタン・fillSample の many の分岐を消せば元どおり ---------- */
    $('sample2Btn').addEventListener('click', function () {
      if (S.sample && S.sampleMany) { flash('sampleMsg', 'もう入っています'); return; }
      if (S.staff.length && !S.sample) { alert('サンプルは、①のスタッフが0人のときに入れられます。'); return; }
      fillSample(true); renderAll();
      $('chSheet').open = true;
      flash('sampleMsg', 'サンプル②（' + S.staff.length + '人）を入れました');
    });
    /* ⭐サンプルを出しているときは、サンプルも消して最初の状態に戻す（2026-09-14 本人「①の消すは、サンプルも消したい」）。
       ⚠自分で入れた名前があるときは、今までどおり貼り付け欄の文字だけ */
    $('clearNames').addEventListener('click', function () {
      $('names').value = '';
      if (!S.sample) return;
      S = fresh(S.ym);
      undoStack = []; $('undo').disabled = true;
      renderAll();
      flash('inMsg', 'サンプルを消しました');
    });
    $('staffList').addEventListener('input', function (e) {
      var row = e.target.closest('.sf-srow'); if (!row) return;
      var st = S.staff[+row.dataset.i];
      if (e.target.classList.contains('st-name')) { st.name = e.target.value; renderReq(); refresh(); }
    });
    $('staffList').addEventListener('change', function (e) {
      var row = e.target.closest('.sf-srow'); if (!row) return;
      if (e.target.classList.contains('st-kind')) {
        var st = S.staff[+row.dataset.i];
        st.kind = e.target.value; remapStaff(st); refresh();
      }
    });
    $('staffList').addEventListener('click', function (e) {
      var row = e.target.closest('.sf-srow'); if (!row) return;
      var i = +row.dataset.i, a = S.staff;
      if (e.target.classList.contains('st-up') && i > 0) { a.splice(i - 1, 0, a.splice(i, 1)[0]); }
      else if (e.target.classList.contains('st-down') && i < a.length - 1) { a.splice(i + 1, 0, a.splice(i, 1)[0]); }
      else if (e.target.classList.contains('st-del')) {
        if (!confirm('「' + a[i].name + '」を外します。この人のシフトと休みの希望も、すべての月から消えます。よろしいですか。')) return;
        var id = a[i].id; a.splice(i, 1);
        Object.keys(S.months).forEach(function (k) {
          delete S.months[k].cells[id];
          if (S.months[k].req) delete S.months[k].req[id];
          if (S.months[k].ok) delete S.months[k].ok[id];
        });
      } else return;
      renderStaff(); renderReq(); refresh();
    });

    /* ② */
    function setYm() {
      S.ym = ymOf(+$('ySel').value, +$('mSel').value);
      undoStack = []; $('undo').disabled = true;
      renderMonthUI(); renderReq(); refresh();
    }
    $('ySel').addEventListener('change', setYm);
    $('mSel').addEventListener('change', setYm);
    $('place').addEventListener('input', function () { S.place = this.value; refresh(); });
    $('dayChips').addEventListener('click', function (e) {
      var b = e.target.closest('.sf-day'); if (!b || !b.dataset.d) return;
      var mo = month(S.ym, true), d = +b.dataset.d;
      if (mo.closed[d]) delete mo.closed[d]; else mo.closed[d] = 1;
      renderMonthUI(); renderReq(); refresh();
    });
    $('wkBtn').addEventListener('click', function () {
      var wd = +$('wkSel').value, mo = month(S.ym, true), nd = daysIn(S.ym), days = [];
      for (var d = 1; d <= nd; d++) if (dayInfo(S.ym, d).wd === wd) days.push(d);
      var all = days.every(function (d) { return mo.closed[d]; });
      days.forEach(function (d) { if (all) delete mo.closed[d]; else mo.closed[d] = 1; });
      renderMonthUI(); renderReq(); refresh();
    });

    /* 詳細設定の「勤務の種類」 */
    function codesChanged() { renderNeed(); renderReq(); renderPalette(); refresh(); }
    $('codeTabs').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      codeKind = b.dataset.k; renderCodes();
    });
    $('addCode').addEventListener('click', function () {
      var n = S.codes.filter(function (c) { return c.kind === codeKind; }).length;
      if (n >= MAX_CODES) { alert(KIND[codeKind] + 'の勤務は' + MAX_CODES + '種類までです。いらないものを削除してください。'); return; }
      /* ⭐同じ区分の最後のうしろに足す（並びが社員→パートのまま） */
      var last = -1; S.codes.forEach(function (c, i) { if (c.kind === codeKind) last = i; });
      S.codes.splice(last + 1, 0, { id: newId(codeKind), kind: codeKind, mark: '', name: '', time: '', hours: 0, color: 8, ink: 0, work: true });
      renderCodes(); codesChanged();
      var ins = $('codeList').querySelectorAll('.cd-mark'); if (ins.length) ins[ins.length - 1].focus();
    });
    function rowCode(e) { var row = e.target.closest('.sf-crow'); return row ? { row: row, c: codeById(row.dataset.id) } : null; }
    $('codeList').addEventListener('input', function (e) {
      var r = rowCode(e); if (!r || !r.c) return;
      var c = r.c, t = e.target;
      if (t.classList.contains('cd-mark')) {
        var oldM = c.mark; c.mark = t.value;
        /* ⭐記号を書きかえたら、詳細設定の「必要な人数」も新しい記号に引っ越す（ほかに同じ記号が無いとき） */
        if (oldM && S.need[oldM] && !S.codes.some(function (x) { return x !== c && x.mark === oldM; }) && c.mark && !S.need[c.mark]) {
          S.need[c.mark] = S.need[oldM]; delete S.need[oldM];
        }
        if (tool === oldM) tool = c.mark;
      }
      else if (t.classList.contains('cd-name')) c.name = t.value;
      else if (t.classList.contains('cd-time')) c.time = t.value;
      else if (t.classList.contains('cd-hours')) c.hours = +t.value || 0;
      else return;
      renderPalette(); refresh();
    });
    $('codeList').addEventListener('change', function (e) {
      var r = rowCode(e); if (!r || !r.c) return;
      var c = r.c, t = e.target;
      if (t.classList.contains('cd-color') || t.classList.contains('cd-ink')) {
        if (t.classList.contains('cd-color')) c.color = +t.value; else c.ink = +t.value;
        var mk = r.row.querySelector('.cd-mark');           /* ⭐記号の箱を見本として塗り直す */
        mk.style.background = bg(c); mk.style.color = ink(c);
      } else if (t.classList.contains('cd-work')) c.work = t.checked;
      else if (!t.classList.contains('cd-mark') && !t.classList.contains('cd-name')) return;
      codesChanged();
    });
    $('codeList').addEventListener('click', function (e) {
      var r = rowCode(e); if (!r || !r.c) return;
      var c = r.c, a = S.codes, i = a.indexOf(c);
      function neighbor(step) { for (var j = i + step; j >= 0 && j < a.length; j += step) if (a[j].kind === c.kind) return j; return -1; }
      if (e.target.classList.contains('cd-up') || e.target.classList.contains('cd-down')) {
        var j = neighbor(e.target.classList.contains('cd-up') ? -1 : 1);
        if (j < 0) return;
        a[i] = a[j]; a[j] = c;
      } else if (e.target.classList.contains('cd-del')) {
        if (!confirm(KIND[c.kind] + 'の「' + (c.name || c.mark || 'この勤務') + '」を削除します。この記号が入っている' + KIND[c.kind] + 'のマスも、すべての月で空になります。よろしいですか。')) return;
        a.splice(i, 1);
        if (c.mark && !S.codes.some(function (x) { return x.mark === c.mark; })) delete S.need[c.mark];
        Object.keys(S.months).forEach(function (k) {
          var cells = S.months[k].cells;
          Object.keys(cells).forEach(function (sid) {
            Object.keys(cells[sid]).forEach(function (d) { if (cells[sid][d].c === c.id) delete cells[sid][d]; });
          });
        });
      } else return;
      renderCodes(); codesChanged();
    });

    /* 詳細設定の「必要な人数」 */
    $('needBox').addEventListener('input', function (e) {
      var t = e.target; if (!t.dataset || !t.dataset.m) return;
      var n = S.need[t.dataset.m] = S.need[t.dataset.m] || {};
      n[t.dataset.side] = n[t.dataset.side] || { t: 0, s: 0 };
      n[t.dataset.side][t.dataset.f] = Math.max(0, +t.value || 0);
      refresh();
    });

    /* ③ 希望日＝表のマスを押すとリスト（○出勤の希望／×休みの希望／空にする）
       ⭐2026-09-14 本人「希望日、これもクリックでドロップダウンリストにして」。前は押すたびに 空→○→×→空 */
    $('reqSum').addEventListener('click', function (e) {
      var rq = e.target.closest ? e.target.closest('.sf-rqc') : null; if (!rq) return;
      openReqMenu(rq);
    });
    $('reqApply').addEventListener('click', function () {
      var mark = $('reqCode').value;
      if (!mark) { alert('先に詳細設定の「勤務の種類」で、休みの記号を作ってください。'); return; }
      var mo = month(S.ym, true), p = ymSplit(S.ym), todo = [], clash = [], missing = [];
      S.staff.forEach(function (st) {
        var days = Object.keys(mo.req[st.id] || {});
        if (!days.length) return;
        var code = codeFor(st.kind, mark);
        if (!code) { missing.push(st.name); return; }
        days.forEach(function (k) {
          var d = +k;
          if (dayInfo(S.ym, d).closed) return;
          var cur = cellOf(S.ym, st.id, d);
          if (cur && cur.c === code.id && cur.h) return;            /* もう入っている */
          var item = { sid: st.id, d: d, c: code.id };
          if (cur && cur.c !== code.id) {
            var cc = codeById(cur.c);
            item.clash = true;
            clash.push(st.name + ' ' + p.m + '/' + d + '（' + (cc ? (cc.name || cc.mark) : '') + '）');
          }
          todo.push(item);
        });
      });
      if (missing.length) alert(missing.join('・') + 'さんの区分には「' + mark + '」の勤務がありません。詳細設定の「勤務の種類」で足してから、もう一度押してください。');
      if (!todo.length) { if (!missing.length) flash('reqMsg', '入れる希望はありません（もう入っています）'); return; }
      var overwrite = true;
      if (clash.length) {
        overwrite = confirm('すでに勤務が入っている日が ' + clash.length + 'か所 あります。\n' + clash.slice(0, 8).join('\n') +
          (clash.length > 8 ? '\nほか ' + (clash.length - 8) + 'か所' : '') +
          '\n\n「OK」で休みに入れ替えます。「キャンセル」なら、空いている日だけに入れます。');
      }
      pushUndo();
      var n = 0;
      todo.forEach(function (it) {
        if (it.clash && !overwrite) return;
        mo.cells[it.sid] = mo.cells[it.sid] || {};
        mo.cells[it.sid][it.d] = { c: it.c, h: 1 };
        n++;
      });
      refresh();
      var fc = firstCode(mark);
      flash('reqMsg', n ? n + 'か所に「' + (fc ? fc.name || mark : mark) + '」を入れました。④シフト表で見られます' : '入れた日はありません');
    });

    /* ④ */
    if ($('palette')) $('palette').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      tool = b.dataset.m; renderPalette();
    });
    var grid = $('pages');   /* ⭐紙が何枚でも受けられるように、紙の入れ物で受ける */
    grid.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || tool === MENU) return;     /* ⭐リストのときは、押し終わり（click）で開く */
      var c = cellFrom(e.target); if (!c) return;
      e.preventDefault();
      skipClick = true;
      pushUndo();
      if (!paint(c.dataset.s, +c.dataset.d, true)) { dropUndo(); noCodeMsg(c.dataset.s); return; }
      dragging = true;
      refreshCell(c);
    });
    grid.addEventListener('mouseover', function (e) {
      if (!dragging) return;
      var c = cellFrom(e.target); if (!c) return;
      if (paint(c.dataset.s, +c.dataset.d, false)) refreshCell(c);   /* ⚠区分に無い記号の人は、なぞっても飛ばす */
    });
    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false; refresh();
    });
    /* ---------- マスのリスト（2026-09-14 本人「ドロップダウンリストで選びたい」） ---------- */
    var menu = $('cellMenu'), menuCell = null;
    function closeMenu() { menu.hidden = true; menuCell = null; }
    function openMenu(cell) {
      var st = staffById(cell.dataset.s); if (!st) return;
      var d = +cell.dataset.d, info = dayInfo(S.ym, d), p = ymSplit(S.ym), cur = cellOf(S.ym, st.id, d);
      var list = S.codes.filter(function (c) { return c.kind === ckind(st.kind) && c.mark; });
      menuCell = { sid: st.id, d: d };
      menu.innerHTML = '<div class="sf-menu-h">' + esc(st.name) + '　' + p.m + '/' + d + '（' + WD[info.wd] + '）</div>' +
        list.map(function (c) {
          return '<button type="button" role="menuitem" data-c="' + c.id + '"' + (cur && cur.c === c.id ? ' class="on"' : '') + '>' +
            '<span class="sw" style="background:' + bg(c) + ';color:' + ink(c) + '">' + esc(c.mark) + '</span>' + esc(c.name) +
            (c.time ? '<small>' + esc(c.time) + '</small>' : '') + '</button>';
        }).join('') + '<button type="button" role="menuitem" data-c="">空にする</button>';
      showMenuAt(cell);
    }
    /* ⭐希望のリスト（③の表・④の希望の行で共通） */
    function openReqMenu(cell) {
      var st = staffById(cell.dataset.s); if (!st) return;
      var d = +cell.dataset.d, info = dayInfo(S.ym, d), p = ymSplit(S.ym), mo = month(S.ym, true);
      var cur = (mo.ok[st.id] && mo.ok[st.id][d]) ? 'ok' : (mo.req[st.id] && mo.req[st.id][d]) ? 'ng' : '';
      menuCell = { sid: st.id, d: d, req: true };
      menu.innerHTML = '<div class="sf-menu-h">' + esc(st.name) + '　' + p.m + '/' + d + '（' + WD[info.wd] + '）の希望</div>' +
        '<button type="button" role="menuitem" data-r="ok"' + (cur === 'ok' ? ' class="on"' : '') + '><span class="sw">○</span>出勤の希望</button>' +
        '<button type="button" role="menuitem" data-r="ng"' + (cur === 'ng' ? ' class="on"' : '') + '><span class="sw">×</span>休みの希望</button>' +
        '<button type="button" role="menuitem" data-r="">空にする</button>';
      showMenuAt(cell);
    }
    /* ⭐押したマスのすぐ下に出す。画面からはみ出すときは上に出す */
    function showMenuAt(cell) {
      menu.hidden = false;
      menu._y = window.scrollY;
      menu._bt = $('sheetBox').scrollTop;
      var r = cell.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
      var left = Math.max(8, Math.min(r.left, window.innerWidth - mw - 8));
      var top = r.bottom + 4;
      if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
      menu.style.left = left + 'px'; menu.style.top = top + 'px';
      var first = menu.querySelector('button.on') || menu.querySelector('button');
      if (first) first.focus({ preventScroll: true });
    }
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !menuCell) return;
      var mo = month(S.ym, true), sid = menuCell.sid, d = menuCell.d;
      if (menuCell.req) {
        /* ⭐希望＝同じ日に休みと出勤の両方は持たない */
        mo.ok[sid] = mo.ok[sid] || {}; mo.req[sid] = mo.req[sid] || {};
        delete mo.ok[sid][d]; delete mo.req[sid][d];
        if (b.dataset.r === 'ok') mo.ok[sid][d] = 1;
        else if (b.dataset.r === 'ng') mo.req[sid][d] = 1;
        closeMenu();
        refresh();                                        /* ⭐○も×もすぐ③と④に出す */
        return;
      }
      pushUndo();
      mo.cells[sid] = mo.cells[sid] || {};
      if (b.dataset.c) {
        var hope = !!(mo.ok[sid] && mo.ok[sid][d]) || !!(mo.req[sid] && mo.req[sid][d]);
        mo.cells[sid][d] = hope ? { c: b.dataset.c, h: 1 } : { c: b.dataset.c };
      } else delete mo.cells[sid][d];
      closeMenu();
      refresh();
    });
    document.addEventListener('mousedown', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && !cellFrom(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!menu.hidden) closeMenu();
      else if (document.body.classList.contains('sf-big')) bigMode(false);   /* ⭐リストが閉じていれば、大きい表を閉じる */
    });
    /* 大きくして作る間は、表の箱の中でスクロールする。40px 以上動いたらリストを閉じる */
    $('sheetBox').addEventListener('scroll', function () {
      if (!menu.hidden && Math.abs($('sheetBox').scrollTop - (menu._bt || 0)) > 40) closeMenu();
      updateBigHead(false);   /* ⭐見出しの固定を出す／しまう */
    }, { passive: true });
    /* ⚠少し動いただけで閉じると、開いた直後のスクロール（スマホの画面の揺れ）で消える。40px 以上動いたら閉じる */
    window.addEventListener('scroll', function () {
      if (!menu.hidden && Math.abs(window.scrollY - (menu._y || 0)) > 40) closeMenu();
    }, { passive: true });

    grid.addEventListener('click', function (e) {
      if (skipClick) { skipClick = false; return; }
      /* ⭐希望の行のマス＝押すとリスト（③の表と同じ・2026-09-14 本人「希望日、これもクリックでドロップダウンリストにして」） */
      var rq = e.target.closest ? e.target.closest('.sf-rqc') : null;
      if (rq) { openReqMenu(rq); return; }
      var c = cellFrom(e.target); if (!c) return;
      if (tool === MENU) { openMenu(c); return; }
      pushUndo();
      if (!paint(c.dataset.s, +c.dataset.d, true)) { dropUndo(); noCodeMsg(c.dataset.s); return; }
      refresh();
    });
    /* ⭐なぞっている間は、そのマスだけ塗り直す（表を組み直すと、なぞる先が消えるため） */
    function refreshCell(el) {
      var ce = cellOf(S.ym, el.dataset.s, +el.dataset.d), c = ce && codeById(ce.c);
      el.textContent = c ? c.mark : '';
      el.style.background = c ? bg(c) : '';
      el.style.color = c ? ink(c) : '';
      el.classList.toggle('hope', !!(ce && ce.h));
      el.classList.toggle('cl', !c && dayInfo(S.ym, +el.dataset.d).closed);
    }
    $('undo').addEventListener('click', function () {
      var u = undoStack.pop(); if (!u) return;
      S.months[u.ym] = JSON.parse(u.m);
      if (u.ym !== S.ym) { S.ym = u.ym; renderMonthUI(); }
      $('undo').disabled = !undoStack.length;
      renderReq(); refresh();
    });
    $('clearMonth').addEventListener('click', function () {
      var p = ymSplit(S.ym);
      if (!confirm(p.m + '月のシフト表のマスを、すべて空にします。定休日と③休みの希望はそのまま残ります。よろしいですか。')) return;
      pushUndo(); month(S.ym, true).cells = {}; refresh();
    });
    $('showReq').addEventListener('change', function () { S.showReq = this.checked; refresh(); });
    $('splitKind').addEventListener('change', function () { S.splitKind = this.checked; refresh(); });
    $('countPick').addEventListener('change', function (e) {
      var k = e.target.dataset && e.target.dataset.k; if (!k) return;
      S.countHide = S.countHide || {};
      S.countHide[k] = !e.target.checked;
      refresh();
    });
    /* ---------- 大きくして作る（2026-09-14 本人「大きくして作ることできないかな？」） ---------- */
    /* ⭐全画面で作る（2026-09-14 本人「大きくして作るを全画面で作るにして。ブラウザを全画面にしないと大きくならないからさ」）
       ＝押したらブラウザごと全画面にする。全画面にできないブラウザでは、今までどおり窓いっぱいに出す */
    function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
    function bigMode(on) {
      closeMenu();
      document.body.classList.toggle('sf-big', on);
      var root = document.documentElement;
      if (on) {
        var req = root.requestFullscreen || root.webkitRequestFullscreen;
        if (req && !fsElement()) {
          try { var pr = req.call(root); if (pr && pr.catch) pr.catch(function () { }); } catch (e) { }
        }
      } else if (fsElement()) {
        var ex = document.exitFullscreen || document.webkitExitFullscreen;
        try { var pe = ex && ex.call(document); if (pe && pe.catch) pe.catch(function () { }); } catch (e) { }
      }
      refresh();
      if (on) $('sheetBox').scrollTop = 0;
    }
    /* ⚠全画面はブラウザ側（Escなど）でも解ける。解けたら表も元に戻す */
    function onFsChange() {
      if (!fsElement() && document.body.classList.contains('sf-big')) bigMode(false);
      else refresh();
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    $('bigOn').addEventListener('click', function () { bigMode(true); });
    $('bigOff').addEventListener('click', function () { bigMode(false); });
    /* ⭐大きくして作る間も、希望の行を出し入れできる（2026-09-14 本人「１つ戻すはやめて、大きくして作るの部分で、希望の行を出し入れ」） */
    $('bigShowReq').addEventListener('change', function () { S.showReq = this.checked; refresh(); });
    $('prevDet').addEventListener('toggle', function () { if (this.open) renderPrev(); });
    $('chSheet').addEventListener('toggle', function () { if (this.open) refresh(); });
    /* ⭐幅が変わったら縮め直す。⚠window の resize だけだと来ないことがあった（2026-09-14 375px で紙が切れた） */
    function refit() {
      refitPages();
      if (!$('prevBox').hidden) fitSheet($('prevSheet'), $('prevBox'), $('prevGrid'), prevRows);
    }
    var lastW = 0;
    function onBox() { var w = $('sheetBox').clientWidth; if (w !== lastW) { lastW = w; refit(); } }
    if (global.ResizeObserver) new ResizeObserver(onBox).observe($('sheetBox'));
    window.addEventListener('resize', refit);

    /* ⑥ */
    $('memo').addEventListener('input', function () { S.memo = this.value; refresh(); });
    $('doPdf').addEventListener('click', function () {
      if (!global.PAPER_PDF) { alert('PDFの道具を読み込めませんでした。ページを開き直してください。'); return; }
      $('chSheet').open = true;
      document.body.classList.remove('sf-big');   /* ⚠大きいままだと紙の大きさを測りまちがえる */
      pdfMode = true; refresh();
      /* ⭐紙が2枚以上のときは、1つのPDFにまとめる */
      var sheets = [].slice.call($('pages').querySelectorAll('.sf-sheet')), p = ymSplit(S.ym), btn = this;
      sheets.forEach(function (s) { s.classList.add('pdf'); });
      btn.disabled = true; $('pdfMsg').textContent = 'PDFを作っています…';
      var name = 'シフト表_' + p.y + '年' + p.m + '月' + (S.place ? '_' + S.place.replace(/[\\\/:*?"<>|]/g, '') : '');
      global.PAPER_PDF.saveMany(sheets, { name: name, landscape: true }).then(function () {
        flash('pdfMsg', sheets.length > 1 ? 'PDFを保存しました（' + sheets.length + '枚）' : 'PDFを保存しました');
      }).catch(function (err) {
        $('pdfMsg').textContent = '';
        alert('PDFを作れませんでした。' + (err && err.message ? err.message : ''));
      }).then(function () {
        sheets.forEach(function (s) { s.classList.remove('pdf'); }); btn.disabled = false;
        pdfMode = false; refresh();
      });
    });

    /* ⑦ */
    $('save').addEventListener('change', function () {
      if (this.checked) {
        if (S.sample) { flash('savingLabel', 'サンプルは保存しません。①に名前を入れると保存されます'); return; }
        persist();
      } else {
        lsDel(KEY_SCREEN);
        flash('savingLabel', '保存していた画面を消しました');
      }
    });

    /* ⑧ */
    function pickedItem(selId) {
      var id = $(selId).value, box = readBox();
      for (var i = 0; i < box.items.length; i++) if (box.items[i].id === id) return { box: box, i: i, it: box.items[i] };
      return null;
    }
    function snapshot() { var o = clone(S); trimMonths(o); o.sample = false; return o; }
    $('dataNew').addEventListener('click', function () {
      if (S.sample || !S.staff.length) { alert('先に①でスタッフの名前を入れてください。サンプルは保存しません。'); return; }
      var label = prompt('データの名前を入れてください。', S.place || 'シフト');
      if (label == null) return;
      label = label.trim(); if (!label) return;
      var box = readBox(), same = -1;
      box.items.forEach(function (it, i) { if (it.label === label) same = i; });
      if (same >= 0) {
        if (!confirm('「' + label + '」はもうあります。差し替えますか。')) return;
        box.items[same].data = snapshot();
      } else {
        if (box.items.length >= MAX_DATA) { alert('保存できるのは' + MAX_DATA + '件までです。いらないものを削除してください。'); return; }
        box.items.push({ id: 'd' + Date.now(), label: label, data: snapshot() });
      }
      if (!writeBox(box)) { alert('保存できませんでした。ブラウザの設定で保存が止められているかもしれません。'); return; }
      renderDataSel();
      $('dataSel').value = box.items[same >= 0 ? same : box.items.length - 1].id;
      flash('dataMsg', '「' + label + '」を保存しました');
    });
    $('dataSave').addEventListener('click', function () {
      var p = pickedItem('dataSel');
      if (!p) { alert('先に「保存済のシフト」で、上書きするデータをえらんでください。'); return; }
      if (S.sample) { alert('サンプルは保存しません。'); return; }
      if (!confirm('「' + p.it.label + '」を、いまの画面で上書きします。よろしいですか。')) return;
      p.it.data = snapshot(); writeBox(p.box);
      flash('dataMsg', '「' + p.it.label + '」を上書きしました');
    });
    $('dataDel').addEventListener('click', function () {
      var p = pickedItem('dataSel');
      if (!p) { alert('先に「保存済のシフト」で、削除するデータをえらんでください。'); return; }
      if (!confirm('「' + p.it.label + '」を削除します。保存していた月のシフト表もすべて消えます。よろしいですか。')) return;
      p.box.items.splice(p.i, 1); writeBox(p.box); renderDataSel();
      flash('dataMsg', '削除しました');
    });
    $('dataLoad2').addEventListener('click', function () {
      var p = pickedItem('dataSel2');
      if (!p) { alert('先に「保存済のシフト」で、呼び出すデータをえらんでください。'); return; }
      if (S.staff.length && !S.sample && !confirm('いまの画面は「' + p.it.label + '」に入れかわります。よろしいですか。')) return;
      var keepYm = S.ym;
      restore(clone(p.it.data));
      S.ym = keepYm;
      renderAll();
      $('dataSel').value = p.it.id;
      flash('inMsg', '「' + p.it.label + '」を入れました');
    });

    /* 「？」の開け閉め（見出しが summary のときは、中の .body の先頭にある説明を開く） */
    document.addEventListener('click', function (e) {
      var b = e.target;
      while (b && b !== document.body && !(b.classList && b.classList.contains('tip-btn'))) b = b.parentElement;
      if (!b || b === document.body) return;
      var head = b.parentElement, body = null;
      if (head.tagName === 'SUMMARY') {
        e.preventDefault();
        var det = head.parentElement;
        if (!det.open) det.open = true;
        body = det.querySelector(':scope > .body > .tip-body');
      } else {
        body = head.nextElementSibling;
        while (body && !(body.classList && body.classList.contains('tip-body'))) body = body.nextElementSibling;
      }
      if (!body) return;
      var open = body.hidden;
      body.hidden = !open;
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- 起動 ---------- */
  (function start() {
    var raw = lsGet(KEY_SCREEN), restored = false;
    if (raw) {
      try { restore(JSON.parse(raw)); restored = true; $('save').checked = true; } catch (e) { }
    }
    bind();
    renderAll();
    /* ⭐はじめては全部たたむ／2回目からは④シフト表だけ開ける（ページの型 2-a） */
    if (restored) $('chSheet').open = true;
  })();
})();
