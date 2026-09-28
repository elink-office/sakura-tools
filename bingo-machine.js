/* 立体のビンゴマシーン（2026-09-27）＝ランダム指名メーカーの「ビンゴの見せ方」で使う
   ⭐ビンゴマシーン（bingo/bingo.js）で作った形をそのまま切り出した（ページの型 16-a＝共通に置く）
     ⚠ビンゴマシーンは、まだ自分の中の同じ計算を使っている。形を直すときは両方（いずれビンゴマシーンもこちらに寄せる）
   形＝右手前の少し上から見た形（横に-50度・上から16度）。針金の球のカゴ・金の細いA字の脚（左右に1組ずつ）・カゴの中を通る金の軸・右はしのハンドル（桜色の玉）
     ・角の丸い木の土台・カゴのうしろの下から手前へ一直線に下る木のすべり台・土台の手前のはしの木の受け皿
   ⚠ ../mini3d.js を先に読むこと
   使い方：var bm=BingoMachine();
     host.innerHTML=bm.html(玉の色の並び, 乱数の関数)   // id="gara" の入れ物（中のカゴ・玉・絵）
     bm.draw(角度)                                       // カゴとハンドルをかく（回すたびに）
     bm.G.path（玉の通り道）・bm.G.dish（受け皿）・bm.G.ballD（転がる玉の大きさ）＝どれも入れ物の幅に対する割合 */
(function(){
"use strict";
function BingoMachine(){
  var M3=Mini3D({YAW:-50, PITCH:16, DIST:9, S:30, OX:0, OY:0}), G={CY:1.6, R:1};
  var WOODB=[236,206,150], LEGG=[214,166,52], CHUTE=[214,170,108], CHUTE_IN=[176,128,72];
  function $(id){ return document.getElementById(id); }
  /* 絵の枠（viewBox）＝動かない部分のはしと、カゴの大きさから決める */
  (function(){
    var pts=[[-1.6,0,-0.9],[1.65,0,-0.9],[-1.6,0,0.95],[1.65,0,0.95],[1.75,G.CY+0.5,0],[1.75,G.CY-0.5,0.5]], xs=[], ys=[];
    pts.forEach(function(p){ var q=M3.P(p); xs.push(q[0]); ys.push(q[1]); });
    var sc=M3.P([0,G.CY,0]), sr=G.R*M3.C.S*M3.C.DIST/(M3.C.DIST-M3.view([0,G.CY,0])[2]);
    xs.push(sc[0]-sr,sc[0]+sr); ys.push(sc[1]-sr-2,sc[1]+sr);
    var x0=Math.min.apply(null,xs)-3, x1=Math.max.apply(null,xs)+3, y0=Math.min.apply(null,ys)-3, y1=Math.max.apply(null,ys)+4;
    G.vb=[x0,y0,x1-x0,y1-y0]; G.sc=sc; G.sr=sr;
  })();
  /* 動かない部分（土台・脚・すべり台・受け皿）と、玉の通り道 */
  (function(){
    var floor=[], back=[], over=[], front=[], CY=G.CY, R=G.R;
    var sh=[[-1.65,0,2.0],[1.7,0,2.0],[1.7,0,-0.9],[-1.65,0,-0.9]].map(function(p){ return M3.P([p[0]+0.06,p[1],p[2]-0.05]); });
    var shadow='<path d="'+M3.dstr(sh)+'" fill="rgba(0,0,0,.18)" filter="url(#bgSoft)"/>';
    (function(x0,x1,z0,z1,y0,y1,r){   // 角の丸い土台
      var o=[], n=6, i, a, cs=[[x1-r,z1-r,0],[x1-r,z0+r,-90],[x0+r,z0+r,-180],[x0+r,z1-r,-270]];
      o.push([x0+r,z1]);
      cs.forEach(function(c){ for(i=0;i<=n;i++){ a=(90+c[2]-i*90/n)*Math.PI/180; o.push([c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)]); } });
      for(i=0;i<o.length-1;i++){ var A=o[i], B=o[i+1]; if(Math.abs(A[0]-B[0])+Math.abs(A[1]-B[1])<1e-6) continue;
        M3.face(floor,[[A[0],y0,A[1]],[B[0],y0,B[1]],[B[0],y1,B[1]],[A[0],y1,A[1]]],WOODB); }
      M3.face(floor,o.slice(0,-1).map(function(q){ return [q[0],y1,q[1]]; }),WOODB);
    })(-1.6,1.65,-0.85,1.95,0,0.12,0.22);
    var legB=function(L,x){ M3.leg(L,[x,CY,0],[x,0.12,-0.62],0.06,LEGG); M3.leg(L,[x,CY,0],[x,0.12,0.62],0.06,LEGG); M3.cuboid(L,x-0.03,x+0.03,0.64,0.69,-0.46,0.46,LEGG); };
    legB(back,-1.25);
    M3.cuboid(back,-1.3,1.3,CY-0.04,CY+0.04,-0.04,0.04,[201,150,31]);
    var w=0.13, rh=0.07, p0=[0,CY-R-0.02,-0.42], p2=[0,0.14,1.48];
    var q=function(p,dx,dy){ return [p[0]+dx,p[1]+dy,p[2]]; };
    M3.face(back,[q(p0,-w,0),q(p0,w,0),q(p2,w,0),q(p2,-w,0)].reverse(),CHUTE_IN);
    [-w,w].forEach(function(s){ var f=[q(p0,s,0),q(p2,s,0),q(p2,s,rh),q(p0,s,rh)]; M3.face(back,f,CHUTE); M3.face(back,f.slice().reverse(),CHUTE); });
    var tx0=-0.3,tx1=0.3,tz0=1.44,tz1=1.85,ty0=0.12,ty1=0.24,wl=0.03;
    M3.face(back,[[tx0+wl,ty0+0.004,tz1-wl],[tx1-wl,ty0+0.004,tz1-wl],[tx1-wl,ty0+0.004,tz0+wl],[tx0+wl,ty0+0.004,tz0+wl]],CHUTE_IN);
    M3.cuboid(back,tx0,tx0+wl,ty0,ty1,tz0,tz1,CHUTE); M3.cuboid(back,tx1-wl,tx1,ty0,ty1,tz0,tz1,CHUTE);
    M3.cuboid(over,tx0,tx1,ty0,ty1,tz1-wl,tz1,CHUTE);
    legB(front,1.25);
    G.backStatic=shadow+M3.draw(floor)+M3.draw(back); G.cup=M3.draw(over); G.frontStatic=M3.draw(front);
    var br=0.12, path=[], k, t;
    for(k=0;k<=12;k++){ t=k/12; path.push([0,p0[1]+(p2[1]-p0[1])*t+br,p0[2]+(p2[2]-p0[2])*t]); }
    path.push([0,ty0+br,(tz0+tz1)/2]);
    G.path=path.map(function(p){ var s=M3.P(p); return {x:(s[0]-G.vb[0])/G.vb[2], y:(s[1]-G.vb[1])/G.vb[2]}; });
    G.dish=G.path[G.path.length-1];
    G.ballD=br*2*M3.C.S/G.vb[2];
  })();
  function html(colors,rnd){
    var vb=G.vb.map(function(v){ return v.toFixed(2); }).join(" "), sc=G.sc, sr=G.sr;
    var dome={l:(sc[0]-sr*0.94-G.vb[0])/G.vb[2]*100, t:(sc[1]-sr*0.94-G.vb[1])/G.vb[3]*100, w:sr*1.88/G.vb[2]*100, h:sr*1.88/G.vb[3]*100};
    var defs='<defs><radialGradient id="bgKnob" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#f3d3df"/><stop offset=".35" stop-color="#c86a8e"/><stop offset="1" stop-color="#8f4264"/></radialGradient>'+
      '<radialGradient id="bgHub" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#fbe7b0"/><stop offset=".45" stop-color="#d9a93a"/><stop offset="1" stop-color="#8a6212"/></radialGradient>'+
      '<filter id="bgSoft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.8"/></filter></defs>';
    var mix="";
    for(var i=0;i<16;i++){
      mix+='<i style="--bc:'+colors[i%colors.length]+';--rx:'+(14+rnd(56))+'%;--ry:'+(58+rnd(22))+'%;'+
        '--sx:'+(14+rnd(56))+'%;--hy:'+(6+rnd(30))+'%;--tt:'+(1.1+rnd(60)/100).toFixed(2)+'s;--td:-'+(rnd(150)/100).toFixed(2)+'s"></i>';
    }
    return '<div class="pk-gara bg-m3" id="gara" style="aspect-ratio:'+G.vb[2].toFixed(2)+'/'+G.vb[3].toFixed(2)+'">'+
      '<svg class="bg3 bg3-back" viewBox="'+vb+'" aria-hidden="true">'+defs+'<g id="bgBack"></g></svg>'+
      '<div class="pk-dome" style="inset:auto;left:'+dome.l.toFixed(2)+'%;top:'+dome.t.toFixed(2)+'%;width:'+dome.w.toFixed(2)+'%;height:'+dome.h.toFixed(2)+'%"><div class="pk-mix" id="mix">'+mix+'</div></div>'+
      '<svg class="bg3 bg3-front" viewBox="'+vb+'" aria-hidden="true"><g id="bgFront"></g></svg>'+
      '<svg class="bg3 bg3-cup" viewBox="'+vb+'" aria-hidden="true"><g id="bgCup">'+G.cup+'</g></svg></div>';
  }
  function draw(th){
    if(!$("bgBack")) return;
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
    [-0.8,-0.45,0,0.45,0.8].forEach(function(x){
      var r=Math.sqrt(R*R-x*x), a=[]; for(i=0;i<=N;i++){ var t=i/N*Math.PI*2; a.push([x,CY+r*Math.cos(t),r*Math.sin(t)]); }
      wire(a,x===0?1.1:0.8,x===0?1.8:1.3);
    });
    for(k=0;k<4;k++){
      var an=th+k*Math.PI/4, b2=[]; for(i=0;i<=N;i++){ var p=i/N*Math.PI*2; b2.push([R*Math.cos(p),CY+R*Math.sin(p)*Math.cos(an),R*Math.sin(p)*Math.sin(an)]); }
      wire(b2,0.8,1.3);
    }
    var e=M3.P([1.42,CY,0]), c1=M3.P([1.3,CY,0]), hp=M3.P([1.42,CY+0.42*Math.cos(th),0.42*Math.sin(th)]);
    var handle='<line x1="'+c1[0].toFixed(2)+'" y1="'+c1[1].toFixed(2)+'" x2="'+e[0].toFixed(2)+'" y2="'+e[1].toFixed(2)+'" stroke="#b8871c" stroke-width="2.4" stroke-linecap="round"/>'+
      '<line x1="'+e[0].toFixed(2)+'" y1="'+e[1].toFixed(2)+'" x2="'+hp[0].toFixed(2)+'" y2="'+hp[1].toFixed(2)+'" stroke="#c9961f" stroke-width="2.2" stroke-linecap="round"/>'+
      '<circle cx="'+e[0].toFixed(2)+'" cy="'+e[1].toFixed(2)+'" r="2.4" fill="url(#bgHub)"/>'+
      '<circle cx="'+hp[0].toFixed(2)+'" cy="'+hp[1].toFixed(2)+'" r="3.6" fill="url(#bgKnob)"/>';
    $("bgBack").innerHTML=G.backStatic+back;
    $("bgFront").innerHTML=front+G.frontStatic+handle;
  }
  /* 転がる玉＝受け皿に置いて、通り道の順に動かす（elに受け皿の位置を入れて、animate） */
  function roll(el,W,ms){
    el.style.animation="none"; el.style.left=(W*G.dish.x)+"px"; el.style.top=(W*G.dish.y)+"px";
    el.style.width=el.style.height=(W*G.ballD)+"px";
    var kf=G.path.map(function(p,i){ var dx=W*(p.x-G.dish.x), dy=W*(p.y-G.dish.y); return {transform:"translate(calc(-50% + "+dx.toFixed(1)+"px),calc(-50% + "+dy.toFixed(1)+"px)) rotate("+(-i*60)+"deg)"}; });
    if(el.animate) el.animate(kf,{duration:ms,easing:"cubic-bezier(.4,0,.7,1)",fill:"forwards"});
  }
  return {G:G, html:html, draw:draw, roll:roll};
}
window.BingoMachine=BingoMachine;
})();
