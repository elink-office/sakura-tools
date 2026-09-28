/* 新幹線の座席表メーカー（2026-09-27 作成中）
   ⭐決めたこと（決定ログ 2026-09-27）
     対象＝修学旅行（団体で号車と列がまとまって取れる）。1つの号車を1枚（A4たて）。号車が分かれたら号車ごとに作る
     車両＝普通車（A・B・C｜D・E）／グリーン車（A・B｜C・D）。列の範囲は2つまで（「1〜5列と12〜14列」）
     席の決め方＝名簿の順／ランダム／空のまま ＋ 先に決める席（名簿にない人も打てる）
     席の入れかえ＝席を2つ押す。「席に入っていない人」を押してから席を押すと入る
     名簿は座席表と共通の箱（sakura-tools-rosters-v1）。並べた席は「画面の保存」にだけ残る
   ⚠バスの座席表（bus.js）とは別の仕組み。共通にしない（本人） */
(function(){
"use strict";
function $(id){ return document.getElementById(id); }
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function rnd(n){ try{ var a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; }catch(e){ return Math.floor(Math.random()*n); } }

var SAMPLE_NAMES=["あいざわ ゆい","いしかわ はる","いのうえ そうた","うえだ りこ","えんどう はると","おおの ゆず","おかだ みお","かとう ゆうと","きむら あおい",
  "くどう れん","こばやし ひなた","さいとう けんた","しみず さら","すずき だいち","せきぐち ほのか","たかはし りん","たなか りく","ちば かえで",
  "つじ こうき","なかむら めい","にしだ しょう","のむら あかり","はせがわ そうま","はやし たくみ","ひらの ゆな","ふじい かいと","ほんだ ことね",
  "まつもと ゆうき","みやざき いろは","むらかみ そら","もりた つばさ","やまぐち ゆうな","やまだ まな","よしだ ひろと","わたなべ すず"];
var MAXROW=20;

/* ===== いまの中身 ===== */
var st={names:"", kind:"std", car:5, from:1, to:8, rs:false, fromS:12, toS:14, r2:false, car2:6, from2:1, to2:3, up:"none", order:"random", fixed:[], title:"", assign:{}, sep:[], adj:[], han:0, hanOf:{}};
/* ⭐席の記号は「号車-列+席」（例 5-1A）。号車がまたがっても重ならない（2026-09-27 本人「新幹線の場合は、号車が離れることもあるよね」→ A） */
var sel=null, chipSel=null;

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

/* ===== 車両と列 → 席の記号の並び（若い列の A から） ===== */
function letters(){ return st.kind==="green" ? ["A","B","C","D"] : ["A","B","C","D","E"]; }
function leftCount(){ return st.kind==="green" ? 2 : 3; }
function multiCar(){ return st.r2 && st.car2!==st.car; }
function cars(){ return multiCar() ? [st.car, st.car2] : [st.car]; }
/* ⭐まとまりは3つ（2026-09-27 本人「2つ目の範囲という書き方がいいのか？3つ目を号車が違うにしたいな」）
     号車と列（いつも）／同じ号車で、列が飛ぶとき（rs）／号車がちがうとき（r2）
   ⭐同じ号車の続き＝ただの空白（gap）。号車がかわる＝空白を多めにとって線、線の下に「6号車」（carBreak） */
function rowList(){
  var a=[], r;
  function has(car,r){ return a.some(function(x){ return !x.gap && !x.carBreak && x.car===car && x.r===r; }); }
  var f1=Math.min(st.from,st.to), t1=Math.max(st.from,st.to);
  for(r=f1;r<=t1;r++) a.push({car:st.car, r:r});
  if(st.rs){
    var fs=Math.min(st.fromS,st.toS), ts=Math.max(st.fromS,st.toS), first=true;
    for(r=fs;r<=ts;r++) if(!has(st.car,r)){ if(first && a.length){ a.push({gap:true}); } first=false; a.push({car:st.car, r:r}); }
  }
  if(st.r2){
    var f2=Math.min(st.from2,st.to2), t2=Math.max(st.from2,st.to2), first2=true;
    for(r=f2;r<=t2;r++) if(!has(st.car2,r)){
      if(first2 && a.length) a.push(multiCar() ? {carBreak:true, car:st.car2} : {gap:true});
      first2=false; a.push({car:st.car2, r:r});
    }
  }
  return a;
}
function seatCodes(){
  var a=[], L=letters();
  rowList().forEach(function(x){ if(x.gap || x.carBreak) return; L.forEach(function(l){ a.push(x.car+"-"+x.r+l); }); });   // ⚠号車の境目の行は席ではない
  return a;
}
/* ⭐「隣」の組＝同じ列の A・B／B・C／D・E（グリーン車は A・B／C・D）。通路をはさむ C・D と前後は隣にしない（2026-09-27） */
function pairsOf(){ var out=[], pr=(st.kind==="green")?[["A","B"],["C","D"]]:[["A","B"],["B","C"],["D","E"]];
  rowList().forEach(function(x){ if(x.gap||x.carBreak) return; pr.forEach(function(p){ out.push([x.car+"-"+x.r+p[0], x.car+"-"+x.r+p[1]]); }); });
  return out; }
function shortCode(c){ return String(c).replace(/^\d+-/,""); }                                   // 5-1A → 1A（席の中）
function codeLabel(c){ var m=String(c).match(/^(\d+)-(.+)$/); if(!m) return c; return multiCar() ? m[1]+"号車 "+m[2] : m[2]; }   // 選ぶ欄・知らせ
/* ⭐座席表の上は何号車側か（2026-09-27 本人「上がどっち方面（4号車なのか6号車なのか）書きたい。選択式でいい」） */
function sideCars(){ var c=cars(), lo=Math.min.apply(null,c)-1, hi=Math.max.apply(null,c)+1; return {lo:lo>=1?lo:0, hi:hi<=20?hi:0}; }
function refreshUp(){
  var s=sideCars(), sel=$("upSel"), keep=st.up, h='<option value="none">書かない</option>';
  if(s.lo) h+='<option value="lo">'+s.lo+'号車側</option>';
  if(s.hi) h+='<option value="hi">'+s.hi+'号車側</option>';
  sel.innerHTML=h;
  if((keep==="lo"&&!s.lo)||(keep==="hi"&&!s.hi)) keep="none";
  st.up=keep; sel.value=keep;
}

/* ===== ① 名簿 ===== */
function countNames(){ $("nameCount").textContent=nameList().length+"人"; }
function refreshDatalist(){
  var dl=$("nameList"); dl.innerHTML="";
  nameList().forEach(function(n){ var o=document.createElement("option"); o.value=n; dl.appendChild(o); });
}
$("names").addEventListener("input",function(){ st.names=this.value; afterNames(); });
$("namesClear").addEventListener("click",function(){ $("names").value=""; st.names=""; afterNames(); });
function afterNames(){ countNames(); refreshDatalist(); pruneAssign(); syncHan(); refreshCond(); drawSheet(); screenSave(); }

/* ===== ② 号車と列 ===== */
function segSet(id,val){
  Array.prototype.forEach.call($(id).querySelectorAll("button"),function(b){
    var on=b.getAttribute("data-v")===String(val); b.classList.toggle("on",on); b.setAttribute("aria-checked",on?"true":"false");
  });
}
function setKind(v){
  st.kind=(v==="green")?"green":"std"; segSet("segCar",st.kind);
  $("carHint").textContent = st.kind==="green" ? "1列に A・B・C・D の4席。A と D が窓側です。" : "1列に A・B・C・D・E の5席。A と E が窓側、B がまん中です。";
}
function seatHint(){
  var n=seatCodes().length, p=nameList().length;
  $("seatHint").textContent = n ? "席は"+n+"席です。"+(p?"名簿は"+p+"人です。"+(p>n?"⚠"+(p-n)+"人ぶん足りません。":""):"") : "";
}
$("segCar").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; setKind(b.getAttribute("data-v")); afterShape(); });
function numIn(id,key,min,max){
  $(id).addEventListener("input",function(){ var n=this.value|0; if(n>=min&&n<=max){ st[key]=n; afterShape(); } });
}
numIn("car","car",1,20); numIn("rowFrom","from",1,MAXROW); numIn("rowTo","to",1,MAXROW); numIn("rowFromS","fromS",1,MAXROW); numIn("rowToS","toS",1,MAXROW); numIn("car2","car2",1,20); numIn("rowFrom2","from2",1,MAXROW); numIn("rowTo2","to2",1,MAXROW);
$("upSel").addEventListener("change",function(){ st.up=this.value; drawSheet(); screenSave(); });
$("rangeS").addEventListener("change",function(){ st.rs=this.checked; $("rangeSRow").hidden=!st.rs; afterShape(); });
$("range2").addEventListener("change",function(){ st.r2=this.checked; $("range2Row").hidden=!st.r2; afterShape(); });
function afterShape(){ refreshUp(); pruneAssign(); refreshFix(); seatHint(); drawSheet(); screenSave(); }

/* ===== ③ 席の決め方 ===== */
function setOrder(v){
  st.order=(v==="random"||v==="blank"||v==="han")?v:"list"; segSet("segOrder",st.order);
  $("orderHint").textContent = st.order==="han" ? "同じ班の人を、かたまりで座らせます。3席側（A・B・C）は1列ずつ、2席側（D・E）は2席ずつ、前から班ごとに入ります。班は「詳しい条件」で決めます。"
    : st.order==="random" ? "先に決める席を入れてから、残りの人をくじ引きで、若い列の A から入れます。"
    : st.order==="blank" ? "先に決める席だけ入れて、あとは空のままです。④で「席に入っていない人」を押して、席を押すと入ります。"
    : "先に決める席を入れてから、残りの人を名簿の順に、若い列の A から入れます。";
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
  var codes=seatCodes(); if(!codes.length){ alert("先に②で、列を入れてください。"); return; }
  var used={}; st.fixed.forEach(function(f){ used[f.code]=1; });
  var c=codes.filter(function(x){ return !used[x]; })[0]||codes[0];
  st.fixed.push({label:"", code:c}); refreshFix();
  var last=$("fixRows").querySelector("li:last-child input"); if(last) last.focus();
});
$("fixRows").addEventListener("input",function(e){
  var t=e.target, i=+t.getAttribute("data-i");
  if(t.getAttribute("data-k")==="fl"){ st.fixed[i].label=t.value.trim(); screenSave(); }
});
$("fixRows").addEventListener("change",function(e){
  var t=e.target, i=+t.getAttribute("data-i");
  if(t.getAttribute("data-k")==="fc"){ var c=t.value; st.fixed.forEach(function(f,j){ if(j!==i && f.code===c) f.code=st.fixed[i].code; }); st.fixed[i].code=c; refreshFix(); screenSave(); }
});
$("fixRows").addEventListener("click",function(e){
  var b=e.target.closest(".mvbtn"); if(!b) return;
  st.fixed.splice(+b.getAttribute("data-i"),1); refreshFix(); screenSave();
});

/* ===== 詳しい条件（離す・隣にする・班）＝2026-09-27 本人「隣とかの条件を入れよう」「班の仕組み…色分けしたほうがわかりやすいし、使わないなら使わなくていい」→ 班は A（班の数だけ入れて自動で分ける）
   ⭐「隣」＝pairsOf() の組だけ（前後・ななめは隣にしない）
   ⭐班＝席のかたまり。名簿の人の席を前から順に「班の数」で分けて、席を班の色でうすく塗る＋右上に「1班」。⭐班は席に付く（入れかえても色は席に残る）
   ⭐手で入れかえて条件を破っても止めない。席に赤い枠、④の中に1行（紙には出さない）
   ⚠バスの座席表（bus.js） とは別の仕組み（本人「流用しないほうがいい」）。同じ考え方で、このファイルの中だけで書いている */
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
/* ⭐班ごとのかたまり＝3席側（A・B・C）は1列ずつ、2席側（D・E）は1列2席ずつ、前から（グリーン車は A・B／C・D）
   （2026-09-27 本人「私だったら3列に3人にするし」） */
function lanes(){ var Lt=[], Rt=[], green=(st.kind==="green");
  rowList().forEach(function(x){ if(x.gap||x.carBreak) return; var p=x.car+"-"+x.r;
    if(green){ Lt.push([p+"A",p+"B"]); Rt.push([p+"C",p+"D"]); } else { Lt.push([p+"A",p+"B",p+"C"]); Rt.push([p+"D",p+"E"]); } });
  return [Lt,Rt]; }
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
      li.innerHTML='<select data-i="'+i+'" data-j="0" aria-label="1人目">'+nameOpts(pr[0])+'</select><span class="sk-and">と</span>'+
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
    h+='<label class="sk-hi"'+(g?' style="--hc:'+hanColor(g)+'"':'')+'><span>'+esc(n)+'</span><select data-n="'+esc(n)+'" aria-label="'+esc(n)+'の班">'+o+'</select></label>';
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
/* mode＝"down"＝同じ側の列を上から下へ順に埋める（「班ごと」で並べるとき・2026-09-27 本人「横に1班2班にしてるんだけど、縦にして。似たような色が並んでしまってる」）
   mode なし＝前のほうから空いている列（「班でまとめ直す」＝今の位置を生かす） */
function placeByHan(assign,groups,mode){
  var idx={}; seatCodes().forEach(function(c,i){ idx[c]=i; });
  var curLane=0;
  var ls=lanes().map(function(l){ return {units:l.map(function(u){ return u.filter(function(c){ return !assign[c]; }); }).filter(function(u){ return u.length; }), pos:0}; });
  /* ⭐"down"＝同じ側を上から1席ずつ続けて埋める。班の切れ目で列を空けない＝5人班のかぎ型の横に、次の班が入ってかみ合う
     （2026-09-27 本人「かぎ型になってるのは違う班と並べてほしい」）。班が今の側に入りきらないときだけ、次の側へ移る */
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
    if(mode==="down"){
      for(var li=curLane; li<ls.length && !best; li++){ var ln0=ls[li], cap0=0, k0=ln0.pos; while(k0<ln0.units.length && cap0<need){ cap0+=ln0.units[k0].length; k0++; }
        if(cap0>=need){ best={i:li, end:k0}; curLane=li; } }
    }
    if(!best) ls.forEach(function(ln,i){ var cap=0, k=ln.pos; while(k<ln.units.length && cap<need){ cap+=ln.units[k].length; k++; }
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
  $("goMsg").textContent = best.left>0 ? "席が"+best.left+"人ぶん足りません。②の列の範囲を確かめてください。"
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
var SW=29, AW=14, NW=7;   // 席の幅・通路の幅・番号の幅（mm）。⚠右にも番号を足したので席を30→29（紙の中186mmに収める）
function nameFs(n,w,sh){
  var len=0; for(var i=0;i<n.length;i++) len+= n.charCodeAt(i)<256 ? .62 : 1;
  return Math.max(2, Math.min(3.6, (w-3)/(Math.max(len,1)*1.08), sh*0.42));   // ⭐名前は太字（2026-09-27）＝字の幅が広いぶん1.08で割る
}
function drawSheet(){
  var tr=$("train"), L=letters(), lc=leftCount(), rows=rowList();
  var nRow=rows.filter(function(x){ return !x.gap && !x.carBreak; }).length, nGap=rows.filter(function(x){ return x.gap; }).length, nBrk=rows.filter(function(x){ return x.carBreak; }).length;
  /* ⭐1マスの高さは紙から計算。A4たての中身 270mm から見出し・列名の行・サイト名・すき間を引いて割る */
  var nHead=multiCar()?1:0, nDir=(st.up==="none")?0:2;
  /* ⭐号車がかわるたびに A〜E の行も入る（nBrk ぶん） */
  var avail=270-12-6-6-6-1.2*(rows.length+1+nHead+nDir+nBrk)-4*nGap-20*nBrk-6*nBrk-8*nHead-9*nDir;
  var sh=nRow ? Math.min(16, Math.floor(avail/nRow*10)/10) : 12;
  tr.style.setProperty("--sh", sh);
  var cols="calc("+NW+"*var(--mm))"; L.forEach(function(l,i){ if(i===lc) cols+=" calc("+AW+"*var(--mm))"; cols+=" calc("+SW+"*var(--mm))"; });
  cols+=" calc("+NW+"*var(--mm))";   // ⭐右にも列の番号（2026-09-27 本人「新幹線の右側にも、数字入れておいて」）
  tr.style.setProperty("--cols", cols);
  var sc=sideCars(), topCar=(st.up==="lo")?sc.lo:(st.up==="hi")?sc.hi:0, botCar=(st.up==="lo")?sc.hi:(st.up==="hi")?sc.lo:0;
  var h='';
  if(st.up!=="none") h+='<div class="dir top">▲ '+(topCar?topCar+'号車側':'先頭の端')+'</div>';
  /* ⭐A〜E の行は号車の見出しの下に、号車ごとに入れる（2026-09-27 本人「5号車の下にABCがいいな。6号車の下にもABC入れておいて」） */
  function letterRow(){
    var s='<div class="hd"></div>';
    // ⭐「窓」は書かない（2026-09-27 本人「あると見た目が崩れるから、なしでいい。絶対外側が窓ってわかる」）
    L.forEach(function(l,i){ if(i===lc) s+='<div class="hd aisle"></div>'; s+='<div class="hd">'+l+'</div>'; });
    return s+'<div class="hd"></div>';
  }
  if(multiCar()) h+='<div class="carhd top">'+st.car+'号車</div>';
  h+=letterRow();
  var vb=pdfing?[]:violations(st.assign), badSet={}, wb=whereIs(st.assign);
  vb.forEach(function(x){ if(wb[x.a]) badSet[wb[x.a]]=1; if(wb[x.b]) badSet[wb[x.b]]=1; });
  function hanOf(c){ var pp=st.assign[c], g=pp?(st.hanOf[pp]|0):0;   /* ⭐班は人に付く */ return g ? {cls:" hg", sty:";--hc:"+HAN_COLORS[(g-1)%HAN_COLORS.length], badge:'<span class="hb">'+g+'班</span>'} : {cls:"", sty:"", badge:""}; }
  function seat(c){
    var n=st.assign[c]||"", hg=hanOf(c);
    return '<div class="seat'+hg.cls+(badSet[c]?" bad":"")+(sel===c?" sel":"")+'" data-c="'+esc(c)+'" style="--fs:'+nameFs(n,SW,sh).toFixed(2)+hg.sty+'"><span class="cd">'+esc(shortCode(c))+'</span>'+hg.badge+(n?'<span class="nm">'+esc(n)+'</span>':'')+'</div>';
  }
  rows.forEach(function(x){
    if(x.gap){ h+='<div class="gap"></div>'; return; }                                  // 同じ号車の続き＝ただの空白
    if(x.carBreak){ h+='<div class="carbrk"></div><div class="carhd">'+x.car+'号車</div>'+letterRow(); return; }   // 号車がかわる＝空白＋線＋号車＋A〜E
    h+='<div class="num">'+x.r+'</div>';
    L.forEach(function(l,i){ if(i===lc) h+='<div class="aisle"></div>'; h+=seat(x.car+"-"+x.r+l); });
    h+='<div class="num">'+x.r+'</div>';
  });
  if(st.up!=="none") h+='<div class="dir bot">▼ '+(botCar?botCar+'号車側':'先頭の端')+'</div>';
  tr.innerHTML=h;
  /* ⭐条件を守れていない組＝席に赤い枠・④の中に1行（紙には出さない） */
  var vv=pdfing?[]:violations(st.assign);
  $("condWarn").hidden=!vv.length;
  $("regroupRow").hidden=!nameList().some(function(n){ return st.hanOf[n]; });
  $("condWarn").textContent = vv.length ? "⚠ "+vv.map(function(x){ return (x.kind==="sep"?"離す組「":"隣にする組「")+x.a+"・"+x.b+(x.kind==="sep"?"」が隣です":"」が隣ではありません"); }).join("／") : "";
  /* ⭐号車は見出しの中に「新幹線座席表（5号車）」（2026-09-27 本人・バスと同じ）。右には列の範囲 */
  $("shTitle").textContent=(st.title?st.title+"　":"")+"新幹線座席表（"+cars().map(function(c){ return c+"号車"; }).join("・")+"）";
  var span=function(a,b){ return Math.min(a,b)+"〜"+Math.max(a,b)+"列"; };
  var rng=(multiCar()?st.car+"号車 ":"")+span(st.from,st.to)+(st.rs?"・"+span(st.fromS,st.toS):"");
  if(st.r2) rng+="・"+(multiCar()?st.car2+"号車 ":"")+span(st.from2,st.to2);
  $("shCar").textContent=rng+(st.kind==="green"?"（グリーン車）":"");
  var un=unassigned(), chips=$("chips"); chips.innerHTML="";
  un.forEach(function(n){ var b=document.createElement("button"); b.type="button"; b.className="sk-chip"+(chipSel===n?" on":""); b.textContent=n; b.setAttribute("data-n",n); chips.appendChild(b); });
  $("chipsRow").hidden=un.length===0;
  $("selRow").hidden=sel===null;
  if(sel!==null) $("selLbl").textContent=codeLabel(sel)+"（"+(st.assign[sel]||"空")+"）を選んでいます。もう1つ席を押すと入れかわります。";
  $("sheetNote").textContent = Object.keys(st.assign).length ? "" : "①で名簿を入れて、③の「席を決める」を押すと、座席表ができます。";
  fitSheet();
  fitNames();
}
$("train").addEventListener("click",function(e){
  if(skipClick) return;
  var el=e.target.closest(".seat"); if(!el) return;
  var c=el.getAttribute("data-c");
  if(chipSel!==null){ st.assign[c]=chipSel; chipSel=null; sel=null; drawSheet(); screenSave(); return; }
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
function seatAt(x,y){ var el=document.elementFromPoint(x,y); while(el && el!==document.body){ if(el.classList && el.classList.contains("seat") && el.closest("#train")) return el; el=el.parentElement; } return null; }
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
$("train").addEventListener("pointerdown",dragStart);
$("train").addEventListener("dragstart",function(e){ e.preventDefault(); });
$("train").addEventListener("contextmenu",function(e){ if(drag) e.preventDefault(); });

$("chips").addEventListener("click",function(e){
  var b=e.target.closest(".sk-chip"); if(!b) return;
  var n=b.getAttribute("data-n"); chipSel=(chipSel===n)?null:n; sel=null; drawSheet();
});
$("emptyBtn").addEventListener("click",function(){ if(sel!==null){ delete st.assign[sel]; sel=null; drawSheet(); screenSave(); } });
$("unselBtn").addEventListener("click",function(){ sel=null; chipSel=null; drawSheet(); });
$("title").addEventListener("input",function(){ st.title=this.value; drawSheet(); screenSave(); });

/* ⭐描いたあとに測って、はみ出す名前だけ縮める（2026-09-27 名前を太字にしたとき）。
   ⚠紙が見えていないときは幅が0なので測らない（ページの型 16-b「かくしているあいだは測らない」） */
function fitNames(){
  [].forEach.call(document.querySelectorAll("#train .seat .nm"),function(n){
    var seat=n.parentNode, room=seat.clientWidth-2;
    if(room<10) return;
    var fs=parseFloat(seat.style.getPropertyValue("--fs"))||3.6, k=0;
    while(n.scrollWidth>room && fs>1.6 && k<30){ fs=fs*0.95; seat.style.setProperty("--fs",fs.toFixed(2)); k++; }
  });
}
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

$("doPdf").addEventListener("click",function(){
  if(!window.PAPER_PDF){ alert("PDFの部品を読み込めませんでした。"); return; }
  var btn=this, label=btn.textContent, keepSel=sel; sel=null; chipSel=null; pdfing=true; drawSheet();   // ⭐赤い枠は紙に出さない
  var name=((st.title||"")+"新幹線座席表"+st.car+"号車").replace(/\s/g,"");
  btn.disabled=true; btn.textContent="PDFを作っています…";
  window.PAPER_PDF.save($("sheet"),{landscape:false,name:name})
    .then(function(){ pdfing=false; btn.disabled=false; btn.textContent=label; sel=keepSel; drawSheet(); })
    .catch(function(e){ pdfing=false; btn.disabled=false; btn.textContent=label; drawSheet(); alert("PDFを作れませんでした。"+(e&&e.message?("　"+e.message):"")); });
});

/* ===== 画面の保存（チェックを入れたときだけ・ページの型 3） ===== */
var KEY="sakura-shinkansen", sampleOn=false, stash=null;
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
function clampRow(v,d){ v=v|0; return (v>=1&&v<=MAXROW)?v:d; }
function applyData(s){
  st.names=String(s.names||""); $("names").value=st.names;
  setKind(s.kind);
  st.car=Math.max(1,Math.min(20,s.car|0||5)); $("car").value=st.car;
  st.from=clampRow(s.from,1); $("rowFrom").value=st.from;
  st.to=clampRow(s.to,8); $("rowTo").value=st.to;
  st.rs=!!s.rs; st.fromS=clampRow(s.fromS,12); st.toS=clampRow(s.toS,14);
  st.r2=!!s.r2; st.car2=Math.max(1,Math.min(20,s.car2|0||(st.car+1))); st.from2=clampRow(s.from2,1); st.to2=clampRow(s.to2,3);
  /* ⚠前の形＝「2つ目の範囲」が同じ号車だったものは「同じ号車で、列が飛ぶとき」に移す */
  if(s.rs===undefined && st.r2 && st.car2===st.car){ st.rs=true; st.fromS=st.from2; st.toS=st.to2; st.r2=false; st.car2=st.car+1; st.from2=1; st.to2=3; }
  $("rangeS").checked=st.rs; $("rangeSRow").hidden=!st.rs; $("rowFromS").value=st.fromS; $("rowToS").value=st.toS;
  $("range2").checked=st.r2; $("range2Row").hidden=!st.r2; $("car2").value=st.car2; $("rowFrom2").value=st.from2; $("rowTo2").value=st.to2;
  setOrder(s.order);
  /* ⚠前の形（号車なしの「1A」）は、1つ目の号車の席として読む */
  var fixCode=function(c){ c=String(c||""); return (c && !/^\d+-/.test(c)) ? st.car+"-"+c : c; };
  st.fixed=Array.isArray(s.fixed)?s.fixed.map(function(f){ return {label:String(f.label||""), code:fixCode(f.code)}; }):[];
  st.title=String(s.title||""); $("title").value=st.title;
  st.assign={}; if(s.assign&&typeof s.assign==="object") Object.keys(s.assign).forEach(function(k){ st.assign[fixCode(k)]=s.assign[k]; });
  st.up=(s.up==="lo"||s.up==="hi")?s.up:"none";
  var pairs=function(x){ return Array.isArray(x)?x.map(function(p){ return [String((p&&p[0])||""),String((p&&p[1])||"")]; }):[]; };
  st.sep=pairs(s.sep); st.adj=pairs(s.adj); st.han=Math.max(0,Math.min(20,s.han|0)); st.hanOf=(s.hanOf&&typeof s.hanOf==="object")?s.hanOf:{}; syncHan();
  sel=null; chipSel=null;
  refreshUp(); countNames(); refreshDatalist(); pruneAssign(); refreshFix(); refreshCond(); seatHint(); drawSheet();
}
function screenLoad(){
  try{
    var s=JSON.parse(localStorage.getItem(KEY)||"null"); if(!s) return false;
    $("save").checked=true; applyData(s); return true;
  }catch(e){ return false; }
}

/* ===== サンプル（ページの型 12-a） ===== */
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
  sampleIn({names:SAMPLE_NAMES.map(function(n,i){ return n+"\t"+(Math.floor(i/5)+1); }).join("\n"), kind:"std", car:5, from:1, to:8, rs:false, r2:false, up:"none", order:"han", fixed:[{label:"山田先生",code:"5-1C"},{label:"おおの ゆず",code:"5-1D"}], title:"6年1組", assign:{}},"名簿に班（1〜7班）が入っているので、班ごとに並べました");
});
$("sample2Btn").addEventListener("click",function(){
  sampleIn({names:SAMPLE_NAMES.join("\n"), kind:"std", car:5, car2:6, from:15, to:20, rs:false, r2:true, from2:1, to2:2, up:"lo", order:"random", fixed:[{label:"山田先生",code:"5-15C"},{label:"おおの ゆず",code:"5-15D"}], title:"6年1組", assign:{}},"作成途中の形です（5号車と6号車にまたがる）。4人が席に入っていません",true);
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
  var name=prompt("名簿の名前を入れてください（例：6年1組）",""); if(name===null) return; name=name.trim(); if(!name) return;
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

document.addEventListener("click",function(e){
  var b=e.target.closest(".tip-btn"); if(!b) return;
  var host=b.closest("h2,summary,p,label,div.sk-line"), body=host && host.nextElementSibling;
  if(!body || !body.classList.contains("tip-body")) return;
  e.preventDefault(); body.hidden=!body.hidden; b.setAttribute("aria-expanded", body.hidden?"false":"true");
});

/* ===== はじめ ===== */
refreshBox("");
if(!screenLoad()){ setKind("std"); setOrder("random"); refreshUp(); countNames(); refreshFix(); refreshCond(); seatHint(); drawSheet(); }
})();
