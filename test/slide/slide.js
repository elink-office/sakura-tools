/* 簡単スライド（/slide/）
   文字を大きくモニターに出す。2つの出し方＝「文字を出す」「発表者を出す」。
   🔴 名簿はサーバーに送らない。localStorage だけ。
   🔴 映す画面には広告を置かない（slide.css の注記も参照）。 */
(function(){
  "use strict";

  var KEY  = 'sakura-slide-v1';                 // このページの保存
  var KEYC = 'sakura-tools-rosters-v1';     // 🔴 座席表・班分けと共通の名簿置き場

  var rows = [];        // {name,title,group,off}
  var groupOrder = [], groupOff = {};
  var origRows = [], origGroups = [];
  var slides = [], pos = 0;

  /* 「文字を出す」で並べる1枚ぶん。
     { text:'…', url:'blob:…', name:'', pos:'', size:'', off:false }
       pos/size が空なら「見た目」の全体設定に従う。off は映さない印
     🔴 どの1枚も「文字」と「写真」の両方を持てる（2026-09-05 本人
        「1行目のすでに入っている文字の左に、写真の枠があって横線が入ってる。
          5行目に入った写真を、そのすでに入っている文字の左に移動したい。
          そうすると文字を改めて入力しなくていいよね」）。
        ＝写真は「新しい1枚」ではなく、どの1枚にも後から入れられる。
     🔴 写真は保存しない（本人「保存なしでいい」）。メモリに置くだけ。 */
  var sheets = [];

  /* 🔴 サンプル（2026-09-05 本人「サンプルを入れるっていうのがあればやっぱりうれしい」）。
     ⚠枠の中のお手本（placeholder）は、画面を保存していると打った文字が残って見えないことがある＝ボタンで入れられる形に戻した。
     ⭐一覧の下に足す（今あるものは消さない）。 */
  /* ⚠先頭は「つぎの議題」（2026-09-05 本人「学校じゃなくても使えるアピール」） */
  var SAMPLE_TEXT =
    "つぎの議題//会計の報告\n" +
    "今日のめあて//分数のたし算ができる\n" +
    "教室に戻ったらすること//①着替え/②プリントの直し/③読書\n" +
    "教科書 42ページ\n" +
    "のこり 5分";

  var SAMPLE_LIST =
    "名前\t作品名\t班\n" +
    "さくら\tわたしの家族\t1班\n" +
    "たろう\tわたしの家族\t1班\n" +
    "はなこ\t海の生きものを/しらべて分かったこと\t2班\n" +
    "けんた\t海の生きものを/しらべて分かったこと\t2班\n" +
    "みく\t海の生きものを/しらべて分かったこと\t2班\n" +
    "そうた\tぼくの町のじまん\t3班\n" +
    "あおい\tぼくの町のじまん\t3班\n" +
    "ゆい\t大切な友だち\t4班\n" +
    "りく\t大切な友だち\t4班";

  /* 🔴 一覧の「#」は、幅があるときだけ「スライド」と出す（2026-09-05 本人）。
     ⚠せまいと列を食うので、CSSで出し分ける */
  var HEAD_IDX = '<th class="idx"><span class="wide">スライド</span><span class="narrow">#</span></th>';

  function $(id){ return document.getElementById(id); }

  /* ===== 写真の置き場（この機器のブラウザの中だけ） =====
     🔴 localStorage は 5MB ほどしかなく写真が入らないので、写真だけ IndexedDB に置く。
        どちらも「使ってる機器の中」で、外には出ない。
     🔴「この機器に画面を保存する」のチェックが入っているあいだだけ書き込む（座席表と同じ考え方）。 */
  var DBNAME = 'sakura-slide', STORE = 'pics';
  function withDB(fn){
    try{
      var req = indexedDB.open(DBNAME, 1);
      req.onupgradeneeded = function(e){
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function(e){ fn(e.target.result); };
      req.onerror   = function(){ fn(null); };
    }catch(err){ fn(null); }
  }
  /* 🔴 写真も「画面の保存」に残す（2026-09-05 本人・いったん外したが戻した）。
     本人「授業終了→明日の準備でこれを使う、写真も選ぶ→翌日使う。⭐写真を選んで、翌日使うときに消えたら困る」
     ⚠外していいと言われたのは⑤（名前を付けた名簿）のほうで、④（画面の保存）ではなかった。 */
  function picPut(id, blob){
    if (!$('save').checked || !blob) return;
    withDB(function(db){
      if (!db) return;
      try{ db.transaction(STORE,'readwrite').objectStore(STORE).put(blob, id); }catch(e){}
    });
  }
  function picDel(id){
    withDB(function(db){
      if (!db) return;
      try{ db.transaction(STORE,'readwrite').objectStore(STORE).delete(id); }catch(e){}
    });
  }
  function picClear(){
    withDB(function(db){
      if (!db) return;
      try{ db.transaction(STORE,'readwrite').objectStore(STORE).clear(); }catch(e){}
    });
  }
  function picPutAll(){
    if (!$('save').checked) return;
    withDB(function(db){
      if (!db) return;
      try{
        var st = db.transaction(STORE,'readwrite').objectStore(STORE);
        sheets.forEach(function(sh){
          if (sh.picId  && sh.blob)  st.put(sh.blob,  sh.picId);
          if (sh.picId2 && sh.blob2) st.put(sh.blob2, sh.picId2);   // 2枚目（比べる用）
        });
      }catch(e){}
    });
  }
  function picLoadAll(cb){
    withDB(function(db){
      if (!db){ cb(); return; }
      var left = 0, done = false;
      function fin(){ if (done && left === 0) cb(); }
      try{
        var st = db.transaction(STORE,'readonly').objectStore(STORE);
        // ⭐1枚目と2枚目（比べる用）を同じ手順で戻す
        function pull(sh, idKey, blobKey, urlKey){
          if (!sh[idKey]) return;
          left++;
          var r = st.get(sh[idKey]);
          r.onsuccess = function(){
            var b = r.result;
            if (b){ sh[blobKey] = b; sh[urlKey] = URL.createObjectURL(b); }
            left--; fin();
          };
          r.onerror = function(){ left--; fin(); };
        }
        sheets.forEach(function(sh){
          pull(sh, 'picId',  'blob',  'url');
          pull(sh, 'picId2', 'blob2', 'url2');
        });
      }catch(e){}
      done = true; fin();
    });
  }
  function newPicId(){
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }
  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }
  function kind(){
    var el = document.querySelector('input[name=kind]:checked');
    return el ? el.value : 'text';
  }

  /* ================= 共通の名簿（座席表・班分けと同じ置き場） ================= */
  function loadRosters(){
    try{
      var d = JSON.parse(localStorage.getItem(KEYC) || 'null');
      if (d && d.classes && d.classes.length) return d.classes;
    }catch(e){}
    return [];
  }
  /* 🔴 班分けページの保存から班を組み立てる。
     seats＝台の順に並んだ名前／sizes＝各台（班）の人数。切り分ければ班になる。
     ⚠座席表側の班は「座席の並びから計算」なので直接は取れない。使うのは group の保存。 */
  function groupsFromClass(c){
    var g = c && c.group;
    if (!g || !g.seats || !g.sizes) return null;
    var out = {}, k = 0;
    for (var i=0;i<g.sizes.length;i++){
      var n = g.sizes[i]|0;
      for (var j=0;j<n;j++){
        var nm = g.seats[k++];
        if (nm) out[nm] = (i+1) + '班';
      }
    }
    return out;
  }
  var MAXC = 20;                      // 名簿は20件まで（座席表と同じ）
  /* 🔴 文字のセット（今日のめあて・教科書◯ページ…）も同じ「新しい名前で保存」で残す（2026-09-05 本人
     「文字を出すの部分で、エクセルからコピペするでしょう。それを新しく保存する。私なら…1年生資料とかにして保存」）。
     ⚠置き場は名簿と同じだが `kind:'slide'` の印を付ける＝座席表メーカーのクラス一覧には出さない
       （あちらで読み込めてしまうと、めあての文が名前として並ぶ）。
     ⭐授業ごとに増えるので、上限は名簿より多くする。文字だけなので1件2〜3KB。 */
  var MAXS = 100;                     // 文字のセットは100件まで
  function fillClassSelect(){
    var cls = loadRosters();
    $('clsBox').hidden = !cls.length;
    if ($('clsBoxT')) $('clsBoxT').hidden = !cls.length;
    // ⚠発表者側は名簿だけ。文字側は名簿も文字のセットも出す（1人＝1枚／1行＝1枚で入る）
    [['clsSel', false], ['clsSelT', true]].forEach(function(pair){
      var sel = $(pair[0]); if (!sel) return;
      var withSets = pair[1], keep = sel.value;
      sel.innerHTML = '';
      cls.forEach(function(c,i){
        if (!withSets && c.kind === 'slide') return;
        var o = document.createElement('option');
        o.value = String(i);
        o.textContent = (c.label || ('データ'+(i+1)))
                      + (c.kind === 'slide' ? '（文字）' : ((c.group && c.group.seats) ? '（班あり）' : ''));
        sel.appendChild(o);
      });
      if (keep !== '' && cls[parseInt(keep,10)]) sel.value = keep;
    });
    // 🔴 削除は⑤に1つだけ（2026-09-06 本人「削除は⑤でしょ？」）。①でえらんでいるものを消す
    if ($('clsDel')) $('clsDel').disabled = !cls.length;
    var cnt = $('clsCount');
    if (cnt){
      var nR = cls.filter(function(c){ return c.kind !== 'slide'; }).length;
      var nS = cls.length - nR;
      cnt.textContent = '名前のデータ ' + nR + '／' + MAXC + '　文字のデータ ' + nS + '／' + MAXS;
    }
  }
  // ⚠2つのセレクトは同じものを指す（座席表と同じ）
  function syncCls(from, to){
    return function(){
      var a = $(from), b = $(to);
      if (a && b && b.querySelector('option[value="'+a.value+'"]')) b.value = a.value;
    };
  }
  // ⚠上書き・削除はやめたので、いま選ばれているクラスは「名前の初期値」に使うだけ
  function pickedClass(){
    var v = ($('clsSel') && $('clsSel').value) || '';
    if (v === '') return -1;
    return parseInt(v, 10);
  }

  /* 🔴 座席表の名簿は「1,やまだ たろう,男」のように列が付いていることがある（2026-09-05 本人
     「座席表で入れた男女とかなくなったよ」）。⭐名前の列だけを取り出す。⚠番号・男女・★は名前ではない。
     ⚠取り出すだけで、保存されている行そのものは変えない（男女はあちらで使う）。 */
  function nameOfLine(line){
    var cells = String(line).split(/[	,，]/)
      .map(function(x){ return x.replace(/^[\s　]+/,'').replace(/[\s　]+$/,''); })
      .filter(function(x){ return x.length; });
    if (cells.length === 1){
      var one = cells[0]
        .replace(/^[0-9０-９]+[.．、,，:：]?[\s　]*/, '')          // 先頭の出席番号
        .replace(/[\s　]*[（(\[【]?(男|女|男子|女子)[）)\]】]?$/, '')  // 末尾の男女
        .replace(/^[★☆][\s　]*/, '');
      return one.replace(/^[\s　]+|[\s　]+$/g,'');
    }
    var name = '';
    cells.forEach(function(c){
      if (/^[★☆]+$/.test(c)) return;
      if (/^(男|女|男子|女子)$/.test(c)) return;
      if (/^[0-9０-９]+$/.test(c)) return;
      if (!name) name = c;
    });
    return name.replace(/^[★☆][\s　]*/, '');
  }

  function loadFromClass(){
    var c = loadRosters()[parseInt($('clsSel').value,10)];
    if (!c) return;
    var names = String(c.names || '').split('\n')
      .map(function(s){ return nameOfLine(s); })
      .filter(function(s){ return s !== ''; });
    if (!names.length){
      $('warn').textContent = 'このデータに名前が入っていませんでした。';
      $('warn').hidden = false; return;
    }
    $('warn').hidden = true;
    var gmap = groupsFromClass(c) || {};
    var keep = {};                       // すでに入れた作品名は引き継ぐ
    rows.forEach(function(r){ if (r.title) keep[r.name] = r.title; });
    setRows(names.map(function(n){
      return { name:n, title:keep[n] || '', group:gmap[n] || '', off:false };
    }));
    $('paste').value = rows.map(function(r){
      return [r.name, r.title, r.group].join('\t').replace(/\t+$/,'');
    }).join('\n');
    drawList();
  }

  /* 🔴 名簿の保存（2026-09-05 本人「1つのサイトになったから、保存名簿の保存が効くよね」）。
     ⭐置き場も作りも座席表メーカーと同じ（KEYC・新しい名前で保存／上書き／削除・20件まで）。
     ⚠残すのは名前だけ。座席表が持っている席・記録（seat / seki / recs / group）には触らない。 */
  function readStore(){
    var st = null;
    try{ st = JSON.parse(localStorage.getItem(KEYC) || 'null'); }catch(e){}
    if (!st || !st.classes) st = { v:2, classes: [] };
    return st;
  }
  function writeStore(st){
    try{ localStorage.setItem(KEYC, JSON.stringify(st)); return true; }
    catch(e){ showCls('保存できませんでした。ブラウザの空きが足りないようです'); return false; }
  }
  /* 🔴 上書きしても、座席表で入れた「番号・男女」を消さない（2026-09-05 本人
     「名簿さ、共通なのはいいんだけどさ、⭐座席表で入れた男女とかなくなったよ」）。
     ⚠原因＝このページは名前しか持っていないので、名前だけの名簿で上書きしていた。
     ⭐同じ人の行が前の名簿にあれば、その行をそのまま使う（例「1,やまだ たろう,男」）。
        新しく増えた人だけ、名前だけの行になる。 */
  function namesNow(old){
    var keep = String(old || '').replace(/\r/g,'').split('\n')
                 .filter(function(l){ return l.trim() !== ''; });
    var used = {};
    return rows.map(function(r){ return r.name; })
      .filter(function(n){ return n && n.trim() !== ''; })
      .map(function(n){
        for (var i=0;i<keep.length;i++){
          if (!used[i] && keep[i].indexOf(n) >= 0){ used[i] = true; return keep[i]; }
        }
        return n;
      })
      .join('\n');
  }
  function doClsNew(){
    var isText = (kind() === 'text');
    // ⭐文字を出す側なら、いま並んでいる文字をそのまま残す（本人「1年生資料とかにして保存」）
    var lines = isText
      ? sheets.map(function(sh){ return (sh.text||'').trim(); })
              .filter(function(t){ return t !== ''; })
      : [];
    if (isText && !lines.length){ alert('先に文字を入れてください。'); return; }
    if (!isText && !rows.length){ alert('先に①で名前を入れてください。'); return; }
    var st = readStore();
    var cur = st.classes[pickedClass()];
    var name = prompt('データの名前を入れてください', (cur && cur.label) || 'データ');
    if (name === null) return;
    name = String(name).replace(/^\s+|\s+$/g, '');
    if (!name) return;
    for (var i=0;i<st.classes.length;i++){
      if (String(st.classes[i].label||'') === name){
        if (!confirm('「'+name+'」はすでにあります。名前を入れ替えますか。\n（座席表で作った席や記録はそのまま残ります）')) return;
        st.classes[i].names = isText ? lines.join('\n') : namesNow(st.classes[i].names);
        if (isText) st.classes[i].kind = 'slide';
        if (!writeStore(st)) return;
        fillClassSelect();
        showCls('「'+name+'」を入れ替えました');
        return;
      }
    }
    var nR = st.classes.filter(function(c){ return c.kind !== 'slide'; }).length;
    var nS = st.classes.length - nR;
    if (isText && nS >= MAXS){
      alert('文字のデータは' + MAXS + '件までです。いらないものを消してから保存してください。');
      return;
    }
    if (!isText && nR >= MAXC){
      alert('データは' + MAXC + '件までです。いらないものを消してから保存してください。');
      return;
    }
    var item = {
      id: 'c' + (new Date().getTime()),
      label: name, names: isText ? lines.join('\n') : namesNow(''),
      seat: null, seki: null, recs: []
    };
    if (isText) item.kind = 'slide';    // ⚠座席表のクラス一覧には出さない印
    st.classes.push(item);
    if (!writeStore(st)) return;
    fillClassSelect();
    showCls('「'+name+'」として保存しました');
  }
  /* 🔴 上書き（2026-09-06 本人「名簿に関しては上書きできるはずだよね？」）。
     ⭐名前だけになってしまう問題は namesNow() で解決ずみ＝番号・男女は残る。
     ⚠文字のまとまりと名簿は入れ替えられない（座席表の名簿が、めあての文で埋まってしまう） */
  function doClsSave(){
    var isText = (kind() === 'text');
    var sel = isText ? $('clsSelT') : $('clsSel');
    if (!sel || sel.value === ''){ alert('先に①で、上書きするデータをえらんでください。'); return; }
    var st = readStore(), i = parseInt(sel.value,10), c = st.classes[i];
    if (!c){ alert('先に①で、上書きするデータをえらんでください。'); return; }
    var lines = isText
      ? sheets.map(function(sh){ return (sh.text||'').trim(); })
              .filter(function(t){ return t !== ''; })
      : [];
    if (isText && !lines.length){ alert('先に文字を入れてください。'); return; }
    if (!isText && !rows.length){ alert('先に①で名前を入れてください。'); return; }
    if (isText && c.kind !== 'slide'){
      alert('「' + (c.label||'') + '」は名前のデータです。文字は上書きできません。'); return;
    }
    if (!isText && c.kind === 'slide'){
      alert('「' + (c.label||'') + '」は文字のデータです。名前は上書きできません。'); return;
    }
    if (!confirm('「' + (c.label||'') + '」を、いまの中身に入れ替えます。よろしいですか。')) return;
    c.names = isText ? lines.join('\n') : namesNow(c.names);
    if (!writeStore(st)) return;
    fillClassSelect();
    showCls('「' + (c.label||'') + '」を上書きしました');
  }
  var clsTimer = null;
  function showCls(t){
    var el = $('clsSaved'); if (!el) return;
    el.textContent = t;
    clearTimeout(clsTimer);
    if (t) clsTimer = setTimeout(function(){ el.textContent = ''; }, 2600);
  }

  /* ================= 貼り付けを読む ================= */
  var HEAD = {
    name : ['名前','氏名','なまえ','名','児童名','生徒名','発表者','子どもの名前'],
    title: ['作品名','タイトル','題名','作文','題','作品','テーマ','題目','発表題'],
    group: ['班','グループ','チーム','はん','班名','グループ名','班番号']
  };
  function which(cell){
    var c = String(cell||'').trim();
    for (var k in HEAD){ for (var i=0;i<HEAD[k].length;i++){ if (c===HEAD[k][i]) return k; } }
    return null;
  }
  function looksLikeHeader(cells){
    for (var i=0;i<cells.length;i++){ if (which(cells[i])) return true; }
    return false;
  }
  function parse(text){
    var lines = String(text).replace(/\r/g,'').split('\n'), table = [];
    for (var i=0;i<lines.length;i++){
      if (lines[i].trim()==='') continue;
      var cells = lines[i].indexOf('\t')>=0 ? lines[i].split('\t') : lines[i].split(',');
      for (var j=0;j<cells.length;j++) cells[j] = cells[j].trim();
      table.push(cells);
    }
    if (!table.length) return [];
    var map = {name:0,title:1,group:-1}, start = 0;
    if (looksLikeHeader(table[0])){
      map = {name:-1,title:-1,group:-1};
      for (var c=0;c<table[0].length;c++){
        var k = which(table[0][c]);
        if (k && map[k]===-1) map[k] = c;
      }
      if (map.name===-1) map.name = 0;
      start = 1;
    }
    var out = [];
    for (var r=start;r<table.length;r++){
      var row = table[r];
      var nm = (map.name>=0?row[map.name]:'')||'';
      if (nm==='') continue;
      out.push({
        name : nm,
        title: (map.title>=0?row[map.title]:'')||'',
        group: (map.group>=0?row[map.group]:'')||'',
        off  : false
      });
    }
    return out;
  }
  /* 🔴 班を打ちかえたあと、班の並びを作り直す（2026-09-05）。
     ⭐いま並んでいる順はそのまま残し、無くなった班を落として、新しい班を後ろに足す。
     ⚠「映さない」にした班の指定も、残っている班のぶんだけ引き継ぐ。 */
  /* 🔴 班はえらぶ形にした（2026-09-05 本人「班、選択にしたほうがいいよ」）。
     ⭐出すのは「なし」＋いま使っている班＋1班〜8班＋「新しい班…」。
     ⚠名簿から来た「赤チーム」のような名前も、そのまま候補に残る。 */
  var GDEF = ['1班','2班','3班','4班','5班','6班','7班','8班'];
  function groupChoices(){
    var out = [];
    groupOrder.forEach(function(g){ if (g && out.indexOf(g)<0) out.push(g); });
    rows.forEach(function(r){ if (r.group && out.indexOf(r.group)<0) out.push(r.group); });
    GDEF.forEach(function(g){ if (out.indexOf(g)<0) out.push(g); });
    return out;
  }
  function grpSel(i, val){
    var o = '<select class="mini-sel gsel" data-g="'+i+'">';
    o += '<option value=""'+(val?'':' selected')+'>なし</option>';
    groupChoices().forEach(function(g){
      o += '<option value="'+esc(g)+'"'+(val===g?' selected':'')+'>'+esc(g)+'</option>';
    });
    return o + '<option value="__new">＋ 新しい班…</option></select>';
  }

  function rebuildGroups(){
    var now = [];
    rows.forEach(function(r){ if (r.group && now.indexOf(r.group)<0) now.push(r.group); });
    var kept = groupOrder.filter(function(g){ return now.indexOf(g) >= 0; });
    now.forEach(function(g){ if (kept.indexOf(g)<0) kept.push(g); });
    groupOrder = kept;
    var off = {};
    kept.forEach(function(g){ if (groupOff[g]) off[g] = true; });
    groupOff = off;
  }

  function setRows(list){
    rows = list;
    groupOff = {}; groupOrder = [];
    rows.forEach(function(r){
      if (r.group && groupOrder.indexOf(r.group)<0) groupOrder.push(r.group);
    });
    origRows = rows.map(function(r){ return {name:r.name,title:r.title,group:r.group,off:false}; });
    origGroups = groupOrder.slice();
  }
  function hasGroup(){ return rows.some(function(r){ return r.group !== ''; }); }
  function mode(){
    var el = document.querySelector('input[name=mode]:checked');
    return (el && hasGroup()) ? el.value : 'one';
  }

  /* ================= 映す単位を組む ================= */
  function build(){
    slides = [];
    if (kind()==='text'){
      sheets.forEach(function(sh){
        if (sh.off) return;
        slides.push({
          group:'', title:(sh.text||'').trim(), names:[], pic:(sh.url||''), pic2:(sh.url2||''),
          pos:(sh.pos||''), size:(sh.size||''), font:(sh.font||''), al:(sh.al||'')
        });
      });
      return;
    }
    if (mode()==='one'){
      rows.forEach(function(r){
        if (r.off) return;
        slides.push({ group:'', title:r.title, names:[r.name] });
      });
      return;
    }
    groupOrder.forEach(function(g){
      if (groupOff[g]) return;
      var mem = rows.filter(function(r){ return r.group===g && !r.off; });
      if (!mem.length) return;
      var t = '';
      for (var i=0;i<mem.length;i++){ if (mem[i].title){ t = mem[i].title; break; } }
      slides.push({ group:g, title:t, names:mem.map(function(m){ return m.name; }) });
    });
  }

  /* ================= 「文字を出す」の一覧 ================= */
  function drawSheets(){
    var box = $('sheets');
    if (!sheets.length){
      // 🔴 空でも「＋」を出しておく。押せる場所が見えていないと、入れ方が分からない
      box.innerHTML =
        '<table><tr><th class="chk">映す</th>'+HEAD_IDX+'<th class="pic">写真</th>'
      + '<th>出す文字（/ で改行・// で見出し）</th><th class="mv">順番</th><th class="del">消す</th></tr>'
      + '<tr class="ghost"><td class="chk"></td><td class="idx">1</td>'
      + '<td class="pic"><button class="picadd" data-picnew="1" title="ここに写真を入れる">＋</button></td>'
      + '<td class="members">「＋」で写真、①準備で文字が入ります</td>'
      + '<td class="mv"></td><td class="del"></td></tr></table>';
      updateCount(); save(); return;
    }
    function sel(name, idx, val, opts){
      var o = '<select class="mini-sel" data-'+name+'="'+idx+'">';
      opts.forEach(function(p){
        o += '<option value="'+p[0]+'"'+(val===p[0]?' selected':'')+'>'+p[1]+'</option>';
      });
      return o + '</select>';
    }
    // 🔴「そのまま」ではなく、はじめの値をそのまま見せる（2026-09-05 本人
    //    「文字の大きさ、位置ともに、デフォルトを表示しておいて、下の文字の位置は削除でいい」）
    /* 🔴 位置は4つ（2026-09-07 本人「写真の文字、枠外のほかに、中央と同じ文字で上下も欲しい」）。
         中央・上・下＝写真の上に暗い帯で重ねる（中央と同じ見た目）／外＝フッターに小さく（前の「下」）。
       ⚠2026-09-05 に「上」をやめたが、本人の要望で戻した。前の「下」は load() で「外」に読み替える */
    var POS  = [['mid','中央'],['top','上'],['bottom','下'],['out','外']];
    var SIZE = [['','自動'],['xs','最小'],['s','小'],['m','中'],['l','大']];
    var FONT = [['gothic','ゴシック'],['maru','丸文字'],['mincho','明朝']];
    // 🔴 改行した行のそろえ方（2026-09-06 本人「下の3行を右揃えにしたいという要望あり」）。
    //    ⭐見出し（// の前）は中央のまま。そろうのは「/ で改行した行どうし」
    var ALIGN = [['','中央'],['left','左'],['right','右']];

    var h = '<table><tr><th class="chk">映す</th>'+HEAD_IDX
          + '<th class="pic">写真</th>'
          + '<th>文字（/ で改行・// で見出し）</th>'
          + '<th class="sel">書体</th><th class="sel">位置</th><th class="sel">大きさ</th>'
          + '<th class="sel">そろえ</th>'
          + '<th class="mv">順番</th><th class="del">消す</th></tr>';
    sheets.forEach(function(sh,i){
      h += '<tr draggable="true" data-row="'+i+'" class="'+(sh.off?'off':'')+'">'
        +  '<td class="chk"><input type="checkbox" data-soff="'+i+'"'+(sh.off?'':' checked')+'></td>'
        +  '<td class="idx">'+(i+1)+'</td>'
        +  '<td class="pic"><div class="piccell">'
        +    (sh.url
              ? '<span class="picwrap"><img class="thumb" src="'+esc(sh.url)+'" alt="" draggable="true" data-pic="'+i+'" title="ドラッグでほかの行に移せます">'
                + '<button class="picx" data-picdel="'+i+'" title="写真だけ外す">×</button></span>'
              : '<button class="picadd" data-picadd="'+i+'" title="ここに写真を入れる">＋</button>')
        /* 🔴 2枚目＝横に並べて比べる（2026-09-07 本人・知り合いの先生の要望「写真を比べることがある」）。
             ⚠1枚目が入っている行にだけ出す（写真の無い行は今までどおり） */
        +    (sh.url
              ? (sh.url2
                  ? '<span class="picwrap"><img class="thumb second" src="'+esc(sh.url2)+'" alt="" data-pic2="'+i+'" title="2枚目（横に並べて比べる）">'
                    + '<button class="picx" data-picdel2="'+i+'" title="2枚目だけ外す">×</button></span>'
                  : '<button class="picadd second" data-picadd2="'+i+'" title="2枚目を入れて、横に並べて比べる">＋比べる</button>')
              : '')
        +  '</div></td>'
        +  '<td><textarea class="ttl" rows="1" data-s="'+i+'" placeholder="出す文字（写真だけでもよい）">'+esc(sh.text||'')+'</textarea></td>'
        +  '<td class="sel">'+sel('sfont', i, sh.font||'gothic', FONT)+'</td>'
        +  '<td class="sel">'+(sh.url2
              ? '<select class="mini-sel" data-spos="'+i+'" disabled title="写真が2枚のときは「外」だけです"><option value="out" selected>外</option></select>'
              : sel('spos', i, sh.pos||'mid', POS))+'</td>'
        +  '<td class="sel">'+sel('ssize', i, sh.size||'', SIZE)+'</td>'
        +  '<td class="sel">'+sel('sal', i, sh.al||'', ALIGN)+'</td>'
        +  '<td class="mv">'
        +    '<button class="mvbtn" data-smv="'+i+'" data-d="-1"'+(i===0?' disabled':'')+'>▲</button> '
        +    '<button class="mvbtn" data-smv="'+i+'" data-d="1"'+(i===sheets.length-1?' disabled':'')+'>▼</button>'
        +  '</td>'
        +  '<td class="del"><button class="mvbtn" data-sdel="'+i+'">×</button></td></tr>';
    });
    h += '</table>';
    box.innerHTML = h;
    updateCount(); save();
  }

  /* 🔴 ①の枠の中身は消さない（2026-09-06 本人「①の画面には表示されない。
     表示されないとうまく稼動してないと思ってしまう」）＝入れたものが目で見える。
     ⭐そのかわり、**すでに②にある行は足さない**（枠が残るので、続けて押すと増えてしまう） */
  function addLines(text){
    var have = {};
    sheets.forEach(function(sh){ have[(sh.text||'').trim()] = true; });
    var n = 0;
    String(text).replace(/\r/g,'').split('\n').forEach(function(line){
      var t = line.trim();
      if (t === '' || have[t]) return;
      have[t] = true;
      sheets.push({ text:t, url:'', name:'', pos:'', size:'', font:'', al:'', off:false });
      n++;
    });
    drawSheets();
    return n;   // ⭐何枚入ったかを②に出す
  }
  // ⚠①の枠に足す（打ったものは消さずに、下につなげる）
  function putLines(text){
    var box = $('lines'); if (!box) return;
    var cur = String(box.value).replace(/\r/g,'').replace(/^\s+|\s+$/g,'');
    box.value = cur ? cur + '\n' + text : text;
  }

  /* ================= 名簿の一覧 ================= */
  function drawList(){
    var box = $('list');
    if (!rows.length){
      box.innerHTML = '<p class="empty">まだ何もありません。①で名前を入れると、ここに並びます。</p>';
      $('modes').hidden = true; $('tools').hidden = true;
      updateCount(); save(); return;
    }
    $('modes').hidden = !hasGroup();
    $('tools').hidden = false;

    var h;
    if (mode()==='group'){
      h = '<table><tr><th class="chk">映す</th>'+HEAD_IDX+'<th>班</th>'
        + '<th>作品名（/ で改行）</th><th>メンバー</th><th class="mv">順番</th></tr>';
      groupOrder.forEach(function(g,i){
        var mem = rows.filter(function(r){ return r.group===g; });
        var t = '';
        for (var k=0;k<mem.length;k++){ if (mem[k].title){ t = mem[k].title; break; } }
        var off = !!groupOff[g];
        h += '<tr class="'+(off?'off':'')+'">'
          + '<td class="chk"><input type="checkbox" data-g="'+esc(g)+'"'+(off?'':' checked')+'></td>'
          + '<td class="idx">'+(i+1)+'</td>'
          + '<td><b>'+esc(g)+'</b></td>'
          + '<td><textarea class="ttl" rows="1" data-gt="'+esc(g)+'" placeholder="作品名">'+esc(t)+'</textarea></td>'
          + '<td class="members">'+mem.map(function(m){ return esc(m.name); }).join('・')+'</td>'
          + '<td class="mv">'
          +   '<button class="mvbtn" data-gmv="'+i+'" data-d="-1"'+(i===0?' disabled':'')+'>▲</button> '
          +   '<button class="mvbtn" data-gmv="'+i+'" data-d="1"'+(i===groupOrder.length-1?' disabled':'')+'>▼</button>'
          + '</td></tr>';
      });
      h += '</table>';
    } else {
      // 🔴 班は打ちかえられる（2026-09-05 本人「班自体を変更できるならそれがベスト」）。
      //    ⚠前は表示だけで、班が1つも無いと列も出なかった＝名簿に班が無いと班分けができなかった
      h = '<table><tr><th class="chk">映す</th>'+HEAD_IDX+'<th>名前</th><th>作品名（/ で改行）</th>';
      h += '<th class="grp">班</th><th class="mv">順番</th></tr>';
      rows.forEach(function(r,i){
        h += '<tr class="'+(r.off?'off':'')+'">'
          + '<td class="chk"><input type="checkbox" data-i="'+i+'"'+(r.off?'':' checked')+'></td>'
          + '<td class="idx">'+(i+1)+'</td>'
          + '<td><b>'+esc(r.name)+'</b></td>'
          + '<td><textarea class="ttl" rows="1" data-t="'+i+'" placeholder="作品名">'+esc(r.title)+'</textarea></td>';
        h += '<td class="grp">'+grpSel(i, r.group)+'</td>';
        h += '<td class="mv">'
          +   '<button class="mvbtn" data-mv="'+i+'" data-d="-1"'+(i===0?' disabled':'')+'>▲</button> '
          +   '<button class="mvbtn" data-mv="'+i+'" data-d="1"'+(i===rows.length-1?' disabled':'')+'>▼</button>'
          + '</td></tr>';
      });
      h += '</table>';
    }
    box.innerHTML = h;
    updateCount();
    save();
  }

  function updateCount(){
    build();
    var msg;
    if (kind()==='text'){
      if (!slides.length){
        msg = 'まだ何もありません。①で文字を入れると、②に1枚ずつ並びます。';
      } else {
        var np = sheets.filter(function(s){ return !s.off && s.url; }).length;
        var noff = sheets.filter(function(s){ return s.off; }).length;
        msg = slides.length + '枚 表示' + (np ? '（うち写真 '+np+'枚）' : '')
            + (noff ? '　' + noff + '枚は映しません' : '');
      }
    } else if (!rows.length){
      msg = '';
    } else if (mode()==='group'){
      msg = rows.length+'人／'+groupOrder.length+'班　→ 班ごとに '+slides.length+'回 表示';
      var offG = groupOrder.filter(function(g){ return groupOff[g]; }).length;
      if (offG) msg += '（'+offG+'班は映しません）';
    } else {
      msg = rows.length+'人　→ 1人ずつ '+slides.length+'回 表示';
      var offN = rows.filter(function(r){ return r.off; }).length;
      if (offN) msg += '（'+offN+'人は映しません）';
    }
    $('count').textContent = msg;
    $('start').disabled = (slides.length===0);
    fillCheck();
  }

  /* 🔴 作りながら1枚だけ確かめる（2026-09-05 本人「大きく出すの時にスライド番号を選ぶと
     サンプル確認ができるってのが欲しい」「いちいち閉じられるのが面倒」）。
     ⚠こちらは全画面にせず、設定もたたまない。本番の「大きく出す」だけがたたむ。 */
  function fillCheck(){
    var row = $('checkCard'), sel = $('checkNo');
    if (!slides.length){ row.hidden = true; return; }
    var keep = sel.value;
    sel.innerHTML = '';
    slides.forEach(function(sl,i){
      var o = document.createElement('option');
      o.value = String(i);
      var t = (sl.title||'').replace(/\/+/g,' ').trim();
      if (!t) t = sl.pic ? '写真' : '（からっぽ）';
      if (t.length > 14) t = t.slice(0,14) + '…';
      o.textContent = (i+1) + '枚目　' + t;
      sel.appendChild(o);
    });
    if (keep && parseInt(keep,10) < slides.length) sel.value = keep;
    row.hidden = false;
  }

  /* ================= 並べ替え ================= */
  function shuffleArr(a){
    for (var i=a.length-1;i>0;i--){
      var j = Math.floor(Math.random()*(i+1)), t = a[i]; a[i]=a[j]; a[j]=t;
    }
    return a;
  }
  function doShuffle(){ if (mode()==='group') shuffleArr(groupOrder); else shuffleArr(rows); drawList(); }
  function doReset(){
    rows = origRows.map(function(r){ return {name:r.name,title:r.title,group:r.group,off:false}; });
    groupOrder = origGroups.slice(); groupOff = {}; drawList();
  }
  function allOn(){ rows.forEach(function(r){ r.off=false; }); groupOff = {}; drawList(); }

  /* ================= 映す ================= */
  /* 🔴 写真があるときは、文字を「写真の中」に収める。
     ⚠写真は切らずに全部見せる（contain）ので、画面と写真の形が違うと上下または左右に余白ができる。
       文字の位置を画面基準にすると、下にしたとき写真の外へはみ出して見た目が崩れる。 */
  function fitBox(){
    var pic = $('pic'), stage = $('stage'), box = $('box');
    /* 🔴 写真＋上下＝写真を一回り内側に入れて、空いた白いところに文字を置く（2026-09-05 本人）。
       ⭐文字の量で帯の高さが変わるので、ここで測って写真の高さを決める。
       ⚠絶対配置の img は上下左右を指定しても伸びない。高さを数字で入れる。 */
    if (stage.classList.contains('band')){
      // ⭐写真は映す面いっぱい。文字はフッター（#cap）に出しているので、ここでは何もしない
      box.style.padding = '';
      pic.style.height = ''; pic.style.top = '';
      return;
    }
    pic.style.height = ''; pic.style.top = '';
    // ⭐2枚並べているときは、写真が面いっぱいなので余白の計算は要らない
    if (stage.classList.contains('two')){ box.style.padding = ''; return; }
    if (pic.hidden || !pic.naturalWidth || !pic.naturalHeight){ box.style.padding = ''; return; }
    var sw = stage.clientWidth, sh = stage.clientHeight;
    var r  = Math.min(sw / pic.naturalWidth, sh / pic.naturalHeight);
    var padX = (sw - pic.naturalWidth  * r) / 2;
    var padY = (sh - pic.naturalHeight * r) / 2;
    // 🔴 上・下にしたとき、写真の中身に重ならないよう端に寄せる（2026-09-05 本人
    //    「もっと下（上も同様）写真に重なるから邪魔にならないように」）
    box.style.padding = (padY + sh * 0.018) + 'px ' + (padX + sw * 0.03) + 'px';
  }

  /* 🔴 書体は1枚ずつ（2026-09-05 本人「フォントも、できれば行で指示したい」）。
     全体の「見た目」の枠は無くした＝一覧と「大きく出す」が離れて見づらかったため */
  function applyFont(f){
    var show = $('show');
    show.classList.remove('f-gothic','f-mincho','f-maru');
    show.classList.add('f-' + (f || 'gothic'));
  }

  function render(){
    var s = slides[pos];
    if (!s) return;
    applyFont(s.font);
    // 🔴 写真があって位置が「外」＝文字はフッター。⭐そのときは基本1行（2026-09-05 本人「だから、基本は１行」）
    //    ⚠上・下は「写真の上に帯で重ねる」に変わった（2026-09-07 本人）。外だけがフッター
    var band = !!s.pic && (s.pos === 'out' || !!s.pic2);   // ⭐2枚のときは必ず外

    // 写真（あれば）。⭐2枚あれば横に並べる（2026-09-07）
    var pic = $('pic'), pic2 = $('pic2'), two = !!(s.pic && s.pic2);
    $('pics').classList.remove('bigL'); $('pics').classList.remove('bigR');   // 拡大は1枚ごとに戻す
    $('stage').classList.toggle('two', two);
    if (s.pic){
      pic.hidden = false; $('stage').classList.add('hasPic');
      if (pic.getAttribute('src') !== s.pic) pic.src = s.pic;
      if (pic.complete) fitBox(); else pic.onload = fitBox;
    } else {
      pic.removeAttribute('src'); pic.hidden = true;
      $('stage').classList.remove('hasPic');
      $('box').style.padding = '';
    }
    if (two){
      pic2.hidden = false;
      if (pic2.getAttribute('src') !== s.pic2) pic2.src = s.pic2;
    } else {
      pic2.removeAttribute('src'); pic2.hidden = true;
    }

    $('group').textContent = s.group || '';

    /* 🔴 写真のときは、文字をフッター（#cap）に1行で出す（2026-09-05 本人）。
       ⚠映す面には文字を置かない＝写真がいちばん大きく出る。「中央」のときだけ今までどおり重ねる */
    var cap = $('cap');
    if (band){
      var ct = (s.title || '').replace(/\/\//g, '　').replace(/\//g, '　').trim();
      cap.textContent = ct;
    } else {
      cap.textContent = '';
    }

    var t = s.title || '';
    var box = $('title');
    box.innerHTML = '';
    // 🔴 "//" があれば、前を小さい見出しにする（本人「今日のめあて だったら最初から2行にする選択肢もあるかも」）
    //    "/"  はふつうの改行。切る場所を先生が自分で決められる（2026-09-05 本人）
    var head = '', body = t, ix = t.indexOf('//');
    if (ix >= 0){ head = t.slice(0, ix).trim(); body = t.slice(ix + 2).trim(); }
    if (head){
      var hd = document.createElement('span');
      hd.className = 'sm'; hd.textContent = head;
      box.appendChild(hd);
    }
    var parts = body.split('/'), longest = 0;
    /* 🔴 改行した行は「ひとかたまり」にして、そこだけ左右にそろえる（2026-09-06 本人
       「下の3行を右揃えにしたい」）。⚠見出し（// の前）は中央のまま。
       ⭐かたまりの幅＝いちばん長い行の幅。まん中に置いたまま、行どうしの頭やお尻がそろう */
    var bd = document.createElement('span');
    bd.className = 'bd';
    parts.forEach(function(p,i){
      // ⚠額縁のときは改行せず、全角スペースでつなぐ（1行に収める）
      if (i>0) bd.appendChild(band ? document.createTextNode('　') : document.createElement('br'));
      bd.appendChild(document.createTextNode(p.trim()));
      longest = Math.max(longest, p.trim().length);
    });
    box.appendChild(bd);
    // ⚠額縁（写真＋上下）のときは文字をフッターに出すので、そろえは効かせない
    if (s.al && !band) box.setAttribute('data-al', s.al); else box.removeAttribute('data-al');
    /* 文字の大きさは「いちばん長い行」で決める（改行しても小さくなりすぎない）。
       🔴 さらに行数でも1段ずつ下げる（2026-09-06 本人「こんな使い方したい（改行たくさん）」）。
       ⚠長さだけで決めていたので、3行4行にすると下の行が画面からはみ出していた。
       ⭐1枚ごとに「大きさ」を選んであれば、そちらが勝つ（CSSの並び順で決まる） */
    var STEP = ['s','m','l','xl','xxl'];
    var step = longest<=8?0 : longest<=14?1 : longest<=24?2 : 3;
    var nline = band ? 1 : parts.length;      // ⚠額縁のときは1行につないでいる
    if (nline >= 2) step++;
    if (nline >= 4) step++;
    box.setAttribute('data-len', STEP[Math.min(step, 4)]);
    // 🔴 その1枚だけ大きさを決めてあれば、そちらを優先（2026-09-05 本人）
    if (s.size) box.setAttribute('data-size', s.size); else box.removeAttribute('data-size');
    // 🔴 その1枚だけ位置を決めてあれば、そちらを優先
    $('stage').setAttribute('data-pos', s.pos || 'mid');
    // 🔴 写真があって位置が上・下のときだけ「帯」ではなく「写真の外」に出す（2026-09-05 本人
    //    「作品に重なるのは気持ち悪くて」）
    $('stage').classList.toggle('band', band);
    $('stage').classList.toggle('noTitle', t==='');

    var nb = $('name');
    nb.innerHTML = '';
    nb.setAttribute('data-n', s.names.length>=6 ? 'many' : String(s.names.length));
    /* 🔴 人数で行を分ける（2026-09-05 本人「4人班の時に、名前は2人で改行とかできる？ 5人なら3人と2人」）。
       ⚠成り行きで折り返すと 3人＋1人 のように偏る。⭐同じくらいの人数になるところで切る。 */
    var nn = s.names.length;
    var per = nn <= 3 ? nn : (nn <= 8 ? Math.ceil(nn/2) : Math.ceil(nn/3));
    s.names.forEach(function(n,i){
      if (i > 0 && i % per === 0){
        var br = document.createElement('i'); br.className = 'nbr'; nb.appendChild(br);
      }
      var el = document.createElement('span'); el.textContent = n; nb.appendChild(el);
    });

    // ⚠必ず最後にもう一度そろえる。写真の処理は前半にあり、そのとき band の印はまだ前の1枚のもの
    fitBox();

    $('pos').textContent = (pos+1)+' / '+slides.length;
    $('prev').disabled = (pos===0);
    $('next').disabled = (pos===slides.length-1);
  }
  /* checkAt … 0以上なら「見る」（全画面にせず・設定もたたまない）
     startAt … 何枚目から出すか（「この1枚から出す」用。ふつうは0） */
  function openShow(checkAt, startAt){
    build();
    if (!slides.length) return;
    var check = (typeof checkAt === 'number' && checkAt >= 0);
    pos = check ? Math.min(checkAt, slides.length-1)
                : Math.min(Math.max(startAt|0, 0), slides.length-1);
    // 🔴「作成中」にチェックが入っているあいだは、たたまない（2026-09-05 本人
    //    「作成モードを作ったら？ チェックを入れると開きっぱなし」）
    if (!check && !$('editMode').checked){
      $('d1').open = false;
      $('d2').open = false;     // ⚠②も一緒にたたむ（見ている人に設定を見せない）
    }
    $('show').classList.toggle('check', check);
    $('show').classList.add('on');
    render();
    // ⚠確認のときは全画面にしない（開け閉めが面倒になるため）
    if (!check && document.documentElement.requestFullscreen){
      document.documentElement.requestFullscreen().catch(function(){});
    }
  }
  function closeShow(){
    $('show').classList.remove('on');
    $('show').classList.remove('check');
    document.body.classList.remove('hidebar');
    if (document.fullscreenElement && document.exitFullscreen){
      document.exitFullscreen().catch(function(){});
    }
  }
  function move(d){
    var n = pos+d; if (n<0 || n>=slides.length) return;
    pos = n; render();
  }
  /* 🔴 2枚並べたとき、片方を押すとそちらが大きくなる（約3/4）。もう一度押すと半々に戻る
     （2026-09-07 本人「ボタンを右とか左を押すと、どんどん大きくなって、また縮んでみたいなのが
      できればいいんじゃないか」）。⭐ボタンは足さず、写真そのものを押す（スマホで押しやすい） */
  function bigTo(side){
    var w = $('pics');
    if (!$('stage').classList.contains('two')) return;
    var cls = side === 'L' ? 'bigL' : 'bigR', other = side === 'L' ? 'bigR' : 'bigL';
    w.classList.remove(other);
    w.classList.toggle(cls);
  }
  $('pic').addEventListener('click',  function(){ bigTo('L'); });
  $('pic2').addEventListener('click', function(){ bigTo('R'); });

  /* ================= 保存（この端末のブラウザだけ） ================= */
  function save(){
    // 🔴 チェックが外れているときは、この機器に何も残さない（座席表と同じ考え方）
    if (!$('save').checked){
      try{ localStorage.removeItem(KEY); }catch(e){}
      return;
    }
    try{
      localStorage.setItem(KEY, JSON.stringify({
        v: 2,   // ⭐2026-09-07：位置の意味が変わった（下＝重ねる／外＝フッター）。無印は古い形
        kind: kind(), text: $('paste').value,
        // 写真そのものは IndexedDB に置く。ここには番号だけ残す
        sheets: sheets.map(function(s){
                  return { text:s.text||'', url:'', name:s.name||'', picId:s.picId||'',
                           picId2:s.picId2||'',
                           pos:s.pos||'', size:s.size||'', font:s.font||'', al:s.al||'', off:!!s.off };
                }).filter(function(s){ return s.text.trim() !== '' || s.picId; }),
        editMode: $('editMode').checked,
        rows: rows, groupOrder: groupOrder, groupOff: groupOff,
        origRows: origRows, origGroups: origGroups,
        mode: (document.querySelector('input[name=mode]:checked')||{}).value || 'one'
      }));
      showSaving('このパソコンに保存しました');
    }catch(e){}
  }

  var savingTimer = null;
  function showSaving(t){
    var el = $('savingLabel');
    if (!el) return;
    el.textContent = t;
    clearTimeout(savingTimer);
    if (t) savingTimer = setTimeout(function(){ el.textContent = ''; }, 1800);
  }
  function load(){
    try{
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d) return;
      if (d.text)  $('paste').value = d.text;
      if (Array.isArray(d.sheets)){
        var oldForm = !d.v;   // ⚠前の形：上・下＝フッター（額縁）だった → いまの「外」に読み替える
        sheets = d.sheets.map(function(x){
          var pos = x.pos||'';
          if (oldForm && (pos==='top' || pos==='bottom')) pos = 'out';
          return { text:x.text||'', url:'', name:x.name||'', picId:x.picId||'', blob:null,
                   url2:'', name2:'', picId2:x.picId2||'', blob2:null,
                   pos:pos, size:x.size||'', font:x.font||'', al:x.al||'', off:!!x.off };
        });
      }
      if (Array.isArray(d.rows) && d.rows.length){
        rows = d.rows;
        groupOrder = d.groupOrder || []; groupOff = d.groupOff || {};
        origRows = d.origRows || rows.slice(); origGroups = d.origGroups || groupOrder.slice();
        var m = document.querySelector('input[name=mode][value="'+(d.mode||'one')+'"]');
        if (m) m.checked = true;
      }
      if (d.editMode) $('editMode').checked = true;
      var k = document.querySelector('input[name=kind][value="'+(d.kind||'text')+'"]');
      if (k) k.checked = true;
      switchKind();
      if (sheets.length || (Array.isArray(d.rows) && d.rows.length)){ $('d1').open = false; $('d2').open = false; }
      // 写真は非同期で戻す（読めたら一覧を描き直す）
      if (sheets.some(function(x){ return x.picId || x.picId2; })){
        picLoadAll(function(){ drawSheets(); });
      }
    }catch(e){}
  }

  /* ================= 出し方の切り替え ================= */
  /* 🔴 ①で選んだほうに、①の入力欄と②の中身をそろえる（2026-09-05 本人
     「①準備 ②を、①の分岐で表示変更したら？」）。②の見出しも一緒に変わる。 */
  function switchKind(){
    var t = (kind()==='text');
    $('paneText').hidden  = !t;
    $('paneList').hidden  = t;
    $('paneText2').hidden = !t;
    $('paneList2').hidden = t;
    $('d2title').textContent = t ? 'スライドにする順番' : '作品名と順番';
    if (t) drawSheets(); else drawList();
  }

  /* ================= つなぐ ================= */
  Array.prototype.forEach.call(document.querySelectorAll('input[name=kind]'), function(el){
    el.addEventListener('change', function(){ switchKind(); save(); });
  });

  /* 🔴 ①と②が別のシャッターになって、つながりが見えにくくなった（2026-09-05 本人）。
     ⭐入れたら②が勝手に開く（本人「勝手に展開がいいんじゃないか」＝説明文を足すより、動きで見せる）。
     ⚠すでに開いているときは何もしない。見えていないときだけ、そっと画面を送る。 */
  /* 🔴 入れたら②へ連れていく（2026-09-06 本人「サンプルを入れるを押すと、②にも反映するって
     わからず、私何回も押してる。で、重複データがたまりまくる」）。
     ⚠前は「②が閉じていたときだけ」動かしていた＝②は最初から開いているので、
       押しても画面が変わらず、入ったことに気づけなかった。
     ⭐いつでも②が見える位置まで動かし、①には「何枚入れたか」を出す。 */
  function openStep2(msg){
    if (msg) showAdd(msg);
    var d2 = $('d2'); if (!d2) return;
    d2.open = true;
    /* 🔴 ①はたたまない（2026-09-06 本人「とじるじゃなくて移動するのほうがいいかも？」）。
       ⭐入れたら②まで画面を動かす。①は開いたままなので、続けて足すこともできる。
       ⚠一度「たたむ」で作ってみたが、続けて入れたい人に手数が増えるのでやめた */
    var sm = d2.querySelector('summary'); if (!sm) return;
    var r = sm.getBoundingClientRect();
    if (r.top < 0 || r.bottom > (window.innerHeight || 0)){
      /* ⚠ゆっくり動かす指定（behavior:'smooth'）は、機器の設定によっては**何も起きない**。
         ⭐そのまま動かす＝確実に②が見える（2026-09-06 実機で smooth が効かないのを確認） */
      try{ sm.scrollIntoView({block:'center'}); }catch(e){ sm.scrollIntoView(); }
    }
  }
  /* 🔴 出す文は2か所で役割が違う（2026-09-06 本人「サンプルを入れた後に、出てくる文字は
     ②へ進みましょうとかのほうがいいかも。で、②の中にサンプルを入れましたとかのメッセージ」）。
     ⭐①＝つぎにどこを見るかの案内／②＝何が入ったかの結果。
     ⚠PCでは②がもともと見えていて画面が動かないことがある（本人）。文だけで分かるようにしておく */
  var addTimer = null;
  function showAdd(done){
    ['addMsg','addMsgL'].forEach(function(id){
      var el = $(id); if (el) el.textContent = done ? '②へ進みましょう' : '';
    });
    var el2 = $('addMsg2'); if (el2) el2.textContent = done || '';
    clearTimeout(addTimer);
    if (done) addTimer = setTimeout(function(){ showAdd(''); }, 4000);
  }

  $('addText').addEventListener('click', function(){
    var n = addLines($('lines').value);
    openStep2(n ? n + '枚を入れました' : 'もう入っています');
  });
  /* ⚠サンプルは何度も押されて増えていく（2026-09-06 本人）。⭐①の枠にも出して、②には足すだけ */
  $('sampleText').addEventListener('click', function(){
    var first = SAMPLE_TEXT.split(String.fromCharCode(10))[0];
    if (String($('lines').value).indexOf(first) < 0) putLines(SAMPLE_TEXT);
    var n = addLines(SAMPLE_TEXT);
    openStep2(n ? 'サンプルを' + n + '枚入れました' : 'サンプルはもう入っています');
  });
  // 🔴 ①の枠を空にするボタン（2026-09-06 本人「サンプルを入れるの横に消すボタンを作って」）
  if ($('clearLines')) $('clearLines').addEventListener('click', function(){
    $('lines').value = ''; showAdd('');
  });
  // 🔴 空の1枚を足す。文字を打つのも、写真の「＋」を押すのも、ここから（2026-09-05 本人）
  $('addRow').addEventListener('click', function(){
    sheets.push({ text:'', url:'', name:'', pos:'', size:'', font:'', off:false });
    drawSheets();
    var list = $('sheets').querySelectorAll('input.ttl');
    if (list.length) list[list.length-1].focus();
  });
  // Ctrl+Enter でも入れられる
  $('lines').addEventListener('keydown', function(e){
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); addLines($('lines').value); }
  });
  $('clearText').addEventListener('click', function(){
    // 写真のぶんはメモリを返してから消す
    sheets.forEach(function(s){ if (s.url) URL.revokeObjectURL(s.url); if (s.url2) URL.revokeObjectURL(s.url2); });
    picClear();
    sheets = []; $('lines').value = ''; drawSheets();
  });

  /* 写真を入れる。⚠どこにも送らない・保存もしない（メモリの中だけ）
     picTarget が -1 なら末尾に新しい1枚として足す。
     🔴 行の「＋」から呼んだときは、その行に入れる（文字を打ち直さなくていい） */
  var picTarget = -1, picSlot = 1;
  $('picfile').addEventListener('change', function(e){
    var files = e.target.files;
    if (!files || !files.length){ picTarget = -1; picSlot = 1; return; }
    for (var i=0;i<files.length;i++){
      var f = files[i];
      if (f.type.indexOf('image/') !== 0) continue;
      var url = URL.createObjectURL(f);
      if (picSlot === 2 && picTarget >= 0 && sheets[picTarget]){
        // ⭐2枚目（横に並べて比べる）。1つの行に入るのは2枚まで
        var s2 = sheets[picTarget];
        if (s2.url2) URL.revokeObjectURL(s2.url2);
        if (s2.picId2) picDel(s2.picId2);
        s2.url2 = url; s2.name2 = f.name;
        s2.blob2 = f; s2.picId2 = newPicId(); picPut(s2.picId2, f);
        // 🔴 2枚のときは文字を「外」に固定（2026-09-07 本人「2枚目選んだ時点でロックしたほうがいい」）。
        //    ⚠写真の上に帯を重ねると、押して大きくする操作が帯に取られて効かない
        s2.pos = 'out';
        picTarget = -1; picSlot = 1;
        break;
      }
      if (picTarget >= 0 && sheets[picTarget]){
        var sh = sheets[picTarget];
        if (sh.url) URL.revokeObjectURL(sh.url);
        if (sh.picId) picDel(sh.picId);
        sh.url = url; sh.name = f.name;
        sh.blob = f; sh.picId = newPicId(); picPut(sh.picId, f);
        // 🔴 写真を入れたら「下・小」にする（2026-09-05 本人
        //    「写真を入れたら、下と小になるようにしたほうがいい」）。
        //    ⚠すでに先生が選んでいる場合は上書きしない
        if (!sh.pos || sh.pos === 'mid') sh.pos = 'out';   // ⚠「外」＝フッター（前の「下」）
        if (!sh.size) sh.size = 's';
        picTarget = -1;                       // 2枚目からは末尾に足す
      } else {
        var nid = newPicId();
        sheets.push({ text:'', url:url, name:f.name, pos:'out', size:'s', font:'', al:'', off:false,
                      blob:f, picId:nid });
        picPut(nid, f);
      }
    }
    picTarget = -1; picSlot = 1;
    e.target.value = '';   // 同じ写真をもう一度選べるように
    drawSheets();
  });

  $('sheets').addEventListener('click', function(e){
    // ＋ ＝ この行に写真を入れる（空のときは、新しい1枚を作ってそこに入れる）
    var add = e.target.closest ? e.target.closest('.picadd') : null;
    if (add){
      picSlot = 1;
      if (add.hasAttribute('data-picnew')){
        sheets.push({ text:'', url:'', name:'', pos:'', size:'', font:'', al:'', off:false });
        picTarget = 0;
      } else if (add.hasAttribute('data-picadd2')){
        picTarget = parseInt(add.getAttribute('data-picadd2'),10);
        picSlot = 2;                          // ⭐2枚目（比べる用）
      } else {
        picTarget = parseInt(add.getAttribute('data-picadd'),10);
      }
      $('picfile').click();
      return;
    }
    // × ＝ 写真だけ外す（文字は残す）
    var px = e.target.closest ? e.target.closest('.picx') : null;
    if (px && px.hasAttribute('data-picdel2')){
      // 2枚目だけ外す
      var p2 = parseInt(px.getAttribute('data-picdel2'),10);
      if (sheets[p2]){
        if (sheets[p2].url2) URL.revokeObjectURL(sheets[p2].url2);
        if (sheets[p2].picId2) picDel(sheets[p2].picId2);
        sheets[p2].url2 = ''; sheets[p2].name2 = ''; sheets[p2].blob2 = null; sheets[p2].picId2 = '';
      }
      drawSheets();
      return;
    }
    if (px){
      var pi = parseInt(px.getAttribute('data-picdel'),10);
      if (sheets[pi] && sheets[pi].url) URL.revokeObjectURL(sheets[pi].url);
      if (sheets[pi]){
        if (sheets[pi].picId) picDel(sheets[pi].picId);
        sheets[pi].url = ''; sheets[pi].name = ''; sheets[pi].blob = null; sheets[pi].picId = '';
        // ⭐2枚目があれば1枚目に繰り上げる（2枚目だけ残るのは変）
        if (sheets[pi].url2){
          sheets[pi].url = sheets[pi].url2; sheets[pi].name = sheets[pi].name2;
          sheets[pi].blob = sheets[pi].blob2; sheets[pi].picId = sheets[pi].picId2;
          sheets[pi].url2 = ''; sheets[pi].name2 = ''; sheets[pi].blob2 = null; sheets[pi].picId2 = '';
        }
      }
      drawSheets();
      return;
    }
    var b = e.target.closest ? e.target.closest('.mvbtn') : null;
    if (!b || b.disabled) return;
    if (b.hasAttribute('data-smv')){
      var i = parseInt(b.getAttribute('data-smv'),10);
      var j = i + parseInt(b.getAttribute('data-d'),10);
      if (j<0 || j>=sheets.length) return;
      var t = sheets[i]; sheets[i]=sheets[j]; sheets[j]=t;
    } else if (b.hasAttribute('data-sdel')){
      var k = parseInt(b.getAttribute('data-sdel'),10);
      if (sheets[k] && sheets[k].url)  URL.revokeObjectURL(sheets[k].url);
      if (sheets[k] && sheets[k].url2) URL.revokeObjectURL(sheets[k].url2);
      if (sheets[k] && sheets[k].picId)  picDel(sheets[k].picId);
      if (sheets[k] && sheets[k].picId2) picDel(sheets[k].picId2);
      sheets.splice(k,1);
    }
    drawSheets();
  });
  /* 行をつかんで上下に動かす（パソコンのみ）。
     ⚠スマホ・タブレットにはドラッグが無いので、▲▼が本線。両方あってよい。 */
  var dragFrom = -1, picFrom = -1;
  $('sheets').addEventListener('dragstart', function(e){
    // 🔴 写真そのものをつかんだときは「写真だけを別の行へ移す」
    if (e.target.classList && e.target.classList.contains('thumb')){
      picFrom = parseInt(e.target.getAttribute('data-pic'),10);
      dragFrom = -1;
      try{ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain',''); }catch(err){}
      return;
    }
    var tr = e.target.closest ? e.target.closest('tr[data-row]') : null;
    if (!tr) return;
    picFrom = -1;
    dragFrom = parseInt(tr.getAttribute('data-row'),10);
    tr.classList.add('dragging');
    try{ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain',''); }catch(err){}
  });
  $('sheets').addEventListener('dragover', function(e){
    var tr = e.target.closest ? e.target.closest('tr[data-row]') : null;
    if (!tr || (dragFrom < 0 && picFrom < 0)) return;
    e.preventDefault();
    Array.prototype.forEach.call($('sheets').querySelectorAll('tr.over'), function(x){ x.classList.remove('over'); });
    tr.classList.add('over');
  });
  $('sheets').addEventListener('drop', function(e){
    var tr = e.target.closest ? e.target.closest('tr[data-row]') : null;
    if (!tr) return;
    e.preventDefault();
    var to = parseInt(tr.getAttribute('data-row'),10);
    if (picFrom >= 0){
      // 🔴 写真だけを移す。移した先に写真があれば入れ替え（文字はどちらも動かさない）
      if (to !== picFrom && sheets[to] && sheets[picFrom]){
        var a = sheets[picFrom], b = sheets[to];
        var u=a.url, n=a.name, bl=a.blob, id=a.picId;
        a.url=b.url; a.name=b.name; a.blob=b.blob; a.picId=b.picId;
        b.url=u; b.name=n; b.blob=bl; b.picId=id;
      }
    } else if (dragFrom >= 0 && to !== dragFrom){
      var item = sheets.splice(dragFrom,1)[0];
      sheets.splice(to,0,item);
    }
    dragFrom = -1; picFrom = -1;
    drawSheets();
  });
  $('sheets').addEventListener('dragend', function(){
    dragFrom = -1; picFrom = -1;
    Array.prototype.forEach.call($('sheets').querySelectorAll('tr.over,tr.dragging'), function(x){
      x.classList.remove('over'); x.classList.remove('dragging');
    });
  });

  $('sheets').addEventListener('change', function(e){
    var el = e.target;
    if (el.type === 'checkbox' && el.hasAttribute('data-soff')){
      sheets[parseInt(el.getAttribute('data-soff'),10)].off = !el.checked;
      drawSheets(); return;
    }
    if (el.tagName === 'SELECT'){
      if (el.hasAttribute('data-sfont')) sheets[parseInt(el.getAttribute('data-sfont'),10)].font = el.value;
      if (el.hasAttribute('data-spos'))  sheets[parseInt(el.getAttribute('data-spos'),10)].pos  = el.value;
      if (el.hasAttribute('data-ssize')) sheets[parseInt(el.getAttribute('data-ssize'),10)].size = el.value;
      if (el.hasAttribute('data-sal'))   sheets[parseInt(el.getAttribute('data-sal'),10)].al   = el.value;
      updateCount(); save();
    }
  });

  /* 🔴 押したら中身ぜんぶが見える高さに広げる（2026-09-06 本人「タップしたら枠を大きくできないのかな？」）。
     ⚠1行＝1枚なので、改行は入れさせない（Enterは決定＝枠から出る） */
  function fitTtl(el, open){
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    el.style.height = (open ? el.scrollHeight : 0) + 'px';
    if (!open) el.style.height = '';
  }
  function bindTtl(box){
    box.addEventListener('focusin', function(e){
      if (e.target.classList && e.target.classList.contains('ttl')) fitTtl(e.target, true);
    });
    box.addEventListener('focusout', function(e){
      if (e.target.classList && e.target.classList.contains('ttl')) fitTtl(e.target, false);
    });
    box.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('ttl')){
        e.preventDefault(); e.target.blur();
      }
    });
  }
  bindTtl($('sheets'));
  bindTtl($('list'));

  // ⚠文字の入力では描き直さない（描き直すとカーソルが飛ぶ）
  $('sheets').addEventListener('input', function(e){
    var el = e.target;
    if (!el.classList || !el.classList.contains('ttl')) return;
    if (!el.hasAttribute('data-s')) return;
    // ⚠貼り付けで改行が入ることがある。1行にそろえる
    var v = String(el.value).replace(/[\r\n]+/g, ' ');
    if (v !== el.value) el.value = v;
    sheets[parseInt(el.getAttribute('data-s'),10)].text = v;
    fitTtl(el, true);
    updateCount(); save();
  });

  $('editMode').addEventListener('change', save);
  $('save').addEventListener('change', function(){
    if ($('save').checked){
      picPutAll();            // それまでに入れた写真も一緒に残す
      save();
    } else {
      // 🔴 外したら、この機器に残していたものを消す
      try{ localStorage.removeItem(KEY); }catch(e){}
      picClear();
      showSaving('このパソコンの保存を消しました');
    }
  });

  $('clsNew').addEventListener('click', doClsNew);
  if ($('clsSave')) $('clsSave').addEventListener('click', doClsSave);
  $('clsSel').addEventListener('change', function(){
    syncCls('clsSel','clsSelT')();
    refreshDelT();
  });
  if ($('clsSelT')) $('clsSelT').addEventListener('change', function(){
    syncCls('clsSelT','clsSel')();
    refreshDelT();
  });
  /* 🔴 保存したものは、このページからでも消せる（2026-09-06 本人
     「ほかの保存の場所にも…削除できるようにしてほしい」）。
     ⚠名簿は置き場が共通なので、消すとほかの道具からも消える＝確認でそう伝える */
  function refreshDelT(){
    if ($('clsDel')) $('clsDel').disabled = !loadRosters().length;
  }
  function delPicked(selId){
    var sel = $(selId);
    if (!sel || sel.value === ''){ alert('先に①で、消すデータをえらんでください。'); return; }
    var i = parseInt(sel.value,10);
    var st = readStore(), c = st.classes[i];
    if (!c) return;
    var msg = '「'+(c.label||'')+'」を消します。';
    // ⚠名簿は座席表メーカーなどと同じ置き場。文字のまとまりはこのページのものだけ
    if (c.kind !== 'slide') msg += '座席表メーカー・席次表メーカーからも消えます。';
    if (!confirm(msg + 'よろしいですか。')) return;
    st.classes.splice(i,1);
    if (!writeStore(st)) return;
    fillClassSelect(); refreshDelT();
    showCls('「'+(c.label||'')+'」を消しました');
  }
  // ⚠①のどちらの欄でえらんだかは、いまの分岐で決まる（文字＝clsSelT／発表者＝clsSel）
  if ($('clsDel')) $('clsDel').addEventListener('click', function(){
    delPicked(kind() === 'text' ? 'clsSelT' : 'clsSel');
  });
  /* 🔴 文字を出す側で名簿を読む（2026-09-05 本人）。⭐1人＝1枚の文字にする。
     ⚠いま入っているぶんは消さず、下に足す */
  if ($('clsLoadT')) $('clsLoadT').addEventListener('click', function(){
    var c = loadRosters()[parseInt($('clsSelT').value,10)];
    if (!c) return;
    // ⭐文字のセットはそのまま1行1枚。名簿なら名前だけ取り出す
    var names = String(c.names || '').split('\n')
      .map(function(l){ return (c.kind === 'slide') ? l.trim() : nameOfLine(l); })
      .filter(function(n){ return n !== ''; });
    if (!names.length) return;
    /* ⚠読み込んだ中身も①の枠に出す（2026-09-06 本人「1年3組のデータを読みこむ押しても、
       その下の文字の部分には表示されない。見た目で見れないの？」）。
       ⭐名簿でも読める＝1人が1行＝1枚になる（本人の疑問への答え） */
    var joined = names.join(String.fromCharCode(10));
    putLines(joined);
    var n = addLines(joined);
    openStep2(n ? '「' + (c.label || '') + '」を' + n + '枚入れました'
                : '「' + (c.label || '') + '」はもう入っています');
  });

  $('read').addEventListener('click', function(){
    var got = parse($('paste').value);
    if (!got.length){
      $('warn').textContent = 'データが読み取れませんでした。Excelの名前の列をコピーして貼り付けてください。';
      $('warn').hidden = false; return;
    }
    $('warn').hidden = true;
    setRows(got); drawList(); openStep2(got.length + '人を入れました');
  });
  $('sample').addEventListener('click', function(){
    $('paste').value = SAMPLE_LIST; $('warn').hidden = true;
    setRows(parse(SAMPLE_LIST)); drawList(); openStep2('サンプルを入れました');
  });
  $('clear').addEventListener('click', function(){
    $('paste').value = ''; rows = []; groupOrder = []; groupOff = {};
    origRows = []; origGroups = [];
    $('warn').hidden = true; drawList();
  });
  $('clsLoad').addEventListener('click', function(){
    loadFromClass();
    openStep2(rows.length ? rows.length + '人を入れました' : '読み込みました');
  });

  $('shuffle').addEventListener('click', doShuffle);
  $('reset').addEventListener('click', doReset);
  $('allon').addEventListener('click', allOn);

  $('list').addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('.mvbtn') : null;
    if (!b || b.disabled) return;
    var d = parseInt(b.getAttribute('data-d'),10);
    if (b.hasAttribute('data-mv')){
      var i = parseInt(b.getAttribute('data-mv'),10), j = i+d;
      if (j<0 || j>=rows.length) return;
      var t = rows[i]; rows[i]=rows[j]; rows[j]=t;
    } else if (b.hasAttribute('data-gmv')){
      var gi = parseInt(b.getAttribute('data-gmv'),10), gj = gi+d;
      if (gj<0 || gj>=groupOrder.length) return;
      var g = groupOrder[gi]; groupOrder[gi]=groupOrder[gj]; groupOrder[gj]=g;
    }
    drawList();
  });
  $('list').addEventListener('change', function(e){
    var el = e.target;
    if (el.type !== 'checkbox') return;
    if (el.hasAttribute('data-i')) rows[parseInt(el.getAttribute('data-i'),10)].off = !el.checked;
    else if (el.hasAttribute('data-g')) groupOff[el.getAttribute('data-g')] = !el.checked;
    drawList();
  });
  // ⚠作品名の入力では描き直さない（描き直すとカーソルが飛ぶ）
  $('list').addEventListener('input', function(e){
    var el = e.target;
    if (!el.classList) return;
    if (!el.classList.contains('ttl')) return;
    var v = String(el.value).replace(/[\r\n]+/g, ' ');
    if (v !== el.value) el.value = v;
    if (el.hasAttribute('data-t')){
      rows[parseInt(el.getAttribute('data-t'),10)].title = v;
    } else if (el.hasAttribute('data-gt')){
      var g = el.getAttribute('data-gt');
      rows.forEach(function(r){ if (r.group===g) r.title = v; });
    }
    fitTtl(el, true);
    updateCount(); save();
  });
  /* 🔴 班をえらんだとき（2026-09-05）。「＋ 新しい班…」だけ名前を聞く */
  $('list').addEventListener('change', function(e){
    var el = e.target;
    if (!el.classList || !el.classList.contains('gsel')) return;
    var i = parseInt(el.getAttribute('data-g'),10);
    var v = el.value;
    if (v === '__new'){
      var name = prompt('班の名前を入れてください', '');
      name = (name === null) ? '' : String(name).replace(/^\s+|\s+$/g,'');
      if (!name){ drawList(); return; }       // やめたら元に戻す
      v = name;
    }
    rows[i].group = v;
    rebuildGroups();
    drawList();                                // 候補に足すので描き直す
    save();
  });

  Array.prototype.forEach.call(document.querySelectorAll('input[name=mode]'), function(el){
    el.addEventListener('change', drawList);
  });

  $('start').addEventListener('click', function(){ openShow(); });
  $('checkBtn').addEventListener('click', function(){
    openShow(parseInt($('checkNo').value,10) || 0);
  });
  // 🔴 パワポの「現在のスライドから表示」と同じ（2026-09-05 本人）
  $('fromBtn').addEventListener('click', function(){
    openShow(-1, parseInt($('checkNo').value,10) || 0);
  });
  $('next').addEventListener('click', function(){ move(1); });
  $('prev').addEventListener('click', function(){ move(-1); });
  $('close').addEventListener('click', closeShow);
  /* 🔴 見ている1枚から、そのまま全画面へ（2026-09-05 本人）。
     ⚠文字の大きさと改行は画面の広さで変わる。小さい画面で折り返していても
       全画面では折り返さないことがあるので、その場で確かめられるようにした */
  $('toFull').addEventListener('click', function(){
    $('show').classList.remove('check');
    if (document.documentElement.requestFullscreen){
      document.documentElement.requestFullscreen().catch(function(){});
    }
    render();
  });

  document.addEventListener('keydown', function(e){
    if (!$('show').classList.contains('on')) return;
    if (e.key==='ArrowRight' || e.key===' ' || e.key==='Enter'){ e.preventDefault(); move(1); }
    else if (e.key==='ArrowLeft'){ e.preventDefault(); move(-1); }
    else if (e.key==='Escape'){ closeShow(); }
  });

  // 画面の向きや大きさが変わったら、写真の位置を測り直す
  window.addEventListener('resize', function(){
    if ($('show').classList.contains('on')) fitBox();
  });

  /* 🔴 マウスを止めたらボタンを薄くする。⚠**指で使う機器ではやらない**（2026-09-06 本人
     「下に押しながらスワイプすると消えて、出てこないから焦る。軽くタップしたら出てくる」）。
     ⚠原因＝指の操作でも mousemove が出ることがあり、そのあと動かないので**消えたまま**になる。
     ⭐マウスがある機器（hover できる機器）だけにした。念のため、指がふれたら必ず出す */
  var hideTimer = null;
  var canHover = false;
  try{ canHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches; }catch(e){}
  if (canHover){
    document.addEventListener('mousemove', function(){
      if (!$('show').classList.contains('on')) return;
      document.body.classList.remove('hidebar');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function(){ document.body.classList.add('hidebar'); }, 2500);
    });
  }
  document.addEventListener('touchstart', function(){
    clearTimeout(hideTimer);
    document.body.classList.remove('hidebar');
  }, true);

  // 🔴 保存のチェックだけ先に読む（load より前。読まないと save() が消しに行く）
  try{
    if (localStorage.getItem(KEY)) $('save').checked = true;
  }catch(e){}

  /* 「？」を押すと、すぐ下の説明が出る（サイトの他ページと同じ形） */
  document.addEventListener('click', function(e){
    var b = e.target;
    while (b && b !== document.body && !(b.classList && b.classList.contains('tip-btn'))) b = b.parentElement;
    if (!b || b === document.body) return;
    var head = b.parentElement;
    var body = head.nextElementSibling;
    if (body && body.classList && body.classList.contains('tip-body')){
      var open = !body.hidden;
      body.hidden = open;
      b.setAttribute('aria-expanded', String(!open));
    }
  });

  fillClassSelect();
  load();
  switchKind();
})();
