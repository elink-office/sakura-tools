/* バスの座席表メーカー（2026-09-27 作成中）
   ⭐決めたこと（決定ログ 2026-09-27）
     対象＝小学生の遠足・修学旅行。1台ぶんを1枚（A4たて）。2台は1台ずつ作る
     バスの形＝大型45席（2＋2×10列＋後ろ5）／大型49席（11列＋後ろ5）／自分で決める（列と後ろの席数）。補助席は通路に前から
     席の決め方＝名簿の順／ランダム／空のまま ＋ 先に決める席（名簿にない人も打てる）
     席の入れかえ＝席を2つ押す。「席に入っていない人」を押してから席を押すと入る
     名簿は座席表と共通の箱（sakura-tools-rosters-v1）。並べた席は「画面の保存」にだけ残る
   ⚠新幹線の座席表（shinkansen.js）とは別の仕組み。共通にしない（本人） */
(function(){
"use strict";
function $(id){ return document.getElementById(id); }
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function rnd(n){ try{ var a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; }catch(e){ return Math.floor(Math.random()*n); } }

var SAMPLE_NAMES=["あいざわ ゆい","いしかわ はる","いのうえ そうた","うえだ りこ","えんどう はると","おおの ゆず","おかだ みお","かとう ゆうと","きむら あおい",
  "くどう れん","こばやし ひなた","さいとう けんた","しみず さら","すずき だいち","せきぐち ほのか","たかはし りん","たなか りく","ちば かえで",
  "つじ こうき","なかむら めい","にしだ しょう","のむら あかり","はせがわ そうま","はやし たくみ","ひらの ゆな","ふじい かいと","ほんだ ことね",
  "まつもと ゆうき","みやざき いろは","むらかみ そら","もりた つばさ","やまぐち ゆうな","やまだ まな","よしだ ひろと","わたなべ すず"];

/* ===== いまの中身 ===== */
var st={names:"", type:"45", rows:10, back:5, hojo:false, hojoN:8, order:"random", fixed:[], title:"", car:1, assign:{}, sep:[], adj:[], han:0, hanOf:{}};
var sel=null;        // 押して選んでいる席の記号
var chipSel=null;    // 押して選んでいる「席に入っていない人」

/* 名簿の1行から名前だけ取り出す（簡単スライドと同じ決まり） */
function nameOfLine(line){
  var cells=String(line).split(/[\t,，]/).map(function(x){ return x.replace(/^[\s　]+/,"").replace(/[\s　]+$/,""); }).filter(function(x){ return x.length; });
  if(cells.length===1){
    return cells[0].replace(/^[0-9０-９]+[.．、,，:：]?[\s　]*/,"").replace(/[\s　]+(?:[0-9０-９]+班|班[0-9０-９]+)$/,"").replace(/[\s　]*[（(\[【]?(男|女|男子|女子)[）)\]】]?$/,"").replace(/^[★☆][\s　]*/,"").replace(/^[\s　]+|[\s　]+$/g,"");
  }
  var name="";
  cells.forEach(function(c){
    if(/^[★☆]+$/.test(c) || /^(男|女|男子|女子)$/.test(c) || /^[0-9０-９]+$/.test(c) || /^(?:[0-9０-９]+班|班[0-9０-９]+)$/.test(c)) return;
    if(!name) name=c;
  });
  return name.replace(/^[★☆][\s　]*/,"");
}
function nameList(){ return st.names.split(/\r?\n/).map(nameOfLine).filter(function(x){ return x!==""; }); }

/* ===== バスの形 → 席の記号の並び（前から順） ===== */
function shape(){
  if(st.type==="45") return {rows:10, back:5, hojoMax:8};
  if(st.type==="49") return {rows:11, back:5, hojoMax:11};
  return {rows:st.rows, back:st.back, hojoMax:st.rows};
}
function seatCodes(){
  var s=shape(), a=[], r, L=["A","B","C","D","E"];
  for(r=1;r<=s.rows;r++){ a.push(r+"A"); a.push(r+"B"); a.push(r+"C"); a.push(r+"D"); }
  for(var i=0;i<s.back;i++) a.push((s.rows+1)+L[i]);
  if(st.hojo){ var n=Math.min(st.hojoN, s.hojoMax); for(r=1;r<=n;r++) a.push("補"+r); }
  return a;
}
function codeLabel(c){ return c.charAt(0)==="補" ? "補助席"+c.slice(1) : c; }
/* ⭐「隣」の組＝通路をはさまない2席（1Aと1B・1Cと1D）／補助席は両どなり（BとC）／いちばん後ろは横どうし。前後は隣にしない（2026-09-27） */
function pairsOf(){ var s=shape(), out=[], L=["A","B","C","D","E"], r;
  var hojoN=st.hojo?Math.min(st.hojoN,s.hojoMax):0;
  for(r=1;r<=s.rows;r++){ out.push([r+"A",r+"B"]); out.push([r+"C",r+"D"]); if(r<=hojoN){ out.push(["補"+r,r+"B"]); out.push(["補"+r,r+"C"]); } }
  for(var i=0;i<s.back-1;i++) out.push([(s.rows+1)+L[i],(s.rows+1)+L[i+1]]);
  return out; }

/* ===== ① 名簿 ===== */
function countNames(){ $("nameCount").textContent=nameList().length+"人"; }
function refreshDatalist(){
  var dl=$("nameList"); dl.innerHTML="";
  nameList().forEach(function(n){ var o=document.createElement("option"); o.value=n; dl.appendChild(o); });
}
$("names").addEventListener("input",function(){ st.names=this.value; afterNames(); });
$("namesClear").addEventListener("click",function(){ $("names").value=""; st.names=""; afterNames(); });
function afterNames(){ countNames(); refreshDatalist(); pruneAssign(); syncHan(); refreshCond(); drawSheet(); screenSave(); }

/* ===== ② バスの形 ===== */
function segSet(id,val){
  Array.prototype.forEach.call($(id).querySelectorAll("button"),function(b){
    var on=b.getAttribute("data-v")===String(val); b.classList.toggle("on",on); b.setAttribute("aria-checked",on?"true":"false");
  });
}
function setType(v){
  st.type=(v==="49"||v==="custom")?v:"45"; segSet("segType",st.type);
  $("customRow").hidden=st.type!=="custom";
  var s=shape();
  $("typeHint").textContent = st.type==="custom"
    ? "2席＋2席の列の数と、いちばん後ろの席数を入れてください。中型バス・マイクロバスもこれで作れます。"
    : "2席＋2席が"+s.rows+"列、いちばん後ろが5席で、正座席"+(s.rows*4+5)+"席です。";
  $("hojoN").max=s.hojoMax;
  if(st.hojoN>s.hojoMax){ st.hojoN=s.hojoMax; $("hojoN").value=st.hojoN; }
}
$("segType").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; setType(b.getAttribute("data-v")); afterShape(); });
$("rowsN").addEventListener("input",function(){ var n=this.value|0; if(n>=3&&n<=14){ st.rows=n; setType("custom"); afterShape(); } });
$("backN").addEventListener("change",function(){ st.back=+this.value; afterShape(); });
$("hojo").addEventListener("change",function(){ st.hojo=this.checked; $("hojoRow").hidden=!st.hojo; afterShape(); });
$("hojoN").addEventListener("input",function(){ var n=this.value|0; if(n>=1){ st.hojoN=Math.min(n,shape().hojoMax); afterShape(); } });
function afterShape(){ pruneAssign(); refreshFix(); drawSheet(); screenSave(); }

/* ===== ③ 席の決め方 ===== */
function setOrder(v){
  st.order=(v==="random"||v==="blank"||v==="han")?v:"list"; segSet("segOrder",st.order);
  $("orderHint").textContent = st.order==="han" ? "同じ班の人を、かたまりで座らせます。通路の片側の2席ずつ（1Aと1B、2Aと2B…）に、前から班ごとに入ります。班は「詳しい条件」で決めます。"
    : st.order==="random" ? "先に決める席を入れてから、残りの人をくじ引きで前から入れます。"
    : st.order==="blank" ? "先に決める席だけ入れて、あとは空のままです。④で「席に入っていない人」を押して、席を押すと入ります。"
    : "先に決める席を入れてから、残りの人を名簿の順に、1列目の A から入れます。";
}
$("segOrder").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; setOrder(b.getAttribute("data-v")); screenSave(); });

function refreshFix(){
  var codes=seatCodes(), ul=$("fixRows"); ul.innerHTML="";
  st.fixed.forEach(function(f,i){
    var opts=""; codes.forEach(function(c){ opts+='<option value="'+esc(c)+'"'+(c===f.code?" selected":"")+'>'+esc(codeLabel(c))+'</option>'; });
    var li=document.createElement("li");
    li.innerHTML='<input type="text" list="nameList" data-i="'+i+'" data-k="fl" value="'+esc(f.label)+'" placeholder="名前（先生も可）" aria-label="先に決める人">'+
      '<select data-i="'+i+'" data-k="fc" aria-label="席">'+opts+'</select>'+
      '<button type="button" class="mvbtn" data-i="'+i+'" data-k="fx" aria-label="消す">×</button>';
    ul.appendChild(li);
  });
}
$("fixAdd").addEventListener("click",function(){
  var codes=seatCodes(), used={}; st.fixed.forEach(function(f){ used[f.code]=1; });
  var c=codes.filter(function(x){ return !used[x]; })[0]||codes[0];
  st.fixed.push({label:"", code:c}); refreshFix();
  var last=$("fixRows").querySelector("li:last-child input"); if(last) last.focus();
});
$("fixRows").addEventListener("input",function(e){
  var t=e.target, i=+t.getAttribute("data-i"), k=t.getAttribute("data-k");
  if(k==="fl"){ st.fixed[i].label=t.value.trim(); screenSave(); }
});
$("fixRows").addEventListener("change",function(e){
  var t=e.target, i=+t.getAttribute("data-i"), k=t.getAttribute("data-k");
  if(k==="fc"){ var c=t.value; st.fixed.forEach(function(f,j){ if(j!==i && f.code===c) f.code=st.fixed[i].code; }); st.fixed[i].code=c; refreshFix(); screenSave(); }   // 同じ席は入れかえる
});
$("fixRows").addEventListener("click",function(e){
  var b=e.target.closest(".mvbtn"); if(!b) return;
  st.fixed.splice(+b.getAttribute("data-i"),1); refreshFix(); screenSave();
});

/* ===== 詳しい条件（離す・隣にする・班）＝2026-09-27 本人「隣とかの条件を入れよう」「班の仕組み…色分けしたほうがわかりやすいし、使わないなら使わなくていい」→ 班は A（班の数だけ入れて自動で分ける）
   ⭐「隣」＝pairsOf() の組だけ（前後・ななめは隣にしない）
   ⭐班＝席のかたまり。名簿の人の席を前から順に「班の数」で分けて、席を班の色でうすく塗る＋右上に「1班」。⭐班は席に付く（入れかえても色は席に残る）
   ⭐手で入れかえて条件を破っても止めない。席に赤い枠、④の中に1行（紙には出さない）
   ⚠新幹線の座席表（shinkansen.js） とは別の仕組み（本人「流用しないほうがいい」）。同じ考え方で、このファイルの中だけで書いている */
/* ⭐班の色は枠の線（2026-09-27 本人「色、塗りつぶしでなくて、枠だけに線にしよう」）。線なので、うすい色では見えない＝少し濃い色。⚠赤は条件の知らせ（赤い枠）とまぎれるので使わない */
var HAN_COLORS=["#4a90d9","#e8a33d","#4caf7a","#d9667a","#8e6cc9","#2fa9a0","#e07b39","#c25fa8","#7c8a99","#a67c52"];
var pdfing=false;
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=rnd(i+1), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function adjMap(){ var m={}; pairsOf().forEach(function(p){ (m[p[0]]=m[p[0]]||{})[p[1]]=1; (m[p[1]]=m[p[1]]||{})[p[0]]=1; }); return m; }
function whereIs(a){ var w={}; Object.keys(a).forEach(function(c){ w[a[c]]=c; }); return w; }
function violations(a){
  var m=adjMap(), w=whereIs(a), out=[];
  function ok(p){ return p && p[0] && p[1] && p[0]!==p[1]; }
  st.sep.forEach(function(p){ if(!ok(p)) return; var x=w[p[0]], y=w[p[1]]; if(x && y && m[x] && m[x][y]) out.push({kind:"sep",a:p[0],b:p[1]}); });
  st.adj.forEach(function(p){ if(!ok(p)) return; var x=w[p[0]], y=w[p[1]]; if(x && y && !(m[x] && m[x][y])) out.push({kind:"adj",a:p[0],b:p[1]}); });
  return out;
}
function swapSeat(a,x,y){ var p=a[x], q=a[y]; if(q!==undefined) a[x]=q; else delete a[x]; if(p!==undefined) a[y]=p; else delete a[y]; }
/* ⭐守れない組があれば、動かせる席（先に決めた席以外）の中で入れかえて減らす。減らなくなったらやめる */
function repair(a,movable){
  var best=violations(a).length, guard=0;
  while(best>0 && guard<300){
    guard++; var v=violations(a), w=whereIs(a), better=false;
    for(var i=0;i<v.length && !better;i++){
      [v[i].a,v[i].b].forEach(function(who){
        if(better) return; var from=w[who]; if(!from || movable.indexOf(from)<0) return;
        var order=shuffle(movable.slice());
        for(var k=0;k<order.length;k++){ var to=order[k]; if(to===from) continue;
          swapSeat(a,from,to); var n=violations(a).length;
          if(n<best){ best=n; better=true; return; }
          swapSeat(a,from,to); }
      });
    }
    if(!better) break;
  }
  return best;
}
/* ⭐班ごとのかたまり＝通路の左（A・B）・右（C・D）を2席ずつ、前から。いちばん後ろの5席は別のかたまり。補助席はかたまりにしない */
function lanes(){ var s=shape(), Lt=[], Rt=[], back=[], r;
  for(r=1;r<=s.rows;r++){ Lt.push([r+"A",r+"B"]); Rt.push([r+"C",r+"D"]); }
  for(var i=0;i<s.back;i++) back.push((s.rows+1)+["A","B","C","D","E"][i]);
  return [Lt,Rt,[back]]; }
/* ⭐班は「人」に付ける（2026-09-27 本人「基本はさ、先生が振り分けると思うんだよ」「班の設定と位置の移動は必須」「多分修学旅行班ありきの座席のはず」）
   ＝st.hanOf＝{名前: 班の番号}。⭐人を動かすと班の色もいっしょに動く
   班の決め方は3つ＝①の名簿の「班」の列（1・2… か 1班・2班…）／③の一覧で1人ずつ／「班の数」＋「自動で分ける」 */
/* ①の名簿から班を読む。「1班」「班1」の書き方はそのまま。数字だけの列は、同じ数字がくり返す列を班とみなす（出席番号はくり返さない） */
function zen2han(s){ return String(s||"").replace(/[０-９]/g,function(d){ return String.fromCharCode(d.charCodeAt(0)-0xFEE0); }); }
function rosterHan(){
  var lines=st.names.split(/\r?\n/).filter(function(l){ return nameOfLine(l)!==""; });
  var rows=lines.map(function(l){ return String(l).split(/[\t,，]/).map(function(x){ return zen2han(x.replace(/^[\s　]+|[\s　]+$/g,"")); }); });
  var out={}, i, ci;
  rows.forEach(function(cells,i){ var nm=nameOfLine(lines[i]); cells.forEach(function(c){ var m=c.match(/^(\d+)班$/)||c.match(/^班(\d+)$/); if(m && nm) out[nm]=+m[1]; });
    var one=String(lines[i]).match(/[\s　]([0-9０-９]+)班[\s　]*$/); if(one && nm && !out[nm]) out[nm]=+zen2han(one[1]); });
  if(Object.keys(out).length) return out;
  var maxc=0; rows.forEach(function(r){ if(r.length>maxc) maxc=r.length; });
  for(ci=0;ci<maxc;ci++){
    var nums=[]; rows.forEach(function(r){ if(/^\d+$/.test(r[ci]||"")) nums.push(+r[ci]); });
    if(nums.length<2 || nums.length<rows.length*0.8) continue;
    var seen={}, dup=false, mx=0; nums.forEach(function(v){ if(seen[v]) dup=true; seen[v]=1; if(v>mx) mx=v; });
    if(dup && mx>=1 && mx<=20){ rows.forEach(function(r,i){ var nm=nameOfLine(lines[i]); if(nm && /^\d+$/.test(r[ci]||"") && +r[ci]>0) out[nm]=+r[ci]; }); return out; }
  }
  return out;
}
/* 名簿が変わったとき＝名簿に班があればそれを使い、なければ前に決めた班を残す。名簿にいない人の班は外す */
function syncHan(){ var names=nameList(), rh=rosterHan(), out={}; names.forEach(function(n){ if(rh[n]) out[n]=rh[n]; else if(st.hanOf[n]) out[n]=st.hanOf[n]; }); st.hanOf=out; }
function nameOpts(v){ var h='<option value="">名前を選ぶ</option>'; nameList().forEach(function(n){ h+='<option value="'+esc(n)+'"'+(n===v?' selected':'')+'>'+esc(n)+'</option>'; }); return h; }
function hanColor(g){ return HAN_COLORS[(g-1)%HAN_COLORS.length]; }
function refreshCond(){
  [["sep","sepRows"],["adj","adjRows"]].forEach(function(p){
    var ul=$(p[1]); ul.innerHTML="";
    st[p[0]].forEach(function(pr,i){
      var li=document.createElement("li");
      li.innerHTML='<select data-i="'+i+'" data-j="0" aria-label="1人目">'+nameOpts(pr[0])+'</select><span class="bs-and">と</span>'+
        '<select data-i="'+i+'" data-j="1" aria-label="2人目">'+nameOpts(pr[1])+'</select>'+
        '<button type="button" class="mvbtn" data-i="'+i+'" aria-label="消す">×</button>';
      ul.appendChild(li);
    });
  });
  $("hanN").value = st.han>0 ? st.han : "";
  /* ⭐班の一覧＝名前ごとに班を選ぶ。左の線が班の色 */
  var names=nameList(), mx=Math.max(8, st.han|0), h="";
  names.forEach(function(n){ if((st.hanOf[n]|0)>mx) mx=st.hanOf[n]|0; });
  names.forEach(function(n){
    var g=st.hanOf[n]|0, o='<option value="">－</option>';
    for(var k=1;k<=mx;k++) o+='<option value="'+k+'"'+(k===g?' selected':'')+'>'+k+'班</option>';
    h+='<label class="bs-hi"'+(g?' style="--hc:'+hanColor(g)+'"':'')+'><span>'+esc(n)+'</span><select data-n="'+esc(n)+'" aria-label="'+esc(n)+'の班">'+o+'</select></label>';
  });
  $("hanList").innerHTML = h || '<p class="tm-hint">①に名簿を入れると、ここに名前が並びます。</p>';
}
["sep","adj"].forEach(function(t){
  $(t+"Add").addEventListener("click",function(){ if(!nameList().length){ alert("先に①で、名簿を入れてください。"); $("opt1").open=true; return; } st[t].push(["",""]); refreshCond(); });
  $(t+"Rows").addEventListener("change",function(e){ var s=e.target; if(s.tagName!=="SELECT") return; st[t][+s.getAttribute("data-i")][+s.getAttribute("data-j")]=s.value; drawSheet(); screenSave(); });
  $(t+"Rows").addEventListener("click",function(e){ var b=e.target.closest(".mvbtn"); if(!b) return; st[t].splice(+b.getAttribute("data-i"),1); refreshCond(); drawSheet(); screenSave(); });
});
$("hanList").addEventListener("change",function(e){
  var s=e.target; if(s.tagName!=="SELECT") return;
  var n=s.getAttribute("data-n"); if(s.value) st.hanOf[n]=+s.value; else delete st.hanOf[n];
  refreshCond(); drawSheet(); screenSave();
});
$("hanN").addEventListener("input",function(){ var n=this.value===""?0:(this.value|0); if(n>=0){ st.han=Math.min(n,20); screenSave(); } });
function hanMsg(t){ $("hanMsg").textContent=t; }

/* ⭐座席表の班を使う（2026-09-28 本人「バスト新幹線、座席表の班も使えるようにして（班なしは手で設定すればいいよね！？）」）
   ＝座席表メーカーの「記録」に残っている班（recs[].gmem＝班ごとの名前の並び。1つ目が1班）を、名前で合わせて一人ずつ入れる
   ⭐名簿の箱に班は足さない（名簿と座席表の記録は別で、名前で紐づける＝2026-09-27 本人「Accessみたいな感じか。紐づけ」）
   ⚠記録にいない人は班なし＝下の一覧で手で選ぶ */
function seatRecs(){ var out=[];
  loadBox().classes.forEach(function(c){ if(c.kind==="slide") return;
    (c.recs||[]).forEach(function(r,i){ if(r && r.gmem && r.gmem.length) out.push({key:c.id+"|"+i, cid:c.id, label:(c.label||"名簿")+"　"+(r.label||"記録"), gmem:r.gmem}); }); });
  return out; }
function refreshSeatHan(){
  var list=seatRecs(), s=$("seatHanSel"), keep=s.value, pref=$("selSaved").value, def="";
  $("seatHanRow").hidden=!list.length; s.innerHTML="";
  list.forEach(function(x){ var o=document.createElement("option"); o.value=x.key; o.textContent=x.label; s.appendChild(o); if(!def && x.cid===pref) def=x.key; });   // ⭐呼び出した名簿の、いちばん新しい記録を先に選んでおく
  if(keep && list.some(function(x){ return x.key===keep; })) s.value=keep; else if(def) s.value=def;
}
$("seatHanUse").addEventListener("click",function(){
  var key=$("seatHanSel").value, rec=null; seatRecs().forEach(function(x){ if(x.key===key) rec=x; });
  if(!rec){ hanMsg("座席表の記録を選んでください。"); return; }
  var names=nameList(); if(!names.length){ hanMsg("先に①で、名簿を入れてください。"); $("opt1").open=true; return; }
  var norm=function(n){ return String(n||"").replace(/[\s　]/g,""); }, m={}, mx=0;
  rec.gmem.forEach(function(mem,k){ (mem||[]).forEach(function(n){ m[norm(n)]=k+1; }); });
  var got={}, hit=0, miss=[];
  names.forEach(function(n){ var g=m[norm(n)]; if(g){ got[n]=g; hit++; if(g>mx) mx=g; } else miss.push(n); });
  if(!hit){ hanMsg("この記録の班に、①の名簿の人がいませんでした。"); return; }
  if(Object.keys(st.hanOf||{}).length && !confirm("いまの班を、座席表の班に入れかえます。よろしいですか。")) return;
  st.hanOf=got; st.han=Math.min(20,mx); refreshCond(); drawSheet(); screenSave();
  hanMsg("座席表の班を入れました（"+hit+"人）。"+(miss.length ? "班なし＝"+miss.slice(0,5).join("・")+(miss.length>5?" ほか"+(miss.length-5)+"人":"")+"。下の一覧で選んでください。" : "")+"③の並べ方で「班ごと」を選ぶと、班でまとまって座ります。");
});
/* 自動で分ける＝名簿の人を班の数でなるべく同じ人数に。並べ方が名簿の順なら上から、それ以外はランダム */
$("hanAuto").addEventListener("click",function(){
  var n=Math.max(0,Math.min(20,$("hanN").value|0));
  if(!n){ hanMsg("班の数を入れてください。"); return; }
  var ppl=nameList().slice(); if(!ppl.length){ hanMsg("先に①で、名簿を入れてください。"); $("opt1").open=true; return; }
  if(st.hanOf && Object.keys(st.hanOf).length && !confirm("いまの班を、自動で分け直します。よろしいですか。")) return;
  if(st.order!=="list") shuffle(ppl);
  n=Math.min(n,ppl.length);
  var base=Math.floor(ppl.length/n), extra=ppl.length%n, i=0; st.hanOf={};
  for(var g=1;g<=n;g++){ var size=base+(g<=extra?1:0); for(var k=0;k<size;k++) st.hanOf[ppl[i++]]=g; }
  st.han=n; refreshCond(); drawSheet(); screenSave();
  hanMsg("名簿の人を"+n+"つの班に分けました。③の並べ方で「班ごと」を選ぶと、班でまとまって座ります。");
});
$("hanClear").addEventListener("click",function(){
  if(!Object.keys(st.hanOf||{}).length){ hanMsg("班はまだ決まっていません。"); return; }
  if(!confirm("班を全部外します。よろしいですか。")) return;
  st.hanOf={}; refreshCond(); drawSheet(); screenSave(); hanMsg("班を全部外しました。");
});
/* ⭐班ごとに並べる＝席を「かたまり」で数えて、班を1つのかたまりの列に入れる（2026-09-27 本人「私だったら3列に3人にするし」）
   ＝lanes() の列（通路の左・右…）の中で、前から、かたまり単位で班に割り当てる。いちばん余りの少ない列を選ぶ */
/* mode＝"down"＝同じ側を上から1席ずつ続けて埋める（「班ごと」で並べるとき）／mode なし＝前のほうから空いている列（「班でまとめ直す」） */
function placeByHan(assign,groups,mode){
  var idx={}; seatCodes().forEach(function(c,i){ idx[c]=i; });
  var curLane=0;
  var ls=lanes().map(function(l){ return {units:l.map(function(u){ return u.filter(function(c){ return !assign[c]; }); }).filter(function(u){ return u.length; }), pos:0}; });
  /* ⭐"down"＝通路の左（A・B）を上から1席ずつ続けて埋め、次に右（C・D）、最後にいちばん後ろ。班の切れ目で列を空けない＝かぎ型の横に次の班が入ってかみ合う
     （2026-09-27 本人「かぎ型になってるのは違う班と並べてほしい」「バスもそれで」）。班が今の側に入りきらないときだけ、次の側へ移る */
  if(mode==="down"){
    var flat=ls.map(function(ln){ var a=[]; ln.units.forEach(function(u){ a=a.concat(u); }); return {seats:a, pos:0}; }), over2=[];
    groups.forEach(function(g){
      var need=g.length, li=curLane, seats=[];
      while(li<flat.length && flat[li].seats.length-flat[li].pos<need) li++;
      if(li<flat.length){ curLane=li; seats=flat[li].seats.slice(flat[li].pos, flat[li].pos+need); flat[li].pos+=need; }
      else flat.forEach(function(f){ while(f.pos<f.seats.length && seats.length<need) seats.push(f.seats[f.pos++]); });
      g.forEach(function(p,i){ if(i<seats.length) assign[seats[i]]=p; else over2.push(p); });
    });
    return over2;
  }
  var over=[];
  groups.forEach(function(g){
    var need=g.length, best=null;
    ls.forEach(function(ln,i){ var cap=0, k=ln.pos; while(k<ln.units.length && cap<need){ cap+=ln.units[k].length; k++; }
      /* ⭐前のほうから空いている列を先に使う（余りの少なさは、同じ前後のときだけ見る）。⚠余りで選ぶと、前にいた班がいちばん後ろへ行った（2026-09-27 バスで実測） */
      if(cap>=need){ var waste=cap-need, start=idx[ln.units[ln.pos][0]]; if(!best || start<best.start || (start===best.start && waste<best.waste)) best={i:i, waste:waste, end:k, start:start}; } });
    var seats=[];
    if(best){ var ln=ls[best.i]; for(var k=ln.pos;k<best.end;k++) seats=seats.concat(ln.units[k]); ln.pos=best.end; }
    else ls.forEach(function(ln){ while(ln.pos<ln.units.length && seats.length<need){ seats=seats.concat(ln.units[ln.pos]); ln.pos++; } });
    g.forEach(function(p,i){ if(i<seats.length) assign[seats[i]]=p; else over.push(p); });
  });
  return over;
}

/* ⭐席を決める。scroll＝押したときだけ④へ動かす（サンプルでは動かさない＝ページの型 12-a）
   ⭐離す・隣にするがあるときは、守れる並びになるまで入れかえる（ランダムは8回まで引き直して、いちばん守れたものを使う） */
var GO_HINT="①〜③の内容で、④に座席表を作ります。";
function decide(scroll){
  var names=nameList();
  if(!names.length && !st.fixed.some(function(f){ return f.label; })){ $("goMsg").textContent="先に①で、名簿を入れてください。"; $("opt1").open=true; return; }
  var codes=seatCodes();
  if(!codes.length){ $("goMsg").textContent="先に②で、席の形を入れてください。"; $("opt2").open=true; return; }
  var useHan=(st.order==="han");
  if(useHan && !names.some(function(n){ return st.hanOf[n]; })){ $("goMsg").textContent="先に③の「詳しい条件」で、班を決めてください。"; $("opt3").open=true; $("condBox").open=true; return; }
  var best=null, tries=(st.order==="random"||useHan)?8:1;
  for(var t=0;t<tries;t++){
    var assign={}, placed={}, left=0, bad=0;
    st.fixed.forEach(function(f){ if(f.label && codes.indexOf(f.code)>=0 && !assign[f.code]){ assign[f.code]=f.label; placed[f.label]=1; } });
    var rest=names.filter(function(n){ return !placed[n]; });
    if(useHan){
      /* ⭐班ごと＝班の人をかたまりで。班のない人と、入りきらなかった人は、あいた席に前から */
      var gmap={}, loose=[];
      rest.forEach(function(n){ var g=st.hanOf[n]|0; if(g){ (gmap[g]=gmap[g]||[]).push(n); } else loose.push(n); });
      var groups=Object.keys(gmap).sort(function(a,b){ return a-b; }).map(function(k){ return shuffle(gmap[k]); });
      var over=placeByHan(assign,groups,"down");
      var free=codes.filter(function(c){ return !assign[c]; }), tail=shuffle(loose).concat(over);
      tail.forEach(function(p,i){ if(i<free.length) assign[free[i]]=p; });
      left=Math.max(0,tail.length-free.length);
      /* 離す・隣にするは、同じ班の中だけで入れかえて守る（班のかたまりをくずさない） */
      groups.forEach(function(g){ var w=whereIs(assign), seats=g.map(function(p){ return w[p]; }).filter(Boolean); if(seats.length>1) repair(assign,seats); });
      bad=violations(assign).length;
    } else {
      if(st.order==="random") shuffle(rest);
      var free2=codes.filter(function(c){ return !assign[c]; });
      var mine=free2.slice(0,rest.length);
      left=Math.max(0,rest.length-free2.length);
      if(st.order!=="blank") mine.forEach(function(c,i){ assign[c]=rest[i]; });
      bad=(st.order!=="blank") ? repair(assign,mine) : 0;
    }
    if(!best || bad<best.bad) best={assign:assign, bad:bad, left:left};
    if(bad===0) break;
  }
  st.assign=best.assign; sel=null; chipSel=null; regroupUndo=null; $("regroupUndo").hidden=true; $("regroupMsg").textContent="";
  drawSheet(); screenSave();
  $("opt4").open=true;
  var v=violations(st.assign);
  $("goMsg").textContent = best.left>0 ? "席が"+best.left+"人ぶん足りません。②で補助席を使うか、バスの形を変えてください。"
    : v.length ? "⚠ 条件を守れない組が"+v.length+"つあります。④の座席表の上に出ています。"
    : st.order==="blank" ? "④で、席に入っていない人を席に入れてください。" : "④に座席表ができました。";
  if(!scroll) return;
  var top=$("opt4").getBoundingClientRect().top+window.pageYOffset-52;
  if($("opt4").getBoundingClientRect().top>window.innerHeight*0.6) window.scrollTo(0,top);
}
$("goBtn").addEventListener("click",function(){ decide(true); });
/* ===== 班でまとめ直す（2026-09-27 本人「移動しても生きけど今だとぐちゃぐちゃだから、なんとなく近づけてほしい」）
   ⭐押したときだけ。今の位置をなるべく生かす＝前のほうに多く座っている班から前のかたまりへ、班の中も今の前後の順のまま
   ⭐先に決めた席は動かさない。いま席にいない人（「席に入っていない人」）は動かさない
   ⭐押す前の並びを1つだけ覚えて「1つ戻す」で戻せる */
var regroupUndo=null;
function regroup(){
  var codes=seatCodes(), idx={}; codes.forEach(function(c,i){ idx[c]=i; });
  var names=nameList(), cur=st.assign, w=whereIs(cur);
  if(!names.some(function(n){ return st.hanOf[n] && w[n]; })){ $("regroupMsg").textContent="席に座っている人に、班がありません。"; return; }
  var assign={}, keep={};
  st.fixed.forEach(function(f){ if(f.label && cur[f.code]===f.label){ assign[f.code]=f.label; keep[f.label]=1; } });
  var seated=Object.keys(w).filter(function(n){ return !keep[n]; });
  var byPos=function(a,b){ return idx[w[a]]-idx[w[b]]; };
  var gmap={}, loose=[];
  seated.forEach(function(n){ var g=st.hanOf[n]|0; if(g && names.indexOf(n)>=0){ (gmap[g]=gmap[g]||[]).push(n); } else loose.push(n); });
  var groups=Object.keys(gmap).map(function(k){ return gmap[k].sort(byPos); });
  groups.sort(function(a,b){ var ma=0, mb=0; a.forEach(function(n){ ma+=idx[w[n]]; }); b.forEach(function(n){ mb+=idx[w[n]]; }); return ma/a.length-mb/b.length; });
  var over=placeByHan(assign,groups);
  var free=codes.filter(function(c){ return !assign[c]; });
  loose.sort(byPos).concat(over).forEach(function(n,i){ if(i<free.length) assign[free[i]]=n; });
  groups.forEach(function(g){ var ww=whereIs(assign), seats=g.map(function(p){ return ww[p]; }).filter(Boolean); if(seats.length>1) repair(assign,seats); });
  regroupUndo=JSON.parse(JSON.stringify(cur));
  st.assign=assign; sel=null; chipSel=null;
  drawSheet(); screenSave();
  $("regroupUndo").hidden=false;
  $("regroupMsg").textContent="班ごとに寄せました。";
}
$("regroupBtn").addEventListener("click",regroup);
$("regroupUndo").addEventListener("click",function(){
  if(!regroupUndo) return;
  if(!confirm("「班でまとめ直す」を押す前の並びに戻します。そのあとに動かした席も戻ります。よろしいですか。")) return;
  st.assign=regroupUndo; regroupUndo=null; sel=null; chipSel=null;
  drawSheet(); screenSave();
  $("regroupUndo").hidden=true; $("regroupMsg").textContent="まとめ直す前に戻しました。";
});


/* 名簿やバスの形が変わったとき＝無い席・いない人を外す（先に決めた人は名簿になくても残す） */
function pruneAssign(){
  var codes=seatCodes(), names=nameList(), fixedNames={}; st.fixed.forEach(function(f){ if(f.label) fixedNames[f.label]=1; });
  var a={};
  Object.keys(st.assign||{}).forEach(function(c){ var n=st.assign[c]; if(codes.indexOf(c)>=0 && (names.indexOf(n)>=0 || fixedNames[n])) a[c]=n; });
  st.assign=a;
}
function unassigned(){
  var inSeat={}; Object.keys(st.assign).forEach(function(c){ inSeat[st.assign[c]]=1; });
  return nameList().filter(function(n){ return !inSeat[n]; });
}

/* ===== ④ 紙 ===== */
function nameFs(n,w){   // 名前を席の幅（mm）に収める字の大きさ（mm）
  var len=0; for(var i=0;i<n.length;i++) len+= n.charCodeAt(i)<256 ? .62 : 1;
  return Math.max(2, Math.min(3.8, (w-3)/(Math.max(len,1)*1.08)));   // ⭐名前は太字（2026-09-27）＝字の幅が広いぶん1.08で割る
}
function drawSheet(){
  var s=shape(), bus=$("bus"), total=s.rows+1, L=["A","B","C","D","E"];
  /* ⭐1マスの高さは紙から計算（決め打ちしない）。A4たての中身 270mm から、見出し・前・サイト名・すき間を引いて割る */
  var avail=270-12-9-6-6-1.5*(total+1);
  var sh=Math.min(20, Math.floor(avail/total*10)/10);
  bus.style.setProperty("--sh", sh);
  var h='<div class="blank"></div><div class="front door">入口</div><div class="blank"></div><div class="front drv">運転席</div><div class="blank"></div>';
  var hojoN=st.hojo?Math.min(st.hojoN,s.hojoMax):0;
  var vb=pdfing?[]:violations(st.assign), badSet={}, wb=whereIs(st.assign);
  vb.forEach(function(x){ if(wb[x.a]) badSet[wb[x.a]]=1; if(wb[x.b]) badSet[wb[x.b]]=1; });
  function hanOf(c){ var pp=st.assign[c], g=pp?(st.hanOf[pp]|0):0;   /* ⭐班は人に付く */ return g ? {cls:" hg", sty:";--hc:"+HAN_COLORS[(g-1)%HAN_COLORS.length], badge:'<span class="hb">'+g+'班</span>'} : {cls:"", sty:"", badge:""}; }
  function seat(c,extra){
    var n=st.assign[c]||"", w=(c.charAt(0)==="補")?16:34, hg=hanOf(c);
    return '<div class="seat'+(extra||"")+hg.cls+(badSet[c]?" bad":"")+(sel===c?" sel":"")+'" data-c="'+esc(c)+'" style="--fs:'+nameFs(n,w).toFixed(2)+hg.sty+'"><span class="cd">'+esc(codeLabel(c))+'</span>'+hg.badge+(n?'<span class="nm">'+esc(n)+'</span>':'')+'</div>';
  }
  for(var r=1;r<=s.rows;r++){
    h+='<div class="num">'+r+'</div>'+seat(r+"A")+seat(r+"B")+'<div class="aisle">'+(r<=hojoN?seat("補"+r," hojo"):"")+'</div>'+seat(r+"C")+seat(r+"D")+'<div class="num">'+r+'</div>';   // ⭐右にも列の番号（2026-09-27 本人「右側にも座席番号書いて」）
  }
  h+='<div class="num">'+(s.rows+1)+'</div><div class="backrow">';
  for(var i=0;i<s.back;i++) h+=seat((s.rows+1)+L[i]);
  h+='</div><div class="num">'+(s.rows+1)+'</div>';
  bus.innerHTML=h;
  /* ⭐条件を守れていない組＝席に赤い枠・④の中に1行（紙には出さない） */
  var vv=pdfing?[]:violations(st.assign);
  $("condWarn").hidden=!vv.length;
  $("regroupRow").hidden=!nameList().some(function(n){ return st.hanOf[n]; });
  $("condWarn").textContent = vv.length ? "⚠ "+vv.map(function(x){ return (x.kind==="sep"?"離す組「":"隣にする組「")+x.a+"・"+x.b+(x.kind==="sep"?"」が隣です":"」が隣ではありません"); }).join("／") : "";
  /* ⭐号車は見出しの中に「バス座席表（1号車）」（2026-09-27 本人「○号車っていうのは結構大事かも」） */
  $("shTitle").textContent=(st.title?st.title+"　":"")+"バス座席表（"+st.car+"号車）";
  $("shCar").textContent="";
  /* 席に入っていない人 */
  var un=unassigned(), chips=$("chips"); chips.innerHTML="";
  un.forEach(function(n){ var b=document.createElement("button"); b.type="button"; b.className="bs-chip"+(chipSel===n?" on":""); b.textContent=n; b.setAttribute("data-n",n); chips.appendChild(b); });
  $("chipsRow").hidden=un.length===0;
  $("selRow").hidden=sel===null;
  if(sel!==null) $("selLbl").textContent=codeLabel(sel)+"（"+(st.assign[sel]||"空")+"）を選んでいます。もう1つ席を押すと入れかわります。";
  var has=Object.keys(st.assign).length>0;
  $("sheetNote").textContent = has ? "" : "①で名簿を入れて、③の「席を決める」を押すと、座席表ができます。";
  fitSheet();
  fitNames();
}
/* 席を押す＝選ぶ／入れかえる／入れる */
$("bus").addEventListener("click",function(e){
  if(skipClick) return;
  var el=e.target.closest(".seat"); if(!el) return;
  var c=el.getAttribute("data-c");
  if(chipSel!==null){   // 席に入っていない人を、この席へ
    st.assign[c]=chipSel; chipSel=null; sel=null; drawSheet(); screenSave(); return;
  }
  if(sel===null){ sel=c; drawSheet(); return; }
  if(sel===c){ sel=null; drawSheet(); return; }
  var a=st.assign[sel], b=st.assign[c];
  if(b) st.assign[sel]=b; else delete st.assign[sel];
  if(a) st.assign[c]=a; else delete st.assign[c];
  sel=null; drawSheet(); screenSave();
});
/* ===== ドラッグで入れかえる（座席表と同じ動き・2026-09-27 本人「座席表みたいにドラッグで動かせるようにして」） =====
   ⭐マウス＝つかんですぐ動く。指・ペン＝長押し（350ms）で持ち上がる（先に動いたらスクロールにゆずる）
   ⭐押して離しただけなら、今までどおり「押して選ぶ→もう1つ押す」の入れかえ
   ⚠draggable は付けない（ブラウザ標準のドラッグが割り込む）。見た目（.lift .over .drag-ghost）は style.css */
var drag=null, HOLD_MS=350, skipClick=false;
function blockScroll(e){ e.preventDefault(); }
function scrollLock(on){ if(on) document.addEventListener("touchmove",blockScroll,{passive:false}); else document.removeEventListener("touchmove",blockScroll,{passive:false}); }
function seatAt(x,y){ var el=document.elementFromPoint(x,y); while(el && el!==document.body){ if(el.classList && el.classList.contains("seat") && el.closest("#bus")) return el; el=el.parentElement; } return null; }
function lift(x,y){
  var el=drag.el, r=el.getBoundingClientRect(), nm=el.querySelector(".nm");
  var gh=document.createElement("div"); gh.className="drag-ghost";
  gh.style.width=r.width+"px"; gh.style.height=r.height+"px"; gh.style.left=r.left+"px"; gh.style.top=r.top+"px";
  if(nm){ gh.textContent=nm.textContent; gh.style.fontSize=(parseFloat(getComputedStyle(nm).fontSize)*(r.width/el.offsetWidth||1))+"px"; gh.style.whiteSpace="nowrap"; }
  document.body.appendChild(gh);
  drag.ghost=gh; drag.dx=x-r.left; drag.dy=y-r.top; drag.active=true; el.classList.add("lift");
}
function dropDrag(){
  if(!drag) return;
  if(drag.timer) clearTimeout(drag.timer);
  scrollLock(false);
  var d=drag.el; d.removeEventListener("pointermove",dragMove); d.removeEventListener("pointerup",dragEnd); d.removeEventListener("pointercancel",dragEnd);
  try{ d.releasePointerCapture(drag.id); }catch(err){}
  drag=null;
}
function dragStart(e){
  var d=e.target.closest(".seat"); if(!d) return;
  if(e.pointerType==="mouse" && e.button!==0) return;
  if(drag) dropDrag();
  var byMouse=(e.pointerType==="mouse");
  drag={el:d, from:d.getAttribute("data-c"), id:e.pointerId, x0:e.clientX, y0:e.clientY, active:false, ghost:null, over:null, ready:byMouse, timer:null};
  d.addEventListener("pointermove",dragMove); d.addEventListener("pointerup",dragEnd); d.addEventListener("pointercancel",dragEnd);
  if(byMouse){ try{ d.setPointerCapture(e.pointerId); }catch(err){} return; }
  drag.timer=setTimeout(function(){
    if(!drag) return;
    drag.timer=null; drag.ready=true;
    try{ drag.el.setPointerCapture(drag.id); }catch(err){}
    scrollLock(true); lift(drag.x0,drag.y0);
    try{ if(navigator.vibrate) navigator.vibrate(12); }catch(err){}
  },HOLD_MS);
}
function dragMove(e){
  if(!drag) return;
  if(!drag.active){
    var far=Math.abs(e.clientX-drag.x0)+Math.abs(e.clientY-drag.y0);
    if(!drag.ready){ if(far>10) dropDrag(); return; }
    if(far<6) return;
    lift(drag.x0,drag.y0);
  }
  e.preventDefault();
  drag.ghost.style.left=(e.clientX-drag.dx)+"px"; drag.ghost.style.top=(e.clientY-drag.dy)+"px";
  var t=seatAt(e.clientX,e.clientY); if(t===drag.el) t=null;
  if(t!==drag.over){ if(drag.over) drag.over.classList.remove("over"); drag.over=t; if(t) t.classList.add("over"); }
}
function dragEnd(){
  if(!drag) return;
  if(drag.timer){ clearTimeout(drag.timer); drag.timer=null; }
  scrollLock(false);
  var d=drag.el; d.removeEventListener("pointermove",dragMove); d.removeEventListener("pointerup",dragEnd); d.removeEventListener("pointercancel",dragEnd);
  try{ d.releasePointerCapture(drag.id); }catch(err){}
  if(!drag.active){ drag=null; return; }
  skipClick=true; setTimeout(function(){ skipClick=false; },400);   // 動かしたあとの click で「選ぶ」にならないように
  var target=drag.over, gh=drag.ghost, from=drag.from;
  if(target) target.classList.remove("over");
  var to=target?target.getAttribute("data-c"):from;
  var rect=(target||d).getBoundingClientRect();
  gh.classList.add("snap"); gh.style.left=rect.left+"px"; gh.style.top=rect.top+"px";
  setTimeout(function(){
    if(gh.parentNode) gh.parentNode.removeChild(gh);
    d.classList.remove("lift");
    if(to!==from){
      var a=st.assign[from], b=st.assign[to];
      if(b) st.assign[from]=b; else delete st.assign[from];
      if(a) st.assign[to]=a; else delete st.assign[to];
      sel=null; chipSel=null; screenSave();
    }
    drawSheet();
  },140);
  drag=null;
}
$("bus").addEventListener("pointerdown",dragStart);
$("bus").addEventListener("dragstart",function(e){ e.preventDefault(); });
$("bus").addEventListener("contextmenu",function(e){ if(drag) e.preventDefault(); });

$("chips").addEventListener("click",function(e){
  var b=e.target.closest(".bs-chip"); if(!b) return;
  var n=b.getAttribute("data-n"); chipSel=(chipSel===n)?null:n; sel=null; drawSheet();
});
$("emptyBtn").addEventListener("click",function(){ if(sel!==null){ delete st.assign[sel]; sel=null; drawSheet(); screenSave(); } });
$("unselBtn").addEventListener("click",function(){ sel=null; chipSel=null; drawSheet(); });
$("title").addEventListener("input",function(){ st.title=this.value; drawSheet(); screenSave(); });
$("car").addEventListener("input",function(){ var n=this.value|0; if(n>=1){ st.car=n; drawSheet(); screenSave(); } });

/* ⭐描いたあとに測って、はみ出す名前だけ縮める（2026-09-27 名前を太字にしたとき）。
   ⚠紙が見えていないときは幅が0なので測らない（ページの型 16-b「かくしているあいだは測らない」） */
function fitNames(){
  [].forEach.call(document.querySelectorAll("#bus .seat .nm"),function(n){
    var seat=n.parentNode, room=seat.clientWidth-2;
    if(room<10) return;
    var fs=parseFloat(seat.style.getPropertyValue("--fs"))||3.6, k=0;
    while(n.scrollWidth>room && fs>1.6 && k<30){ fs=fs*0.95; seat.style.setProperty("--fs",fs.toFixed(2)); k++; }
  });
}
/* ⭐紙は「1mm＝3.2点」で作り、画面に入らなければまるごと縮める（ページの型 16-b・座席表と同じ考え方） */
function fitSheet(){
  var box=$("sheetBox"), sh=$("sheet"); if(!box||!sh) return;
  var room=box.clientWidth; if(!room||room<200) return;   // ⚠親の clientWidth は padding をふくむので、紙がはみ出す（2026-09-27 スマホ幅で実測）
  var K=3.2, w=210*K, h=294*K;
  /* ⭐高さで縮めない＝横幅いっぱい（2026-09-27 本人「マスが小さくて読みにくい」）。紙の下はスクロールで見る */
  var scale=Math.min(1, room/w);
  sh.style.width=Math.round(w)+"px"; sh.style.height=Math.round(h)+"px";
  sh.style.setProperty("--pxmm",K);
  sh.style.transformOrigin="top left";
  sh.style.transform=scale<1?"scale("+scale+")":"";
  box.style.height=scale<1?Math.ceil(h*scale)+"px":"";
}
window.addEventListener("resize",fitSheet);
$("opt4").addEventListener("toggle",function(){ if(this.open){ fitSheet(); fitNames(); } });

/* PDF＝画面の紙をそのまま測って写す（paper-pdf.js） */
$("doPdf").addEventListener("click",function(){
  if(!window.PAPER_PDF){ alert("PDFの部品を読み込めませんでした。"); return; }
  var btn=this, label=btn.textContent, keepSel=sel; sel=null; chipSel=null; pdfing=true; drawSheet();   // ⭐赤い枠は紙に出さない
  var name=((st.title||"")+"バス座席表"+st.car+"号車").replace(/\s/g,"");
  btn.disabled=true; btn.textContent="PDFを作っています…";
  window.PAPER_PDF.save($("sheet"),{landscape:false,name:name})
    .then(function(){ pdfing=false; btn.disabled=false; btn.textContent=label; sel=keepSel; drawSheet(); })
    .catch(function(e){ pdfing=false; btn.disabled=false; btn.textContent=label; drawSheet(); alert("PDFを作れませんでした。"+(e&&e.message?("　"+e.message):"")); });
});

/* ===== 画面の保存（チェックを入れたときだけ・ページの型 3） ===== */
var KEY="sakura-bus", sampleOn=false, stash=null;
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
  st.rows=Math.max(3,Math.min(14,s.rows|0||10)); $("rowsN").value=st.rows;
  st.back=(s.back===4)?4:5; $("backN").value=st.back;
  st.hojo=!!s.hojo; $("hojo").checked=st.hojo; $("hojoRow").hidden=!st.hojo;
  st.hojoN=Math.max(1,s.hojoN|0||8); $("hojoN").value=st.hojoN;
  setType(s.type);
  setOrder(s.order);
  st.fixed=Array.isArray(s.fixed)?s.fixed.map(function(f){ return {label:String(f.label||""), code:String(f.code||"1A")}; }):[];
  st.title=String(s.title||""); $("title").value=st.title;
  st.car=Math.max(1,s.car|0||1); $("car").value=st.car;
  st.assign=(s.assign&&typeof s.assign==="object")?s.assign:{};
  var pairs=function(x){ return Array.isArray(x)?x.map(function(p){ return [String((p&&p[0])||""),String((p&&p[1])||"")]; }):[]; };
  st.sep=pairs(s.sep); st.adj=pairs(s.adj); st.han=Math.max(0,Math.min(20,s.han|0)); st.hanOf=(s.hanOf&&typeof s.hanOf==="object")?s.hanOf:{}; syncHan();
  sel=null; chipSel=null;
  countNames(); refreshDatalist(); pruneAssign(); refreshFix(); refreshCond(); drawSheet();
}
function screenLoad(){
  try{
    var s=JSON.parse(localStorage.getItem(KEY)||"null"); if(!s) return false;
    $("save").checked=true; applyData(s); return true;
  }catch(e){ return false; }
}

/* ===== サンプル（ページの型 12-a）＝押したときだけ・本物の欄に入れる・消すと前に戻す・保存しない ===== */
function sampleIn(s,msg,partial){
  if(!sampleOn){ stash=JSON.parse(JSON.stringify(st)); }
  sampleOn=true; applyData(s);
  decide(false);   // ⭐押したら席まで入った状態にする（2026-09-27 本人「サンプルは、サンプルボタンを押したときに入ってる状態にしたい」）
  if(!/足りません/.test($("goMsg").textContent)) $("goMsg").textContent="④にサンプルの座席ができました。";   // ⭐サンプルだと分かる言い方（本人）
  /* ⭐サンプル②＝作成途中（2026-09-27 本人「作成途中みたいにしたらいいんじゃないの？」「サンプルは使い方を知るっていう意味だから」）
     ＝ランダムで入れてから、先に決めた人以外を4人だけ「席に入っていない人」に戻す */
  if(partial){
    var fixedNames={}; st.fixed.forEach(function(f){ if(f.label) fixedNames[f.label]=1; });
    var ks=Object.keys(st.assign).filter(function(k){ return !fixedNames[st.assign[k]]; });
    for(var i=0;i<4 && ks.length;i++){ var j=rnd(ks.length); delete st.assign[ks[j]]; ks.splice(j,1); }
    drawSheet();
    $("goMsg").textContent="④の「席に入っていない人」を押して、空いている席を押すと入ります。";
  }
  $("sheet").classList.add("sample");
  $("sampleClear").hidden=false; $("sampleClear2Row").hidden=false; $("opt1").open=true; $("opt2").open=true; $("opt3").open=true;
  $("sampleMsg").textContent=msg; setTimeout(function(){ $("sampleMsg").textContent=""; },3500);
}
$("sample1Btn").addEventListener("click",function(){
  sampleIn({names:SAMPLE_NAMES.map(function(n,i){ return n+"\t"+(Math.floor(i/5)+1); }).join("\n"), type:"45", order:"han", fixed:[{label:"山田先生",code:"1B"},{label:"おおの ゆず",code:"1C"},{label:"たなか りく",code:"1D"}], title:"1年3組", car:1, assign:{}},"名簿に班（1〜7班）が入っているので、班ごとに並べました");
});
$("sample2Btn").addEventListener("click",function(){
  sampleIn({names:SAMPLE_NAMES.join("\n"), type:"45", order:"random", fixed:[{label:"山田先生",code:"1B"},{label:"おおの ゆず",code:"1C"},{label:"たなか りく",code:"1D"}], title:"1年3組", car:1, assign:{}},"作成途中の形です。4人が席に入っていません",true);
});
$("sampleClear2").addEventListener("click",function(){ $("sampleClear").click(); });   // ④の中のもう1つ＝上と同じ動き
$("sampleClear").addEventListener("click",function(){
  if(stash) applyData(stash);
  sampleOn=false; stash=null;
  $("sheet").classList.remove("sample"); $("goMsg").textContent=GO_HINT;
  $("sampleClear").hidden=true; $("sampleClear2Row").hidden=true; $("sampleMsg").textContent="サンプルを消しました";
  setTimeout(function(){ $("sampleMsg").textContent=""; },3000);
});

/* ===== 名簿の箱（座席表・席次表・簡単スライドと共通）＝ページの型 4-b ===== */
var KEYC="sakura-tools-rosters-v1", MAXC=20;
function loadBox(){ try{ var d=JSON.parse(localStorage.getItem(KEYC)||"null"); if(d && d.classes) return d; }catch(e){} return {v:2,classes:[]}; }
function writeBox(d){ try{ localStorage.setItem(KEYC, JSON.stringify(d)); return true; }catch(e){ return false; } }
function rosters(){ return loadBox().classes.filter(function(c){ return c.kind!=="slide"; }); }
function refreshBox(keepId){
  var list=rosters();
  [["clsSel",""],["selSaved","－"]].forEach(function(p){
    var s=$(p[0]), keep=(keepId!=null)?keepId:s.value;
    s.innerHTML=p[1]?'<option value="">'+p[1]+'</option>':"";
    list.forEach(function(c){ var o=document.createElement("option"); o.value=c.id; o.textContent=c.label||"名簿"; s.appendChild(o); });
    if(keep && list.some(function(c){ return c.id===keep; })) s.value=keep;
  });
  $("recallRow").hidden=list.length===0;
  $("saveCount").textContent=list.length+"/"+MAXC;
  refreshSeatHan();
}
function findCls(id){ var d=loadBox(); for(var i=0;i<d.classes.length;i++) if(d.classes[i].id===id) return d.classes[i]; return null; }
$("clsLoad").addEventListener("click",function(){
  var c=findCls($("clsSel").value); if(!c){ alert("保存済の名簿を選んでください。"); return; }
  $("names").value=String(c.names||"").split("\n").filter(function(l){ return nameOfLine(l)!==""; }).join("\n");   // ⭐元の行のまま（班の列も読めるように）
  st.names=$("names").value; afterNames();
  $("selSaved").value=c.id; refreshSeatHan();
});
function saveMsg(t){ $("saveMsg").textContent=t; }
/* ⭐名簿の箱に残すのは「出席番号・名前・男女」。班は外す（2026-09-27 本人「共有して使うのは、出席番号、名前、男女。班は臨機応変…不要なときは保存しない」）
   ＝貼った行から「1班」「班1」の欄と、数字だけで同じ数字がくり返す列（＝班の列）を外して、あとはそのまま残す */
function saveLines(){
  var lines=st.names.split(/\r?\n/).filter(function(l){ return nameOfLine(l)!==""; });
  var z=function(s){ return String(s||"").replace(/[０-９]/g,function(d){ return String.fromCharCode(d.charCodeAt(0)-0xFEE0); }).replace(/^[\s　]+|[\s　]+$/g,""); };
  var rows=lines.map(function(l){ return String(l).split(/[\t,，]/); });
  var drop=-1, maxc=0; rows.forEach(function(r){ if(r.length>maxc) maxc=r.length; });
  for(var ci=0; ci<maxc && drop<0; ci++){
    var nums=[]; rows.forEach(function(r){ var v=z(r[ci]); if(/^\d+$/.test(v)) nums.push(+v); });
    if(nums.length<2 || nums.length<rows.length*0.8) continue;
    var seen={}, dup=false, mx=0; nums.forEach(function(v){ if(seen[v]) dup=true; seen[v]=1; if(v>mx) mx=v; });
    if(dup && mx<=20) drop=ci;
  }
  var isHan=function(c){ return /^(?:\d+班|班\d+)$/.test(z(c)); };
  return lines.map(function(l,i){
    var cells=rows[i];
    if(cells.length===1) return String(l).replace(/[\s　]+(?:[0-9０-９]+班|班[0-9０-９]+)[\s　]*$/,"");
    return cells.filter(function(c,ci){ return ci!==drop && !isHan(c); }).join("\t");
  });
}
/* ⚠上書きのとき、元の行（出席番号・男女など）を壊さない＝名前だけの行は、同じ名前の元の行をそのまま使う */
function mergeLines(oldText,lines){
  var byName={};
  String(oldText||"").split("\n").forEach(function(l){ var n=nameOfLine(l); if(n && !byName[n]) byName[n]=l; });
  return lines.map(function(l){
    var n=nameOfLine(l), onlyName=String(l).split(/[\t,，]/).filter(function(x){ return x.replace(/[\s　]/g,""); }).length<=1;
    return (onlyName && byName[n]) ? byName[n] : l;
  }).join("\n");
}
$("saveNew").addEventListener("click",function(){
  if(!nameList().length){ saveMsg("保存できるのは①の名簿です。①に名前を入れてください。"); return; }
  var name=prompt("名簿の名前を入れてください（例：1年3組）",""); if(name===null) return; name=name.trim(); if(!name) return;
  var d=loadBox(), same=null;
  d.classes.forEach(function(c){ if(c.kind!=="slide" && c.label===name) same=c; });
  if(same){
    if(!confirm("「"+name+"」はもう保存されています。今の名簿に差し替えますか？")) return;
    same.names=mergeLines(same.names,saveLines()); writeBox(d); refreshBox(same.id); saveMsg("「"+name+"」を差し替えました。"); return;
  }
  if(rosters().length>=MAXC){ saveMsg("名簿の保存は"+MAXC+"件までです。いらないものを削除してください。"); return; }
  var it={id:"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), label:name, names:saveLines().join("\n"), seat:null, seki:null, recs:[]};
  d.classes.push(it); if(!writeBox(d)){ saveMsg("保存できませんでした。"); return; }
  refreshBox(it.id); saveMsg("「"+name+"」を保存しました。");
});
$("saveOver").addEventListener("click",function(){
  var c=findCls($("selSaved").value);
  if(!c){ saveMsg("上書きする名簿を「保存済の名簿」で選んでください。"); return; }
  if(!nameList().length){ saveMsg("上書きできるのは①の名簿です。"); return; }
  if(!confirm(window.SAKURA_ROSTER?SAKURA_ROSTER.overMsg(c.label):"「"+c.label+"」を今の名簿で上書きしますか？")) return;   // ⭐文は roster-tools.js がそろえる（2026-09-27）
  var d=loadBox(); d.classes.forEach(function(x){ if(x.id===c.id) x.names=mergeLines(x.names,saveLines()); });
  writeBox(d); refreshBox(c.id); saveMsg("「"+c.label+"」に上書きしました。");
});
$("saveDel").addEventListener("click",function(){
  var c=findCls($("selSaved").value);
  if(!c){ saveMsg("削除する名簿を「保存済の名簿」で選んでください。"); return; }
  if(!confirm(window.SAKURA_ROSTER?SAKURA_ROSTER.delMsg(c.label):"「"+c.label+"」を消します。よろしいですか。")) return;   // ⭐文は roster-tools.js がそろえる（2026-09-27）
  var d=loadBox(); d.classes=d.classes.filter(function(x){ return x.id!==c.id; }); writeBox(d);
  refreshBox(""); saveMsg("「"+c.label+"」を削除しました。");
});

/* 「？」の開け閉め（長いものは tip.js がポップアップにする） */
document.addEventListener("click",function(e){
  var b=e.target.closest(".tip-btn"); if(!b) return;
  var host=b.closest("h2,summary,p,label"), body=host && host.nextElementSibling;
  if(!body || !body.classList.contains("tip-body")) return;
  e.preventDefault(); body.hidden=!body.hidden; b.setAttribute("aria-expanded", body.hidden?"false":"true");
});

/* ===== はじめ ===== */
refreshBox("");
if(!screenLoad()){ setType("45"); setOrder("random"); countNames(); refreshFix(); refreshCond(); drawSheet(); }
})();
