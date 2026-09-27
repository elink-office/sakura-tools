/* 小さな3Dの計算（2026-09-27）＝斜め上から見た機械を、SVG の面でかく
   ⭐ビンゴマシーンで使う。福引ガラガラ（fukubiki.js）の中にある同じ計算から切り出した（ページの型 16-a＝共通に置く）
     ⚠福引はまだ自分の中の計算を使っている。直すときは、いずれ福引もこちらに寄せる
   使い方：var M=Mini3D({YAW:-25,PITCH:16,DIST:9,S:28,OX:50,OY:88});
     M.view(点) 見る向きへ／M.proj(見る向きの点) 絵の座標へ／M.face(list,点の並び,色,extra)／M.cuboid(list,x0,x1,y0,y1,z0,z1,色)／M.leg(list,上,下,太さ,色)
     list には {z:遠さ, svg:文字} が入る。z の小さいほうから並べてかく（遠いものから） */
(function(){
"use strict";
function Mini3D(o){
  var C={YAW:o.YAW||0, PITCH:o.PITCH||0, DIST:o.DIST||9, S:o.S||30, OX:o.OX||50, OY:o.OY||90};
  var L=o.L||[-0.45,0.75,0.5], m=Math.sqrt(L[0]*L[0]+L[1]*L[1]+L[2]*L[2]); L=L.map(function(v){ return v/m; });
  var cy=Math.cos(C.YAW*Math.PI/180), sy=Math.sin(C.YAW*Math.PI/180), cp=Math.cos(C.PITCH*Math.PI/180), sp=Math.sin(C.PITCH*Math.PI/180);
  function view(p){ var a=p[0]*cy+p[2]*sy, c=-p[0]*sy+p[2]*cy, b=p[1]; return [a, b*cp-c*sp, b*sp+c*cp]; }
  function proj(v){ var k=C.DIST/(C.DIST-v[2]); return [C.OX+C.S*v[0]*k, C.OY-C.S*v[1]*k]; }
  function P(p){ return proj(view(p)); }
  function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
  function cross(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function norm(a){ var q=Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2])||1; return [a[0]/q,a[1]/q,a[2]/q]; }
  function shade(rgb,n){ var d=n[0]*L[0]+n[1]*L[1]+n[2]*L[2], k=0.42+0.62*Math.max(0,d);
    return "rgb("+rgb.map(function(c){ return Math.min(255,Math.round(c*k)); }).join(",")+")"; }
  function dstr(sp){ return "M"+sp.map(function(q){ return q[0].toFixed(2)+" "+q[1].toFixed(2); }).join("L")+"Z"; }
  /* 面（pts＝世界の点。外から見て左回り）。裏向きの面は捨てる */
  function face(list,pts,rgb,extra){
    var n=norm(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])));
    var vs=pts.map(view), vn=norm(cross(sub(vs[1],vs[0]),sub(vs[2],vs[0])));
    var c=[0,0,0]; vs.forEach(function(v){ c[0]+=v[0]; c[1]+=v[1]; c[2]+=v[2]; }); c=c.map(function(x){ return x/vs.length; });
    if(vn[0]*(-c[0])+vn[1]*(-c[1])+vn[2]*(C.DIST-c[2])<=0) return;
    var sp=vs.map(proj), col=typeof rgb==="string"?rgb:shade(rgb,n);
    list.push({z:c[2], svg:'<path d="'+dstr(sp)+'" fill="'+col+'" stroke="'+col+'" stroke-width=".35" stroke-linejoin="round"/>'+(extra?extra(sp):"")});
  }
  function cuboid(list,x0,x1,y0,y1,z0,z1,rgb){
    face(list,[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],rgb);
    face(list,[[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]],rgb);
    face(list,[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],rgb);
    face(list,[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],rgb);
    face(list,[[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]],rgb);
    face(list,[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],rgb);
  }
  function leg(list,a,b,w,rgb){   // 上の点 a から下の点 b へ、四角い棒
    var h=w/2, q=function(p,dx,dz){ return [p[0]+dx,p[1],p[2]+dz]; };
    var A=[q(a,-h,-h),q(a,h,-h),q(a,h,h),q(a,-h,h)], B=[q(b,-h,-h),q(b,h,-h),q(b,h,h),q(b,-h,h)];
    for(var i=0;i<4;i++){ var j=(i+1)%4; face(list,[A[i],A[j],B[j],B[i]],rgb); }
  }
  function draw(list){ list.sort(function(p,q){ return p.z-q.z; }); return list.map(function(x){ return x.svg; }).join(""); }
  return {C:C, view:view, proj:proj, P:P, face:face, cuboid:cuboid, leg:leg, draw:draw, shade:shade, dstr:dstr};
}
window.Mini3D=Mini3D;
})();
