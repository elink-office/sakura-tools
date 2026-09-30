/* 連絡帳の板書（2026-09-29 本人「一番絶対必要」）
   ⭐先生が打った中身を、○の文字つきの縦書きで大きく映す。⭐入れた文字はどこにも送らない
   ⭐保存は「この画面を保存する」にチェックを入れたときだけ（sakura-renraku-v1・この道具だけの箱） */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "sakura-renraku-v1", MAX = 20;

  /* ○の文字。ひらがな／2年生まで（そえぎぷりんとの黒板掲示用と同じ）／漢字 */
  var MARKS = [
    ["jikan",    { hira: "じ", g2: "時", kanji: "時" }, "時間割"],
    ["shukudai", { hira: "し", g2: "し", kanji: "宿" }, "宿題"],
    ["renraku",  { hira: "れ", g2: "れ", kanji: "連" }, "連絡"],
    ["tegami",   { hira: "て", g2: "手", kanji: "手" }, "手紙"],
    ["mochi",    { hira: "も", g2: "も", kanji: "持" }, "持ち物"],
    ["none",     { hira: "",   g2: "",   kanji: ""   }, "なし"]
  ];
  var WD = ["日", "月", "火", "水", "木", "金", "土"];

  var st = { rows: [], set: "hira", theme: "green", per: 13, grid: true, start: 1 };   /* start＝今日はノートの何列目から（2026-09-30 本人「10行ずつで、前回の続きから書けるシステムも欲しい」） */   /* per＝1列の字数（2026-09-29 本人「とりあえず、字数を決めておこうか」・黒板の写真を数えて13字） */
  var sampleBackup = null;   /* サンプルの間だけ、前の中身を取っておく */

  function markChar(key, set) {
    for (var i = 0; i < MARKS.length; i++) if (MARKS[i][0] === key) return MARKS[i][1][set];
    return "";
  }
  function radio(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function setRadio(name, v) { var r = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (r) r.checked = true; }

  /* ---------- 日付 ---------- */
  function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function setDay(offset) { var d = new Date(); d.setDate(d.getDate() + offset); $("rkDate").value = ymd(d); draw(); }
  function dateParts() {
    var v = $("rkDate").value; if (!v) return null;
    var p = v.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return { m: d.getMonth() + 1, d: d.getDate(), wd: WD[d.getDay()] };
  }

  /* ---------- 文字の整え（縦書き用） ---------- */
  function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  /* 全角の英数字は半角に（縦書きの中で横に並べるため） */
  function half(t) { return t.replace(/[０-９Ａ-Ｚａ-ｚ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }); }
  function tcy(s) { return s.replace(/[0-9A-Za-z]{1,3}/g, function (m) { return '<span class="tcy">' + m + "</span>"; }); }
  /* ⭐折り返すのはスペースを入れたところだけ（2026-09-29 本人「スペースで区切ったところで折り返すっていうのはわかればいい」）
     スペースで区切ったひとかたまりは途中で折らない（.w＝nowrap）。入りきらないときは字を小さくする */
  function chunk(s) {
    var out = "", re = /\[([^\]]{1,6})\]/g, last = 0, m;
    while ((m = re.exec(s))) {
      out += tcy(esc(s.slice(last, m.index))) + '<span class="rk-box">' + tcy(esc(m[1])) + "</span>";
      last = re.lastIndex;
    }
    return out + tcy(esc(s.slice(last)));
  }
  function fmt(t) {
    return half(t).split(/[ 　]+/).filter(function (s) { return s; })
      .map(function (s) { return '<span class="w">' + chunk(s) + "</span>"; }).join(" ");
  }
  /* 縦の長さ（字の数）。横に並べた英数字は1字、[ ] は数えない */
  function len(t) { return half(t).replace(/\[|\]/g, "").replace(/[0-9A-Za-z]{1,3}/g, "x").length; }

  /* ---------- 板書を描く（見本と映す画面で共通） ---------- */
  /* ⭐1列の字数（st.per）で折り返す（2026-09-29 本人「入りきらないっていうのがいつ？って思う」→「字数を決めておこうか」）
     行の中身をスペースで区切ったかたまりに分けて、○の文字（1字ぶん）から並べる。
     st.per を超えるかたまりが来たら、スペースのところで次の列へ（2列目からは○の文字の下＝1字下げ）。
     1つのかたまりが st.per より長いときは、そのかたまりだけ長い列になる（字の大きさは全体がはみ出さないように決める） */
  function columns(r) {
    var c = markChar(r.m, st.set), cols = [], cur = null;
    var parts = half(r.t).split(/[ 　]+/).filter(function (s) { return s; });
    function newCol(first) { cur = { first: first, mark: c, items: [], used: 1 }; cols.push(cur); }
    newCol(true);
    parts.forEach(function (p) {
      var n = len(p), add = (cur.items.length ? 1 : 0) + n;
      if (cur.items.length && cur.used + add > st.per) { newCol(false); add = n; }
      cur.items.push(p); cur.used += add;
    });
    return cols;
  }
  /* ⭐ノートと同じ並び（2026-09-29 本人「ノートと同じ並びにしないと低学年は書けないって言ってた」）
     ノート＝どの列も、上に「月」「日」「ようび」の3マス、その下に「れんらくすることがら」（1マス×13〜14字ぶん）
     板書も同じ＝上の3段（日付はいちばん右の列だけ）、中身はどの列も3段の下から。うすいノートの線（st.grid） */
  var PAGE = 10;   /* ⭐ノートの1ページ＝10列（本人が見せてくれた連絡帳） */
  function colHtml(col, dp, cls) {
    var top = '<div class="rk-top">' + (dp ? '<div class="rk-cell"><span class="tcy">' + dp.m + '</span></div><div class="rk-cell"><span class="tcy">' + dp.d +
              '</span></div><div class="rk-cell">' + dp.wd + "</div>" : '<div class="rk-cell"></div><div class="rk-cell"></div><div class="rk-cell"></div>') + "</div>";
    var body = "";
    if (col) {
      var head = col.first ? '<span class="rk-mark' + (col.mark ? "" : " none") + '">' + esc(col.mark || "　") + "</span>" : '<span class="rk-indent"></span>';
      body = head + col.items.map(chunk).join('<span class="rk-gap"></span>');
    }
    return '<div class="rk-c' + (cls ? " " + cls : "") + '">' + top + '<div class="rk-body">' + body + "</div></div>";
  }
  /* ⭐ノートの1ページ（10列）をまるごと映す。今日の分は「今日は何列目から」の列から（2026-09-30）
     残りの列に入りきらないときは、次のページの1列目から（st.newPage）。その前の列は空（前の日の分＝子どものノートに書いてある） */
  var lastPlace = null;
  function place(n) {
    var s = Math.min(Math.max(st.start || 1, 1), PAGE), next = false;
    if (s - 1 + n > PAGE && n <= PAGE) { s = 1; next = true; }
    return { start: s, end: s + n - 1, next: next };
  }
  function render(board) {
    board.className = "rk-board " + st.theme + (st.grid ? " grid" : "");
    var rows = st.rows.filter(function (r) { return r.t.replace(/\s/g, "") || r.m !== "none"; });
    if (!rows.length) { board.innerHTML = '<div class="rk-empty">①に中身を打つと、ここに板書が出ます</div>'; lastPlace = null; pageMsg(); return; }
    var dp = dateParts(), cols = [], longest = st.per;
    rows.forEach(function (r) { columns(r).forEach(function (c) { cols.push(c); longest = Math.max(longest, c.used); }); });
    var p = place(cols.length), slots = Math.max(PAGE, p.end), h = [];
    for (var i = 1; i <= slots; i++) {
      if (i < p.start) h.push(colHtml(null, null, "past"));
      else if (i <= p.end) h.push(colHtml(cols[i - p.start], i === p.start ? dp : null, "today"));
      else h.push(colHtml(null, null, "rest"));
    }
    board.innerHTML = '<div class="rk-page" style="--len:' + (longest + 0.7) + '">' + h.join("") + "</div>";
    lastPlace = { start: p.start, end: p.end, next: p.next, over: p.end > PAGE };
    pageMsg();
    fit(board, slots, longest);
  }
  /* ①の「今日は何列目から」の下に、今日の分がノートのどこに入るかを出す */
  function pageMsg() {
    var el = $("rkPageMsg"); if (!el) return;
    var p = lastPlace;
    if (!p) { el.textContent = ""; return; }
    var t = "今日の分は、ノートの" + p.start + "列目" + (p.end > p.start ? "から" + p.end + "列目" : "") + "です。";
    if (p.next) t = "残りの列に入りきらないので、次のページの1列目からにしました。" + t;
    if (p.over) t += "⚠1ページ（10列）をこえています。";
    el.textContent = t;
  }
  /* ⭐字の大きさ＝「上の3段＋1列の字数」がちょうど縦に入る大きさ。列が多くて横にはみ出すときは、横に合わせて小さくする */
  function fit(board, ncol, longest) {
    var page = board.querySelector(".rk-page"); if (!page) return;
    var W = page.clientWidth, H = page.clientHeight; if (!W || !H) return;
    var fs = Math.min(H / (3.3 + longest + 0.7), W / (ncol * 1.9 + 0.2));
    for (var i = 0; i < 60; i++) {
      page.style.fontSize = fs + "px";
      if (page.scrollWidth <= W + 1 && page.scrollHeight <= H + 1) break;
      fs *= 0.95;
    }
  }
  function draw() {
    render($("rkPreview"));
    if (!$("rkRun").hidden) render($("rkRunBoard"));
    save();
  }

  /* ---------- 行の入力欄 ---------- */
  function markOptions(sel) {
    return MARKS.map(function (m) {
      var c = m[1][st.set];
      return '<option value="' + m[0] + '"' + (m[0] === sel ? " selected" : "") + ">" + (c ? c + "　" + m[2] : m[2]) + "</option>";
    }).join("");
  }
  function drawRows() {
    var box = $("rkRows"), n = st.rows.length;
    box.innerHTML = st.rows.map(function (r, i) {
      return '<div class="rk-row" data-i="' + i + '">' +
        '<select aria-label="' + (i + 1) + '行目の○の文字">' + markOptions(r.m) + "</select>" +
        '<input type="text" value="' + esc(r.t).replace(/"/g, "&quot;") + '" placeholder="' + (i === 0 ? "例：②しカけんさ　④算" : "") + '" aria-label="' + (i + 1) + '行目の中身">' +
        '<span class="mv"><button type="button" data-a="up"' + (i === 0 ? " disabled" : "") + ' aria-label="上へ">▲</button>' +
        '<button type="button" data-a="down"' + (i === n - 1 ? " disabled" : "") + ' aria-label="下へ">▼</button>' +
        '<button type="button" data-a="del" aria-label="この行を消す">×</button></span></div>';
    }).join("");
    $("rkAdd").disabled = n >= MAX;
  }
  function blankRows() {
    return [{ m: "jikan", t: "" }, { m: "shukudai", t: "" }, { m: "renraku", t: "" }, { m: "mochi", t: "" }];
  }

  /* ---------- サンプル（ページの型 12-a） ---------- */
  var SAMPLES = {
    1: { set: "hira", rows: [
      { m: "jikan", t: "②しカけんさ　④算" },
      { m: "shukudai", t: "かん字ノート[12]　わくもんP9（丸つけ）" },
      { m: "renraku", t: "4じかんで かえります" },   /* ⭐やさしい中身に（2026-09-29 本人「短縮は難しい感じだからなくして。40分4時間もあやしい笑」） */
      { m: "mochi", t: "めがね（もっている人）" } ] },
    2: { set: "kanji", rows: [
      { m: "jikan", t: "①国語　②算数　③体育　④音楽" },
      { m: "shukudai", t: "音読カード　計算ドリル[7]" },
      { m: "tegami", t: "学年だより" },
      { m: "mochi", t: "体そう服　上ぐつ" } ] }
  };
  function showSample(k) {
    if (!sampleBackup) sampleBackup = { rows: st.rows, set: st.set };
    st.rows = SAMPLES[k].rows.map(function (r) { return { m: r.m, t: r.t }; });
    st.set = SAMPLES[k].set; setRadio("rkSet", st.set);
    $("sampleClear").hidden = false; $("sampleClear2").hidden = false; $("rkClear").hidden = true;
    $("sampleMsg").textContent = "サンプル" + (k === 1 ? "①" : "②") + "を入れました。保存はしません。";
    drawRows(); draw();
    $("opt1").open = true; $("opt2").open = true;
  }
  function clearSample() {
    if (!sampleBackup) return;
    st.rows = sampleBackup.rows; st.set = sampleBackup.set; setRadio("rkSet", st.set);
    sampleBackup = null;
    $("sampleClear").hidden = true; $("sampleClear2").hidden = true; $("rkClear").hidden = false; $("sampleMsg").textContent = "";
    drawRows(); draw();
  }

  /* ---------- 画面の保存（チェックを入れたときだけ・サンプルの間は保存しない） ---------- */
  var savingTimer = null;
  function save() {
    if (sampleBackup) return;
    try {
      if ($("save").checked) localStorage.setItem(KEY, JSON.stringify({ v: 1, rows: st.rows, set: st.set, theme: st.theme, per: st.per, grid: st.grid, start: st.start }));
    } catch (e) {}
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && s.rows) { st.rows = s.rows.slice(0, MAX); st.set = s.set || "hira"; st.theme = s.theme || "green"; st.per = s.per || 13; st.grid = s.grid !== false; st.start = s.start || 1; $("save").checked = true; return true; }
    } catch (e) {}
    return false;
  }
  function flash(t) {
    var el = $("savingLabel"); el.textContent = t;
    clearTimeout(savingTimer); savingTimer = setTimeout(function () { el.textContent = ""; }, 3500);
  }

  /* ---------- 映す画面 ---------- */
  function openRun() {
    $("rkRun").hidden = false; document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    render($("rkRunBoard"));
    var el = $("rkRun");
    if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
    setTimeout(function () { render($("rkRunBoard")); }, 250);
  }
  function closeRun() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    $("rkRun").hidden = true; document.body.style.overflow = ""; document.documentElement.style.overflow = "";
  }

  /* 「？」の開け閉め（見出しのすぐ下の .tip-body を出し入れ。長いものは tip.js がポップアップにする） */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".tip-btn"); if (!b) return;
    var host = b.closest("h2,summary,p,label"), body = host && host.nextElementSibling;
    if (!body || !body.classList.contains("tip-body")) return;
    e.preventDefault(); body.hidden = !body.hidden; b.setAttribute("aria-expanded", body.hidden ? "false" : "true");
  });

  function start() {
    if (!load()) st.rows = blankRows();
    setRadio("rkSet", st.set); setRadio("rkTheme", st.theme); $("rkPer").value = String(st.per); $("rkGrid").checked = st.grid; $("rkStart").value = String(st.start);
    $("rkDate").value = ymd(new Date());
    drawRows(); draw();

    $("rkRows").addEventListener("input", function (e) {
      var row = e.target.closest(".rk-row"); if (!row) return;
      var r = st.rows[+row.dataset.i];
      if (e.target.tagName === "INPUT") r.t = e.target.value;
      draw();
    });
    $("rkRows").addEventListener("change", function (e) {
      var row = e.target.closest(".rk-row"); if (!row || e.target.tagName !== "SELECT") return;
      st.rows[+row.dataset.i].m = e.target.value; draw();
    });
    $("rkRows").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-a]"); if (!b) return;
      var i = +b.closest(".rk-row").dataset.i, a = b.dataset.a, R = st.rows;
      if (a === "up" && i > 0) R.splice(i - 1, 0, R.splice(i, 1)[0]);
      if (a === "down" && i < R.length - 1) R.splice(i + 1, 0, R.splice(i, 1)[0]);
      if (a === "del") R.splice(i, 1);
      drawRows(); draw();
    });
    $("rkAdd").addEventListener("click", function () {
      if (st.rows.length >= MAX) return;
      st.rows.push({ m: "none", t: "" }); drawRows(); draw();
      var ins = $("rkRows").querySelectorAll('input[type="text"]'); if (ins.length) ins[ins.length - 1].focus();
    });
    document.querySelectorAll('input[name="rkSet"]').forEach(function (r) { r.addEventListener("change", function () { st.set = radio("rkSet"); drawRows(); draw(); }); });
    document.querySelectorAll('input[name="rkTheme"]').forEach(function (r) { r.addEventListener("change", function () { st.theme = radio("rkTheme"); draw(); }); });
    $("rkDate").addEventListener("input", draw);
    $("rkPer").addEventListener("change", function () { st.per = +$("rkPer").value || 13; draw(); });
    $("rkGrid").addEventListener("change", function () { st.grid = $("rkGrid").checked; draw(); });
    $("rkStart").addEventListener("change", function () { st.start = +$("rkStart").value || 1; draw(); });
    /* 「次の日の続き」＝今日の最後の列の次から（10列をこえたら1列目） */
    $("rkNext").addEventListener("click", function () {
      if (!lastPlace) return;
      var n = lastPlace.end + 1; if (n > PAGE) n = 1;
      st.start = n; $("rkStart").value = String(n); draw();
    });
    $("rkToday").addEventListener("click", function () { setDay(0); });
    $("rkTomorrow").addEventListener("click", function () { setDay(1); });
    $("save").addEventListener("change", function () {
      if ($("save").checked) { save(); flash("この画面を保存しました"); }
      else { try { localStorage.removeItem(KEY); } catch (e) {} flash("保存していたものを消しました"); }
    });
    $("sample1").addEventListener("click", function () { showSample(1); });
    $("sample2").addEventListener("click", function () { showSample(2); });
    $("sampleClear").addEventListener("click", clearSample);
    $("sampleClear2").addEventListener("click", clearSample);
    $("goBtn").addEventListener("click", openRun);
    $("rkFrame").addEventListener("click", openRun);
    $("rkFrame").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRun(); } });
    $("rkClear").addEventListener("click", function () {
      if (!confirm("打った中身をクリアします。②の見た目はそのままです。よろしいですか。")) return;
      st.rows = blankRows(); drawRows(); draw();
    });
    $("closeBtn").addEventListener("click", closeRun);
    $("fsBtn").addEventListener("click", function () { var el = $("rkRun"); if (el.requestFullscreen) el.requestFullscreen().catch(function () {}); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("rkRun").hidden) closeRun(); });
    document.addEventListener("fullscreenchange", function () { if (!$("rkRun").hidden) setTimeout(function () { render($("rkRunBoard")); }, 100); });
    window.addEventListener("resize", function () { render($("rkPreview")); if (!$("rkRun").hidden) render($("rkRunBoard")); });
  }
  /* 見本画像を撮るときだけ（#shot）＝サンプル①を映した画面。印とボタンは出さない（撮り方＝_案\shots の見本画像の作り方） */
  function shot() {
    if (location.hash !== "#shot") return;
    st.start = 4;   /* 見本は「前の日の続き（4列目から）」を見せる */
    showSample(1);
    $("rkRun").hidden = false; document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden";
    document.querySelector(".rk-run .run-tr").style.display = "none";
    var tb = document.getElementById("testBadge"); if (tb) tb.remove();
    render($("rkRunBoard"));
  }
  function boot() { start(); shot(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
