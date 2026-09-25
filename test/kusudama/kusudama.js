/* くす玉メーカー（2026-09-24 作成中）
   ⭐決めたこと（決定ログ 2026-09-24）
     先生が文字を書く（ランダムは使わない）／くす玉は1〜3個・はじめは3個／1個ずつ 金・銀・銅 を選ぶ
     出し方＝A 1つずつ（はじめ）・B 並べて／「3・2・1」は画面に大きく出す（本人「一緒に叫ぶと楽しいから出す！」）
     紙吹雪＝銅は単色・銀は2色・金はたくさんの色で多め（本人「これはみないとわからないけど笑」）
     画面の保存はチェックを入れたときだけ（名前が入るため）
   ⭐くす玉の絵・動き・紙吹雪は、カウントダウンタイマー（test/timer/timer.js）のものをコピーした。タイマーのファイルには触らない */
(function(){
"use strict";
function $(id){ return document.getElementById(id); }

var COLORS={gold:"金", silver:"銀", bronze:"銅"};
var DEF_COLORS={1:["gold"], 2:["silver","gold"], 3:["bronze","silver","gold"]};
var EXAMPLES=["やまだ/はなこさん","さとう/たろうさん","すずき/さくらさん"];   // 欄のグレーの見本
var LIMIT=20;

/* ===== いまの中身 ===== */
var st={n:3, mode:"one", items:[{c:"bronze",t:""},{c:"silver",t:""},{c:"gold",t:""}]};

function renderItems(){
  var ol=$("items"); ol.innerHTML="";
  for(var i=0;i<st.n;i++){
    var it=st.items[i];
    var li=document.createElement("li");
    var col='<span class="ks-color" role="radiogroup" aria-label="'+(i+1)+'つ目の色">';
    ["gold","silver","bronze"].forEach(function(k){
      col+='<button type="button" class="'+k+(it.c===k?" on":"")+'" data-c="'+k+'" data-i="'+i+'" aria-label="'+COLORS[k]+'">'+COLORS[k]+'</button>';
    });
    col+='</span>';
    li.innerHTML='<span class="ks-no">'+(i+1)+'つ目</span>'+col+
      '<input type="text" class="ks-text" maxlength="24" data-i="'+i+'" placeholder="'+EXAMPLES[i]+'" autocomplete="off" aria-label="'+(i+1)+'つ目の文字">';
    li.querySelector("input").value=it.t;
    ol.appendChild(li);
  }
}
function setCount(n){
  n=Math.max(1,Math.min(3,n|0));
  if(n!==st.n){
    /* 数を変えたら、色ははじめの組み合わせに（銅・銀・金の並び）。打った文字は残す */
    var old=st.items; st.items=[];
    for(var i=0;i<n;i++) st.items.push({c:DEF_COLORS[n][i], t:(old[i]?old[i].t:"")});
    st.n=n;
  }
  Array.prototype.forEach.call($("segCount").querySelectorAll("button"),function(b){
    var on=(+b.getAttribute("data-n"))===st.n; b.classList.toggle("on",on); b.setAttribute("aria-checked",on?"true":"false");
  });
  renderItems();
}
function setMode(m){
  st.mode=(m==="row")?"row":"one";
  Array.prototype.forEach.call($("segMode").querySelectorAll("button"),function(b){
    var on=b.getAttribute("data-m")===st.mode; b.classList.toggle("on",on); b.setAttribute("aria-checked",on?"true":"false");
  });
  $("modeHint").textContent = st.mode==="row"
    ? "はじめから並んで吊るされていて、順番に割れます。最後はみんなの名前が並びます。"
    : "1つずつ真ん中に下りてきて、順番に割れます。";
}
$("segCount").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; setCount(+b.getAttribute("data-n")); screenSave(); });
$("segMode").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; setMode(b.getAttribute("data-m")); screenSave(); });
$("items").addEventListener("click",function(e){
  var b=e.target.closest(".ks-color button"); if(!b) return;
  var i=+b.getAttribute("data-i"); st.items[i].c=b.getAttribute("data-c"); renderItems(); screenSave();
});
$("items").addEventListener("input",function(e){
  var t=e.target; if(!t.classList.contains("ks-text")) return;
  st.items[+t.getAttribute("data-i")].t=t.value; screenSave();
});

/* ===== 画面の保存（チェックを入れたときだけ・ページの型 3） ===== */
var KEY="sakura-kusudama";
function screenSave(){
  if(!$("save").checked) return;
  try{ localStorage.setItem(KEY, JSON.stringify({n:st.n, mode:st.mode, items:st.items.slice(0,st.n)})); flash("保存しました"); }catch(e){}
}
var flashT=0;
function flash(t){ $("savingLabel").textContent=t; clearTimeout(flashT); flashT=setTimeout(function(){ $("savingLabel").textContent=""; },1500); }
$("save").addEventListener("change",function(){
  if(this.checked){ screenSave(); }
  else { try{ localStorage.removeItem(KEY); }catch(e){} flash("保存していたものを消しました"); }
});
function screenLoad(){
  try{
    var s=JSON.parse(localStorage.getItem(KEY)||"null"); if(!s) return;
    $("save").checked=true; applyData(s);
  }catch(e){}
}
function applyData(s){
  var n=Math.max(1,Math.min(3,s.n|0||3));
  st.n=n; st.items=[];
  for(var i=0;i<n;i++){ var it=(s.items||[])[i]||{}; st.items.push({c:COLORS[it.c]?it.c:DEF_COLORS[n][i], t:it.t||""}); }
  setCount(n); setMode(s.mode);
}

/* ===== 名前を付けて保存（ページの型 4-c＝座席表の⑦と同じ作法）＝このツールだけの置き場 ===== */
var STORE="sakura-tools-kusudama-v1";
function loadStore(){ try{ var d=JSON.parse(localStorage.getItem(STORE)||"null"); if(d && d.items) return d; }catch(e){} return {v:1,items:[]}; }
function writeStore(d){ try{ localStorage.setItem(STORE, JSON.stringify(d)); return true; }catch(e){ return false; } }
function findItem(id){ if(!id) return null; var d=loadStore(); for(var i=0;i<d.items.length;i++) if(d.items[i].id===id) return d.items[i]; return null; }
function current(name){ return {name:name, n:st.n, mode:st.mode, items:st.items.slice(0,st.n).map(function(x){ return {c:x.c,t:x.t}; })}; }
function fillSel(sel, keep, head){
  var d=loadStore();
  sel.innerHTML='<option value="">'+head+'</option>';
  d.items.forEach(function(it){ var o=document.createElement("option"); o.value=it.id; o.textContent=it.name; sel.appendChild(o); });
  sel.value=findItem(keep) ? keep : "";
}
var loadedId="";
function refreshSaved(keep){
  var d=loadStore(), k=(keep!=null)?keep:loadedId;
  fillSel($("selSaved"),k,"－"); fillSel($("selSaved2"),k,"保存済のデータ");
  $("recallRow").hidden = d.items.length===0;
  $("saveCount").textContent=d.items.length+"/"+LIMIT;
}
function saveMsg(t){ $("saveMsg").textContent=t; }
$("loadSaved2").addEventListener("click",function(){
  var it=findItem($("selSaved2").value); if(!it){ alert("保存済のデータを選んでください。"); return; }
  applyData(it); loadedId=it.id; $("selSaved").value=it.id; screenSave();
});
$("delSaved2").addEventListener("click",function(){
  var it=findItem($("selSaved2").value); if(!it){ alert("削除するデータを選んでください。"); return; }
  if(!confirm("「"+it.name+"」を削除しますか？")) return; delItem(it.id);
});
function delItem(id){
  var it=findItem(id), d=loadStore(); d.items=d.items.filter(function(x){ return x.id!==id; });
  writeStore(d); if(loadedId===id) loadedId=""; refreshSaved(""); saveMsg("「"+it.name+"」を削除しました。");
}
$("saveNew").addEventListener("click",function(){
  var cur=findItem(loadedId), name=prompt("データの名前を入れてください", cur?cur.name:"");
  if(name===null) return; name=name.trim(); if(!name) return;
  var d=loadStore(), same=null; d.items.forEach(function(it){ if(it.name===name) same=it; });
  if(same){
    if(!confirm("「"+name+"」はもう保存されています。今の内容に差し替えますか？")) return;
    var o=current(name); o.id=same.id; d.items[d.items.indexOf(same)]=o;
    writeStore(d); loadedId=o.id; refreshSaved(o.id); saveMsg("「"+name+"」を差し替えました。"); return;
  }
  if(d.items.length>=LIMIT){ saveMsg("保存は"+LIMIT+"件までです。いらないものを削除してください。"); return; }
  var it=current(name); it.id="k"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  d.items.push(it); if(!writeStore(d)){ saveMsg("保存できませんでした。"); return; }
  loadedId=it.id; refreshSaved(it.id); saveMsg("「"+name+"」を保存しました。");
});
$("saveOver").addEventListener("click",function(){
  var id=$("selSaved").value, it=findItem(id);
  if(!it){ saveMsg("上書きするデータを「保存済のデータ」で選んでください。"); return; }
  if(!confirm("「"+it.name+"」を今の内容で上書きしますか？")) return;
  var d=loadStore(); d.items=d.items.map(function(x){ if(x.id!==id) return x; var o=current(it.name); o.id=id; return o; });
  writeStore(d); loadedId=id; refreshSaved(id); saveMsg("「"+it.name+"」に上書きしました。");
});
$("saveDel").addEventListener("click",function(){
  var id=$("selSaved").value, it=findItem(id);
  if(!it){ saveMsg("削除するデータを「保存済のデータ」で選んでください。"); return; }
  if(!confirm("「"+it.name+"」を削除しますか？")) return; delItem(id);
});

/* 「？」の開け閉め（見出しのすぐ下の .tip-body を出し入れ。長いものは tip.js がポップアップにする） */
document.addEventListener("click",function(e){
  var b=e.target.closest(".tip-btn"); if(!b) return;
  var host=b.closest("h2,summary,p,label"), body=host && host.nextElementSibling;
  if(!body || !body.classList.contains("tip-body")) return;
  e.preventDefault(); body.hidden=!body.hidden; b.setAttribute("aria-expanded", body.hidden?"false":"true");
});

/* =====================================================================
   くす玉の絵（タイマーと同じ）。⭐色は 金・銀・銅。1画面に何個も出すので、色の名前（id）は1個ずつ変える
   ===================================================================== */
var GRAD={
  gold:  ["#ffe98a","#f2b82c","#c98a10","#b07a0c"],
  silver:["#ffffff","#c4cad2","#8a929c","#7a828c"],
  bronze:["#f6c89a","#c47a3a","#8a4f1e","#7a4418"]
};
/* ⭐玉を大きく・下の端は少し上に（2026-09-24 本人「くす玉の下端も少し上にあげて、半径を大きくして、紙吹雪が出る範囲を広げてほしい」）
   ＝玉の半径 175→230（絵の中の単位）。垂れ幕は玉の大きさに引っぱられないよう、帯の上の端 KUSU_BY を 110→150 に下げた */
var KUSU_INDENT=2, KUSU_BY=150, KUSU_R=230, uid=0;
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function banner(raw,ex,by){
  raw=(raw||"").trim()||ex;
  var cols=raw.split(/[\/／]+/).map(function(c){ return c.trim(); }).filter(Boolean).slice(0,2);
  if(!cols.length) cols=[ex];
  var n=Math.max.apply(null, cols.map(function(c,i){ return c.length+(i>0?KUSU_INDENT:0); }));
  var fs=Math.max(14, Math.min(34, Math.floor(262/(n*1.12)))), sp=Math.round(fs*0.12);
  var gapX=Math.round(fs*1.2), w=cols.length===2 ? Math.max(86, gapX+fs+36) : 86, x0=250-w/2, BY=(by||KUSU_BY), fid="ksh"+uid;
  var h='<line x1="250" y1="0" x2="250" y2="'+BY+'" stroke="#d9a93a" stroke-width="4"/>'+
        '<rect x="'+x0+'" y="'+BY+'" width="'+w+'" height="290" rx="5" fill="#fff" stroke="#e2403f" stroke-width="4" filter="url(#'+fid+')"/>';
  /* ⭐文字は帯の縦のまん中に（2026-09-24 本人「文字、縦の中央揃えにして」）。2行のときは「1行目」と「2文字下げた2行目」をひとかたまりにして、まん中に置く */
  var step=fs+sp, blockH=Math.max.apply(null, cols.map(function(c,i){ return (c.length+(i>0?KUSU_INDENT:0))*step-sp; }));
  var top=BY+Math.max(12,(290-blockH)/2);
  cols.forEach(function(c,i){
    var cx=cols.length===2 ? (i===0 ? 250+gapX/2 : 250-gapX/2) : 250;
    var y=top+(i>0 ? KUSU_INDENT*step : 0);
    h+='<text x="'+cx+'" y="'+y+'" font-size="'+fs+'" font-weight="800" fill="#e2403f" style="writing-mode:vertical-rl" letter-spacing="'+sp+'">'+esc(c)+'</text>';
  });
  return h;
}
/* ⭐玉は立体的に・ふちの線は細く（2026-09-24 本人「くす玉のアウトラインって、もっと細くてもっと立体的に○になる雰囲気にしてほしい」）
   ＝①玉ぜんたいで1つの光（左上から）②ふちに向かって暗くなる影 ③やわらかい光の点 ④下のふちにうすい照り返し ⑤線は細く（3→1.2） */
function kusuSvg(color,text,ex,by){
  uid++;
  var g=GRAD[color]||GRAD.gold, sp="ksp"+uid, lb="klb"+uid, rf="krf"+uid, bl="kbl"+uid;
  var B=banner(text,ex,by);
  var R=KUSU_R, half=function(sw){ return 'M250 -'+R+' A'+R+' '+R+' 0 0 '+sw+' 250 '+R; };
  function body(sw,hl){
    return '<path d="'+half(sw)+' Z" fill="url(#'+sp+')"/>'+
      '<path d="'+half(sw)+' Z" fill="url(#'+rf+')"/>'+
      '<path d="'+half(sw)+' Z" fill="url(#'+lb+')"/>'+
      (hl ? '<ellipse cx="190" cy="150" rx="58" ry="26" transform="rotate(-22 190 150)" fill="#fff" opacity=".5" filter="url(#'+bl+')"/>' : '')+
      '<path d="'+half(sw)+'" fill="none" stroke="'+g[3]+'" stroke-opacity=".55" stroke-width="1.2"/>';
  }
  return '<svg viewBox="0 0 500 460" xmlns="http://www.w3.org/2000/svg">'+
   '<defs>'+
   '<filter id="ksh'+uid+'" x="-30%" y="-10%" width="160%" height="120%"><feDropShadow dx="4" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".35"/></filter>'+
   '<filter id="'+bl+'" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>'+
   /* ①玉ぜんたいの光：見えている下半分の左上あたりがいちばん明るい（上半分は画面の外） */
   '<radialGradient id="'+sp+'" gradientUnits="userSpaceOnUse" cx="195" cy="115" r="300" fx="185" fy="125">'+
     '<stop offset="0" stop-color="'+g[0]+'"/><stop offset=".45" stop-color="'+g[1]+'"/><stop offset=".85" stop-color="'+g[2]+'"/><stop offset="1" stop-color="'+g[3]+'"/></radialGradient>'+
   /* ②ふちに向かって暗くなる（丸く見せる） */
   '<radialGradient id="'+lb+'" gradientUnits="userSpaceOnUse" cx="250" cy="0" r="'+R+'">'+
     '<stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset=".94" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>'+
   /* ④下のふちのうすい照り返し */
   '<radialGradient id="'+rf+'" gradientUnits="userSpaceOnUse" cx="300" cy="'+(R+40)+'" r="120">'+
     '<stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'+
   '</defs>'+
   '<g class="bscale"><g class="banner">'+B+'</g></g>'+
   '<g class="half l">'+body(0,true)+'</g>'+
   '<g class="half r">'+body(1,false)+'</g>'+
   '</svg>';
}

/* ===== 紙吹雪（タイマーのくす玉の紙吹雪と同じ動き）。⭐色と量は くす玉の色で変える ===== */
var CONF={
  /* 銅＝単色・数3割（本人「銅は減らして今の色で（もっと濃ゆくするとドス黒いからダメ）」）
     ⭐紙の大きさはほかと同じ・少しだけキラッと（2026-09-24 本人「銅メダルは紙のサイズはほかと一緒で。少しだけキラキラつけてあげて」。⚠一度 6割の大きさにしていた） */
  bronze:{cols:["#c47a3a"], k:0.3, glint:true, glintCol:"#ffe2bf", glintTh:0.9, glintBlur:6},
  /* 銀＝銀・白・さくら色・うすいピンク・うす紫。数8割。銀色と白の紙が白く光る
     （本人「青じゃなくて、さくらのテーマカラーピンクは？」「銀メダルに色を混ぜてみたら？」「銀も金と同じ量に見えた」「やっぱり少なめで」） */
  silver:{cols:["#c4cad2","#c4cad2","#ffffff","#c86a8e","#eaa6c0","#b8a6e0"], k:0.8, glint:true},
  /* ⭐金色と銀色の紙を増やして、色も入れる。たまにハートと⭐（2026-09-24 本人「銀と金を増やして、カラーも入れる」「たまにハートの紙吹雪も入れるとか？⭐️とか」） */
  gold:  {cols:["#f2b82c","#f2b82c","#f2b82c","#ffe98a","#ffe98a","#c4cad2","#c4cad2","#ffffff",
                "#e67999","#f2a163","#69b992","#58baca","#6e89d8","#a17ad9","#ff4fa3"], k:1.6, glint:true, stars:0.22, hearts:0.07, star5:0.07, linger:true}   /* ⭐キラキラを増やす＝金色の紙が光る＋星がまたたく（2026-09-24 本人「金に、キラキラ感を増やせる？」） */   // 金＝たくさん
};
var fxTimers=[], fxRaf=[];
function later(fn,ms){ fxTimers.push(setTimeout(fn,ms)); }
function clearFx(){ fxTimers.forEach(clearTimeout); fxTimers=[]; fxRaf.forEach(function(o){ o.stop=true; }); fxRaf=[]; $("fx").innerHTML=""; }
function fxBox(){ return $("fx").getBoundingClientRect(); }
function makeCanvas(){
  var cv=document.createElement("canvas"), dpr=window.devicePixelRatio||1, fb=fxBox(), W=fb.width, H=fb.height;
  cv.width=W*dpr; cv.height=H*dpr; $("fx").appendChild(cv);
  var ctx=cv.getContext("2d"); ctx.scale(dpr,dpr); return {cv:cv,ctx:ctx,W:W,H:H};
}
function loop(step){
  var h={stop:false}, last=performance.now(), t0=last; fxRaf.push(h);
  function f(now){ if(h.stop) return; var dt=Math.min(0.04,(now-last)/1000); last=now; if(step(dt,(now-t0)/1000)!==false) requestAnimationFrame(f); }
  requestAnimationFrame(f);
}
function confetti(q,color){
  var c=makeCanvas(), ctx=c.ctx, W=c.W, H=c.H, conf=CONF[color]||CONF.gold;
  var G=3400, N=Math.round(Math.min(300, W/2.6)*conf.k), ps=[];
  for(var i=0;i<N;i++){
    var p, side=(Math.random()<.5?-1:1);
    if(i<N*0.3){
      /* ⭐上から降る分（2026-09-24 本人「上から降る感じがない」）＝割れた玉のあたりの、画面の上の端から降ってくる */
      p={x:q.cx+(Math.random()-.5)*q.ballR*4.2, y:-20-Math.random()*H*0.25, vx:(Math.random()-.5)*120, vy:40+Math.random()*120, delay:0.05+Math.random()*0.9};
    }else if(i<N*0.6){
      var off=Math.random()*q.ballR;
      p={x:q.cx+side*off, y:q.top+Math.random()*q.ballR*0.85, vx:side*(150+Math.random()*450)*(0.4+off/q.ballR), vy:-80-Math.random()*320, delay:Math.random()*0.35};
    }else{
      var bh=q.bBot-q.bTop;
      p={x:q.cx+side*Math.random()*q.ballR*1.7, y:q.bTop+bh*(0.45+Math.random()*0.6), vx:side*(120+Math.random()*560), vy:-250-Math.random()*450, delay:0.15+Math.random()*0.5};
    }
    p.term=80+Math.random()*80; p.sw=18+Math.random()*34; p.sf=1.5+Math.random()*2.5; p.ph=Math.random()*6.3;
    p.rot=Math.random()*6.3; p.vr=(Math.random()-.5)*12; p.flip=Math.random()*6.3; p.vf=5+Math.random()*9;
    /* ⭐紙の大きさは画面の幅に合わせる（スマホでは小さく）＝小さい画面で紙が大きすぎると、どれも同じ量に見える（2026-09-24 本人「スマホは紙吹雪のボリュームがみんな一緒に見えた」） */
    var sz=Math.max(0.55, Math.min(1, W/1100))*(conf.size||1);
    p.w=(7+Math.random()*6)*sz; p.h=(10+Math.random()*8)*sz; p.round=Math.random()<.18;
    p.col=conf.cols[Math.floor(Math.random()*conf.cols.length)];
    /* ⭐もっとキラキラ（2026-09-24 本人「もっとキラキラ」「白も混ぜる？」）＝白い紙を足した・星は3割・光る時間を長く */
    p.glint=conf.glint && (p.col==="#c4cad2" || p.col==="#f2b82c" || p.col==="#ffe98a" || p.col==="#ffffff" || p.col==="#c47a3a");
    /* ⭐金は最後まで残る感じに（2026-09-24 本人「金のくす玉の紙吹雪が、最後にもう少し散らばった感じ（残った感じ）にできるなら」）
       ＝①一部はゆっくり、大きくゆれながら長く舞う ②半分くらいは画面の下に落ちて、そのまま積もって残る */
    if(conf.linger){
      if(Math.random()<0.35){ p.term=28+Math.random()*34; p.sw*=1.7; }
      if(Math.random()<0.5) p.floor=H-3-Math.random()*16;
    }
    p.gc=conf.glintCol||"#ffffff"; p.gt=conf.glintTh||0.72; p.gb=conf.glintBlur||10;     // 銀・金の紙が、こちらを向いた一瞬だけ白く光る
    p.star=conf.stars && Math.random()<conf.stars;   // 金だけ＝光の星がまたたく
    if(!p.star){ var rr=Math.random();
      if(conf.hearts && rr<conf.hearts){ p.shape="heart"; p.col=["#ff4f8b","#e67999","#ff7aa8"][Math.floor(Math.random()*3)]; p.glint=false; }
      else if(conf.star5 && rr<conf.hearts+conf.star5){ p.shape="star5"; p.col=["#f2b82c","#ffd84a"][Math.floor(Math.random()*2)]; p.glint=false; } }
    ps.push(p);
  }
  loop(function(dt,t){
    ctx.clearRect(0,0,W,H);
    var alive=0;
    for(var i=0;i<ps.length;i++){
      var p=ps[i]; if(t<p.delay){ alive++; continue; }
      if(p.rest){ /* 下に積もった紙＝動かない */ }
      else{
        if(p.vy<0) p.vy+=G*dt; else { p.vy=Math.min(p.term,p.vy+G*dt*0.15); p.vx*=0.94; }
        p.x+=p.vx*dt+(p.vy>0?Math.sin(t*p.sf+p.ph)*p.sw*dt:0); p.y+=p.vy*dt; p.rot+=p.vr*dt; p.flip+=p.vf*dt;
        if(p.floor && p.vy>0 && p.y>=p.floor){ p.y=p.floor; p.rest=true; p.flip=Math.PI*0.08+Math.random()*0.5; p.star=false; }
      }
      if(p.y>H+20 && p.vy>0) continue;
      alive++;
      var fc=Math.cos(p.flip);
      if(p.star){   /* 4本の光の星。明るさがゆれる */
        var a=0.35+0.65*Math.abs(Math.sin(t*7+p.ph)), R=Math.max(9, p.w*1.7);   // スマホでも小さくなりすぎないように
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*0.3); ctx.globalAlpha=a;
        ctx.shadowColor="rgba(255,236,150,.95)"; ctx.shadowBlur=10; ctx.fillStyle="#fff6c8";
        ctx.beginPath(); ctx.moveTo(0,-R); ctx.quadraticCurveTo(0,0,R,0); ctx.quadraticCurveTo(0,0,0,R); ctx.quadraticCurveTo(0,0,-R,0); ctx.quadraticCurveTo(0,0,0,-R); ctx.fill();
        ctx.restore(); continue;
      }
      if(p.shape){   /* ハートと⭐＝形が分かるように、ひっくり返さず少しだけゆらす */
        var S=(p.shape==="star5") ? Math.max(13, p.h*1.5) : Math.max(8, p.h*0.95);   // ⭐星は大きめ（とがっていて小さく見えるため・2026-09-24 本人「そうして」）
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.sin(p.rot)*0.5); ctx.scale(0.75+0.25*Math.abs(fc),1); ctx.fillStyle=p.col;
        ctx.beginPath();
        if(p.shape==="heart"){
          ctx.moveTo(0,S*0.35); ctx.bezierCurveTo(-S*1.1,-S*0.35,-S*0.45,-S*1.05,0,-S*0.45); ctx.bezierCurveTo(S*0.45,-S*1.05,S*1.1,-S*0.35,0,S*0.35);
        }else{
          for(var k=0;k<10;k++){ var rad=(k%2===0)?S*0.75:S*0.32, an=-Math.PI/2+k*Math.PI/5; if(k===0) ctx.moveTo(Math.cos(an)*rad,Math.sin(an)*rad); else ctx.lineTo(Math.cos(an)*rad,Math.sin(an)*rad); }
          ctx.closePath();
        }
        ctx.fill(); ctx.restore(); continue;
      }
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.scale(1,fc);
      var shine=p.glint && Math.abs(fc)>p.gt;
      ctx.fillStyle=shine ? p.gc : p.col;
      if(shine){ ctx.shadowColor=p.gc; ctx.shadowBlur=p.gb; }
      if(p.round){ ctx.beginPath(); ctx.arc(0,0,p.w*0.55,0,6.3); ctx.fill(); } else ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    }
    if(conf.linger){ if(t<40) return true; return false; }   // 金は消さずに残す（次へ・もどるで片付く）
    if(alive && t<14) return true;
    if(c.cv.parentNode) c.cv.remove(); return false;
  });
}

/* =====================================================================
   動かす
   A（one）＝1つずつ真ん中に下りてくる。押す→3・2・1→割れる。押す→次が下りてくる
   B（row）＝はじめから並んで吊るされている。押すたびに 3・2・1→順番に割れる
   ⭐並べるときは表彰台の形＝最後に出るくす玉がまん中で少し大きい（3個のとき：1つ目＝右・2つ目＝左・3つ目＝まん中）
   ===================================================================== */
var run={items:[], els:[], idx:0, opened:0, busy:false, done:false}, wakeLock=null;
function sizeFor(mode,n,i){
  if(mode==="one" || n===1) return {left:50, w:"min(82cqw,106cqh,850px)"};
  if(n===2) return {left:[30,70][i], w:"min(44cqw,70cqh,560px)"};
  var L=[82,18,50][i], W=(i===2) ? "min(36cqw,62cqh,480px)" : "min(29cqw,52cqh,400px)";
  return {left:L, w:W};
}
function hang(i){
  var it=run.items[i], el=document.createElement("div"), s=sizeFor(run.mode,run.items.length,i);
  el.className="kusu"; el.style.left=s.left+"%"; el.style.width=s.w;
  if(run.mode==="row" && run.items.length>1) el.style.top="-8cqh";   // 並べるときは玉が小さいので、見える部分を少し多めに
  el.innerHTML=kusuSvg(it.c,it.t,"おめでとう");   // 空のときは「おめでとう」（見本の名前は出さない）
  $("stage").appendChild(el);
  /* ⭐並べたときも、帯（紙）は1つのときと同じくらいの大きさに。銀・銅はほんの少しだけ小さく。ひもが長くなって下にぶら下がる
     （2026-09-24 本人「並べたときの紙は、全体的に大きくして」「ぶら下がるのもありで、紙は1つの時と同じくらい」「ちょっとずつ銀と、銅がちいさくなればいい。ほんのちょっとだけ」） */
  var f=1;
  if(run.mode==="row" && run.items.length>1){
    var fb=fxBox(), single=Math.min(fb.width*0.82, fb.height*1.06, 850), mine=el.getBoundingClientRect().width||1;
    f=(single/mine)*({gold:1, silver:0.94, bronze:0.88}[it.c]||1);
    el.querySelector(".bscale").setAttribute("transform","translate(250 0) scale("+f.toFixed(3)+") translate(-250 0)");
  }
  el.setAttribute("data-f", f);
  requestAnimationFrame(function(){ el.classList.add("in"); });
  setTimeout(function(){ el.classList.add("in"); },30);
  return el;
}
function openKusu(el,color){
  el.classList.add("open");
  var fb=fxBox(), r=el.getBoundingClientRect(), k=r.width/500, L=r.left-fb.left, T=r.top-fb.top;
  var f=+el.getAttribute("data-f")||1, by=+el.getAttribute("data-by")||KUSU_BY;   // 並べたときは帯が大きい・ひもの長さがちがう
  confetti({cx:L+r.width/2, top:T, ballR:KUSU_R*k, bTop:T+by*k*f, bBot:T+(by+290)*k*f}, color);
}
/* ⭐並べたとき、帯の上の端をそろえる＝いちばん上にある帯（ふつうは銅）に、ほかの帯の上の端を合わせる（ひもの長さで合わせる）
   （2026-09-24 本人「金の紙の上端を銅にそろえて。銀も」） */
function alignRow(){
  if(run.els.length<2) return;
  var info=run.els.map(function(el){ var k=(el.getBoundingClientRect().width||1)/500, f=+el.getAttribute("data-f")||1; return {el:el,k:k,f:f,top:KUSU_BY*k*f}; });
  var target=Math.min.apply(null, info.map(function(x){ return x.top; }));
  info.forEach(function(x,i){
    var by=target/(x.k*x.f);
    if(Math.abs(by-KUSU_BY)<0.5) return;
    var it=run.items[i], tr=x.el.querySelector(".bscale").getAttribute("transform");
    x.el.innerHTML=kusuSvg(it.c,it.t,"おめでとう",by);
    if(tr) x.el.querySelector(".bscale").setAttribute("transform",tr);
    x.el.setAttribute("data-by",by);
  });
}
/* 3・2・1 を大きく出してから fn */
function count321(fn){
  run.busy=true; $("nextBtn").disabled=true;
  var box=$("cnt"), n=3;
  function step(){
    if(n===0){ box.innerHTML=""; run.busy=false; fn(); updateBtn(); return; }
    box.innerHTML='<span>'+n+'</span>'; n--; later(step,800);
  }
  step();
}
function updateBtn(){
  var b=$("nextBtn");
  b.disabled = run.done;
  b.textContent = run.done ? "おわり" : "▶ 次へ";
}
function next(){
  if(run.busy || run.done) return;
  var n=run.items.length;
  if(run.mode==="one"){
    var el=run.els[run.idx];
    if(!el.classList.contains("open")){
      count321(function(){ openKusu(el, run.items[run.idx].c); if(run.idx>=n-1) run.done=true; updateBtn(); });
    }else if(run.idx<n-1){
      el.classList.add("out"); var old=el; setTimeout(function(){ if(old.parentNode) old.remove(); },550);
      clearFx(); run.idx++; run.els[run.idx]=hang(run.idx);
    }
  }else{
    var i=run.opened;
    count321(function(){ openKusu(run.els[i], run.items[i].c); run.opened++; if(run.opened>=n) run.done=true; updateBtn(); });
  }
}
function start(demo){
  run={items:st.items.slice(0,st.n).map(function(x){ return {c:x.c,t:x.t}; }), els:[], idx:0, opened:0, busy:false, done:false, mode:st.mode};
  clearFx(); $("stage").innerHTML=""; $("cnt").innerHTML="";
  var rs=$("runScreen"); rs.hidden=false; rs.classList.toggle("framed",!!demo);
  $("demoBack").hidden=!demo; $("demoBadge").hidden=!demo;
  document.body.style.overflow="hidden";
  if(run.mode==="one") run.els[0]=hang(0);
  else { for(var i=0;i<run.items.length;i++) run.els[i]=hang(i); alignRow(); }
  updateBtn();
  if(!demo) keepAwake(true);
}
function stop(){
  clearFx(); $("stage").innerHTML=""; $("cnt").innerHTML="";
  $("runScreen").hidden=true; $("runScreen").classList.remove("framed"); $("demoBack").hidden=true;
  document.body.style.overflow=""; keepAwake(false);
  if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function(){});
}
/* ⭐スタートは自動で全画面（タイマーと同じ）。⚠全画面はボタンを押した直後しか頼めない */
$("startBtn").addEventListener("click",function(){
  var el=document.documentElement;
  if(!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(function(){});
  start(false);
});
$("demoBtn").addEventListener("click",function(){ start(true); });
$("nextBtn").addEventListener("click",next);
$("backBtn").addEventListener("click",stop);
$("fsBtn").addEventListener("click",function(){
  var el=document.documentElement;
  if(document.fullscreenElement) document.exitFullscreen().catch(function(){}); else if(el.requestFullscreen) el.requestFullscreen().catch(function(){});
});
document.addEventListener("keydown",function(e){
  if($("runScreen").hidden) return;
  if(e.code==="Space" || e.key==="Enter" || e.key==="ArrowRight"){ e.preventDefault(); next(); }
  else if(e.key==="Escape" && !document.fullscreenElement){ stop(); }
});
function keepAwake(on){
  try{
    if(on && navigator.wakeLock && !wakeLock){ navigator.wakeLock.request("screen").then(function(w){ wakeLock=w; w.addEventListener("release",function(){ wakeLock=null; }); }).catch(function(){}); }
    else if(!on && wakeLock){ wakeLock.release(); wakeLock=null; }
  }catch(e){}
}

/* はじめ */
setCount(3); setMode("one");
screenLoad();
refreshSaved();
})();
