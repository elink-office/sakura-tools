/* =========================================================
   ローマ字の仕組み（かなとローマ字の表・かなを1音ずつに分ける・英字を2文字ずつに分ける）
   ⭐2026-10-23 typing.js から分けた（本人「設計大事」・文章のタイピング /typing/bun/ と共通で使うため）
   ⭐ここを直すと、タッチタイピング（一般用・学生用）と文章のタイピングの両方が変わる
   ⚠読み込む順＝このファイル → typing.js（または bun.js）
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

/* ⭐読みが2通りあるところ（2026-10-24・文章のタイピング）＝ {おんれい|おれい} と書く（本人「おれいって書く人もいるはず」）。
   ⭐かたまりごと1つの「音」にして、書き方（cands）に両方の読みのローマ字を全部入れる＝打つ仕組み（typing.js）はそのまま使える
   ⭐画面に出す読み（disp）は1つ目。漢字の行も1つ目の読みの長さで灰色にする
   ⚠かっこの中は、それだけで読みが決まる切れ目にする（っ・ん で終わらない）。例＝{ろくじゅっさい|ろくじっさい}（✕ ろく{じゅっ|じっ}さい） */
function toSyllables(kana){
  if(kana.indexOf("{")<0) return toSyllables0(kana);
  var out=[], re=/\{([^}]*)\}/g, last=0, m;
  while((m=re.exec(kana))){
    if(m.index>last) out=out.concat(toSyllables0(kana.slice(last,m.index)));
    var alts=m[1].split("|"), all=[];
    alts.forEach(function(a){
      var c=[""];
      toSyllables0(a).forEach(function(sy){
        var n=[]; c.forEach(function(x){ sy.cands.forEach(function(y){ n.push(x+y); }); }); c=n;
      });
      c.forEach(function(x){ if(all.indexOf(x)<0) all.push(x); });
    });
    out.push({disp:alts[0],cands:all});
    last=re.lastIndex;
  }
  if(last<kana.length) out=out.concat(toSyllables0(kana.slice(last)));
  return out;
}
/* かな文字列を「音節」に分解する（{ } の無いもの） */
function toSyllables0(kana){
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
      /* ⭐最後の「ん」は n 1つで終わる。nn と打つ人の2つめの n は、次で1回だけ見のがす（swallowN）
           （2026-09-18 本人「んで終わるときにnだけにしてほしい」「私はどっちもやるわ」「chiとかtiでも見分けつくのに」） */
      if(!nch){ out.push({disp:"ん",cands:["n","xn"],endN:true}); i+=1; continue; }
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
/* ⭐英字は2文字で1マス（2026-09-16 本人「2文字でいこう」）。
   ⚠日本語は「1音＝1マス」（「さ」は s a と2回打って1マス）。英語も手ごたえをそろえる。
   ⭐スペースは前のかたまりにくっつける＝かたまりの頭に空白を置かない */
function toDirect(str){
  var out=[], buf="";
  for(var i=0;i<str.length;i++){
    var c=str.charAt(i);
    if(buf.length>=2 && c!==" "){ out.push({disp:buf,cands:[buf]}); buf=""; }
    buf+=c;
  }
  if(buf) out.push({disp:buf,cands:[buf]});
  return out;
}

/* ---------- 速さの数え方（タッチタイピングと文章のタイピングで共通） ---------- */
var MISS_PENALTY=2.5;   // ミス1回あたりの実質ロス（秒）＝「本当の速さ」はミスの打ち直しの時間を足して数える

/* ---------- タイルの色（さくらタイピングと文章のタイピングで共通・2026-10-24 typing.js から移した） ----------
   ⭐選んだ色は localStorage の "typingTileColor" に覚える（学生用は "gk_typingTileColor"）。どちらのページで選んでも引き継がれる */
var BLOCKCOL=["#e67999","#f2a163","#e8c456","#69b992","#58baca","#6e89d8","#a17ad9"];
/* ⭐タイルの色を選べる（2026-09-27 本人「色がたくさんあるのをうっとうしいと思う人もいるかなと思って」）。
   ⭐カラフル＝BLOCKCOL の7色。単色＝7色から1色取り出して、濃い・ふつう・薄いの3段。グレー＝モノトーン。
   ⭐効くのは 練習のタイル・ステージの番号のタイル（とページの色）。⚠紙吹雪は BLOCKCOL のまま（本人「紙吹雪は今のままでいいよ」） */
var TILEPICK=[
  ["colorful","カラフル",null],
  ["pink","ピンク",BLOCKCOL[0]], ["orange","オレンジ",BLOCKCOL[1]], ["yellow","きいろ",BLOCKCOL[2]],
  ["green","みどり",BLOCKCOL[3]], ["cyan","みずいろ",BLOCKCOL[4]], ["blue","あお",BLOCKCOL[5]],
  ["purple","むらさき",BLOCKCOL[6]], ["gray","グレー","#9ba1a8"]
];
