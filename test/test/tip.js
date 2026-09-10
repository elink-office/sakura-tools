/* さくらツール 共通：「？」の出し方
   ⚠ この1本だけで完結している。ほかのファイルに依存しない
   ⚠ 戻すときは、このファイルの読み込みを外して、style.css の
      「長い「？」はポップアップにする」の節を消せば元どおり */
/* ============================================================
   🔴 長い「？」をポップアップにする（2026-09-09 本人）
   ⭐やり方＝文字数を数えて 250 以上なら data-pop を付けるだけ。
     開け閉めは各ツールの既存の処理（hidden を切り替える）のまま。
     見た目は style.css の .tip-body[data-pop] が受け持つ
   ⚠戻すときは、この節と style.css の同じ見出しの節を消せば元どおり
   ============================================================ */
(function () {
  /* ⭐この文字数以上を「長い」とする。250 → 180 に下げた（2026-09-09 本人）
     本人「重要な？だから…1回目はしっかり見てほしいから」
     ⚠150まで下げると、短い補足まで浮いてうるさくなる。
     🔴170にした理由＝⑦「画面の保存」（共用の端末では外して、という大事な注意）が
       座席表215／席次表179で、180だと片方だけ浮いて食い違うため */
  var LIMIT = 170;

  function len(el) { return (el.textContent || '').replace(/\s+/g, '').length; }

  function start() {
    var pops = [];
    document.querySelectorAll('.tip-body').forEach(function (b) {
      if (len(b) < LIMIT) return;
      b.setAttribute('data-pop', '1');
      /* 何の説明かが分かるように、見出しと ✕ を上に足す */
      var head = b.previousElementSibling;
      var bar = document.createElement('div');
      bar.className = 'tip-pop-head';
      var t = document.createElement('span');
      /* ⚠「8保存したデータの利用」とくっつくので、番号のあとに1マス空ける（2026-09-09 本人） */
      var num = head ? head.querySelector('.step') : null;
      var raw = head ? head.textContent.replace(/\s+/g, ' ').trim() : '';
      if (num) {
        var d = num.textContent.trim();
        if (raw.indexOf(d) === 0) raw = d + ' ' + raw.slice(d.length).trim();
      }
      t.textContent = raw;
      var x = document.createElement('button');
      x.type = 'button'; x.className = 'tip-x'; x.setAttribute('aria-label', 'とじる');
      x.textContent = '✕';
      bar.appendChild(t); bar.appendChild(x);
      b.insertBefore(bar, b.firstChild);
      pops.push(b);
    });
    if (!pops.length) return;

    var mask = document.createElement('div');
    mask.className = 'tip-mask';
    mask.hidden = true;
    document.body.appendChild(mask);

    function close(b) {
      b.hidden = true;
      var head = b.previousElementSibling;
      var btn = head && head.querySelector ? head.querySelector('.tip-btn') : null;
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    function closeAll() { pops.forEach(function (b) { if (!b.hidden) close(b); }); }
    function sync() {
      var open = pops.some(function (b) { return !b.hidden; });
      mask.hidden = !open;
      document.documentElement.classList.toggle('tip-open', open);
    }

    var mo = new MutationObserver(sync);
    pops.forEach(function (b) { mo.observe(b, { attributes: true, attributeFilter: ['hidden'] }); });

    mask.addEventListener('click', closeAll);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') closeAll();
    });
    document.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== document.body && !(t.classList && t.classList.contains('tip-x'))) t = t.parentElement;
      if (!t || t === document.body) return;
      var b = t.closest ? t.closest('.tip-body') : null;
      if (b) { close(b); sync(); }
    });
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
