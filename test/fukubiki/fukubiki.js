/* 福引ガラガラ（2026-09-26 たたき台）
   ⭐本人「福引のガラガラと、ビンゴは一緒にサクッと作ってもいいね」
   ⭐八角形の箱が回る → 色の玉が受け皿にコロンと落ちる → 玉と賞の名前が大きく出る。出た玉は戻らない（本数どおりに当たる）
   ⭐回し方はビンゴと同じくゆっくり・3秒（2026-09-26 本人「早すぎるとワクワク感がなくなるからね」） */
(function(){
"use strict";
function $(id){ return document.getElementById(id); }
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function rnd(n){ try{ var a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; }catch(e){ return Math.floor(Math.random()*n); } }
var COLORS=[["gold","金","#e6b422"],["silver","銀","#b8bec6"],["red","赤","#e2403f"],["blue","青","#3a7bd5"],["green","緑","#3aa55d"],["yellow","黄","#f2d14b"],["pink","桃","#f08fb0"],["white","白","#f4f4f4"]];
function colorOf(k){ for(var i=0;i<COLORS.length;i++) if(COLORS[i][0]===k) return COLORS[i][2]; return "#f4f4f4"; }
var KU_COL=["gold","silver","bronze"], KU_NAME=["金","銀","銅"];   // くす玉の色＝行の順（1行目＝金・2行目＝銀・3行目＝銅）
/* ku＝その賞が出たらくす玉を割る（1〜3行目だけ・1行目＝金・2行目＝銀・3行目＝銅）。見本は1等だけ入れておく（2026-10-04） */
var DEF=[{c:"gold",n:"1等",k:1,ku:true},{c:"red",n:"2等",k:3},{c:"blue",n:"3等",k:5},{c:"white",n:"ざんねん",k:21}];

var st={rows:JSON.parse(JSON.stringify(DEF)), drawn:[], sound:true};

/* ⭐音（2026-09-27 本人「音も欲しいんだよな～」「回す音と、玉が落ちた音」）
     ＝効果音ラボ（https://soundeffect-lab.info/）の「抽選機を回す」（3.6秒）→ sound/turn.mp3・「抽選機から玉が出る」（0.6秒）→ sound/drop.mp3。本人がダウンロード
     規約（2026-09-27 読んだ）＝商用無料・クレジット不要・アプリの操作音として組み込むのは可。⚠「効果音が重要な役割を果たすコンテンツ」は再配布と同じ扱いで禁止
     → ⚠買い切り版（有料）で使うときは、効果音ラボに確かめるか、自分で作った音にする
     ①の「音を鳴らす」のチェックで止められる（はじめは鳴る） */
var SND={turn:new Audio("sound/turn.mp3"), drop:new Audio("sound/drop.mp3")};
SND.turn.preload=SND.drop.preload="auto";
function snd(k){ if(!st.sound) return; try{ var a=SND[k]; a.pause(); a.currentTime=0; a.volume=1; var pr=a.play(); if(pr && pr.catch) pr.catch(function(){}); }catch(e){} }
function sndFade(k,ms){   // 止めるときは、すっと小さくして止める
  var a=SND[k]; if(!a || a.paused) return;
  var t0=performance.now(), v0=a.volume;
  (function f(now){ var t=Math.min(1,(now-t0)/ms); a.volume=v0*(1-t); if(t<1) requestAnimationFrame(f); else { a.pause(); a.volume=1; } })(t0);
}
$("soundOn").addEventListener("change",function(){ st.sound=this.checked; screenSave(); });   // drawn＝出た行の番号（上から0,1,2…）

/* ===== ① 賞と本数 ===== */
function render(){
  var ul=$("rows"); ul.innerHTML="";
  st.rows.forEach(function(r,i){
    var sel='<select data-i="'+i+'" data-k="c" aria-label="玉の色">';
    COLORS.forEach(function(c){ sel+='<option value="'+c[0]+'"'+(c[0]===r.c?" selected":"")+'>'+c[1]+'</option>'; });
    sel+='</select>';
    var li=document.createElement("li");
    li.innerHTML='<span class="fk-dot" style="background:'+colorOf(r.c)+'"></span>'+sel+
      '<input class="nm" data-i="'+i+'" data-k="n" maxlength="16" aria-label="賞の名前" value="'+esc(r.n)+'">'+
      '<input class="ct" type="number" min="0" max="999" data-i="'+i+'" data-k="k" aria-label="本数" value="'+r.k+'"> 本'+
      /* ⭐くす玉のボタン＝1〜3行目だけ（2026-10-04 本人「①の賞と本数のところで、ただし3等までね。金銀銅で。１等だけボタンにすると、金だけくす玉」） */
      (i<3 ? '<button type="button" class="kubtn '+KU_COL[i]+(r.ku?" on":"")+'" data-i="'+i+'" aria-pressed="'+(r.ku?"true":"false")+'" title="この賞が出たら、くす玉（'+KU_NAME[i]+'）を割る">🎊 くす玉</button>' : '<span class="kubtn-sp"></span>')+
      '<button type="button" class="mvbtn" data-i="'+i+'" data-a="up" aria-label="上へ"'+(i===0?" disabled":"")+'>▲</button>'+
      '<button type="button" class="mvbtn" data-i="'+i+'" data-a="down" aria-label="下へ"'+(i===st.rows.length-1?" disabled":"")+'>▼</button>'+
      '<button type="button" class="mvbtn" data-i="'+i+'" data-a="del" aria-label="消す">×</button>';
    ul.appendChild(li);
  });
  total();
}
function total(){ var t=0; st.rows.forEach(function(r){ t+=r.k; }); $("total").textContent="全部で "+t+" 本"; }
$("rows").addEventListener("input",function(e){
  var t=e.target, i=+t.getAttribute("data-i"), k=t.getAttribute("data-k"); if(isNaN(i)) return;
  if(k==="n") st.rows[i].n=t.value;
  else if(k==="k") st.rows[i].k=Math.max(0,Math.min(999,t.value|0));
  st.drawn=[]; total(); screenSave();
});
$("rows").addEventListener("change",function(e){
  var t=e.target; if(t.getAttribute("data-k")!=="c") return;
  st.rows[+t.getAttribute("data-i")].c=t.value; st.drawn=[]; render(); screenSave();
});
$("rows").addEventListener("click",function(e){
  var kb=e.target.closest(".kubtn");
  if(kb){ var ki=+kb.getAttribute("data-i"); st.rows[ki].ku=!st.rows[ki].ku; render(); screenSave(); return; }   // くす玉の入れる・外す（出た玉の記録は消さない）
  var b=e.target.closest(".mvbtn"); if(!b || b.disabled) return;
  var i=+b.getAttribute("data-i"), a=b.getAttribute("data-a");
  /* ⭐順番を入れかえる（2026-09-27 本人「賞と本数、間違えそうだから、入れ替えできるようにしてほしい。今緑足したら、外れの白より下になってるからさ」）
       出た玉の記録（drawn＝行の番号）も、いっしょに入れかえる */
  if(a==="up" || a==="down"){
    var j=a==="up"?i-1:i+1, tmp=st.rows[i]; st.rows[i]=st.rows[j]; st.rows[j]=tmp;
    st.drawn=st.drawn.map(function(x){ return x===i?j:(x===j?i:x); });
    render(); screenSave(); return;
  }
  st.rows.splice(i,1); st.drawn=[]; render(); screenSave();
});
$("rowAdd").addEventListener("click",function(){
  if(st.rows.length>=8){ alert("賞は8つまでです。"); return; }
  st.rows.push({c:COLORS[st.rows.length%COLORS.length][0], n:(st.rows.length+1)+"等", k:1}); st.drawn=[]; render(); screenSave();
});

/* ===== 画面の保存（チェックを入れたときだけ）。出た玉も残す ===== */
var KEY="sakura-fukubiki";
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
    var s=JSON.parse(localStorage.getItem(KEY)||"null"); if(!s || !s.rows) return false;
    $("save").checked=true; st.rows=s.rows; st.drawn=s.drawn||[]; st.sound=s.sound!==false; $("soundOn").checked=st.sound; return true;
  }catch(e){ return false; }
}
document.addEventListener("click",function(e){
  var b=e.target.closest(".tip-btn"); if(!b) return;
  var host=b.closest("h2,summary,p,label"), body=host && host.nextElementSibling;
  if(!body || !body.classList.contains("tip-body")) return;
  e.preventDefault(); body.hidden=!body.hidden; b.setAttribute("aria-expanded", body.hidden?"false":"true");
});

/* =====================================================================
   動かす画面
   ===================================================================== */
var run=null, timers=[], wakeLock=null;
function later(fn,ms){ timers.push(setTimeout(fn,ms)); }
function leftOf(i){ var used=0; st.drawn.forEach(function(d){ if(d===i) used++; }); return st.rows[i].k-used; }
function pool(){ var a=[]; st.rows.forEach(function(r,i){ for(var j=0;j<leftOf(i);j++) a.push(i); }); return a; }

function build(){
  /* ⭐ガラガラ全体を、斜め上から見た立体でかく（2026-09-27 本人「箱だけじゃないからね。全部になるからさ。足も2本じゃなくて4本欲しいし」
       「単焦点って言ったんだけど、斜めから見る（見本と同じ見え方）でもいいんだよ。任せる。作ってみて」）
     ＝小さな3Dの計算で、箱（八角柱）・軸・脚4本・土台・受け皿を、左手前の少し上から見た形にかく。遠いものから順にぬる。面の明るさは光の向き（左上手前）で決める
     ⭐箱は回る角度に合わせて毎回かき直す（1秒に200度）
     前の形＝①平らな絵（2026-09-26）→ ②立体感・箱を大きく → ③八角形を12枚重ねる → ④箱だけ一点透視（控え＝_もどす\2026-09-27_福引を全体の立体にする前\） */
  var svg='<svg viewBox="-70 0 170 112" aria-hidden="true" id="fkSvg">'+
    '<defs>'+
    '<radialGradient id="fkWood" cx="38%" cy="32%" r="78%"><stop offset="0" stop-color="#f6dcae"/><stop offset=".55" stop-color="#dcae6c"/><stop offset="1" stop-color="#b07a3c"/></radialGradient>'+
    '<radialGradient id="fkKnob" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#f3d3df"/><stop offset=".35" stop-color="#c86a8e"/><stop offset="1" stop-color="#8f4264"/></radialGradient>'+
    '<radialGradient id="fkHub" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#fbe7b0"/><stop offset=".45" stop-color="#d9a93a"/><stop offset="1" stop-color="#8a6212"/></radialGradient>'+
    '<filter id="fkSoft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.8"/></filter>'+
    '</defs><g id="fkScene"></g></svg>'+
    '<svg viewBox="-70 0 170 112" aria-hidden="true" class="fk-front" id="fkFrontSvg"></svg>';   // 受け皿の手前のかべだけ（転がる玉より前に重ねる）
  $("stage").innerHTML='<div class="fk-wrap"><div class="fk-mach"><div class="fk-box" id="box">'+svg+'</div></div>'+
    '<div class="fk-right"><div class="fk-cur" id="curBox"><div id="cur"></div><div class="fk-prize" id="prize"></div></div><div class="fk-list" id="list"></div></div></div>';
  paintList();
  if(run.th==null) run.th=HOLE_TH; drawBox(run.th);
}

/* ===== 3D（y＝上・z＝手前）。長さの1は、箱の角までの半径 ===== */
var G3={
  R:1, D:0.72, CY:1.42,            // 箱＝八角柱の半径・奥行き・軸の高さ
  AX:0.52,                          // 軸の出っぱり（箱の面から脚まで＝D/2＋少し）
  YAW:32, PITCH:17, DIST:9,         // 見る向き（右手前の少し上から）。⭐左右反転（2026-09-27 本人「反転できる？右に置いて、左に転がしたい」）前＝-32（左手前から）
  S:28, OX:50, OY:90,               // 絵の大きさと置き場所（viewBox の中）
  L:null
};
(function(){ var l=[-0.45,0.75,0.5], m=Math.sqrt(l[0]*l[0]+l[1]*l[1]+l[2]*l[2]); G3.L=l.map(function(v){ return v/m; }); })();
function v3view(p){   // 世界 → 見る向き
  var y=G3.YAW*Math.PI/180, x=G3.PITCH*Math.PI/180;
  var a=p[0]*Math.cos(y)+p[2]*Math.sin(y), c=-p[0]*Math.sin(y)+p[2]*Math.cos(y), b=p[1];
  return [a, b*Math.cos(x)-c*Math.sin(x), b*Math.sin(x)+c*Math.cos(x)];
}
function v3proj(v){ var k=G3.DIST/(G3.DIST-v[2]); return [G3.OX+G3.S*v[0]*k, G3.OY-G3.S*v[1]*k]; }
function v3sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function v3cross(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function v3norm(a){ var m=Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2])||1; return [a[0]/m,a[1]/m,a[2]/m]; }
function shade(rgb,n){   // n＝世界の向き。光の当たり方で明るさを変える
  var d=n[0]*G3.L[0]+n[1]*G3.L[1]+n[2]*G3.L[2], k=0.42+0.62*Math.max(0,d);
  return "rgb("+rgb.map(function(c){ return Math.min(255,Math.round(c*k)); }).join(",")+")";
}
/* 面を1つ足す（pts＝世界の点。表から見て左回り）。裏を向いている面は捨てる */
function face(list,pts,rgb,extra){
  var n=v3norm(v3cross(v3sub(pts[1],pts[0]),v3sub(pts[2],pts[0])));
  var vs=pts.map(v3view), vn=v3norm(v3cross(v3sub(vs[1],vs[0]),v3sub(vs[2],vs[0])));
  var c=[0,0,0]; vs.forEach(function(v){ c[0]+=v[0]; c[1]+=v[1]; c[2]+=v[2]; }); c=c.map(function(x){ return x/vs.length; });
  var toCam=[-c[0],-c[1],G3.DIST-c[2]];
  if(vn[0]*toCam[0]+vn[1]*toCam[1]+vn[2]*toCam[2]<=0) return;
  var sp=vs.map(v3proj);
  var d="M"+sp.map(function(q){ return q[0].toFixed(2)+" "+q[1].toFixed(2); }).join("L")+"Z";
  var col=typeof rgb==="string"?rgb:shade(rgb,n);
  list.push({z:c[2], svg:'<path d="'+d+'" fill="'+col+'" stroke="'+col+'" stroke-width=".35" stroke-linejoin="round"/>'+(extra?extra(sp):"")});
}
/* 箱（直方体）。x0..x1・y0..y1・z0..z1 */
function cuboid(list,x0,x1,y0,y1,z0,z1,rgb){
  var P=function(x,y,z){ return [x,y,z]; };
  face(list,[P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)],rgb);   // 手前
  face(list,[P(x1,y0,z0),P(x0,y0,z0),P(x0,y1,z0),P(x1,y1,z0)],rgb);   // 奥
  face(list,[P(x0,y1,z1),P(x1,y1,z1),P(x1,y1,z0),P(x0,y1,z0)],rgb);   // 上
  face(list,[P(x0,y0,z0),P(x1,y0,z0),P(x1,y0,z1),P(x0,y0,z1)],rgb);   // 下
  face(list,[P(x1,y0,z1),P(x1,y0,z0),P(x1,y1,z0),P(x1,y1,z1)],rgb);   // 右
  face(list,[P(x0,y0,z0),P(x0,y0,z1),P(x0,y1,z1),P(x0,y1,z0)],rgb);   // 左
}
/* 脚＝上の点から下の点へ、細い四角い棒 */
function leg(list,a,b,w,rgb){
  var h=w/2;
  var pts=function(p,dx,dz){ return [p[0]+dx,p[1],p[2]+dz]; };
  var A=[pts(a,-h,-h),pts(a,h,-h),pts(a,h,h),pts(a,-h,h)], B=[pts(b,-h,-h),pts(b,h,-h),pts(b,h,h),pts(b,-h,h)];
  for(var i=0;i<4;i++){ var j=(i+1)%4; face(list,[A[i],A[j],B[j],B[i]],rgb); }
}
/* ⭐色と形はイラストに寄せる（2026-09-27 本人がイラストを見せて「これイラスト」）＝脚は灰色の金属のA字（横木つき）・土台は明るい木の板 */
/* ⭐ガラガラの台（脚・横木）は木（2026-09-27 本人「ガラガラの台も木のイメージにしよう。グレーは嫌だな」）。前＝灰色の金属 */
var WOOD=[222,176,112], WOOD_SIDE=[205,150,86], LEGC=[184,128,70], BASEC=[236,206,150], TRAYC=[205,208,213], TRAY_IN=[120,124,130], CARPET=[178,36,54];
function drawBox(th){
  /* ⭐ぬる順は、かたまりごとに決める（土台 → 奥の脚 → 箱 → 受け皿 → 手前の脚 → ハンドル）。かたまりの中だけ遠い順
     ⚠全部をまとめて遠い順にすると、長い脚が箱のうしろに回ってしまった */
  var L0=[],L1=[],L2=[],L3=[],L4=[], list, i, R=G3.R, D=G3.D, CY=G3.CY, zf=D/2, zb=-D/2;
  /* 影 */
  var sh=[[-4.1,0,0.9],[1.35,0,0.9],[1.35,0,-0.9],[-4.1,0,-0.9]].map(function(p){ return v3proj(v3view([p[0]-0.08,p[1],p[2]-0.05])); });
  var shadow='<path d="M'+sh.map(function(q){ return q[0].toFixed(2)+" "+q[1].toFixed(2); }).join("L")+'Z" fill="rgba(0,0,0,.18)" filter="url(#fkSoft)"/>';
  /* 土台・受け皿（受け皿＝右手前の、ふちのある箱） */
  /* ⭐台を左へ長く・受け皿も同じく長く・受け皿は低く薄く・受け皿の下は赤いじゅうたん（2026-09-27 本人「台を長くして、受け取りトレーも同じく長くする」
       「受け取りトレーの高さと厚みを薄く」「そのトレーの下は、さっき見たイラストじゃないサイトの見本のように赤のじゅうたんを引いてみよう」）
     ⚠絵は左へはみ出して、左の列の下のほうまでのびる（viewBox を -70 から） */
  list=L0; cuboid(list,-4.05,1.3,0,0.1,-0.85,0.85,BASEC);
  /* ⭐受け皿は台の奥行きのまん中（2026-09-27 本人「受け皿と下の台、中央ぞろえになるようにして。今は手前だわ」）。じゅうたんは受け皿の内側だけ（本人「受け皿からはみ出さないように」） */
  var tx0=-3.85,tx1=-0.98,tz0=-0.32,tz1=0.32,ty0=0.1,ty1=0.18,wl=0.03;
  list=L3;
  face(list,[[tx0+wl,ty0+0.004,tz1-wl],[tx1-wl,ty0+0.004,tz1-wl],[tx1-wl,ty0+0.004,tz0+wl],[tx0+wl,ty0+0.004,tz0+wl]],CARPET);   // 赤いじゅうたん（受け皿の内側）
  cuboid(list,tx0,tx1,ty0,ty1,tz1-wl,tz1,TRAYC);   // 手前のかべ
  /* ⭐手前のかべは、転がる玉より前にもう一度かく＝玉の下のほうが、かべの立ち上がりで少し隠れる（2026-09-27 本人「受け皿の中を通るからグレーの立ち上がりで少し隠れるように」） */
  var LF=[]; cuboid(LF,tx0,tx1,ty0,ty1,tz1-wl,tz1,TRAYC); LF.sort(function(p,q){ return p.z-q.z; });
  $("fkFrontSvg").innerHTML=LF.map(function(o){ return o.svg; }).join("");
  cuboid(list,tx0,tx1,ty0,ty1,tz0,tz0+wl,TRAYC);   // 奥のかべ
  cuboid(list,tx0,tx0+wl,ty0,ty1,tz0,tz1,TRAYC);   // 左のかべ
  cuboid(list,tx1-wl,tx1,ty0,ty1,tz0,tz1,TRAYC);   // 右のかべ
  /* 脚4本＝軸の両はしから、土台の四すみへ */
  var za=zf+0.14, zc=zb-0.14;
  list=L1; leg(list,[-0.06,CY,zc],[-0.8,0.1,zc],0.15,LEGC); leg(list,[0.06,CY,zc],[0.8,0.1,zc],0.15,LEGC);
  cuboid(list,-0.5,0.5,0.5,0.6,zc-0.05,zc+0.05,LEGC);   // 横木
  cuboid(list,-0.05,0.05,CY-0.05,CY+0.05,zc-0.05,zb,[201,150,31]);   // 奥の軸
  list=L4; leg(list,[-0.06,CY,za],[-0.8,0.1,za],0.15,LEGC); leg(list,[0.06,CY,za],[0.8,0.1,za],0.15,LEGC);
  cuboid(list,-0.5,0.5,0.5,0.6,za-0.05,za+0.05,LEGC);
  /* 箱＝八角柱。z 軸のまわりに th 度まわる */
  list=L2; var fr=[], bk=[];
  for(i=0;i<8;i++){
    var a=(22.5+45*i+th)*Math.PI/180, x=R*Math.cos(a), y=CY+R*Math.sin(a);
    fr.push([x,y,zf]); bk.push([x,y,zb]);
  }
  for(i=0;i<8;i++){ var j=(i+1)%8; face(list,[fr[j],fr[i],bk[i],bk[j]],WOOD_SIDE); }
  /* ⭐玉の出口＝横の面の1つ（角0と角1のあいだ）にあいた丸い穴（2026-09-27 本人「玉が落ちてくるところに出口が欲しい（箱の方ね）」）
       箱といっしょに回る。止まるときは、この面が左を向いたところで止まる（→ turn） */
  (function(){
    var ma=(45+th)*Math.PI/180, rr=G3.R*Math.cos(Math.PI/8);
    var cx=rr*Math.cos(ma), cy=CY+rr*Math.sin(ma), ux=-Math.sin(ma), uy=Math.cos(ma), n=[Math.cos(ma),Math.sin(ma),0];
    var pts=[], k, hr=0.08;   // ⭐玉より少し大きいくらい（2026-09-27 本人「穴はもう少しだけ小さく。玉より少し大きいくらい」）。前＝0.13（玉の直径は約0.125）
    for(k=0;k<18;k++){ var t=k/18*Math.PI*2; pts.push([cx+n[0]*0.004+hr*Math.cos(t)*ux, cy+n[1]*0.004+hr*Math.cos(t)*uy, hr*Math.sin(t)]); }
    face(list,pts,"#3a2410");
    /* face の中で最後に入れたもの（穴）を、面より手前にする */
    if(list.length && list[list.length-1].svg.indexOf("#3a2410")>=0) list[list.length-1].z+=0.02;
  })();
  face(list,bk.slice().reverse(),WOOD);
  /* 手前の面＝木目のグラデーション・板のすじ・内側の線・ハンドル */
  face(list,fr.slice(),"url(#fkWood)",function(sp){
    var c=v3proj(v3view([0,CY,zf])), h="", k;
    var pr=sp;   // 角0〜7
    for(k=0;k<8;k++) h+='<line x1="'+c[0].toFixed(2)+'" y1="'+c[1].toFixed(2)+'" x2="'+pr[k][0].toFixed(2)+'" y2="'+pr[k][1].toFixed(2)+'" stroke="#b07a3c" stroke-width=".6" opacity=".55"/>';
    var inner=pr.map(function(q){ return [c[0]+(q[0]-c[0])*0.86, c[1]+(q[1]-c[1])*0.86]; });
    h+='<path d="M'+inner.map(function(q){ return q[0].toFixed(2)+" "+q[1].toFixed(2); }).join("L")+'Z" fill="none" stroke="#fbe9c9" stroke-width=".7"/>';
    return h;
  });
  /* ハンドル＝手前の脚より前。軸のはしから、回る角度に合わせた腕と桜色の玉 */
  var zh=za+0.14, c2=v3proj(v3view([0,CY,zh])), c1=v3proj(v3view([0,CY,zf])), ha=(th-90)*Math.PI/180, hp=v3proj(v3view([0.62*Math.cos(ha),CY+0.62*Math.sin(ha),zh]));
  var handle='<line x1="'+c1[0].toFixed(2)+'" y1="'+c1[1].toFixed(2)+'" x2="'+c2[0].toFixed(2)+'" y2="'+c2[1].toFixed(2)+'" stroke="#b8871c" stroke-width="3" stroke-linecap="round"/>'+
    '<line x1="'+c2[0].toFixed(2)+'" y1="'+c2[1].toFixed(2)+'" x2="'+hp[0].toFixed(2)+'" y2="'+hp[1].toFixed(2)+'" stroke="#c9961f" stroke-width="2.6" stroke-linecap="round"/>'+
    '<circle cx="'+c2[0].toFixed(2)+'" cy="'+c2[1].toFixed(2)+'" r="3.4" fill="url(#fkHub)"/>'+
    '<circle cx="'+hp[0].toFixed(2)+'" cy="'+hp[1].toFixed(2)+'" r="4" fill="url(#fkKnob)"/>';
  var out=shadow;
  [L0,L1,L2,L3,L4].forEach(function(g){ g.sort(function(p,q){ return p.z-q.z; }); out+=g.map(function(o){ return o.svg; }).join(""); });   // かたまりの中は遠いものから
  $("fkScene").innerHTML=out+handle;
  /* 受け皿のまん中（玉が落ちる場所）を、箱の幅に対する割合で持っておく */
  /* 玉が落ちるのは受け皿の右のはし（機械の下）。そこから左へ転がって大きく出る。割合は絵の幅（170）に対して */
  var bx=tx1-0.22, tp=v3proj(v3view([bx,ty0+0.06,(tz0+tz1)/2])), tq=v3proj(v3view([bx,ty1+0.9,(tz0+tz1)/2]));
  var lp=v3proj(v3view([tx0+0.25,ty0+0.06,(tz0+tz1)/2]));   // 受け皿の左のはし（ここまで小さいまま転がる）
  /* ⭐落ちた玉の大きさ＝受け皿の奥行きの1/3くらい（2026-09-27 本人「ポロンと落ちた球はもう少し小さくして、玉のサイズは受け皿の小さい奥行きの1/3くらい」） */
  /*   ＝画面で見えている受け皿の幅（手前のかべから奥のかべまで）の1/3 */
  var qa=v3proj(v3view([bx,ty1,tz0])), qb=v3proj(v3view([bx,ty1,tz1])), vis=Math.sqrt(Math.pow(qa[0]-qb[0],2)+Math.pow(qa[1]-qb[1],2));
  var cc=v3proj(v3view([0,G3.CY,0])); G3.center={x:(cc[0]+70)/170, y:cc[1]/170};
  /* 止まったときの出口のまん中（出口の面が左を向いたとき） */
  var hm=(45+HOLE_TH)*Math.PI/180, hrr=G3.R*Math.cos(Math.PI/8), hp=v3proj(v3view([hrr*Math.cos(hm)-0.05,G3.CY+hrr*Math.sin(hm),0]));
  G3.hole={x:(hp[0]+70)/170, y:hp[1]/170};   // 回る箱のまん中（絵の幅に対する割合）
  G3.tray={x:(tp[0]+70)/170, y1:tp[1]/170, y0:tq[1]/170, xL:(lp[0]+70)/170, yL:lp[1]/170, d:vis/3/170};
  /* 八角形の箱の、画面で見えている上のはしと左のはし（絵の幅に対する割合）。たての画面で玉を置く目安（2026-10-04） */
  var mnx=1e9, mny=1e9;
  for(var k=0;k<8;k++){ var a=(22.5+k*45)*Math.PI/180; [-G3.D/2,G3.D/2].forEach(function(z){
    var p=v3proj(v3view([G3.R*Math.cos(a),G3.CY+G3.R*Math.sin(a),z])); if(p[0]<mnx) mnx=p[0]; if(p[1]<mny) mny=p[1]; }); }
  G3.oct={left:(mnx+70)/170, top:mny/170};
}
var turnRaf=0;
/* ⭐回る＝3秒。はじめ速く、最後はゆっくり、出口の面が左を向く角度（HOLE_TH）でぴたりと止まる（2026-09-27 出口を足したとき）
     向きは手前から見て時計回り（本人「回転が逆回りかな」）。前＝1秒に200度でずっと同じ速さ・止まる角度はばらばら */
var HOLE_TH=135, TURN_MS=3000;
function turn(on){
  cancelAnimationFrame(turnRaf);
  if(!run) return;
  if(!on){ run.th=HOLE_TH; drawBox(run.th); return; }   // 止めるときは、出口が左を向いた角度にそろえる
  var t0=performance.now(), th0=(run.th==null?HOLE_TH:run.th);
  var base=600, extra=(((th0-base-HOLE_TH)%360)+360)%360, total=base+extra;   // 少なくとも600度まわって、HOLE_TH で止まる
  (function step(now){
    var t=Math.min(1,(now-t0)/TURN_MS), e=1-Math.pow(1-t,2.2);   // 最後がゆっくり
    run.th=(((th0-total*e)%360)+360)%360; drawBox(run.th);
    if(t<1) turnRaf=requestAnimationFrame(step); else run.th=HOLE_TH;
  })(t0);
}
function paintList(){
  var h="";
  st.rows.forEach(function(r,i){
    var l=leftOf(i);
    var hit=run && run.hit===i;   // ⭐いま出た賞の枠は光る（2026-09-27 本人「当たったら、左の枠が光るとか」）
    h+='<span class="fk-item'+(l<=0?" zero":"")+(hit?" hit":"")+'" style="--bc:'+colorOf(r.c)+'"><span class="fk-dot" style="background:'+colorOf(r.c)+'"></span>'+esc(r.n)+'　のこり '+Math.max(0,l)+'</span>';
  });
  $("list").innerHTML=h;
}
function bigD(){ var r=$("stage").getBoundingClientRect();
  /* ⭐たての画面は上下に分けたので、玉は横幅を使って大きく（2026-10-04 本人「上下にするとき…1/3くらいでも」・fukubiki.css） */
  if(window.matchMedia && matchMedia("(orientation: portrait)").matches){
    /* ⭐玉のまん中＝八角形の箱の上のはしの高さ・箱の左のあいたところ（2026-10-04 本人「玉が小さいから、もう少し下に下げて、玉のサイズを大きくして。福引の箱の上端の高さが玉の中心くらい」）。
         大きさ＝上は画面からはみ出さない・横は箱にかからない。前＝機械の上（画面の上のはしと機械のあいだ） */
    var o=octRect(); if(!o) return Math.max(60, Math.min(r.height*0.3, r.width*0.4, 520));
    /* ⭐入るいちばん大きいサイズの8割（2026-10-04 本人「大きすぎた笑 あと少し小さくして」）。まん中の位置は変えない */
    return Math.max(60, 0.8*Math.min(2*(o.top-r.top-4), o.left-r.left-24, r.width*0.55, 520));
  }
  return Math.min(r.height*0.56, r.width*0.28, 520); }   // ⭐大きく（2026-09-27 本人「サイズも大きくしていいよ」→「こうやって見ると、もっと球が大きくてもいいな」）。前＝0.36・0.2・260 → 0.46・0.23・420
function update(){
  var left=pool().length;
  $("roundLbl").textContent=st.drawn.length? st.drawn.length+"回目" : "";
  $("leftLbl").textContent="のこり "+left+"本";
  $("runMsg").textContent= run.busy || left ? "" : "全部出ました";   // ⭐「「回す」でガラガラ」は出さない（2026-09-27 本人「回すで「ガラガラ」いらないや」）
  $("nextBtn").disabled=run.busy || !left;
  $("resetBtn").disabled=run.busy;
}
/* ⭐大きい玉の置き場所＝よこは「回す」ボタンの上（画面のまん中）、たては回る箱（八角形）のまん中と同じ高さ
     （2026-09-27 本人「拡大する位置は、今ある回すボタンの上が中心で、高さはぐるぐる回す中心（8角形の中心）と同じ高さにしてみて」） */
/* 八角形の箱（回るところ）の画面の上の四角。たての画面で玉を置く目安 */
function octRect(){ var bx=$("box"); if(!bx || !G3.oct) return null; var b=bx.getBoundingClientRect(); return {top:b.top+b.width*G3.oct.top, left:b.left+b.width*G3.oct.left}; }
function placeCur(d){
  var box=$("box"), wrap=box && box.closest(".fk-wrap"); if(!wrap || !G3.center) return;
  var br=box.getBoundingClientRect(), wr=wrap.getBoundingClientRect();
  var cy=br.top+br.width*G3.center.y-wr.top;
  /* ⭐賞の名前は玉の上（2026-09-27 本人「文字、上にしてみて」）＝名前の高さとすきまの分だけ上から始める。玉のまん中は箱のまん中の高さのまま */
  var cb=$("curBox"), gap=parseFloat(getComputedStyle(cb).rowGap)||0, ph=$("prize").offsetHeight;
  cb.style.top=(cy-d/2-(ph?ph+gap:0))+"px";   // 名前を出さないとき（いま）は、玉だけ
  /* ⭐よこは、転がった先（受け皿の左のはし）の上（2026-09-27 本人「もう少し左に球を表示して」「転がった先の上にしようか」）。前＝画面のまん中 */
  $("curBox").style.left=(br.left+br.width*G3.tray.xL-wr.left)+"px";
  /* ⭐たての画面（上下に分けた形）は、玉のまん中を八角形の箱の上のはしの高さに、横は箱の左のあいたところのまん中に（2026-10-04 本人「福引の箱の上端の高さが玉の中心くらい」）。
       ⚠受け皿の左のはしの上だと、スマホで画面の左にはみ出した。「機械のすぐ下」→「機械の上・横のまん中」→ これ、と変えてきた */
  if(window.matchMedia && matchMedia("(orientation: portrait)").matches){
    var o=octRect();
    if(o){
      cb.style.top=Math.max(4,(o.top-wr.top-d/2)-(ph?ph+gap:0))+"px";
      cb.style.left=((o.left-wr.left)/2)+"px";
    }
  }
}
function showBall(i,animFrom){
  var d=bigD(), b=document.createElement("div"); b.className="fk-ball";
  placeCur(d);
  b.style.setProperty("--bc",colorOf(st.rows[i].c)); b.style.width=b.style.height=d+"px";
  $("cur").innerHTML=""; $("cur").appendChild(b);
  $("prize").textContent=st.rows[i].n;
  if(animFrom && b.animate){
    var bb=b.getBoundingClientRect();
    var dx=(animFrom.left+animFrom.width/2)-(bb.left+bb.width/2), dy=(animFrom.top+animFrom.height/2)-(bb.top+bb.height/2), sc=animFrom.width/bb.width;
    /* ⭐止まらずに、転がってきた勢いのまま大きくなる（本人「いったん止まってるから、止まらずにそのまま拡大」）＝はじめが速い動き */
    b.animate([{transform:"translate("+dx+"px,"+dy+"px) scale("+sc+") rotate(300deg)"},{transform:"none"}],{duration:950,easing:"cubic-bezier(.2,.55,.3,1)"});
    $("prize").animate && $("prize").animate([{opacity:0,transform:"scale(.6)"},{opacity:0,offset:.6},{opacity:1,transform:"none"}],{duration:1100,easing:"ease-out"});
  }
}
/* ⭐画面の向きや大きさが変わったら、出ている玉の大きさと場所を合わせ直す（2026-10-04・タブレットを横にしたとき前の場所に残っていた） */
var fkRsT=0;
window.addEventListener("resize",function(){ clearTimeout(fkRsT); fkRsT=setTimeout(function(){
  if(!run || run.busy) return;
  var b=$("cur") && $("cur").firstChild; if(!b) return;
  var d=bigD(); b.style.width=b.style.height=d+"px"; placeCur(d);
},120); });
function spin(){
  if(!run || run.busy) return;
  var p=pool(); if(!p.length) return;
  run.busy=true; update();
  KU.clear();   // 前のくす玉と紙吹雪を片付ける
  $("cur").innerHTML=""; $("prize").textContent="";
  run.hit=null; paintList();   // 回しはじめたら、光を消す
  $("box").classList.add("spin"); turn(true); snd("turn");
  later(function(){
    $("box").classList.remove("spin"); turn(false); sndFade("turn",250); snd("drop");
    var i=p[rnd(p.length)];
    var box=$("box"), W=box.getBoundingClientRect().width;
    var mini=document.createElement("div"); mini.className="fk-ball fk-drop";
    mini.style.setProperty("--bc",colorOf(st.rows[i].c));
    mini.style.width=mini.style.height=(W*G3.tray.d)+"px";   // 受け皿の奥行きの1/3
    /* ⭐玉は出口から出て、受け皿へ落ちる（前＝受け皿の上の空中から落ちていた） */
    mini.style.left=(W*G3.tray.x)+"px"; mini.style.top=(W*G3.tray.y1)+"px"; mini.style.animation="none";
    box.appendChild(mini);
    var hx=W*(G3.hole.x-G3.tray.x), hy=W*(G3.hole.y-G3.tray.y1), fk=[];
    for(var q=0;q<=6;q++){ var u=q/6; fk.push({transform:"translate(calc(-50% + "+(hx*(1-u)).toFixed(1)+"px),calc(-50% + "+(hy*(1-u*u)).toFixed(1)+"px))"}); }   // よこはまっすぐ、たては落ちるほど速く
    if(mini.animate) mini.animate(fk,{duration:380,easing:"linear",fill:"forwards"});
    /* ⭐落ちたら、小さいまま受け皿の左のはしまで転がって、そこから大きくなって出る（2026-09-27 本人「せっかく長くしたから受け皿の左まで小さいサイズで転がって、羽化して大きくしよう」） */
    /* ⭐落ちたら止まらずに、そのまま すーっと左のはしまで（本人「落ちた球は止まらずにそのまますーっと端まで。揺れなくてもOK」）
       ⭐はしに着いたら止まらずに、そのまま大きくなる（本人「ふわっと浮かせるときにいったん止まってるから、止まらずにそのまま拡大」）。前＝弾んで止まる → 転がる → 浮く → 大きく */
    var FALL=380, ROLL=1300;
    later(function(){
      var dx=W*(G3.tray.xL-G3.tray.x), dy=W*(G3.tray.yL-G3.tray.y1), d=W*G3.tray.d, ang=dx/(Math.PI*d)*360;
      if(mini.animate) mini.animate([
        {transform:"translate(-50%,-50%)"},
        {transform:"translate(calc(-50% + "+dx+"px),calc(-50% + "+dy+"px)) rotate("+ang+"deg)"}
      ],{duration:ROLL,easing:"cubic-bezier(.3,.3,.6,.9)",fill:"forwards"});
    },FALL);
    later(function(){
      var from=mini.getBoundingClientRect(); mini.remove();
      showBall(i,from);
      st.drawn.push(i); screenSave();
      if(i<3 && st.rows[i].ku) later(function(){ KU.pop(KU_COL[i], st.rows[i].n); },500);   // ⭐くす玉を入れた賞（1〜3行目）なら割る
      later(function(){ run.hit=i; paintList(); run.busy=false; update(); },1000);
    },FALL+ROLL);
  },3000);
}
function start(demo){
  if(!pool().length && !st.drawn.length){ alert("先に①で、本数を入れてください。"); $("opt1").open=true; return false; }
  run={busy:false};
  timers.forEach(clearTimeout); timers=[];
  var rs=$("runScreen"); rs.hidden=false; rs.classList.toggle("framed",!!demo);
  $("demoBack").hidden=!demo; $("demoBadge").hidden=!demo;
  document.body.style.overflow="hidden";
  build();
  var last=st.drawn[st.drawn.length-1];
  if(last!=null && st.rows[last]) showBall(last,null);   // 続きから＝最後に出た玉を出しておく
  update();
  if(!demo) keepAwake(true);
  return true;
}
function stop(){
  timers.forEach(clearTimeout); timers=[]; cancelAnimationFrame(turnRaf); KU.clear();
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
$("resetBtn").addEventListener("click",function(){
  if(!run || run.busy) return;
  if(st.drawn.length && !confirm("出た玉を全部箱に戻して、はじめからにしますか？")) return;
  KU.clear(); st.drawn=[]; screenSave(); $("cur").innerHTML=""; $("prize").textContent=""; run.hit=null; paintList(); update();
});
$("backBtn").addEventListener("click",stop);

/* =====================================================================
   ⭐くす玉（2026-10-04 本人「3等まで、くす玉やったらどうかな？」「ボタンで自動設定。①の賞と本数のところで、ただし3等までね。金銀銅で」）
   ＝①でくす玉を入れた賞（1〜3行目）が出たら、画面の上から金・銀・銅のくす玉が下りてきて、自動で割れる。垂れ幕は賞の名前
   ⭐絵と紙吹雪は くす玉メーカー（kusudama/kusudama.js）と同じ。写したもの＝GRAD・banner・kusuSvg・CONF・confetti。⚠向こうを直したら、ここも直す
   ⭐割れてしばらくしたら、くす玉は上へ引っこむ（玉が見えるように）。紙吹雪（金は積もる）は次に回すまで残る
   ===================================================================== */
var KU=(function(){
  var GRAD={ gold:["#ffe98a","#f2b82c","#c98a10","#b07a0c"], silver:["#ffffff","#c4cad2","#8a929c","#7a828c"], bronze:["#f6c89a","#c47a3a","#8a4f1e","#7a4418"] };
  var KUSU_INDENT=2, KUSU_BY=150, KUSU_R=230, uid=0, tms=[], rafs=[], box=null;
  function banner(raw,ex){
    raw=(raw||"").trim()||ex;
    raw=raw.replace(/[0-9]/g,function(d){ return String.fromCharCode(d.charCodeAt(0)+0xFEE0); });   // 数字は全角＝縦書きで立つ
    var cols=raw.split(/[\/／]+/).map(function(c){ return c.trim(); }).filter(Boolean).slice(0,2); if(!cols.length) cols=[ex];
    var n=Math.max.apply(null, cols.map(function(c,i){ return c.length+(i>0?KUSU_INDENT:0); }));
    var fs=Math.max(14, Math.min(34, Math.floor(262/(n*1.12)))), sp=Math.round(fs*0.12);
    var gapX=Math.round(fs*1.2), w=cols.length===2 ? Math.max(86, gapX+fs+36) : 86, x0=250-w/2, BY=KUSU_BY, fid="fksh"+uid;
    var h='<line x1="250" y1="0" x2="250" y2="'+BY+'" stroke="#d9a93a" stroke-width="4"/>'+
          '<rect x="'+x0+'" y="'+BY+'" width="'+w+'" height="290" rx="5" fill="#fff" stroke="#e2403f" stroke-width="4" filter="url(#'+fid+')"/>';
    var step=fs+sp, blockH=Math.max.apply(null, cols.map(function(c,i){ return (c.length+(i>0?KUSU_INDENT:0))*step-sp; }));
    var top=BY+Math.max(12,(290-blockH)/2);
    cols.forEach(function(c,i){
      var cx=cols.length===2 ? (i===0 ? 250+gapX/2 : 250-gapX/2) : 250, y=top+(i>0 ? KUSU_INDENT*step : 0);
      h+='<text x="'+cx+'" y="'+y+'" font-size="'+fs+'" font-weight="800" fill="#e2403f" style="writing-mode:vertical-rl" letter-spacing="'+sp+'">'+esc(c)+'</text>';
    });
    return h;
  }
  function kusuSvg(color,text){
    uid++;
    var g=GRAD[color]||GRAD.gold, sp="fksp"+uid, lb="fklb"+uid, rf="fkrf"+uid, bl="fkbl"+uid, R=KUSU_R;
    var B=banner(text,"おめでとう");
    var half=function(sw){ return 'M250 -'+R+' A'+R+' '+R+' 0 0 '+sw+' 250 '+R; };
    function body(sw,hl){
      return '<path d="'+half(sw)+' Z" fill="url(#'+sp+')"/>'+'<path d="'+half(sw)+' Z" fill="url(#'+rf+')"/>'+'<path d="'+half(sw)+' Z" fill="url(#'+lb+')"/>'+
        (hl ? '<ellipse cx="190" cy="150" rx="58" ry="26" transform="rotate(-22 190 150)" fill="#fff" opacity=".5" filter="url(#'+bl+')"/>' : '')+
        '<path d="'+half(sw)+'" fill="none" stroke="'+g[3]+'" stroke-opacity=".55" stroke-width="1.2"/>';
    }
    return '<svg viewBox="0 0 500 460" xmlns="http://www.w3.org/2000/svg"><defs>'+
     '<filter id="fksh'+uid+'" x="-30%" y="-10%" width="160%" height="120%"><feDropShadow dx="4" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".35"/></filter>'+
     '<filter id="'+bl+'" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>'+
     '<radialGradient id="'+sp+'" gradientUnits="userSpaceOnUse" cx="195" cy="115" r="300" fx="185" fy="125"><stop offset="0" stop-color="'+g[0]+'"/><stop offset=".45" stop-color="'+g[1]+'"/><stop offset=".85" stop-color="'+g[2]+'"/><stop offset="1" stop-color="'+g[3]+'"/></radialGradient>'+
     '<radialGradient id="'+lb+'" gradientUnits="userSpaceOnUse" cx="250" cy="0" r="'+R+'"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset=".94" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>'+
     '<radialGradient id="'+rf+'" gradientUnits="userSpaceOnUse" cx="300" cy="'+(R+40)+'" r="120"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'+
     '</defs><g class="banner">'+B+'</g><g class="half l">'+body(0,true)+'</g><g class="half r">'+body(1,false)+'</g></svg>';
  }
  var CONF={
    bronze:{cols:["#c47a3a"], k:0.3, glint:true, glintCol:"#ffe2bf", glintTh:0.9, glintBlur:6},
    silver:{cols:["#c4cad2","#c4cad2","#ffffff","#c86a8e","#eaa6c0","#b8a6e0"], k:0.8, glint:true},
    gold:  {cols:["#f2b82c","#f2b82c","#f2b82c","#ffe98a","#ffe98a","#c4cad2","#c4cad2","#ffffff","#e67999","#f2a163","#69b992","#58baca","#6e89d8","#a17ad9","#ff4fa3"], k:1.6, glint:true, stars:0.22, hearts:0.07, star5:0.07, linger:true}
  };
  function later2(fn,ms){ tms.push(setTimeout(fn,ms)); }
  function host(){
    if(box && box.parentNode) return box;
    box=document.createElement("div"); box.className="fk-kx"; $("runScreen").appendChild(box); return box;
  }
  function confetti(q,color){
    var hb=host(), fb=hb.getBoundingClientRect(), W=fb.width, H=fb.height; if(!W||!H) return;
    var cv=document.createElement("canvas"), dpr=window.devicePixelRatio||1; cv.width=W*dpr; cv.height=H*dpr; hb.appendChild(cv);
    var ctx=cv.getContext("2d"); ctx.scale(dpr,dpr);
    var conf=CONF[color]||CONF.gold, G=3400, N=Math.round(Math.min(300, W/2.6)*conf.k), ps=[];
    for(var i=0;i<N;i++){
      var p, side=(Math.random()<.5?-1:1);
      if(i<N*0.3){ p={x:q.cx+(Math.random()-.5)*q.ballR*4.2, y:-20-Math.random()*H*0.25, vx:(Math.random()-.5)*120, vy:40+Math.random()*120, delay:0.05+Math.random()*0.9}; }
      else if(i<N*0.6){ var off=Math.random()*q.ballR; p={x:q.cx+side*off, y:q.top+Math.random()*q.ballR*0.85, vx:side*(150+Math.random()*450)*(0.4+off/q.ballR), vy:-80-Math.random()*320, delay:Math.random()*0.35}; }
      else{ var bh=q.bBot-q.bTop; p={x:q.cx+side*Math.random()*q.ballR*1.7, y:q.bTop+bh*(0.45+Math.random()*0.6), vx:side*(120+Math.random()*560), vy:-250-Math.random()*450, delay:0.15+Math.random()*0.5}; }
      p.term=80+Math.random()*80; p.sw=18+Math.random()*34; p.sf=1.5+Math.random()*2.5; p.ph=Math.random()*6.3;
      p.rot=Math.random()*6.3; p.vr=(Math.random()-.5)*12; p.flip=Math.random()*6.3; p.vf=5+Math.random()*9;
      var sz=Math.max(0.55, Math.min(1, W/1100));
      p.w=(7+Math.random()*6)*sz; p.h=(10+Math.random()*8)*sz; p.round=Math.random()<.18;
      p.col=conf.cols[Math.floor(Math.random()*conf.cols.length)];
      p.glint=conf.glint && (p.col==="#c4cad2" || p.col==="#f2b82c" || p.col==="#ffe98a" || p.col==="#ffffff" || p.col==="#c47a3a");
      if(conf.linger){ if(Math.random()<0.35){ p.term=28+Math.random()*34; p.sw*=1.7; } if(Math.random()<0.5) p.floor=H-3-Math.random()*16; }
      p.gc=conf.glintCol||"#ffffff"; p.gt=conf.glintTh||0.72; p.gb=conf.glintBlur||10;
      p.star=conf.stars && Math.random()<conf.stars;
      if(!p.star){ var rr=Math.random();
        if(conf.hearts && rr<conf.hearts){ p.shape="heart"; p.col=["#ff4f8b","#e67999","#ff7aa8"][Math.floor(Math.random()*3)]; p.glint=false; }
        else if(conf.star5 && rr<conf.hearts+conf.star5){ p.shape="star5"; p.col=["#f2b82c","#ffd84a"][Math.floor(Math.random()*2)]; p.glint=false; } }
      ps.push(p);
    }
    var h={stop:false}, last=performance.now(), t0=last; rafs.push(h);
    function f(now){
      if(h.stop){ if(cv.parentNode) cv.remove(); return; }
      var dt=Math.min(0.04,(now-last)/1000), t=(now-t0)/1000; last=now;
      ctx.clearRect(0,0,W,H);
      var alive=0;
      for(var i=0;i<ps.length;i++){
        var p=ps[i]; if(t<p.delay){ alive++; continue; }
        if(!p.rest){
          if(p.vy<0) p.vy+=G*dt; else { p.vy=Math.min(p.term,p.vy+G*dt*0.15); p.vx*=0.94; }
          p.x+=p.vx*dt+(p.vy>0?Math.sin(t*p.sf+p.ph)*p.sw*dt:0); p.y+=p.vy*dt; p.rot+=p.vr*dt; p.flip+=p.vf*dt;
          if(p.floor && p.vy>0 && p.y>=p.floor){ p.y=p.floor; p.rest=true; p.flip=Math.PI*0.08+Math.random()*0.5; p.star=false; }
        }
        if(p.y>H+20 && p.vy>0) continue;
        alive++;
        var fc=Math.cos(p.flip);
        if(p.star){
          var a=0.35+0.65*Math.abs(Math.sin(t*7+p.ph)), R=Math.max(9, p.w*1.7);
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*0.3); ctx.globalAlpha=a; ctx.shadowColor="rgba(255,236,150,.95)"; ctx.shadowBlur=10; ctx.fillStyle="#fff6c8";
          ctx.beginPath(); ctx.moveTo(0,-R); ctx.quadraticCurveTo(0,0,R,0); ctx.quadraticCurveTo(0,0,0,R); ctx.quadraticCurveTo(0,0,-R,0); ctx.quadraticCurveTo(0,0,0,-R); ctx.fill(); ctx.restore(); continue;
        }
        if(p.shape){
          var S=(p.shape==="star5") ? Math.max(13, p.h*1.5) : Math.max(8, p.h*0.95);
          /* ⭐ハートと星も紙なので、ある程度くるくる回る（2026-10-04 本人「紙でハートとか星が入ってるなら、ある程度回ったほうがいい」）。
               ＝くるっと回り（四角い紙の6割の速さ）、裏返りもする。⚠真横を向いて細い線にならないよう、幅は3割より細くしない
               前＝回らずに少しだけゆれる（くす玉メーカーのまま）。くす玉メーカー（kusudama.js）も同じにした */
          var sx=(fc<0?-1:1)*Math.max(0.3,Math.abs(fc));
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*0.6); ctx.scale(sx,1); ctx.fillStyle=p.col; ctx.beginPath();
          if(p.shape==="heart"){ ctx.moveTo(0,S*0.35); ctx.bezierCurveTo(-S*1.1,-S*0.35,-S*0.45,-S*1.05,0,-S*0.45); ctx.bezierCurveTo(S*0.45,-S*1.05,S*1.1,-S*0.35,0,S*0.35); }
          else{ for(var k=0;k<10;k++){ var rad=(k%2===0)?S*0.75:S*0.32, an=-Math.PI/2+k*Math.PI/5; if(k===0) ctx.moveTo(Math.cos(an)*rad,Math.sin(an)*rad); else ctx.lineTo(Math.cos(an)*rad,Math.sin(an)*rad); } ctx.closePath(); }
          ctx.fill(); ctx.restore(); continue;
        }
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.scale(1,fc);
        var shine=p.glint && Math.abs(fc)>p.gt; ctx.fillStyle=shine ? p.gc : p.col; if(shine){ ctx.shadowColor=p.gc; ctx.shadowBlur=p.gb; }
        if(p.round){ ctx.beginPath(); ctx.arc(0,0,p.w*0.55,0,6.3); ctx.fill(); } else ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      }
      if(conf.linger ? t<40 : (alive && t<14)) requestAnimationFrame(f); else if(!conf.linger && cv.parentNode) cv.remove();
    }
    requestAnimationFrame(f);
  }
  function clear(){ tms.forEach(clearTimeout); tms=[]; rafs.forEach(function(h){ h.stop=true; }); rafs=[]; if(box){ box.innerHTML=""; } }
  /* 下りてくる → 0.7秒で割れる（紙吹雪）→ 3.5秒で上へ引っこむ */
  function pop(color,text){
    clear();
    var hb=host(), el=document.createElement("div"); el.className="kusu"; el.innerHTML=kusuSvg(color,text); hb.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add("in"); }); setTimeout(function(){ el.classList.add("in"); },30);
    later2(function(){
      el.classList.add("open");
      var fb=hb.getBoundingClientRect(), r=el.getBoundingClientRect(), k=r.width/500, L=r.left-fb.left, T=r.top-fb.top;
      confetti({cx:L+r.width/2, top:T, ballR:KUSU_R*k, bTop:T+KUSU_BY*k, bBot:T+(KUSU_BY+290)*k}, color);
    },700);
    later2(function(){ el.classList.add("out"); },4200);
    later2(function(){ if(el.parentNode) el.remove(); },4800);
  }
  return {pop:pop, clear:clear};
})();

/* ⭐クラッカー＝当たりが出たら押す（2026-10-04 本人「福引もビンゴみたいに、左下にあたり！のボタン作って、クラッカー配置して」）
   ＝ビンゴ（bingo.js の cracker）と同じ。左下と右下の角から、紙吹雪が放射状に上へ飛んで、落ちてくる。音はなし */
var CF_COLS=["#e2536b","#f0a33a","#4aa3df","#58b368","#9b6fd1","#e86fb0","#e0b52e","#3fb8af"];
var cfRaf=0;
function cracker(){
  var host=$("runScreen"); if(!host || host.hidden) return;
  var old=host.querySelector("canvas.bg-cf"); if(old){ cancelAnimationFrame(cfRaf); old.remove(); }
  var W=host.clientWidth, H=host.clientHeight; if(!W||!H) return;
  var dpr=window.devicePixelRatio||1;
  var cv=document.createElement("canvas"); cv.className="bg-cf";
  cv.width=W*dpr; cv.height=H*dpr;
  cv.style.cssText="position:absolute;left:0;top:0;width:"+W+"px;height:"+H+"px;z-index:60;pointer-events:none;transition:opacity .5s";
  host.appendChild(cv);
  var ctx=cv.getContext("2d"); ctx.scale(dpr,dpr);
  var G=H*3.2, N=Math.min(220,Math.round(W/5)), ps=[];
  for(var i=0;i<N;i++){
    var dir=(i%2===0)?1:-1;
    var x0=(dir===1)? W*(-0.06+Math.random()*0.1) : W*(1.06-Math.random()*0.1);
    var y0=H+10+H*Math.random()*0.15;
    var peak=H*(-0.1+Math.random()*0.6);
    var vy=-Math.sqrt(2*G*(y0-peak));
    var ang=(6+Math.random()*34)*Math.PI/180;
    ps.push({x:x0,y:y0,vx:dir*(-vy)*Math.tan(ang),vy:vy,term:H*(0.12+Math.random()*0.1),
      w:6+Math.random()*6,h:8+Math.random()*8,rot:Math.random()*6.3,vr:(Math.random()-.5)*12,
      sw:10+Math.random()*25,ph:Math.random()*6.3,col:CF_COLS[i%CF_COLS.length],delay:(dir===1?0:0.12)+Math.random()*0.15});
  }
  var t0=performance.now(), last=t0, END=5.5;
  function step(now){
    var dt=Math.min(0.05,(now-last)/1000), t=(now-t0)/1000; last=now;
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<ps.length;i++){
      var p=ps[i]; if(t<p.delay) continue;
      if(p.vy<p.term){ p.vy+=G*dt; if(p.vy>p.term) p.vy=p.term; p.vx*=Math.pow(0.35,dt); } else { p.vx*=Math.pow(0.2,dt); }
      p.x+=p.vx*dt+(p.vy>0? Math.sin(t*3+p.ph)*p.sw*dt:0); p.y+=p.vy*dt; p.rot+=p.vr*dt;
      if(p.y>H+30 && p.vy>0) continue;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.scale(1,Math.cos(t*6+p.ph));
      ctx.fillStyle=p.col; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
    }
    if(t>END-0.6) cv.style.opacity="0";
    if(t<END) cfRaf=requestAnimationFrame(step); else cv.remove();
  }
  cfRaf=requestAnimationFrame(step);
}
$("crackerBtn").addEventListener("click",cracker);
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

/* はじめ */
if(screenLoad()) $("opt1").open=true;
render();
})();
