/* 名前の結合（2026-10-07 たたき台・本人「先に名前をくっけるのを作って」）
   ⭐姓の列と名の列を、1つのセルの「姓　名」にくっつける。外から何も読み込まない・保存しない
   ⭐Excelで姓と名の2列を選んでコピー → 1行に「姓 Tab 名」で入ってくる → 行ごとに Tab の区切りをつなぐ
   ⭐姓・名それぞれの前と後ろのスペースは消してからつなぐ（紛れ込んだ空白も）＝つないだあとに余計なスペースが残らない
   ⭐スペース削除（../space-delete/space.js）の部品を写した＝スペースの種類・□の印・コピー・？。直すときは3つとも */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  var HALF = " ", FULL = "　";
  var OTHER = "            ​  ﻿";
  var SP = "[" + HALF + FULL + OTHER + "]";
  var reEnds = new RegExp("^" + SP + "+|" + SP + "+$", "g");
  var reAll = new RegExp(SP, "g");

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

  /* 1行目が項目名（姓・名・氏・名字…）だけなら、くっつけずに「氏名」にする（ページの型 10「1行目が項目名だけならとばす」に近い形） */
  var HEAD = /^(姓|名|氏|名字|苗字|せい|めい|ファーストネーム|ラストネーム)$/;

  function joinRow(line, sep, info) {
    if (line.replace(reAll, "").replace(/\t/g, "") === "") return "";
    var cells = line.split("\t").map(function (c) {
      return c.replace(reEnds, "").replace(/[​﻿]/g, "");
    });
    if (cells.length > 2) info.many++;
    if (cells.length < 2) info.one++;
    var parts = cells.filter(function (c) { return c !== ""; });
    return parts.join(sep);
  }

  function getRadio(name) {
    var r = document.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : "";
  }

  var SEP = { full: FULL, half: HALF, none: "" };
  var SEP_NAME = { full: "全角のスペース", half: "半角のスペース", none: "スペースなし" };

  function run() {
    var src = $("spIn").value.replace(/\r\n?/g, "\n");
    var k = getRadio("spSep") || "full";
    var sep = SEP[k];
    $("spModeNote").textContent = k === "none" ? "例：「山田」「太郎」→「山田太郎」" : "例：「山田」「太郎」→「山田" + sep + "太郎」（" + SEP_NAME[k] + "）";

    if (!src.length) {
      $("spCount").textContent = "まだ何も入っていません。";
      $("spOut").value = "";
      $("spDone").textContent = "";
      $("spCopy").disabled = true;
      marks.forEach(function (m) { m(); });
      return;
    }
    var tailNL = /\n$/.test(src);
    var body = tailNL ? src.slice(0, -1) : src;
    var lines = body.split("\n");
    var info = { many: 0, one: 0 };
    var out = lines.map(function (line, i) {
      if (i === 0) {
        var hc = line.split("\t").map(function (c) { return c.replace(reEnds, ""); });
        if (hc.length >= 2 && hc.every(function (c) { return HEAD.test(c); })) return "氏名";
      }
      return joinRow(line, sep, info);
    });
    var people = out.filter(function (l, i) { return l !== "" && !(i === 0 && l === "氏名" && lines[0].indexOf("\t") >= 0); }).length;
    var c = count(src);
    var msg = "入っている行：<b>" + lines.length + "</b>行";
    if (c.all) msg += "・スペース：半角 <b>" + c.half + "</b>個・全角 <b>" + c.full + "</b>個・紛れ込んだ空白 <b>" + c.other + "</b>個";
    $("spCount").innerHTML = msg;

    var res = out.join("\n") + (tailNL ? "\n" : "");
    $("spOut").value = res;
    var done = people + "人分をくっつけました（間は" + SEP_NAME[k] + "）";
    if (info.many) done += "。⚠3列以上の行が " + info.many + "行 あります（全部くっつけました）";
    if (info.one) done += "。⚠1列だけの行が " + info.one + "行 あります（そのまま出しました）";
    $("spDone").textContent = done;
    $("spCopy").disabled = !res.replace(/\s/g, "").length;
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

  /* サンプル（①は学校以外を先に＝ページの型 4-b）。①は項目名の行・前後のスペース・名の無い行も入れた＝整えてからくっつくのが見える */
  var SAMPLES = {
    sample1:
      "姓\t名\n" +
      "山田\t太郎\n" +
      "佐藤 \t花子\n" +
      "鈴木\t 一郎\n" +
      "高橋\t直美\n" +
      "田中\t\n",
    sample2:
      "相沢\tゆい\n" +
      "石井\tはると\n" +
      "上田\tさくら\n" +
      "遠藤\tれん\n" +
      "小川\tみお\n"
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
  Array.prototype.forEach.call(document.querySelectorAll('input[name="spSep"]'), function (r) {
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
