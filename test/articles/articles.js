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
      if (g.subs.length) {
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
    side.appendChild(title); side.appendChild(ol);

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
        g.subs.forEach(function (s) { s._link.classList.toggle("on", on && s === activeSub); });
      });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
