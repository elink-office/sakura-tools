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

var rate=1, demoTimer=0, demoTiles=false, DEMO_TILES=60, tilePre=0;   // rate＝時計の速さ（見本は6秒で終わるように速くする）
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
    if(s.lose) $("selLose").value=(s.lose==="bomb2" ? "bomb" : s.lose);   // ⚠爆弾（ドンドンドーン）は「爆弾」＋増やす数にまとめた
    if(!$("selLose").value) $("selLose").value="bomb";      // ⚠「画面が揺れる」はやめた（前の保存に残っていても爆弾に）
    $("selBombs").value=String(s.bombs!=null ? s.bombs : (s.lose==="bomb2" ? 2 : 0));
    if(s.view) setView(s.view);
    /* ⚠前のはじめの言葉（「よくできました」「ざんねん」）がそのまま残っていたら空にする＝グレーの見本が見えるように */
    if(s.kusu!=null) $("inKusu").value=(s.kusu==="よくできました" ? "" : s.kusu);
    if(s.zan!=null) $("inZan").value=(s.zan==="ざんねん" ? "" : s.zan);
    if(s.sel) loadedId=s.sel;
  }catch(e){}
}
function save(){
  if(sampleOn) return;             // ⭐サンプルの間は保存しない（ページの型 12-a）
  if(PEEK) return;                 // 🟡今だけの見本（?sample）の間も、最後に入れた内容を書きかえない
  try{
    localStorage.setItem(KEY, JSON.stringify({
      m:num("inMin",99), s:num("inSec",59), wm:num("inWarnMin",99), ws:num("inWarnSec",59), wo:$("warnOn").checked,
      win:$("selWin").value, lose:$("selLose").value, bombs:+$("selBombs").value, view:view, kusu:$("inKusu").value, zan:$("inZan").value, sel:loadedId
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

/* ⭐タイルはやめた＝見せ方は丸だけ（2026-09-26 本人「どっちにしてもマス、微妙なんだよね」「やめようかな」→「①を横に太くして、その中で2列」「番号も詰める」）
   ⚠前にタイルで保存したデータも、丸で動く。タイルの仕組み（buildTiles など）は view が "tile" にならないので動かない。
   戻すときは _もどす/2026-09-26_タイルをやめて①を横長にする前 */
function setView(){ view="ring"; }
/* 赤にするのチェック＝外したら時間の欄をうすく・押せなく */
function showWarn(){
  var on=$("warnOn").checked;
  document.querySelector(".tm-warn").classList.toggle("off",!on);
  $("inWarnMin").disabled=!on; $("inWarnSec").disabled=!on;
}
$("warnOn").addEventListener("change",function(){ showWarn(); save(); });
/* くす玉を選んだときだけ、文字の欄を出す */
function showKusuRow(){ $("kusuRow").hidden = $("selWin").value!=="kusudama"; $("zanRow").hidden = $("selLose").value!=="curtain"; $("bombRow").hidden = $("selLose").value!=="bomb"; }
$("selWin").addEventListener("change",function(){ showKusuRow(); save(); });
$("inKusu").addEventListener("input",save);
$("selLose").addEventListener("change",function(){ showKusuRow(); save(); });
$("inZan").addEventListener("input",save);
$("selBombs").addEventListener("change",save);
/* ⭐見本を見る＝16:9 の枠の中で本番と同じ画面を動かす（時間は縮めない） */
$("demoBtn").addEventListener("click",function(){ start({demo:true}); });
/* ⭐見本：間に合ったとき＝途中で自動で「できた」（2026-09-26 本人「私いつも忘れる。押すのを」） */
$("demoWinBtn").addEventListener("click",function(){ start({demo:true, win:true}); });
/* ⭐「ためしに見る」の仕掛けは、どこかを押すか Esc で消える（2026-09-24 本人「幕、確認したらどうやって閉じるかわかんない」）
   ＝幕・ヒビのように残るものは、少し待っても自分で消える（tryAutoClear） */
document.addEventListener("click",function(e){
  if(!$("runScreen").hidden) return;
  if(e.target.closest("#demoBtn,#demoWinBtn")) return;
  if($("fx").children.length) clearFx();
});
document.addEventListener("keydown",function(e){
  if(e.key==="Escape" && $("runScreen").hidden && $("fx").children.length) clearFx();
});

/* ===== 名前を付けて保存（ページの型 3・4-c＝座席表の⑦と同じ作法）＝このタイマーだけの置き場。名簿・進行タイマーとは別
   ⭐名前は［新しい名前で保存］を押したときに聞く（簡単スライドと同じ prompt）
   ⭐呼び出しは①の「このデータを自動入力」。④の「保存済のデータ」は上書き・削除の相手を選ぶもの ===== */
var STORE="sakura-tools-countdown-v1", LIMIT=20, loadedId="";
/* 🟡今だけの見本（2026-09-26 本人「今だけ、サンプルで、保存の内容を書ける？どこに表示されるのか見たい」）
   ＝アドレスの最後に ?sample を付けたときだけ、保存が2件あるように見せる。本当の保存（ブラウザの中）には書かない・読まない
   ⚠見終わったら、この仕込み（PEEK と下の3か所の if(PEEK)）を外す */
var PEEK=/[?&]sample\b/.test(location.search);
var PEEK_ITEMS=[
  {id:"peek1", name:"小テスト 10分", m:10, s:0, wm:1, ws:0, wo:true, view:"ring", win:"kusudama", lose:"volcano", kusu:"みんな/よくできました", zan:""},
  {id:"peek2", name:"給食の準備", m:15, s:0, wm:3, ws:0, wo:true, view:"ring", win:"confetti", lose:"curtain", kusu:"", zan:"ざんねん"}
];
function loadStore(){ if(PEEK) return {v:1,items:PEEK_ITEMS.slice()}; try{ var d=JSON.parse(localStorage.getItem(STORE)||"null"); if(d && d.items) return d; }catch(e){} return {v:1,items:[]}; }
function writeStore(d){ if(PEEK) return true; try{ localStorage.setItem(STORE, JSON.stringify(d)); return true; }catch(e){ return false; } }
function findItem(id){ if(!id) return null; var d=loadStore(); for(var i=0;i<d.items.length;i++) if(d.items[i].id===id) return d.items[i]; return null; }
function current(name){
  return {name:name, m:num("inMin",99), s:num("inSec",59), wm:num("inWarnMin",99), ws:num("inWarnSec",59), wo:$("warnOn").checked,
          view:view, win:$("selWin").value, lose:$("selLose").value, bombs:+$("selBombs").value, kusu:$("inKusu").value, zan:$("inZan").value};
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
  /* ⭐②呼び出しは0件でも出したまま。中をグレーにして押せなくする（2026-09-26 本人「使わないときはグレーアウト②のまま」） */
  var none=d.items.length===0;
  $("recallRow").classList.toggle("empty", none);
  $("selSaved2").disabled=none; $("loadSaved2").disabled=none; $("delSaved2").disabled=none;
  $("saveCount").textContent=d.items.length+"/"+LIMIT;
}
function applyItem(it){
  $("inMin").value=String(it.m); $("inSec").value=pad(it.s);
  $("inWarnMin").value=String(it.wm); $("inWarnSec").value=pad(it.ws);
  $("warnOn").checked=(it.wo!==false); showWarn();
  setView(it.view); $("selWin").value=it.win; $("selLose").value=(it.lose==="bomb2" ? "bomb" : it.lose); $("inKusu").value=it.kusu||""; $("inZan").value=(it.zan||"");
  $("selBombs").value=String(it.bombs!=null ? it.bombs : (it.lose==="bomb2" ? 2 : 0));
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
  if(total<=0 && !opt.demo){ $("setMsg").textContent="時間を入れてください。"; $("inMin").focus(); return; }
  $("setMsg").textContent="";
  warnAt=$("warnOn").checked ? num("inWarnMin",99)*60+num("inWarnSec",59) : 0;   // チェックを外したら赤にしない
  save();
  clearFx();
  clearTimeout(demoTimer);
  /* ⭐見本は5秒で0まで（2026-09-24 本人「見本は5秒に固定で行こう」）
     ⭐時間切れの見本は3秒（2026-09-26 本人「間に合わなかったときは、3秒にして」） */
  var demoSec=opt.win ? 5 : 3;
  /* ⭐見本は設定した時間を使わず、見本の秒数から数える（2026-09-26 本人「設定時間無視して、3秒からだよ。飛び出す見本だから」）
     ⚠前は設定した時間を見本の秒数に早送りしていた（10秒なら10→0を3秒で） */
  if(opt.demo) total=demoSec;
  demoTiles=!!opt.demo;
  rate=1;
  $("demoBadge").textContent="見本（"+demoSec+"秒）";
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
  if(opt.win) demoTimer=setTimeout(function(){ if(running) doneNow(); }, 2600);   // 5秒のうち2.6秒のところで「できた」
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
  if(view==="tile") fillTiles(tilePre+Math.floor((total-remain)/tileStep+1e-6));
}

/* ===== タイル ===== */
function buildTiles(){
  var box=$("tiles"); box.innerHTML="";
  tileStep=Math.max(1, Math.ceil(total/TILE_MAX));
  TILE_N=Math.max(1, Math.ceil(total/tileStep));
  /* ⭐見本は60マス（1分に設定したときと同じ並び）（2026-09-26 本人「見本のタイルが…おおきすぎること」＝3秒だと3マスだった）
     ⭐最後の数秒だけを見せる＝はじめから（60－見本の秒数）マス埋まっていて、残りを1秒1マスで埋める（本人「60マスでいいんだけど、最後の3秒からでいい」） */
  tilePre=0;
  if(demoTiles){ TILE_N=DEMO_TILES; tileStep=1; tilePre=Math.max(0,DEMO_TILES-total); }
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
    /* ⭐見本は、はじめから埋まっているマスは赤にしない＝赤は見本の数秒で埋まるマスだけ（2026-09-26 本人「赤になるのが多いね」） */
    var hot=demoTiles ? (warnAt>0 && tilesOn>=tilePre) : (warnAt>0 && total-tilesOn*tileStep<=warnAt);
    if(hot) t.classList.add("hot"); tilesOn++; }
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
  /* ⭐爆弾は小さい爆弾を0〜4個増やせる（2026-09-26 本人「全部で５個だから、小さい爆弾を４つまで追加」「デフォルトは１個の時と、増やすを１～４にしよう」） */
  if(kind==="bomb"){ var nb=+$("selBombs").value||0; if(nb>0) bomb2(isTry, nb); else bomb(isTry); }
  else if(kind==="bomb2") bomb2(isTry, 2);
  else if(kind==="volcano") volcano(isTry);
  else if(kind==="volcano2") volcano(isTry, true);
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
    /* ⭐大玉の割れる瞬間の光は小さく（2026-09-26 本人「最後の大玉の前の光が大きすぎる」）。⚠前は big＝半径80・0.45秒（4倍まで広がる） */
    stars.push({flash:true,x:r.x,y:r.y,age:0,life:big?0.3:0.28,s:big?40:36});
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
/* ----- 爆弾（ドンドンドーン）：大きい爆弾と、小さい爆弾2つが転がってくる → ドン・ドン・ドーン -----
   ⭐2つ目の爆弾（2026-09-26 本人「爆弾も小さいのがあと２つくらい転がってきて、ドンドンドーンも面白いかも」→「爆弾も、２パターン目で」）
   ＝大きいのは今の爆弾と同じ動き。小さいのは左右から少しおくれて転がってきて、先に1つずつドン。最後に大きいのがドーン
   ⚠消すのはすぐ（runLose の bomb2 と選択肢を外す） */
/* ⭐数は先生が選ぶ（0〜4個・2026-09-26）。置き場所＝1つ目 左下・2つ目 右下・3つ目 左上・4つ目 右上。ドンの順もこの順 */
var MINI_POS=["l","r","l2","r2"];
function bomb2(isTry, n){
  n=Math.max(1,Math.min(4,n||2));
  var big=document.createElement("div"); big.className="pic bomb"; big.innerHTML=BOMB_SVG;
  var minis=[];
  for(var i=0;i<n;i++){ var m=document.createElement("div"); m.className="pic bomb mini "+MINI_POS[i]; m.innerHTML=BOMB_SVG; $("fx").appendChild(m); minis.push(m); }
  $("fx").appendChild(big);
  function boom(el, small){
    var fb=fxBox(), r=el.getBoundingClientRect(), cx=r.left-fb.left+r.width*0.46, cy=r.top-fb.top+r.height*0.59;
    el.classList.add("gone");
    if(!small){ var fl=document.createElement("div"); fl.className="flash"; $("fx").appendChild(fl); setTimeout(function(){ fl.classList.add("go"); },10); }
    explosion(cx,cy,r.width,small);
  }
  later(function(){ big.classList.add("tense"); minis.forEach(function(m){ m.classList.add("tense"); }); }, 1900);
  /* 小さいのが0.5秒おきにドン、最後に大きいのがドーン */
  minis.forEach(function(m,i){
    later(function(){ m.classList.add("tense2"); }, 2200+i*500);
    later(function(){ boom(m,true); }, 2500+i*500);                // ドン
  });
  var bigAt=2500+n*500+200;
  later(function(){ big.classList.add("tense2"); }, bigAt-550);
  later(function(){ boom(big,false); }, bigAt);                     // ドーン
  later(function(){ $("fx").querySelectorAll(".bomb,.flash").forEach(function(e){ e.remove(); }); }, bigAt+2400);
}
/* ⭐爆発は少し透かして、うしろの時間が見えるように（2026-09-24 本人「塗りつぶさずに、少し透過して時間を見せて」「ちょっと派手すぎるかも」）＝EXP_ALPHA
   ⭐黒い丸より、赤い爆発。破裂して飛ぶ（2026-09-24 本人「黒い丸丸より爆発っぽい赤い雰囲気（黒もあってもいいんだけど）なんか破裂して飛ぶ感じ」）
   ＝ギザギザの爆発の形（赤・橙・黄の3重）が一気に広がる／とがった破片が回りながら飛ぶ（黒は2割だけ）／放射状の線／火の粉 */
var EXP_ALPHA=0.55;   // ギザギザの爆発の濃さ（1＝塗りつぶし）
function explosion(cx,cy,size,small){
  var c=makeCanvas(), ctx=c.ctx, W=c.W, H=c.H;
  var M=Math.max(W,H), base=small ? size*0.9 : Math.max(size||200, Math.min(W,H)*0.35);   // small＝小さい爆弾（ドンドンドーンのドン）
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

/* ----- 火山：下からせり上がって、ゴゴゴ → 噴火。岩がこっちへ飛んでくる -----
   ⭐迫力満点で・文字はなし・石（岩）がこっちに飛んでくる（2026-09-25 本人。知り合いの先生からのリクエスト）
   ＝①せり上がる（1秒）②ゴゴゴと震えて火口が赤く光る ③2.2秒で噴火＝溶岩の噴水・煙・岩
   ⭐岩は奥から手前へ（遠近）＝小さく出て、大きくなりながら左右にそれて画面の外へ抜ける
   ⭐直し（2026-09-26 本人「手前に飛んできすぎ」「石っぽくない」「溶岩もやりすぎ」「ゴゴゴはいい」「目の前よりそらして」）
     ＝まん中に当たる岩はやめた・岩は灰色の石・溶岩の噴水はひかえめ
   ⚠数字は揺らさない（爆弾と同じ）＝揺れるのは火山の絵だけ */
/* ⭐火山（ドッカーン）＝boom（2026-09-26 本人「もっと先だけを見せて、冗談みたいに少し上にあげて広げた爆発もできる？」→「２つのバージョン…どっかーんで」）
   ＝山はてっぺんだけ下から顔を出す／噴火すると、火の柱と火の玉が上がって、上で割れて火の粉が飛び散る（⚠はじめはマンガの雲だった→本人「雲、へん」で火に）
   ＝ゴゴゴ・石（横へそれる石・手前の石2つ）は火山と同じ。⚠消すのはすぐ（runLose の volcano2 と選択肢を外す） */
function volcano(isTry, boom){
  var c=makeCanvas(), ctx=c.ctx, W=c.W, H=c.H, S=Math.min(W,H);
  var HOT=["#ff2a1a","#ff5a1f","#ff8a00","#ffc400","#ffe45c"];
  var ERUPT=2.2, END=8.2;
  var peakY=boom ? H*0.80 : H*0.46, cw=boom ? Math.max(W*0.09, S*0.12) : Math.max(W*0.07, S*0.09);     // 火口の高さ・火口の半分の幅
  var lava=[], smoke=[], rocks=[], sparks=[], impacts=[], slope=0;
  /* 岩の遠近：カメラ z=0、火口は奥の z=Z0 */
  var F=H*0.55, Z0=8, HX=W/2, HY=H*0.42, G=5.5;
  function rockShape(){
    var n=7+Math.floor(Math.random()*3), pts=[];
    for(var i=0;i<n;i++){ var a=i/n*Math.PI*2+Math.random()*0.35; var q=0.75+Math.random()*0.3; pts.push([Math.cos(a)*q, Math.sin(a)*q*0.85]); }
    return pts;
  }
  function addRock(){
    var Yc=(peakY-HY)*Z0/F, vz=-(3+Math.random()*2.4), r;
    /* ⭐目の前には来ない。左右にそれて、画面の外へ抜ける（2026-09-26 本人「目の前よりそらして」） */
    var side=Math.random()<.5?-1:1;
    r={X:side*Math.random()*0.3,Y:Yc,Z:Z0,vx:side*(2.2+Math.random()*3.8),vy:-(2.5+Math.random()*4),vz:vz,R:0.07+Math.random()*0.15};
    r.pts=rockShape(); r.rot=Math.random()*6.3; r.vr=(Math.random()-.5)*7;
    rocks.push(r);
  }
  /* ⭐手前に飛んでくる小さめの石を2つ（2026-09-26 本人「石が手前に飛んでくるの、小さめのを2つくらい」「グレーのいしでいいよ」）
     ⭐小さいところから、だんだん大きく。ぶつからずに下へ落ちる（本人「急に出てきた。小さいサイズから手前に飛んでくる感じ」「ぶつからずにおちるくらいがいい」）
     ⚠遠近の計算（1/距離）だと最後の一瞬で急に大きくなる＝画面の上で大きさと道すじを直接決める
     ＝火口から出て、山なりに上がり、大きくなりながら横へ、最後は画面の下へ落ちる（2.2秒）。いちばん大きくて画面の短い辺の12% */
  var fronts=[];
  function addFrontRock(side){
    fronts.push({age:0, D:2.2, side:side, pts:rockShape(), rot:Math.random()*6.3, vr:side*(1.5+Math.random())});
  }  function addSmoke(x,y,big){
    smoke.push({x:x+(Math.random()-.5)*cw, y:y, vx:(Math.random()-.5)*40, vy:-(big?120+Math.random()*160:40+Math.random()*50),
                r:(big?S*0.07:S*0.035)*(0.7+Math.random()*0.6), gr:big?S*0.12:S*0.05, age:0, life:big?(boom?20:4+Math.random()*2.5):1.8, big:big,
                col:Math.random()<.5?"60,52,50":"95,86,82"});
  }
  /* 岩が飛ぶ時間を先に決めておく（噴火のあと2.4秒のあいだに、はじめ多く） */
  var plan=[];
  for(var k=0;k<22;k++) plan.push({t:ERUPT+0.05+Math.pow(Math.random(),1.6)*2.6});
  plan.push({t:ERUPT+0.4, front:-1}); plan.push({t:ERUPT+1.3, front:1});
  plan.sort(function(a,b){ return a.t-b.t; });
  function drawMountain(off, glow, dx, dy){
    var cx=W/2+dx, py=peakY+off+dy, base=H+20+off;
    ctx.save();
    if(boom){
      /* ⭐ドッカーンは尾根＝山がいくつも並んで、その中の1つが噴火する（2026-09-26 本人「末広がりだとかわいく感じるから、尾根を作ってその中の１つっぽくしてみて」）
         奥にもう1本うすい尾根を置いて、奥行きを出す */
      var far=[[-0.05,0.86],[0.06,0.80],[0.15,0.85],[0.24,0.78],[0.34,0.84],[0.44,0.81],[0.56,0.82],[0.66,0.79],[0.77,0.85],[0.87,0.79],[0.97,0.84],[1.05,0.82]];
      ctx.beginPath(); ctx.moveTo(-W*0.05+dx, base);
      far.forEach(function(p){ ctx.lineTo(W*p[0]+dx, H*p[1]+off+dy); });
      ctx.lineTo(W*1.05+dx, base); ctx.closePath();
      ctx.fillStyle="rgba(58,40,36,.75)"; ctx.fill();
      /* ⭐手前の山は1つずつ独立させる（2026-09-26 本人「火山が出るのは１つの山。尾根は後ろはいいけど、手前の尾根は繋げずに独立？させて何個か作って」）
         ＝左右に山を2つずつ（それぞれ別の三角の山・ふちに薄い光）。火山はまん中に1つだけ、いちばん手前 */
      var hills=[[0.10,0.87,0.13,"#3b2a26"],[0.90,0.88,0.13,"#3b2a26"],[0.29,0.85,0.12,"#33241f"],[0.71,0.86,0.12,"#33241f"]];   // [まん中x, てっぺんy, 半分の幅, 色]
      hills.forEach(function(hh){
        var hx=W*hh[0]+dx, hy=H*hh[1]+off+dy, hw=W*hh[2];
        ctx.beginPath(); ctx.moveTo(hx-hw*1.6, base);
        ctx.quadraticCurveTo(hx-hw*0.5, hy+(base-hy)*0.35, hx, hy);
        ctx.quadraticCurveTo(hx+hw*0.5, hy+(base-hy)*0.35, hx+hw*1.6, base);
        ctx.closePath(); ctx.fillStyle=hh[3]; ctx.fill();
        ctx.lineWidth=Math.max(1.5,S*0.004); ctx.strokeStyle="rgba(255,150,100,.18)"; ctx.stroke();
      });
      /* 火山（まん中の1つ） */
      var vw=W*0.2;
      ctx.beginPath(); ctx.moveTo(cx-vw*1.5, base);
      ctx.quadraticCurveTo(cx-vw*0.55, py+(base-py)*0.3, cx-cw, py);
      ctx.quadraticCurveTo(cx, py+cw*0.34, cx+cw, py);
      ctx.quadraticCurveTo(cx+vw*0.55, py+(base-py)*0.3, cx+vw*1.5, base);
      ctx.closePath();
    }else{
    /* 山のかたち（すそが広い） */
    ctx.beginPath();
    ctx.moveTo(-W*0.05+dx, base);
    ctx.quadraticCurveTo(W*0.30+dx, py+(base-py)*0.62, cx-cw, py);
    ctx.quadraticCurveTo(cx, py+cw*0.34, cx+cw, py);
    ctx.quadraticCurveTo(W*0.70+dx, py+(base-py)*0.62, W*1.05+dx, base);
    ctx.closePath();
    }
    var g=ctx.createLinearGradient(0,py,0,base);
    g.addColorStop(0,"#4a3530"); g.addColorStop(.35,"#2c1f1c"); g.addColorStop(1,"#140d0b");
    ctx.fillStyle=g; ctx.fill();
    /* 左の斜面に光、右に影＝立体に見せる */
    ctx.clip();
    var sh=ctx.createLinearGradient(cx-W*0.4,0,cx+W*0.4,0);
    sh.addColorStop(0,"rgba(255,140,90,.10)"); sh.addColorStop(.5,"rgba(0,0,0,0)"); sh.addColorStop(1,"rgba(0,0,0,.35)");
    ctx.fillStyle=sh; ctx.fillRect(0,py,W,base-py);
    /* ⭐流れる溶岩の線はやめた（2026-09-26 本人「流れる溶岩がわざとっぽい」）
       ＝火口の下の斜面が、溶岩でぼんやり赤く照らされるだけにする */
    /* ⭐ドッカーン：火口から溶岩があふれて、山が上から溶岩色になっていく（lavaOv＝0〜1） */
    if(boom && lavaOv>0){
      var ly=py+(base-py)*lavaOv, lgv=ctx.createLinearGradient(0,py,0,ly+S*0.05);
      lgv.addColorStop(0,"rgba(255,220,120,.95)"); lgv.addColorStop(.5,"rgba(255,110,20,.92)"); lgv.addColorStop(1,"rgba(200,40,10,0)");
      ctx.fillStyle=lgv; ctx.fillRect(0,py-cw,W,ly-py+cw+S*0.05);
    }
    if(slope>0){
      ctx.save(); ctx.translate(cx, py); ctx.scale(1, 1.7);
      var sr=cw*3.2, lg=ctx.createRadialGradient(0,0,0,0,0,sr);
      lg.addColorStop(0,"rgba(255,120,30,"+(0.55*slope)+")"); lg.addColorStop(.45,"rgba(200,50,10,"+(0.28*slope)+")"); lg.addColorStop(1,"rgba(120,20,0,0)");
      ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(0,0,sr,0,6.3); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    /* 火口の光 */
    if(glow>0){
      var R=cw*(1.6+glow*1.8), rg=ctx.createRadialGradient(cx,py,0,cx,py,R);
      rg.addColorStop(0,"rgba(255,230,140,"+(0.95*glow)+")"); rg.addColorStop(.35,"rgba(255,110,20,"+(0.7*glow)+")"); rg.addColorStop(1,"rgba(255,40,0,0)");
      ctx.globalCompositeOperation="lighter"; ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(cx,py,R,0,6.3); ctx.fill();
      ctx.globalCompositeOperation="source-over";
    }
  }
  /* ----- ドッカーンの火 -----
     ⭐雲はやめて火に（2026-09-26 本人「火山の雲、へん。まず、雲じゃなくて、火が欲しい（上に上がって飛び散る）」）
     ＝①火口から火の柱が勢いよく上がる ②大きな火の玉がいくつも打ち上がって、上で割れて火の粉が四方に飛び散る ③火の粉は落ちながら消える */
  var fire=[], balls=[], bsparks=[], bflash=[];
  var lavaOv=0, bubbles=[], crust=[];
  for(var crI=0;crI<14;crI++) crust.push({x:Math.random()*W, d:0.05+Math.random()*0.5, w:S*(0.02+Math.random()*0.04), v:(Math.random()-.5)*S*0.025});
  function mix(a,b,k){ return "rgb("+Math.round(a[0]+(b[0]-a[0])*k)+","+Math.round(a[1]+(b[1]-a[1])*k)+","+Math.round(a[2]+(b[2]-a[2])*k)+")"; }
  if(boom){
    /* 火の玉＝上で割れる。高さと横の位置をばらけて、少しずつ時間をずらす */
    for(var bI=0;bI<9;bI++){
      var apex=H*(0.12+Math.random()*0.22), T=0.55+Math.random()*0.25;    // 上がりきる高さと時間
      var g=2*(peakY-apex)/(T*T);
      balls.push({x:W/2+(Math.random()-.5)*cw*0.8, y:peakY, vx:(Math.random()-.5)*W*0.35/T, vy:-g*T, g:g, r:S*(0.025+Math.random()*0.02), d:bI<3?0:0.1+Math.random()*0.9, on:false, done:false});
    }
  }
  function drawBoom(u, t, dt){
    ctx.globalCompositeOperation="lighter";
    /* 火の柱：はじめの1.4秒、火口から炎の粒が上へ噴き上がる（上ほど小さく・赤く・うすく） */
    if(u<1.4){
      var n=Math.round(dt*420*(1-u/1.4*0.6));
      for(var i=0;i<n;i++) fire.push({x:W/2+(Math.random()-.5)*cw*0.9, y:peakY, vx:(Math.random()-.5)*S*0.25, vy:-H*(0.9+Math.random()*0.8), age:0, life:0.45+Math.random()*0.4, r:S*(0.03+Math.random()*0.03)});
    }
    for(var f=fire.length-1;f>=0;f--){
      var p=fire[f]; p.age+=dt; if(p.age>p.life){ fire.splice(f,1); continue; }
      var k=p.age/p.life; p.vy*=Math.pow(0.35,dt); p.x+=p.vx*dt; p.y+=p.vy*dt;
      var r=p.r*(1-k*0.6), gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
      gr.addColorStop(0,"rgba(255,245,200,"+(0.9*(1-k))+")"); gr.addColorStop(0.4,"rgba(255,150,30,"+(0.7*(1-k))+")"); gr.addColorStop(1,"rgba(200,30,0,0)");
      ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,6.3); ctx.fill();
    }
    /* 火の玉：上がって、上で割れる */
    for(var b=0;b<balls.length;b++){
      var o=balls[b]; if(o.done || u<o.d) continue;
      o.on=true; o.vy+=o.g*dt; o.x+=o.vx*dt; o.y+=o.vy*dt;
      /* 尾（火の粒を残す） */
      fire.push({x:o.x, y:o.y, vx:(Math.random()-.5)*S*0.1, vy:S*0.1, age:0, life:0.3+Math.random()*0.2, r:o.r*1.3});
      var gb=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r*2.2);
      gb.addColorStop(0,"rgba(255,255,230,1)"); gb.addColorStop(0.35,"rgba(255,190,60,.95)"); gb.addColorStop(1,"rgba(255,60,0,0)");
      ctx.fillStyle=gb; ctx.beginPath(); ctx.arc(o.x,o.y,o.r*2.2,0,6.3); ctx.fill();
      if(o.vy>=0){   /* 上がりきった＝パンッと割れて四方に飛び散る */
        o.done=true;
        bflash.push({x:o.x, y:o.y, age:0, life:0.35, R:S*0.16});
        for(var q=0;q<70;q++){ var a=Math.random()*Math.PI*2, v=S*(0.35+Math.random()*0.9);
          bsparks.push({x:o.x, y:o.y, px:o.x, py:o.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, age:0, life:0.9+Math.random()*0.9, w:S*(0.004+Math.random()*0.005), col:Math.random()}); }
      }
    }
    /* 割れた光 */
    for(var h=bflash.length-1;h>=0;h--){
      var fl=bflash[h]; fl.age+=dt; if(fl.age>fl.life){ bflash.splice(h,1); continue; }
      var kk=fl.age/fl.life, R=fl.R*(0.6+kk), gf=ctx.createRadialGradient(fl.x,fl.y,0,fl.x,fl.y,R);
      gf.addColorStop(0,"rgba(255,240,180,"+(1-kk)+")"); gf.addColorStop(1,"rgba(255,120,20,0)");
      ctx.fillStyle=gf; ctx.beginPath(); ctx.arc(fl.x,fl.y,R,0,6.3); ctx.fill();
    }
    /* 飛び散る火の粉（線で尾を引く・落ちながら黄→赤→消える） */
    ctx.lineCap="round";
    for(var s=bsparks.length-1;s>=0;s--){
      var sp=bsparks[s]; sp.age+=dt; if(sp.age>sp.life){ bsparks.splice(s,1); continue; }
      var ks=sp.age/sp.life; sp.px=sp.x; sp.py=sp.y;
      sp.vx*=Math.pow(0.3,dt); sp.vy=sp.vy*Math.pow(0.3,dt)+H*0.5*dt; sp.x+=sp.vx*dt; sp.y+=sp.vy*dt;
      ctx.strokeStyle=mix([255,235,120],[230,50,10],Math.min(1,ks*1.4+sp.col*0.3)); ctx.globalAlpha=1-ks; ctx.lineWidth=sp.w*(1-ks*0.5);
      ctx.beginPath(); ctx.moveTo(sp.px,sp.py); ctx.lineTo(sp.x+0.01,sp.y); ctx.stroke();
    }
    ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
  }
  /* ⭐石っぽく（2026-09-26 本人「石っぽくない」）＝灰色のゴツゴツ。光るふち・ひびはやめた。
     面ごとに明るさを変える（左上が明るい）＋細かい粒 */
  function drawRock(x,y,r,rot,pts){
    ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
    var n=pts.length;
    function P(i){ return pts[(i+n)%n]; }
    ctx.beginPath(); ctx.moveTo(pts[0][0]*r,pts[0][1]*r); for(var i=1;i<n;i++) ctx.lineTo(pts[i][0]*r,pts[i][1]*r); ctx.closePath();
    ctx.fillStyle="#6f6861"; ctx.fill();
    ctx.save(); ctx.clip();
    /* ⭐面を放射状に切ると傘のように見えた（2026-09-26）＝ふちの一部だけを、明るい面・暗い面として欠けたように塗る */
    function chip(i0,cnt,ix,iy,col){
      ctx.beginPath(); ctx.moveTo(ix*r,iy*r);
      for(var c2=0;c2<=cnt;c2++){ var q=P(i0+c2); ctx.lineTo(q[0]*r*1.02,q[1]*r*1.02); }
      ctx.closePath(); ctx.fillStyle=col; ctx.fill();
    }
    chip(Math.floor(n*0.55), 2, -0.2,-0.25, "rgba(200,192,182,.45)");   // 左上の明るい欠け
    chip(0, 2, 0.15,0.2, "rgba(20,17,15,.35)");                           // 右下の暗い欠け
    chip(Math.floor(n*0.25), 1, 0.05,0.1, "rgba(60,54,50,.3)");    /* 丸みの陰：左上が明るく、右下が暗い */
    var sh=ctx.createRadialGradient(-r*0.35,-r*0.4,r*0.05,0,0,r*1.1);
    sh.addColorStop(0,"rgba(255,250,240,.22)"); sh.addColorStop(.55,"rgba(0,0,0,0)"); sh.addColorStop(1,"rgba(0,0,0,.45)");
    ctx.fillStyle=sh; ctx.fillRect(-r*1.2,-r*1.2,r*2.4,r*2.4);
    /* ざらざら（小さい粒） */
    if(r>10){
      for(var k=0;k<pts.length;k++){ var s=pts[k];
        ctx.fillStyle=k%2 ? "rgba(30,26,24,.35)" : "rgba(220,212,200,.25)";
        ctx.beginPath(); ctx.arc(s[1]*r*0.45, s[0]*r*0.4, Math.max(0.8,r*0.035), 0, 6.3); ctx.fill(); }
    }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(pts[0][0]*r,pts[0][1]*r); for(var i2=1;i2<n;i2++) ctx.lineTo(pts[i2][0]*r,pts[i2][1]*r); ctx.closePath();
    ctx.strokeStyle="rgba(25,20,18,.7)"; ctx.lineWidth=Math.max(0.8,r*0.03); ctx.stroke();
    ctx.restore();
  }
  loop(function(dt,t){
    ctx.clearRect(0,0,W,H);
    /* 空が暗く赤く（少し透かして、うしろの時間は見える） */
    var sky=Math.min(1,t/1.2)*(t>END-1.6 ? Math.max(0,(END-t)/1.6) : 1);
    var sg=ctx.createLinearGradient(0,0,0,H);
    sg.addColorStop(0,"rgba(30,8,6,"+(0.55*sky)+")"); sg.addColorStop(1,"rgba(120,20,5,"+(0.6*sky)+")");
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
    /* せり上がり（はじめ）・沈む（おわり） */
    var up=Math.min(1,t/1.0), e=1-Math.pow(1-up,3), off=(1-e)*H*0.7;
    if(t>END-1.4 && !boom) off=Math.pow((t-(END-1.4))/1.4,2)*H*0.75;   // ドッカーンは沈まずに、真っ赤になって消える
    /* ゴゴゴ（噴火に向けて強く）。⭐これはいい（2026-09-26 本人） */
    var amp=0;
    if(t>0.9 && t<ERUPT) amp=S*0.004+S*0.012*((t-0.9)/(ERUPT-0.9));
    else if(t>=ERUPT) amp=S*0.02*Math.max(0,1-(t-ERUPT)/1.8);
    var dx=(Math.random()-.5)*2*amp, dy=(Math.random()-.5)*2*amp;
    var glow=t<0.9 ? 0 : t<ERUPT ? 0.25+0.45*((t-0.9)/(ERUPT-0.9))*(0.8+Math.random()*0.2) : Math.max(0.35, 1-(t-ERUPT)/4);
    /* 噴火の前から煙がちょろちょろ */
    if(t>0.6 && t<ERUPT && Math.random()<dt*6) addSmoke(W/2, peakY+off, false);
    /* 噴火 */
    if(t>=ERUPT && t<ERUPT+2.4){
      var inten=t<ERUPT+0.5 ? 1 : Math.max(0.15, 1-(t-ERUPT-0.5)/1.9);
      var nl=Math.round(dt*(boom?90:200)*inten);
      for(var i=0;i<nl;i++){
        var a=-Math.PI/2+(Math.random()-.5)*0.6, v=H*(0.55+Math.random()*0.55)*(0.6+inten*0.4);
        lava.push({x:W/2+(Math.random()-.5)*cw*1.2, y:peakY+off, vx:Math.cos(a)*v, vy:Math.sin(a)*v, age:0, life:1.2+Math.random()*1.2,
                   s:S*(0.003+Math.random()*0.006), col:HOT[Math.floor(Math.random()*HOT.length)]});
      }
      if(Math.random()<dt*30*inten) addSmoke(W/2, peakY+off, true);
    }
    if(t>=ERUPT && t-dt<ERUPT) impacts.push({flash:true, age:0, life:0.4});
    slope=t<ERUPT ? 0 : Math.min(1,(t-ERUPT)/1.2);
    lavaOv=(boom && t>3.6) ? Math.min(0.3,(t-3.6)/8) : 0;   // ⭐あふれるのは火口のまわりだけ（2026-09-26・前は山ぜんぶ）
    while(plan.length && t>=plan[0].t){ var pl=plan.shift(); if(pl.front) addFrontRock(pl.front); else addRock(); }
    /* 煙（うしろ） */
    for(var m=smoke.length-1;m>=0;m--){
      var p=smoke[m]; p.age+=dt; if(p.age>p.life){ smoke.splice(m,1); continue; }
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy*=Math.pow(0.6,dt); p.r+=p.gr*dt;
      var k=p.age/p.life, al=(k<0.15 ? k/0.15 : 1-(k-0.15)/0.85)*0.55*(t>END-1.6?sky:1);
      /* ⭐ドッカーンは、煙が1つずつ消えない＝最後の2秒で画面ぜんぶと一緒に消える（2026-09-26 本人「最後の煙？がさ、真ん中がゆっくり消えていくんだけど、全体を消す感じにしたい」） */
      if(boom && p.big) al=Math.min(1,k/0.15)*0.55;
      var gg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
      gg.addColorStop(0,"rgba("+p.col+","+al+")"); gg.addColorStop(1,"rgba("+p.col+",0)");
      ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.3); ctx.fill();
    }
    drawMountain(off, glow, dx, dy);
    if(boom && t>=ERUPT) drawBoom(t-ERUPT, t, dt);
    /* 溶岩の噴水 */
    ctx.globalCompositeOperation="lighter";
    for(var l=lava.length-1;l>=0;l--){
      var d=lava[l]; d.age+=dt; if(d.age>d.life){ lava.splice(l,1); continue; }
      d.vy+=H*1.1*dt; d.x+=d.vx*dt; d.y+=d.vy*dt;
      ctx.globalAlpha=Math.min(1,(1-d.age/d.life)*1.5); ctx.fillStyle=d.col;
      ctx.beginPath(); ctx.arc(d.x+dx,d.y+dy,d.s,0,6.3); ctx.fill();
    }
    ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
    /* 岩：遠いものから描く */
    rocks.sort(function(a,b){ return b.Z-a.Z; });
    for(var r=rocks.length-1;r>=0;r--){
      var o=rocks[r];
      o.vy+=G*dt; o.X+=o.vx*dt; o.Y+=o.vy*dt; o.Z+=o.vz*dt; o.rot+=o.vr*dt;
      var z=Math.max(0.05,o.Z);
      o.sx=HX+o.X*F/z; o.sy=HY+o.Y*F/z; o.sr=o.R*F/z;
      if(o.Z<0.2 || o.sr>S*0.16 || o.sx<-o.sr*2 || o.sx>W+o.sr*2 || o.sy>H+o.sr*2){ rocks.splice(r,1); continue; }
    }
    /* 火の粉（岩のうしろ）*/
    ctx.globalCompositeOperation="lighter";
    for(var f=sparks.length-1;f>=0;f--){
      var s=sparks[f]; s.age+=dt; if(s.age>s.life){ sparks.splice(f,1); continue; }
      s.vx*=Math.pow(0.3,dt); s.vy=s.vy*Math.pow(0.3,dt)+200*dt; s.x+=s.vx*dt; s.y+=s.vy*dt;
      ctx.globalAlpha=1-s.age/s.life; ctx.fillStyle=s.col; ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,6.3); ctx.fill();
    }
    ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
    for(var r2=0;r2<rocks.length;r2++){
      var o2=rocks[r2], sx2=o2.sx, sy2=o2.sy, sr2=o2.sr;
      /* 火の尾 */
      if(Math.random()<0.25) sparks.push({x:sx2,y:sy2,vx:(Math.random()-.5)*60,vy:(Math.random()-.5)*60,age:0,life:0.35+Math.random()*0.3,s:Math.max(2,Math.min(sr2*0.1,S*0.01)),col:HOT[1+Math.floor(Math.random()*3)]});
      drawRock(sx2,sy2,sr2,o2.rot,o2.pts);
    }
    /* 手前に飛んでくる石（いちばん前に描く） */
    for(var fi=fronts.length-1;fi>=0;fi--){
      var fr=fronts[fi]; fr.age+=dt; var u=fr.age/fr.D;
      if(u>=1){ fronts.splice(fi,1); continue; }
      var fx0=W/2, fy0=peakY;
      var fxp=fx0+fr.side*W*0.2*u;
      var fyp=fy0-H*0.3*4*u*(1-u)+H*0.95*u*u*u;    // 山なりに上がって、最後は画面の下へ落ちる
      var fsz=S*(0.012+0.108*Math.pow(u,1.15));    // 小さいところから、だんだん大きく
      fr.rot+=fr.vr*dt;
      drawRock(fxp,fyp,fsz,fr.rot,fr.pts);
    }
    /* 光：噴火の瞬間 */
    for(var h=impacts.length-1;h>=0;h--){
      var im=impacts[h]; im.age+=dt; if(im.age>im.life){ impacts.splice(h,1); continue; }
      var kk=im.age/im.life;
      ctx.fillStyle="rgba(255,200,120,"+(0.3*(1-kk))+")"; ctx.fillRect(0,0,W,H);
    }
    /* ⭐ドッカーンは、火を噴いたあと画面ぜんたいが真っ赤になって、少ししたら消える（2026-09-26 本人「火を噴いて、全体が赤くなって終わることってできる？」→「ドッカーン」「真っ赤になって消える」）
       ＝4.3秒から1.2秒かけて赤く（火口のあたりが明るい）→ そのまま → 最後の1.2秒で全部が消える */
    /* ⚠画面ぜんたいを真っ赤にするのはやめた（本人「赤、やめようかな。ちょっとイメージが違った」→「溶岩だな」）
       ⭐溶岩＝①3.6秒から火口の溶岩があふれて、山が上から溶岩色になる ②4.2秒から下から溶岩が満ちてきて、山のすそ野をのみこむ（火口の少し下まで）③最後の1.2秒で全部消える */
    if(boom){
      /* ⭐あふれすぎない。下のほうで、ゆっくり動く（2026-09-26 本人「溶岩、いいよ。でもあんなにあふれなくていいかも。もっと下の方でゆっくり動くくらいで」）
         ＝面は画面の下から9%くらいまで（前は火口の少し下まで）・3秒かけてゆっくり上がる・波も皮もゆっくり */
      var pk=t<4.0 ? 0 : Math.min(1,(t-4.0)/3.0), pe=1-Math.pow(1-pk,2);
      if(pe>0){
        /* ⭐高さを半分に（2026-09-26 本人「もっと溶岩は低く。下から湧いてくるから多いと溶岩っぽくないんだよ。高さを半分くらいにして」）＝画面の下から4.5%くらい。⚠前は9% */
        var lvl=H+10-(H+10-H*0.955)*pe;      // 溶岩の面の高さ
        ctx.beginPath(); ctx.moveTo(0,H);
        for(var wx=0;wx<=W+20;wx+=20){ ctx.lineTo(wx, lvl+Math.sin(wx*0.012+t*0.9)*S*0.008+Math.sin(wx*0.031-t*1.2)*S*0.004); }
        ctx.lineTo(W,H); ctx.closePath();
        var pg=ctx.createLinearGradient(0,lvl-S*0.02,0,H);
        pg.addColorStop(0,"#ffd26a"); pg.addColorStop(.08,"#ff8a1a"); pg.addColorStop(.4,"#d8320c"); pg.addColorStop(1,"#7a1206");
        ctx.fillStyle=pg; ctx.fill();
        /* 表面のかたまり（黒っぽい皮）と、ぷくっと出る泡 */
        ctx.save(); ctx.clip();
        for(var ci=0;ci<crust.length;ci++){ var cr=crust[ci]; cr.x=(cr.x+cr.v*dt+W)%W;
          ctx.fillStyle="rgba(60,15,8,.35)"; ctx.beginPath(); ctx.ellipse(cr.x, lvl+cr.d*(H-lvl), cr.w, cr.w*0.3, 0, 0, 6.3); ctx.fill(); }
        ctx.restore();
        if(Math.random()<dt*6) bubbles.push({x:Math.random()*W, age:0, life:0.5+Math.random()*0.4, r:S*(0.008+Math.random()*0.014)});
        for(var bb=bubbles.length-1;bb>=0;bb--){ var bu=bubbles[bb]; bu.age+=dt; if(bu.age>bu.life){ bubbles.splice(bb,1); continue; }
          var kb=bu.age/bu.life; ctx.strokeStyle="rgba(255,230,150,"+(1-kb)+")"; ctx.lineWidth=Math.max(1,S*0.003);
          ctx.beginPath(); ctx.arc(bu.x, lvl+Math.sin(bu.x*0.012+t*0.9)*S*0.008, bu.r*(0.5+kb), Math.PI, 0); ctx.stroke(); }
        /* 溶岩の熱で、画面の下が少し明るく */
        var hg=ctx.createLinearGradient(0,lvl-S*0.25,0,lvl);
        hg.addColorStop(0,"rgba(255,120,30,0)"); hg.addColorStop(1,"rgba(255,120,30,"+(0.35*pe)+")");
        ctx.fillStyle=hg; ctx.fillRect(0,lvl-S*0.25,W,S*0.25);
      }
      /* ⭐最後の2秒で消える（2026-09-26 本人「最後の２秒で消してみて」）。⚠前は1.2秒 */
      c.cv.style.opacity=t>END-2 ? String(Math.max(0,(END-t)/2)) : "";
    }
    if(t<END) return true;
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
