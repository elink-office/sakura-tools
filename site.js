/* さくらツールズ 全ページ共通（2026-09-29 本人「ツール一覧は、今後増えていくから、まとめましょう」「フッターも…まとめましょう」）
   ⭐ここ1本で、全ページの①ヘッダーのツール一覧 ②フッター ③テスト版の印 を出す
   ⭐道具を足すときは、下の TOOLS に1行足すだけ（ページの型 1-0）。UPするのは「新しい道具のフォルダ」と「site.js」の2つ
   ⭐testのページと原本のページは同じ中身。違いは test にだけある <meta name="robots" … data-test> の1行（原本に入れるときに消す）
   ⚠JavaScriptで入れたリンクも <a href> ならGoogleはたどる（Google 検索セントラル「JavaScript SEO の基本」） */
(function () {
  "use strict";

  /* ① ツール一覧（上から順・2026-09-28 本人の並び）。sep＝棒線。onlySelf＝自分のページにだけ出す（まだ公開していない道具） */
  var TOOLS = [
    ["teacher/", "先生ツールセット"],
    "sep",
    ["typing/", "タッチタイピング"],
    ["seat/", "座席表"],
    ["slide/", "簡単スライド"],
    ["random/", "ランダム指名"],
    ["timer/", "カウントダウンタイマー"],
    ["timer/progress/", "進行タイマー"],
    ["excel-fx/", "関数早見表"],
    ["seki/", "席次表"],
    ["bus/", "バスの座席表"],
    ["shinkansen/", "新幹線の座席表"],
    ["keiri/mitsumori/", "見積書"],
    ["keiri/seikyu/", "請求書"],
    ["kusudama/", "くす玉"],
    ["roulette/", "ルーレット"],
    ["fukubiki/", "福引"],
    ["bingo/", "ビンゴ"],
    ["qr/", "QRコード作成"],
    ["unit/", "単位変換", "onlySelf"],   /* ⚠まだ一覧に入れない（2026-09-28 本人「なんのチェックもしてない」） */
    "sep",
    ["articles/", "記事一覧"]
  ];
  /* 一覧の中で「いまこのページ」とみなす別の住所（練習の画面はタッチタイピング） */
  var SAME = { "typing/play.html": "typing/" };

  /* ② フッター */
  var FOOT_LINKS = [["about/", "運営者情報"], ["contact/", "お問い合わせ"], ["privacy/", "プライバシーポリシー"]];
  var COPY = "さくらツールズ　© 2026 SAKURA tools";

  /* サイトのいちばん上の住所＝この site.js の置き場（file:// でも localhost でも /test/ でも本番でも同じに動く） */
  var me = document.currentScript || (function () { var s = document.getElementsByTagName("script"); return s[s.length - 1]; })();
  var base = me.src.replace(/site\.js(\?.*)?$/, "");
  function url(p) { return base + p; }
  var here = location.href.split("#")[0].split("?")[0];
  var rel = here.indexOf(base) === 0 ? here.slice(base.length) : "";
  rel = rel.replace(/index\.html$/, "");
  rel = SAME[rel] || rel;

  function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /* ① ヘッダーのツール一覧 */
  function drawNav() {
    var boxes = document.querySelectorAll("[data-site-nav]");
    if (!boxes.length) return;
    var h = [];
    TOOLS.forEach(function (t) {
      if (t === "sep") { h.push('<span class="navsep" aria-hidden="true"></span>'); return; }
      var isMe = rel === t[0];
      if (t[2] === "onlySelf" && !isMe) return;
      h.push(isMe ? '<span class="now" aria-current="page">' + esc(t[1]) + "</span>"
                  : '<a href="' + url(t[0]) + '">' + esc(t[1]) + "</a>");
    });
    for (var i = 0; i < boxes.length; i++) boxes[i].innerHTML = h.join("\n");
  }

  /* ② フッター（data-site-footer="copy" はコピーライトだけ＝学生用の練習ページ） */
  function drawFooter() {
    var fs = document.querySelectorAll("[data-site-footer]");
    for (var i = 0; i < fs.length; i++) {
      var only = fs[i].getAttribute("data-site-footer") === "copy";
      var links = FOOT_LINKS.map(function (l) { return '<a href="' + url(l[0]) + '">' + esc(l[1]) + "</a>"; }).join("　");
      fs[i].innerHTML = '<div class="wrap">' + (only ? "" : '<span class="fnav">' + links + "</span>\n    ") +
                        '<span class="copy">' + esc(COPY) + "</span></div>";
    }
  }

  /* ③ テスト版の印（test のページだけ＝<meta name="robots" … data-test> があるとき）
     左上に「テスト版 月/日 時:分」（このページが最後に変わった時刻）・タブの名前の頭に【テスト】（ページの型 17-b） */
  function drawTest() {
    if (!document.querySelector("meta[data-test]")) return;
    if (document.title.indexOf("【テスト】") !== 0) document.title = "【テスト】" + document.title;
    if (document.getElementById("testBadge") || !document.body) return;
    var b = document.createElement("div");
    b.id = "testBadge"; b.className = "noprint";
    b.style.cssText = "position:fixed;left:6px;top:56px;z-index:9999;background:#c86a8e;color:#fff;font-size:11px;padding:3px 8px;border-radius:999px;opacity:.85";
    var d = new Date(document.lastModified), z = function (n) { return (n < 10 ? "0" : "") + n; };
    b.textContent = "テスト版 " + z(d.getMonth() + 1) + "/" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes());
    document.body.insertBefore(b, document.body.firstChild);
  }

  /* ヘッダーの直後で読むので、ツール一覧はすぐ出す。フッターは読み終わってから */
  drawNav(); drawTest();
  function rest() { drawNav(); drawFooter(); drawTest(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", rest); else rest();
})();
