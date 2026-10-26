/* さくらツールズ 全ページ共通（2026-09-29 本人「ツール一覧は、今後増えていくから、まとめましょう」「フッターも…まとめましょう」）
   ⭐ここ1本で、全ページの⓪ヘッダー（ロゴ・右上の4つ・ツール一覧のボタン） ①ヘッダーのツール一覧 ②フッター ③テスト版の印 を出す
   ⭐2026-10-22 ヘッダーもここに入れた（本人「設計大事」「全体のリフォームのときまとめて変更できるように」）。
     ⚠前は右上の4つが各ページのHTMLにあり、「座席表」の名前を変えるのに全36ページを直した。ページに残すのはそのページの名前の帯（.site-sub）だけ
   ⭐言葉や並びを直すときは、この site.js だけを直して上げる。ページの ?v= は上げなくてよい（GitHub Pages は Cache-Control: max-age=600＝長くても10分で新しいほうになる・2026-10-22 確かめた）
     ⚠ページのHTMLの形も一緒に変えるとき（data-site-head の付け方を変えるなど）だけ、全ページの ?v= を上げる
   ⭐道具を足すときは、下の TOOLS に1行足すだけ（ページの型 1-0）。UPするのは「新しい道具のフォルダ」と「site.js」の2つ
   ⭐testのページと原本のページは同じ中身。違いは test にだけある <meta name="robots" … data-test> の1行（原本に入れるときに消す）
   ⚠JavaScriptで入れたリンクも <a href> ならGoogleはたどる（Google 検索セントラル「JavaScript SEO の基本」） */
(function () {
  "use strict";

  /* ① ツール一覧（上から順・2026-09-28 本人の並び）。sep＝棒線。onlySelf＝自分のページにだけ出す（まだ公開していない道具） */
  var TOOLS = [
    ["teacher/", "先生ツールセット"],
    "sep",
    ["typing/", "さくらタイピング"],   /* ⭐2026-10-26 名前を「さくらタイピング」に（本人「さくらタッチタイピングより、さくらタイピングのほうが流れがいい」「呼びやすいほうがいい」） */
    ["seat/", "教室の席替え"],   /* ⭐2026-10-22 名前を「教室の席替えメーカー」に（本人「これはもう変更しよう！」） */
    ["slide/", "簡単スライド"],
    ["renraku/", "連絡帳の板書"],   /* ⭐簡単スライドの下（2026-10-04 本人「連絡帳を追加。簡単スライドの下に」） */
    ["random/", "ランダム指名"],
    ["timer/", "カウントダウンタイマー"],
    ["timer/progress/", "進行タイマー"],
    ["excel-fx/", "関数早見表"],
    ["space-delete/", "スペース削除"],   /* ⭐関数早見表の下＝Excelの道具をまとめる（2026-10-08 本人「テストのリンクを全部追加したい」・置き場所＝コードの案）。住所は space/ → space-delete/（2026-10-07） */
    ["space-unify/", "スペース統一"],
    ["name-join/", "姓と名の結合"],
    ["qr/", "QRコード作成"],   /* ⭐姓と名の結合の下（2026-10-08 本人「QRコードは仕事で使うツールでしょ。それ以外は娯楽でも使える。ちょっと色が違う」） */
    ["seki/", "席次表"],
    ["bus/", "バスの座席表"],
    ["shinkansen/", "新幹線の座席表"],
    ["keiri/mitsumori/", "見積書"],
    ["keiri/seikyu/", "請求書"],
    ["kusudama/", "くす玉"],
    ["roulette/", "ルーレット"],
    ["fukubiki/", "福引"],
    ["bingo/", "ビンゴ"],
    ["unit/", "単位変換", "onlySelf"],   /* ⚠まだ一覧に入れない（2026-09-28 本人「なんのチェックもしてない」） */
    "sep",
    ["articles/", "記事一覧"]
  ];
  /* ⓪ ヘッダーの右上（2026-09-21 本人「タッチタイピング、座席表、簡単スライドにして、ツール一覧にしようか」「トップには行きたい」＝トップも並びに）。
     ⚠前＝全部並べていた（7つで狭い画面からはみ出した）。座席表は2026-10-22に「教室の席替え」（本人「これはもう変更しよう！」）
     ⚠長い名前にしたら、狭い画面で2行にならないか見る（style.css の「狭い画面はボタンだけ」の幅＝今は860px） */
  var PINS = [
    ["", "トップ"],
    ["typing/", "さくらタイピング"],   /* ⭐2026-10-26 名前を「さくらタイピング」に（本人「さくらタッチタイピングより、さくらタイピングのほうが流れがいい」「呼びやすいほうがいい」） */
    ["seat/", "教室の席替え"],
    ["slide/", "簡単スライド"]
  ];
  var LOGO_IMG = "img/logo-sakura-64.png?v=2";
  var LOGO_IMG2 = "img/logo-sakura-128.png?v=2";
  /* ⭐「SAKURA tools」の字は画像（2026-10-22 本人「ロゴは画像にしたほうが早い」）。
     理由＝Googleの検索結果で、サイト名が「SAKURA toolsさくらツールズ」とくっついて出ていた（ロゴの英字と日本語が文字で並んでいたのを読んでいると見た・確かめてはいない）。
     ⚠alt は空＝画像の字を Google に文字として読ませない。リンクの名前は aria-label。画像はメイリオ太字・4倍の細かさ（make_logo_text.py） */
  var LOGO_TEXT = "img/logo-text.png?v=1";

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

  /* ⭐ツール一覧を2列に（2026-10-08 本人「ツール一覧もすごく増えてる。これ、2列にする？」→「2列ならまだいけるか。じゃ、それでいこう」）。
     左の列を上から下、そのあと右の列（トップの右の「無料ツール」と同じ読み方）。
     ⚠本来は style.css に書くもの（ページの型 15）。style.css を上げると全ページの ?v= を直すことになるので、一覧を出す site.js に置いた */
  (function () {
    var st = document.createElement("style");
    st.textContent = ".site-head .navlist{column-count:2;column-gap:2px}" +
      ".site-head .navlist a,.site-head .navlist .now,.site-head .navlist .navsep{break-inside:avoid}";
    (document.head || document.documentElement).appendChild(st);
  })();

  /* ⓪ ヘッダー（ページには <div class="wrap" data-site-head></div> だけを書く）
     data-site-head="logo"＝ロゴだけ（学生用のタイピング）／data-logo="nolink"＝ロゴを押しても移らない（練習の画面＝途中で抜けないように） */
  function drawHead() {
    var hs = document.querySelectorAll("[data-site-head]");
    for (var i = 0; i < hs.length; i++) {
      var box = hs[i];
      if (box.getAttribute("data-done")) continue;
      var inner = '<span class="logo-mark"><img src="' + url(LOGO_IMG) + '" srcset="' + url(LOGO_IMG) + " 1x, " + url(LOGO_IMG2) +
                  ' 2x" width="22" height="22" alt=""></span><span class="logo-main"><img src="' + url(LOGO_TEXT) + '" alt=""></span><span class="logo-sub">さくらツールズ</span>';
      var h = box.getAttribute("data-logo") === "nolink" ? '<span class="logo">' + inner + "</span>"
                                                       : '<a class="logo" href="' + url("") + '" aria-label="さくらツールズ トップへ">' + inner + "</a>";
      if (box.getAttribute("data-site-head") !== "logo") {
        var pins = PINS.map(function (t) {
          return rel === t[0] ? '<span class="navpin now" aria-current="page">' + esc(t[1]) + "</span>"
                              : '<a class="navpin" href="' + url(t[0]) + '">' + esc(t[1]) + "</a>";
        }).join("\n");
        h += "\n<nav>\n" + pins + '\n<input type="checkbox" id="navtoggle" class="navtoggle">' +
             '\n<label class="navburger" for="navtoggle">ツール一覧</label>\n<div class="navlist" data-site-nav></div>\n</nav>';
      }
      box.innerHTML = h;
      box.setAttribute("data-done", "1");
    }
  }

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

  /* ①-b ツール一覧は、ほかの場所を押したら閉じる・Escでも閉じる（2026-10-08 本人「PCだとほかをクリックしても消えない…どこかをクリックしたら解除できるように」）
     ⚠一覧の中（ボタン「ツール一覧」と開いた箱）を押したときは閉じない＝今までどおり */
  document.addEventListener("click", function (e) {
    var t = document.querySelector(".site-head .navtoggle");
    if (!t || !t.checked) return;
    if (e.target.closest && e.target.closest(".navburger, .navlist, .navtoggle")) return;
    t.checked = false;
  });
  document.addEventListener("keydown", function (e) {
    var t = document.querySelector(".site-head .navtoggle");
    if (t && t.checked && e.key === "Escape") t.checked = false;
  });

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

  /* ヘッダーの直後で読むので、ヘッダーとツール一覧はすぐ出す。フッターは読み終わってから */
  drawHead(); drawNav(); drawTest();
  function rest() { drawHead(); drawNav(); drawFooter(); drawTest(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", rest); else rest();
})();
