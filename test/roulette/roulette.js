/* ルーレット（2026-09-26 たたき台）
   ⭐本人「ルーレットだけの簡単なアプリは作ってもいいね」「ルーレットは数少ない時に使う用」
   ⭐当たりは先に乱数で決めて、その項目のまん中あたりが上の▼に来るところで止める（どの項目も同じ確率）
   ⭐色はうすい色（ビンゴの玉と同じ考え＝2026-09-26 本人「薄い球、いいよ！」） */
(function(){
"use strict";
function $(id){ return document.getElementById(id); }
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function rnd(n){ try{ var a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; }catch(e){ return Math.floor(Math.random()*n); } }
/* ⭐2番目は水色（2026-09-27 本人「2つだったら、似たような色だと違和感あって。私の好みで、ピンクと水色にして」）。前＝ピンクの次がうすいオレンジ */
var COLORS=["#f6c9d4","#c9e3f6","#fde1b8","#cfeccf","#e1d4f4","#fbd0e6","#f7ecb5","#c6ece8"];
var MAX=24;

/* ⭐項目ごとに「こ数」（ルーレットのマスの数）を決める（2026-10-11 本人「カレーとラーメンでは、1個と4個はできないのね」「あたりとはずれも、自分で入れると思う。だから入れたものに対して設定してほしい」「分割も私の最初の説明が悪かった。コのほうがいい」）
   ＝前の「分割（×2・×3…）」と「あたりとはずれの数」は、これ1つにまとめた。確率＝その項目のこ数÷全部のこ数。同じ項目が続かないよう、ばらして置く。全部で24こまで */
var st={items:"", removeHit:false, counts:{}};
function list(){ return st.items.split(/\r?\n/).map(function(s){ return s.split(/\t/)[0].trim(); }).filter(Boolean).slice(0,MAX); }
function cntOf(n){ var c=st.counts[n]|0; return c>=1?c:1; }
function totalOf(names){ return names.reduce(function(s,n){ return s+cntOf(n); },0); }
function count(){ var n=list().length; $("itemCount").textContent=n+"こ"+(st.items.split(/\r?\n/).filter(function(s){return s.trim();}).length>MAX?"（"+MAX+"こまで使います）":""); renderCnt(); }
function renderCnt(){
  var names=list(), box=$("cntRows");
  if(names.length<2){ box.innerHTML='<p class="hint">項目を2こ以上入れると、ここで項目ごとのこ数を決められます。</p>'; $("repNote").textContent=""; return; }
  var tot=totalOf(names);
  box.innerHTML=names.map(function(n){
    return '<label class="ru-cnt"><span>'+esc(n)+'</span><input type="number" min="1" max="'+(MAX-names.length+1)+'" inputmode="numeric" data-n="'+esc(n)+'" value="'+cntOf(n)+'" aria-label="'+esc(n)+'のこ数"> こ<em>'+(Math.round(cntOf(n)/tot*1000)/10)+'％</em></label>';
  }).join("");
  $("repNote").textContent="→ 全部で "+tot+"こに分かれます"+(tot>MAX?"（"+MAX+"こをこえています。こ数を減らしてください）":"");
}
$("cntRows").addEventListener("change",function(e){
  var inp=e.target; if(!inp || inp.tagName!=="INPUT") return;
  var n=inp.getAttribute("data-n"), names=list(), others=totalOf(names)-cntOf(n);
  var v=Math.max(1,Math.min(MAX-others, Math.floor(+inp.value)||1));   // ⭐ほかの項目と合わせて24こまで
  st.counts[n]=v; renderCnt(); screenSave();
});
/* 回す面の並び＝こ数ぶんのマスを、同じ項目がかたまらないようにばらして置く。何番目の項目か（色をそろえるため・外すため）も持つ */
/* ⭐項目ごとに「円の上の何割のところ」に置くかを決めて、その順に並べる。(k+項目のずらし)÷こ数 ＝ 同じ項目はこ数で等間隔・項目どうしは少しずつずらして重ならない
   （2026-10-11 本人「カレーを分散させることはできないのかな？」＝前は (k+0.5)÷こ数 でずらさず、こ数の少ない項目が一かたまりになってカレーが続けて並んだ） */
function expand(base,cnt){
  var t=[], n0=base.length; base.forEach(function(n,j){ for(var k=0;k<cnt[j];k++) t.push({n:n,j:j,p:(k+(j+0.5)/n0)/cnt[j]}); });
  t.sort(function(a,b){ return a.p-b.p || a.j-b.j; });
  return {items:t.map(function(x){ return x.n; }), ci:t.map(function(x){ return x.j; })};
}
$("items").addEventListener("input",function(){ st.items=this.value; count(); screenSave(); });
$("itemsClear").addEventListener("click",function(){ $("items").value=""; st.items=""; count(); screenSave(); });
$("removeHit").addEventListener("change",function(){ st.removeHit=this.checked; screenSave(); });

var KEY="sakura-roulette";
function screenSave(){
  if(!$("save").checked) return;
  try{ localStorage.setItem(KEY, JSON.stringify(st)); flash("保存しました"); }catch(e){}
}
var flashT=0;
function flash(t){ $("savingLabel").textContent=t; clearTimeout(flashT); flashT=setTimeout(function(){ $("savingLabel").textContent=""; },1500); }
$("save").addEventListener("change",function(){
  if(this.checked) screenSave();
  else { try{ localStorage.removeItem(KEY); }catch(e){} flash("保存していたものを消しました"); }
});
function screenLoad(){
  try{
    var s=JSON.parse(localStorage.getItem(KEY)||"null"); if(!s) return false;
    $("save").checked=true; st.items=s.items||""; st.removeHit=!!s.removeHit; st.counts=(s.counts && typeof s.counts==="object")?s.counts:{};
    if(!Object.keys(st.counts).length && s.rep>1) list().forEach(function(n){ st.counts[n]=Math.min(s.rep,MAX); });   // 前の「分割」で保存していたもの
    $("items").value=st.items; $("removeHit").checked=st.removeHit; return true;
  }catch(e){ return false; }
}
document.addEventListener("click",function(e){
  var b=e.target.closest(".tip-btn"); if(!b) return;
  var host=b.closest("h2,summary,p,label"), body=host && host.nextElementSibling;
  if(!body || !body.classList.contains("tip-body")) return;
  e.preventDefault(); body.hidden=!body.hidden; b.setAttribute("aria-expanded", body.hidden?"false":"true");
});

/* ===== 動かす画面 ===== */
var run=null, timers=[], wakeLock=null;
function later(fn,ms){ timers.push(setTimeout(fn,ms)); }
function wheelSvg(items,ci){
  var n=items.length, h='<svg viewBox="-100 -100 200 200" aria-hidden="true">', step=360/n;
  var fs=Math.max(5,Math.min(14, 150/n+3));
  items.forEach(function(t,i){
    var a0=(-90+i*step)*Math.PI/180, a1=(-90+(i+1)*step)*Math.PI/180;
    var x0=96*Math.cos(a0), y0=96*Math.sin(a0), x1=96*Math.cos(a1), y1=96*Math.sin(a1), large=step>180?1:0;
    var col=COLORS[(ci?ci[i]:i)%COLORS.length];   // くり返したときは、同じ項目は同じ色
    h+=n===1 ? '<circle r="96" fill="'+COLORS[0]+'"/>' :
      '<path d="M0 0 L'+x0.toFixed(2)+' '+y0.toFixed(2)+' A96 96 0 '+large+' 1 '+x1.toFixed(2)+' '+y1.toFixed(2)+' Z" fill="'+col+'" stroke="#fff" stroke-width="1.2"/>';
    var mid=-90+(i+0.5)*step, label=t.length>8?t.slice(0,8)+"…":t;
    h+='<text transform="rotate('+mid.toFixed(2)+') translate(88 0)" text-anchor="end" dominant-baseline="central" font-size="'+fs.toFixed(1)+'" font-weight="800" fill="#2b2f36">'+esc(label)+'</text>';
  });
  h+='<circle r="97" fill="none" stroke="#fff" stroke-width="3"/></svg>';
  return h;
}
function build(){
  var e=expand(run.base,run.cnt); run.items=e.items; run.ci=e.ci;
  $("stage").innerHTML='<div class="ru-wrap"><div class="ru-wheelbox"><div class="ru-pin"></div><div class="ru-wheel" id="wheel">'+wheelSvg(run.items,run.ci)+'</div><div class="ru-hub"></div></div>'+
    '<div class="ru-res"><div class="ru-hit" id="hit"></div><div class="ru-hist" id="hist"></div></div></div>';
  run.angle=0;
}
function update(){
  $("roundLbl").textContent=run.hits.length? run.hits.length+"回目" : "";
  $("leftLbl").textContent="のこり "+run.base.length+"個";
  $("runMsg").textContent= run.busy || run.base.length>=2 ? "" : "のこりが1こになりました";   // ⭐「「回す」で決める」は出さない（2026-09-28 本人「bingoとルーレット、○○で始めるっていうのはなしにして」）
  $("nextBtn").disabled=run.busy || run.base.length<2;
  $("hist").textContent= run.hits.length ? "これまで："+run.hits.join("・") : "";
}
function spin(){
  if(!run || run.busy || run.base.length<2) return;
  /* 前に当たった項目を外す（チェックがあるとき）。外すのは次に回す直前＝当たりの形はしばらく見えたまま
     ⭐分割しているときは、同じ項目をまとめて外す */
  if(st.removeHit && run.pendingRemove!=null){
    run.base.splice(run.pendingRemove,1); run.cnt.splice(run.pendingRemove,1); run.pendingRemove=null;
    build(); update(); if(run.base.length<2) return;
  }
  run.busy=true; update();
  $("hit").textContent=""; $("hit").classList.remove("pop");
  var n=run.items.length, i=rnd(n), step=360/n;
  var off=(rnd(60)-30)/100*step;                    // 項目の中で少しずらす（毎回ちょうど真ん中にならないように）
  var target=-((i+0.5)*step+off);                     // その項目が上の▼に来る角度
  var cur=run.angle, base=cur-(((cur%360)+360)%360);
  /* ⭐時計回り（2026-09-27 本人「逆回りがいいかな」）。前＝左回り（角度を減らしていた） */
  var end=base+360*6+(((target%360)+360)%360);        // 5周以上まわってから止まる
  var w=$("wheel"); w.classList.add("go"); w.style.transform="rotate("+end+"deg)";
  run.angle=end;
  later(function(){
    w.classList.remove("go");
    var h=$("hit"); h.textContent=run.items[i]; void h.offsetWidth; h.classList.add("pop");
    run.hits.push(run.items[i]); if(st.removeHit) run.pendingRemove=run.ci[i];
    run.busy=false; update();
  },6100);
}
function start(demo){
  var items=list();
  /* ⭐見本は、項目が入っていなくても出す（2026-09-27 本人「見本がないんだよね～出てこなかった」）
     ⚠前は「先に①で項目を入れてください」で止まっていた。スタート（本番）は今までどおり止める
     ⭐見本の中身は「あたり」と「はずれ」の細い区切りをたくさん（2026-09-27 本人「見本をね、あたりとはずれにしてさ、細いのをたくさんのほうがいいな」）
       ＝16こ・あたり・はずれ・あたり・はずれ…と交互（本人「あたり、はずれ、あたり、はずれ、と思ってた」）。
       前＝入れる欄のうすい見本（カレー・ラーメン…）→ あたり3こをばらして置く形 */
  var cnt=items.map(cntOf);
  if(demo && items.length<2){ items=["あたり","はずれ"]; cnt=[8,8]; }   // ＝あたり・はずれの2こを8こずつ＝16こ（交互に並ぶ）
  if(items.length<2){ alert("先に①で、項目を2こ以上入れてください。"); $("opt1").open=true; return false; }
  if(cnt.reduce(function(s,c){ return s+c; },0)>MAX){ alert("マスの合計が"+MAX+"こをこえています。①で、こ数を減らしてください。"); $("opt1").open=true; return false; }
  run={base:items, cnt:cnt, items:[], ci:[], hits:[], busy:false, angle:0, pendingRemove:null};
  timers.forEach(clearTimeout); timers=[];
  var rs=$("runScreen"); rs.hidden=false; rs.classList.toggle("framed",!!demo);
  $("demoBack").hidden=!demo; $("demoBadge").hidden=!demo;
  document.body.style.overflow="hidden";
  build(); update();
  if(!demo) keepAwake(true);
  return true;
}
function stop(){
  timers.forEach(clearTimeout); timers=[];
  $("stage").innerHTML=""; run=null;
  $("runScreen").hidden=true; $("runScreen").classList.remove("framed"); $("demoBack").hidden=true;
  document.body.style.overflow=""; keepAwake(false);
  if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function(){});
}
$("startBtn").addEventListener("click",function(){
  var el=document.documentElement;
  if(start(false) && !document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(function(){});
});
$("demoBtn").addEventListener("click",function(){ start(true); });
$("nextBtn").addEventListener("click",spin);
$("backBtn").addEventListener("click",stop);
$("fsBtn").addEventListener("click",function(){
  var el=document.documentElement;
  if(document.fullscreenElement) document.exitFullscreen().catch(function(){}); else if(el.requestFullscreen) el.requestFullscreen().catch(function(){});
});
document.addEventListener("keydown",function(e){
  if($("runScreen").hidden || !run) return;
  if(e.code==="Space" || e.key==="Enter" || e.key==="ArrowRight"){ e.preventDefault(); spin(); }
  else if(e.key==="Escape" && !document.fullscreenElement){ stop(); }
});
function keepAwake(on){
  try{
    if(on && navigator.wakeLock && !wakeLock){ navigator.wakeLock.request("screen").then(function(w){ wakeLock=w; w.addEventListener("release",function(){ wakeLock=null; }); }).catch(function(){}); }
    else if(!on && wakeLock){ wakeLock.release(); wakeLock=null; }
  }catch(e){}
}

if(screenLoad()) $("opt1").open=true;
count();
})();
