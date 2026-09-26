/* ランダム指名メーカー（2026-09-26 作成中）
   ⭐決めたこと（決定ログ 2026-09-26「ランダムで当てるアプリ」）
     選ぶもの＝名前・番号・班（班は座席表の班とは別）／1回に1〜5
     見せ方＝トランプ（伏せたカードをめくる）とビンゴ（玉が転がってくる）
     トランプ＝段はマーク（♠♥♦♣）・列は番号。「次へ」でめくったカードは名前を残してグレー。全部めくったら「シャッフル」で2周目
     一周するまで同じ人は出ない
     ③先生の指定＝当てたい人（何番目か・1人ずつ数える）・当てない人（いちばん最後に出す・カードは人数分）。シャッターで隠す・その場だけ（保存しない）
     名簿は座席表と共通の箱（sakura-tools-rosters-v1）
   ⭐カードの中身は、めくった瞬間に決まる＝どのカードをめくっても、当てたい人を決めた順番で出せる */
(function(){
"use strict";
function $(id){ return document.getElementById(id); }
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function rnd(n){   // 0〜n-1。偏りの少ない乱数
  try{ var a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; }catch(e){ return Math.floor(Math.random()*n); }
}

var SUITS=["♠︎","♥︎","♦︎","♣︎"];   // ♠♥♦♣（⚠FE0E＝絵文字にしない）
var SUIT_NAMES=["スペード","ハート","ダイヤ","クラブ"];
var MAX_CARD=52, MAX_BINGO=99;
var BALL_COLORS=["#e2536b","#f0a33a","#4aa3df","#58b368","#9b6fd1","#e86fb0","#e0b52e","#3fb8af"];
var SAMPLE_NAMES=["あいざわ ゆい","いしかわ はる","いのうえ そうた","うえだ りこ","えんどう はると","おおの ゆず","おかだ みお","かとう ゆうと","きむら あおい",
  "くどう れん","こばやし ひなた","さいとう けんた","しみず さら","すずき だいち","せきぐち ほのか","たかはし りん","たなか りく","ちば かえで",
  "つじ こうき","なかむら めい","にしだ しょう","のむら あかり","はせがわ そうま","はやし たくみ","ひらの ゆな","ふじい かいと","ほんだ ことね",
  "まつもと ゆうき","みやざき いろは","むらかみ そら","もりた つばさ","やまぐち ゆうな","やまだ まな","よしだ ひろと","わたなべ すず"];

/* ===== いまの中身 ===== */
var st={src:"name", names:"", num:35, han:8, k:1, view:"card"};
var tsp={force:[], ex:[]};   // ③先生の指定（その場だけ）。{label, pos} / {label}

/* 名簿の1行から名前だけ取り出す（簡単スライドと同じ決まり） */
function nameOfLine(line){
  var cells=String(line).split(/[\t,，]/).map(function(x){ return x.replace(/^[\s　]+/,"").replace(/[\s　]+$/,""); }).filter(function(x){ return x.length; });
  if(cells.length===1){
    return cells[0].replace(/^[0-9０-９]+[.．、,，:：]?[\s　]*/,"").replace(/[\s　]*[（(\[【]?(男|女|男子|女子)[）)\]】]?$/,"").replace(/^[★☆][\s　]*/,"").replace(/^[\s　]+|[\s　]+$/g,"");
  }
  var name="";
  cells.forEach(function(c){
    if(/^[★☆]+$/.test(c) || /^(男|女|男子|女子)$/.test(c) || /^[0-9０-９]+$/.test(c)) return;
    if(!name) name=c;
  });
  return name.replace(/^[★☆][\s　]*/,"");
}
function entries(){
  if(st.src==="num"){ var a=[]; for(var i=1;i<=st.num;i++) a.push(String(i)); return a; }
  if(st.src==="han"){ var b=[]; for(var j=1;j<=st.han;j++) b.push(j+"班"); return b; }
  return st.names.split(/\r?\n/).map(nameOfLine).filter(function(x){ return x!==""; });
}
function unit(){ return st.src==="han" ? "班" : "人"; }

/* ===== ① 選ぶもの ===== */
function segSet(id,val){
  Array.prototype.forEach.call($(id).querySelectorAll("button"),function(b){
    var on=b.getAttribute("data-v")===String(val); b.classList.toggle("on",on); b.setAttribute("aria-checked",on?"true":"false");
  });
}
function setSrc(v){
  st.src=(v==="num"||v==="han")?v:"name";
  segSet("segSrc",st.src);
  $("srcName").hidden=st.src!=="name"; $("srcNum").hidden=st.src!=="num"; $("srcHan").hidden=st.src!=="han";
  Array.prototype.forEach.call(document.querySelectorAll(".pk-u"),function(s){ s.textContent=unit(); });
  $("kUnit").textContent=unit();
  refreshTsp();
}
function setK(n){ st.k=Math.max(1,Math.min(5,n|0||1)); segSet("segK",st.k); }
function setView(v){
  st.view=(v==="bingo")?"bingo":"card"; segSet("segView",st.view);
  $("viewHint").textContent = st.view==="bingo"
    ? "「回す」を押すと、選ぶ数だけ玉が転がってきます。玉に名前が入っています。"
    : "カードを伏せて並べます。めくると名前が出ます。段はマーク（♠♥♦♣）、列は番号なので「ハートの3」のように言えます。";
}
function countNames(){ $("nameCount").textContent=entries().length+unit(); }
$("segSrc").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; setSrc(b.getAttribute("data-v")); countNames(); screenSave(); });
$("segK").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; setK(+b.getAttribute("data-v")); screenSave(); });
$("segView").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; setView(b.getAttribute("data-v")); screenSave(); });
$("names").addEventListener("input",function(){ st.names=this.value; countNames(); refreshTsp(); screenSave(); });
$("namesClear").addEventListener("click",function(){ $("names").value=""; st.names=""; countNames(); refreshTsp(); screenSave(); });
$("numN").addEventListener("input",function(){ var n=this.value|0; if(n>=1){ st.num=Math.min(MAX_BINGO,n); refreshTsp(); screenSave(); } });
$("hanN").addEventListener("input",function(){ var n=this.value|0; if(n>=1){ st.han=Math.min(MAX_CARD,n); refreshTsp(); screenSave(); } });

/* ===== ③ 先生の指定（その場だけ） ===== */
function optList(list,sel,extra){
  var h=extra||"";
  list.forEach(function(x){ h+='<option value="'+esc(x)+'"'+(x===sel?" selected":"")+'>'+esc(x)+'</option>'; });
  return h;
}
function refreshTsp(){
  var all=entries(), n=all.length;
  /* 名簿を変えて、いなくなった人の指定は外す */
  tsp.force=tsp.force.filter(function(f){ return all.indexOf(f.label)>=0; });
  tsp.ex=tsp.ex.filter(function(x){ return all.indexOf(x.label)>=0; });
  var fr=$("forceRows"); fr.innerHTML="";
  tsp.force.forEach(function(f,i){
    var pos=""; for(var p=1;p<=Math.max(n,1);p++) pos+='<option value="'+p+'"'+(p===f.pos?" selected":"")+'>'+p+'番目</option>';
    var li=document.createElement("li");
    li.innerHTML='<select data-i="'+i+'" data-k="fl" aria-label="当てたい'+unit()+'">'+optList(all,f.label)+'</select>'+
      '<select data-i="'+i+'" data-k="fp" aria-label="何番目">'+pos+'</select>'+
      '<button type="button" class="mvbtn" data-i="'+i+'" data-k="fx" aria-label="消す">×</button>';
    fr.appendChild(li);
  });
  var er=$("exRows"); er.innerHTML="";
  tsp.ex.forEach(function(x,i){
    var li=document.createElement("li");
    li.innerHTML='<select data-i="'+i+'" data-k="el" aria-label="当てない'+unit()+'">'+optList(all,x.label)+'</select>'+
      '<button type="button" class="mvbtn" data-i="'+i+'" data-k="ex" aria-label="消す">×</button>';
    er.appendChild(li);
  });
}
function firstFree(){
  var all=entries(), used={};
  tsp.force.forEach(function(f){ used[f.label]=1; }); tsp.ex.forEach(function(x){ used[x.label]=1; });
  for(var i=0;i<all.length;i++) if(!used[all[i]]) return all[i];
  return null;
}
$("forceAdd").addEventListener("click",function(){
  var l=firstFree(); if(l===null){ alert("先に①で、選ぶものを入れてください。"); return; }
  var usedPos={}; tsp.force.forEach(function(f){ usedPos[f.pos]=1; });
  var p=1; while(usedPos[p]) p++;
  tsp.force.push({label:l,pos:p}); refreshTsp();
});
$("exAdd").addEventListener("click",function(){
  var l=firstFree(); if(l===null){ alert("先に①で、選ぶものを入れてください。"); return; }
  tsp.ex.push({label:l}); refreshTsp();
});
document.getElementById("opt3").addEventListener("change",function(e){
  var t=e.target, i=+t.getAttribute("data-i"), k=t.getAttribute("data-k");
  if(k==="fl"){ tsp.force[i].label=t.value; tsp.ex=tsp.ex.filter(function(x){ return x.label!==t.value; }); }
  else if(k==="fp"){ var p=+t.value; tsp.force.forEach(function(f,j){ if(j!==i && f.pos===p) f.pos=tsp.force[i].pos; }); tsp.force[i].pos=p; }   // 同じ順番は入れかえる
  else if(k==="el"){ tsp.ex[i].label=t.value; tsp.force=tsp.force.filter(function(f){ return f.label!==t.value; }); }
  refreshTsp();
});
document.getElementById("opt3").addEventListener("click",function(e){
  var b=e.target.closest(".mvbtn"); if(!b) return;
  var i=+b.getAttribute("data-i");
  if(b.getAttribute("data-k")==="fx") tsp.force.splice(i,1); else tsp.ex.splice(i,1);
  refreshTsp();
});

/* ===== 画面の保存（チェックを入れたときだけ・ページの型 3）。③は入れない ===== */
var KEY="sakura-random", sampleOn=false, stash=null;
function screenSave(){
  if(sampleOn || !$("save").checked) return;
  try{ localStorage.setItem(KEY, JSON.stringify(st)); flash("保存しました"); }catch(e){}
}
var flashT=0;
function flash(t){ $("savingLabel").textContent=t; clearTimeout(flashT); flashT=setTimeout(function(){ $("savingLabel").textContent=""; },1500); }
$("save").addEventListener("change",function(){
  if(this.checked){ screenSave(); }
  else { try{ localStorage.removeItem(KEY); }catch(e){} flash("保存していたものを消しました"); }
});
function applyData(s){
  st.names=String(s.names||""); $("names").value=st.names;
  st.num=Math.max(1,Math.min(MAX_BINGO,s.num|0||35)); $("numN").value=st.num;
  st.han=Math.max(1,Math.min(MAX_CARD,s.han|0||8)); $("hanN").value=st.han;
  setK(s.k); setView(s.view); setSrc(s.src); countNames();
}
function screenLoad(){
  try{
    var s=JSON.parse(localStorage.getItem(KEY)||"null"); if(!s) return false;
    $("save").checked=true; applyData(s); return true;
  }catch(e){ return false; }
}

/* ===== サンプル（ページの型 12-a）＝押したときだけ・本物の欄に入れる・消すと前に戻す・保存しない ===== */
function sampleIn(s,msg){
  if(!sampleOn){ stash=JSON.parse(JSON.stringify(st)); }
  sampleOn=true; applyData(s); tsp={force:[],ex:[]}; refreshTsp();
  $("sampleClear").hidden=false; $("opt1").open=true; $("opt2").open=true;
  $("sampleMsg").textContent=msg; setTimeout(function(){ $("sampleMsg").textContent=""; },3500);
}
$("sample1Btn").addEventListener("click",function(){
  sampleIn({src:"name", names:SAMPLE_NAMES.join("\n"), num:st.num, han:st.han, k:1, view:"card"},"サンプルの名前を35人入れました");
});
$("sample2Btn").addEventListener("click",function(){
  sampleIn({src:"han", names:st.names, num:st.num, han:8, k:1, view:"bingo"},"8班・ビンゴにしました");
});
$("sampleClear").addEventListener("click",function(){
  if(stash) applyData(stash);
  sampleOn=false; stash=null; tsp={force:[],ex:[]}; refreshTsp();
  $("sampleClear").hidden=true; $("sampleMsg").textContent="サンプルを消しました";
  setTimeout(function(){ $("sampleMsg").textContent=""; },3000);
});

/* ===== 名簿の箱（座席表・席次表・簡単スライドと共通）＝ページの型 4-b ===== */
var KEYC="sakura-tools-rosters-v1", MAXC=20;
function loadBox(){ try{ var d=JSON.parse(localStorage.getItem(KEYC)||"null"); if(d && d.classes) return d; }catch(e){} return {v:2,classes:[]}; }
function writeBox(d){ try{ localStorage.setItem(KEYC, JSON.stringify(d)); return true; }catch(e){ return false; } }
function rosters(){ return loadBox().classes.filter(function(c){ return c.kind!=="slide"; }); }   // ⚠文字のセット（簡単スライド）は出さない
function refreshBox(keepId){
  var list=rosters();
  [["clsSel",""],["selSaved","－"]].forEach(function(p){
    var sel=$(p[0]), keep=(keepId!=null)?keepId:sel.value;
    sel.innerHTML=p[1]?'<option value="">'+p[1]+'</option>':"";
    list.forEach(function(c){ var o=document.createElement("option"); o.value=c.id; o.textContent=c.label||"名簿"; sel.appendChild(o); });
    if(keep && list.some(function(c){ return c.id===keep; })) sel.value=keep;
  });
  $("recallRow").hidden=list.length===0;
  $("saveCount").textContent=list.length+"/"+MAXC;
}
function findCls(id){ var d=loadBox(); for(var i=0;i<d.classes.length;i++) if(d.classes[i].id===id) return d.classes[i]; return null; }
$("clsLoad").addEventListener("click",function(){
  var c=findCls($("clsSel").value); if(!c){ alert("保存済の名簿を選んでください。"); return; }
  var names=String(c.names||"").split("\n").map(nameOfLine).filter(function(x){ return x!==""; });
  $("names").value=names.join("\n"); st.names=$("names").value; setSrc("name"); countNames(); refreshTsp(); screenSave();
  $("selSaved").value=c.id;
});
function saveMsg(t){ $("saveMsg").textContent=t; }
/* ⚠上書きのとき、元の行（出席番号・男女など）を壊さない＝同じ名前の行はそのまま使う（ページの型 4-b） */
function mergeLines(oldText,names){
  var byName={};
  String(oldText||"").split("\n").forEach(function(l){ var n=nameOfLine(l); if(n && !byName[n]) byName[n]=l; });
  return names.map(function(n){ return byName[n]||n; }).join("\n");
}
function nameList(){ return st.names.split(/\r?\n/).map(nameOfLine).filter(function(x){ return x!==""; }); }
$("saveNew").addEventListener("click",function(){
  if(st.src!=="name" || !nameList().length){ saveMsg("保存できるのは①の名前です。①で「名前」を選んで、名前を入れてください。"); return; }
  var name=prompt("名簿の名前を入れてください（例：1年3組）",""); if(name===null) return; name=name.trim(); if(!name) return;
  var d=loadBox(), same=null;
  d.classes.forEach(function(c){ if(c.kind!=="slide" && c.label===name) same=c; });
  if(same){
    if(!confirm("「"+name+"」はもう保存されています。今の名前に差し替えますか？")) return;
    same.names=mergeLines(same.names,nameList()); writeBox(d); refreshBox(same.id); saveMsg("「"+name+"」を差し替えました。"); return;
  }
  if(rosters().length>=MAXC){ saveMsg("名簿の保存は"+MAXC+"件までです。いらないものを削除してください。"); return; }
  var it={id:"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), label:name, names:nameList().join("\n"), seat:null, seki:null, recs:[]};
  d.classes.push(it); if(!writeBox(d)){ saveMsg("保存できませんでした。"); return; }
  refreshBox(it.id); saveMsg("「"+name+"」を保存しました。");
});
$("saveOver").addEventListener("click",function(){
  var c=findCls($("selSaved").value);
  if(!c){ saveMsg("上書きする名簿を「保存済の名簿」で選んでください。"); return; }
  if(st.src!=="name" || !nameList().length){ saveMsg("上書きできるのは①の名前です。"); return; }
  if(!confirm("「"+c.label+"」を今の名前で上書きしますか？座席表メーカー・席次表メーカーの名簿も変わります。")) return;
  var d=loadBox(); d.classes.forEach(function(x){ if(x.id===c.id) x.names=mergeLines(x.names,nameList()); });
  writeBox(d); refreshBox(c.id); saveMsg("「"+c.label+"」に上書きしました。");
});
$("saveDel").addEventListener("click",function(){
  var c=findCls($("selSaved").value);
  if(!c){ saveMsg("削除する名簿を「保存済の名簿」で選んでください。"); return; }
  if(!confirm("「"+c.label+"」を消します。座席表メーカー・席次表メーカーからも消えます。よろしいですか。")) return;
  var d=loadBox(); d.classes=d.classes.filter(function(x){ return x.id!==c.id; }); writeBox(d);
  refreshBox(""); saveMsg("「"+c.label+"」を削除しました。");
});

/* 「？」の開け閉め（見出しのすぐ下の .tip-body を出し入れ。長いものは tip.js がポップアップにする） */
document.addEventListener("click",function(e){
  var b=e.target.closest(".tip-btn"); if(!b) return;
  var host=b.closest("h2,summary,p,label"), body=host && host.nextElementSibling;
  if(!body || !body.classList.contains("tip-body")) return;
  e.preventDefault(); body.hidden=!body.hidden; b.setAttribute("aria-expanded", body.hidden?"false":"true");
});

/* =====================================================================
   選ぶしくみ（トランプもビンゴも同じ）
   ⭐一周するまで同じ人は出ない＝その周で出た人を外して選ぶ
   ⭐当てたい人＝1周目だけ。p番目（1人ずつ数える）になったらその人。まだ順番が来ていない当てたい人は、先に出ないよう取っておく
   ===================================================================== */
var run=null, wakeLock=null;
function newRound(){
  run.pool=run.active.slice(); run.drawn=0;
}
function pickOne(){
  var p=run.drawn+1, pick=null;
  if(run.round===1){
    run.force.forEach(function(f){ if(f.pos===p && run.pool.indexOf(f.label)>=0) pick=f.label; });
  }
  if(pick===null){
    var hold={};
    if(run.round===1) run.force.forEach(function(f){ if(f.pos>p) hold[f.label]=1; });
    var cand=run.pool.filter(function(x){ return !hold[x] && run.ex.indexOf(x)<0; });
    if(!cand.length) cand=run.pool.filter(function(x){ return !hold[x]; });   // 残りが当てない人だけになったら、最後に出す
    if(!cand.length) cand=run.pool.slice();
    pick=cand[rnd(cand.length)];
  }
  run.pool.splice(run.pool.indexOf(pick),1); run.drawn++;
  return pick;
}

/* 文字を箱に収める（名前は空白で2行に分ける） */
function splitLines(text){
  var lines=String(text).split(/[\s　]+/).filter(Boolean);
  if(lines.length>2) lines=[lines[0], lines.slice(1).join(" ")];
  return lines;
}
/* ⭐班は数字を大きく、「班」は小さく（2026-09-26 本人「漢字の班は小さくていい。数字を大きく、班は小さめで」） */
var HAN_RE=/^(\d+)(班)$/;
function fitSize(text,w,h,maxFs){
  var hm=String(text).match(HAN_RE);
  if(hm) return Math.max(8,Math.floor(Math.min(maxFs*2.4, w/(hm[1].length*0.62+0.42)*0.98, h/1.02)));
  if(/^\d+$/.test(String(text))) return Math.max(8,Math.floor(Math.min(maxFs*2.4, w/(String(text).length*0.62)*0.98, h/1.02)));   // ⭐番号も大きく（2026-09-26 本人「トランプで数値の時も数値を大きくして」）   // ⭐数字をもっと大きく（2026-09-26 本人「班の時は数字をもっと大きくして」）
  var lines=splitLines(text);
  var len=function(s){ var n=0; for(var i=0;i<s.length;i++) n+= s.charCodeAt(i)<256 ? .6 : 1; return n; };
  var m=Math.max.apply(null, lines.map(len))||1;
  return Math.max(8,Math.floor(Math.min(maxFs, w/m*0.95, h/(Math.max(lines.length,1)*1.2))));
}
/* ⭐字の大きさは、いちばん長い名前に合わせて全部そろえる（名前ごとに大きさが変わると、ばらついて見える） */
function uniformSize(w,h,maxFs){
  var fs=maxFs;
  run.active.forEach(function(x){ fs=Math.min(fs, fitSize(x,w,h,maxFs)); });
  return fs;
}
function fitText(el,text,w,h,maxFs,fs){
  var hm=String(text).match(HAN_RE);
  if(hm){
    el.style.fontSize=(fs||fitSize(text,w,h,maxFs))+"px";
    el.innerHTML='<span class="hw"><span class="hn">'+esc(hm[1])+'</span><span class="hs">'+esc(hm[2])+'</span></span>';   // ⚠玉の字の入れ物は flex なので、1つにくるまないと「班」がまん中にそろってしまう
    return;
  }
  el.style.fontSize=(fs||fitSize(text,w,h,maxFs))+"px";
  el.innerHTML=splitLines(text).map(esc).join("<br>");
}

/* ===== トランプ ===== */
function layout(n){   // 段（1〜4）と列の数。すき間が少なく、横長の画面に合う形
  var best=null;
  for(var r=1;r<=4;r++){
    var c=Math.ceil(n/r); if(c>13) continue;
    var score=(r*c-n)*1.5+Math.abs(c/r-2.2);
    if(!best || score<best.score) best={r:r,c:c,score:score};
  }
  return best;
}
function buildCards(){
  var n=run.active.length, L=layout(n), stage=$("stage");
  run.L=L; run.cards=[];
  stage.innerHTML="";
  var g=document.createElement("div"); g.className="pk-grid"; stage.appendChild(g); run.grid=g;
  /* 列の番号（上）と段のマーク（左） */
  g.appendChild(document.createElement("span"));
  for(var c=0;c<L.c;c++){ var cl=document.createElement("span"); cl.className="pk-collbl"; cl.textContent=c+1; g.appendChild(cl); }
  var k=0;
  for(var r=0;r<L.r;r++){
    var rl=document.createElement("span"); rl.className="pk-rowlbl s"+r; rl.textContent=SUITS[r]; rl.title=SUIT_NAMES[r]; g.appendChild(rl);
    for(var c2=0;c2<L.c;c2++){
      if(k>=n){ g.appendChild(document.createElement("span")); continue; }
      var cd=document.createElement("div"); cd.className="pk-card s"+r;
      cd.setAttribute("role","button"); cd.setAttribute("aria-label",SUIT_NAMES[r]+"の"+(c2+1));
      cd.innerHTML='<div class="in"><div class="bk"><span class="bn">'+SUITS[r]+(c2+1)+'</span></div><div class="fc"><span class="cn">'+SUITS[r]+(c2+1)+'</span><span class="nm"></span></div></div>';
      cd._r=r; cd._c=c2; g.appendChild(cd); run.cards.push(cd); k++;
    }
  }
  g.addEventListener("click",function(e){ var cd=e.target.closest(".pk-card"); if(cd) flip(cd); });
  sizeCards();
  requestAnimationFrame(function(){ sizeCards(); });   // ⚠1回だけ、開いた直後にカードが小さく崩れたことがある（原因は分からない）。念のため描き直す
}
function sizeCards(){
  if(!run || run.view!=="card") return;
  var s=$("stage").getBoundingClientRect(), L=run.L, W=s.width*0.96, H=s.height*0.98;
  var lab=Math.min(W,H)*0.07, gap=Math.max(4,Math.min(W,H)*0.014);
  var ch=Math.min((H-lab-gap*L.r)/L.r, ((W-lab-gap*L.c)/L.c)/0.72), cw=ch*0.72;
  var g=run.grid;
  g.style.gridTemplateColumns=lab+"px repeat("+L.c+","+cw+"px)";
  g.style.gridTemplateRows=lab+"px repeat("+L.r+","+ch+"px)";
  g.style.gap=gap+"px";
  var gw=lab+L.c*(cw+gap), gh=lab+L.r*(ch+gap);
  g.style.left=((s.width-gw)/2 - lab*0.5)+"px"; g.style.top=((s.height-gh)/2)+"px";
  Array.prototype.forEach.call(g.querySelectorAll(".pk-rowlbl"),function(x){ x.style.fontSize=(Math.min(lab,ch)*0.8)+"px"; });
  Array.prototype.forEach.call(g.querySelectorAll(".pk-collbl"),function(x){ x.style.fontSize=(lab*0.55)+"px"; });
  run.cw=cw; run.ch=ch; run.fs=uniformSize(cw*0.84, ch*0.62, cw*0.34);
  run.cards.forEach(function(cd){
    cd.querySelector(".bk").style.fontSize=(cw*0.17)+"px";
    cd.querySelector(".cn").style.fontSize=(cw*0.14)+"px";
    var nm=cd.querySelector(".nm");
    if(cd._label!=null) cardText(cd);
  });
}
function cardText(cd){
  var nm=cd.querySelector(".nm");
  if(HAN_RE.test(cd._label) || /^\d+$/.test(cd._label)) fitText(nm, cd._label, run.cw*0.84, run.ch*0.62, run.cw*0.34);
  else fitText(nm, cd._label, 0,0,0, run.fs);
}
function upCount(){ return run.cards.filter(function(c){ return c.classList.contains("up"); }).length; }
function downCount(){ return run.cards.filter(function(c){ return !c.classList.contains("up") && !c.classList.contains("done"); }).length; }
function flip(cd){
  if(run.busy || cd.classList.contains("up") || cd.classList.contains("done")) return;
  /* ⭐「次へ」は使わない（2026-09-26 本人「トランプはね、次へ入らないや」）
     ＝選ぶ数だけめくったあと、次のカードをめくると、前にめくったカードが名前を残してグレーになる */
  if(upCount()>=run.k) cardNext();
  cd._label=pickOne();
  cardText(cd);
  cd.classList.add("up");
  updateRun();
}
function cardNext(){
  if(run.busy || !upCount()) return;
  run.cards.forEach(function(c){ if(c.classList.contains("up")){ c.classList.remove("up"); c.classList.add("done"); } });
  updateRun();
}
function cardShuffle(){
  if(run.busy) return;
  run.busy=true;
  var s=$("stage").getBoundingClientRect(), cx=s.left+s.width/2, cy=s.top+s.height/2;
  /* 真ん中に集めて、伏せて、配り直す */
  run.cards.forEach(function(c){
    var r=c.getBoundingClientRect(), dx=cx-(r.left+r.width/2), dy=cy-(r.top+r.height/2);
    c.classList.add("gather"); c.style.transform="translate("+dx+"px,"+dy+"px) rotate("+(rnd(40)-20)+"deg)";
  });
  later(function(){
    run.cards.forEach(function(c){ c.classList.remove("up","done"); c._label=null; c.querySelector(".nm").innerHTML=""; });
  },480);
  later(function(){
    run.cards.forEach(function(c,i){ c.style.transition="transform .5s cubic-bezier(.3,1.2,.5,1) "+(i*12)+"ms"; c.style.transform=""; });
  },900);
  later(function(){
    run.cards.forEach(function(c){ c.classList.remove("gather"); c.style.transition=""; });
    run.round++; newRound(); run.busy=false; updateRun();
  },1500+run.cards.length*12);
}

/* ===== ビンゴ ===== */
function buildBingo(){
  var stage=$("stage");
  /* ⭐カゴは横の軸（左右）のまわりに回る＝前から見ると、横の輪が太ったり細ったりして転がって見える
     ⭐ハンドルはカゴの右の横（2026-09-26 本人「回すバーが正面についているのが鋳肌。普通は右だと思う」） */
  var wire='<circle cx="50" cy="50" r="46" fill="none" stroke="#c9961f" stroke-width="2.6"/>';
  [-0.7,-0.35,0,0.35,0.7].forEach(function(k){
    var x=50+46*k, hh=Math.sqrt(46*46-(46*k)*(46*k));
    wire+='<line x1="'+x.toFixed(1)+'" y1="'+(50-hh).toFixed(1)+'" x2="'+x.toFixed(1)+'" y2="'+(50+hh).toFixed(1)+'" stroke="#d9a93a" stroke-width="1.3"/>';
  });
  for(var q=0;q<4;q++) wire+='<ellipse class="lat" cx="50" cy="50" rx="46" ry="'+(46*Math.abs(Math.cos(q*Math.PI/4))).toFixed(1)+'" fill="none" stroke="#d9a93a" stroke-width="1.3"/>';
  /* 軸（左右）・ハンドル（右） */
  wire+='<line x1="-2" y1="50" x2="115" y2="50" stroke="#b8871c" stroke-width="3" stroke-linecap="round"/>'+
    '<circle cx="2" cy="50" r="3.2" fill="#d9a93a"/><circle cx="98" cy="50" r="3.2" fill="#d9a93a"/>'+
    '<g id="crank"><line id="crankArm" x1="115" y1="50" x2="115" y2="32" stroke="#c9961f" stroke-width="3" stroke-linecap="round"/>'+
    '<circle id="crankKnob" cx="115" cy="32" r="4.6" fill="#e36a93" stroke="#b44770" stroke-width="1"/></g>';
  /* 脚（左右に1組ずつ・Aの字）・土台・受け皿。viewBox の横は -12〜112 */
  var stand='<svg class="pk-stand" viewBox="-12 0 124 142" aria-hidden="true">'+
    '<g stroke="#b8871c" stroke-width="3" stroke-linecap="round" fill="none">'+
    '<line x1="2" y1="50" x2="-6" y2="132"/><line x1="2" y1="50" x2="12" y2="132"/>'+
    '<line x1="98" y1="50" x2="88" y2="132"/><line x1="98" y1="50" x2="106" y2="132"/></g>'+
    '<rect x="-10" y="130" width="120" height="8" rx="3" fill="#c24f79"/>'+
    '<path d="M34 104 h32 l-4 12 h-24z" fill="#e36a93"/><rect x="40" y="116" width="20" height="14" fill="#c24f79"/></svg>';
  stage.innerHTML='<div class="pk-bingo"><div class="pk-mach"><div class="pk-gara" id="gara">'+stand+
    '<div class="pk-dome"><div class="pk-mix" id="mix"></div></div>'+
    '<svg class="pk-wire" viewBox="0 0 100 100" aria-hidden="true">'+wire+'</svg></div></div>'+
    '<div class="pk-right"><div class="pk-cur" id="cur"></div><p class="pk-histlbl">出た'+unit()+'</p><div class="pk-hist" id="hist"></div></div></div>';
  /* 玉＝止まっているときは下にたまる（rx,ry）。回すと円ぜんたいに散らばる（sx,sy） */
  var h="";
  for(var i=0;i<14;i++){
    var a=rnd(360)*Math.PI/180, r=10+rnd(26);
    h+='<i style="--bc:'+BALL_COLORS[i%BALL_COLORS.length]+';--rx:'+(14+rnd(56))+'%;--ry:'+(58+rnd(22))+'%;'+
      '--sx:'+(14+rnd(56))+'%;--hy:'+(6+rnd(30))+'%;--tt:'+(1.1+rnd(60)/100).toFixed(2)+'s;--td:-'+(rnd(150)/100).toFixed(2)+'s"></i>';
  }
  $("mix").innerHTML=h;
  run.ballI=0;
}
function ballFit(t,label,d){
  var num=/^\d+$/.test(label)||HAN_RE.test(label), mx=d*(num?0.4:0.26);   // ⭐番号・班は1つずつの大きさ（2けたに合わせて1けたが小さくならないように）
  if(num){ fitText(t,label,0,0,0, fitSize(label,d*0.6,d*0.46,mx)); return; }   // 番号・班は1つずつ。玉からはみ出さない大きさに
  fitText(t,label,0,0,0, uniformSize(d*0.66,d*0.58,mx));
}
function ballEl(label,d){
  var b=document.createElement("div"); b.className="pk-ball";
  b.style.setProperty("--bc",BALL_COLORS[run.ballI++%BALL_COLORS.length]);
  b.style.width=b.style.height=d+"px";
  var t=document.createElement("span"); t.className="t"; b.appendChild(t);
  ballFit(t,label,d);
  b._label=label;
  return b;
}
function histSize(){
  var h=$("hist").getBoundingClientRect(), n=run.active.length;
  /* ⭐全員ぶんが入る、いちばん大きい玉。小さすぎると名前が読めないので 44px より小さくしない */
  var gap=h.height*0.02+6, W=h.width*0.92;
  for(var d=96; d>44; d-=2){
    var per=Math.max(1,Math.floor(W/(d+gap)));
    if(Math.ceil(n/per)*(d+gap)<=h.height) return d;
  }
  return 44;
}
function sizeBingo(){
  if(!run || run.view!=="bingo") return;
  var cur=$("cur").getBoundingClientRect();
  run.bigD=Math.min(cur.height*0.85, (cur.width*0.9)/Math.max(run.k,1)*0.88, 320);
  Array.prototype.forEach.call($("cur").children,function(b){ b.style.width=b.style.height=run.bigD+"px"; ballFit(b.firstChild,b._label,run.bigD); });
  var hd=histSize();
  Array.prototype.forEach.call($("hist").children,function(b){ b.style.width=b.style.height=hd+"px"; ballFit(b.firstChild,b._label,hd); });
}
function toHist(){
  var hd=histSize();
  Array.prototype.slice.call($("cur").children).forEach(function(b){
    b.classList.remove("roll"); b.classList.add("new");
    b.style.width=b.style.height=hd+"px";
    ballFit(b.firstChild,b._label,hd);
    $("hist").appendChild(b);
  });
}
/* カゴを回す絵（横の輪の太さとハンドルの位置を、角度から毎回描く） */
var cageRaf=0;
function drawCage(th){
  var lats=document.querySelectorAll("#gara .lat");
  for(var q=0;q<lats.length;q++) lats[q].setAttribute("ry",(46*Math.abs(Math.cos(th+q*Math.PI/4))).toFixed(1));
  var c=Math.cos(th), y=50-18*c, x=115+3*Math.sin(th);
  var arm=$("crankArm"), knob=$("crankKnob"); if(!arm) return;
  arm.setAttribute("x2",x.toFixed(1)); arm.setAttribute("y2",y.toFixed(1));
  knob.setAttribute("cx",x.toFixed(1)); knob.setAttribute("cy",y.toFixed(1));
}
function spinCage(on){
  cancelAnimationFrame(cageRaf);
  var g=$("gara"); if(!g) return;
  g.classList.toggle("spin",on);
  if(!on) return;
  var t0=performance.now(), th0=run.th||0;
  (function step(now){
    run.th=th0+(now-t0)/1000*Math.PI*2*0.55;   // ⭐ゆっくり＝1秒に0.55回転（2026-09-26 本人「もう少しゆっくりで、時間を少し長くして」）
    drawCage(run.th); cageRaf=requestAnimationFrame(step);
  })(t0);
}
/* ⭐玉はカゴの底から受け皿にコロンと落ちて、少し弾んでから、転がりながら大きくなって右に出る
   （2026-09-26 本人「出てくる円がさ。気になる。ボールだからさ」） */
function dropBall(label,i){
  var g=$("gara"), W=g.getBoundingClientRect().width, d=W*0.12;
  var mini=document.createElement("div"); mini.className="pk-ball pk-drop";
  mini.style.setProperty("--bc",BALL_COLORS[run.ballI%BALL_COLORS.length]);
  mini.style.width=mini.style.height=d+"px";
  g.appendChild(mini);
  later(function(){
    var big=ballEl(label, run.bigD); big.style.opacity="0"; $("cur").appendChild(big);
    var a=mini.getBoundingClientRect(), b=big.getBoundingClientRect();
    var dx=(a.left+a.width/2)-(b.left+b.width/2), dy=(a.top+a.height/2)-(b.top+b.height/2), sc=a.width/b.width;
    mini.remove(); big.style.opacity="";
    if(big.animate) big.animate([
      {transform:"translate("+dx+"px,"+dy+"px) scale("+sc+") rotate(-300deg)"},
      {transform:"translate("+(dx*0.35)+"px,"+(dy*0.2)+"px) scale("+(sc+0.6*(1-sc))+") rotate(-60deg)",offset:.7},
      {transform:"none"}
    ],{duration:850,easing:"cubic-bezier(.3,.7,.4,1)"});
    updateRun();
  },900);
}
function bingoNext(){
  if(run.busy || !run.pool.length) return;
  run.busy=true; toHist();
  var n=Math.min(run.k, run.pool.length);
  spinCage(true); updateRun();
  later(function(){
    spinCage(false);
    var i=0;
    (function one(){
      if(i>=n){ later(function(){ run.busy=false; updateRun(); },950); return; }
      dropBall(pickOne(), i); i++;
      later(one,1000);
    })();
  },3000);   // ⭐回す時間を長く（前は1.6秒）
}
function bingoShuffle(){
  if(run.busy) return;
  $("cur").innerHTML=""; $("hist").innerHTML="";
  run.round++; newRound(); updateRun();
}

/* ===== 動かす ===== */
var timers=[];
function later(fn,ms){ timers.push(setTimeout(fn,ms)); }
function updateRun(){
  var left=run.pool.length, u=unit();
  $("roundLbl").textContent=run.round+"周目";
  $("leftLbl").textContent="のこり "+left+u;
  var nb=$("nextBtn"), sb=$("shufBtn"), msg="";
  if(run.view==="card"){
    var up=upCount(), down=downCount(), need=Math.min(run.k, up+down);
    var end=(down===0);
    nb.hidden=true; sb.hidden=!end;
    if(end) msg="全部めくりました。「シャッフル」で2周目へ";
    else if(up===0) msg="カードを"+need+"枚めくってください";
    else if(up<need) msg="あと"+(need-up)+"枚";
    else msg="次のカードをめくると、次の"+u+"へ";
  }else{
    var endB=(left===0 && !run.busy);
    nb.hidden=endB; sb.hidden=!endB;
    nb.disabled=run.busy;
    nb.textContent="▶ 回す";
    if(run.busy) msg="";
    else if(endB) msg="全部出ました。「シャッフル」で2周目へ";
    else msg="「回す」で"+Math.min(run.k,left)+u+"選びます";
  }
  $("runMsg").textContent=msg;
}
function start(demo){
  var all=entries();
  if(!all.length){ alert("先に①で、選ぶものを入れてください。"); $("opt1").open=true; return false; }
  /* ⭐当てない人もカードに入れる＝人数分のカード。当てない人は、いちばん最後に出る
     （2026-09-26 本人「この授業で当てたくない人っていうのもいると思う」「欠席が出たらもう一回やればいいだけだから人数分にして」「当てない人は一番最後に選択されます」） */
  var active=all.slice();
  var max=(st.view==="card")?MAX_CARD:MAX_BINGO;
  if(active.length>max){ alert((st.view==="card"?"トランプは":"ビンゴは")+max+"までです。いまは"+active.length+"あります。"); return false; }
  run={active:active, ex:tsp.ex.map(function(x){ return x.label; }), force:tsp.force.map(function(f){ return {label:f.label,pos:f.pos}; }), round:1, k:st.k, view:st.view, busy:false};
  newRound();
  timers.forEach(clearTimeout); timers=[];
  var rs=$("runScreen"); rs.hidden=false; rs.classList.toggle("framed",!!demo);
  $("demoBack").hidden=!demo; $("demoBadge").hidden=!demo;
  document.body.style.overflow="hidden";
  if(run.view==="card") buildCards(); else { buildBingo(); sizeBingo(); }
  updateRun();
  if(!demo) keepAwake(true);
  return true;
}
function stop(){
  timers.forEach(clearTimeout); timers=[]; cancelAnimationFrame(cageRaf);
  $("stage").innerHTML=""; run=null;
  $("runScreen").hidden=true; $("runScreen").classList.remove("framed"); $("demoBack").hidden=true;
  document.body.style.overflow=""; keepAwake(false);
  if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function(){});
}
function next(){ if(!run) return; if(run.view==="card") cardNext(); else bingoNext(); }
function shuffle(){ if(!run) return; if(run.view==="card") cardShuffle(); else bingoShuffle(); }
/* ⭐スタートは自動で全画面（くす玉メーカーと同じ）。⚠全画面はボタンを押した直後しか頼めない */
$("startBtn").addEventListener("click",function(){
  var el=document.documentElement;
  if(start(false) && !document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(function(){});
});
$("demoBtn").addEventListener("click",function(){ start(true); });
$("nextBtn").addEventListener("click",next);
$("shufBtn").addEventListener("click",shuffle);
$("backBtn").addEventListener("click",stop);
$("fsBtn").addEventListener("click",function(){
  var el=document.documentElement;
  if(document.fullscreenElement) document.exitFullscreen().catch(function(){}); else if(el.requestFullscreen) el.requestFullscreen().catch(function(){});
});
document.addEventListener("keydown",function(e){
  if($("runScreen").hidden || !run) return;
  if(e.code==="Space" || e.key==="Enter" || e.key==="ArrowRight"){
    e.preventDefault();
    if(!$("shufBtn").hidden) shuffle(); else next();
  }
  else if(e.key==="Escape" && !document.fullscreenElement){ stop(); }
});
var rsT=0;
window.addEventListener("resize",function(){ clearTimeout(rsT); rsT=setTimeout(function(){ if(!run) return; if(run.view==="card") sizeCards(); else sizeBingo(); },120); });
document.addEventListener("fullscreenchange",function(){ setTimeout(function(){ if(!run) return; if(run.view==="card") sizeCards(); else sizeBingo(); },150); });
function keepAwake(on){
  try{
    if(on && navigator.wakeLock && !wakeLock){ navigator.wakeLock.request("screen").then(function(w){ wakeLock=w; w.addEventListener("release",function(){ wakeLock=null; }); }).catch(function(){}); }
    else if(!on && wakeLock){ wakeLock.release(); wakeLock=null; }
  }catch(e){}
}

/* はじめ。⭐はじめては章を全部たたむ／保存があれば①②を開ける（ページの型 2-a）。③はいつも閉じて始める */
setK(1); setView("card"); setSrc("name");
if(screenLoad()){ $("opt1").open=true; $("opt2").open=true; }
countNames();
refreshBox();
})();
