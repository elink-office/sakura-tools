/* スペース削除（2026-10-05 たたき台）
   ⭐貼った文字の「スペース」を消す。外から何も読み込まない・保存しない
   ⭐Excelの表は Tab で列が分かれている → 行ごと・Tabごと（セルごと）に処理して、列を崩さない
   ⭐スペースの種類（2026-10-05 手元のExcel 16.0で試した結果に合わせた）
     半角 U+0020／全角 U+3000＝TRIM で消える
     見えない空白＝改行しないスペース U+00A0 ほか＝TRIM では消えない（Microsoftの説明どおり）→ この道具ではふつうのスペースと同じに扱う */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  var HALF = " ", FULL = "　";
  /* 紛れ込んだ空白（画面での呼び方・2026-10-07 本人「紛れ込んだにしよう」。前は「見えない空白」）：改行しないスペース・いろいろな幅のスペース・幅ゼロのスペース */
  var OTHER = "            ​  ﻿";
  var SP = "[" + HALF + FULL + OTHER + "]";
  var reEnds = new RegExp("^" + SP + "+|" + SP + "+$", "g");
  var reRun = new RegExp(SP + "{2,}", "g");
  var reAll = new RegExp(SP, "g");

  var MODE_NOTE = {
    /* [全角にそろえる, 半角にそろえる] */
    ends: ["例：「 山田 　太郎　」→「山田　　太郎」", "例：「 山田 　太郎　」→「山田  太郎」"],
    trim: ["例：「 山田 　太郎　」→「山田　太郎」（ExcelのTRIM関数と同じ）", "例：「 山田 　太郎　」→「山田 太郎」（ExcelのTRIM関数と同じ）"],
    all:  ["例：「 山田 　太郎　」→「山田太郎」", "例：「 山田 　太郎　」→「山田太郎」"]
  };

  function count(s) {
    var h = 0, f = 0, o = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === HALF) h++;
      else if (c === FULL) f++;
      else if (OTHER.indexOf(c) >= 0) o++;
    }
    return { half: h, full: f, other: o, all: h + f + o };
  }

  /* ⭐間に残すスペースは、全角か半角のどちらかにそろえる（2026-10-07 本人「全角、半角、ってはっきり言おう。そのままってどっちになってるかわからない人も多いはず」）。
     はじめは全角（本人「全角スペースが多いと思うよ」）。見えない空白も選んだほうにする（幅ゼロのものは消す） */
  var changed = 0;   // 全角⇔半角を入れかえた数（結果の下の1行に出す）
  function cleanCell(cell, mode, w) {
    if (mode === "all") return cell.replace(reAll, "");
    var t = cell.replace(reEnds, "");
    if (mode === "trim") {
      /* 連続したスペースは1つにする */
      t = t.replace(reRun, function (m) { return m.charAt(0); });
    }
    return t.replace(reAll, function (c) {
      if (c === "​" || c === "﻿") return "";
      if (c !== w) changed++;
      return w;
    });
  }

  function getRadio(name) {
    var r = document.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : "";
  }

  function run() {
    var src = $("spIn").value.replace(/\r\n?/g, "\n");
    var mode = getRadio("spMode") || "trim";
    var w = getRadio("spWidth") === "half" ? HALF : FULL;
    /* 「全部」のときは間にスペースが残らないので、全角・半角の行は押せなくする */
    $("spWidthLine").classList.toggle("off", mode === "all");
    Array.prototype.forEach.call(document.querySelectorAll('input[name="spWidth"]'), function (r) { r.disabled = (mode === "all"); });
    var dropBlank = getRadio("spBlank") === "drop";
    $("spModeNote").textContent = MODE_NOTE[mode][w === HALF ? 1 : 0];

    var c = count(src);
    if (!src.length) {
      $("spCount").textContent = "まだ何も入っていません。";
      $("spOut").value = "";
      $("spDone").textContent = "";
      $("spCopy").disabled = true;
      marks.forEach(function (m) { m(); });
      return;
    }
    $("spCount").innerHTML = c.all
      ? "入っているスペース：半角 <b>" + c.half + "</b>個・全角 <b>" + c.full + "</b>個・紛れ込んだ空白 <b>" + c.other + "</b>個"
      : "スペースは入っていません。";

    /* Excelからのコピーは最後に改行が付くので、いったん外して最後に戻す */
    var tailNL = /\n$/.test(src);
    var body = tailNL ? src.slice(0, -1) : src;
    changed = 0;
    var lines = body.split("\n").map(function (line) {
      return line.split("\t").map(function (cell) { return cleanCell(cell, mode, w); }).join("\t");
    });
    if (dropBlank) lines = lines.filter(function (l) { return l.replace(/\t/g, "") !== ""; });
    var out = lines.join("\n") + (tailNL && lines.length ? "\n" : "");

    $("spOut").value = out;
    var after = count(out).all;
    var removed = c.all - after;
    var msg = removed > 0 ? "スペースを " + removed + "個 消しました" : "消すスペースはありませんでした";
    if (changed > 0) msg += "（" + changed + "個を" + (w === HALF ? "半角" : "全角") + "にそろえました）";
    $("spDone").textContent = msg;
    $("spCopy").disabled = !out.length;
    marks.forEach(function (m) { m(); });
  }

  /* ⭐スペースに印を付けて見せる（2026-10-07 本人「その□の表示」）
     ＝欄（textarea）の後ろに、同じ字・同じ折り返しの層を敷いて、スペースのところだけ印を付ける。字は透明＝欄の字がそのまま見える。
     全角＝桜色の□・半角＝うすい桜色の地・見えない空白＝点線の枠。幅ゼロの空白は幅が無いので印は出ない
     ⚠欄の字の大きさ・余白・折り返しは、欄から毎回読んで合わせる（PCの0.86倍・スマホでも同じ） */
  var MK = new RegExp("(" + SP + ")", "g");
  function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function marked(t) {
    return esc(t).replace(MK, function (c) {
      var k = c === FULL ? "mk-f" : c === HALF ? "mk-h" : "mk-o";
      return '<span class="mk ' + k + '">' + c + "</span>";
    });
  }
  var COPY = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "tabSize", "textAlign",
    "whiteSpace", "wordBreak", "overflowWrap", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
  function attachMarks(ta) {
    var wrap = document.createElement("div"), bd = document.createElement("div");
    wrap.className = "mk-wrap"; bd.className = "mk-bd"; bd.setAttribute("aria-hidden", "true");
    ta.parentNode.insertBefore(wrap, ta);
    wrap.appendChild(bd); wrap.appendChild(ta);
    var draw = function () {
      var cs = getComputedStyle(ta);
      COPY.forEach(function (k) { bd.style[k] = cs[k]; });
      bd.style.top = (parseFloat(cs.marginTop) + parseFloat(cs.borderTopWidth)) + "px";
      bd.style.left = (parseFloat(cs.marginLeft) + parseFloat(cs.borderLeftWidth)) + "px";
      /* ⚠幅と高さは「欄の大きさ − 枠とスクロールバー」で持つ＝画面の幅が変わっても欄についていく（前は数字で持っていて、PC→スマホの幅にしたとき層が残って横にはみ出した） */
      bd.style.width = "calc(100% - " + (ta.offsetWidth - ta.clientWidth) + "px)";
      bd.style.height = "calc(100% - " + (ta.offsetHeight - ta.clientHeight) + "px)";
      bd.innerHTML = marked(ta.value) + "\n ";
      bd.scrollTop = ta.scrollTop;
    };
    ta.addEventListener("scroll", function () { bd.scrollTop = ta.scrollTop; });
    if (window.ResizeObserver) new ResizeObserver(draw).observe(ta);
    window.addEventListener("resize", draw);
    if (window.matchMedia) { var mq = window.matchMedia("(min-width:1000px)"); if (mq.addEventListener) mq.addEventListener("change", draw); }
    return draw;
  }
  var marks = [attachMarks($("spIn")), attachMarks($("spOut"))];

  /* コピー：使えるときは Clipboard API、だめなら選んでコピー */
  function copyOut() {
    var t = $("spOut").value;
    if (!t) return;
    var done = function () { flash("copyMsg", "コピーしました。Excelに貼り付けてください"); };
    var fallback = function () {
      var ta = $("spOut");
      ta.removeAttribute("readonly"); ta.select(); ta.setSelectionRange(0, t.length);
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.setAttribute("readonly", ""); ta.blur();
      if (ok) done(); else flash("copyMsg", "コピーできませんでした。③の中を選んでコピーしてください");
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(t).then(done, fallback);
    } else { fallback(); }
  }

  var timers = {};
  function flash(id, msg) {
    var el = $(id);
    el.textContent = msg;
    clearTimeout(timers[id]);
    timers[id] = setTimeout(function () { el.textContent = ""; }, 3000);
  }

  /* サンプル（ページの型 4-b）：本物の入力欄に入れて結果まで出す・消したら前の中身に戻す */
  var SAMPLES = {
    sample1:
      "会社名\t担当者\tメール\n" +
      "株式会社さくら商事 \t山田　太郎\tyamada@example.com \n" +
      " ABC物産 \t佐藤 花子 \tsato@example.com\n" +
      "\n" +
      "　みどり工業\t鈴木  一郎\t suzuki@example.com\n" +
      "ひかり設計　\t　高橋　　直美\ttakahashi@example.com\n",
    sample2:
      "1\t相沢 ゆい \n" +
      "2\t　石井　はると\n" +
      "3\t上田  さくら\n" +
      "4\t遠藤 れん　\n" +
      "5\t 小川　みお \n"
  };
  var before = null;
  function setSample(id) {
    if (before === null) before = $("spIn").value;
    $("spIn").value = SAMPLES[id];
    $("sampleClear").hidden = false;
    run();
  }
  function clearSample() {
    $("spIn").value = before || "";
    before = null;
    $("sampleClear").hidden = true;
    run();
    flash("sampleMsg", "サンプルを消しました");
  }

  $("spIn").addEventListener("input", function () {
    /* 自分で打ちはじめたら、サンプルの「前の中身」は捨てる＝消すと打った中身が消えるため */
    if (before !== null) { before = null; $("sampleClear").hidden = true; }
    run();
  });
  Array.prototype.forEach.call(document.querySelectorAll('input[name="spMode"],input[name="spWidth"],input[name="spBlank"]'), function (r) {
    r.addEventListener("change", run);
  });
  $("spClear").addEventListener("click", function () {
    $("spIn").value = "";
    if (before !== null) { before = null; $("sampleClear").hidden = true; }
    run();
    $("spIn").focus();
  });
  $("spCopy").addEventListener("click", copyOut);
  $("sample1").addEventListener("click", function () { setSample("sample1"); });
  $("sample2").addEventListener("click", function () { setSample("sample2"); });
  $("sampleClear").addEventListener("click", clearSample);

  /* 「？」の開け閉め（見出しのすぐ下の .tip-body を出し入れ。長いものは tip.js がポップアップにする）
     ⚠10/5に作ったときこの処理が抜けていて、？を押しても何も出なかった（2026-10-07 本人「？がクリックできなかった」）。QRコードと同じ書き方 */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".tip-btn"); if (!b) return;
    var host = b.closest("h2,summary,p,label"), body = host && host.nextElementSibling;
    if (!body || !body.classList.contains("tip-body")) return;
    e.preventDefault(); body.hidden = !body.hidden; b.setAttribute("aria-expanded", body.hidden ? "false" : "true");
  });

  run();
})();
