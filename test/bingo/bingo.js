/* ビンゴマシーン（2026-09-26 たたき台）
   ⭐本人「福引のガラガラと、ビンゴは一緒にサクッと作ってもいいね」。番号1〜75を引いて、出た番号を表に並べる
   ⭐カゴ・玉・回し方はランダム指名メーカー（../random/random.js）と同じ動き（ここに写してある。⚠直すときは両方）
     ＝針金のカゴが左右の軸でくるくる回る（1秒に0.55回転・3秒）・ハンドルは右の横・玉は縦に回る・うすい色の玉・受け皿に落ちて弾んでから大きく出る */
(function(){
"use strict";
function $(id){ return document.getElementById(id); }
function rnd(n){ try{ var a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; }catch(e){ return Math.floor(Math.random()*n); } }
/* ⭐玉の色は列（B・I・N・G・O）で決める（2026-09-27 本人「出てきた玉の色を付ける。次が出たらグレーアウト。1つ目の組み合わせを基本として、赤をピンクに」）
   ＝本物のビンゴの玉の色分け（B青・I赤・N白・G緑・O黄）の赤をピンクに。前＝出た順に8色を回していた（数字と関係なし）
   1〜75以外（列がない）は、番号で5色を順に回す */
/* ⭐2回目（2026-09-27 本人「普通はNが白だけど、そこは黄色にしよう」「オレンジでよくない？」）＝B 青・I ピンク・N 黄・G 緑・O オレンジ
   ⭐I と取っ手の玉は、サイトのいつものピンク #c86a8e（2026-09-27 本人「いつものピンクにしてみて」）。前＝#e86fb0
   ⚠黄とオレンジが近く見えないよう、黄は明るく（#f2c518）・オレンジは赤よりに（#f07830） */
var BALL_COLORS=["#4aa3df","#c86a8e","#f2c518","#58b368","#f07830"];
/* 表の左の B・I・N・G・O の字の色＝玉の色を濃くしたもの（白い地で読めるように。黄は特に濃く） */
var LETTER_COLORS=["#2f86c4","#c86a8e","#c49a00","#3f9a50","#d9611a"];
function colorOf(n){ return BALL_COLORS[st.max===75 ? Math.floor((n-1)/15) : (n-1)%5]; }
var LETTERS="BINGO";

/* ===== いまの中身 ===== */
var st={max:75, mode:"75", drawn:[]};
function segSet(id,val){
  Array.prototype.forEach.call($(id).querySelectorAll("button"),function(b){
    var on=b.getAttribute("data-v")===String(val); b.classList.toggle("on",on); b.setAttribute("aria-checked",on?"true":"false");
  });
}
function setMode(v){
  st.mode=(v==="90"||v==="free")?v:"75";
  segSet("segMax",st.mode);
  $("freeRow").hidden=st.mode!=="free";
  st.max = st.mode==="75" ? 75 : st.mode==="90" ? 90 : Math.max(2,Math.min(99,$("maxN").value|0||50));
  $("maxHint").textContent = st.mode==="75"
    ? "ふつうのビンゴカードの数です。表と玉に B・I・N・G・O の文字も出ます。"
    : "1から"+st.max+"までの番号が出ます。";
}
function letterOf(n){ return st.max===75 ? LETTERS.charAt(Math.floor((n-1)/15)) : ""; }
$("segMax").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; setMode(b.getAttribute("data-v")); st.drawn=[]; screenSave(); });
$("maxN").addEventListener("input",function(){ if((this.value|0)>=2){ setMode("free"); st.drawn=[]; screenSave(); } });

/* ===== 画面の保存（チェックを入れたときだけ）。出た番号も残す＝まちがえて閉じても続きから ===== */
var KEY="sakura-bingo";
function screenSave(){
  if(!$("save").checked) return;
  try{ localStorage.setItem(KEY, JSON.stringify({mode:st.mode, max:st.max, drawn:st.drawn})); flash("保存しました"); }catch(e){}
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
    $("save").checked=true;
    if(s.mode==="free") $("maxN").value=s.max;
    setMode(s.mode);
    st.drawn=(s.drawn||[]).filter(function(n){ return n>=1 && n<=st.max; });
    return true;
  }catch(e){ return false; }
}

/* 「？」の開け閉め */
document.addEventListener("click",function(e){
  var b=e.target.closest(".tip-btn"); if(!b) return;
  var host=b.closest("h2,summary,p,label"), body=host && host.nextElementSibling;
  if(!body || !body.classList.contains("tip-body")) return;
  e.preventDefault(); body.hidden=!body.hidden; b.setAttribute("aria-expanded", body.hidden?"false":"true");
});

/* =====================================================================
   動かす画面
   ===================================================================== */
var run=null, timers=[], cageRaf=0, wakeLock=null, demo=false;
function later(fn,ms){ timers.push(setTimeout(fn,ms)); }
function pool(){ var a=[]; for(var n=1;n<=st.max;n++) if(st.drawn.indexOf(n)<0) a.push(n); return a; }

/* ⭐立体のビンゴマシーン（2026-09-27 本人「今、ビンゴの立体感を出そうと思ったらできるの？」「じゃ、やってほしい」「右に機械だからAで、中央にドーンと玉」）
     ＝並び：左に番号の表（B・I・N・G・O をたてに）／まん中に出た玉を大きく／右に機械（ハンドルは機械の右）
     ＝機械は ../mini3d.js（福引と同じ小さな3Dの計算）で、右手前の少し上から見た形にかく
       針金のカゴ（球）は左右の軸で回る。針金は手前と奥に分けて、奥は中の玉のうしろ・手前は玉の前にかく
       木の土台・A字の脚（左右に1組ずつ）・軸・右はしのハンドル（桜色の玉）・カゴの下の受け皿（グレー）
     前＝正面から見た平らな絵（控え＝_もどす\2026-09-27_ビンゴマシーンを立体にする前\） */
var M3=null, G={CY:1.6, R:1};   // ⭐脚を短く（2026-09-27 本人「ビンゴの足を短くして、滑り台の角度を低く、土台の板を1/5くらい短くしてみて」）。前＝1.5→1.95   // ⭐カゴを高く（2026-09-27 本人「ビンゴの台を今より上に置いて」）。前＝1.5
var WOODB=[236,206,150], LEGW=[184,128,70], DISH=[200,203,208];
function build(){
  M3=Mini3D({YAW:-50, PITCH:16, DIST:9, S:30, OX:0, OY:0});
  /* 絵の枠（viewBox）＝動かない部分のはしと、カゴの大きさから決める */
  var pts=[[-1.6,0,-0.9],[1.65,0,-0.9],[-1.6,0,0.95],[1.65,0,0.95],[1.75,G.CY+0.5,0],[1.75,G.CY-0.5,0.5]], xs=[], ys=[];
  pts.forEach(function(p){ var q=M3.P(p); xs.push(q[0]); ys.push(q[1]); });
  var sc=M3.P([0,G.CY,0]), sr=G.R*M3.C.S*M3.C.DIST/(M3.C.DIST-M3.view([0,G.CY,0])[2]);
  xs.push(sc[0]-sr,sc[0]+sr); ys.push(sc[1]-sr-2,sc[1]+sr);
  var x0=Math.min.apply(null,xs)-3, x1=Math.max.apply(null,xs)+3, y0=Math.min.apply(null,ys)-3, y1=Math.max.apply(null,ys)+4;
  G.vb=[x0,y0,x1-x0,y1-y0]; G.sc=sc; G.sr=sr;
  var vb=G.vb.map(function(v){ return v.toFixed(2); }).join(" ");
  var dome={l:(sc[0]-sr*0.94-x0)/G.vb[2]*100, t:(sc[1]-sr*0.94-y0)/G.vb[3]*100, w:sr*1.88/G.vb[2]*100, h:sr*1.88/G.vb[3]*100};
  var defs='<defs><radialGradient id="bgKnob" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#f3d3df"/><stop offset=".35" stop-color="#c86a8e"/><stop offset="1" stop-color="#8f4264"/></radialGradient>'+
    '<radialGradient id="bgHub" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#fbe7b0"/><stop offset=".45" stop-color="#d9a93a"/><stop offset="1" stop-color="#8a6212"/></radialGradient>'+
    '<filter id="bgSoft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.8"/></filter></defs>';
  $("stage").innerHTML='<div class="bg-wrap">'+
    '<div class="bg-board" id="board"></div>'+
    '<div class="bg-cur" id="cur"></div>'+
    '<div class="bg-mach"><div class="pk-gara bg-m3" id="gara" style="aspect-ratio:'+G.vb[2].toFixed(2)+'/'+G.vb[3].toFixed(2)+'">'+
      '<svg class="bg3 bg3-back" viewBox="'+vb+'" aria-hidden="true">'+defs+'<g id="bgBack"></g></svg>'+
      '<div class="pk-dome" style="inset:auto;left:'+dome.l.toFixed(2)+'%;top:'+dome.t.toFixed(2)+'%;width:'+dome.w.toFixed(2)+'%;height:'+dome.h.toFixed(2)+'%"><div class="pk-mix" id="mix"></div></div>'+
      '<svg class="bg3 bg3-front" viewBox="'+vb+'" aria-hidden="true"><g id="bgFront"></g></svg>'+
      '<svg class="bg3 bg3-cup" viewBox="'+vb+'" aria-hidden="true"><g id="bgCup"></g></svg>'+
    '</div></div></div>';
  var h="";
  for(var i=0;i<16;i++){
    h+='<i style="--bc:'+BALL_COLORS[i%BALL_COLORS.length]+';--rx:'+(14+rnd(56))+'%;--ry:'+(58+rnd(22))+'%;'+
      '--sx:'+(14+rnd(56))+'%;--hy:'+(6+rnd(30))+'%;--tt:'+(1.1+rnd(60)/100).toFixed(2)+'s;--td:-'+(rnd(150)/100).toFixed(2)+'s"></i>';
  }
  $("mix").innerHTML=h;
  drawStatic();
  drawCage(run.th||0);
  buildBoard();
}
/* 動かない部分（土台・脚・受け皿）。奥（左の脚・土台）と手前（右の脚・受け皿）に分ける */
function drawStatic(){
  /* ⭐カゴを高く・玉はカゴのうしろの下から出て、すべり台を手前へ転がり、前の受け皿に入る
       （2026-09-27 本人が本物のビンゴマシーンの絵を3つ見せて「ビンゴの台を今より上に置いて、出口はいろんなパターンがあるよ。後ろから出てくるのがセオリーみたいね」）
       前＝カゴの下の足つきの器にまっすぐ落ちていた */
  var back=[], over=[], CY=G.CY, R=G.R;
  var sh=[[-1.65,0,2.0],[1.7,0,2.0],[1.7,0,-0.9],[-1.65,0,-0.9]].map(function(p){ return M3.P([p[0]+0.06,p[1],p[2]-0.05]); });
  var shadow='<path d="'+M3.dstr(sh)+'" fill="rgba(0,0,0,.18)" filter="url(#bgSoft)"/>';
  /* ⭐土台を手前へ倍の奥行きに（2026-09-27 本人「まず、もともとあった下の台を倍まで大きくしよう」）＝奥行き 1.75→3.5（手前のはし z 0.9→2.65）。機械の枠（viewBox）は変えない＝機械の大きさはそのまま */
  var floor=[];   // ⭐土台と長い板は、いちばん先にかく（ほかのものの下）。⚠土台を大きくしたら、遠い順だけではすべり台の上に土台がかぶった
  /* ⭐土台の角は丸く（2026-09-27 本人「ついでに土台の角を少しアール付けて」）＝上から見て角を半径0.22の丸にした板。奥行き 3.5→2.8（1/5短く） */
  (function(x0,x1,z0,z1,y0,y1,r){
    var o=[], n=6, i, a, cs=[[x1-r,z1-r,0],[x1-r,z0+r,-90],[x0+r,z0+r,-180],[x0+r,z1-r,-270]];   // 手前右 → 奥右 → 奥左 → 手前左（上から見て時計と逆）
    o.push([x0+r,z1]);
    cs.forEach(function(c){ for(i=0;i<=n;i++){ a=(90+c[2]-i*90/n)*Math.PI/180; o.push([c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)]); } });
    for(i=0;i<o.length-1;i++){ var A=o[i], B=o[i+1]; if(Math.abs(A[0]-B[0])+Math.abs(A[1]-B[1])<1e-6) continue;
      M3.face(floor,[[A[0],y0,A[1]],[B[0],y0,B[1]],[B[0],y1,B[1]],[A[0],y1,A[1]]],WOODB); }
    M3.face(floor,o.slice(0,-1).map(function(q){ return [q[0],y1,q[1]]; }),WOODB);
  })(-1.6,1.65,-0.85,1.95,0,0.12,0.22);                                  // 土台
  /* ⭐脚はカゴと同じ金の金物で細く（2026-09-27 本人「金物だから、足を同じ金の金物にして細くするのもありかな」）。前＝木の太い脚（0.13） */
  var LEGG=[214,166,52];
  var legB=function(L,x){ M3.leg(L,[x,CY,0],[x,0.12,-0.62],0.06,LEGG); M3.leg(L,[x,CY,0],[x,0.12,0.62],0.06,LEGG); M3.cuboid(L,x-0.03,x+0.03,0.64,0.69,-0.46,0.46,LEGG); };
  legB(back,-1.25);                                                                    // 左の脚（奥）
  M3.cuboid(back,-1.3,1.3,CY-0.04,CY+0.04,-0.04,0.04,[201,150,31]);                   // 軸（カゴの中を通る）
  /* すべり台＝カゴのうしろの下（出口）から手前へ下り、長い木の板の上を画面のまん中のほうへ転がって、はしの受け皿に入る
     ⭐すべり台と受け皿は木（2026-09-27 本人「落ちてくるトレイもグレーじゃなくて木の色にしてみて。で、それを支えている足はなくてもいいかも」）
     ⭐まん中まで転がす（2026-09-27 本人「これでさ、どうにかして、玉を中央にもっていきたいんだよね～無理かな・・」）＝土台から手前へ長い板をのばして、その上にみぞ
       ⚠長い板とみぞは機械の枠（viewBox）の外、左のまん中の列までのびる（svg は overflow:visible） */
  var CHUTE=[214,170,108], CHUTE_IN=[176,128,72];
  var w=0.13, rh=0.07;
  var p0=[0,CY-R-0.02,-0.42], p2=[0,0.14,1.48];   // 脚を短くしたので、すべり台の角度も低くなる
  var q=function(p,dx,dy){ return [p[0]+dx,p[1]+dy,p[2]]; };
  function trough(a,b){
    M3.face(back,[q(a,-w,0),q(a,w,0),q(b,w,0),q(b,-w,0)].reverse(),CHUTE_IN);        // みぞの底
    [[-w,1],[w,-1]].forEach(function(s){                                              // 左右のかべ（両面）
      var f=[q(a,s[0],0),q(b,s[0],0),q(b,s[0],rh),q(a,s[0],rh)];
      M3.face(back,f,CHUTE); M3.face(back,f.slice().reverse(),CHUTE);
    });
  }
  /* ⭐先に突き出た長い板はなし・受け皿は土台の手前のはしの上・すべり台は付け根から受け皿まで一直線（2026-09-27 本人「先っぽの突き出たのはなしで」「トレーは突き出る手前においてね」「滑り台の付け根はそのままで、トレーまで一直線にしてみて」） */
  trough(p0,p2);
  /* はしの受け皿＝低い箱。底とうしろのかべは玉のうしろ、手前のかべは玉の前 */
  var tx0=-0.3,tx1=0.3,tz0=1.44,tz1=1.85,ty0=0.12,ty1=0.24,wl=0.03;
  M3.face(back,[[tx0+wl,ty0+0.004,tz1-wl],[tx1-wl,ty0+0.004,tz1-wl],[tx1-wl,ty0+0.004,tz0+wl],[tx0+wl,ty0+0.004,tz0+wl]],CHUTE_IN);   // 底
  M3.cuboid(back,tx0,tx0+wl,ty0,ty1,tz0,tz1,CHUTE); M3.cuboid(back,tx1-wl,tx1,ty0,ty1,tz0,tz1,CHUTE);   // 左右のかべ
  G.backStatic=shadow+M3.draw(floor)+M3.draw(back);
  M3.cuboid(over,tx0,tx1,ty0,ty1,tz1-wl,tz1,CHUTE);                                     // 手前のかべ（玉より前）
  G.cup=M3.draw(over);
  var front=[]; legB(front,1.25);                                                      // 右の脚（手前）
  G.frontStatic=M3.draw(front);
  /* 玉の通り道（出口 → すべり台 → 長いみぞ → 受け皿）＝箱の幅に対する割合 */
  var br=0.12, path=[], k, t;   // 転がる玉の半径（カゴの中の玉に近い大きさ）
  for(k=0;k<=12;k++){ t=k/12; path.push([0,p0[1]+(p2[1]-p0[1])*t+br,p0[2]+(p2[2]-p0[2])*t]); }
  path.push([0,ty0+br,(tz0+tz1)/2]);
  G.path=path.map(function(p){ var s=M3.P(p); return {x:(s[0]-G.vb[0])/G.vb[2], y:(s[1]-G.vb[1])/G.vb[2]}; });
  G.dish=G.path[G.path.length-1];
  G.ballD=br*2*M3.C.S/G.vb[2];
}
/* カゴ（針金の球）とハンドル。th＝回った角度（ラジアン） */
function drawCage(th){
  if(!M3 || !$("bgBack")) return;
  var CY=G.CY, R=G.R, cz=M3.view([0,CY,0])[2], back="", front="";
  function wire(pts,wb,wf){
    var sp=pts.map(function(p){ return M3.P(p); }), vz=pts.map(function(p){ return M3.view(p)[2]; });
    for(var i=0;i<pts.length-1;i++){
      var fr=(vz[i]+vz[i+1])/2>cz, s='<line x1="'+sp[i][0].toFixed(2)+'" y1="'+sp[i][1].toFixed(2)+'" x2="'+sp[i+1][0].toFixed(2)+'" y2="'+sp[i+1][1].toFixed(2)+'"';
      if(fr) front+=s+' stroke="#d9a93a" stroke-width="'+wf+'" stroke-linecap="round"/>';
      else back+=s+' stroke="#a47c22" stroke-width="'+wb+'" stroke-linecap="round" opacity=".7"/>';
    }
  }
  var N=48, i, k;
  [-0.8,-0.45,0,0.45,0.8].forEach(function(x){   // 軸に直角の輪（動かない）
    var r=Math.sqrt(R*R-x*x), a=[]; for(i=0;i<=N;i++){ var t=i/N*Math.PI*2; a.push([x,CY+r*Math.cos(t),r*Math.sin(t)]); }
    wire(a,x===0?1.1:0.8,x===0?1.8:1.3);
  });
  for(k=0;k<4;k++){                               // 軸をふくむ輪（回る）
    var an=th+k*Math.PI/4, b2=[]; for(i=0;i<=N;i++){ var p=i/N*Math.PI*2; b2.push([R*Math.cos(p),CY+R*Math.sin(p)*Math.cos(an),R*Math.sin(p)*Math.sin(an)]); }
    wire(b2,0.8,1.3);
  }
  /* ハンドル＝軸の右はしから、回る角度に合わせた腕と桜色の玉 */
  var e=M3.P([1.42,CY,0]), c1=M3.P([1.3,CY,0]), hp=M3.P([1.42,CY+0.42*Math.cos(th),0.42*Math.sin(th)]);
  var handle='<line x1="'+c1[0].toFixed(2)+'" y1="'+c1[1].toFixed(2)+'" x2="'+e[0].toFixed(2)+'" y2="'+e[1].toFixed(2)+'" stroke="#b8871c" stroke-width="2.4" stroke-linecap="round"/>'+
    '<line x1="'+e[0].toFixed(2)+'" y1="'+e[1].toFixed(2)+'" x2="'+hp[0].toFixed(2)+'" y2="'+hp[1].toFixed(2)+'" stroke="#c9961f" stroke-width="2.2" stroke-linecap="round"/>'+
    '<circle cx="'+e[0].toFixed(2)+'" cy="'+e[1].toFixed(2)+'" r="2.4" fill="url(#bgHub)"/>'+
    '<circle cx="'+hp[0].toFixed(2)+'" cy="'+hp[1].toFixed(2)+'" r="3.6" fill="url(#bgKnob)"/>';
  $("bgBack").innerHTML=G.backStatic+back;
  $("bgFront").innerHTML=front+G.frontStatic+handle;
  if(!$("bgCup").innerHTML) $("bgCup").innerHTML=G.cup;
}
/* 番号の表。1〜75は上に B・I・N・G・O、数字はたてに下へ（ビンゴカードと同じ向き）。ほかは15こずつたてに
   ⭐（2026-09-27 本人「bingoの並びもさ、数字を左側に配置して、縦に並べたい」） */
function buildBoard(){
  var b=$("board"), h="", n, r, c;
  if(st.max===75){
    b.style.gridTemplateColumns="repeat(5,1fr)"; b.style.gridTemplateRows=""; b.style.gridAutoFlow="row";
    for(c=0;c<5;c++) h+='<span class="bg-letter" style="color:'+LETTER_COLORS[c]+'">'+LETTERS.charAt(c)+'</span>';
    for(r=0;r<15;r++) for(c=0;c<5;c++){ n=c*15+r+1; h+='<span class="bg-cell" data-n="'+n+'">'+n+'</span>'; }
  }else{
    var cols=Math.ceil(st.max/15);
    b.style.gridTemplateColumns="repeat("+cols+",1fr)"; b.style.gridTemplateRows="repeat(15,auto)"; b.style.gridAutoFlow="column";
    for(n=1;n<=st.max;n++) h+='<span class="bg-cell" data-n="'+n+'">'+n+'</span>';
  }
  b.innerHTML=h;
  paintBoard();
}
function paintBoard(){
  var last=st.drawn[st.drawn.length-1];
  Array.prototype.forEach.call($("board").querySelectorAll(".bg-cell"),function(c){
    var n=+c.getAttribute("data-n");
    c.classList.toggle("on", st.drawn.indexOf(n)>=0);
    c.classList.toggle("last", n===last);
    if(n===last) c.style.setProperty("--cb",colorOf(n)); else c.style.removeProperty("--cb");
  });
}
/* 玉の数字の大きさ（玉の直径に対する割合）。2026-09-27 本人「玉の数字も大きく。そっちの方が大事かも」＝1けた .42→.54→.6・2けた .36→.46→.56（2回目＝本人「数字をもっと中心寄りにして大きく」） */
function numR(n){ var k=String(n).length; return k>2?0.4:(k>1?0.56:0.6); }
/* ⭐大きい玉＝よこは「回す」ボタンの上（画面のまん中）、上のはしは表の B・I・N・G・O の字の上のはしとそろえる
     （2026-09-27 本人「そのボールを回すの中心に持って行って、上端は、bingoの文字の上端と一緒にしてみて」） */
function bigD(){ var r=$("stage").getBoundingClientRect(); return Math.min(r.height*0.7, r.width*0.3, 600); }
/* ⭐玉の数字が玉の内側（.t）に入りきらないときだけ、字を小さくする（2026-10-04 本人：タブレットで「38」が2行に分かれた）。
     ⚠端末の字の形で幅が変わる（iPad では数字が太くて広い）。PCで入っているときは何もしない＝見た目は前のまま。画面に置いたあとに呼ぶ */
function fitNum(b){
  var t=b && b.firstChild, bn=t && t.querySelector(".bn"); if(!bn) return;
  var max=t.clientWidth*0.94, w=bn.offsetWidth;
  if(max>0 && w>max) t.style.fontSize=Math.floor(parseFloat(t.style.fontSize)*max/w)+"px";
}
function placeCur(){
  var cur=$("cur"), L=$("board") && $("board").querySelector(".bg-letter,.bg-cell"), wrap=cur && cur.parentNode; if(!L || !wrap) return;
  cur.style.top=(L.getBoundingClientRect().top-wrap.getBoundingClientRect().top)+"px";
}
function ballEl(n,d){
  var b=document.createElement("div"); b.className="pk-ball";
  b.style.setProperty("--bc",colorOf(n));
  b.style.width=b.style.height=d+"px";
  var t=document.createElement("span"); t.className="t";
  var L=letterOf(n);
  t.innerHTML=(L?'<span class="bl">'+L+'</span>':'')+'<span class="bn">'+n+'</span>';
  t.style.fontSize=Math.round(d*numR(n))+"px";
  b.appendChild(t); b._n=n;
  return b;
}
function spinCage(on){
  cancelAnimationFrame(cageRaf);
  var g=$("gara"); if(!g) return;
  g.classList.toggle("spin",on);
  if(!on) return;
  var t0=performance.now(), th0=run.th||0;
  (function step(now){ run.th=th0-(now-t0)/1000*Math.PI*2*0.55; drawCage(run.th); cageRaf=requestAnimationFrame(step); })(t0);   // ⭐逆回り（2026-09-27 本人「逆回転がいいな」＝立体にしたあと）
}
function update(){
  var left=pool().length;
  $("roundLbl").textContent=st.drawn.length? st.drawn.length+"回目" : "";
  $("leftLbl").textContent="のこり "+left+"個";
  $("runMsg").textContent= run.busy || left ? "" : "全部出ました";   // ⭐「「回す」で次の番号」は出さない（2026-09-28 本人「bingoとルーレット、○○で始めるっていうのはなしにして」）
  $("nextBtn").disabled=run.busy || !left;
  $("resetBtn").disabled=run.busy;
}
function spin(){
  if(!run || run.busy) return;
  var p=pool(); if(!p.length) return;
  run.busy=true; update();
  $("cur").innerHTML="";
  spinCage(true);
  later(function(){
    spinCage(false);
    var n=p[rnd(p.length)];
    var g=$("gara"), W=g.getBoundingClientRect().width;
    var mini=document.createElement("div"); mini.className="pk-ball pk-drop";
    mini.style.setProperty("--bc",colorOf(n));
    mini.style.width=mini.style.height=(W*G.ballD)+"px";
    /* 玉はカゴの下から、受け皿の口へ落ちる（立体の絵の位置から出す） */
    mini.style.animation="none"; mini.style.left=(W*G.dish.x)+"px"; mini.style.top=(W*G.dish.y)+"px";
    g.appendChild(mini);
    /* カゴのうしろの下から出て、すべり台を手前へ転がり、受け皿に入る */
    var kf=G.path.map(function(p,i){ var dx=W*(p.x-G.dish.x), dy=W*(p.y-G.dish.y); return {transform:"translate(calc(-50% + "+dx.toFixed(1)+"px),calc(-50% + "+dy.toFixed(1)+"px)) rotate("+(-i*60)+"deg)"}; });
    if(mini.animate) mini.animate(kf,{duration:2200,easing:"cubic-bezier(.4,0,.7,1)",fill:"forwards"});
    later(function(){
      placeCur(); var big=ballEl(n,bigD()); big.style.opacity="0"; $("cur").appendChild(big); fitNum(big);
      var a=mini.getBoundingClientRect(), b=big.getBoundingClientRect();
      var dx=(a.left+a.width/2)-(b.left+b.width/2), dy=(a.top+a.height/2)-(b.top+b.height/2), sc=a.width/b.width;
      mini.remove(); big.style.opacity="";
      if(big.animate) big.animate([
        {transform:"translate("+dx+"px,"+dy+"px) scale("+sc+") rotate(-300deg)"},
        {transform:"translate("+(dx*0.35)+"px,"+(dy*0.2)+"px) scale("+(sc+0.6*(1-sc))+") rotate(-60deg)",offset:.7},
        {transform:"none"}
      ],{duration:850,easing:"cubic-bezier(.3,.7,.4,1)"});
      st.drawn.push(n); screenSave();
      later(function(){ paintBoard(); run.busy=false; update(); },850);
    },2250);
  },3000);
}
function start(isDemo){
  demo=!!isDemo; run={busy:false, th:0};
  timers.forEach(clearTimeout); timers=[];
  var rs=$("runScreen"); rs.hidden=false; rs.classList.toggle("framed",demo);
  $("demoBack").hidden=!demo; $("demoBadge").hidden=!demo;
  document.body.style.overflow="hidden";
  build();
  var last=st.drawn[st.drawn.length-1];
  placeCur(); if(last){ var lb=ballEl(last,bigD(),st.drawn.length-1); $("cur").appendChild(lb); fitNum(lb); }   // 続きから＝最後に出た玉を出しておく
  update();
  if(!demo) keepAwake(true);
}
function stop(){
  timers.forEach(clearTimeout); timers=[]; cancelAnimationFrame(cageRaf);
  $("stage").innerHTML=""; run=null;
  $("runScreen").hidden=true; $("runScreen").classList.remove("framed"); $("demoBack").hidden=true;
  document.body.style.overflow=""; keepAwake(false);
  if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function(){});
}
$("startBtn").addEventListener("click",function(){
  var el=document.documentElement;
  start(false);
  if(!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(function(){});
});
$("demoBtn").addEventListener("click",function(){ start(true); });
$("nextBtn").addEventListener("click",spin);
$("resetBtn").addEventListener("click",function(){
  if(!run || run.busy) return;
  if(st.drawn.length && !confirm("出た番号を全部消して、はじめからにしますか？")) return;
  st.drawn=[]; screenSave(); $("cur").innerHTML=""; paintBoard(); update();
});
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
function resize(){
  if(!run) return;
  placeCur();
  Array.prototype.forEach.call($("cur").children,function(b){
    var d=bigD(); b.style.width=b.style.height=d+"px"; b.firstChild.style.fontSize=Math.round(d*numR(b._n))+"px"; fitNum(b);
  });
}
var rsT=0;
window.addEventListener("resize",function(){ clearTimeout(rsT); rsT=setTimeout(resize,120); });
document.addEventListener("fullscreenchange",function(){ setTimeout(resize,150); });
function keepAwake(on){
  try{
    if(on && navigator.wakeLock && !wakeLock){ navigator.wakeLock.request("screen").then(function(w){ wakeLock=w; w.addEventListener("release",function(){ wakeLock=null; }); }).catch(function(){}); }
    else if(!on && wakeLock){ wakeLock.release(); wakeLock=null; }
  }catch(e){}
}

/* ⭐クラッカー＝当たった人が出たら押す（2026-09-27 本人「左端に、当たった人がいたら押すボタンで、クラッカーがあってもいいかもね」「クラッカーだけよろしく」）
   ＝左下と右下の角から、紙吹雪が放射状に上へ飛んで、落ちてくる。音はなし（タイピングで本人が音をやめたのに合わせた） */
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
    var dir=(i%2===0)?1:-1;   // 1＝左の角から右上へ／-1＝右の角から左上へ
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

/* はじめ。保存があれば①を開ける（ページの型 2-a） */
setMode("75");
if(screenLoad()) $("opt1").open=true;
})();
