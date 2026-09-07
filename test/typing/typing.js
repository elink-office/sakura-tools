/* =========================================================
   タイピング練習アプリ（サンプル）
   - HTML1枚。サーバー・ログイン・外部ライブラリなし。
   - 記録はブラウザの中（localStorage）に自動で貯まる。
   ========================================================= */

/* ---------- ローマ字テーブル ---------- */
var KANA = {
 "あ":["a"],"い":["i"],"う":["u"],"え":["e"],"お":["o"],
 "か":["ka","ca"],"き":["ki"],"く":["ku","cu"],"け":["ke"],"こ":["ko","co"],
 "が":["ga"],"ぎ":["gi"],"ぐ":["gu"],"げ":["ge"],"ご":["go"],
 "さ":["sa"],"し":["shi","si"],"す":["su"],"せ":["se"],"そ":["so"],
 "ざ":["za"],"じ":["ji","zi"],"ず":["zu"],"ぜ":["ze"],"ぞ":["zo"],
 "た":["ta"],"ち":["chi","ti"],"つ":["tsu","tu"],"て":["te"],"と":["to"],
 "だ":["da"],"ぢ":["di"],"づ":["du"],"で":["de"],"ど":["do"],
 "な":["na"],"に":["ni"],"ぬ":["nu"],"ね":["ne"],"の":["no"],
 "は":["ha"],"ひ":["hi"],"ふ":["fu","hu"],"へ":["he"],"ほ":["ho"],
 "ば":["ba"],"び":["bi"],"ぶ":["bu"],"べ":["be"],"ぼ":["bo"],
 "ぱ":["pa"],"ぴ":["pi"],"ぷ":["pu"],"ぺ":["pe"],"ぽ":["po"],
 "ま":["ma"],"み":["mi"],"む":["mu"],"め":["me"],"も":["mo"],
 "や":["ya"],"ゆ":["yu"],"よ":["yo"],
 "ら":["ra"],"り":["ri"],"る":["ru"],"れ":["re"],"ろ":["ro"],
 "わ":["wa"],"を":["wo"],
 "ぁ":["xa","la"],"ぃ":["xi","li"],"ぅ":["xu","lu"],"ぇ":["xe","le"],"ぉ":["xo","lo"],
 "ゃ":["xya","lya"],"ゅ":["xyu","lyu"],"ょ":["xyo","lyo"],
 "ー":["-"],"、":[","],"。":["."]
};
var YOUON = {
 "きゃ":["kya"],"きゅ":["kyu"],"きょ":["kyo"],
 "ぎゃ":["gya"],"ぎゅ":["gyu"],"ぎょ":["gyo"],
 "しゃ":["sha","sya"],"しゅ":["shu","syu"],"しょ":["sho","syo"],"しぇ":["she"],
 "じゃ":["ja","jya","zya"],"じゅ":["ju","jyu","zyu"],"じょ":["jo","jyo","zyo"],"じぇ":["je"],
 "ちゃ":["cha","tya"],"ちゅ":["chu","tyu"],"ちょ":["cho","tyo"],"ちぇ":["che"],
 "にゃ":["nya"],"にゅ":["nyu"],"にょ":["nyo"],
 "ひゃ":["hya"],"ひゅ":["hyu"],"ひょ":["hyo"],
 "びゃ":["bya"],"びゅ":["byu"],"びょ":["byo"],
 "ぴゃ":["pya"],"ぴゅ":["pyu"],"ぴょ":["pyo"],
 "みゃ":["mya"],"みゅ":["myu"],"みょ":["myo"],
 "りゃ":["rya"],"りゅ":["ryu"],"りょ":["ryo"],
 "ふぁ":["fa"],"ふぃ":["fi"],"ふぇ":["fe"],"ふぉ":["fo"],
 "てぃ":["thi"],"でぃ":["dhi"]
};

/* かな文字列を「音節」に分解する */
function toSyllables(kana){
  var out=[], i=0, prevNasalNa=false;
  while(i<kana.length){
    var two=kana.substr(i,2);
    if(YOUON[two]){
      // 「きょ」は kyo だけでなく、ki + xyo（小さいょを別に打つ）も認める
      var cs=YOUON[two].slice();
      var b1=KANA[two.charAt(0)], b2=KANA[two.charAt(1)];
      if(b1&&b2){
        for(var x=0;x<b1.length;x++) for(var y=0;y<b2.length;y++){
          var comb=b1[x]+b2[y];
          if(cs.indexOf(comb)<0) cs.push(comb);
        }
      }
      out.push({disp:two,cands:cs,nasal:false}); i+=2;
      prevNasalNa=false; continue;
    }
    var one=kana.charAt(i);

    if(one==="っ"){
      var nx=toSyllables(kana.substr(i+1,2))[0];
      // 子音重ね（natta）を先頭にする。xtu を先頭にすると表示が naxtuta になってしまう
      var arr=[];
      if(nx){
        for(var k=0;k<nx.cands.length;k++){
          var h=nx.cands[k].charAt(0);
          if("aiueo".indexOf(h)<0 && arr.indexOf(h)<0) arr.push(h);
        }
      }
      arr.push("xtu","ltu");
      out.push({disp:"っ",cands:arr});
      i+=1; continue;
    }

    if(one==="ん"){
      var nch=kana.charAt(i+1), cands;
      prevNasalNa=false;
      if(!nch){ cands=["nn","xn"]; }
      else{
        var ns=toSyllables(kana.substr(i+1,2))[0];
        var f=ns?ns.cands[0].charAt(0):"";
        if(f!=="" && "aiueoy".indexOf(f)>=0){
          cands=["nn","xn"];              // 次が母音・や行：nn が必要
        }else if(f==="n"){
          cands=["n","xn"];               // 次がな行：n1つで確定し、次の音節側で nn も受ける
          prevNasalNa=true;
        }else{
          cands=["n","nn","xn"];
        }
      }
      out.push({disp:"ん",cands:cands});
      i+=1; continue;
    }

    if(KANA[one]){
      var cc=KANA[one].slice();
      if(prevNasalNa){                    // 「かばんの」を kabanno / kabannno のどちらでも打てるように
        var ext=[]; for(var z=0;z<cc.length;z++) ext.push("n"+cc[z]);
        cc=cc.concat(ext); prevNasalNa=false;
      }
      out.push({disp:one,cands:cc}); i+=1; continue;
    }
    prevNasalNa=false;
    out.push({disp:one,cands:[one]}); i+=1;
  }
  return out;
}
function toDirect(str){
  var out=[];
  for(var i=0;i<str.length;i++) out.push({disp:str.charAt(i),cands:[str.charAt(i)]});
  return out;
}

/* ---------- ステージ ----------
   ホームポジション = 左 a s d f / 右 j k l ;
   そこから各指が「上・中央・下」の3段を担当する。
   日本語のローマ字で使わない q v x はごく少なめ。母音 a i u e o を多めに。
   fj:false のステージでは、終わりの f j を出さない。 */
var STAGES=[
 {name:"ホームポジション",basic:true,mode:"direct",
  desc:"中央の段。左は a s d f、右は j k l。指を1本も動かさずに打てるキーだけ。",
  items:["ffjj","ddkk","ssll","aass","fjfj","dkdk","slsl","fdsa","jklj","asdfjkl","fjdksla",
         "asa","kasa","saka","dasa","kaja","sakasa","asakasa","kasadasa"]},

 {name:"ひとさし指の 上・中央・下",basic:true,mode:"direct",
  desc:"f から上の r・下の v へ。j から上の u・下の m へ。伸ばしたら必ず戻る。",
  items:["frf","ftf","fgf","juj","jyj","jhj","fbf","jnj","jmj","fvf",
         "fufu","huhu","juju","yuyu","gugu","bubu","tutu","nunu","mumu","ruru",
         "furu","tugu","hutu","yumu","nuru","bunu","gutu","muyu"]},

 {name:"なか指の 上・中央・下",basic:true,mode:"direct",
  desc:"d から上の e・下の c へ。k から上の i・下の , へ。中指はいちばん長いので暴れます。",
  items:["ded","kik","dede","kiki","dcd","k,k",
         "deki","kide","kedi","dike","dekide","kideki",
         "eki","ike","kie","dei","ide","kikide","ekide","idekie"]},

 {name:"くすり指の 上・中央・下",basic:true,mode:"direct",
  desc:"s から上の w・下の x へ。l から上の o・下の . へ。いちばん言うことを聞かない指です。",
  items:["sws","lol","swsw","lolo","sxs","l.l",
         "soso","wowo","oso","sowo","wasa","sawa","wosa",
         "owoso","sosowo","sawaso","wasowa"]},

 {name:"こ指の 上・中央・下",basic:true,mode:"direct",
  desc:"a から上の q・下の z へ。右の小指は p。小指は力が入りにくいので、ゆっくり確実に。",
  items:["aza","zaza","azaz","apa","papa","popo","pipi","pupu","pepe",
         "zapa","paza","azapa","pazapa","zopo","pozo","aqa","qaza"]},

 {name:"あいうえお",basic:true,mode:"kana",
  desc:"五十音と濁点・半濁点。ローマ字は2文字。を8本の指がぜんぶ動きます。",
  items:["あいうえお","かきくけこ","さしすせそ","たちつてと","なにぬねの",
         "はひふへほ","まみむめも","やゆよ","らりるれろ","わをん",
         "がぎぐげご","ざじずぜぞ","だぢづでど","ばびぶべぼ","ぱぴぷぺぽ"]},

 {name:"きゃきゅきょ",basic:true,mode:"kana",
  desc:"ローマ字が3文字になる音。ここがいちばんの山です。短いので何度でもどうぞ。",
  items:["きゃきゅきょ","ぎゃぎゅぎょ","しゃしゅしょ","じゃじゅじょ",
         "ちゃちゅちょ","にゃにゅにょ","ひゃひゅひょ","びゃびゅびょ",
         "ぴゃぴゅぴょ","みゃみゅみょ","りゃりゅりょ"]},

 {name:"単語",mode:"kana",shuffle:true,pick:15,fj:false,
  desc:"ことばを1つずつ。短いので、正確さだけに集中できます。",
  items:["あさごはん","でんしゃ","かいもの","せんたく","そうじ","しごと","やすみ","てんき",
         "まいにち","ともだち","かぞく","がっこう","きょうしつ","のみもの","たべもの","くだもの",
         "やさい","さかな","たまご","ごはん","おちゃ","こうちゃ","さいふ","かばん","くつ","ぼうし",
         "とけい","でんわ","てがみ","しんぶん","ざっし","えんぴつ","けしごむ","つくえ","まど",
         "だいどころ","おふろ","こうえん","えき","みせ","びょういん","ゆうびんきょく","としょかん",
         "じてんしゃ","しゅくだい","りょうり","きっぷ","やくそく","じゅんび","そうだん","へんじ",
         "しゅうまつ","ひるやすみ","おてつだい","かたづけ","ならいごと","さんぽ","ゆうがた","あさひ"]},

 {name:"日常のことば",mode:"kana",shuffle:true,pick:12,fj:false,
  desc:"短い文を、スペースを打たずに最後まで。",
  items:["おなかすいた","のどがかわいた","きょうはいいてんきだ","はやくかえりたい",
         "そろそろおきなくちゃ","あしたのらんちはなにしよう","ねむいけどもうすこしがんばる",
         "あたらしいくつがほしい","でんしゃがおくれている","こんやはさむくなりそう",
         "そとはあめがふっている","おひるはなにをたべようかな","せんたくものがかわかない",
         "ゆうびんきょくによっていこう","れいぞうこがからっぽだ","あしたはやすみだからうれしい",
         "しゅうまつはなにをしようかな","ちょっとつかれたのでやすむ","あたたかいのみものがほしい",
         "でかけるまえにかぎをかける","かみのけをきりにいきたい","きょうはよくあるいたとおもう",
         "あさからばたばたしている","すこしだけまどをあけておく","ほんやによってかえりたい",
         "おふろがわいたのではいろう","あしたのてんきをしらべておく","ひるねをしたらすっきりした",
         "ともだちにれんらくをしなくちゃ","あまいものがたべたくなった","そうじきをかけたらつかれた",
         "まどのそとがしずかになった","しごとがおもったよりすすんだ","ねるまえにすとれっちをする",
         "あるいてえきまでいくことにした","ゆうごはんはなにがいいかな","ぽすとにてがみをだしにいく",
         "まいにちすこしずつつづける","あたらしいてちょうをつかいはじめる","くつしたのかたほうがみつからない"]},

 {name:"日常のことば（ながめ）",mode:"kana",shuffle:true,pick:8,fj:false,
  desc:"止まらずに打ちきる練習。あせらないこと。",
  items:["しゅくだいがおわらないのであしたにまわす",
         "がっこうまであるいていくとにじゅっぷんかかる",
         "ともだちとえいががみたいけどよていがあわない",
         "あさごはんはぱんとたまごとさらだにした",
         "そろそろねようとおもうけどまだねむくない",
         "らいしゅうのよていをてちょうにかきこんだ",
         "かばんのなかをせいりしたらえんぴつがたくさんでてきた",
         "あめがふりそうなそらだからかさをもっていくことにする",
         "あさはやくおきたのできょうはじかんによゆうがある",
         "でかけるまえにてんきよほうをかくにんしておいた",
         "きょうはいちにちよくがんばったとおもう",
         "ひるやすみにこうえんまであるいていってきた",
         "れいぞうこのなかをみてこんばんのこんだてをきめる",
         "しゅうまつはそうじをまとめてやるつもりでいる",
         "あしたのじゅんびをしてからねることにする",
         "ともだちからひさしぶりにれんらくがきてうれしい",
         "あたらしいくつをはいたらすこしあるきにくかった",
         "でんしゃのなかでほんをよんでいたらねすごした",
         "あさごはんをたべながらてんきよほうをみていた",
         "きょうはなにもしないひにするときめてしまった",
         "ゆうがたになったらきゅうにすずしくなってきた",
         "かいものにいったらおもったよりたかくておどろいた",
         "ひさしぶりにながくあるいたらあしがいたくなった",
         "そとがくらくなるのがすこしずつはやくなってきた",
         "あたたかいおちゃをのんだらきもちがおちついた"]},

 {name:"英単語とメール",mode:"direct",shuffle:true,pick:15,
  desc:"アルファベットの練習。メールアドレスや @ . - も混ざっています。",
  items:[
    "apple","banana","orange","lemon","grape","melon","peach","cherry",
    "tomato","potato","carrot","onion","cheese","bread","salad","cookie",
    "coffee","juice","water","sugar","honey","butter","candy","noodle",
    "cat","dog","bird","fish","rabbit","tiger","panda","horse",
    "sheep","mouse","monkey","penguin","turtle","dolphin",
    "red","blue","green","yellow","black","white","pink","brown",
    "book","desk","chair","door","window","table","pencil","paper",
    "phone","clock","watch","shoes","shirt","pocket","letter","ticket",
    "school","teacher","student","friend","family","house","garden",
    "river","mountain","forest","island","bridge","market","station",
    "summer","winter","spring","autumn","morning","evening","night",
    "today","tomorrow","holiday","weekend","birthday","present",
    "music","picture","camera","window","travel","hotel","airport",
    "email","address","folder","update","report","meeting","schedule",
    "info@example.com","sales@abc.co.jp","taro@sample.ne.jp",
    "support@web-shop.com","hello@my-office.jp","order@shop-abc.com",
    "www.example.com","abc-company.co.jp","my-office.jp","sample-mail.ne.jp"
  ]}
];

/* ---------- 指の割り当て ---------- */
var FINGER={};
(function(){
  var map={
    l5:"1qaz", l4:"2wsx", l3:"3edc", l2:"45rtfgvb",
    r2:"67yuhjnm", r3:"8ik,", r4:"9ol.", r5:"0p;/-^@[:]\\"
  };
  for(var f in map){ for(var i=0;i<map[f].length;i++) FINGER[map[f].charAt(i)]=f; }
})();
var FCOLOR={l5:"#e0577f",l4:"#ef8a3c",l3:"#e2b52c",l2:"#43a877",
            r2:"#2ea9bd",r3:"#4a6bcf",r4:"#8a5cd0",r5:"#9a6a4c"};
var FNAME={l5:"左こゆび",l4:"左くすりゆび",l3:"左なかゆび",l2:"左ひとさしゆび",
           r2:"右ひとさしゆび",r3:"右なかゆび",r4:"右くすりゆび",r5:"右こゆび"};
var KBROWS=["1234567890-^","qwertyuiop@[","asdfghjkl;:]","zxcvbnm,./\\"];
var HOMEKEYS={a:1,s:1,d:1,f:1,j:1,k:1,l:1,";":1};

/* ---------- 状態 ---------- */
var $=function(id){return document.getElementById(id)};
var stageIdx=0, itemIdx=0, curItems=[], syls=[], si=0, buf="";
var startAt=0, keys=0, chars=0, miss=0, timer=null, running=false, pausedMs=0;   // keys=打鍵数 / chars=文字数
var bestTower=0, lives=0;   // bestTower = その回いちばん多く塗れたタイル数
var lastResult=null, runToken=0, celebrateCancel=null, stageDone=false, justReset=true;
var MISS_PENALTY=2.5;   // ミス1回あたりの実質ロス（秒）
var LOGKEY="typingLogs_v1";

/* ---------- 音 ---------- */
var actx=null;
function tone(freq,dur,vol,type){
  if(!$("optSound").checked) return;
  try{
    if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
    var o=actx.createOscillator(), g=actx.createGain();
    o.connect(g); g.connect(actx.destination);
    o.frequency.value=freq; o.type=type||"sine";
    g.gain.setValueAtTime(vol,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+dur);
    o.start(); o.stop(actx.currentTime+dur);
  }catch(e){}
}
function crashSound(){
  tone(90,0.5,0.13,"sawtooth");
  setTimeout(function(){ tone(60,0.45,0.10,"square"); },70);
  setTimeout(function(){ tone(140,0.3,0.06,"sawtooth"); },160);
}
function fireworkSound(i){
  setTimeout(function(){ tone(220+i*90,0.05,0.05); },0);
  setTimeout(function(){ tone(1200+i*160,0.5,0.06,"triangle"); },70);
}

/* ---------- キーボード図 ---------- */
function buildKeyboard(){
  var kb=$("kb"); kb.innerHTML="";
  for(var r=0;r<KBROWS.length;r++){
    var row=document.createElement("div"); row.className="kbrow";
    var rowChars=KBROWS[r];
    for(var i=0;i<rowChars.length;i++){
      var c=rowChars.charAt(i);
      var k=document.createElement("div");
      k.className="key"+(HOMEKEYS[c]?" hp":"");
      k.setAttribute("data-k",c);
      k.textContent=c;
      var f=FINGER[c];
      if(f){
        var bar=document.createElement("div");
        bar.className="fg"; bar.style.background=FCOLOR[f];
        k.appendChild(bar);
      }
      row.appendChild(k);
    }
    kb.appendChild(row);
  }
  var lg=$("legend"); lg.innerHTML="";
  ["l5","l4","l3","l2","r2","r3","r4","r5"].forEach(function(f){
    var s=document.createElement("span");
    s.innerHTML='<i style="background:'+FCOLOR[f]+'"></i>'+FNAME[f];
    lg.appendChild(s);
  });
}
function expectedChar(){
  if(si>=syls.length) return "";
  var cands=syls[si].cands, ch=cands[0].charAt(buf.length);
  for(var j=0;j<cands.length;j++){
    if(cands[j].indexOf(buf)===0 && cands[j].length>buf.length){ ch=cands[j].charAt(buf.length); break; }
  }
  return ch;
}
var missHintTimer=null;
function showMissHint(typed, want){
  var el=$("missHint");
  if(!el) return;
  var kana = (si<syls.length) ? (syls[si].home?"fj":syls[si].disp) : "";
  el.innerHTML = "「"+esc(kana)+"」は <kbd>"+esc(want)+"</kbd> です（打ったのは <kbd>"+esc(typed)+"</kbd>）";
  el.classList.add("on");
  clearTimeout(missHintTimer);
  missHintTimer=setTimeout(function(){ el.classList.remove("on"); }, 2600);
}
function highlightNext(){
  var ks=document.querySelectorAll(".key.next");
  for(var i=0;i<ks.length;i++) ks[i].classList.remove("next");
  if(si>=syls.length) return;
  var cands=syls[si].cands, ch=cands[0].charAt(buf.length);
  for(var j=0;j<cands.length;j++){
    if(cands[j].indexOf(buf)===0 && cands[j].length>buf.length){ ch=cands[j].charAt(buf.length); break; }
  }
  var el=document.querySelector('.key[data-k="'+ch+'"]');
  if(el) el.classList.add("next");
}

/* ---------- タイル ----------
   ステージの総打鍵数だけタイルを用意し、打つごとにランダムなタイルを塗る。
   全部塗ればステージ完走（＝ノーミス）。ミスするとその分だけ戻る。 */
var BLOCKCOL=["#e0577f","#ef8a3c","#e2b52c","#43a877","#2ea9bd","#4a6bcf","#8a5cd0"];
var cells=[], order=[], filled=0, cellTotal=0;

/* このステージをノーミスで打ちきったときの総打鍵数 */
function stageCellCount(){
  var st=STAGES[stageIdx], sum=0;
  var useFj=($("optHome").checked && !!st.basic);   // 基礎ステージだけ
  for(var i=0;i<curItems.length;i++){
    var sy = st.mode==="kana" ? toSyllables(curItems[i]) : toDirect(curItems[i]);
    sum += sy.length + (useFj?1:0);
  }
  return sum;
}
function buildGrid(){
  var host=$("grid");
  host.innerHTML=""; cells=[]; order=[]; filled=0;
  cellTotal=stageCellCount();
  if(cellTotal<1){ $("tcount").textContent="0"; $("ttotal").textContent=""; return; }

  var area=host.parentNode.getBoundingClientRect();
  var W=Math.max(220,(area.width||664)-72), H=Math.max(130,(area.height||300)-64);
  var best=null;
  for(var c=1;c<=cellTotal;c++){
    var r=Math.ceil(cellTotal/c), sz=Math.min(W/c, H/r);
    if(!best || sz>best.sz) best={c:c,r:r,sz:sz};
  }
  var size=Math.min(best.sz,48), cols=best.c, rows=best.r;   // タイルが少ないステージほど大きくなる
  host.style.width=(cols*size)+"px"; host.style.height=(rows*size)+"px";

  for(var i=0;i<cellTotal;i++){
    var col=i%cols, row=Math.floor(i/cols);
    var d=document.createElement("div");
    d.className="cell";
    d.style.left=(col*size)+"px"; d.style.top=(row*size)+"px";
    d.style.width=size+"px";      d.style.height=size+"px";
    d.appendChild(document.createElement("i"));
    host.appendChild(d);
    cells.push(d); order.push(i);
  }
  for(var k=order.length-1;k>0;k--){                    // 塗る順番をシャッフル
    var j=Math.floor(Math.random()*(k+1)), t=order[k]; order[k]=order[j]; order[j]=t;
  }
  $("tcount").textContent="0";
  $("ttotal").textContent=" / "+cellTotal;
}
function fillOne(){
  if(filled>=cellTotal) return;
  var c=cells[order[filled]];
  c.firstChild.style.backgroundColor=BLOCKCOL[Math.floor(Math.random()*BLOCKCOL.length)];
  c.classList.add("on");
  filled++;
  if(filled>bestTower) bestTower=filled;
  $("tcount").textContent=filled;
  tone(560+Math.min(filled,40)*14,0.045,0.045);
}
/* ミス1回につき1タイル消す */
function unfillSome(n){
  for(var k=0;k<n && filled>0;k++){
    filled--;
    cells[order[filled]].classList.remove("on");
  }
  $("tcount").textContent=filled;
  tone(150,0.22,0.09,"sawtooth");
  setTimeout(function(){ tone(100,0.18,0.06,"square"); },60);
}
/* 最後の1回：塗ったタイルが全部飛び散る */
function blastAll(){
  crashSound();
  var lit=[];
  for(var i=0;i<filled;i++) lit.push(cells[order[i]]);
  filled=0; $("tcount").textContent="0";
  lit.forEach(function(c){
    var inner=c.firstChild;
    c.classList.add("blast");
    var dx=(Math.random()*520-260), dy=(Math.random()*320-110), rot=(Math.random()*720-360);
    setTimeout(function(){
      inner.style.transform="translate("+dx+"px,"+dy+"px) rotate("+rot+"deg) scale(.35)";
      inner.style.opacity="0";
    }, 4+Math.random()*110);
    setTimeout(function(){
      c.classList.remove("blast","on");
      inner.style.transform=""; inner.style.opacity="";
    }, 1150);
  });
}
function clearGrid(){
  for(var i=0;i<cells.length;i++){
    cells[i].classList.remove("on","blast");
    var inner=cells[i].firstChild;
    if(inner){ inner.style.transform=""; inner.style.opacity=""; }
  }
  filled=0; $("tcount").textContent="0";
}
/* きびしさ：max=0 は「くずれない」 */
var LEVELS={
  easy:   {max:0},
  normal: {max:10, warn:5, danger:2},
  hard:   {max:3,  warn:2, danger:1}
};
function currentLevel(){
  var st=STAGES[stageIdx];
  if(st && !st.basic) return LEVELS.hard;    // 単語より後は、つねに3回でくずれる
  var el=document.querySelector('input[name="lv"]:checked');
  return LEVELS[el?el.value:"normal"] || LEVELS.normal;
}
function maxLives(){ return currentLevel().max; }
function renderLives(){
  var lv=currentLevel(), max=lv.max;
  if(!max){ $("lives").innerHTML=""; return; }   // やさしいは表示なし
  var left=max-lives, h="";
  for(var i=0;i<max;i++){
    var cls = (i<left) ? (left<=lv.danger?"last":(left<=lv.warn?"warn":"")) : "gone";
    h+='<i class="'+cls+'">●</i>';
  }
  $("lives").innerHTML=h;
}

/* ---------- 花火 ---------- */
var fwTimers=[];
function fireworks(bursts,onDone){
  var host=document.querySelector(".panel");
  var W=host.clientWidth, H=host.clientHeight;
  for(var burst=0;burst<bursts;burst++){
    (function(burst){
      fwTimers.push(setTimeout(function(){
        var cx=70+Math.random()*(W-140), cy=40+Math.random()*(H*0.55);
        var col=BLOCKCOL[Math.floor(Math.random()*BLOCKCOL.length)];
        var n=22+Math.floor(Math.random()*14);
        fireworkSound(burst%6);
        for(var i=0;i<n;i++){
          (function(i){
            var p=document.createElement("div");
            p.className="fw";
            p.style.background=col;
            p.style.left=cx+"px"; p.style.top=cy+"px";
            host.appendChild(p);
            var ang=Math.PI*2*i/n, sp=50+Math.random()*80;
            setTimeout(function(){
              p.style.transform="translate("+(Math.cos(ang)*sp)+"px,"+(Math.sin(ang)*sp+50)+"px) scale(.35)";
              p.style.opacity="0";
            },12);
            setTimeout(function(){ if(p.parentNode) p.parentNode.removeChild(p); },1300);
          })(i);
        }
      }, burst*270));
    })(burst);
  }
  if(onDone) fwTimers.push(setTimeout(onDone, bursts*270+1100));
}
function stopFireworks(){
  fwTimers.forEach(function(t){ clearTimeout(t); }); fwTimers=[];
  var ps=document.querySelectorAll(".fw");
  for(var i=0;i<ps.length;i++) if(ps[i].parentNode) ps[i].parentNode.removeChild(ps[i]);
}
/* ノーミス完走：花火をひとしきり見せてから結果を出す。
   クリックかキーを押せばすぐ結果へ飛べる。 */
function celebrate(){
  var bm=$("bigmsg"); bm.classList.add("on");
  var done=false;
  function teardown(){
    done=true;
    stopFireworks();
    bm.classList.remove("on"); bm.onclick=null;
    document.removeEventListener("keydown",skipKey,true);
    celebrateCancel=null;
  }
  function go(){ if(done) return; teardown(); afterStage(); }
  function skipKey(e){ e.preventDefault(); e.stopPropagation(); go(); }
  bm.onclick=go;
  document.addEventListener("keydown",skipKey,true);
  celebrateCancel=function(){ if(!done) teardown(); };   // 途中で抜けたとき用
  fireworks(14, go);
}
function cancelCelebrate(){ if(celebrateCancel) celebrateCancel(); }

/* ---------- 描画 ---------- */
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
/* 打っている途中にローマ字の表示が kyo ↔ kixyo と変わるので、
   ガラスの幅は「このお題でありうる最長」で先に固定しておく（幅が踊らない） */
function lockGlassWidth(){
  var tw=document.querySelector(".textwrap"), m=$("measure");
  if(!tw||!m||!syls.length) return;
  var cs=getComputedStyle($("kana"));
  m.style.font=cs.font; m.style.letterSpacing=cs.letterSpacing;
  m.textContent=syls.map(function(x){return x.home?"fj":x.disp}).join("");
  var wKana=m.getBoundingClientRect().width + syls.length*7;   // 現在位置の帯の分
  var cs2=getComputedStyle($("roma"));
  m.style.font=cs2.font; m.style.letterSpacing=cs2.letterSpacing;
  m.textContent=syls.map(function(x){
    var mx=x.cands[0];
    for(var i=1;i<x.cands.length;i++) if(x.cands[i].length>mx.length) mx=x.cands[i];
    return mx;
  }).join("");
  var wRoma=m.getBoundingClientRect().width;
  tw.style.width=Math.ceil(Math.max(wKana,wRoma)+44)+"px";
}
function render(){
  var kh="", rh="";
  for(var i=0;i<syls.length;i++){
    var s=syls[i];
    var cls = i<si ? "done" : (i===si ? "cur" : "");
    if(s.home) cls += " home";
    kh += '<span class="'+cls+'">'+(s.home?"fj":esc(s.disp))+"</span>";

    if(i<si){ rh += '<span class="done">'+esc(s.cands[0])+"</span>"; }
    else if(i===si){
      var pick=s.cands[0];
      for(var j=0;j<s.cands.length;j++){ if(s.cands[j].indexOf(buf)===0){ pick=s.cands[j]; break; } }
      rh += '<span class="typed">'+esc(pick.substr(0,buf.length))+'</span><span class="cur">'+esc(pick.substr(buf.length))+"</span>";
    }
    else{ rh += esc(s.cands[0]); }
  }
  $("kana").innerHTML=kh;
  $("roma").innerHTML=rh;
  highlightNext();
}

/* ---------- 入力判定 ---------- */
function feed(ch){
  if(si>=syls.length) return;
  var cands=syls[si].cands, nb=buf+ch, i, hit=false;

  for(i=0;i<cands.length;i++){ if(cands[i].indexOf(nb)===0){ hit=true; break; } }
  if(hit){
    buf=nb; keys++;
    var exact=false, longer=false;
    for(i=0;i<cands.length;i++){
      if(cands[i]===nb) exact=true;
      if(cands[i].length>nb.length && cands[i].indexOf(nb)===0) longer=true;
    }
    if(exact && !longer) advance(); else render();
    return;
  }
  var can=false;
  for(i=0;i<cands.length;i++){ if(cands[i]===buf){ can=true; break; } }
  if(buf && can){ advance(); feed(ch); return; }

  onMiss(ch);
}
function advance(){
  // 「ん」の次に子音が来たときなど、確定し直す経路でも1音節は完成しているので必ず1タイル塗る
  if(si<syls.length) chars += syls[si].disp.length;   // 「きょ」なら2文字、英字は1文字
  si++; buf="";
  fillOne();
  if(si>=syls.length){ finishItem(); return; }
  render();
}
function onMiss(ch){
  if(ch) showMissHint(ch, expectedChar());
  miss++; $("sMiss").textContent=miss;
  var lv=currentLevel(), max=lv.max;
  var p=document.querySelector(".panel");
  p.classList.remove("shake"); void p.offsetWidth; p.classList.add("shake");

  if(!max){                     // やさしい：くずれない。1タイルぶん埋まらないだけ
    unfillSome(1);
    render();
    return;
  }
  lives++;
  renderLives();
  if(lives>=max){
    blastAll();
    lives=0; renderLives();
    $("hint").textContent="ミス"+max+"回。最初からやり直し";
    var t=runToken;
    setTimeout(function(){ if(t===runToken) restartStage(); },1000);
  }else{
    unfillSome(1);
    render();
  }
}

/* ---------- 進行 ---------- */
function shuffled(a){
  var b=a.slice();
  for(var i=b.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=b[i]; b[i]=b[j]; b[j]=t; }
  return b;
}
function openStage(idx){
  stageIdx=idx;
  var st=STAGES[idx];
  curItems = st.shuffle ? shuffled(st.items).slice(0, st.pick||st.items.length) : st.items.slice();
  $("menu").style.display="none";
  $("play").classList.add("on");
  $("stName").textContent=st.name;
  if(document.activeElement===$("uname")) $("uname").blur();   // 名前欄にカーソルが残っていると打てないので外す
  buildKeyboard();
  cancelCelebrate(); stopFireworks(); hideToast(); $("bigmsg").classList.remove("on");
  buildGrid();
  resetRun();
}
function resetRun(){
  clearInterval(timer); running=false; stageDone=false;
  runToken++;                       // 予約済みの古いタイマーを無効にする
  keys=0; chars=0; miss=0; bestTower=0; itemIdx=0; lives=0; pausedMs=0;
  clearGrid(); renderLives();
  $("sTime").textContent="0.0秒"; $("sMiss").textContent="0";
  $("sWpm").textContent="0"; $("sEwpm").textContent="0";
  justReset=true;
  $("hint").textContent="キーを打つとスタート　・　Esc でホームへ";
  loadItem(0);
}
function restartStage(){
  // やり直しのたびにお題を引き直す（同じ文が続くとストレスなので）
  var st=STAGES[stageIdx];
  if(st.shuffle) curItems = shuffled(st.items).slice(0, st.pick||st.items.length);
  buildGrid();
  resetRun();
}
function loadItem(i){
  if(i<0 || i>=curItems.length) return;   // 古いタイマーが後から発火しても壊れないように
  itemIdx=i;
  var st=STAGES[stageIdx], raw=curItems[i];
  syls = st.mode==="kana" ? toSyllables(raw) : toDirect(raw);
  if($("optHome").checked && st.basic) syls.push({disp:"fj",cands:["fj"],home:true});
  si=0; buf="";
  $("stProg").innerHTML="お題<br>"+(i+1)+" / "+curItems.length;
  render();
  lockGlassWidth();
}
function finishItem(){
  if(itemIdx+1<curItems.length){
    tone(880,0.08,0.05);
    var t=runToken, nx=itemIdx+1, pauseFrom=Date.now();
    clearInterval(timer);                         // 切り替え中は時計を止める
    setTimeout(function(){
      if(t!==runToken) return;
      pausedMs += Date.now()-pauseFrom;           // 止まっていた分は数えない
      if(running) timer=setInterval(tick,100);
      loadItem(nx);                               // タイルは消さずに続ける
    },240);
  }else{ finishStage(); }
}
function startTimer(){
  running=true; startAt=Date.now(); pausedMs=0; justReset=false;
  $("hint").textContent="打っています…";
  timer=setInterval(tick,100);
}
function tick(){
  var sec=(Date.now()-startAt-pausedMs)/1000;
  $("sTime").textContent=sec.toFixed(1)+"秒";
  $("sWpm").textContent = sec>0?Math.round(chars/sec*60):0;
  var esec=sec+miss*MISS_PENALTY;
  $("sEwpm").textContent = esec>0?Math.round(chars/esec*60):0;
}
/* ---------- コイン（2026-09-07 本人）----------
   もらえる数＝ミスなし10／ミス1〜2は7／ミス3つ以上は5
   2回つづけてミスなし +5／3回つづけてミスなし +10（そこで連続はリセット）
   ⚠1枚＝1ポイント。10枚で1列 */
/* ⭐こども用かどうか（?kids=1）。⚠コイン・音なしは こども用だけ（2026-09-07 本人
     「大人はコイン貯める予定ない。大人は今までのをちょっと修正するイメージ」） */
var KIDS = /[?&]kids=1/.test(location.search);
var COINKEY="typingCoins_v1", STREAKKEY="typingStreak_v1";
function getCoins(){ return parseInt(localStorage.getItem(COINKEY)||"0",10)||0; }
function getStreak(){ return parseInt(localStorage.getItem(STREAKKEY)||"0",10)||0; }
function award(missCount){
  var base = (missCount===0) ? 10 : (missCount<=2 ? 7 : 5);
  var bonus = 0, st = getStreak();
  if(missCount===0){
    st += 1;
    if(st===2) bonus = 5;
    if(st>=3){ bonus = 10; st = 0; }
  }else{ st = 0; }
  try{
    localStorage.setItem(STREAKKEY, String(st));
    localStorage.setItem(COINKEY, String(getCoins()+base+bonus));
  }catch(err){}
  drawCoins(base+bonus);
  return {base:base, bonus:bonus, total:base+bonus, streak:st, miss:missCount};
}
function drawCoins(newCount){
  var host=$("coinStacks"); if(!host || !KIDS) return;
  var n=getCoins();
  /* ⚠列がはみ出すと横スクロールが出る（2026-09-07 375pxで確認）。入る数だけ出す */
  var narrow = window.innerWidth<=560, cw = narrow?34:44, gap = narrow?7:9;
  var avail = host.clientWidth || 300;
  var MAXCOL = Math.max(1, Math.floor((avail+gap)/(cw+gap)));
  $("coinNum").textContent=n;
  var STEP = 7, ONE = 16;                       /* コイン1枚＝高さ16、7ずつずらす */
  var cols=Math.ceil(n/10), show=Math.min(cols,MAXCOL), left=n, html="";
  for(var col=0; col<show; col++){
    var k=Math.min(10,left); left-=k;
    var H=(k-1)*STEP+ONE;
    html+='<svg class="cstack" viewBox="0 0 44 '+H+'" width="'+cw+'" height="'+Math.round(H*cw/44)+'">';
    /* 下から順に描く＝あとに描いたものが上に重なって、下の段の面を隠す */
    for(var i=0;i<k;i++){
      var g = col*10 + i;                       /* 下から数えた通し番号 */
      var isNew = newCount && g >= n-newCount;  /* 今もらった分だけ落とす */
      html+='<use href="#coinShape" y="'+((k-1-i)*STEP)+'"'
          + (isNew ? ' class="drop" style="animation-delay:'+((g-(n-newCount))*45)+'ms"' : '')
          + '/>';
    }
    html+='</svg>';
  }
  host.innerHTML=html;
  $("coinMore").textContent = left>0 ? ("ほか "+left+" 枚") : "";
}

function finishStage(){
  clearInterval(timer); running=false; stageDone=true;
  var sec=(Date.now()-startAt-pausedMs)/1000;
  var w=Math.round(chars/sec*60);
  var e=Math.round(chars/(sec+miss*MISS_PENALTY)*60);
  var perfect=(miss===0);
  var stName=STAGES[stageIdx].name;

  // 保存する前に、これまでの自己ベストを調べておく
  var prevBest=0, prevCount=0;
  getLogs().forEach(function(r){
    if(r.stage===stName){ prevCount++; if(r.ewpm>prevBest) prevBest=r.ewpm; }
  });
  var isRecord = (prevCount>0 && e>prevBest);
  var isFirst  = (prevCount===0);
  if(isRecord){ try{ localStorage.setItem("typingLastRecord", stName); }catch(err){} }

  saveLog({date:new Date().toISOString(), name:($("uname").value||"わたし"),
    stage:stName, keys:keys, chars:chars, sec:Math.round(sec*10)/10,
    miss:miss, wpm:w, ewpm:e, tower:bestTower, total:cellTotal, perfect:perfect?1:0});

  var got = award(miss);
  lastResult={sec:sec,w:w,e:e,perfect:perfect,keys:keys,chars:chars,miss:miss,got:got,
              tower:bestTower,total:cellTotal,stage:stName,
              isRecord:isRecord,isFirst:isFirst,prevBest:prevBest};
  renderStageCards();

  if(perfect) celebrate();
  else setTimeout(afterStage,400);
}
/* ステージが終わったあと：埋まったタイルはそのまま残す。
   リセットは「やり直し」を押したときだけ。 */
function afterStage(){
  showToast();
  $("hint").textContent="Esc または やり直し でもう一度　・　Esc 2回でホーム";
}
var toastTimer=null;
function showToast(){
  var r=lastResult; if(!r) return;
  $("toastMain").innerHTML =
    (r.perfect ? '<span style="color:var(--gold)">★ パーフェクト</span>' : 'おつかれさま')
    + (r.isRecord ? '<span class="trec">記録更新 ✨</span>' : '');
  $("toastSub").innerHTML =
    "本当の速さ <b>"+r.e+"</b> 文字/分　ミス "+r.miss+" 回";
  $("toast").classList.add("on");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(hideToast, 7000);
}
function hideToast(){ clearTimeout(toastTimer); $("toast").classList.remove("on"); }
function showResult(){
  var r=lastResult; if(!r) return;
  $("resTitle").textContent = r.perfect ? "パーフェクト！" : "おつかれさま";
  $("resSub").textContent = r.stage + " をクリアしました";
  if(r.isRecord){
    $("resRecord").innerHTML='最高記録が出ました ✨'+
      '<small>本当の速さ '+r.prevBest+' → <b>'+r.e+'</b> 文字/分</small>';
    $("resRecord").style.display="block";
  }else if(r.isFirst){
    $("resRecord").innerHTML='はじめての記録 ✨'+
      '<small>本当の速さ <b>'+r.e+'</b> 文字/分。ここが出発点です</small>';
    $("resRecord").style.display="block";
  }else{
    $("resRecord").style.display="none";
  }
  $("resPerfect").style.display = r.perfect ? "block" : "none";
  if(r.got){
    var g=r.got, sub;
    if(g.bonus) sub = (g.miss===0?"ミスなし 10":"") + " ＋ つづけてミスなし " + g.bonus;
    else if(g.miss===0) sub = "ミスなし。あと" + (2-g.streak<=0?1:2-g.streak) + "回つづけるとボーナス";
    else if(g.miss<=2) sub = "ミス " + g.miss + " 回";
    else sub = "ミス " + g.miss + " 回";
    $("resCoin").innerHTML = "コインを "+g.total+" 枚もらいました<small>"+sub+"</small>";
    $("resCoin").style.display="block";
  }else{ $("resCoin").style.display="none"; }
  $("rKeys").textContent=(r.chars||r.keys)+" 文字";
  $("rTime").textContent=r.sec.toFixed(1)+" 秒";
  $("rMiss").textContent=r.miss+" 回";
  $("rTower").textContent=r.tower+" / "+(r.total||r.tower)+" タイル";
  $("rWpm").textContent=r.w+" 文字/分";
  $("rEwpm").textContent=r.e+" 文字/分";
  $("resNote").innerHTML = r.perfect
    ? "ミスがゼロなので、見かけの速さと本当の速さが同じです。<b>これがいちばん強い状態</b>です。"
    : ((r.total&&r.tower<r.total) ? "タイルが "+(r.total-r.tower)+" つ残ったのは、ミスでくずれた分です。<br>" : "")+
      "ミス"+r.miss+"回で、打ち直しに <b>およそ"+Math.round(r.miss*MISS_PENALTY)+"秒</b>かかっています。<br>"+
      "見かけは "+r.w+" 文字/分でも、本当の速さは <b>"+r.e+" 文字/分</b>。<br>"+
      "<b>ゆっくりでもミスをしない人のほうが、結果的に速く終わります。</b>";
  $("btnNext").style.display = (stageIdx+1<STAGES.length) ? "" : "none";
  $("ovRes").classList.add("on");
  if(!r.perfect) tone(784,0.16,0.07);
}
function backToMenu(){
  clearInterval(timer); running=false;
  cancelCelebrate(); stopFireworks(); hideToast(); $("bigmsg").classList.remove("on");
  $("play").classList.remove("on");
  $("menu").style.display="";
  $("ovRes").classList.remove("on");
  renderStageCards();
}

/* ---------- 記録 ---------- */
function getLogs(){ try{ return JSON.parse(localStorage.getItem(LOGKEY)||"[]"); }catch(e){ return []; } }
function saveLog(rec){
  var a=getLogs(); a.push(rec);
  if(a.length>500) a=a.slice(a.length-500);
  try{ localStorage.setItem(LOGKEY,JSON.stringify(a)); }catch(e){}
}
function renderLogs(){
  var a=getLogs().slice().reverse();
  if(!a.length){ $("logBody").innerHTML='<div class="empty">まだ記録がありません</div>'; return; }
  var h='<table><tr><th>日時</th><th>ニックネーム</th><th>ステージ</th><th>ミス</th><th>タイル</th><th>埋まった率</th><th>本当</th></tr>';
  for(var i=0;i<a.length && i<60;i++){
    var r=a[i], d=new Date(r.date);
    var ds=(d.getMonth()+1)+"/"+d.getDate()+" "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
    h+="<tr><td>"+ds+(r.perfect?' <span style="color:#c99a2e">★</span>':"")+"</td><td>"+esc(r.name||"")+
       "</td><td>"+esc(r.stage)+"</td><td>"+r.miss+"</td><td>"+
       (r.tower||0)+(r.total?(" / "+r.total):"")+"</td><td>"+
       (r.total?(Math.round((r.tower||0)/r.total*100)+"%"):"-")+"</td><td><b>"+r.ewpm+"</b></td></tr>";
  }
  h+="</table>";
  if(a.length>60) h+='<div class="empty">（新しい60件を表示。CSVには全部出ます）</div>';
  $("logBody").innerHTML=h;
}
function exportCsv(){
  var a=getLogs();
  if(!a.length){ alert("記録がありません"); return; }
  var rows=[["日時","ニックネーム","ステージ","文字数","打鍵数","秒",
             "ミス","ミス率(%)","タイル最高","タイル総数","埋まった率(%)",
             "見かけの速さ(文字/分)","本当の速さ(文字/分)","パーフェクト"]];
  a.forEach(function(r){
    var d=new Date(r.date);
    var ds=d.getFullYear()+"/"+(d.getMonth()+1)+"/"+d.getDate()+" "+
           ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
    var tw=r.tower||0, tt=r.total||0;
    var allKeys=(r.keys||0)+(r.miss||0);                       // 打った回数（ミス含む）
    var missRate = allKeys ? Math.round(r.miss/allKeys*1000)/10 : "";
    var fillRate = tt ? Math.round(tw/tt*1000)/10 : "";
    rows.push([ds,r.name,r.stage,(r.chars||r.keys),r.keys,r.sec,
               r.miss,missRate,tw,tt||"",fillRate,
               r.wpm,r.ewpm,r.perfect?"★":""]);
  });
  var csv=rows.map(function(r){
    return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(",");
  }).join("\r\n");
  var blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
  var url=URL.createObjectURL(blob), a2=document.createElement("a"), t=new Date();
  a2.href=url;
  /* 🔴 ファイル名にニックネームを入れる（2026-09-05）。
     ⚠授業で集めると、日付だけでは全員が同じファイル名になり、開くまで誰のか分からない。
     ⭐ファイル名に使えない記号と空白は外す。長い名前は20字まで。 */
  var _nm="";
  try{ _nm=(localStorage.getItem("typingName")||"").trim(); }catch(e){}
  _nm=_nm.replace(/[\\\\/:*?"<>|]/g,"").replace(/[ 　]+/g,"").slice(0,20);
  a2.download="タイピング記録_"+(_nm?_nm+"_":"")+t.getFullYear()+("0"+(t.getMonth()+1)).slice(-2)+("0"+t.getDate()).slice(-2)+".csv";
  document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
  setTimeout(function(){ URL.revokeObjectURL(url); },1000);
}

/* ---------- ステージカード ---------- */
function renderStageCards(){
  var logs=getLogs(), best={};
  var lastRec=""; try{ lastRec=localStorage.getItem("typingLastRecord")||""; }catch(err){}
  logs.forEach(function(r){ if(!best[r.stage]||r.ewpm>best[r.stage]) best[r.stage]=r.ewpm; });
  var el=$("stages"); el.innerHTML="";
  STAGES.forEach(function(s,i){
    var d=document.createElement("button");
    d.className="stage";
    var stock = s.shuffle ? '<div class="no" style="margin-top:6px">'+s.items.length+'問から毎回'+(s.pick||s.items.length)+'問</div>' : '';
    d.innerHTML='<div class="no">STAGE '+(i+1)+'</div><div class="nm">'+esc(s.name)+
                '</div><div class="ds">'+esc(s.desc)+'</div>'+stock+
                '<div class="best">'+(best[s.name]?("自己ベスト "+best[s.name]+" 文字/分"+
                  (s.name===lastRec?'<span class="rec">★ 記録更新</span>':"")):"")+'</div>';
    d.onclick=function(){ openStage(i); };
    el.appendChild(d);
  });
}

/* ---------- キー入力 ---------- */
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){
    if($("ovLog").classList.contains("on")){ $("ovLog").classList.remove("on"); return; }
    if($("ovRes").classList.contains("on")){ $("ovRes").classList.remove("on"); return; }
    if($("play").classList.contains("on")){
      e.preventDefault();
      // まっさらな状態ならホームへ。そうでなければ、まずリセット
      if(justReset){ backToMenu(); }
      else { hideToast(); restartStage(); }
      return;
    }
  }
  if(e.isComposing || e.keyCode===229 || e.key==="Process"){ $("imeWarn").classList.add("on"); return; }
  if(document.activeElement && document.activeElement.id==="uname") return;
  if(!$("play").classList.contains("on")) return;
  if(stageDone) return;                 // 終わったあとは、打っても勝手に始まらない
  if($("ovRes").classList.contains("on")||$("ovLog").classList.contains("on")) return;
  if(e.ctrlKey||e.altKey||e.metaKey) return;
  if(e.key.length!==1) return;
  e.preventDefault();
  $("imeWarn").classList.remove("on");
  if(!running) startTimer();
  feed(e.key.toLowerCase());
});

/* ---------- ボタン ---------- */
$("btnBack").onclick=backToMenu;
$("btnRetry").onclick=function(){ cancelCelebrate(); restartStage(); };
$("btnMenu").onclick=backToMenu;
$("btnAgain").onclick=function(){ $("ovRes").classList.remove("on"); hideToast(); restartStage(); };
$("btnNext").onclick=function(){ $("ovRes").classList.remove("on"); openStage(Math.min(stageIdx+1,STAGES.length-1)); };
$("btnLog").onclick=function(){ renderLogs(); $("ovLog").classList.add("on"); };
$("btnCloseLog").onclick=function(){ $("ovLog").classList.remove("on"); };
$("xLog").onclick=function(){ $("ovLog").classList.remove("on"); };
$("xRes").onclick=function(){ $("ovRes").classList.remove("on"); };
$("toastMore").onclick=function(){ hideToast(); showResult(); };
$("toastX").onclick=hideToast;
$("toastAgain").onclick=function(){ hideToast(); restartStage(); };
$("btnCsv").onclick=exportCsv;
$("btnClear").onclick=function(){
  if(confirm("記録をぜんぶ消します。よろしいですか？")){
    localStorage.removeItem(LOGKEY); renderLogs(); renderStageCards();
  }
};
$("ovLog").onclick=function(e){ if(e.target===this) this.classList.remove("on"); };
$("ovRes").onclick=function(e){ if(e.target===this) this.classList.remove("on"); };

$("uname").value=localStorage.getItem("typingName")||"";
$("uname").oninput=function(){ localStorage.setItem("typingName",this.value); };

renderStageCards();
/* こども用は、音を最初から消しておく（2026-09-07 本人・教室で30台が一斉に鳴らないように） */
if(KIDS){ document.body.classList.add("kids"); if($("optSound")) $("optSound").checked=false; }
drawCoins();
/* 画面の幅が変わったら、入る列だけ描き直す */
window.addEventListener("resize", function(){ if(window.coinResize) clearTimeout(window.coinResize); window.coinResize=setTimeout(drawCoins,150); });
