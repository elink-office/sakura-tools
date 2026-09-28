/* 進行タイマー（2026-09-24 作り始め）
   ⭐始まりと終わりの時刻で組む。今の時刻から位置を出すので、途中で開いても合っている
   ⭐始まりが遅れても、終わりの時刻はそのまま（2026-09-24 本人「終わりの時間はそのままだろうね」）
   ⭐細長いタイルが左から1枚ずつ埋まる。帯は予定の110％ぶん（2026-09-24 本人）
   ⭐色＝青（はじめ〜50％）→緑（〜80％）→黄（〜終わり）→過ぎたら赤（2026-09-24 本人）
   ⭐名前を付けて保存・選んで出す（午前・午後A など。2026-09-24 本人）
   ⚠止める仕組みは外した（2026-09-24 本人「10分で作業も、予定の中に組んでるよ」） */
(function(){
  // ⚠v2（始まり＋長さ）とは中身が違うので、保存の名前を変えた
  var KEY = 'sakura-tools-timer-band-v3';
  var OVER = 0.10;   // 予定を過ぎたぶんとして、帯の右に足す割合（110％）
  var MAX_TILES = 240;
  var $ = function(id){ return document.getElementById(id); };
  var elStart = $('start'), elEnd = $('end'), elPG = $('pG'), elPY = $('pY'), elTile = $('tile');
  var elName = $('name'), elPlans = $('plans'), delBtn = $('delBtn'), overBtn = $('overBtn'), saveMsg = $('saveMsg'), lenMsg = $('lenMsg');
  var plansRow = $('plansRow'), planCount = $('planCount');
  var LIMIT = 20;   // ⭐保存は20件まで（ページの型 4-c の7）
  var track = $('track'), tileMsg = $('tileMsg');
  var elRemain = $('remain'), elEndAt = $('endAt'), elPlanName = $('planName'), wakeMsg = $('wakeMsg');

  var z = function(n){ return (n<10?'0':'') + n; };
  var hhmm = function(d){ return z(d.getHours()) + ':' + z(d.getMinutes()); };
  var toMin = function(s){ var p = s.split(':'); return (+p[0])*60 + (+p[1]); };
  var fromMin = function(m){ m = ((m % 1440) + 1440) % 1440; return z(Math.floor(m/60)) + ':' + z(m % 60); };

  // ⭐はじめは今から90分・青50％・緑80％・1枚＝1分（2026-09-24 本人）
  var now0 = new Date();
  var st = { name: '', start: hhmm(now0), end: fromMin(toMin(hhmm(now0)) + 90), pG: 50, pY: 80, tileSec: 60 };
  var plans = [];   // 保存したもの [{name, start, end, pG, pY, tileSec}]
  var FIELDS = ['name','start','end','pG','pY','tileSec'];
  function load(){
    try{
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if(saved && typeof saved === 'object'){
        if(saved.cur) FIELDS.forEach(function(k){ if(saved.cur[k] !== undefined) st[k] = saved.cur[k]; });
        if(Array.isArray(saved.plans)) plans = saved.plans;
      }
    }catch(e){}
  }
  load();

  function save(){ try{ localStorage.setItem(KEY, JSON.stringify({ cur: st, plans: plans })); }catch(e){} }

  function num(v, lo, hi, def){
    v = parseInt(v, 10);
    if(isNaN(v)) return def;
    return Math.min(hi, Math.max(lo, v));
  }

  // 長さ（分）＝終わり−始まり。終わりが始まりより前なら日をまたいでいる
  function lenMin(){
    var d = toMin(st.end) - toMin(st.start);
    if(d <= 0) d += 1440;
    return d;
  }

  function fill(){
    elName.value = st.name; elStart.value = st.start; elEnd.value = st.end;
    elPG.value = st.pG; elPY.value = st.pY; elTile.value = String(st.tileSec);
    var m = lenMin();
    lenMsg.textContent = '（' + (m >= 60 ? Math.floor(m/60) + '時間' + (m%60 ? m%60 + '分' : '') : m + '分') + '）';
  }

  function fillPlans(){
    var sel = elPlans.value;
    elPlans.innerHTML = '<option value="">（選ぶ）</option>';
    var list = plans;
    list.forEach(function(p, i){
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = p.name + '　' + p.start + '〜' + p.end;
      elPlans.appendChild(o);
    });
    // 今の名前と同じものがあれば選んだ状態にする
    var hit = -1;
    list.forEach(function(p, i){ if(p.name === st.name) hit = i; });
    elPlans.value = hit >= 0 ? String(hit) : (sel && list[+sel] ? sel : '');
    // ⭐0件のときは「保存済のデータ」を出さない（ページの型 4-c の6）。上書き・削除は押せなくする
    plansRow.hidden = list.length === 0;
    planCount.textContent = plans.length + '/' + LIMIT;
    overBtn.disabled = delBtn.disabled = plans.length === 0;
  }

  function readForm(){
    st.name = elName.value.trim().slice(0, 20);
    if(/^\d{1,2}:\d{2}/.test(elStart.value)) st.start = elStart.value.slice(0,5);
    if(/^\d{1,2}:\d{2}/.test(elEnd.value)) st.end = elEnd.value.slice(0,5);
    if(st.end === st.start) st.end = fromMin(toMin(st.start) + 1);   // 0分にはしない
    st.pG = num(elPG.value, 1, 98, st.pG);
    st.pY = num(elPY.value, st.pG + 1, 99, Math.max(st.pY, st.pG + 1));   // 緑の終わりは青の終わりより後
    st.tileSec = num(elTile.value, 10, 600, st.tileSec);
    apply();
  }
  function apply(){ save(); fill(); build(); tick(); }

  // 入力した始まりの時刻を日付つきに。日をまたぐ授業（23:00開始で0:30に開く等）も合うように、今から12時間以内に寄せる
  function startTime(now){
    var p = st.start.split(':');
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +p[0], +p[1], 0, 0);
    var diff = d - now, half = 12*3600*1000;
    if(diff > half) d.setDate(d.getDate()-1);
    else if(diff < -half) d.setDate(d.getDate()+1);
    return d.getTime();
  }

  /* ---- タイル ----
     1枚は「経過 from〜to 秒」のぶん。予定（100％）のところで必ず切れ目を入れる */
  var tiles = [], endMark = null;
  function zoneOf(midSec, planSec){
    var r = midSec / planSec;
    if(r >= 1) return 'z-r';
    if(r >= st.pY/100) return 'z-y';
    if(r >= st.pG/100) return 'z-g';
    return 'z-b';
  }
  function build(){
    var plan = lenMin()*60, all = plan*(1+OVER);
    var step = st.tileSec;
    // タイルが多すぎるときは、1枚を大きくする（10秒×90分＝540枚などは細すぎて見えない）
    var opts = [10,30,60,300,600], used = step;
    while(Math.ceil(all/used) > MAX_TILES){
      var bigger = opts.filter(function(o){ return o > used; })[0];
      if(!bigger) break;
      used = bigger;
    }
    tileMsg.textContent = used !== step ? '（この長さでは細かすぎるので、1ブロック' + (used>=60 ? used/60+'分' : used+'秒') + 'で出しています）' : '';

    track.innerHTML = '';
    tiles = [];
    // ⚠作り直した直後は、じわっと変わる動きを止める（止めないと、一瞬ぜんぶ濃く出てから薄くなる）。最初の塗りのあと tick で外す
    track.classList.add('no-anim');
    var edges = [];
    for(var t=0; t<plan; t+=used) edges.push([t, Math.min(t+used, plan)]);
    for(t=plan; t<all-0.001; t+=used) edges.push([t, Math.min(t+used, all)]);
    var n = edges.length;
    track.style.gap = n > 60 ? '1px' : (n > 25 ? '2px' : '3px');
    edges.forEach(function(e){
      var d = document.createElement('div');
      d.className = 'tb-tile ' + zoneOf((e[0]+e[1])/2, plan);
      if(e[0] === plan) d.classList.add('is-endline');
      d.style.flexGrow = String(e[1]-e[0]);   // 端数のタイルはその分だけ細く
      var b = document.createElement('b');
      var over = e[0] >= plan;
      if(over) b.style.transition = 'none';   // 赤はじわっと出さない
      d.appendChild(b);
      track.appendChild(d);
      tiles.push({ el: b, from: e[0], to: e[1], over: over });
    });
    endMark = document.createElement('i');
    endMark.className = 'tb-end';
    track.appendChild(endMark);
    placeEnd();
  }
  function placeEnd(){
    var t = track.querySelector('.is-endline');
    if(t && endMark) endMark.style.left = t.offsetLeft + 'px';
  }
  window.addEventListener('resize', placeEnd);

  // 経過は切り捨て、残りは切り上げ（「60分経過・残り30分」で合計が合うように）
  function fmt(ms, up){
    var s = Math.max(0, up ? Math.ceil(ms/1000) : Math.floor(ms/1000));
    if(s < 60) return s + '秒';
    return (up ? Math.ceil(s/60) : Math.floor(s/60)) + '分';
  }

  var FAINT = 0.14;   // まだのタイルの色の濃さ
  function paint(doneSec){
    // 経過より前のタイルは濃く、途中の1枚はだんだん濃く、まだのタイルはうっすら
    tiles.forEach(function(t){
      var op;
      if(doneSec >= t.to) op = 1;
      else if(doneSec <= t.from) op = FAINT;
      // ⭐過ぎた瞬間に赤をはっきり出す（2026-09-24 本人「薄い赤からじゃなくて、いきなり過ぎた瞬間に赤を表示しよう」）
      else if(t.over) op = 1;
      else op = FAINT + (1-FAINT) * (doneSec - t.from) / (t.to - t.from);
      t.el.style.opacity = op;
    });
    if(track.classList.contains('no-anim')){
      void track.offsetWidth;   // いまの塗りを先に画面へ反映させてから、動きを戻す
      track.classList.remove('no-anim');
    }
  }

  function tick(){
    var now = Date.now();
    var s = startTime(new Date(now));
    var total = lenMin()*60000;
    var end = s + total;
    var done = now - s, left = end - now;

    elPlanName.textContent = st.name;
    elEndAt.textContent = hhmm(new Date(s)) + '〜' + hhmm(new Date(end));
    elRemain.classList.toggle('is-over', left < 0);

    if(done < 0){
      paint(0);
      elRemain.textContent = '始まるまで ' + fmt(-done, true);
      return;
    }
    paint(done/1000);
    if(left < 0){
      // ⭐過ぎた時間も出す（2026-09-05 本人の構想「マイナス値も必要」）
      elRemain.textContent = '＋' + fmt(-left) + ' 過ぎています';
    }else{
      elRemain.textContent = fmt(done) + '経過（残り ' + fmt(left, true) + '）';
    }
  }

  /* ---- 保存・選ぶ・消す ---- */
  // ⭐ボタンは「新しい名前で保存」「上書き」「削除」（ページの型 4-c の3）
  function snap(){ var p = {}; FIELDS.forEach(function(k){ p[k] = st[k]; }); return p; }
  $('saveBtn').addEventListener('click', function(){
    readForm();
    if(!st.name){ saveMsg.textContent = '名前を入れてください'; elName.focus(); return; }
    var i = -1;
    plans.forEach(function(q, j){ if(q.name === st.name) i = j; });
    // ⚠同じ名前で押し直すと2件になってしまう。同じ名前があったら上書きするか聞く（座席表と同じ）
    if(i >= 0){
      if(!confirm('「' + st.name + '」はすでにあります。上書きしますか。')) return;
      plans[i] = snap();
    }else{
      if(plans.length >= LIMIT){ alert('保存できるのは' + LIMIT + '件までです。いらないものを削除してから保存してください。'); return; }
      plans.push(snap());
    }
    save(); fillPlans();
    saveMsg.textContent = '「' + st.name + '」を保存しました';
  });
  overBtn.addEventListener('click', function(){
    var i = +elPlans.value, p = elPlans.value === '' ? null : plans[i];
    if(!p){ saveMsg.textContent = '先に「保存済のデータ」で、上書きするデータを選んでください'; return; }
    readForm();
    var q = snap(); q.name = p.name;   // 名前は選んでいるデータのまま
    plans[i] = q; st.name = p.name;
    save(); fill(); fillPlans(); tick();
    saveMsg.textContent = '「' + p.name + '」を上書きしました';
  });
  elPlans.addEventListener('change', function(){
    saveMsg.textContent = '';
    var p = plans[+elPlans.value];
    if(elPlans.value === '' || !p) return;
    FIELDS.forEach(function(k){ if(p[k] !== undefined) st[k] = p[k]; });
    apply();
  });
  delBtn.addEventListener('click', function(){
    var i = +elPlans.value, p = elPlans.value === '' ? null : plans[i];
    if(!p){ saveMsg.textContent = '先に「保存済のデータ」で、削除するデータを選んでください'; return; }
    if(!confirm('「' + p.name + '」を削除します。よろしいですか。')) return;
    plans.splice(i, 1);
    save(); elPlans.value = ''; fillPlans();
    saveMsg.textContent = '「' + p.name + '」を削除しました';
  });

  /* 「？」の開け閉め（シフト表と同じ作り。見出しが summary のときは、中の .body の先頭にある説明を開く） */
  document.addEventListener('click', function(e){
    var b = e.target;
    while(b && b !== document.body && !(b.classList && b.classList.contains('tip-btn'))) b = b.parentElement;
    if(!b || b === document.body) return;
    var head = b.parentElement, body = null;
    if(head.tagName === 'SUMMARY'){
      e.preventDefault();
      var det = head.parentElement;
      if(!det.open) det.open = true;
      body = det.querySelector(':scope > .body > .tip-body');
    }
    if(!body) return;
    var open = body.hidden;
    body.hidden = !open;
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---- 画面をスリープにしない（Screen Wake Lock）----
     ⭐言い方は「スリープ」（2026-09-24 本人「画面が暗くなりません。→画面がスリープにはなりません。に変更」）
     ⚠ほかのアプリに切り替える・省電力モードなどで外れる。ページに戻ったらかけ直す */
  var lock = null;
  function wakeText(){
    if(!('wakeLock' in navigator)){
      wakeMsg.textContent = 'この端末のブラウザでは、画面のスリープを止められません。スリープになっても、開き直せば今の時刻の帯から出ます。';
    }else if(lock){
      wakeMsg.textContent = 'このページを開いているあいだは、画面がスリープにはなりません。';
    }else{
      wakeMsg.textContent = '画面のどこかを押すと、開いているあいだ画面がスリープにならないようにします。';
    }
  }
  function getLock(){
    if(!('wakeLock' in navigator) || lock || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function(l){
      lock = l;
      l.addEventListener('release', function(){ lock = null; wakeText(); });
      wakeText();
    }).catch(function(){ wakeText(); });
  }
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible'){ getLock(); tick(); }
  });
  // ブラウザによっては、画面を押したあとでないとかけられない
  document.addEventListener('pointerdown', getLock);

  /* ---- 帯だけを小さく出す（2026-09-24 本人）----
     ⚠今のタブやウィンドウの大きさは、ページからは変えられない（ブラウザの決まり）。だから別の窓に帯を出す
     ① Chrome・Edge・Firefox＝いちばん手前に浮かぶ窓（Document Picture-in-Picture）。帯そのものを窓へ移す
     ② それ以外（Safariなど）＝ ?mini=1 で同じページを小さい窓に開く。設定は端末の保存でつながる */
  var stage = $('stage'), stageHome = stage.parentNode, stageNext = stage.nextSibling;
  var miniBtn = $('miniBtn'), miniBack = $('miniBack'), miniMsg = $('miniMsg');
  var isMini = /[?&]mini=1/.test(location.search);
  if(isMini){ document.documentElement.classList.add('is-mini'); document.title = '進行タイマー'; }
  // スマホ・タブレット（指で触る端末）では出さない
  var coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
  if(coarse || isMini) miniBtn.parentNode.hidden = true;

  var pipWin = null;
  function backHome(){
    stageHome.insertBefore(stage, stageNext);
    pipWin = null;
    miniBtn.hidden = false; miniBack.hidden = true; miniMsg.hidden = true;
    placeEnd();
  }
  function openPopup(){
    // ⭐細く（2026-09-24 本人「もっと細くしてほしい」）。⚠高さには窓の枠も入る。小さすぎる値はブラウザが広げる
    window.open(location.pathname + '?mini=1', 'sakura-band-mini', 'popup,width=420,height=110');
  }
  miniBtn.addEventListener('click', function(){
    if(!('documentPictureInPicture' in window)){ openPopup(); return; }
    window.documentPictureInPicture.requestWindow({ width: 420, height: 60 }).then(function(w){
      pipWin = w;
      // 見た目（CSS）を窓へ写す。⚠窓の中は住所が無いので、相対の書き方では読めない＝絶対の住所で入れる
      document.querySelectorAll('link[rel=stylesheet]').forEach(function(l){
        var n = w.document.createElement('link');
        n.rel = 'stylesheet'; n.href = l.href;
        w.document.head.appendChild(n);
      });
      w.document.title = '進行タイマー';
      w.document.documentElement.classList.add('is-mini');
      w.document.body.appendChild(stage);
      miniBtn.hidden = true; miniBack.hidden = false; miniMsg.hidden = false;
      w.addEventListener('resize', placeEnd);
      w.addEventListener('pagehide', backHome);   // 窓を閉じたら、帯をページに戻す
      setTimeout(placeEnd, 100);
    }).catch(openPopup);
  });
  miniBack.addEventListener('click', function(){ if(pipWin) pipWin.close(); });

  // 別の窓（②）で設定を変えたときに、こちらも合わせる
  window.addEventListener('storage', function(e){
    if(e.key !== KEY || !e.newValue) return;
    load(); fill(); fillPlans(); build(); tick();
  });

  // ⭐始まりが遅れたら「今から」。終わりはそのままで、帯が縮む
  $('nowBtn').addEventListener('click', function(){
    var n = hhmm(new Date());
    // 終わりの時刻をもう過ぎているときは、始まりを動かさない（日をまたいだ長さになってしまうため）
    var newLen = (toMin(st.end) - toMin(n) + 1440) % 1440;
    if(newLen === 0 || newLen > 720){ saveMsg.textContent = '終わりの時刻を過ぎています。終わりを入れ直してください'; return; }
    saveMsg.textContent = '';
    elStart.value = n;
    readForm();
  });
  [elStart, elEnd, elPG, elPY, elTile].forEach(function(el){
    el.addEventListener('change', readForm);
  });
  elName.addEventListener('change', function(){ st.name = elName.value.trim().slice(0, 20); save(); tick(); fillPlans(); });

  fill();
  fillPlans();
  save();
  build();
  tick();
  wakeText();
  getLock();
  setInterval(tick, 1000);
})();
