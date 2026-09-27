/* ============================================================
   roster-tools.js ― 名簿の箱を使う道具の一覧（2026-09-27）

   ⭐名簿の箱（sakura-tools-rosters-v1）は、下の道具で共通。
     どこで保存しても、ほかの道具の「保存済の名簿」に出る。消すとどこからも消える。
   ⭐道具が増えたら、⭐この TOOLS に1行足すだけ。
     全ページの「保存した名簿は、次の道具で使えます。」と、消す・上書きの確認の文がそろう
     （2026-09-27 本人「保存した名簿は○○で使えます。これはそろえたいね」「どんどん増えると、この羅列がおかしくなる。見た目良く」「削除も一緒」）
   🔴⭐test は全部入れる。⭐原本に入れるとき（UPするとき）だけ、公開していない道具の行を消す
     （2026-09-27 本人「testは全部入れて、UPするときだけ公開していないものを削除するようにしよう」）

   使い方
     画面＝ <p class="roster-tools">保存した名簿は、次の道具で使えます。</p> を置くだけ（下に道具の札が並ぶ）
     確認＝ SAKURA_ROSTER.delMsg('1年3組', 'その中の記録も一緒に消えます。')
            SAKURA_ROSTER.overMsg('1年3組')
   ============================================================ */
(function (g) {
  'use strict';

  /* ⭐並び＝ツール一覧の並び（使われそうな順）に近い順。name は札に出す短い名前 */
  var TOOLS = [
    { name: '座席表',         path: 'seat/' },
    { name: '席次表',         path: 'seki/' },
    { name: '簡単スライド',   path: 'slide/' },
    { name: 'ランダム指名',   path: 'random/' },
    { name: 'バスの座席表',   path: 'bus/' },
    { name: '新幹線の座席表', path: 'shinkansen/' }
  ];

  /* このファイルの置き場（サイトのいちばん上）＝リンクの起点 */
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/roster-tools\.js.*$/, '') : '../';
  })();

  function isHere(t) {
    var here = location.href.split(/[?#]/)[0];
    return here.indexOf(BASE + t.path) === 0;
  }
  function others() {
    return TOOLS.filter(function (t) { return !isHere(t); }).map(function (t) { return t.name; });
  }
  /* ⭐確認の文は、道具を1行ずつ並べる（横に並べると、増えたとき読めなくなる） */
  function lines(list) { return list.map(function (n) { return '　・' + n; }).join('\n'); }

  function delMsg(label, extra) {
    var o = others();
    return '「' + label + '」を消します。\n\n' +
      (o.length ? 'この名簿は、次の道具からも消えます。\n' + lines(o) + '\n\n' : '') +
      (extra ? extra + '\n\n' : '') +
      'よろしいですか。';
  }
  function overMsg(label) {
    var o = others();
    return '「' + label + '」を今の名簿で上書きしますか？' +
      (o.length ? '\n\n次の道具の名簿も変わります。\n' + lines(o) : '');
  }

  /* ⭐画面＝文の下に、道具の札を並べる（今いる道具は桜色・押せない。ほかは押すとその道具へ） */
  function render() {
    [].forEach.call(document.querySelectorAll('.roster-tools'), function (p) {
      if (p.querySelector('.rt-list')) return;
      var box = document.createElement('span');
      box.className = 'rt-list';
      TOOLS.forEach(function (t) {
        var el;
        if (isHere(t)) {
          el = document.createElement('span');
          el.className = 'now';
          el.setAttribute('aria-current', 'page');
        } else {
          el = document.createElement('a');
          el.href = BASE + t.path;
        }
        el.textContent = t.name;
        box.appendChild(el);
      });
      p.appendChild(box);
    });
  }

  g.SAKURA_ROSTER = { tools: TOOLS, others: others, delMsg: delMsg, overMsg: overMsg, render: render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})(window);
