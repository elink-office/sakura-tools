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

/* ⭐分割＝入れた項目をくり返して、細かく分ける（2026-09-27 本人「●分割（回答の倍数にはなるんだろうけど）」「×２とかでいいと思う」）
   ＝×1・×2・×3・×4・×6・×8。並びは あたり・はずれ・あたり・はずれ…（1回ずつ順にくり返す）。全部で24こをこえる倍は選べない */
var REPS=[1,2,3,4,6,8];
var st={items:"", removeHit:false, rep:1};
function list(){ return st.items.split(/\r?\n/).map(function(s){ return s.split(/\t/)[0].trim(); }).filter(Boolean).slice(0,MAX); }
function count(){ var n=list().length; $("itemCount").textContent=n+"こ"+(st.items.split(/\r?\n/).filter(function(s){return s.trim();}).length>MAX?"（"+MAX+"こまで使います）":""); paintRep(); }
function repOk(k,n){ return k===1 || Math.max(n,2)*k<=MAX; }   // 項目が0〜1このときは2こで数える
function paintRep(){
  var n=list().length;
  if(!repOk(st.rep,n)) st.rep=1;
  Array.prototype.forEach.call($("segRep").children,function(b){
    var k=+b.getAttribute("data-v"); b.classList.toggle("on",k===st.rep); b.disabled=!repOk(k,n);
  });
  $("repNote").textContent= n>=2 ? "→ "+(n*st.rep)+"こに分かれます" : "";
}
$("segRep").addEventListener("click",function(e){
  var b=e.target.closest("button"); if(!b || b.disabled) return;
  st.rep=+b.getAttribute("data-v"); paintRep(); screenSave();
});
/* 回す面の並び＝項目を順にくり返す。何番目の項目か（色をそろえるため・外すため）も持つ */
function expand(base,k){ var a=[],c=[]; for(var r=0;r<k;r++) base.forEach(function(t,j){ a.push(t); c.push(j); }); return {items:a, ci:c}; }
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
    $("save").checked=true; st.items=s.items||""; st.removeHit=!!s.removeHit; st.rep=REPS.indexOf(s.rep)>=0?s.rep:1;
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
  var e=expand(run.base,run.rep); run.items=e.items; run.ci=e.ci;
  $("stage").innerHTML='<div class="ru-wrap"><div class="ru-wheelbox"><div class="ru-pin"></div><div class="ru-wheel" id="wheel">'+wheelSvg(run.items,run.ci)+'</div><div class="ru-hub"></div></div>'+
    '<div class="ru-res"><div class="ru-hit" id="hit"></div><div class="ru-hist" id="hist"></div></div></div>';
  run.angle=0;
}
function update(){
  $("roundLbl").textContent=run.hits.length? run.hits.length+"回目" : "";
  $("leftLbl").textContent="のこり "+run.base.length+"個";
  $("runMsg").textContent= run.busy ? "" : run.base.length>=2 ? "「回す」で決める" : "のこりが1こになりました";
  $("nextBtn").disabled=run.busy || run.base.length<2;
  $("hist").textContent= run.hits.length ? "これまで："+run.hits.join("・") : "";
}
function spin(){
  if(!run || run.busy || run.base.length<2) return;
  /* 前に当たった項目を外す（チェックがあるとき）。外すのは次に回す直前＝当たりの形はしばらく見えたまま
     ⭐分割しているときは、同じ項目をまとめて外す */
  if(st.removeHit && run.pendingRemove!=null){
    run.base.splice(run.pendingRemove,1); run.pendingRemove=null;
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
  var rep=st.rep;
  if(demo && items.length<2){ items=["あたり","はずれ"]; rep=8; }   // ＝あたり・はずれの2こを×8＝16こ
  if(items.length<2){ alert("先に①で、項目を2こ以上入れてください。"); $("opt1").open=true; return false; }
  run={base:items, rep:rep, items:[], ci:[], hits:[], busy:false, angle:0, pendingRemove:null};
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
paintRep();
count();
})();
