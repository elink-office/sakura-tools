/* カウントダウンタイマー（2026-09-24 作成中）
   ⭐決めたこと（決定ログ 2026-09-16・09-24）
     時間は自分で打つ／音は鳴らさない／ボタンは3つ（一時停止・できた・もどる）
     赤にする時点は使う人が決める（はじめは残り1分）。設定した時間より長ければ最初から赤
     仕掛け＝間に合った（できた）→お祝い／0になった→爆発。オン／オフは同じページの中で
   ⚠時間は「終わる時刻」から毎回計算する（パソコンが重くなってもずれない） */
(function(){
"use strict";
function $(id){ return document.getElementById(id); }
function pad(n){ return (n<10?"0":"")+n; }

/* タイピングのタイルと同じ7色 */
var BLOCKCOL=["#e67999","#f2a163","#e8c456","#69b992","#58baca","#6e89d8","#a17ad9"];
var C=2*Math.PI*45;                 // 丸の周の長さ（SVG の r=45）
/* ⭐タイル＝1秒で1マス（2026-09-24 本人「2秒で1マスにしてない？1秒にしてね」。⚠前は時間に関係なく100マス固定）
   ⚠60分（3600マス）を超えるときだけ、1マスを2秒・3秒…にして3600マスに収める */
var TILE_MAX=3600, TILE_N=100, tileStep=1;

var rate=1, demoTimer=0;   // rate＝時計の速さ（見本は6秒で終わるように速くする）
var total=0, warnAt=60, deadline=0, remainStored=0, running=false, finished=false, raf=0, endTimer=0;
var view="ring", tileOrder=[], tilesOn=0, wakeLock=null;

/* ===== 設定の画面 ===== */
var KEY="sakura-timer";          // 画面の保存（最後に入れた内容・自動）
var sampleOn=false, sampleName="", sampleKeep=null;
function loadSaved(){
  try{
    var s=JSON.parse(localStorage.getItem(KEY)||"null"); if(!s) return;
    if(s.m!=null) $("inMin").value=s.m;
    if(s.s!=null) $("inSec").value=pad(+s.s||0);
    if(s.wm!=null) $("inWarnMin").value=s.wm;
    if(s.ws!=null) $("inWarnSec").value=pad(+s.ws||0);
    if(s.wo!=null) $("warnOn").checked=!!s.wo;
    if(s.win) $("selWin").value=s.win;
    if(s.lose) $("selLose").value=s.lose;
    if(!$("selLose").value) $("selLose").value="bomb";      // ⚠「画面が揺れる」はやめた（前の保存に残っていても爆弾に）
    if(s.view) setView(s.view);
    /* ⚠前のはじめの言葉（「よくできました」「ざんねん」）がそのまま残っていたら空にする＝グレーの見本が見えるように */
    if(s.kusu!=null) $("inKusu").value=(s.kusu==="よくできました" ? "" : s.kusu);
    if(s.zan!=null) $("inZan").value=(s.zan==="ざんねん" ? "" : s.zan);
    if(s.sel) loadedId=s.sel;
  }catch(e){}
}
function save(){
  if(sampleOn) return;             // ⭐サンプルの間は保存しない（ページの型 12-a）
  try{
    localStorage.setItem(KEY, JSON.stringify({
      m:num("inMin",99), s:num("inSec",59), wm:num("inWarnMin",99), ws:num("inWarnSec",59), wo:$("warnOn").checked,
      win:$("selWin").value, lose:$("selLose").value, view:view, kusu:$("inKusu").value, zan:$("inZan").value, sel:loadedId
    }));
  }catch(e){}
}
/* 全角の数字も受ける。数字以外は捨てる */
function num(id,max){
  var v=String($(id).value).replace(/[０-９]/g,function(c){ return String.fromCharCode(c.charCodeAt(0)-0xFEE0); }).replace(/\D/g,"");
  var n=v==="" ? 0 : parseInt(v,10);
  return Math.min(max, n);
}
["inMin","inSec","inWarnMin","inWarnSec"].forEach(function(id){
  var el=$(id);
  el.addEventListener("focus",function(){ setTimeout(function(){ el.select(); },0); });
  el.addEventListener("blur",function(){
    var isSec=/Sec$/.test(id), n=num(id, isSec?59:99);
    el.value=isSec ? pad(n) : String(n);
  });
  el.addEventListener("keydown",function(e){ if(e.key==="Enter") start(); });
});

function setView(v){
  view=(v==="tile") ? "tile" : "ring";
  Array.prototype.forEach.call($("segView").querySelectorAll("button"),function(b){
    var on=b.getAttribute("data-v")===view;
    b.classList.toggle("on",on); b.setAttribute("aria-checked",on?"true":"false");
  });
  $("viewHint").textContent = view==="tile"
    ? "時間がたつと、タイルが1枚ずつ埋まっていきます。0になると、はじけ飛びます。"
    : "時間がたつと、丸が時計回りに減っていきます。";
}
$("segView").addEventListener("click",function(e){
  var b=e.target.closest("button"); if(!b) return;
  setView(b.getAttribute("data-v")); save();
});
/* 赤にするのチェック＝外したら時間の欄をうすく・押せなく */
function showWarn(){
  var on=$("warnOn").checked;
  document.querySelector(".tm-warn").classList.toggle("off",!on);
  $("inWarnMin").disabled=!on; $("inWarnSec").disabled=!on;
}
$("warnOn").addEventListener("change",function(){ showWarn(); save(); });
/* くす玉を選んだときだけ、文字の欄を出す */
function showKusuRow(){ $("kusuRow").hidden = $("selWin").value!=="kusudama"; $("zanRow").hidden = $("selLose").value!=="curtain"; }
$("selWin").addEventListener("change",function(){ showKusuRow(); save(); });
$("inKusu").addEventListener("input",save);
$("selLose").addEventListener("change",function(){ showKusuRow(); save(); });
$("inZan").addEventListener("input",save);
/* ⭐見本を見る＝16:9 の枠の中で本番と同じ画面を動かす（時間は縮めない） */
$("demoBtn").addEventListener("click",function(){ start({demo:true}); });
/* ⭐「ためしに見る」の仕掛けは、どこかを押すか Esc で消える（2026-09-24 本人「幕、確認したらどうやって閉じるかわかんない」）
   ＝幕・ヒビのように残るものは、少し待っても自分で消える（tryAutoClear） */
document.addEventListener("click",function(e){
  if(!$("runScreen").hidden) return;
  if(e.target.closest("#demoBtn")) return;
  if($("fx").children.length) clearFx();
});
document.addEventListener("keydown",function(e){
  if(e.key==="Escape" && $("runScreen").hidden && $("fx").children.length) clearFx();
});

/* ===== 名前を付けて保存（ページの型 3・4-c＝座席表の⑦と同じ作法）＝このタイマーだけの置き場。名簿・進行タイマーとは別
   ⭐名前は［新しい名前で保存］を押したときに聞く（簡単スライドと同じ prompt）
   ⭐呼び出しは①の「このデータを自動入力」。④の「保存済のデータ」は上書き・削除の相手を選ぶもの ===== */
var STORE="sakura-tools-countdown-v1", LIMIT=20, loadedId="";
function loadStore(){ try{ var d=JSON.parse(localStorage.getItem(STORE)||"null"); if(d && d.items) return d; }catch(e){} return {v:1,items:[]}; }
function writeStore(d){ try{ localStorage.setItem(STORE, JSON.stringify(d)); return true; }catch(e){ return false; } }
function findItem(id){ if(!id) return null; var d=loadStore(); for(var i=0;i<d.items.length;i++) if(d.items[i].id===id) return d.items[i]; return null; }
function current(name){
  return {name:name, m:num("inMin",99), s:num("inSec",59), wm:num("inWarnMin",99), ws:num("inWarnSec",59), wo:$("warnOn").checked,
          view:view, win:$("selWin").value, lose:$("selLose").value, kusu:$("inKusu").value, zan:$("inZan").value};
}
function fillSel(sel, keep){
  var d=loadStore();
  sel.innerHTML='<option value="">'+(sel.id==="selSaved2" ? "保存済のデータ" : "－")+'</option>';   // ②の中は見出しを欄の中に出す
  d.items.forEach(function(it){ var o=document.createElement("option"); o.value=it.id; o.textContent=it.name; sel.appendChild(o); });
  sel.value=findItem(keep) ? keep : "";
}
function refreshSaved(keep){
  var d=loadStore(), k=(keep!=null) ? keep : loadedId;
  if(!findItem(loadedId)) loadedId="";
  fillSel($("selSaved"), k); fillSel($("selSaved2"), k);
  $("recallRow").hidden = d.items.length===0;
  $("saveCount").textContent=d.items.length+"/"+LIMIT;
}
function applyItem(it){
  $("inMin").value=String(it.m); $("inSec").value=pad(it.s);
  $("inWarnMin").value=String(it.wm); $("inWarnSec").value=pad(it.ws);
  $("warnOn").checked=(it.wo!==false); showWarn();
  setView(it.view); $("selWin").value=it.win; $("selLose").value=it.lose; $("inKusu").value=it.kusu||""; $("inZan").value=(it.zan||"");
  if(!$("selLose").value) $("selLose").value="bomb";      // ⚠なくした仕掛け（揺れる・ガラス）が保存に残っていても爆弾に
  showKusuRow();
}
function saveMsg(t){ $("saveMsg").textContent=t; }
/* ①：このデータを自動入力／削除 */
$("loadSaved2").addEventListener("click",function(){
  var it=findItem($("selSaved2").value);
  if(!it){ alert("保存済のデータを選んでください。"); return; }
  applyItem(it); loadedId=it.id; $("selSaved").value=it.id; save();
});
$("delSaved2").addEventListener("click",function(){
  var it=findItem($("selSaved2").value);
  if(!it){ alert("削除するデータを選んでください。"); return; }
  if(!confirm("「"+it.name+"」を削除しますか？")) return;
  delItem(it.id);
});
function delItem(id){
  var it=findItem(id), d=loadStore(); d.items=d.items.filter(function(x){ return x.id!==id; });
  writeStore(d); if(loadedId===id) loadedId=""; refreshSaved(""); save(); saveMsg("「"+it.name+"」を削除しました。");
}
/* ④：新しい名前で保存／上書き／削除 */
$("saveNew").addEventListener("click",function(){
  var cur=findItem(loadedId);
  var name=prompt("データの名前を入れてください", cur ? cur.name : "");
  if(name===null) return;
  name=name.trim(); if(!name) return;
  var d=loadStore(), same=null;
  d.items.forEach(function(it){ if(it.name===name) same=it; });
  if(same){
    if(!confirm("「"+name+"」はもう保存されています。今の内容に差し替えますか？")) return;
    var o=current(name); o.id=same.id; d.items[d.items.indexOf(same)]=o;
    writeStore(d); loadedId=o.id; refreshSaved(o.id); save(); saveMsg("「"+name+"」を差し替えました。"); return;
  }
  if(d.items.length>=LIMIT){ saveMsg("保存は"+LIMIT+"件までです。いらないものを削除してください。"); return; }
  var it=current(name); it.id="t"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);   // ⚠時刻だけだと、続けて保存したとき同じ番号になる
  d.items.push(it);
  if(!writeStore(d)){ saveMsg("保存できませんでした。"); return; }
  loadedId=it.id; refreshSaved(it.id); save(); saveMsg("「"+name+"」を保存しました。");
});
$("saveOver").addEventListener("click",function(){
  var id=$("selSaved").value, it=findItem(id);
  if(!it){ saveMsg("上書きするデータを「保存済のデータ」で選んでください。"); return; }
  if(!confirm("「"+it.name+"」を今の内容で上書きしますか？")) return;
  var d=loadStore();
  d.items=d.items.map(function(x){ if(x.id!==id) return x; var o=current(it.name); o.id=id; return o; });
  writeStore(d); loadedId=id; refreshSaved(id); save(); saveMsg("「"+it.name+"」に上書きしました。");
});
$("saveDel").addEventListener("click",function(){
  var id=$("selSaved").value, it=findItem(id);
  if(!it){ saveMsg("削除するデータを「保存済のデータ」で選んでください。"); return; }
  if(!confirm("「"+it.name+"」を削除しますか？")) return;
  delItem(id);
});
/* 「？」の開け閉め（見出しのすぐ下の .tip-body を出し入れ。長いものは tip.js がポップアップにする） */
document.addEventListener("click",function(e){
  var b=e.target.closest(".tip-btn"); if(!b) return;
  var host=b.closest("h2,summary,p,label"), body=host && host.nextElementSibling;
  if(!body || !body.classList.contains("tip-body")) return;
  e.preventDefault();
  body.hidden=!body.hidden; b.setAttribute("aria-expanded", body.hidden ? "false" : "true");
});

/* ⚠サンプルはやめた（2026-09-24 本人「サンプルはなしにしよう。仕掛けで見れるから」）。戻すときは _もどす/2026-09-24_サンプルをなくす前 */

/* ===== 動かす ===== */
function start(opt){
  opt=(opt && opt.demo) ? opt : {};
  var m=num("inMin",99), s=num("inSec",59);
  total=m*60+s;
  if(total<=0){ $("setMsg").textContent="時間を入れてください。"; $("inMin").focus(); return; }
  $("setMsg").textContent="";
  warnAt=$("warnOn").checked ? num("inWarnMin",99)*60+num("inWarnSec",59) : 0;   // チェックを外したら赤にしない
  save();
  clearFx();
  clearTimeout(demoTimer);
  rate=opt.demo ? Math.max(1,(m*60+s)/5) : 1;   // ⭐見本は5秒で0まで（2026-09-24 本人「見本は5秒に固定で行こう」）
  $("demoBadge").hidden=!opt.demo;
  /* 見本＝枠に入れる。仕掛けの入れ物（fx）も枠の中へ移す＝仕掛けも枠の大きさで出る */
  $("runScreen").classList.toggle("framed", !!opt.demo);
  $("demoBack").hidden=!opt.demo;
  if(opt.demo) $("runScreen").appendChild($("fx")); else document.body.appendChild($("fx"));
  finished=false;
  var run=$("runScreen");
  run.hidden=false;
  run.classList.remove("red","done","gray","shake","view-tile","view-ring");
  run.classList.add("view-"+view);
  document.body.style.overflow="hidden";
  $("result").hidden=true; $("result").className="tm-result";
  $("pauseBtn").disabled=false; $("doneBtn").disabled=false;
  $("pauseBtn").textContent="❚❚ 一時停止";
  $("ringFg").style.strokeDasharray=C+" "+C;
  /* 保存した名前を時計の右に。選んでいなければ出さない */
  var it=findItem(loadedId), tt=$("runTitle"), ttl=sampleOn ? sampleName : (it ? it.name : "");
  if(ttl){
    tt.textContent=ttl; tt.hidden=false; run.classList.add("has-title");
    tt.style.removeProperty("--tfs");
    var S=$("stage").getBoundingClientRect().width;
    tt.style.setProperty("--tfs", Math.max(14, Math.min(S*0.075, S*0.92/(ttl.length*1.1)))+"px");
  }else{ tt.hidden=true; run.classList.remove("has-title"); }
  if(view==="tile") buildTiles();
  remainStored=total;
  draw(total);
  resume();
  if(!opt.demo) keepAwake(true);
}
/* ⭐スタートは自動で全画面（2026-09-24 本人「スタートしても全画面にならないよ。勝手になったほうがいいね」）
   ⚠全画面はボタンを押した直後しか頼めない（ブラウザの決まり）ので、押したその場で頼む */
$("startBtn").addEventListener("click",function(){
  var el=document.documentElement;
  if(!document.fullscreenElement && el.requestFullscreen){ el.requestFullscreen().catch(function(){}); }
  start();
});

function resume(){
  running=true;
  deadline=performance.now()+remainStored*1000/rate;
  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(tick);
  /* ⚠タブが裏に回ると、画面の書き換え（requestAnimationFrame）が止まる。
     0になった合図だけは、時刻で別に呼んでおく（戻ってきたとき遅れて爆発しないように） */
  clearTimeout(endTimer);
  endTimer=setTimeout(function(){ if(running) tick(); }, remainStored*1000/rate+30);
}
function pause(){
  running=false;
  remainStored=Math.max(0,(deadline-performance.now())/1000*rate);
  cancelAnimationFrame(raf); clearTimeout(endTimer);
}

function tick(){
  if(!running) return;
  var remain=Math.max(0,(deadline-performance.now())/1000*rate);
  draw(remain);
  if(remain<=0){ timeUp(); return; }
  raf=requestAnimationFrame(tick);
}

function draw(remain){
  var shown=Math.ceil(remain-1e-6);               // 画面に出す秒（0.3秒残りなら「1」）
  $("dMin").textContent=pad(Math.floor(shown/60));
  $("dSec").textContent=pad(shown%60);
  var frac=total>0 ? remain/total : 0;
  /* 時計回りに色がなくなる（12時の位置から） */
  var fg=$("ringFg");
  fg.style.strokeDasharray=(C*frac)+" "+C;
  fg.style.strokeDashoffset=-(C*(1-frac));
  fg.style.opacity=frac>0.001 ? 1 : 0;           // ⚠0のとき、丸い端だけが点で残るので消す
  /* ⭐赤にする。設定した時間より長ければ最初から赤（打ち込んだとおり） */
  $("runScreen").classList.toggle("red", warnAt>0 && shown<=warnAt);
  if(view==="tile") fillTiles(Math.floor((total-remain)/tileStep+1e-6));
}

/* ===== タイル ===== */
function buildTiles(){
  var box=$("tiles"); box.innerHTML="";
  tileStep=Math.max(1, Math.ceil(total/TILE_MAX));
  TILE_N=Math.max(1, Math.ceil(total/tileStep));
  /* 並べ方＝できるだけ正方形。マスが多いほど、すき間と角を小さく */
  /* ⭐枠は16:9の横長（2026-09-24 本人「タイルの時さ、画面に合わせて16：9にできないのかな？」）＝横の列を多めにして、1マスをほぼ正方形に */
  var cols=Math.max(1,Math.round(Math.sqrt(TILE_N*16/9)));
  box.style.gridTemplateColumns="repeat("+cols+",1fr)";
  box.style.gridTemplateRows="repeat("+Math.ceil(TILE_N/cols)+",1fr)";
  box.style.gap=(TILE_N<=100?4:TILE_N<=400?2:1)+"px";
  box.style.setProperty("--tr",(TILE_N<=100?5:TILE_N<=400?3:1)+"px");
  for(var i=0;i<TILE_N;i++){
    var t=document.createElement("div"); t.className="tm-tile";
    t.style.setProperty("--c",BLOCKCOL[Math.floor(Math.random()*BLOCKCOL.length)]);
    box.appendChild(t);
  }
  tileOrder=[]; for(var j=0;j<TILE_N;j++) tileOrder.push(j);
  for(var k=TILE_N-1;k>0;k--){ var r=Math.floor(Math.random()*(k+1)); var x=tileOrder[k]; tileOrder[k]=tileOrder[r]; tileOrder[r]=x; }
  tilesOn=0;
}
function fillTiles(n){
  n=Math.max(0,Math.min(TILE_N,n));
  var kids=$("tiles").children;
  /* 赤になってから埋まるマスだけ赤。⚠「今が赤か」で決めると、画面が裏にあって一度にたくさん埋まったとき全部赤になる
     ⭐何番目のマスか（＝埋まるときの残り秒）で決める */
  while(tilesOn<n){ var t=kids[tileOrder[tilesOn]]; t.classList.add("on");
    if(warnAt>0 && total-tilesOn*tileStep<=warnAt) t.classList.add("hot"); tilesOn++; }
}
/* ⭐0になったら、はじける（2026-09-24 本人「崩れるんじゃなくてさ、はじけるにしよう」。⚠前は下へくずれ落ちていた）
   ＝真ん中から外へ、いっせいに飛び散る。回りながら大きくなって消える */
function burstTiles(){
  var box=$("tiles"), kids=box.children, b=box.getBoundingClientRect();
  var cx=b.left+b.width/2, cy=b.top+b.height/2, far=Math.max(window.innerWidth,window.innerHeight)*0.9;
  Array.prototype.forEach.call(kids,function(t){
    var r=t.getBoundingClientRect(), dx=r.left+r.width/2-cx, dy=r.top+r.height/2-cy;
    var d=Math.sqrt(dx*dx+dy*dy)||1, k=far*(0.55+Math.random()*0.6)/d*(0.4+d/(b.width/2)*0.6);
    var mx=dx*k+(Math.random()-.5)*60, my=dy*k+(Math.random()-.5)*60;
    setTimeout(function(){
      t.classList.add("pop");
      t.style.transform="translate("+mx+"px,"+my+"px) rotate("+((Math.random()-.5)*720)+"deg) scale("+(1.4+Math.random()*1.2)+")";
    }, Math.random()*120);
  });
}
/* 間に合ったら、埋まったところがキラッと光る */
function shineTiles(){
  var kids=$("tiles").children;
  for(var i=0;i<tilesOn;i++){
    (function(t,d){ setTimeout(function(){ t.classList.add("shine"); },d); })(kids[tileOrder[i]], Math.random()*500);
  }
}

/* ===== 終わり方 ===== */
function timeUp(){
  if(finished) return;
  running=false; finished=true; cancelAnimationFrame(raf); clearTimeout(endTimer);
  draw(0);
  if(view==="tile"){ fillTiles(TILE_N); setTimeout(burstTiles,250); }
  /* ⭐「時間です」の文字は出さない（2026-09-24 本人「いらないな」） */
  endButtons();
  runLose($("selLose").value, false);
}
function doneNow(){
  if(finished) return;
  pause(); finished=true;
  draw(remainStored);
  $("runScreen").classList.add("done");
  if(view==="tile") shineTiles();
  /* ⭐「間に合った！」の文字は出さない（2026-09-24 本人「いらないな」）。輪がグレーになるだけ */
  endButtons();
  runWin($("selWin").value, false);
}
function showResult(text, cls){
  var r=$("result"); r.textContent=text; r.className="tm-result "+cls; r.hidden=false;
}
function endButtons(){
  $("pauseBtn").disabled=true; $("doneBtn").disabled=true;
  keepAwake(false);
}

$("pauseBtn").addEventListener("click",function(){
  if(finished) return;
  if(running){ pause(); this.textContent="▶ さいかい"; }
  else { resume(); this.textContent="❚❚ 一時停止"; }
});
$("doneBtn").addEventListener("click",doneNow);
$("backBtn").addEventListener("click",function(){
  running=false; finished=true; cancelAnimationFrame(raf); clearTimeout(endTimer); clearTimeout(demoTimer);
  clearFx();
  $("runScreen").classList.remove("framed"); $("demoBack").hidden=true; document.body.appendChild($("fx"));
  $("runScreen").hidden=true;
  document.body.style.overflow="";
  keepAwake(false);
  if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function(){});
});
/* スペース＝一時停止／さいかい */
document.addEventListener("keydown",function(e){
  if($("runScreen").hidden) return;
  if(e.code==="Space"){ e.preventDefault(); $("pauseBtn").click(); }
});

/* 全画面 */
$("fsBtn").addEventListener("click",function(){
  var el=document.documentElement;
  if(document.fullscreenElement){ document.exitFullscreen().catch(function(){}); }
  else if(el.requestFullscreen){ el.requestFullscreen().catch(function(){}); }
});

/* 動いている間は画面を消さない（対応していない端末では何もしない） */
function keepAwake(on){
  try{
    if(on && navigator.wakeLock && !wakeLock){
      navigator.wakeLock.request("screen").then(function(w){ wakeLock=w; w.addEventListener("release",function(){ wakeLock=null; }); }).catch(function(){});
    }else if(!on && wakeLock){ wakeLock.release(); wakeLock=null; }
  }catch(e){}
}
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible" && running) keepAwake(true);
});

/* =====================================================================
   仕掛け
   ⭐絵（くす玉・爆弾）はコードで描く。物足りなければ画像に差し替える（2026-09-24 本人「そうだね」）
     ＝差し替えるときは kusuSvg()・BOMB_SVG の中身を <img src="..."> に変えるだけ
   ===================================================================== */
var fxTimers=[], fxRaf=[];
function later(fn,ms){ fxTimers.push(setTimeout(fn,ms)); }
function clearFx(){
  fxTimers.forEach(clearTimeout); fxTimers=[];
  fxRaf.forEach(function(o){ o.stop=true; }); fxRaf=[];
  $("fx").innerHTML="";
  $("runScreen").classList.remove("shake");
  $("setScreen").classList.remove("shake");
}
function runWin(kind, isTry){
  if(isTry) clearFx();
  if(kind==="confetti") confetti();
  else if(kind==="fireworks") fireworks();
  else if(kind==="kusudama") kusudama();
}
function runLose(kind, isTry){
  if(isTry) clearFx();
  if(kind==="bomb") bomb(isTry);
  else if(kind==="curtain") curtain(isTry);
}
/* 仕掛けの入れ物（fx）の大きさと位置。本番＝画面いっぱい、見本＝16:9 の枠 */
function fxBox(){ return $("fx").getBoundingClientRect(); }
function makeCanvas(){
  var cv=document.createElement("canvas"), dpr=window.devicePixelRatio||1;
  var fb=fxBox(), W=fb.width, H=fb.height;
  cv.width=W*dpr; cv.height=H*dpr;
  $("fx").appendChild(cv);
  var ctx=cv.getContext("2d"); ctx.scale(dpr,dpr);
  return {cv:cv, ctx:ctx, W:W, H:H};
}
function loop(step){
  var h={stop:false}, last=performance.now(), t0=last;
  fxRaf.push(h);
  function f(now){
    if(h.stop) return;
    var dt=Math.min(0.04,(now-last)/1000); last=now;
    if(step(dt,(now-t0)/1000)!==false) requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
}

/* ----- 紙吹雪：左下と右下の角から、放射状にパンっと（タイピングの紙吹雪と同じ動き） ----- */
function confetti(opt){
  opt=opt||{};
  var c=makeCanvas(), ctx=c.ctx, W=c.W, H=c.H;
  var G=3400, N=opt.kusu ? Math.min(300, Math.round(W/2.6)) : Math.min(220, Math.round(W/3.5)), ps=[];
  for(var i=0;i<N;i++){
    var p;
    if(opt.kusu){
      /* くす玉から。⭐文字（垂れ幕）の下側を多めに（2026-09-24 本人「文字の下側を多めに」）
         ＝4割は玉のふちから外へ、6割は垂れ幕の下半分のあたりから左右へはじける */
      var q=opt.kusu, side=(Math.random()<.5?-1:1);
      if(i<N*0.4){
        var off=Math.random()*q.ballR;
        p={x:q.cx+side*off, y:q.top+Math.random()*q.ballR*0.85,
           vx:side*(150+Math.random()*450)*(0.4+off/q.ballR), vy:-80-Math.random()*320, delay:Math.random()*0.35};
      }else{
        var bh=q.bBot-q.bTop;
        p={x:q.cx+side*Math.random()*q.ballR*1.2, y:q.bTop+bh*(0.45+Math.random()*0.6),
           vx:side*(80+Math.random()*420), vy:-250-Math.random()*450, delay:0.15+Math.random()*0.5};
      }
    }else{
      var dir=(i%2===0)?1:-1;
      var peak=H*(-0.45+Math.random()*0.65);
      var x0=(dir===1) ? W*(-0.12+Math.random()*0.18) : W*(1.12-Math.random()*0.18);
      var y0=H+10+H*(0.08+Math.random()*0.27);
      var vy=-Math.sqrt(2*G*(y0-peak));
      /* ⭐広がりは元の 4〜40度（2026-09-24 本人「広がり戻してみて。全画面で見てなかった」。⚠一度 7〜44度に寄せた）
         ⭐右の角は、ほんの一瞬だけおくれる＝0.07秒（本人「せーのーって口で言って同時にやっても、ほんの一瞬遅れる感じ」。⚠0.14→0.3→0.07） */
      var ang=(4+Math.random()*36)*Math.PI/180;
      p={x:x0,y:y0,vx:dir*Math.min(950,-vy*Math.tan(ang)),vy:vy,delay:(dir===1?0:0.07)};
    }
    p.term=80+Math.random()*80; p.sw=18+Math.random()*34; p.sf=1.5+Math.random()*2.5; p.ph=Math.random()*6.3;
    p.rot=Math.random()*6.3; p.vr=(Math.random()-.5)*12; p.flip=Math.random()*6.3; p.vf=5+Math.random()*9;
    p.w=7+Math.random()*6; p.h=10+Math.random()*8; p.round=Math.random()<.18;
    p.col=BLOCKCOL[Math.floor(Math.random()*BLOCKCOL.length)];
    ps.push(p);
  }
  loop(function(dt,t){
    ctx.clearRect(0,0,W,H);
    var alive=0;
    for(var i=0;i<ps.length;i++){
      var p=ps[i];
      if(t<p.delay){ alive++; continue; }
      if(p.vy<0) p.vy+=G*dt;
      else { p.vy=Math.min(p.term,p.vy+G*dt*0.15); p.vx*=0.94; }
      p.x+=p.vx*dt+(p.vy>0?Math.sin(t*p.sf+p.ph)*p.sw*dt:0);
      p.y+=p.vy*dt; p.rot+=p.vr*dt; p.flip+=p.vf*dt;
      if(p.y>H+20 && p.vy>0) continue;
      alive++;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.scale(1,Math.cos(p.flip));
      ctx.fillStyle=p.col;
      if(p.round){ ctx.beginPath(); ctx.arc(0,0,p.w*0.55,0,6.3); ctx.fill(); }
      else ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    }
    if(alive && t<14) return true;
    if(c.cv.parentNode) c.cv.parentNode.removeChild(c.cv);
    return false;
  });
}

/* ----- 花火：⭐日本の花火＝菊（2026-09-24 本人「日本の花火って菊のように広がるの知ってる？」→「それでやってみて。で、最後に大きいのを1発！」）
   ⭐菊＝①粒が同じ速さで真ん丸に広がる（玉の割物）②光の尾を引く ③最後は少し垂れながら消える
   ＝粒は「球の上に均等に並べた点」を正面から見た形で飛ばす（まん中ほど遅く見える＝丸い玉に見える）
   ⭐ときどき内側にもう1つ輪（芯入り）・途中で色が変わる（変化菊）
   ⭐最後に大きいのを1発（間をあけて、まん中の高いところ）
   ⭐色は派手に（2026-09-24 本人「もっと派手な色になるなら採用」）。うしろは夜空のように暗くする＝明るい画面だと色が沈むため ----- */
var FW_COLS=["#ff2d55","#ffd60a","#00e5ff","#76ff03","#ff9100","#e040fb","#2979ff","#ff4fa3","#64ffda","#ffffff"];
function fwCol(){ return FW_COLS[Math.floor(Math.random()*FW_COLS.length)]; }
function fireworks(){
  var night=document.createElement("div"); night.className="night"; $("fx").appendChild(night);
  setTimeout(function(){ night.classList.add("on"); },20);
  var c=makeCanvas(), ctx=c.ctx, W=c.W, H=c.H, S=Math.min(W,H);
  var rockets=[], stars=[], G=280, done=false, SHOTS=9, GAP=520;
  function launch(big){
    var x=big ? W/2 : W*(0.16+Math.random()*0.68);
    var ty=big ? H*0.36 : H*(0.2+Math.random()*0.26);
    rockets.push({x:x, y:H+10, px:x, py:H+10, vy:-Math.sqrt(2*G*1.5*(H+10-ty)), ty:ty, big:!!big});
  }
  /* 割れる：球の上の点を正面から見た形 */
  function ring(x,y,n,speed,col,col2,life){
    for(var i=0;i<n;i++){
      var z=Math.random()*2-1, th=Math.random()*Math.PI*2, r=Math.sqrt(1-z*z);
      var v=speed*(0.97+Math.random()*0.06);
      stars.push({x:x,y:y,px:x,py:y,vx:Math.cos(th)*r*v,vy:Math.sin(th)*r*v,age:0,life:life*(0.9+Math.random()*0.2),
                  col:col,col2:col2,w:1.6+Math.random()*0.8});
    }
  }
  function burst(r){
    var big=r.big;
    var speed=big ? S*0.62 : S*(0.26+Math.random()*0.1);
    var col=fwCol(), col2=Math.random()<.45 ? fwCol() : null;     // 変化菊（途中で色が変わる）
    ring(r.x,r.y, big?260:130, speed, col, col2, big?2.8:2.0);
    if(big || Math.random()<.5){                                   // 芯入り（内側にもう1つ輪）
      var cc=fwCol();
      ring(r.x,r.y, big?120:60, speed*0.48, cc, null, big?2.4:1.6);
      if(big) ring(r.x,r.y, 60, speed*0.24, "#ffffff", fwCol(), 2.0);   // 大きいのは八重芯
    }
    stars.push({flash:true,x:r.x,y:r.y,age:0,life:big?0.45:0.28,s:big?80:36});
  }
  for(var k=0;k<SHOTS;k++) later(function(){ launch(false); }, 200+k*GAP+Math.random()*160);
  later(function(){ launch(false); launch(false); }, 200+SHOTS*GAP+120);
  var bigAt=200+SHOTS*GAP+800;                                     // ⭐最後に大きいのを1発。間は0.8秒（2026-09-24 本人「もう少しだけ早いタイミングでも」。⚠前は1.5秒）
  later(function(){ launch(true); }, bigAt);
  later(function(){ done=true; }, bigAt+100);
  loop(function(dt,t){
    /* 残像＝光の尾。少しずつ消す（フレームの速さに左右されない消し方） */
    ctx.globalCompositeOperation="destination-out";
    ctx.fillStyle="rgba(0,0,0,"+(1-Math.pow(0.88,dt*60))+")"; ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation="lighter";
    ctx.lineCap="round";
    for(var i=rockets.length-1;i>=0;i--){
      var r=rockets[i];
      r.px=r.x; r.py=r.y;
      r.vy+=G*1.5*dt; r.y+=r.vy*dt;   /* ⭐まっすぐ上がる（2026-09-24 本人「もう少しまっすぐ上がってもいいかも」）。⚠前は左右にゆらしていた */
      ctx.strokeStyle="rgba(255,230,170,.9)"; ctx.lineWidth=r.big?3.5:2.2;
      ctx.beginPath(); ctx.moveTo(r.px,r.py); ctx.lineTo(r.x,r.y); ctx.stroke();
      if(r.vy>=-40 || r.y<=r.ty){ burst(r); rockets.splice(i,1); }
    }
    for(var j=stars.length-1;j>=0;j--){
      var p=stars[j]; p.age+=dt;
      if(p.age>p.life){ stars.splice(j,1); continue; }
      var k2=p.age/p.life;
      if(p.flash){
        var R=p.s*(1+k2*3), g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,R);
        g.addColorStop(0,"rgba(255,255,240,"+(1-k2)+")"); g.addColorStop(1,"rgba(255,255,240,0)");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,R,0,6.3); ctx.fill(); continue;
      }
      p.px=p.x; p.py=p.y;
      /* はじめ勢いよく、すぐ空気で止まって、あとは垂れる */
      p.vx*=Math.pow(0.28,dt); p.vy=p.vy*Math.pow(0.28,dt)+G*0.42*dt;
      p.x+=p.vx*dt; p.y+=p.vy*dt;
      var col=(p.col2 && k2>0.5) ? p.col2 : p.col;
      var a=k2<0.6 ? 1 : 1-(k2-0.6)/0.4;
      if(k2>0.7 && Math.random()<.3) continue;                     // 消えぎわに、ちらちら
      ctx.globalAlpha=a; ctx.strokeStyle=col; ctx.lineWidth=p.w*(1-k2*0.5);
      ctx.beginPath(); ctx.moveTo(p.px,p.py); ctx.lineTo(p.x+0.01,p.y); ctx.stroke();
      ctx.globalAlpha=1;
    }
    ctx.globalCompositeOperation="source-over";
    if(!done || rockets.length || stars.length) return true;
    night.classList.remove("on");
    setTimeout(function(){ if(night.parentNode) night.remove(); if(c.cv.parentNode) c.cv.remove(); },900);
    return false;
  });
}

/* ----- くす玉：上から下りてきて、パカッと割れる。垂れ幕と紙吹雪 ----- */
/* ⭐玉は大きく、上半分は画面の外（2026-09-24 本人「玉自体は全部出てこなくてもいいから大きくしてみて」「半分くらい出現くらいで」）
   ＝玉の中心を画面の上の端に置く。垂れ幕は玉の大きさに引っぱられないよう、同じ絵の中で長さを決めている */
function kusuSvg(){
 var B=banner();
 return '<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg">'+
 '<defs>'+
 '<filter id="kshadow" x="-30%" y="-10%" width="160%" height="120%"><feDropShadow dx="4" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".35"/></filter>'+
 '<radialGradient id="kg" cx="30%" cy="60%" r="80%"><stop offset="0" stop-color="#ffe98a"/><stop offset=".55" stop-color="#f2b82c"/><stop offset="1" stop-color="#c98a10"/></radialGradient>'+
 '<radialGradient id="kp" cx="70%" cy="60%" r="80%"><stop offset="0" stop-color="#ffe98a"/><stop offset=".55" stop-color="#f2b82c"/><stop offset="1" stop-color="#c98a10"/></radialGradient>'+
 '</defs>'+
 /* 垂れ幕（割れると下りる） */
 '<g class="banner">'+B+'</g>'+
 /* 左半分・右半分（玉のてっぺん＝画面の外を軸に開く）。⭐どちらもゴールド（2026-09-24 本人「どっちもゴールドにしてみて」）。⚠前は右がピンク */
 '<g class="half l"><path d="M250 -175 A175 175 0 0 0 250 175 Z" fill="url(#kg)"/><path d="M250 -175 A175 175 0 0 0 250 175" fill="none" stroke="#b07a0c" stroke-width="3"/>'+
 '</g>'+
 '<g class="half r"><path d="M250 -175 A175 175 0 0 1 250 175 Z" fill="url(#kp)"/><path d="M250 -175 A175 175 0 0 1 250 175" fill="none" stroke="#b07a0c" stroke-width="3"/></g>'+
 '</svg>';
}
/* 垂れ幕：縦書き。⭐「/」で2行に（2026-09-24 本人「文字は長くなったら2行で改行したいね」「/の仕組みつかおう」＝簡単スライドと同じ）
   ⭐改行したほう（2行目）は2文字ぶん下げて始める（本人「改行したほうは2文字くらいインデントとってね」）。
   1行目が右。長いときは文字を小さくして収める */
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
var KUSU_INDENT=2, KUSU_BY=110, KUSU_DEF="みんな/よくできました";   // KUSU_DEF＝空のときの言葉（欄のグレーの見本と同じ）   // KUSU_BY＝帯の上の端
function banner(){
  var raw=($("inKusu").value||"").trim() || KUSU_DEF;   // 空なら見本の言葉のまま
  var cols=raw.split(/[\/／]+/).map(function(c){ return c.trim(); }).filter(Boolean).slice(0,2);
  if(!cols.length) cols=KUSU_DEF.split("/");
  var n=Math.max.apply(null, cols.map(function(c,i){ return c.length+(i>0?KUSU_INDENT:0); }));
  var fs=Math.max(14, Math.min(34, Math.floor(262/(n*1.12))));
  var sp=Math.round(fs*0.12);
  /* ⭐2行のときは行間を詰めて、まん中に寄せる（2026-09-24 本人「くす玉の改行、中央に寄せて（行間を詰めてほしい）」）＝行の中心の間＝字の1.2倍 */
  var gapX=Math.round(fs*1.2);
  var w=cols.length===2 ? Math.max(86, gapX+fs+36) : 86, x0=250-w/2;
  /* ⭐帯に影（2026-09-24 本人「文字が書いてある帯」に影を） */
  /* ⭐帯はもっと下（2026-09-24 本人「くす玉の紙はもっとしたでいいよ」）＝玉から金のひもで吊って、帯の上の端を y=110 に。⚠前は y=30 */
  var BY=KUSU_BY;
  var h='<line x1="250" y1="0" x2="250" y2="'+BY+'" stroke="#d9a93a" stroke-width="4"/>'+
        '<rect x="'+x0+'" y="'+BY+'" width="'+w+'" height="290" rx="5" fill="#fff" stroke="#e2403f" stroke-width="4" filter="url(#kshadow)"/>';
  cols.forEach(function(c,i){
    var cx=cols.length===2 ? (i===0 ? 250+gapX/2 : 250-gapX/2) : 250;
    var y=BY+14+(i>0 ? KUSU_INDENT*(fs+sp) : 0);
    h+='<text x="'+cx+'" y="'+y+'" font-size="'+fs+'" font-weight="800" fill="#e2403f" style="writing-mode:vertical-rl" letter-spacing="'+sp+'">'+esc(c)+'</text>';
  });
  return h;
}
/* すりガラスを1枚かぶせる（ボタンの上まで）＝うしろを見えにくく */
function addFrost(){
  var fr=document.createElement("div"); fr.className="frost";
  var fb=fxBox(), fh=fb.height; if(!$("runScreen").hidden){ var bb=$("runBtns").getBoundingClientRect(); if(bb.top-fb.top>80) fh=bb.top-fb.top-14; }
  fr.style.height=fh+"px"; $("fx").appendChild(fr); return fr;
}
function kusudama(){
  /* ⭐くす玉のうしろも見えにくく（2026-09-24 本人「これも後ろが見えにくいほうがいいな」） */
  var fr=addFrost();
  var box=document.createElement("div"); box.className="pic kusu"; box.innerHTML=kusuSvg();
  $("fx").appendChild(box);
  later(function(){
    box.classList.add("open");
    var fb=fxBox(), r=box.getBoundingClientRect(), k=r.width/500, L=r.left-fb.left, T=r.top-fb.top;
    confetti({kusu:{cx:L+r.width/2, top:T, ballR:175*k, bTop:T+KUSU_BY*k, bBot:T+(KUSU_BY+290)*k}});
  }, 800);
  later(function(){ box.classList.add("bye"); fr.classList.add("bye"); }, 6500);
  later(function(){ if(box.parentNode) box.remove(); if(fr.parentNode) fr.remove(); }, 7200);
}

/* ----- 爆弾：転がってきて、赤くふくらんで → ドカン ----- */
var BOMB_SVG=
 '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">'+
 '<defs><radialGradient id="bg1" cx="36%" cy="34%" r="70%"><stop offset="0" stop-color="#6a6f7a"/><stop offset=".45" stop-color="#2a2d34"/><stop offset="1" stop-color="#0d0e12"/></radialGradient></defs>'+
 '<path d="M128 52 C142 30 158 30 168 18" fill="none" stroke="#b08a57" stroke-width="6" stroke-linecap="round"/>'+
 '<rect x="112" y="46" width="30" height="22" rx="4" transform="rotate(38 127 57)" fill="#3a3d45"/>'+
 '<circle cx="92" cy="118" r="66" fill="url(#bg1)"/>'+
 '<ellipse cx="66" cy="90" rx="16" ry="10" fill="#fff" opacity=".25" transform="rotate(-35 66 90)"/>'+
 '<g class="spark"><circle cx="170" cy="16" r="10" fill="#ffd60a"/><circle cx="170" cy="16" r="5" fill="#fff"/>'+
 '<path d="M170 0 L173 12 L186 16 L173 20 L170 32 L167 20 L154 16 L167 12 Z" fill="#ff9100"/></g>'+
 '</svg>';
/* ⭐間に合わなかったと気づいて、画面を見てからドカン（2026-09-24 本人「画面見てドカンがいいから、コロコロ転がしてきて」）
   ＝①横から転がってくる（1.6秒）②止まって赤くふくらむ（導火線が速くなる）③2.8秒でドカン */
function bomb(isTry){
  var box=document.createElement("div"); box.className="pic bomb"; box.innerHTML=BOMB_SVG;
  $("fx").appendChild(box);
  later(function(){ box.classList.add("tense"); }, 1650);
  later(function(){ box.classList.add("tense2"); }, 2350);
  later(function(){
    var fb=fxBox(), r=box.getBoundingClientRect(), cx=r.left-fb.left+r.width*0.46, cy=r.top-fb.top+r.height*0.59;
    box.classList.add("gone");
    var fl=document.createElement("div"); fl.className="flash"; $("fx").appendChild(fl);
    setTimeout(function(){ fl.classList.add("go"); },10);
    explosion(cx,cy,r.width);
    /* ⚠画面（数字）は揺らさない（2026-09-24 本人「爆弾の数字が揺れるのはなしで」） */
  }, 2800);
  later(function(){ $("fx").querySelectorAll(".bomb,.flash").forEach(function(e){ e.remove(); }); }, 5200);
}
/* ⭐爆発は少し透かして、うしろの時間が見えるように（2026-09-24 本人「塗りつぶさずに、少し透過して時間を見せて」「ちょっと派手すぎるかも」）＝EXP_ALPHA
   ⭐黒い丸より、赤い爆発。破裂して飛ぶ（2026-09-24 本人「黒い丸丸より爆発っぽい赤い雰囲気（黒もあってもいいんだけど）なんか破裂して飛ぶ感じ」）
   ＝ギザギザの爆発の形（赤・橙・黄の3重）が一気に広がる／とがった破片が回りながら飛ぶ（黒は2割だけ）／放射状の線／火の粉 */
var EXP_ALPHA=0.55;   // ギザギザの爆発の濃さ（1＝塗りつぶし）
function explosion(cx,cy,size){
  var c=makeCanvas(), ctx=c.ctx, W=c.W, H=c.H;
  var M=Math.max(W,H), base=Math.max(size||200, Math.min(W,H)*0.35);
  var HOT=["#ff2a1a","#ff5a1f","#ff8a00","#ffc400","#ffe45c"];
  /* ギザギザの形（とげの長さは毎回ちがう） */
  var spikes=16, star=[];
  for(var i=0;i<spikes*2;i++) star.push(i%2===0 ? 1 : 0.52+Math.random()*0.16);
  /* ⚠重ねた色ごとに透かすと、まん中が濃く重なって時間が見えない。
     ⭐別の紙に4色をふつうに描いてから、その紙をまとめて1回だけ透かして重ねる */
  var bc=document.createElement("canvas"); bc.width=c.cv.width; bc.height=c.cv.height;
  var bx=bc.getContext("2d"); bx.scale(window.devicePixelRatio||1, window.devicePixelRatio||1);
  function drawStar(R,col,rot){
    var ctx=bx;
    ctx.beginPath();
    for(var i=0;i<star.length;i++){
      var a=rot+i*Math.PI/spikes, rr=R*star[i]*(i%2===0 ? (0.85+((i*37)%10)/40) : 1);
      var x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath(); ctx.fillStyle=col; ctx.fill();
  }
  /* 破片 */
  var shards=[];
  for(var j=0;j<90;j++){
    var a=Math.random()*Math.PI*2, v=500+Math.random()*1300, dark=Math.random()<.2;
    var n=3+Math.floor(Math.random()*2), pts=[];
    for(var k=0;k<n;k++){ var aa=k/n*Math.PI*2+Math.random()*0.6; var rr=(0.5+Math.random())*(6+Math.random()*12); pts.push([Math.cos(aa)*rr*1.6,Math.sin(aa)*rr]); }
    shards.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,rot:Math.random()*6,vr:(Math.random()-.5)*24,
                 pts:pts,col:dark?"#26211f":HOT[Math.floor(Math.random()*HOT.length)],life:0.9+Math.random()*0.9,age:0});
  }
  /* 放射状の線 */
  var lines=[];
  for(var m=0;m<28;m++){ var a2=Math.random()*Math.PI*2; lines.push({a:a2,v:1600+Math.random()*1400,len:60+Math.random()*120,w:2+Math.random()*4}); }
  /* 火の粉 */
  var sparks=[];
  for(var q=0;q<120;q++){ var a3=Math.random()*Math.PI*2, v3=200+Math.random()*900;
    sparks.push({x:cx,y:cy,vx:Math.cos(a3)*v3,vy:Math.sin(a3)*v3,life:0.5+Math.random()*1.1,age:0,col:HOT[2+Math.floor(Math.random()*3)],s:1.5+Math.random()*2.5}); }
  var rot0=Math.random();
  loop(function(dt,t){
    ctx.clearRect(0,0,W,H);
    /* 画面ぜんたいが一瞬赤く染まる */
    if(t<0.9){ ctx.fillStyle="rgba(255,40,10,"+(0.14*(1-t/0.9))+")"; ctx.fillRect(0,0,W,H); }
    /* ギザギザの爆発：0.22秒で一気に広がって、そのあと消えていく */
    if(t<1.1){
      var g=Math.min(1,t/0.22), R=base*(0.4+g*1.25)*(1+Math.max(0,t-0.22)*0.35), al=t<0.35 ? 1 : Math.max(0,1-(t-0.35)/0.75);
      bx.clearRect(0,0,W,H);
      drawStar(R*1.18,"#d4140c",rot0);
      drawStar(R*0.92,"#ff6a00",rot0+0.12);
      drawStar(R*0.62,"#ffc400",rot0+0.05);
      drawStar(R*0.34,"#fff6c2",rot0+0.2);
      ctx.globalAlpha=al*EXP_ALPHA;
      ctx.drawImage(bc,0,0,W,H);
      ctx.globalAlpha=1;
    }
    /* 放射状の線 */
    if(t<0.45){
      ctx.lineCap="round";
      for(var i=0;i<lines.length;i++){
        var L=lines[i], d=base*0.3+L.v*t, x1=cx+Math.cos(L.a)*d, y1=cy+Math.sin(L.a)*d, x2=cx+Math.cos(L.a)*(d+L.len), y2=cy+Math.sin(L.a)*(d+L.len);
        ctx.strokeStyle="rgba(255,236,150,"+(1-t/0.45)+")"; ctx.lineWidth=L.w;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      }
    }
    /* 破片 */
    var alive=0;
    for(var j=0;j<shards.length;j++){
      var p=shards[j]; p.age+=dt; if(p.age>p.life) continue; alive++;
      p.vx*=Math.pow(0.25,dt); p.vy=p.vy*Math.pow(0.25,dt)+900*dt;
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.vr*dt;
      ctx.globalAlpha=Math.min(0.85,(1-p.age/p.life)*1.6);
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.col;
      ctx.beginPath(); ctx.moveTo(p.pts[0][0],p.pts[0][1]); for(var k=1;k<p.pts.length;k++) ctx.lineTo(p.pts[k][0],p.pts[k][1]); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    /* 火の粉 */
    ctx.globalCompositeOperation="lighter";
    for(var q=0;q<sparks.length;q++){
      var s=sparks[q]; s.age+=dt; if(s.age>s.life) continue; alive++;
      s.vx*=Math.pow(0.3,dt); s.vy=s.vy*Math.pow(0.3,dt)+300*dt;
      s.x+=s.vx*dt; s.y+=s.vy*dt;
      ctx.globalAlpha=1-s.age/s.life; ctx.fillStyle=s.col;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,6.3); ctx.fill();
    }
    ctx.globalCompositeOperation="source-over"; ctx.globalAlpha=1;
    if(t<2.4 && (alive || t<1.1)) return true;
    if(c.cv.parentNode) c.cv.remove();
    return false;
  });
}

/* ----- 幕：上の飾り幕が下りて、左右のカーテンが真ん中へ閉まる（3つの部品）。ボタンの上で止まる ----- */
/* ⭐幕が閉まる前に「残念」が小さい字から大きく出る。タイマーはグレーに（2026-09-24 本人「幕が締まる前に残念って小さい文字から大きな文字に拡大して（タイマーはグレーアウト）幕閉めようか」） */
var CUR_WAIT=1200;   // 「ざんねん」が出てから幕が動き出すまで（ミリ秒）。⚠前は1500（字が出るのを速くしたぶん詰めた）
function curtain(isTry){
  if(!isTry) $("runScreen").classList.add("gray");
  /* ⭐うしろはすりガラス＝全部を見えにくく（2026-09-24 本人「文字を出すからもっとガラスっぽく全部を見えにくくしよう」）
     ⚠下の端はボタンの上まで＝もどるは見えたまま押せる（幕と同じ高さ） */
  var fr=document.createElement("div"); fr.className="frost";
  var fb=fxBox(), fh=fb.height; if(!isTry){ var bb=$("runBtns").getBoundingClientRect(); if(bb.top-fb.top>80) fh=bb.top-fb.top-14; }
  fr.style.height=fh+"px"; $("fx").appendChild(fr);
  /* ⭐ひらがな・大きく・すばやく（本人「もっとスピードアップで出して、大きい字にして。ひらがなにしよう」） */
  /* ⭐言葉は先生が打つ（はじめは「ざんねん」）。「/」で2行。長いときは字を小さくして画面に収める */
  var lines=(($("inZan").value||"").trim()||"ざんねん").split(/[\/／]+/).map(function(t){ return t.trim(); }).filter(Boolean).slice(0,2);
  if(!lines.length) lines=["ざんねん"];
  var n=Math.max(4, Math.max.apply(null, lines.map(function(t){ return t.length; })));
  var msg=document.createElement("div"); msg.className="zannen";
  lines.forEach(function(t,i){ if(i) msg.appendChild(document.createElement("br")); msg.appendChild(document.createTextNode(t)); });
  msg.style.fontSize="min("+(lines.length>1 ? 18 : 25)+"cqmin, "+(72/n).toFixed(2)+"cqw, 240px)";
  $("fx").appendChild(msg);
  later(function(){ curtainClose(isTry); }, CUR_WAIT);
}
function curtainClose(isTry){
  var el=document.createElement("div"); el.className="curtain";
  var fb=fxBox(), h=fb.height*0.88;
  if(!isTry){ var b=$("runBtns").getBoundingClientRect(); if(b.top-fb.top>80) h=b.top-fb.top-14; }
  el.style.setProperty("--ch", h+"px");
  /* 上の飾り幕＝波形のすそ（スワッグ）に金の縁と小さい房。絵で描く */
  var W=fb.width, VH=Math.max(40, Math.min(110, fb.height*0.13)), n=Math.max(4, Math.round(W/170)), sw=W/n, dep=VH*0.38, top=VH-dep;
  var d="M0 0 H"+W+" V"+top.toFixed(1), g="", tas="";
  for(var i=n;i>0;i--){ var x1=i*sw, x0=(i-1)*sw; d+=" Q"+((x0+x1)/2).toFixed(1)+" "+(top+dep*2).toFixed(1)+" "+x0.toFixed(1)+" "+top.toFixed(1); }
  d+=" Z";
  for(var j=0;j<n;j++){ var a0=j*sw, a1=(j+1)*sw;
    g+='<path d="M'+a0.toFixed(1)+' '+top.toFixed(1)+' Q'+((a0+a1)/2).toFixed(1)+' '+(top+dep*2).toFixed(1)+' '+a1.toFixed(1)+' '+top.toFixed(1)+'" fill="none" stroke="#e2b34a" stroke-width="4"/>';
    if(j>0) tas+='<g transform="translate('+a0.toFixed(1)+' '+top.toFixed(1)+')"><circle r="6" fill="#e2b34a"/><path d="M-5 4 L5 4 L7 26 L-7 26 Z" fill="#d9a93a"/><path d="M-7 26 L7 26" stroke="#b8862a" stroke-width="2"/></g>';
  }
  var val='<svg class="valance" viewBox="0 0 '+W+' '+(VH+30)+'" width="'+W+'" height="'+(VH+30)+'" preserveAspectRatio="none">'+
    '<defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1430"/><stop offset=".7" stop-color="#1b2c58"/><stop offset="1" stop-color="#121f42"/></linearGradient></defs>'+
    '<path d="'+d+'" fill="url(#vg)"/>'+g+'<rect x="0" y="0" width="'+W+'" height="8" fill="#d9a93a"/>'+tas+'</svg>';
  el.innerHTML='<div class="side l"></div><div class="side r"></div>'+val;
  $("fx").appendChild(el);
  if(isTry){   /* ためしのときは、閉まりきって少ししたら開いて消える */
    later(function(){ el.classList.add("open"); }, 4400);
    later(function(){ if(el.parentNode) el.remove(); $("fx").querySelectorAll(".zannen,.frost").forEach(function(z){ z.remove(); }); }, 6000);
  }
}

/* ⚠ガラスにヒビは中止（2026-09-24 本人「ガラスにひびは中止」）。戻すときは _もどす/2026-09-24_見本を16対9の枠にする前 */

/* ----- 画面が揺れる（⚠選ぶ仕掛けからは外した。爆弾の中で使う） ----- */
function shakeTarget(isTry){
  var el=isTry ? $("setScreen") : $("runScreen");
  el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
  later(function(){ el.classList.remove("shake"); }, 2600);
}
function shake(isTry){ shakeTarget(isTry); }

/* ⚠見本の小窓はやめた（2026-09-24 本人「見本いらないや」） */
loadSaved();
showKusuRow();
showWarn();
refreshSaved();
})();
