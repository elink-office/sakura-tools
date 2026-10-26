/* =========================================================
   文章のタイピング（/typing/bun/001/ …）の動き（2026-10-24 浮かぶ窓・全文が流れる形）
   ⭐形＝e-typing の長文：始めると周りがグレーになって、練習の窓がまん中に浮かぶ
     （本人「イータイピングは浮かんでたんだよ。周りをグレーにして。そのくらいのほうが集中できる」）
   ⭐窓の中＝上に文章の全体（大きい字。打ったところから字の色が変わる）／下に ひらがな と ローマ字 の2本の行だけ
     ⚠下に漢字の行を出す形はやめた（本人「2重の下の漢字の部分、2行になったり1行になったり気持ち悪い」「上の文章を大きい文字にしたほうがいいのかも」）
     ⭐e-typing の動き（本人の画面録画 2026-10-24 で確かめた）＝上の文章の字の色が変わる・下に漢字なし・下の2本は打つ場所が横のまん中に止まり1字ずつずれる
   ⭐ひらがなとローマ字は、文で区切らず「文章の最初から最後まで」つながった1本の行。
     打っている場所は窓の幅のまん中に止まったまま、行ごと左へ流れる
     （本人「日本語も全部ずっと、全文ずっと流れるのかと思ってた」「幅いっぱいの中央で文字を入力するイメージ」）
   ⭐2通りの読み（{おんれい|おれい}）は ../../romaji.js の toSyllables が1つの音にまとめる
   ⚠タイル・コイン・記録の保存は入れない（本人「そもそももっとシンプルでいいかも」）
   ========================================================= */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var data = JSON.parse($("bunData").textContent);
  var S = data.s;                       // [{t:画面の文, y:打つ読み, k:[{k:見せる字, r:読み}]}]

  var ALL = [], gi = 0, buf = "", missNow = false;   // missNow＝今の字でミスしている（正しく打つまで赤）       // 文章ぜんぶの音（1つずつに s＝何文目 を付ける）・今の音・打ちかけ
  var open = false, running = false, done = false;
  var startAt = 0, chars = 0, miss = 0;

  /* ⭐色＝さくらタイピングの「タイルの色」と同じ（本人「色は、選択できるようにしたい。だって、タイピングから流すよね」）。
     覚え場所も同じ "typingTileColor"＝どちらで選んでも引き継がれる。色の一覧（TILEPICK・BLOCKCOL）は ../../romaji.js
     ⭐効くところ＝打ったところの字の色・スタートボタン（本人「入力の時の文字の色とスタートボタン」）
     ⭐カラフル＝スタートするたびに次の色（1回目ピンク・2回目オレンジ…・本人「1回目ピンク、2回目オレンジとかにはできないのかな？」） */
  var COLKEY = "typingTileColor", TURNKEY = "bunColorTurn";
  var choice = "colorful", turn = 0;
  try { choice = localStorage.getItem(COLKEY) || "colorful"; turn = parseInt(localStorage.getItem(TURNKEY) || "0", 10) || 0; } catch (err) {}
  function colorNow() {
    for (var i = 0; i < TILEPICK.length; i++) if (TILEPICK[i][0] === choice && TILEPICK[i][2]) return TILEPICK[i][2];
    return BLOCKCOL[turn % BLOCKCOL.length];
  }
  function mix(hex, t) {          // 白をまぜる（打ったところは、うすい色）
    var a = parseInt(hex.slice(1), 16), r = (a >> 16) & 255, g = (a >> 8) & 255, b = a & 255;
    var m = function (c) { return Math.round(c + (255 - c) * t); };
    return "rgb(" + m(r) + "," + m(g) + "," + m(b) + ")";
  }
  /* ⭐色が変わるのは練習の窓の中だけ（2026-10-24 本人「ページのトップはいつものピンクにしよう。スタートボタンを押した後の色が変更できるようにしてほしい」）
     ＝窓（#bw）の中にだけ色を入れる。ページ（帯・リンク・スタートボタン）はいつものピンクのまま */
  function applyColor() {
    var c = colorNow(), st = $("bw").style;
    st.setProperty("--bun-c", c);
    st.setProperty("--bun-typed", mix(c, .3));
    /* ⭐ページのさくら色（枠線・リンク・選んだ四角の枠）も選んだ色に（本人「枠線がピンクで出る。それぞれのカラーで出すかなし」）
       ＝さくらタイピングの setStageColor と同じ考え方 */
    st.setProperty("--pink", c);
    st.setProperty("--pink-light", mix(c, .82));
    st.setProperty("--pink-pale", mix(c, .9));
  }
  /* 色を選ぶ四角（さくらタイピングと同じ9つ） */
  (function () {
    var row = $("bunColors"); if (!row) return;
    var h = '<span class="lbl">色</span>';
    TILEPICK.forEach(function (p) {
      var bg = p[2] ? "background-color:" + p[2] : "background-image:linear-gradient(135deg," + BLOCKCOL.join(",") + ")";
      h += '<button type="button" role="radio" data-c="' + p[0] + '" title="' + p[1] + '" aria-label="' + p[1] + '" style="' + bg + '"></button>';
    });
    row.innerHTML = h;
    function mark() {
      [].forEach.call(row.querySelectorAll("button[data-c]"), function (b) {
        var on = b.getAttribute("data-c") === choice;
        b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false");
      });
    }
    row.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-c]") : null; if (!b) return;
      choice = b.getAttribute("data-c");
      try { localStorage.setItem(COLKEY, choice); } catch (err) {}
      mark(); applyColor(); drawTiles(); b.blur();
    });
    mark();
  })();
  applyColor();
  /* ⭐見出しの左の番号のタイル＝番号ごとに7色を順に（さくらタイピングのステージと同じ考え方）。色は BLOCKCOL（romaji.js）＝1か所 */
  (function () {
    var t = document.querySelector(".bun-tl[data-no]"); if (!t) return;
    var n = parseInt(t.getAttribute("data-no"), 10) || 1;
    t.style.setProperty("--tile", BLOCKCOL[(n - 1) % BLOCKCOL.length]);
  })();

  /* ⭐練習画面の見た目＝枠いっぱいにタイルのマス目。いくつかだけ色がついている（さくらタイピングで打っている途中のように）
     色＝選んだ色（カラフルは7色）。マスの大きさ 38px */
  function drawTiles() {
    var host = $("bunTiles"), panel = $("bunPanel"); if (!host || !panel) return;
    var W = panel.clientWidth, H = panel.clientHeight, C = 38;
    var cols = Math.floor(W / C), rows = Math.floor(H / C);
    var ox = Math.round((W - cols * C) / 2), oy = Math.round((H - rows * C) / 2);
    var single = null;
    for (var t = 0; t < TILEPICK.length; t++) if (TILEPICK[t][0] === choice && TILEPICK[t][2]) single = TILEPICK[t][2];
    var cs = single ? [single, mix(single, .2), mix(single, .38)] : BLOCKCOL;
    /* ⭐色のタイルはやめた＝うすいマス目だけ（2026-10-24 本人「ぐちゃぐちゃね」→ 色のタイルをやめる「そうね」） */
    var h = "", n = 0, total = cols * rows, want = 0;
    var pickSet = {};
    while (n < want && n < total) { var k = Math.floor(Math.random() * total); if (!pickSet[k]) { pickSet[k] = 1; n++; } }
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var idx = r * cols + c, st = "left:" + (ox + c * C) + "px;top:" + (oy + r * C) + "px;width:" + (C - 4) + "px;height:" + (C - 4) + "px";
      if (pickSet[idx]) h += '<span class="on" style="' + st + '"><i style="background-color:' + mix2(cs[Math.floor(Math.random() * cs.length)]) + '"></i></span>';
      else h += '<span style="' + st + '"></span>';
    }
    host.innerHTML = h;
  }
  function mix2(c) { return c.charAt(0) === "#" ? mix(c, .25) : c; }   // 色のついたタイルは少しうすく＝文章の読みやすさを守る
  drawTiles();
  window.addEventListener("resize", function () { clearTimeout(window.bunTileT); window.bunTileT = setTimeout(drawTiles, 150); });

  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  /* 1つの言葉を HTML に。ふりがながあるときは <ruby>（make_bun.py の tok_html と同じ形・2026-10-24） */
  function tokHtml(t) {
    if (!t.rb) return esc(t.k);
    var i = t.k.indexOf(t.b);
    return esc(t.k.slice(0, i)) + "<ruby>" + esc(t.b) + "<rt>" + esc(t.rb) + "</rt></ruby>" + esc(t.k.slice(i + t.b.length));
  }
  /* ⭐上の文章は、窓に全部入るように字を小さくする（24px → いちばん小さくて18px）。スクロールさせない（本人「スクロールになっていやだな」）
     ⚠18px でも入らないほど長い文章のときだけ、スクロールが出る */
  function fitAll() {
    var box = $("bwAll"), fs = 24;
    box.style.fontSize = fs + "px";
    while (box.scrollHeight > box.clientHeight + 1 && fs > 18) { fs--; box.style.fontSize = fs + "px"; }
  }
  function curS() { return gi < ALL.length ? ALL[gi].s : S.length; }

  /* 窓の上の段＝文章の全体。⭐打ち終わった言葉から色を変える（e-typing と同じ）。漢字のかたまりは読みを打ち終えたら変わる */
  function drawAll() {
    var n = done ? S.length : curS(), doneLen = 0, i;
    if (!done) for (i = 0; i < gi; i++) if (ALL[i].s === n) doneLen += ALL[i].disp.length;
    var h = "";
    S.forEach(function (s, si) {
      var pos = 0;
      s.k.forEach(function (t) {
        var end = pos + t.r.length;
        var typed = si < n || (si === n && end <= doneLen);
        var cur = !typed && si === n && pos <= doneLen && !done;
        /* ⭐ミスしたところに赤い線（本人「7回ミスってるんだけど、いつミスしたのかがわからない」） */
        var mx = ALL.some(function (sy) { return sy.s === si && sy.miss && sy.off < end && sy.off + sy.disp.length > pos; });
        var cls = (typed ? "done" : "") + (mx ? " mx" : "");
        h += '<span class="' + cls + '"' + (cur ? ' id="bwCur"' : "") + ">" + tokHtml(t) + "</span>";
        if (cur) cur = false;
        pos = end;
      });
    });
    $("bwAll").innerHTML = h;
    /* 今打っているところが箱の中に見えるように、箱だけを動かす（ページは動かさない） */
    var c = $("bwCur"), box = $("bwAll");
    if (c) {
      var top = c.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top + c.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = Math.max(0, top - box.clientHeight / 3);
    }
  }

  /* ひらがなとローマ字の2本の行（文章ぜんぶ） */
  function drawLines() {
    /* ⭐ミスした音は、打ち終わったあとも赤のまま残す／今ミスしている字は赤で知らせる */
    var k1 = "", k2 = "", r1 = "", r2 = "";
    var mk = function (t, on) { return on ? '<b class="mx">' + esc(t) + "</b>" : esc(t); };
    ALL.forEach(function (sy, j) {
      if (j < gi) { k1 += mk(sy.disp, sy.miss); r1 += mk(sy.typed, sy.miss); }
      else if (j === gi) {
        var c = pick(sy, buf), rest = c.slice(buf.length);
        k2 += mk(sy.disp, missNow); r1 += esc(buf);
        r2 += missNow ? '<b class="mx now">' + esc(rest.charAt(0)) + "</b>" + esc(rest.slice(1)) : esc(rest);
      }
      else { k2 += esc(sy.disp); r2 += esc(sy.cands[0]); }
    });
    $("bwKanaLine").innerHTML = '<span class="done" id="bwKDone">' + k1 + "</span>" + k2;
    $("bwRomaLine").innerHTML = '<span class="typed" id="bwRDone">' + r1 + "</span>" + r2;
    flow($("bwKana"), $("bwKanaLine"), $("bwKDone"));
    flow($("bwRoma"), $("bwRomaLine"), $("bwRDone"));
  }
  /* ⭐流す＝打ち終わった部分の右端が、行の箱のまん中に来るように、行ごと動かす */
  function flow(box, line, doneSpan) {
    var x = box.clientWidth / 2 - doneSpan.offsetWidth;
    line.style.transform = "translateX(" + x + "px)";
  }
  /* 打ちかけの字に合う書き方を選ぶ（例：「し」で s h と打っていたら shi を見せる） */
  function pick(sy, typed) {
    for (var i = 0; i < sy.cands.length; i++) if (sy.cands[i].indexOf(typed) === 0) return sy.cands[i];
    return sy.cands[0];
  }
  function drawNow() { if (done) return; drawAll(); drawLines(); }

  /* 窓を開く・最初から */
  function start() {
    /* この回の色で始めて、カラフルなら次の回のために1つ進める（スタートボタンの色＝これから始まる回の色） */
    applyColor();
    if (choice === "colorful") { turn++; try { localStorage.setItem(TURNKEY, String(turn)); } catch (err) {} }
    open = true; done = false; running = false; chars = 0; miss = 0; gi = 0; buf = "";
    ALL = [];
    S.forEach(function (s, i) {
      var off = 0;
      toSyllables(s.y).forEach(function (sy) { sy.s = i; sy.off = off; off += sy.disp.length; ALL.push(sy); });   // off＝その文の中で何字目から
    });
    missNow = false;
    document.body.classList.add("bw-open");
    $("bwResult").hidden = true; $("bwNow").hidden = false;
    /* ⭐打たない字を書いておく（本人「かっこは入れないとかわからないね」「書いておいた方がいいね」） */
    $("bwHint").textContent = "打ち始めると時間を数えます　・　Esc で閉じる";   // 入力しない字の案内は窓の上（.bw-note）
    noAnim(function () { drawAll(); fitAll(); drawNow(); });
  }
  /* 開いた直後・作り直した直後は、滑らせずにその場に置く */
  function noAnim(fn) {
    var ls = [$("bwKanaLine"), $("bwRomaLine")];
    ls.forEach(function (l) { l.style.transition = "none"; });
    fn();
    ls.forEach(function (l) { void l.offsetWidth; l.style.transition = ""; });
  }
  function close() {
    open = false; running = false;
    applyColor();                          // ページのスタートボタンは、次の回の色にしておく
    document.body.classList.remove("bw-open");
    $("bunStart").focus();
  }

  function finish() {
    done = true; running = false;
    var sec = (Date.now() - startAt) / 1000;
    var w = Math.round(chars / sec * 60);
    var e = Math.round(chars / (sec + miss * MISS_PENALTY) * 60);   // 本当の速さ＝ミスの打ち直しの時間を足す（さくらタイピングと同じ）
    $("rTime").textContent = sec.toFixed(1) + "秒";
    $("rMiss").textContent = miss + "回";
    $("rWpm").textContent = w + "/1分";
    $("rEwpm").textContent = e + "/1分";
    $("rMsg").textContent = miss === 0 ? "ミスなしで最後まで打てました。" :
      "ミス" + miss + "回の打ち直しに、およそ" + Math.round(miss * MISS_PENALTY) + "秒かかっています。上の文章の赤い線のところでミスしました。";
    $("bwResult").hidden = false;              // ⭐打つ行は消さずに、その下に出す
    $("bwHint").textContent = "スペースでもう一度　・　Esc で閉じる";
    drawAll();
  }

  function flashMiss() {
    var r = $("bwRoma"); r.classList.remove("miss"); void r.offsetWidth; r.classList.add("miss");
  }

  /* 1つのキー。打った字が、今の音のどれかの書き方の続きなら進む
     ⭐さくらタイピング（typing.js の feed）と同じ決め方（2026-10-24 本人「nennreiっていれたらエラーになる」）：
       打った字がちょうど1つの書き方になっても、もっと長い書き方（ん＝n／nn）が残っていれば、次の字を見るまで待つ。
       次の字が続かなければ、短いほうで確定してから、その字を次の音として受ける */
  function typeKey(ch) {
    var sy = ALL[gi];
    var next = buf + ch;
    var ok = sy.cands.filter(function (c) { return c.indexOf(next) === 0; });
    if (ok.length) {
      chars++; buf = next; missNow = false;
      var exact = ok.indexOf(next) >= 0, longer = ok.some(function (c) { return c.length > next.length; });
      if (exact && !longer) { advance(); return; }
      drawNow(); return;
    }
    if (buf && sy.cands.indexOf(buf) >= 0) {   // 短いほうで確定できる（ん を n で終えた など）→ 確定して、この字を次の音で受け直す
      advance(); if (!done) typeKey(ch); return;
    }
    miss++; sy.miss = true; missNow = true; flashMiss(); drawLines();
  }
  /* 今の音を打ち終えた＝次の音へ */
  function advance() {
    var sy = ALL[gi], before = sy.s;
    sy.typed = buf; gi++; buf = "";
    if (gi >= ALL.length) { drawLines(); finish(); return; }   // ⭐最後の字も色を変えてから終わる（本人「最後の。に色がつかず終了する」）
    if (ALL[gi].s !== before) drawAll();   // 次の文に入った＝上の段を描き直す
    drawNow();
  }

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var isSpace = (e.code === "Space" || e.key === " " || e.key === "　");
    if (!open) {
      /* 窓が閉じているとき＝スペースで開く（入力欄・ボタンにいるときは何もしない） */
      if (isSpace && !(e.target && /^(INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY|A)$/.test(e.target.tagName))) { e.preventDefault(); start(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    /* ⚠日本語入力がオンでキーが届かないときだけ知らせる（ふだんは打つ欄が無いので、オンのままでも打てる・2026-10-24 本人） */
    if (e.isComposing || e.keyCode === 229 || e.key === "Process") { $("bwIme").hidden = false; return; }
    if (done) { if (isSpace || e.key === "Enter") { e.preventDefault(); start(); } return; }
    var ch = isSpace ? " " : e.key;
    if (ch.length !== 1) return;
    e.preventDefault();
    $("bwIme").hidden = true;
    if (!running) { running = true; startAt = Date.now(); }
    typeKey(ch.toLowerCase());
  });

  $("bunStart").addEventListener("click", function () { this.blur(); start(); });
  $("bwClose").addEventListener("click", close);
  $("bwAgain").addEventListener("click", function () { this.blur(); start(); });
  $("bwShade").addEventListener("click", close);
  window.addEventListener("resize", function () { if (open) { fitAll(); if (!done) noAnim(drawLines); } });
})();
