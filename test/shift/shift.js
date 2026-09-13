/* ============================================================
   シフト表メーカー（2026-09-14 新規）
   ⭐本人「代表がPDFで保存したもののほうが、間違いがない」＝作るのは1人・配るのはPDF
   ⭐本人「中小規模の店舗系でPDFで運用で考えてみようか」
   🚫勤怠とつながない・CSVも出さない（本人「重くて間違えそうなのは（CSVの扱い）やめておこう」）
   ⭐保存の箱は「シフト」を新しく作った（名簿の箱に入れると、座席表の一覧にスタッフ名が出るため）
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var KEY_SCREEN = 'sakura-shift-screen-v1';   /* 画面の保存（1つだけ） */
  var KEY_DATA = 'sakura-shift-v1';            /* 保存したデータ（20件） */
  var MAX_DATA = 20, MAX_STAFF = 40, MAX_CODES = 12, KEEP_MONTHS = 13;
  var PAPER_W = 1123, PAPER_H = 794;           /* A4横（96dpi）＝297×210mm */
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var KIND = { s: '社員', p: 'パート・アルバイト' };
  var COLORS = [
    { v: '#fde4cf', n: 'オレンジ' }, { v: '#fff3b0', n: '黄' }, { v: '#d7ecd9', n: '緑' },
    { v: '#dbe7f7', n: '青' }, { v: '#eadcf2', n: '紫' }, { v: '#eeeeee', n: 'グレー' }, { v: '#ffffff', n: '白' }
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
    el._t = setTimeout(function () { el.textContent = ''; }, 3500);
  }

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
      { id: 'c1', mark: '早', name: '早番', time: '7:00〜16:00', hours: 8, color: 0, work: true },
      { id: 'c2', mark: '中', name: '中番', time: '10:00〜19:00', hours: 8, color: 1, work: true },
      { id: 'c3', mark: '遅', name: '遅番', time: '13:00〜22:00', hours: 8, color: 3, work: true },
      { id: 'c4', mark: '休', name: '公休', time: '', hours: 0, color: 6, work: false },
      { id: 'c5', mark: '有', name: '有給', time: '', hours: 0, color: 5, work: false }
    ];
  }
  function fresh(ym) {
    return { v: 1, ym: ym || nextYm(), place: '', memo: '', staff: [], codes: defaultCodes(), need: {}, months: {}, sample: false, seq: 10 };
  }
  var S = fresh();
  function newId(p) { S.seq = (S.seq || 10) + 1; return p + S.seq; }
  function month(ym, make) {
    if (!S.months[ym] && make) S.months[ym] = { cells: {}, closed: {} };
    return S.months[ym] || null;
  }
  function codeById(id) { for (var i = 0; i < S.codes.length; i++) if (S.codes[i].id === id) return S.codes[i]; return null; }
  function staffById(id) { for (var i = 0; i < S.staff.length; i++) if (S.staff[i].id === id) return S.staff[i]; return null; }
  function cellOf(ym, sid, d) {
    var mo = S.months[ym];
    return (mo && mo.cells[sid] && mo.cells[sid][d]) || null;
  }
  function needOf(cid, we) {
    var n = S.need[cid];
    var v = n && n[we ? 'we' : 'wd'];
    return { t: (v && +v.t) || 0, s: (v && +v.s) || 0 };
  }

  /* ---------- 数える ---------- */
  function computeChecks(ym) {
    var nd = daysIn(ym), items = [], short = {}, anyNeed = false;
    S.codes.forEach(function (c) {
      if (!c.work) return;
      var a = needOf(c.id, false), b = needOf(c.id, true);
      if (a.t || a.s || b.t || b.s) anyNeed = true;
    });
    for (var d = 1; d <= nd; d++) {
      var info = dayInfo(ym, d), label = ymSplit(ym).m + '/' + d + '（' + WD[info.wd] + '）';
      if (info.closed) {
        var who = [];
        S.staff.forEach(function (st) {
          var ce = cellOf(ym, st.id, d), c = ce && codeById(ce.c);
          if (c && c.work) who.push(st.name);
        });
        if (who.length) items.push(label + '　店休日に勤務が入っています（' + who.join('・') + '）');
        continue;
      }
      S.codes.forEach(function (c) {
        if (!c.work) return;
        var need = needOf(c.id, info.we);
        if (!need.t && !need.s) return;
        var t = 0, s = 0;
        S.staff.forEach(function (st) {
          var ce = cellOf(ym, st.id, d);
          if (ce && ce.c === c.id) { t++; if (st.kind === 's') s++; }
        });
        var bad = false;
        if (need.t && t < need.t) { items.push(label + '　' + (c.name || c.mark) + '：' + t + '人（必要' + need.t + '人）'); bad = true; }
        if (need.s && s < need.s) { items.push(label + '　' + (c.name || c.mark) + '：社員' + s + '人（必要' + need.s + '人）'); bad = true; }
        if (bad) { short[c.id] = short[c.id] || {}; short[c.id][d] = true; }
      });
    }
    return { items: items, short: short, anyNeed: anyNeed };
  }

  /* ---------- 紙（表）を組む ---------- */
  function buildGrid(gridEl, ym, opt) {
    opt = opt || {};
    var nd = daysIn(ym), showHours = S.codes.some(function (c) { return c.work && +c.hours > 0; });
    var cols = '118px repeat(' + nd + ',minmax(0,1fr)) 42px' + (showHours ? ' 46px' : '');
    gridEl.style.gridTemplateColumns = cols;
    var h = [], infos = [];
    for (var d = 1; d <= nd; d++) infos.push(dayInfo(ym, d));
    function wcls(i) { return i.closed ? ' cl' : (i.hol || i.wd === 0) ? ' sun' : i.wd === 6 ? ' sat' : ''; }

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
    if (!S.staff.length) {
      h.push('<div class="sf-c sf-empty">①に名前を入れると、ここに並びます</div>');
    }
    ['s', 'p'].forEach(function (kind) {
      var list = S.staff.filter(function (st) { return st.kind === kind; });
      if (!list.length) return;
      h.push('<div class="sf-c sf-g">' + KIND[kind] + '（' + list.length + '人）</div>');
      list.forEach(function (st) {
        rows++;
        var days = 0, hours = 0;
        h.push('<div class="sf-c sf-n">' + esc(st.name) + '</div>');
        infos.forEach(function (i, x) {
          var ce = cellOf(ym, st.id, x + 1), c = ce && codeById(ce.c);
          var style = '', cls = 'sf-c sf-d';
          if (c) {
            style = ' style="background:' + COLORS[c.color || 0].v + '"';
            if (c.work) { days++; hours += (+c.hours || 0); }
          } else if (i.closed) cls += ' cl';
          if (ce && ce.h) cls += ' hope';
          h.push('<div class="' + cls + '" data-s="' + st.id + '" data-d="' + (x + 1) + '"' + style + '>' + (c ? esc(c.mark) : '') + '</div>');
        });
        h.push('<div class="sf-c sf-t">' + days + '</div>');
        if (showHours) h.push('<div class="sf-c sf-t">' + (Math.round(hours * 10) / 10) + '</div>');
      });
    });

    /* 人数の行 */
    var workCodes = S.codes.filter(function (c) { return c.work; });
    if (S.staff.length && workCodes.length) {
      h.push('<div class="sf-c sf-g">人数</div>');
      workCodes.forEach(function (c) {
        h.push('<div class="sf-c sf-n sf-k">' + esc(c.name || c.mark) + '</div>');
        infos.forEach(function (i, x) {
          var n = 0;
          S.staff.forEach(function (st) { var ce = cellOf(ym, st.id, x + 1); if (ce && ce.c === c.id) n++; });
          var bad = opt.short && opt.short[c.id] && opt.short[c.id][x + 1];
          h.push('<div class="sf-c sf-k' + (i.closed ? ' cl' : '') + (bad ? ' short' : '') + '">' + (i.closed && !n ? '' : n) + '</div>');
        });
        h.push('<div class="sf-c sf-k"></div>');
        if (showHours) h.push('<div class="sf-c sf-k"></div>');
      });
      h.push('<div class="sf-c sf-n sf-k">うち社員</div>');
      infos.forEach(function (i, x) {
        var n = 0;
        S.staff.forEach(function (st) {
          if (st.kind !== 's') return;
          var ce = cellOf(ym, st.id, x + 1), c = ce && codeById(ce.c);
          if (c && c.work) n++;
        });
        h.push('<div class="sf-c sf-k' + (i.closed ? ' cl' : '') + '">' + (i.closed && !n ? '' : n) + '</div>');
      });
      h.push('<div class="sf-c sf-k"></div>');
      if (showHours) h.push('<div class="sf-c sf-k"></div>');
    }
    gridEl.innerHTML = h.join('');
    return rows;
  }

  /* ⭐紙を A4横の形に合わせてから、画面の幅に丸ごと縮める。
     ⚠たたんでいる間は測れない（幅0）ので何もしない（ページの型 16-b） */
  function fitSheet(sheet, box, gridEl, rows) {
    if (!sheet || sheet.offsetWidth < 10 || box.clientWidth < 10) return;
    sheet.style.transform = 'none';
    gridEl.style.setProperty('--rowH', '26px');
    if (rows > 0) {
      var h = sheet.offsetHeight;
      var rh = Math.floor(26 + (PAPER_H - h) / rows);
      rh = Math.max(16, Math.min(40, rh));
      gridEl.style.setProperty('--rowH', rh + 'px');
    }
    var s = Math.min(1, box.clientWidth / PAPER_W);
    sheet.style.transform = 'scale(' + s + ')';
    box.style.height = Math.ceil(sheet.offsetHeight * s) + 'px';
  }

  var lastRows = 0, prevRows = 0;
  function renderSheet(short) {
    var p = ymSplit(S.ym);
    $('shTitle').textContent = p.y + '年' + p.m + '月　シフト表';
    $('shPlace').textContent = S.place || '';
    $('shMemo').textContent = S.memo || '';
    lastRows = buildGrid($('grid'), S.ym, { short: short });
    $('legend').innerHTML = S.codes.map(function (c) {
      return '<span class="sf-lg"><span class="sf-sw" style="background:' + COLORS[c.color || 0].v + '">' + esc(c.mark) + '</span>' +
        esc(c.name) + (c.time ? '　' + esc(c.time) : '') + '</span>';
    }).join('') + (Object.keys((month(S.ym) || {}).closed || {}).length ? '<span class="sf-lg"><span class="sf-sw" style="background:#dcdcdc"></span>店休日</span>' : '');
    $('sampleNote').hidden = !S.sample;
    fitSheet($('sheet'), $('sheetBox'), $('grid'), lastRows);
  }

  function renderPrev() {
    var pv = prevYm(S.ym), mo = S.months[pv], p = ymSplit(pv);
    var has = mo && Object.keys(mo.cells).some(function (k) { return Object.keys(mo.cells[k]).length; });
    $('prevBox').hidden = !has;
    $('prevNote').textContent = has ? '' : p.m + '月の表はまだありません。' + p.m + '月もこの画面で作って保存すると、ここに出ます。';
    if (!has) return;
    $('prevTitle').textContent = p.y + '年' + p.m + '月　シフト表';
    prevRows = buildGrid($('prevGrid'), pv, {});
    fitSheet($('prevSheet'), $('prevBox'), $('prevGrid'), prevRows);
  }

  function renderChecks(ck) {
    var list = $('checkList'), sum = $('checkSum');
    if (!S.staff.length) { sum.textContent = '①に名前を入れると、ここで確かめられます。'; list.innerHTML = ''; return; }
    var head = ck.anyNeed ? '' : '④必要な人数が0のままなので、人数は数えていません。';
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
    renderPrev();
    persist();
  }

  /* ---------- ① スタッフ ---------- */
  function renderStaff() {
    $('staffCount').textContent = S.staff.length + '人';
    $('staffList').innerHTML = S.staff.map(function (st, i) {
      return '<div class="sf-srow" data-i="' + i + '"><span class="no">' + (i + 1) + '</span>' +
        '<input type="text" class="st-name" value="' + esc(st.name) + '" aria-label="名前">' +
        '<select class="st-kind" aria-label="区分"><option value="s"' + (st.kind === 's' ? ' selected' : '') + '>社員</option>' +
        '<option value="p"' + (st.kind === 'p' ? ' selected' : '') + '>パート・アルバイト</option></select>' +
        '<button type="button" class="st-up" aria-label="上へ">▲</button><button type="button" class="st-down" aria-label="下へ">▼</button>' +
        '<button type="button" class="st-del" aria-label="外す">×</button></div>';
    }).join('');
  }
  function parseNames(text) {
    var out = [];
    text.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var parts = line.split(/\t|,|，/).map(function (s) { return s.trim(); }).filter(Boolean);
      var kind = 'p', name = '';
      parts.forEach(function (s) {
        if (/^(正)?社員$|^正規$/.test(s)) kind = 's';
        else if (/^(パート|アルバイト|バイト|パート・アルバイト)$/.test(s)) kind = 'p';
        else if (!name) name = s;
      });
      if (!name) {
        /* 「山田 花子　社員」のように空白で区分が付いているとき */
        var m = /^(.*?)[\s　]+(正社員|社員|パート|アルバイト|バイト)$/.exec(line.trim());
        if (m) { name = m[1]; kind = /社員/.test(m[2]) ? 's' : 'p'; }
      } else {
        var m2 = /^(.*?)[\s　]+(正社員|社員|パート|アルバイト|バイト)$/.exec(name);
        if (m2) { name = m2[1]; kind = /社員/.test(m2[2]) ? 's' : 'p'; }
      }
      if (name) out.push({ name: name, kind: kind });
    });
    return out;
  }

  /* ---------- ② 月と休み ---------- */
  function renderMonthUI() {
    var p = ymSplit(S.ym), now = new Date().getFullYear(), ys = [];
    for (var y = Math.min(now - 1, p.y); y <= Math.max(now + 2, p.y); y++) ys.push(y);
    $('ySel').innerHTML = ys.map(function (y) { return '<option value="' + y + '"' + (y === p.y ? ' selected' : '') + '>' + y + '年</option>'; }).join('');
    var ms = []; for (var m = 1; m <= 12; m++) ms.push('<option value="' + m + '"' + (m === p.m ? ' selected' : '') + '>' + m + '月</option>');
    $('mSel').innerHTML = ms.join('');
    $('place').value = S.place || '';
    $('memo').value = S.memo || '';
    var nd = daysIn(S.ym), first = dayInfo(S.ym, 1).wd, h = [], hl = [];
    WD.forEach(function (w) { h.push('<div class="hint" style="text-align:center;margin:0">' + w + '</div>'); });
    for (var b = 0; b < first; b++) h.push('<button type="button" class="sf-day blank" tabindex="-1" aria-hidden="true">.</button>');
    for (var d = 1; d <= nd; d++) {
      var i = dayInfo(S.ym, d);
      if (i.hol) hl.push(p.m + '/' + d + ' ' + i.hol);
      h.push('<button type="button" class="sf-day' + (i.closed ? ' on' : '') + (i.we ? ' we' : '') + '" data-d="' + d + '">' + d +
        '<small>' + (i.hol ? '祝' : WD[i.wd]) + '</small></button>');
    }
    $('dayChips').innerHTML = h.join('');
    $('holList').textContent = hl.length ? 'この月の祝日・休日：' + hl.join('、') : 'この月は祝日がありません。';
  }

  /* ---------- ③ 勤務の種類 ---------- */
  function renderCodes() {
    $('codeList').innerHTML = S.codes.map(function (c, i) {
      return '<div class="sf-crow" data-i="' + i + '">' +
        '<input type="text" class="mk cd-mark" maxlength="2" value="' + esc(c.mark) + '" aria-label="記号">' +
        '<input type="text" class="nm cd-name" value="' + esc(c.name) + '" placeholder="名前" aria-label="名前">' +
        '<input type="text" class="tm cd-time" value="' + esc(c.time) + '" placeholder="9:00〜18:00" aria-label="時間">' +
        '<input type="number" class="hr cd-hours" min="0" max="24" step="0.5" value="' + (+c.hours || 0) + '" aria-label="時間数"><span class="u">時間</span>' +
        '<select class="cd-color" aria-label="色">' + COLORS.map(function (o, k) { return '<option value="' + k + '"' + (k === (c.color || 0) ? ' selected' : '') + '>' + o.n + '</option>'; }).join('') + '</select>' +
        '<label class="chk-inline"><input type="checkbox" class="cd-work"' + (c.work ? ' checked' : '') + '> 出勤として数える</label>' +
        '<button type="button" class="cd-up" aria-label="上へ">▲</button><button type="button" class="cd-down" aria-label="下へ">▼</button>' +
        '<button type="button" class="cd-del" aria-label="削除">×</button></div>';
    }).join('');
  }

  /* ---------- ④ 必要な人数 ---------- */
  function renderNeed() {
    var work = S.codes.filter(function (c) { return c.work; });
    if (!work.length) { $('needBox').innerHTML = '<p class="hint">③で「出勤として数える」の勤務を入れると、ここに並びます。</p>'; return; }
    function inp(cid, side, f) {
      var v = S.need[cid] && S.need[cid][side] ? (+S.need[cid][side][f] || 0) : 0;
      return '<input type="number" min="0" max="99" value="' + v + '" data-c="' + cid + '" data-side="' + side + '" data-f="' + f + '">';
    }
    $('needBox').innerHTML = '<table class="sf-need"><thead><tr><th rowspan="2"></th><th colspan="2">平日</th><th colspan="2">土日祝</th></tr>' +
      '<tr><th>人数</th><th>うち社員</th><th>人数</th><th>うち社員</th></tr></thead><tbody>' +
      work.map(function (c) {
        return '<tr><td>' + esc(c.mark) + '　' + esc(c.name) + '</td><td>' + inp(c.id, 'wd', 't') + '</td><td>' + inp(c.id, 'wd', 's') +
          '</td><td>' + inp(c.id, 'we', 't') + '</td><td>' + inp(c.id, 'we', 's') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="hint">0のままの欄は数えません。</p>';
  }

  /* ---------- ⑤ 記号 ---------- */
  var tool = 'c1';
  function renderPalette() {
    if (tool && !codeById(tool)) tool = S.codes.length ? S.codes[0].id : '';
    $('palette').innerHTML = S.codes.map(function (c) {
      return '<button type="button" data-c="' + c.id + '"' + (tool === c.id ? ' class="on"' : '') + '><span class="sw" style="background:' +
        COLORS[c.color || 0].v + '">' + esc(c.mark) + '</span>' + esc(c.name) + '</button>';
    }).join('') + '<button type="button" data-c=""' + (tool === '' ? ' class="on"' : '') + '>消す</button>';
  }

  function renderAll() {
    renderStaff(); renderMonthUI(); renderCodes(); renderNeed(); renderPalette(); refresh(); renderDataSel();
  }

  /* ---------- マスに入れる ---------- */
  var undoStack = [];
  function pushUndo() {
    undoStack.push({ ym: S.ym, m: JSON.stringify(month(S.ym, true)) });
    if (undoStack.length > 50) undoStack.shift();
    $('undo').disabled = false;
  }
  var stroke = null;   /* なぞっている間の「入れる／消す」 */
  function paint(sid, d, first) {
    var mo = month(S.ym, true), hope = $('hopeMode').checked;
    mo.cells[sid] = mo.cells[sid] || {};
    var cur = mo.cells[sid][d];
    if (first) {
      stroke = (tool && !(cur && cur.c === tool && !!cur.h === hope)) ? 'set' : 'clear';
    }
    if (stroke === 'set' && tool) mo.cells[sid][d] = hope ? { c: tool, h: 1 } : { c: tool };
    else delete mo.cells[sid][d];
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
  function restore(o) {
    var base = fresh(o.ym);
    Object.keys(base).forEach(function (k) { if (o[k] === undefined) o[k] = base[k]; });
    o.sample = false;
    S = o; undoStack = []; $('undo').disabled = true;
  }

  /* ---------- サンプル ---------- */
  function fillSample() {
    var ym = S.ym;
    S = fresh(ym);
    S.sample = true;
    S.place = 'さくら食堂 駅前店';
    S.memo = '交代するときは、店長に連絡してください';
    var names = [['山田 花子', 's'], ['佐藤 健', 's'], ['鈴木 美咲', 's'], ['高橋 翔', 'p'], ['田中 さくら', 'p'], ['伊藤 優', 'p'], ['渡辺 陽菜', 'p'], ['小林 蓮', 'p']];
    names.forEach(function (n) { S.staff.push({ id: newId('s'), name: n[0], kind: n[1] }); });
    S.need = { c1: { wd: { t: 2, s: 1 }, we: { t: 3, s: 1 } }, c2: { wd: { t: 1, s: 0 }, we: { t: 2, s: 0 } }, c3: { wd: { t: 2, s: 1 }, we: { t: 2, s: 1 } } };
    var mo = month(ym, true), nd = daysIn(ym);
    for (var d = 1; d <= nd; d++) if (dayInfo(ym, d).wd === 3) mo.closed[d] = 1;
    /* ⭐人数をおおむね満たすように並べ、2日だけわざと足りなくする（赤の見本を見せるため）。
       ⚠でたらめに並べると足りない日が50件を超えて、何の道具か分からなくなった */
    var sh = S.staff.filter(function (st) { return st.kind === 's'; });
    var pt = S.staff.filter(function (st) { return st.kind === 'p'; });
    S.staff.forEach(function (st) { mo.cells[st.id] = {}; });
    function rot(a, k) { k = k % a.length; return a.slice(k).concat(a.slice(0, k)); }
    for (var d = 1; d <= nd; d++) {
      if (mo.closed[d]) continue;
      var we = dayInfo(ym, d).we, s1 = rot(sh, d), p1 = rot(pt, d * 2);
      ['c1', 'c3', 'c2'].forEach(function (cid) {
        var need = needOf(cid, we);
        for (var a = 0; a < need.s && s1.length; a++) mo.cells[s1.shift().id][d] = { c: cid };
        for (var b = need.s; b < need.t; b++) {
          var who = p1.length ? p1.shift() : s1.shift();
          if (who) mo.cells[who.id][d] = { c: cid };
        }
      });
      s1.concat(p1).forEach(function (st, i) { mo.cells[st.id][d] = ((i + d) % 4 === 0) ? { c: 'c4', h: 1 } : { c: 'c4' }; });
    }
    [5, 19].forEach(function (d) {
      if (mo.closed[d]) return;
      S.staff.some(function (st) {
        var ce = mo.cells[st.id][d];
        if (ce && ce.c === 'c3' && st.kind === 'p') { mo.cells[st.id][d] = { c: 'c4' }; return true; }
        return false;
      });
    });
  }

  /* ---------- 画面を動かす ---------- */
  function openAndShow(id) {
    var det = $(id); det.open = true;
    var r = det.getBoundingClientRect();
    if (r.top > window.innerHeight - 80 || r.top < 0) det.scrollIntoView({ block: 'start' });
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
      if (over) alert('スタッフは' + MAX_STAFF + '人までです。入りきらなかった名前があります。');
      flash('inMsg', added ? added + '人入れました。②へ進みましょう' : 'もう入っています');
    });
    $('sampleBtn').addEventListener('click', function () {
      if (S.sample) { flash('inMsg', 'もう入っています'); return; }
      if (S.staff.length) { alert('サンプルは、①のスタッフが0人のときに入れられます。'); return; }
      fillSample(); renderAll();
      openAndShow('ch5');
    });
    $('clearNames').addEventListener('click', function () { $('names').value = ''; });
    $('staffList').addEventListener('input', function (e) {
      var row = e.target.closest('.sf-srow'); if (!row) return;
      var st = S.staff[+row.dataset.i];
      if (e.target.classList.contains('st-name')) { st.name = e.target.value; refresh(); }
    });
    $('staffList').addEventListener('change', function (e) {
      var row = e.target.closest('.sf-srow'); if (!row) return;
      if (e.target.classList.contains('st-kind')) { S.staff[+row.dataset.i].kind = e.target.value; refresh(); }
    });
    $('staffList').addEventListener('click', function (e) {
      var row = e.target.closest('.sf-srow'); if (!row) return;
      var i = +row.dataset.i, a = S.staff;
      if (e.target.classList.contains('st-up') && i > 0) { a.splice(i - 1, 0, a.splice(i, 1)[0]); }
      else if (e.target.classList.contains('st-down') && i < a.length - 1) { a.splice(i + 1, 0, a.splice(i, 1)[0]); }
      else if (e.target.classList.contains('st-del')) {
        if (!confirm('「' + a[i].name + '」を外します。この人のシフトも、すべての月から消えます。よろしいですか。')) return;
        var id = a[i].id; a.splice(i, 1);
        Object.keys(S.months).forEach(function (k) { delete S.months[k].cells[id]; });
      } else return;
      renderStaff(); refresh();
    });

    /* ② */
    function setYm() {
      S.ym = ymOf(+$('ySel').value, +$('mSel').value);
      undoStack = []; $('undo').disabled = true;
      renderMonthUI(); refresh();
    }
    $('ySel').addEventListener('change', setYm);
    $('mSel').addEventListener('change', setYm);
    $('place').addEventListener('input', function () { S.place = this.value; refresh(); });
    $('dayChips').addEventListener('click', function (e) {
      var b = e.target.closest('.sf-day'); if (!b || !b.dataset.d) return;
      var mo = month(S.ym, true), d = +b.dataset.d;
      if (mo.closed[d]) delete mo.closed[d]; else mo.closed[d] = 1;
      renderMonthUI(); refresh();
    });
    $('wkBtn').addEventListener('click', function () {
      var wd = +$('wkSel').value, mo = month(S.ym, true), nd = daysIn(S.ym), days = [];
      for (var d = 1; d <= nd; d++) if (dayInfo(S.ym, d).wd === wd) days.push(d);
      var all = days.every(function (d) { return mo.closed[d]; });
      days.forEach(function (d) { if (all) delete mo.closed[d]; else mo.closed[d] = 1; });
      renderMonthUI(); refresh();
    });

    /* ③ */
    $('addCode').addEventListener('click', function () {
      if (S.codes.length >= MAX_CODES) { alert('勤務は' + MAX_CODES + '種類までです。いらないものを削除してください。'); return; }
      S.codes.push({ id: newId('c'), mark: '', name: '', time: '', hours: 0, color: 6, work: true });
      renderCodes(); renderNeed(); renderPalette(); refresh();
      var ins = $('codeList').querySelectorAll('.cd-mark'); if (ins.length) ins[ins.length - 1].focus();
    });
    $('codeList').addEventListener('input', function (e) {
      var row = e.target.closest('.sf-crow'); if (!row) return;
      var c = S.codes[+row.dataset.i], t = e.target;
      if (t.classList.contains('cd-mark')) c.mark = t.value;
      else if (t.classList.contains('cd-name')) c.name = t.value;
      else if (t.classList.contains('cd-time')) c.time = t.value;
      else if (t.classList.contains('cd-hours')) c.hours = +t.value || 0;
      else return;
      renderPalette(); refresh();
    });
    $('codeList').addEventListener('change', function (e) {
      var row = e.target.closest('.sf-crow'); if (!row) return;
      var c = S.codes[+row.dataset.i], t = e.target;
      if (t.classList.contains('cd-color')) c.color = +t.value;
      else if (t.classList.contains('cd-work')) { c.work = t.checked; renderNeed(); }
      else { renderNeed(); }
      renderPalette(); refresh();
    });
    $('codeList').addEventListener('click', function (e) {
      var row = e.target.closest('.sf-crow'); if (!row) return;
      var i = +row.dataset.i, a = S.codes;
      if (e.target.classList.contains('cd-up') && i > 0) a.splice(i - 1, 0, a.splice(i, 1)[0]);
      else if (e.target.classList.contains('cd-down') && i < a.length - 1) a.splice(i + 1, 0, a.splice(i, 1)[0]);
      else if (e.target.classList.contains('cd-del')) {
        var c = a[i];
        if (!confirm('「' + (c.name || c.mark || 'この勤務') + '」を削除します。この記号が入っているマスも、すべての月で空になります。よろしいですか。')) return;
        a.splice(i, 1); delete S.need[c.id];
        Object.keys(S.months).forEach(function (k) {
          var cells = S.months[k].cells;
          Object.keys(cells).forEach(function (sid) {
            Object.keys(cells[sid]).forEach(function (d) { if (cells[sid][d].c === c.id) delete cells[sid][d]; });
          });
        });
      } else return;
      renderCodes(); renderNeed(); renderPalette(); refresh();
    });

    /* ④ */
    $('needBox').addEventListener('input', function (e) {
      var t = e.target; if (!t.dataset || !t.dataset.c) return;
      var n = S.need[t.dataset.c] = S.need[t.dataset.c] || {};
      n[t.dataset.side] = n[t.dataset.side] || { t: 0, s: 0 };
      n[t.dataset.side][t.dataset.f] = Math.max(0, +t.value || 0);
      refresh();
    });

    /* ⑤ */
    $('palette').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      tool = b.dataset.c; renderPalette();
    });
    var grid = $('grid');
    grid.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      var c = cellFrom(e.target); if (!c) return;
      e.preventDefault();
      pushUndo(); paint(c.dataset.s, +c.dataset.d, true);
      dragging = true; skipClick = true;
      refreshCell(c);
    });
    grid.addEventListener('mouseover', function (e) {
      if (!dragging) return;
      var c = cellFrom(e.target); if (!c) return;
      paint(c.dataset.s, +c.dataset.d, false);
      refreshCell(c);
    });
    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false; refresh();
    });
    grid.addEventListener('click', function (e) {
      if (skipClick) { skipClick = false; return; }
      var c = cellFrom(e.target); if (!c) return;
      pushUndo(); paint(c.dataset.s, +c.dataset.d, true); refresh();
    });
    /* ⭐なぞっている間は、そのマスだけ塗り直す（表を組み直すと、なぞる先が消えるため） */
    function refreshCell(el) {
      var ce = cellOf(S.ym, el.dataset.s, +el.dataset.d), c = ce && codeById(ce.c);
      el.textContent = c ? c.mark : '';
      el.style.background = c ? COLORS[c.color || 0].v : '';
      el.classList.toggle('hope', !!(ce && ce.h));
      el.classList.toggle('cl', !c && dayInfo(S.ym, +el.dataset.d).closed);
    }
    $('undo').addEventListener('click', function () {
      var u = undoStack.pop(); if (!u) return;
      S.months[u.ym] = JSON.parse(u.m);
      if (u.ym !== S.ym) { S.ym = u.ym; renderMonthUI(); }
      $('undo').disabled = !undoStack.length;
      refresh();
    });
    $('clearMonth').addEventListener('click', function () {
      var p = ymSplit(S.ym);
      if (!confirm(p.m + '月のシフト表のマスを、すべて空にします。店休日はそのまま残ります。よろしいですか。')) return;
      pushUndo(); month(S.ym, true).cells = {}; refresh();
    });
    $('prevDet').addEventListener('toggle', function () { if (this.open) renderPrev(); });
    $('ch5').addEventListener('toggle', function () { if (this.open) refresh(); });
    /* ⭐幅が変わったら縮め直す。⚠window の resize だけだと、スマホの向き替えや
       画面の幅の切り替えで来ないことがあった（2026-09-14 375px で紙が切れた）→ 箱の大きさを見張る */
    function refit() {
      fitSheet($('sheet'), $('sheetBox'), $('grid'), lastRows);
      if (!$('prevBox').hidden) fitSheet($('prevSheet'), $('prevBox'), $('prevGrid'), prevRows);
    }
    var lastW = 0;
    function onBox() { var w = $('sheetBox').clientWidth; if (w !== lastW) { lastW = w; refit(); } }
    if (global.ResizeObserver) new ResizeObserver(onBox).observe($('sheetBox'));
    window.addEventListener('resize', refit);

    /* ⑦ */
    $('memo').addEventListener('input', function () { S.memo = this.value; refresh(); });
    $('doPdf').addEventListener('click', function () {
      if (!global.PAPER_PDF) { alert('PDFの道具を読み込めませんでした。ページを開き直してください。'); return; }
      $('ch5').open = true; refresh();
      var sheet = $('sheet'), p = ymSplit(S.ym), btn = this;
      sheet.classList.add('pdf');
      btn.disabled = true; $('pdfMsg').textContent = 'PDFを作っています…';
      var name = 'シフト表_' + p.y + '年' + p.m + '月' + (S.place ? '_' + S.place.replace(/[\\\/:*?"<>|]/g, '') : '');
      global.PAPER_PDF.save(sheet, { name: name, landscape: true }).then(function () {
        flash('pdfMsg', 'PDFを保存しました');
      }).catch(function (err) {
        $('pdfMsg').textContent = '';
        alert('PDFを作れませんでした。' + (err && err.message ? err.message : ''));
      }).then(function () {
        sheet.classList.remove('pdf'); btn.disabled = false;
      });
    });

    /* ⑧ */
    $('save').addEventListener('change', function () {
      if (this.checked) {
        if (S.sample) { flash('savingLabel', 'サンプルは保存しません。①に名前を入れると保存されます'); return; }
        persist();
      } else {
        lsDel(KEY_SCREEN);
        flash('savingLabel', '保存していた画面を消しました');
      }
    });

    /* ⑨ */
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
      if (same < 0) $('dataSel').value = box.items[box.items.length - 1].id; else $('dataSel').value = box.items[same].id;
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

  var global = window;

  /* ---------- 起動 ---------- */
  (function start() {
    var raw = lsGet(KEY_SCREEN), restored = false;
    if (raw) {
      try { restore(JSON.parse(raw)); restored = true; $('save').checked = true; } catch (e) { }
    }
    bind();
    renderAll();
    /* ⭐はじめては全部たたむ／2回目からは⑤だけ開ける（ページの型 2-a） */
    if (restored) $('ch5').open = true;
  })();
})();
