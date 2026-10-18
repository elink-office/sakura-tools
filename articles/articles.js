/* 記事の右の目次（2026-09-29 本人「やっぱり２カラムにしたい。右に目次欲しいわ。意外に長くて戻りたくても戻れない」・見本＝たねまき）
   ⭐記事の中の h2・h3 から自動で作る＝記事を足しても、ここは直さなくてよい（ページの型 16-a）
   ⭐読んでいる章に印（桜色の点）。その章の小見出し（h3）だけ開く
   ⭐右に出るのは広い画面だけ（articles.css の @media）。狭い画面では、リード文の下の目次がそのまま働く */
(function () {
  "use strict";
  function start() {
    var side = document.querySelector(".toc-side"), art = document.querySelector("article.art");
    if (!side || !art) return;
    var heads = [].slice.call(art.querySelectorAll("h2, h3")), n3 = 0, groups = [], cur = null;
    heads.forEach(function (h) {
      if (h.closest(".sanko")) return;
      if (!h.id) h.id = "sec-" + (++n3);
      if (h.tagName === "H2") { cur = { h: h, subs: [] }; groups.push(cur); }
      else if (cur) cur.subs.push(h);
    });
    if (!groups.length) return;

    var title = document.createElement("p"); title.className = "toc-side-t"; title.textContent = "目次";
    var ol = document.createElement("ol");
    groups.forEach(function (g) {
      var li = document.createElement("li"), a = document.createElement("a");
      a.href = "#" + g.h.id; a.textContent = g.h.textContent; li.appendChild(a);
      /* ⭐右の目次はH2だけ（2026-10-18 本人「目次にバーが付くのが嫌」→「Aにしようか」）。H3を開くと長い記事で画面に入りきらず、目次の中にスクロールのバーが出た。⚠H3も出すときは false を外す */
      if (false && g.subs.length) {
        var ul = document.createElement("ul");
        g.subs.forEach(function (s) {
          var sl = document.createElement("li"), sa = document.createElement("a");
          sa.href = "#" + s.id; sa.textContent = s.textContent; sl.appendChild(sa); ul.appendChild(sl);
          s._link = sa;
        });
        li.appendChild(ul);
      }
      g.li = li; g.a = a; ol.appendChild(li);
    });
    /* ⭐目次は .toc-in に包む＝止まるのは目次だけ（2026-10-18 管理人の枠を右の欄の上に置いたため。枠はスクロールで流れて、目次は残る） */
    var tin = document.createElement("div"); tin.className = "toc-in";
    tin.appendChild(title); tin.appendChild(ol); side.appendChild(tin);

    /* いまどこを読んでいるか＝画面の上から120pxの線を越えた、いちばん下の見出し */
    var ticking = false;
    function update() {
      ticking = false;
      var line = 120, active = null, activeSub = null;
      groups.forEach(function (g) {
        if (g.h.getBoundingClientRect().top <= line) active = g;
      });
      if (!active) active = groups[0];
      active.subs.forEach(function (s) { if (s.getBoundingClientRect().top <= line) activeSub = s; });
      groups.forEach(function (g) {
        var on = g === active;
        g.li.classList.toggle("on", on);
        g.subs.forEach(function (s) { if (s._link) s._link.classList.toggle("on", on && s === activeSub); });
      });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

/* ⭐記事を書いた人の枠（2026-10-18 本人と相談）＝記事のおしり（参考の下・広告の上）に出す。文はここ1か所＝記事を足しても直さなくてよい
   いきさつ＝Googleの「有用で信頼性の高いユーザー第一のコンテンツの作成」（2026-10-07更新）の「誰が・どのように」に答えるため。
   ⭐アイコンはさくらのロゴ・呼び方は「管理人」（本人「いつも使ってるアイコン置くのは少し抵抗ある」「管理人かな」）。
   ⭐文は「ます」を2つ続けない（本人「ますが2個以上続くと読みにくいのは一緒だよ記事と」）。字は小さめ（本人「ちょっと長いかもだから、文字小さくしてね」） */
(function () {
  "use strict";
  function addAuthor() {
    var art = document.querySelector("article.art");
    if (!art || art.querySelector(".author-box")) return;
    var box = document.createElement("aside");
    box.className = "author-box";
    box.setAttribute("aria-label", "この記事を書いた人");
    var logo = (document.querySelector(".site-head .logo-mark img") || {}).getAttribute ? document.querySelector(".site-head .logo-mark img").getAttribute("src") : "";
    box.innerHTML =
      '<p class="author-t">この記事を書いた人</p>' +
      '<div class="author-in">' +
        (logo ? '<img class="author-ic" src="' + logo.replace("logo-sakura-64", "logo-sakura-128") + '" width="56" height="56" alt="">' : "") +
        '<div class="author-tx">' +
          '<p class="author-nm">さくらツールズ 管理人</p>' +
          '<p>講師歴16年。Word・Excel・PowerPointを中心に、データ分析などの講義を、毎年のべ500人以上にしています。初心者の方から「具体例があるから興味がわく」「わかりやすくて、楽しくなってきた」と言ってもらえるのが、いちばんの励みです。</p>' +
          '<p>ツールは、AIを使い、自分ではコードを1行も書かずに、すべて1人で作っています。実際に使う人に話を聞いて、細かい要望に応えながら一つずつ形にしていくのが、さくらツールズの作り方です。</p>' +
        '</div>' +
      '</div>';
    var ad = art.querySelector(".t-ad"), after = art.querySelector(".after");
    /* ⭐置き場所＝記事のおしり（PCもスマホも）（2026-10-18 本人「記事の下にしよう。目次動くから」）。
       ⚠右の欄（目次の上）も試したが、目次が止まって動くので、右の欄は目次だけにした */
    art.insertBefore(box, ad || after || null);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addAuthor); else addAuthor();
})();
