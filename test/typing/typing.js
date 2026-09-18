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

/* ---------- ステージ ----------
   ホームポジション = 左 a s d f / 右 j k l ;
   そこから各指が「上・中央・下」の3段を担当する。
   日本語のローマ字で使わない q v x はごく少なめ。母音 a i u e o を多めに。
   fj:false のステージでは、終わりの f j を出さない。 */
/* ⭐量を変えた（2026-09-15 本人）
   ・ステージ1〜5＝「1分100文字の人がちょうど1分で終わる」量＝f j の戻りも含めて約100文字（速さの数え方と同じ）。
     ⚠1〜3だけ多かったので、今ある項目を減らした（新しい項目は足していない）。4・5はもとから約100
   ・単語／日常のことば／ながめ／英単語とメール＝本人「全部今の3倍の量に」。1回に出す数（pick）は変えていない
     ⚠「ー」と小さい字だけの音は打てないので入れていない（スクリプトで確かめた） */
var STAGES=[
 {name:"ホームポジション",basic:true,mode:"direct",
  desc:"中央の段。左は a s d f、右は j k l。指を1本も動かさずに打てるキーだけ。",
  items:[
    "ffjj","ddkk","ssll","aass","fjfj","dkdk","slsl","asdfjkl","fjdksla","asa","kasa","saka",
    "kaja","asakasa","kasadasa"
  ]},

 {name:"ひとさし指の 上・中央・下",basic:true,mode:"direct",
  desc:"f から上の r・下の v へ。j から上の u・下の m へ。伸ばしたら必ず戻る。",
  items:[
    "frf","ftf","fgf","juj","jyj","jhj","fbf","jnj","jmj","fvf","fufu","huhu","gugu","bubu",
    "tutu","furu","yumu","nuru"
  ]},







 {name:"ホームポジション ランダム",basic:true,mode:"direct",random:true,pick:15,
  desc:"ホーム・上の段・下の段のキーを、順番なしでランダムに。毎回ちがう並びが出ます。",
  items:[]},

 {name:"あいうえお",basic:true,mode:"kana",shuffle:true,
  desc:"五十音と濁点・半濁点。ローマ字は2文字。を8本の指がぜんぶ動きます。",
  items:["あいうえお","かきくけこ","さしすせそ","たちつてと","なにぬねの",
         "はひふへほ","まみむめも","やゆよ","らりるれろ","わをん",
         "がぎぐげご","ざじずぜぞ","だぢづでど","ばびぶべぼ","ぱぴぷぺぽ"]},

 {name:"きゃきゅきょ",basic:true,mode:"kana",shuffle:true,
  desc:"ローマ字が3文字になる音。ここがいちばんの山です。短いので何度でもどうぞ。",
  items:["きゃきゅきょ","ぎゃぎゅぎょ","しゃしゅしょ","じゃじゅじょ",
         "ちゃちゅちょ","にゃにゅにょ","ひゃひゅひょ","びゃびゅびょ",
         "ぴゃぴゅぴょ","みゃみゅみょ","りゃりゅりょ"]},

 /* ⭐1回30語＝タイル約100枚（2026-09-18 本人「100だと1分100だから、ちょうど1分か」→「それでいこう」）。
      ⚠文字はタイルの約1.07倍（しゅ＝2文字で1枚）＝100/1分の人で1分と少し。前は15語＝約50枚 */
 {name:"単語",mode:"kana",shuffle:true,pick:30,fj:false,
  desc:"ことばを1つずつ。短いので、正確さだけに集中できます。",
  items:[
    "あさごはん","でんしゃ","かいもの","せんたく","そうじ","しごと","やすみ","てんき","まいにち","ともだち","かぞく","がっこう","きょうしつ",
    "のみもの","たべもの","くだもの","やさい","さかな","たまご","ごはん","おちゃ","こうちゃ","さいふ","かばん","くつ","ぼうし","とけい","でんわ",
    "てがみ","しんぶん","ざっし","えんぴつ","けしごむ","つくえ","まど","だいどころ","おふろ","こうえん","えき","みせ","びょういん","ゆうびんきょく",
    "としょかん","じてんしゃ","しゅくだい","りょうり","きっぷ","やくそく","じゅんび","そうだん","へんじ","しゅうまつ","ひるやすみ","おてつだい",
    "かたづけ","ならいごと","さんぽ","ゆうがた","あさひ","あめ","ゆき","かぜ","くも","そら","うみ","やま","かわ","もり","はな","くさ",
    "いぬ","ねこ","とり","うさぎ","さくら","もみじ","ひまわり","あさがお","すいか","みかん","りんご","ぶどう","いちご","もも","なし","かき",
    "だいこん","にんじん","きゅうり","なす","たまねぎ","じゃがいも","とうふ","なっとう","みそしる","おにぎり","おべんとう","おかし","ぎゅうにゅう",
    "すいとう","はし","おさら","ちゃわん","こっぷ","なべ","ほうちょう","れいぞうこ","せんぷうき","そうじき","でんき","かがみ","まくら","ふとん",
    "たたみ","かいだん","げんかん","にわ","やね","かさ","てぶくろ","くつした","ようふく","はんかち","めがね","ゆびわ","かみ","はさみ","のり",
    "じょうぎ","ふでばこ","きょうかしょ","こくばん","たいいく","おんがく","さんすう","こくご","りか","しゃかい","きゅうしょく","ほうかご","せんせい",
    "せいと","がくせい","だいがく","じゅぎょう","しけん","れんしゅう","なかま","せんぱい","こうはい","おとうと","いもうと","おばあちゃん",
    "おじいちゃん","あかちゃん","びよういん","ゆうえんち","どうぶつえん","すいぞくかん","びじゅつかん","えいがかん","ぎんこう","やおや","ぱんや","はなや",
    "くうこう","ばすてい","しんごう","ほどう","こうさてん","ちず","りょこう","おみやげ","しゃしん","にっき","たんじょうび","おまつり"
  ]},

 {name:"日常のことば",mode:"kana",shuffle:true,pick:12,fj:false,
  desc:"短い文を、スペースを打たずに最後まで。",
  items:[
    "おなかすいた","のどがかわいた","きょうはいいてんきだ","はやくかえりたい","そろそろおきなくちゃ","あしたのらんちはなにしよう","ねむいけどもうすこしがんばる",
    "あたらしいくつがほしい","でんしゃがおくれている","こんやはさむくなりそう","そとはあめがふっている","おひるはなにをたべようかな","せんたくものがかわかない",
    "ゆうびんきょくによっていこう","れいぞうこがからっぽだ","あしたはやすみだからうれしい","しゅうまつはなにをしようかな","ちょっとつかれたのでやすむ",
    "あたたかいのみものがほしい","でかけるまえにかぎをかける","かみのけをきりにいきたい","きょうはよくあるいたとおもう","あさからばたばたしている",
    "すこしだけまどをあけておく","ほんやによってかえりたい","おふろがわいたのではいろう","あしたのてんきをしらべておく","ひるねをしたらすっきりした",
    "ともだちにれんらくをしなくちゃ","あまいものがたべたくなった","そうじきをかけたらつかれた","まどのそとがしずかになった","しごとがおもったよりすすんだ",
    "ねるまえにすとれっちをする","あるいてえきまでいくことにした","ゆうごはんはなにがいいかな","ぽすとにてがみをだしにいく","まいにちすこしずつつづける",
    "あたらしいてちょうをつかいはじめる","くつしたのかたほうがみつからない","きょうはすこしさむい","あさはぱんをたべた","かさをわすれてしまった","でんしゃにまにあった",
    "おちゃをいれてひとやすみ","へやのでんきをけす","まどをあけてかぜをいれる","あしたははやくおきる","しゅくだいがやっとおわった","ともだちとえきであう",
    "おひるはおにぎりにした","すこしだけひるねをする","こんびにによってかえる","あめがやんでよかった","きょうはばすでいく","かばんがすこしおもい",
    "おなかがいっぱいになった","ねるまえにはをみがく","あさのそらがきれいだ","さいふをいえにわすれた","じかんがあっというまだ","ゆうやけがとてもきれい",
    "あたらしいほんをかった","せんたくものをたたむ","おふろのあとにみずをのむ","すいようびはいそがしい","きんようびはすこしらく","らいげつはりょこうにいく",
    "はなにみずをやる","ねこがひなたでねている","いぬのさんぽにいく","えきまではしってきた","でんわがなったのででた","めがねをどこにおいたかな",
    "きょうのゆうごはんはかれい","あついのでぼうしをかぶる","さむいのでてぶくろをする","にもつがとどいた","てがみのへんじをかく","ごみをだしてからでかける",
    "かぎをかけたかしんぱいだ","じゅぎょうがはじまる","きょうしつのまどをあける","としょかんでほんをかりる","かだいをきょうだす","せんせいにしつもんする",
    "ともだちとおひるをたべる","かえりにぱんをかう","つくえのうえをかたづける","ぎゅうにゅうがきれている","たまごをみっつかう","やさいをこまかくきる",
    "なべにみずをいれる","おゆがわいたらしらせて","ことしのなつはあつい","あきになってすずしい","ふゆはこたつがいちばん","はるはさくらがさく","そとでたいそうをする",
    "すこしあるいてからかえる","きょうはよくねむれた","あさからあめがふっている","かぜがつよくてさむい","ゆきがすこしつもった","みちがこんでいる",
    "しんごうがあおになった","ばすがなかなかこない","じてんしゃでがっこうへいく","かみをみじかくきった","あたらしいくつでかける","ふくをえらぶのにまよう",
    "ともだちにおみやげをわたす","しゃしんをいっしょにとる","にっきをすこしだけかく","まいあさみずをいっぱいのむ","よるはしずかでおちつく","きょうはおつかれさまでした",
    "あしたもがんばろう","ゆっくりおふろにはいる","もうすこしでおわりそう"
  ]},

 {name:"日常のことば（ながめ）",mode:"kana",shuffle:true,pick:8,fj:false,
  desc:"止まらずに打ちきる練習。あせらないこと。",
  /* ⭐句読点（、。）を入れた（2026-09-17 本人「日本語の長文、句読点を入れてほしい」）。、は , ／。は . で打つ */
  items:[
    "しゅくだいがおわらないので、あしたにまわす。","がっこうまであるいていくと、にじゅっぷんかかる。","ともだちとえいががみたいけど、よていがあわない。",
    "あさごはんは、ぱんとたまごとさらだにした。","そろそろねようとおもうけど、まだねむくない。","らいしゅうのよていを、てちょうにかきこんだ。",
    "かばんのなかをせいりしたら、えんぴつがたくさんでてきた。","あめがふりそうなそらだから、かさをもっていくことにする。","あさはやくおきたので、きょうはじかんによゆうがある。",
    "でかけるまえに、てんきよほうをかくにんしておいた。","きょうはいちにち、よくがんばったとおもう。","ひるやすみに、こうえんまであるいていってきた。",
    "れいぞうこのなかをみて、こんばんのこんだてをきめる。","しゅうまつは、そうじをまとめてやるつもりでいる。","あしたのじゅんびをしてから、ねることにする。",
    "ともだちからひさしぶりにれんらくがきて、うれしい。","あたらしいくつをはいたら、すこしあるきにくかった。","でんしゃのなかでほんをよんでいたら、ねすごした。",
    "あさごはんをたべながら、てんきよほうをみていた。","きょうは、なにもしないひにするときめてしまった。","ゆうがたになったら、きゅうにすずしくなってきた。",
    "かいものにいったら、おもったよりたかくておどろいた。","ひさしぶりにながくあるいたら、あしがいたくなった。","そとがくらくなるのが、すこしずつはやくなってきた。",
    "あたたかいおちゃをのんだら、きもちがおちついた。","あさおきたら、そとがまっしろになっていた。","えきのかいだんをのぼると、いきがきれる。",
    "ともだちと、ひさしぶりにゆっくりはなしをした。","あたらしいてちょうに、らいげつのよていをかいた。","ばすをまっているあいだに、ほんをすこしよんだ。",
    "おひるやすみに、ともだちとこうえんでおべんとうをたべた。","あめがつよくなってきたので、はやめにかえることにした。","じゅぎょうのあとで、せんせいにしつもんをしにいった。",
    "としょかんでかりたほんを、かえすのをわすれていた。","れいぞうこにあるやさいで、かんたんなりょうりをつくった。","せんたくものをほしたとたんに、あめがふりはじめた。",
    "でんしゃがおくれていたので、いつもよりはやくいえをでた。","あたたかいのみものをもって、まどのそとをながめる。","しゅうまつは、かぞくでちかくのやまにのぼるよていだ。",
    "じてんしゃのたいやにくうきをいれてから、でかけた。","ねるまえにあしたのふくをえらんでおくと、あさがらくだ。","ひさしぶりにてがみをかいたら、じがうまくかけなかった。",
    "ともだちのたんじょうびに、ちいさなはなたばをおくった。","かいものにいったのに、かいたいものをかいわすれた。","きょうはかぜがきもちよかったので、とおまわりしてかえった。",
    "まちのおまつりで、たこやきとかきごおりをたべた。","みちにまよったので、ちずをみながらゆっくりあるいた。","やすみのひは、おそくまでねてしまうことがおおい。",
    "ゆうがたのそらがあかくそまって、とてもきれいだった。","がっこうのかえりに、ともだちとえきまでいっしょにあるいた。","あさごはんをしっかりたべると、ごぜんちゅうがんばれる。",
    "へやのかたづけをしていたら、むかしのしゃしんがでてきた。","ねこがまどのそばでいねむりをしているのを、みていた。","あしたははやいので、きょうははやめにねることにする。",
    "ひとりでえいがをみにいったら、とてもおもしろかった。","しけんのまえのひは、いつもよりすこしはやくおきた。","ちいさなこうえんで、こどもたちがげんきにあそんでいた。",
    "おちゃをいれようとしたら、おゆがまだわいていなかった。","だいがくのしょくどうで、ともだちとおひるごはんをたべた。","らいしゅうのはっぴょうにむけて、すこしずつじゅんびをする。",
    "かさをもっていかなかったので、ぬれてかえってきた。","はじめていくおみせだったので、すこしどきどきした。","まいにちすこしずつれんしゅうすると、うまくなってくる。",
    "けいたいのじゅうでんがすくなくなってきて、あせった。","きょうのゆうごはんは、みんなですきやきをたべた。","そとがさむかったので、あたたかいみそしるをのんだ。",
    "やまのうえからみたけしきは、わすれられない。","あさのでんしゃはこんでいて、すわることができなかった。","ともだちから、おすすめのほんをかしてもらった。",
    "しゅくだいをおえてから、ゆっくりおふろにはいった。","はなびたいかいのひは、えきがひとでいっぱいだった。","ひさしぶりにそうじをしたら、へやがひろくなった。",
    "ゆきがふったので、ながぐつをはいてでかけた。","あたらしいくつをはいて、すこしとおくまでさんぽした。","きょうのできごとを、にっきにみじかくかいた。"
  ]},

 {name:"英単語",lang:"en",mode:"direct",shuffle:true,pick:15,
  desc:"ふだん使う英語。単語と、2〜3語のまとまりがランダムに出ます。",
  items:[
    "morning","afternoon","evening","night","today","tomorrow","yesterday","weekend","holiday",
    "vacation","school","class","teacher","student","friend","classmate","homework","test",
    "notebook","pencil","eraser","textbook","library","classroom","lunch","breakfast","dinner",
    "water","juice","tea","bread","rice","fruit","apple","banana","tomato","egg","meat",
    "vegetable","snack","station","train","bus","bike","street","shop","store","money","wallet",
    "ticket","phone","message","email","internet","computer","camera","music","movie","game",
    "sport","soccer","baseball","tennis","swimming","practice","club","team","hobby","travel",
    "hotel","airport","weather","rain","snow","wind","cloud","sunny","hot","cold","warm","cool",
    "spring","summer","autumn","winter","health","hospital","doctor","medicine","sleep","dream",
    "happy","sad","angry","tired","hungry","thirsty","busy","free","easy","difficult",
    "important","interesting","boring","kind","funny","quiet","careful","early","late","fast",
    "slow","near","far","new","old","young","big","small","long","short","clean","safe","cheap",
    "expensive","delicious","favorite","together","sometimes","always","never","often","usually",
    "maybe","really","almost","again","still","already","soon","later","before","after",
    "because","sorry","please","hello","goodbye","welcome","ready","sure","fine","great","nice",
    "good","better","best","right","wrong","help","start","stop","finish","forget","remember",
    "understand","think","know","learn","teach","study","ask","answer","talk","speak","listen",
    "read","write","watch","look","find","choose","decide","try","need","want","like","love",
    "enjoy","hope","wait","meet","visit","invite","call","send","bring","carry","buy","sell",
    "use","make","take","give","get","keep","put","open","close","turn","move","change","wash",
    "cook","eat","drink","wake","walk","run","jump","ride","drive","arrive","leave","return",
    "stay","live","work","rest","play","smile","laugh","cry","worry","relax","hurry","share",
    "borrow","begin","follow","thank you","good morning","good afternoon","good evening",
    "good night","see you","see you later","excuse me","no problem","you are welcome",
    "take care","well done","good luck","of course","not at all","just a moment","i see",
    "me too","how are you","how much","how many","what time","right now","over there",
    "next time","last night","this morning","every day","good idea","sounds good","let me see",
    "never mind","by the way","after school","on the way","in a hurry","at home","go to school",
    "have breakfast","have lunch","have dinner","do homework","take a bath","take a bus",
    "catch the train","miss the bus","wake up early","go to bed","brush my teeth",
    "wash my hands","clean my room","walk the dog","watch tv","listen to music","play the piano",
    "read a book","write a letter","send a message","check the time","buy a ticket",
    "open the window","close the door","sit down","stand up","come here","look at this",
    "try again","slow down","hurry up","cheer up","good job","happy birthday","see you tomorrow",
    "have a seat","talk to you","thank you again"
  ]},

 {name:"日常のことば（英語）",lang:"en",mode:"direct",shuffle:true,pick:8,
  desc:"日常の会話文。少し長めの英語を、止まらずに打ちきる練習です。",
  items:[
    "how was your weekend","i got up early this morning","what time do you go to school",
    "i usually take the bus to school","the train was late again today",
    "i forgot my notebook at home","can you help me with my homework",
    "i have a test next monday","let us have lunch together","what do you want to eat",
    "i am hungry and a little tired","this coffee is really good","i will call you after school",
    "sorry i am running a little late","it is raining hard outside",
    "do not forget your umbrella","the weather will be nice tomorrow",
    "it is getting cold these days","i like reading books on the train",
    "what kind of music do you like","i watched a good movie last night",
    "my brother plays soccer every day","i want to travel abroad someday",
    "have you ever been to okinawa","the party starts at seven","please send me a message later",
    "i will be there in ten minutes","could you say that again please",
    "i do not understand this question","thank you for your help today",
    "see you at the station at noon","i am looking for my wallet","how much is this ticket",
    "excuse me where is the restroom","can i take a picture here","i would like a cup of tea",
    "the shop opens at ten in the morning","my phone battery is almost dead",
    "i need to clean my room today","i went shopping with my friend",
    "we walked in the park after dinner","i am going to bed early tonight",
    "do you have any plans this weekend","let us meet in front of the library",
    "i practice the piano every evening","she is good at speaking english",
    "i want to be better at english","keep trying and you will get better",
    "that sounds like a good idea","i am glad to hear that","take care and see you next week",
    "please tell me if you need help","the room was very quiet last night",
    "i left my bag on the train","we have a school festival in october",
    "my father cooks dinner on sundays","i drink water when i wake up",
    "let us start with an easy question","i will remember this word today",
    "do you want to go for a walk"
  ]}
];

/* ⭐ステージ12＝ミスなしチャレンジ（2026-09-15 本人）
   本人「タイルの数を決めて、最後まで行けるかどうか」「1回目は少し大きいタイル、2回目はもっと、3回目はもっと」
   ⭐お題はステージ6〜11の言葉からランダム（本人「ホームポジションはなし」）
   🟡本の一節（青空文庫）・聞いたことのない言葉は、あとで足す（本人「今決めない。また依頼する」）
   ⭐1回まちがえたら、その回をやり直し。塗りきったら次の回は1.5倍（上限400枚）。
     タイルの大きさは buildGrid が枚数から自動で決める＝枚数を増やすだけで小さくなる */
STAGES.push({name:"ミスなしチャレンジ",mode:"mix",challenge:"ja",
  desc:"決めた数のタイルを、1回もまちがえずに塗りきれるか。長めの文が出ます。塗りきるたびにタイルが増えて、小さくなります。",
  items:[]});
STAGES.push({name:"ミスなしチャレンジ（英語）",lang:"en",mode:"mix",challenge:"en",
  desc:"英語でおなじ挑戦。1回もまちがえずに塗りきれるか。塗りきるたびにタイルが増えて、小さくなります。",
  items:[]});

/* ⭐カードの並び順（2026-09-16 本人）。⭐日本語のあとに日本語のチャレンジ、英語のあとに英語のチャレンジ。
   ⚠記録はステージ名で持っているので、並べ替えても今までの記録は消えない */
(function(){
  var ORDER = ["ホームポジション","ひとさし指の 上・中央・下","ホームポジション ランダム",
               "あいうえお","きゃきゅきょ","単語","日常のことば","日常のことば（ながめ）",
               "ミスなしチャレンジ","英単語","日常のことば（英語）","ミスなしチャレンジ（英語）"];
  STAGES.sort(function(a,b){ return ORDER.indexOf(a.name) - ORDER.indexOf(b.name); });
})();

/* ⭐英語の日本語訳（2026-09-16 本人「英語が苦手だからこれで覚えたい」）。
   ⭐打つ英語の上に、小さいグレーで出す。⚠訳はコードが書いた＝本人の確認まち */
var EN_JA = {
  "morning":"朝","afternoon":"午後","evening":"夕方","night":"夜","today":"今日","tomorrow":"明日",
  "yesterday":"昨日","weekend":"週末","holiday":"休みの日","vacation":"長い休み","school":"学校","class":"授業",
  "teacher":"先生","student":"学生","friend":"友だち","classmate":"同級生","homework":"宿題","test":"テスト",
  "notebook":"ノート","pencil":"えんぴつ","eraser":"消しゴム","textbook":"教科書","library":"図書館","classroom":"教室",
  "lunch":"昼ごはん","breakfast":"朝ごはん","dinner":"夕ごはん","water":"水","juice":"ジュース","tea":"お茶","bread":"パン",
  "rice":"ごはん","fruit":"くだもの","apple":"りんご","banana":"バナナ","tomato":"トマト","egg":"たまご","meat":"肉",
  "vegetable":"野菜","snack":"おやつ","station":"駅","train":"電車","bus":"バス","bike":"自転車","street":"通り",
  "shop":"お店","store":"お店（大きめ）","money":"お金","wallet":"さいふ","ticket":"切符","phone":"電話",
  "message":"メッセージ","email":"メール","internet":"インターネット","computer":"パソコン","camera":"カメラ","music":"音楽",
  "movie":"映画","game":"ゲーム","sport":"スポーツ","soccer":"サッカー","baseball":"野球","tennis":"テニス",
  "swimming":"水泳","practice":"練習","club":"部活","team":"チーム","hobby":"趣味","travel":"旅行","hotel":"ホテル",
  "airport":"空港","weather":"天気","rain":"雨","snow":"雪","wind":"風","cloud":"雲","sunny":"晴れ","hot":"暑い",
  "cold":"寒い","warm":"あたたかい","cool":"すずしい","spring":"春","summer":"夏","autumn":"秋","winter":"冬",
  "health":"健康","hospital":"病院","doctor":"医者","medicine":"薬","sleep":"ねむる","dream":"夢","happy":"うれしい",
  "sad":"悲しい","angry":"おこっている","tired":"つかれた","hungry":"おなかがすいた","thirsty":"のどがかわいた","busy":"いそがしい",
  "free":"ひま・自由","easy":"かんたん","difficult":"むずかしい","important":"大切","interesting":"おもしろい",
  "boring":"たいくつ","kind":"やさしい","funny":"おかしい","quiet":"しずか","careful":"気をつけている","early":"早い",
  "late":"おそい・遅刻","fast":"速い","slow":"ゆっくり","near":"近い","far":"遠い","new":"新しい","old":"古い・年をとった",
  "young":"若い","big":"大きい","small":"小さい","long":"長い","short":"短い","clean":"きれい・そうじする","safe":"安全",
  "cheap":"安い","expensive":"高い","delicious":"おいしい","favorite":"お気に入り","together":"いっしょに",
  "sometimes":"ときどき","always":"いつも","never":"一度もない","often":"よく","usually":"たいてい","maybe":"たぶん",
  "really":"本当に","almost":"ほとんど","again":"もう一度","still":"まだ","already":"もう","soon":"まもなく",
  "later":"あとで","before":"前に","after":"あとで","because":"なぜなら","sorry":"ごめんなさい","please":"お願いします",
  "hello":"こんにちは","goodbye":"さようなら","welcome":"ようこそ","ready":"準備できた","sure":"もちろん","fine":"元気・いいよ",
  "great":"すばらしい","nice":"すてき","good":"よい","better":"もっとよい","best":"いちばんよい","right":"正しい・右",
  "wrong":"まちがい","help":"助ける","start":"始める","stop":"やめる・止まる","finish":"終える","forget":"わすれる",
  "remember":"覚えている","understand":"わかる","think":"考える","know":"知っている","learn":"学ぶ","teach":"教える",
  "study":"勉強する","ask":"たずねる","answer":"答える","talk":"話す","speak":"話す","listen":"聞く","read":"読む",
  "write":"書く","watch":"じっと見る","look":"見る","find":"見つける","choose":"選ぶ","decide":"決める","try":"やってみる",
  "need":"必要だ","want":"ほしい","like":"好き","love":"大好き","enjoy":"楽しむ","hope":"願う","wait":"待つ","meet":"会う",
  "visit":"たずねる","invite":"さそう","call":"電話する・呼ぶ","send":"送る","bring":"持ってくる","carry":"運ぶ","buy":"買う",
  "sell":"売る","use":"使う","make":"作る","take":"持っていく","give":"あげる","get":"手に入れる","keep":"とっておく",
  "put":"置く","open":"開ける","close":"閉める","turn":"まわす・曲がる","move":"動く","change":"変える","wash":"洗う",
  "cook":"料理する","eat":"食べる","drink":"飲む","wake":"目がさめる","walk":"歩く","run":"走る","jump":"とぶ","ride":"乗る",
  "drive":"運転する","arrive":"着く","leave":"出発する","return":"もどる","stay":"とどまる","live":"住む","work":"働く",
  "rest":"休む","play":"遊ぶ","smile":"ほほえむ","laugh":"笑う","cry":"泣く","worry":"心配する","relax":"くつろぐ",
  "hurry":"いそぐ","share":"分け合う","borrow":"借りる","begin":"始まる","follow":"ついていく","thank you":"ありがとう",
  "good morning":"おはよう","good afternoon":"こんにちは","good evening":"こんばんは","good night":"おやすみ",
  "see you":"またね","see you later":"あとでね","excuse me":"すみません","no problem":"問題ないよ",
  "you are welcome":"どういたしまして","take care":"気をつけてね","well done":"よくできました","good luck":"がんばって",
  "of course":"もちろん","not at all":"ぜんぜん平気","just a moment":"ちょっと待って","i see":"なるほど","me too":"わたしも",
  "how are you":"元気ですか","how much":"いくら","how many":"いくつ","what time":"何時","right now":"今すぐ",
  "over there":"あそこ","next time":"次のとき","last night":"昨日の夜","this morning":"今朝","every day":"毎日",
  "good idea":"いい考え","sounds good":"いいね","let me see":"どれどれ","never mind":"気にしないで","by the way":"ところで",
  "after school":"放課後","on the way":"向かう途中","in a hurry":"いそいでいる","at home":"家で",
  "go to school":"学校へ行く","have breakfast":"朝ごはんを食べる","have lunch":"昼ごはんを食べる","have dinner":"夕ごはんを食べる",
  "do homework":"宿題をする","take a bath":"おふろに入る","take a bus":"バスに乗る","catch the train":"電車に間に合う",
  "miss the bus":"バスに乗りおくれる","wake up early":"早く起きる","go to bed":"ねる","brush my teeth":"歯をみがく",
  "wash my hands":"手を洗う","clean my room":"部屋をそうじする","walk the dog":"犬の散歩をする","watch tv":"テレビを見る",
  "listen to music":"音楽を聞く","play the piano":"ピアノをひく","read a book":"本を読む","write a letter":"手紙を書く",
  "send a message":"メッセージを送る","check the time":"時間をたしかめる","buy a ticket":"切符を買う",
  "open the window":"窓を開ける","close the door":"ドアを閉める","sit down":"すわる","stand up":"立つ",
  "come here":"こっちへおいで","look at this":"これを見て","try again":"もう一度やってみる","slow down":"ゆっくりして",
  "hurry up":"いそいで","cheer up":"元気を出して","good job":"よくやった","happy birthday":"たんじょうびおめでとう",
  "see you tomorrow":"また明日","have a seat":"どうぞすわって","talk to you":"話しかける",
  "thank you again":"あらためてありがとう","how was your weekend":"週末はどうだった？",
  "i got up early this morning":"今朝は早く起きた","what time do you go to school":"何時に学校へ行くの？",
  "i usually take the bus to school":"いつもバスで学校へ行く","the train was late again today":"今日も電車がおくれた",
  "i forgot my notebook at home":"ノートを家にわすれた","can you help me with my homework":"宿題を手伝ってくれる？",
  "i have a test next monday":"来週の月曜にテストがある","let us have lunch together":"いっしょにお昼を食べよう",
  "what do you want to eat":"何が食べたい？","i am hungry and a little tired":"おなかがすいて少しつかれた",
  "this coffee is really good":"このコーヒーは本当においしい","i will call you after school":"放課後に電話するね",
  "sorry i am running a little late":"ごめん、少しおくれています","it is raining hard outside":"外は雨がつよく降っている",
  "do not forget your umbrella":"かさをわすれないで","the weather will be nice tomorrow":"明日は天気がよくなる",
  "it is getting cold these days":"最近さむくなってきた","i like reading books on the train":"電車で本を読むのが好き",
  "what kind of music do you like":"どんな音楽が好き？","i watched a good movie last night":"昨日の夜いい映画を見た",
  "my brother plays soccer every day":"弟は毎日サッカーをしている","i want to travel abroad someday":"いつか外国を旅行したい",
  "have you ever been to okinawa":"沖縄へ行ったことある？","the party starts at seven":"パーティーは7時に始まる",
  "please send me a message later":"あとでメッセージを送ってね","i will be there in ten minutes":"10分で着きます",
  "could you say that again please":"もう一度言ってもらえますか","i do not understand this question":"この問題がわからない",
  "thank you for your help today":"今日は手伝ってくれてありがとう","see you at the station at noon":"お昼に駅で会おう",
  "i am looking for my wallet":"さいふをさがしている","how much is this ticket":"この切符はいくらですか",
  "excuse me where is the restroom":"すみません、お手洗いはどこですか","can i take a picture here":"ここで写真をとってもいいですか",
  "i would like a cup of tea":"お茶を一杯ください","the shop opens at ten in the morning":"お店は朝10時に開く",
  "my phone battery is almost dead":"スマホの電池がもうすぐ切れる","i need to clean my room today":"今日は部屋をそうじしないと",
  "i went shopping with my friend":"友だちと買い物に行った","we walked in the park after dinner":"夕食のあと公園を歩いた",
  "i am going to bed early tonight":"今夜は早くねるつもり","do you have any plans this weekend":"今週末は予定ある？",
  "let us meet in front of the library":"図書館の前で会おう",
  "i practice the piano every evening":"毎晩ピアノを練習している","she is good at speaking english":"彼女は英語を話すのが上手",
  "i want to be better at english":"英語をもっと上手になりたい","keep trying and you will get better":"続ければ上手になるよ",
  "that sounds like a good idea":"それはいい考えだね","i am glad to hear that":"それを聞いてうれしい",
  "take care and see you next week":"気をつけて、また来週","please tell me if you need help":"助けが必要なら言ってね",
  "the room was very quiet last night":"昨夜は部屋がとても静かだった","i left my bag on the train":"かばんを電車に置きわすれた",
  "we have a school festival in october":"10月に学園祭がある","my father cooks dinner on sundays":"父は日曜に夕食を作る",
  "i drink water when i wake up":"起きたら水を飲む","let us start with an easy question":"かんたんな問題から始めよう",
  "i will remember this word today":"今日この単語を覚えよう","do you want to go for a walk":"散歩に行かない？"
};

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
      /* ⭐棒線は F と J だけ（2026-09-08 本人）。
         四本指のホーム（asdf jkl;）は枠線だけで囲む */
      k.className="key"+(HOMEKEYS[c]?" hp":"")+((c==="f"||c==="j")?" fj":"");
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
  /* ⭐左手の4本・右手の4本をひとまとまりに（2026-09-17 本人「右人差し指で改行して、右揃えに。画面が大きい場合は1行に」）。
     ⚠前は1本ずつ折り返していて、右くすりゆびの前で切れていた */
  [["l5","l4","l3","l2"],["r2","r3","r4","r5"]].forEach(function(hand){
    var g=document.createElement("span"); g.className="lg-hand";
    hand.forEach(function(f){
      var s=document.createElement("span");
      s.innerHTML='<i style="background:'+FCOLOR[f]+'"></i>'+FNAME[f];
      g.appendChild(s);
    });
    lg.appendChild(g);
  });
  fitLegend();
}
/* ⭐2行になったときは、左手の行＝左揃え・右手の行＝右揃え（2026-09-17 本人「ひだり小指からは今まで通り左揃え」）。1行に入るときは今までどおり */
function fitLegend(){
  var lg=$("legend"); if(!lg) return;
  var g=lg.querySelectorAll(".lg-hand"); if(g.length<2) return;
  lg.classList.remove("two");
  if(g[1].offsetTop>g[0].offsetTop) lg.classList.add("two");
}
window.addEventListener("resize", fitLegend);
/* ⚠字の読み込みや左右の並び替えで幅が変わっても測り直す（resize だけだと、開いた直後に外れることがある） */
if(window.ResizeObserver && $("legend")){ var lgRO=new ResizeObserver(function(){ fitLegend(); }); lgRO.observe($("legend")); lgRO.observe(document.body); }
if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitLegend);
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

/* ⭐お題i番の音節。チャレンジはお題ごとに かな／英字 が混ざるので、お題が持っている印で分ける。
   ⭐cut があるお題は、そこで切る（枚数をぴったりにするため）。
   ⚠切った最後が「ん」「っ」だと次の字が無いので、単独で打てる形にする */
function itemSyls(i){
  var st=STAGES[stageIdx], it=curItems[i];
  if(!st.challenge) return st.mode==="kana" ? toSyllables(it) : toDirect(it);
  var sy = it.kana ? toSyllables(it.t) : toDirect(it.t);
  if(it.cut && it.cut<sy.length){
    sy=sy.slice(0,it.cut);
    var last=sy[sy.length-1];
    if(last.disp==="ん") last.cands=["nn","xn"];
    else if(last.disp==="っ") last.cands=["xtu","ltu"];
  }
  return sy;
}
/* このステージをノーミスで打ちきったときの総打鍵数 */
function stageCellCount(){
  var st=STAGES[stageIdx], sum=0;
  var useFj=($("optHome").checked && !!st.basic);   // 基礎ステージだけ
  for(var i=0;i<curItems.length;i++){
    var sy = itemSyls(i);
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
  hard:   {max:3,  warn:2, danger:1},
  one:    {max:1,  warn:1, danger:1}    /* ⭐ミスなしチャレンジ（2026-09-15） */
};
function currentLevel(){
  var st=STAGES[stageIdx];
  if(st && st.challenge) return LEVELS.one;  // ミスなしチャレンジは1回でくずれる
  /* ⭐単語より後も、ミスの回数は選べる（2026-09-18 本人「やっぱりほかと一緒で」「ミスなしチャレンジがあるから」）。
     ⚠前は「単語より後は、つねに3回でくずれる」に固定していた */
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

/* ---------- 紙吹雪 ---------- */
/* ⭐花火をやめて紙吹雪にした（2026-09-18 本人「下から勢いよくパンっと出てきて、ふわふわと落ちていく感じ」→ B＝画面ぜんたい）。
   ⭐画面の下の端からパンっと1回。上がりきったら、くるくる回って左右にゆれながら、ゆっくり落ちる。色はタイルと同じ
   ⚠関数の名前は fireworks のまま（呼んでいる場所を変えないため）。画面の上に1枚キャンバスを重ねる（押せない＝クリックは下に通る） */
var fwTimers=[], cfCanvas=null;
function popSound(){
  tone(160,0.07,0.12,"square");
  setTimeout(function(){ tone(900,0.14,0.05,"triangle"); },30);
}
function fireworks(bursts,onDone){
  stopFireworks(true);
  /* ⭐紙吹雪はタイルの枠の中だけ（2026-09-18 本人「前言撤回。紙吹雪はタイルの上でいいと思う」＝同じ日のB＝画面ぜんたいを取り消した） */
  var host=document.querySelector("#play .panel"); if(!host) return;
  var W=host.clientWidth, H=host.clientHeight, dpr=window.devicePixelRatio||1;
  var cv=document.createElement("canvas"); cv.className="confetti";
  cv.width=W*dpr; cv.height=H*dpr;
  /* ⚠重ねる指定はここに直接書く（CSSが古いまま読まれても、画面の上に出るように） */
  cv.style.cssText="position:absolute;left:0;top:0;z-index:5;pointer-events:none;transition:opacity .4s;width:"+W+"px;height:"+H+"px";
  host.appendChild(cv); cfCanvas=cv;
  var ctx=cv.getContext("2d"); ctx.scale(dpr,dpr);
  /* ⭐左下と右下の角から、放射状に勢いよく（2026-09-18 本人「左と右角から、紙吹雪が出るほうがいいな。放射線状に」
       「もっと早くて、上ははみ出したほうが良い」）＝枠の上の端より上まで飛んで、見えなくなってから落ちてくる */
  var G=3400, N=Math.min(170, Math.round(W/4)), ps=[];
  for(var i=0;i<N;i++){
    var dir=(i%2===0) ? 1 : -1;                          // 1＝左の角から右上へ／-1＝右の角から左上へ
    /* ⚠クラッカーの形（2/5を目指す・+1/4はみ出す）はやめた（2026-09-18 本人「最初のほうがまだまし」「私の指示は無視しよう。元に戻って、横の広がりをなくしてみて」）
       ⭐放射状に戻して、横の広がりをおさえた＝内側へ傾ける角度を 4〜56度 → 4〜28度、横の速さの上限を 1400 → 650 */
    var peak=H*(-0.45+Math.random()*0.65);              // どこまで上がるか（枠の上から 45% はみ出す〜枠の中 20%）
    /* ⭐出どころは角の1点ではなく、枠の外の広い範囲（2026-09-18 本人「固まりで出てきてしまうから、もっとはみ出した範囲が元に」）
         ＝横は角から外へ12%〜内へ6%、縦は枠の下の端から下へ8〜35%。枠の外から入ってくるので、はじめから散って見える */
    var x0=(dir===1) ? W*(-0.12+Math.random()*0.18) : W*(1.12-Math.random()*0.18);
    var y0=H+10+H*(0.08+Math.random()*0.27);             // 本人「あと少しだけ下の方から」で 0〜25% → 8〜35%
    var vy=-Math.sqrt(2*G*(y0-peak));
    var ang=(4+Math.random()*36)*Math.PI/180;           // まっすぐ上から 4〜40度 内側へ＝放射状（本人「横にない。もう少し広げて」で 28→40）
    ps.push({
      x:x0, y:y0,
      vx:dir*Math.min(950, -vy*Math.tan(ang)),
      vy:vy,
      term:80+Math.random()*80,                          // 落ちる速さ（前より少し速い）
      sw:18+Math.random()*34, sf:1.5+Math.random()*2.5, ph:Math.random()*6.3,
      rot:Math.random()*6.3, vr:(Math.random()-.5)*12, flip:Math.random()*6.3, vf:5+Math.random()*9,
      w:6+Math.random()*5, h:9+Math.random()*7, round:Math.random()<.18,
      col:BLOCKCOL[Math.floor(Math.random()*BLOCKCOL.length)]
    });
  }
  popSound();
  var last=performance.now(), t0=last;
  function frame(now){
    if(!cv.parentNode) return;                           // 消されたら止まる
    var dt=Math.min(0.04,(now-last)/1000), t=(now-t0)/1000; last=now;
    ctx.clearRect(0,0,W,H);
    var alive=0;
    for(var i=0;i<ps.length;i++){
      var p=ps[i];
      if(p.vy<0){ p.vy+=G*dt; }                          // 上がっている間＝勢いよく
      else { p.vy=Math.min(p.term, p.vy+G*dt*0.15); p.vx*=0.94; }   // 落ちる間＝ゆっくり
      p.x+=p.vx*dt + (p.vy>0 ? Math.sin(t*p.sf+p.ph)*p.sw*dt : 0);
      p.y+=p.vy*dt; p.rot+=p.vr*dt; p.flip+=p.vf*dt;
      if(p.y>H+20 && p.vy>0) continue;          // ⚠はじめは枠の下の外にいるので、落ちてきたときだけ消す
      alive++;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.scale(1,Math.cos(p.flip));
      ctx.fillStyle=p.col;
      if(p.round){ ctx.beginPath(); ctx.arc(0,0,p.w*0.55,0,6.3); ctx.fill(); }
      else ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    }
    if(alive && t<14) requestAnimationFrame(frame);
    else if(cfCanvas===cv) stopFireworks(true);
    else if(cv.parentNode) cv.parentNode.removeChild(cv);
  }
  requestAnimationFrame(frame);
  /* ⭐結果は、紙吹雪が落ちはじめてから出す。紙吹雪はそのまま降りつづける */
  if(onDone) fwTimers.push(setTimeout(onDone, 2600));
}
/* now=true はすぐ消す。ふだんは少しずつ消す（打ちはじめたときなど） */
function stopFireworks(now){
  fwTimers.forEach(function(t){ clearTimeout(t); }); fwTimers=[];
  var cv=cfCanvas; cfCanvas=null;
  if(!cv) return;
  if(now){ if(cv.parentNode) cv.parentNode.removeChild(cv); return; }
  cv.style.opacity="0";
  setTimeout(function(){ if(cv.parentNode) cv.parentNode.removeChild(cv); },400);
}
/* ノーミス完走：花火をひとしきり見せてから結果を出す。
   クリックかキーを押せばすぐ結果へ飛べる。 */
function celebrate(){
  var bm=$("bigmsg"); bm.classList.add("on");
  var done=false;
  function teardown(){
    done=true;
    fwTimers.forEach(function(t){ clearTimeout(t); }); fwTimers=[];   // ⭐紙吹雪は消さない（結果が出ても降りつづける）
    bm.classList.remove("on"); bm.onclick=null;
    document.removeEventListener("keydown",skipKey,true);
    celebrateCancel=null;
  }
  function go(){ if(done) return; teardown(); afterStage(); }
  function skipKey(e){
    e.preventDefault(); e.stopPropagation();
    if(swallowN && e.key==="n"){ swallowN=false; return; }   // ⭐最後の「ん」の2つめの n では飛ばさない
    go();
  }
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
    /* ⭐英字（1かたまり2文字）は、今打っている1文字だけを光らせる（2026-09-16 本人
         「タイルは2文字に1つだけど、これをやってるっていう目印は1文字ずつがいい」）*/
    var plain = (s.cands.length===1 && s.cands[0]===s.disp && !s.home);
    if(i===si && plain && s.disp.length>1){
      kh += '<span class="done">'+esc(s.disp.substr(0,buf.length))+'</span>'+
            '<span class="cur">'+esc(s.disp.charAt(buf.length))+'</span>'+
            esc(s.disp.substr(buf.length+1));
    }else{
      kh += '<span class="'+cls+'">'+(s.home?"fj":esc(s.disp))+"</span>";
    }

    if(i<si){ rh += '<span class="done">'+esc(s.cands[0])+"</span>"; }
    else if(i===si){
      var pick=s.cands[0];
      for(var j=0;j<s.cands.length;j++){ if(s.cands[j].indexOf(buf)===0){ pick=s.cands[j]; break; } }
      if(plain && pick.length>1){
        rh += '<span class="typed">'+esc(pick.substr(0,buf.length))+'</span>'+
              '<span class="cur">'+esc(pick.charAt(buf.length))+'</span>'+
              esc(pick.substr(buf.length+1));
      }else{
        rh += '<span class="typed">'+esc(pick.substr(0,buf.length))+'</span><span class="cur">'+esc(pick.substr(buf.length))+"</span>";
      }
    }
    else{ rh += esc(s.cands[0]); }
  }
  $("kana").innerHTML=kh;
  $("roma").innerHTML=rh;
  highlightNext();
}

/* ---------- 入力判定 ---------- */
function feed(ch){
  /* ⭐「ん」で終わったあとの2つめの n は、打ったことにしない（ミスにもしない）。
     ⚠次のお題が n で始まるときは、次のお題の1文字目として受ける */
  if(swallowN){
    swallowN=false;
    if(ch==="n" && (si>=syls.length || expectedChar()!=="n")) return;
  }
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
var swallowN=false;   // ⭐最後の「ん」を n 1つで終えた直後だけ true
function advance(){
  if(si<syls.length && syls[si].endN && buf==="n") swallowN=true;
  // 「ん」の次に子音が来たときなど、確定し直す経路でも1音節は完成しているので必ず1タイル塗る
  if(si<syls.length) chars += syls[si].disp.length;   // 「きょ」なら2文字、英字は1文字
  si++; buf="";
  fillOne();
  if(si>=syls.length){ finishItem(); return; }
  render();
}
function onMiss(ch){
  if(ch) showMissHint(ch, expectedChar());
  miss++;   /* ⭐ミスの数も打っている間は出さない（2026-09-18 本人）。終わってから showFinalStats で出す */
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
    $("hint").textContent = STAGES[stageIdx].challenge
      ? "ミス。"+CH.round+"回目（"+chCount()+"枚）をもう一度"
      : "ミス"+max+"回。最初からやり直し";
    var t=runToken;
    setTimeout(function(){ if(t===runToken) restartStage(); },1000);
  }else{
    unfillSome(1);
    render();
  }
}

/* ---------- 進行 ---------- */
/* ⭐ホームポジションのランダム（2026-09-16 本人「ホームポジションランダムが欲しい」）。
   ⭐a s d f j k l ; の8つから、毎回ちがう並びを作る。⚠4〜6文字＝タイル2〜3枚 */
/* ⭐ホーム・上の段・下の段（数字の段なし）を完全にランダムに（2026-09-17 本人）。
   ⚠前はホームの8キー（asdfjkl;）だけだった。⚠@ [ : ] \ は日本語キーボードだけの位置なので入れていない */
function buildRandomHome(n){
  var keys="qwertyuiopasdfghjkl;zxcvbnm,./", out=[];
  for(var i=0;i<n;i++){
    var len=4+Math.floor(Math.random()*3), s="";
    for(var k=0;k<len;k++) s+=keys.charAt(Math.floor(Math.random()*keys.length));
    out.push(s);
  }
  return out;
}
function shuffled(a){
  var b=a.slice();
  for(var i=b.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=b[i]; b[i]=b[j]; b[j]=t; }
  return b;
}
function openStage(idx){
  stageIdx=idx;
  var st=STAGES[idx];
  curItems = st.shuffle ? shuffled(st.items).slice(0, st.pick||st.items.length) : st.items.slice();
  if(st.random) curItems = buildRandomHome(st.pick||15);   /* ⭐毎回ちがう並び */
  $("menu").style.display="none";
  $("play").classList.add("on");
  if(st.challenge) chStart();
  $("stName").textContent = st.challenge ? chLabel() : st.name;
  /* ⭐名前の左の小さいタイル＝一覧のカードと同じ番号・同じ色（2026-09-17 本人） */
  $("stName").style.setProperty("--tile",BLOCKCOL[idx%BLOCKCOL.length]);
  $("stName").setAttribute("data-n", stageLabel(idx));
  setStageColor(BLOCKCOL[idx%BLOCKCOL.length]);
  /* ⭐ステージごとの設定は、効くステージにだけ出す（2026-09-08 本人）。
     ⚠前は、単語より後（basic なし）は「3回でくずれる」に固定だったので出していなかった */
  /* ⭐2026-09-18 からは、ミスの回数はチャレンジ以外ぜんぶに出す。「終わりに f j に戻る」は基礎（1〜5）だけ */
  if($("playOpts")) $("playOpts").style.display = st.challenge ? "none" : "flex";
  if($("optHome")) $("optHome").parentNode.style.display = st.basic ? "" : "none";
  if($("chOpts")) $("chOpts").style.display = st.challenge ? "flex" : "none";   // ⭐チャレンジだけ枚数を選ぶ
  if(document.activeElement===$("uname")) $("uname").blur();   // 名前欄にカーソルが残っていると打てないので外す
  buildKeyboard();
  /* ⭐単語（ステージ6）からは、画面のキーボードと指の色の説明を出さない（2026-09-18 本人
       「長文の人って指覚えてるから、キーボードをなくす」「単語からはいらないと思う」）。
     ⭐空いたぶん、タイルの場所を高くする＝長い文でもタイルが見える。
     ⚠基礎（basic＝1〜5）は今までどおり出す。こども用（?kids=1）は変えない */
  $("play").classList.toggle("nokb", !st.basic && !KIDS);
  cancelCelebrate(); stopFireworks(); hideToast(); $("bigmsg").classList.remove("on");
  buildGrid();
  resetRun();
}
function resetRun(){
  clearInterval(timer); running=false; stageDone=false;
  runToken++;                       // 予約済みの古いタイマーを無効にする
  keys=0; chars=0; miss=0; bestTower=0; itemIdx=0; lives=0; pausedMs=0; chWaiting=false; swallowN=false;
  clearGrid(); renderLives();
  /* ⭐打っている間は「－」（2026-09-18 本人 A）。「0」だとミスしているのに「ミス 0」に見えるため */
  ["sTime","sMiss","sWpm","sEwpm"].forEach(function(id){ var el=$(id); el.textContent="－"; el.classList.remove("don"); });
  justReset=true;
  $("hint").textContent="スペースでスタート　・　Esc でホームへ";
  loadItem(0);
  showStartMsg();
}
/* ⭐いきなり始めない。「スタート」を出して、どこかのキーを1回押してから始める（2026-09-17 本人
     「一度どこかのキーを押す仕組みが欲しい」「普通にスタートって書いて、小さい文字でどこかのキーを押すと始まります」）。
   ⭐その1回は打った数に入れない。時間は、そのあと最初に打ったときから */
var startReady=false;
function showStartMsg(){
  startReady=false;
  var m=$("startmsg");
  if(!m){
    /* ⭐紙ぜんぶではなく、お題のカードだけを隠す（2026-09-17 本人「ボタンは全部隠さず、最初のアルファベットを隠して」） */
    var panel=document.querySelector(".textwrap")||document.querySelector(".panel"); if(!panel) return;
    m=document.createElement("div"); m.className="bigmsg startmsg"; m.id="startmsg";
    m.innerHTML='<em>スタート</em><span>おやゆびでスペースキー</span>';
    m.onclick=pressStart;
    panel.appendChild(m);
  }
  m.classList.add("on");
  /* ⭐お題の文字は、スペースを押すまで隠す（2026-09-17 本人「押すと同時に文字が表示」） */
  if(m.parentElement) m.parentElement.classList.add("waiting");
}
/* 「スタート」を押したとき。チャレンジで塗りきったあとなら、次の回を作ってからすぐ始める */
function pressStart(){
  if(stageDone && chWaiting) nextChallengeRound();
  beginRun();
}
/* 終わったあとの Enter。同じステージを新しいお題で。「スタート」を出してスペースを待つ */
function againNow(){
  hideToast();
  restartStage();
}
function beginRun(){
  startReady=true;
  stopFireworks();                      // ⭐紙吹雪が残っていたら、打ちはじめで消す
  if($("startmsg")){ $("startmsg").classList.remove("on"); if($("startmsg").parentElement) $("startmsg").parentElement.classList.remove("waiting"); }
  $("hint").textContent="Esc でやり直し";
}
function restartStage(){
  // やり直しのたびにお題を引き直す（同じ文が続くとストレスなので）
  var st=STAGES[stageIdx];
  if(st.shuffle) curItems = shuffled(st.items).slice(0, st.pick||st.items.length);
  if(st.random) curItems = buildRandomHome(st.pick||15);
  if(st.challenge){ curItems = buildChallengeItems(chCount()); $("stName").textContent=chLabel(); }
  buildGrid();
  resetRun();
}
function loadItem(i){
  if(i<0 || i>=curItems.length) return;   // 古いタイマーが後から発火しても壊れないように
  itemIdx=i;
  var st=STAGES[stageIdx], raw=curItems[i];
  syls = itemSyls(i);
  if($("optHome").checked && st.basic) syls.push({disp:"fj",cands:["fj"],home:true});
  si=0; buf="";
  /* ⭐英語のときは、上に小さく日本語訳を出す（2026-09-16 本人） */
  var _it = curItems[i], _t = (_it && _it.t) ? _it.t : _it;
  setSubText(EN_JA[_t] || "");
  $("stProg").innerHTML="お題<br>"+(i+1)+" / "+curItems.length;
  render();
  lockGlassWidth();
}
/* ⭐訳の行は JS で作る＝HTMLを触らずに、どのページにも出せる */
function setSubText(t){
  var tw=document.querySelector(".textwrap"); if(!tw) return;
  var el=document.getElementById("subText");
  if(!el){ el=document.createElement("div"); el.id="subText"; el.className="subtext"; tw.insertBefore(el, tw.firstChild); }
  el.textContent = t || "";
  el.style.display = t ? "" : "none";
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
/* ⭐打っている間は数字を動かさない（2026-09-18 本人「時間を動かすのはやめてほしかった」）。
   ⚠前は0.1秒ごとに途中の数字を出していた。最後の数文字が入る前の数字で止まるので、小窓の数字とずれていた（例 左143／小窓146）
   ⚠タイマー自体は止めない（終わりの時間は startAt から計算している） */
function tick(){}
/* ⭐打ち終わったら4つまとめて「ドン」と出す（2026-09-18 本人「終わってドンって表示してほしい」）。
   ⭐小窓と同じ数字を入れるので、左と小窓が必ずそろう */
function showFinalStats(sec,w,e,m){
  var set=function(id,html){ var el=$(id); el.innerHTML=html; el.classList.remove("don"); void el.offsetWidth; el.classList.add("don"); };
  set("sTime", sec.toFixed(1)+"秒");
  set("sMiss", String(m));
  set("sWpm",  w+'<span class="u">/1分</span>');
  set("sEwpm", e+'<span class="u">/1分</span>');
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
  /* ⭐コインは こども用（?kids=1）だけ。大人用では貯めない（2026-09-08 本人）。
     ⚠これまで大人用でも中で貯まっていた（箱が見えないだけだった） */
  if(!KIDS) return null;
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
  /* ⭐最後の1文字と同時だと急かされる（2026-09-08 本人「最後の文字の後、もう少し間があって落ちてくるといいね」）。
     ⚠保存はすぐ、絵だけ少し待つ */
  setTimeout(function(){ drawCoins(base+bonus); }, 800);
  return {base:base, bonus:bonus, total:base+bonus, streak:st, miss:missCount};
}
/* ⭐タイルと同じ7色を使う。1列ごとに色が変わる（2026-09-08 本人 A＋B）
     face=明るく／side=そのまま／line=暗く */
function shade(hex, pct){
  var n=parseInt(hex.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  function f(v){ return Math.max(0,Math.min(255, Math.round(v + (pct>0 ? (255-v)*pct : v*pct)))); }
  return "#"+((1<<24)+(f(r)<<16)+(f(g)<<8)+f(b)).toString(16).slice(1);
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
  showFinalStats(sec,w,e,miss);
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
    miss:miss, wpm:w, ewpm:e, tower:bestTower, total:cellTotal, perfect:perfect?1:0,
    round:(STAGES[stageIdx].challenge ? CH.round : 0)});

  var got = award(miss);
  lastResult={sec:sec,w:w,e:e,perfect:perfect,keys:keys,chars:chars,miss:miss,got:got,
              tower:bestTower,total:cellTotal,stage:stName,
              isRecord:isRecord,isFirst:isFirst,prevBest:prevBest,
              challenge:!!STAGES[stageIdx].challenge};
  renderStageCards();

  if(perfect) celebrate();
  else setTimeout(afterStage,400);
}
/* ステージが終わったあと：埋まったタイルはそのまま残す。
   リセットは「やり直し」を押したときだけ。 */
function afterStage(){
  showToast();
  if(STAGES[stageIdx].challenge){
    /* ⭐塗りきったら次の回へ。枚数が1.5倍になって、タイルが小さくなる（上限400枚） */
    /* ⭐塗ったタイルはそのまま見せて、「スタート」を出す。スペース1回で次の回が始まる
         （2026-09-18 本人 A。前は「どれかのキー→作り直し→スペース」の2回押しだった） */
    CH.round++; chWaiting=true;
    showStartMsg();
    $("hint").textContent="スペースで "+CH.round+"回目（"+chCount()+"枚）へ　・　Esc 2回でホーム";
    return;
  }
  $("hint").textContent="スペースでもう一度　・　Esc 2回でホーム";
}
var toastTimer=null;
function showToast(){
  var r=lastResult; if(!r) return;
  $("toastMain").innerHTML =
    (r.challenge ? '<span style="color:var(--accent)">★ '+r.total+'枚クリア</span>'
      : (r.perfect ? '<span style="color:var(--gold)">★ パーフェクト</span>' : 'おつかれさま'))
    + (r.isRecord ? '<span class="trec">記録更新 ✨</span>' : '');
  $("toastSub").innerHTML =
    "本当の速さ <b>"+r.e+"</b>/1分　ミス "+r.miss+" 回";
  placeToast();
  $("toast").classList.add("on");
  /* ⭐自動では消さない（2026-09-18 本人「自動で消えるのをやめて」）。前は7秒で消えていた */
  clearTimeout(toastTimer);
}
/* ⭐結果は、お題の文字のすぐ下に出す（2026-09-18 本人「すごく下になってしまってる。文字のすぐ下くらいに」）。
   ⚠画面の大きさで位置が変わるので、出すたびにお題の場所から計算する。画面の下からはみ出すときだけ上へ寄せる */
function placeToast(){
  var t=$("toast"), w=document.querySelector("#play .textwrap");
  if(!w){ t.style.top=""; t.style.bottom=""; return; }
  var r=w.getBoundingClientRect();
  var top=r.bottom+12, h=t.offsetHeight||120;
  if(top+h > window.innerHeight-8) top=Math.max(8, window.innerHeight-8-h);
  /* ⭐横も、お題の文字の真下にそろえる（2026-09-18 本人「画面の真ん中じゃなく、文字の下に」）。
     ⚠前は画面全体の真ん中（left:50%）だったので、左の記録欄のぶん左に寄っていた。はみ出すときだけ内側へ */
  var half=(t.offsetWidth||260)/2, cx=r.left+r.width/2;
  cx=Math.max(8+half, Math.min(window.innerWidth-8-half, cx));
  t.style.left=cx+"px";
  t.style.top=top+"px"; t.style.bottom="auto";
}
/* 出したままにしたので、画面の大きさが変わったら置き直す */
window.addEventListener("resize", function(){ if($("toast").classList.contains("on")) placeToast(); });
function hideToast(){ clearTimeout(toastTimer); $("toast").classList.remove("on"); }
function showResult(){
  var r=lastResult; if(!r) return;
  /* ⭐どちらも「いまの記録」（2026-09-08 本人「お疲れ様いらない、いまの記録」）。
     ⚠ほめる・励ますのは下のひとことでやる */
  $("resTitle").textContent = "いまの記録";
  $("resSub").textContent = r.stage + " をクリアしました";
  if(r.isRecord){
    $("resRecord").innerHTML='最高記録が出ました ✨'+
      '<small>本当の速さ '+r.prevBest+' → <b>'+r.e+'</b>/1分</small>';
    $("resRecord").style.display="block";
  }else if(r.isFirst){
    $("resRecord").innerHTML='はじめての記録 ✨'+
      '<small>本当の速さ <b>'+r.e+'</b>/1分。ここが出発点です</small>';
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
  $("rWpm").textContent=r.w+"/1分";
  $("rEwpm").textContent=r.e+"/1分";
  /* 🔴文は本人が書いた（2026-09-08）。
     ⚠「タイルが◯つ残ったのは…」の行は消した＝上のカードに数字が出ているので二度手間 */
  $("resNote").innerHTML = r.perfect
    ? "ミスがゼロなので、見かけの速さと本当の速さが同じです。<b>これがいちばん強い状態</b>です。"
    : "ミス"+r.miss+"回の場合、打ち直しに <b>およそ"+Math.round(r.miss*MISS_PENALTY)+"秒</b>かかります。<br>"+
      "見かけは "+r.w+"/1分、本当の速さは <b>"+r.e+"/1分</b>に。<br>"+
      "<b>ゆっくりでもミスをしない人のほうが、長文にも有利で結果的に速く終わります。</b>";
  /* ⭐閉じるの行に、ひとこと（2026-09-08 本人）。ミスなしはほめる／ミスありは励ます */
  $("resCheer").textContent = pick(r.perfect ? CHEER_PERFECT : CHEER_TRY);
  $("ovRes").classList.add("on");
  if(!r.perfect) tone(784,0.16,0.07);
}
/* ⭐打ち終わりのひとこと（2026-09-08 本人）。⚠煽らない・比べない・数字を出さない */
/* ⭐ミスがあったときのひとこと（30個）。⚠立場は「応援する人」にそろえてある。
   ⚠「自分の声（気持ちいい！）」や「コーチの声（見ちゃだめだぞ）」を混ぜない
   ⭐ミスがある人のほうが多いので、こちらを厚くする（2026-09-08 本人） */
var CHEER_TRY=[
  "その調子！つづければ必ず変わります",
  "きょうも練習できました。それがいちばん大事です",
  "ミスは絶対に減らせます。あせらなくて大丈夫",
  "手が覚えるまで、あと少しです",
  "このまま続ければ、間違いなくうまくなります",
  "コツコツ続けられるのが、いちばんの才能です",
  "ゆっくりで大丈夫。このまま練習していきましょう",
  "タイルがたくさん埋まりました。その調子です",
  "集中できましたね。タッチタイピングまであと少し",
  "キーボードを見ないで打てたら、もっと速くなります",
  "きのうより今日、今日より明日",
  "指がつりそう？分かります。でも確実に上達しています",
  "苦手な指が見つかったら、そこが伸びしろです",
  "ホームポジションに戻れていれば大丈夫です",
  "打ち直しが減ると、ぐっと速くなります",
  "続けた人だけが、見ないで打てるようになります",
  "きょうの1回が、明日の指をつくります",
  "うまくいかない日もあります。それでも指は覚えています",
  "あせらなくていいです。正確さが先です",
  "ミスの数より、続けた回数です",
  "ここまでやれたら十分です",
  "また来てくださいね。待っています",
  "少しずつで大丈夫。それがいちばんの近道です",
  "指が迷うところが、練習しどころです",
  "練習した時間は、ぜんぶ残ります",
  "手元を見ないで、あと1回いってみましょう",
  "その1回が、上達の1歩です",
  "落ち着いて打てば、必ず届きます",
  "きょうの分、しっかり進みました",
  "ホームポジションが身についてきています"
];
/* ⭐ミスなしのときのひとこと（10個） */
var CHEER_PERFECT=[
  "ノーミス！おめでとうございます✨",
  "すごい！指がちゃんと覚えています👏",
  "おぉ〜完璧です！その調子！",
  "タイルが全部埋まりました。気持ちいいですね",
  "ノーミスは気持ちいいですね！",
  "この正確さ、いちばん欲しいテクニックです！",
  "文句なし！できた自分をほめてください",
  "キーボードを見ていないなら、タイピングマスターです！",
  "やりました！次のステップに進めます",
  "おめでとうございます！この1回を積み重ねましょう"
];
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

/* ⭐ステージごとにページの色を変える（2026-09-17 本人「ステージ事にページの色を変えたい」「ページが変わったってわかりやすいから」）。
   ⭐色＝名前の左のタイルの色。ピンク（--accent）を使っているところが全部その色になる。空を渡すと元のピンクに戻る */
function mixHex(hex, to, t){
  var a=parseInt(hex.slice(1),16), r=(a>>16)&255, g=(a>>8)&255, b=a&255;
  function m(c){ return Math.round(c+(to-c)*t); }
  return "rgb("+m(r)+","+m(g)+","+m(b)+")";
}
function setStageColor(col){
  var s=document.documentElement.style;
  /* ⚠サイト共通の style.css は --pink 系を使う（チェック・ラジオ・帯など）ので、そちらも入れ替える */
  if(!col){ ["--accent","--accent-deep","--accent-dim","--medal-solid","--pink","--pink-light","--pink-pale"].forEach(function(v){ s.removeProperty(v); }); return; }
  s.setProperty("--pink", col);
  s.setProperty("--pink-light", mixHex(col, 255, .82));
  s.setProperty("--pink-pale", mixHex(col, 255, .9));
  s.setProperty("--accent", col);
  s.setProperty("--accent-deep", mixHex(col, 0, .22));    // 薄い地の上の字＝少し濃く
  s.setProperty("--accent-dim", mixHex(col, 255, .9));    // 薄い地
  s.setProperty("--medal-solid", col);
}
function backToMenu(){
  /* ⭐練習ページ（play.html）からは、一覧のページへ戻る（2026-09-16 本人） */
  if(document.body.classList.contains("playpage")){ location.href = KIDS ? "./?kids=1" : "./"; return; }
  clearInterval(timer); running=false;
  cancelCelebrate(); stopFireworks(); hideToast(); $("bigmsg").classList.remove("on");
  $("play").classList.remove("on");
  $("menu").style.display="";
  setStageColor("");
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
/* ⭐ステージ名 → 番号。⚠見つからない古い記録は名前のまま出す */
function stageNo(name){
  for(var i=0;i<STAGES.length;i++){ if(STAGES[i].name===name) return stageLabel(i); }
  return esc(name);
}
function renderLogs(){
  var a=getLogs().slice().reverse();
  if(!a.length){
    $("logBody").innerHTML='<div class="empty">まだ記録がありません。<br>'+
      '打ち終わるたびに、ここへ自動でたまっていきます。</div>';
    return;
  }
  /* ⭐ステージは番号だけ（2026-09-08 本人「ステージは１２３４で表示。横スクロールなし」）。
     ⚠名前のままだと「日常のことば（ながめ）」で横に伸びていた */
  var h='<table class="logtbl"><tr>'+
        '<th>日</th>'+
        '<th>ニックネーム<span class="tip-wrap"><button type="button" class="tip-btn" aria-label="説明"></button>'+
          '<span class="tip-pop">トップ画面で入れたニックネームが、そのまま出ます。<br>'+
          'お使いのパソコンの中だけに残ります。どこにも送られません。</span></span></th>'+
        '<th>ステージ</th><th>ミス</th>'+
        '<th>タイル<span class="tip-wrap right"><button type="button" class="tip-btn" aria-label="説明"></button>'+
          '<span class="tip-pop">タイルの数は、そのステージで打つ<b>文字の数</b>です。<br>'+
          '⚠<b>打つキーの数ではありません。</b>「さ」は s a と2回打ちますが、タイルは1枚です。<br>'+
          'ミスをするとタイルが崩れるので、最後の数は減ることがあります。</span></span></th>'+
        '<th>埋まった率</th><th>本当</th></tr>';
  for(var i=0;i<a.length && i<60;i++){
    var r=a[i], d=new Date(r.date);
    /* ⭐時刻は出さない（日付だけ）。2026-09-08 本人「正確すぎて嫌だ。
       （授業中にやったとか気になる）」。⚠見られると困る情報は持たない */
    var ds=isNaN(d.getTime()) ? "" : ((d.getMonth()+1)+"/"+d.getDate());
    h+="<tr><td>"+ds+(r.perfect?' <span style="color:#c99a2e">★</span>':"")+"</td><td>"+esc(r.name||"")+
       "</td><td>"+stageNo(r.stage)+"</td><td>"+r.miss+"</td><td>"+
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
    /* ⭐CSV も日付だけ（2026-09-08 本人）。
       ⚠先生が集めて見るものなので、何時にやったかは残さない */
    var ds=isNaN(d.getTime()) ? "" : (d.getFullYear()+"/"+(d.getMonth()+1)+"/"+d.getDate());
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

/* ⭐STAGE の番号の色＝さくら色の濃さの階段（薄い→濃い）。
   ⚠白の上で読める濃さから始める（これより薄いと 11px の文字が消える）*/
function stageColor(i){
  var n=Math.max(1,STAGES.length-1);
  var t=Math.min(1,i/n);
  var a=[0xdd,0x7f,0xa2], b=[0x8e,0x3d,0x66];      // 薄いさくら → 濃い梅
  function ch(k){ return Math.round(a[k]+(b[k]-a[k])*t); }
  return "rgb("+ch(0)+","+ch(1)+","+ch(2)+")";
}

/* ---------- ステージカード ---------- */
/* ⭐列の数を画面の幅から決めて、番号が左の列から下へ進むように並べる（2026-09-16 本人）。
   ⚠grid-auto-flow:column なので、行数を決めないと1行に並んでしまう */
/* ⭐カードの番号（2026-09-16 本人「英語をABCにしてみて」）。
   ⭐日本語は 1,2,3…／英語は A,B,C…。⚠タイルの色はランダムのまま（本人「ランダムのほうがかわいい」） */
function stageLabel(i){
  var ja=0, en=0;
  for(var k=0;k<=i && k<STAGES.length;k++){
    if(STAGES[k].lang==="en") en++; else ja++;
  }
  return (STAGES[i] && STAGES[i].lang==="en") ? String.fromCharCode(64+en) : String(ja);
}
function layoutStages(){
  var el=document.getElementById("stages"); if(!el) return;
  var n=el.children.length; if(!n) return;
  var w=el.clientWidth||900, min=238, gap=18;
  var cols=Math.max(1, Math.min(n, Math.floor((w+gap)/(min+gap))));
  var rows=Math.ceil(n/cols);
  el.style.gridTemplateColumns="repeat("+cols+",1fr)";
  el.style.gridTemplateRows="repeat("+rows+",auto)";
}
window.addEventListener("resize", layoutStages);
function renderStageCards(){
  var logs=getLogs(), best={};
  var lastRec=""; try{ lastRec=localStorage.getItem("typingLastRecord")||""; }catch(err){}
  logs.forEach(function(r){ if(!best[r.stage]||r.ewpm>best[r.stage]) best[r.stage]=r.ewpm; });
  var el=$("stages"); el.innerHTML="";
  /* ⭐学生用のページ（gakusei/・body.gakusei）は説明を短く（2026-09-15 本人「簡単な説明でスタートしたい」）
     ⚠文はコードの原案。本人が直す前提 */
  var GAKUSEI=document.body.classList.contains("gakusei");
  /* ⚠カードの説明をやめたので、短い説明の表は使っていない（2026-09-16）*/
  /* ⭐一覧（hub）ではカードはリンク＝別のページ（play.html）へ移る。
     ⭐ブラウザの←で一覧に戻れる（2026-09-16 本人「Aで」） */
  var HUB = document.body.classList.contains("hub");
  STAGES.forEach(function(s,i){
    var d=document.createElement(HUB ? "a" : "button");
    d.className="stage";
    if(HUB) d.href = "play.html?s=" + (i+1) + (KIDS ? "&kids=1" : "");   /* ⭐こども用の印は持ち回る */
    /* ⭐カードの左のタイルに、タイピングのタイルの7色を順に入れる（2026-09-15 本人「タイルの色にしたらいいかなと思って」）
       ⚠前は STAGE の文字をピンクの濃さの階段にしていた（stageColor・2026-09-08）。色はタイルに移した */
    d.style.setProperty("--tile",BLOCKCOL[i%BLOCKCOL.length]);
    d.setAttribute("data-n", stageLabel(i));   /* ⭐番号はタイルの中に出す。英語は A・B・C（2026-09-16 本人） */
    var stock = (s.shuffle && !GAKUSEI) ? '<div class="no" style="margin-top:6px;color:var(--sub);font-weight:400;line-height:1.5">'+s.items.length+'問から毎回'+(s.pick||s.items.length)+'問</div>' : '';
    /* ⭐説明は大人用だけ（2026-09-16 本人）。⚠学生用は名前だけ＝ノートPCで1画面に収めるため */
    var ds = GAKUSEI ? "" : ('<div class="ds">'+esc(s.desc||"")+'</div>');
    d.innerHTML='<div class="nm">'+esc(s.name)+'</div>'+ds+stock+
                '<div class="best">'+(best[s.name]?("自己ベスト "+best[s.name]+"/1分"+
                  (s.name===lastRec?'<span class="rec">★ 記録更新</span>':"")):"")+'</div>';
    /* ⭐カードの真ん中のグレーの説明はやめた（2026-09-16 本人「真ん中のグレーの文字もなくそう」）。
       ⚠desc は残してある（あとで戻せる／ページの説明に使える） */
    /* ⭐チャレンジのカードは、速さではなく「いちばん多く塗りきれた枚数」を出す */
    if(s.challenge){
      var mx=0;
      logs.forEach(function(r){ if(r.stage===s.name && r.perfect && r.total>mx) mx=r.total; });
      d.querySelector(".best").textContent = mx ? ("いちばん多く塗りきった "+mx+" 枚") : "";
    }
    if(!HUB) d.onclick=function(){ openStage(i); };
    el.appendChild(d);
  });
  layoutStages();
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
  /* ⭐終わったあとは Enter で、新しいお題にして「スタート」を出す（スペースで始まる）
       （2026-09-18 本人「おつかれさまのあとで進めるのがやりにくい」→「スペースでスタートがあったほうがいい」）
     ⚠チャレンジで塗りきったあとは、もう「スタート」が出ているのでスペースだけ */
  /* ⭐「もう一度」もスペースにそろえた（2026-09-18 本人「全部スペースでもう一度でいいんじゃない？」）。
       ⚠前は Enter だった。慣れた人のために Enter も残してある（案内には出さない） */
  if(stageDone && !chWaiting && (e.key===" "||e.code==="Space"||e.key==="Enter")
     && !$("ovRes").classList.contains("on") && !$("ovLog").classList.contains("on")){
    e.preventDefault(); againNow(); return;
  }
  if(stageDone && chWaiting){          // ⭐チャレンジは、スペースだけで次の回へ（ほかのキーは何もしない）
    if(e.key===" "||e.code==="Space"){ e.preventDefault(); pressStart(); }
    return;
  }
  if(stageDone) return;                 // 終わったあとは、打っても勝手に始まらない
  if($("ovRes").classList.contains("on")||$("ovLog").classList.contains("on")) return;
  if(e.ctrlKey||e.altKey||e.metaKey) return;
  if(!startReady){                      // ⭐「スタート」の合図。スペースで始まる（このキーは数えない）
    /* ⭐スペースで始める（2026-09-17 本人「スペースでスタートがいいかも」）。ほかのキーは何もしない */
    if(e.key===" "||e.code==="Space"){ e.preventDefault(); beginRun(); }
    return;
  }
  if(e.key.length!==1) return;
  e.preventDefault();
  $("imeWarn").classList.remove("on");
  if(!running) startTimer();
  feed(e.key.toLowerCase());
});

/* ---------- ボタン ---------- */
$("btnBack").onclick=backToMenu;
$("btnRetry").onclick=function(){ cancelCelebrate(); restartStage(); };
/* ⭐「ミスしたら」を切り替えたら、右上の●もすぐ変える（2026-09-17 本人） */
[].forEach.call(document.querySelectorAll('input[name="lv"]'), function(r){
  r.addEventListener("change", function(){
    var mx=maxLives();
    lives = mx ? Math.min(lives, mx-1) : 0;
    renderLives();
  });
});
/* ⚠「もう一度」「次のステージ」は消した（2026-09-08 本人）。閉じるだけ */
$("btnCloseRes").onclick=function(){ $("ovRes").classList.remove("on"); };
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

/* ⭐？のしるし＝ポインタを合わせると出る（2026-09-08 本人）。
   ⚠指で使う機器にはホバーが無いので、押しても出るようにしておく。
   ⚠表の中の？は毎回作り直されるので、document で受ける */
document.addEventListener("click",function(e){
  var b=e.target;
  while(b && b!==document.body && !(b.classList && b.classList.contains("tip-btn"))) b=b.parentElement;
  var wraps=document.querySelectorAll(".tip-wrap.on");
  for(var i=0;i<wraps.length;i++) wraps[i].classList.remove("on");
  if(!b || !b.classList || !b.classList.contains("tip-btn")) return;
  e.preventDefault(); e.stopPropagation();
  b.parentElement.classList.add("on");
});

$("uname").value=localStorage.getItem("typingName")||"";
$("uname").oninput=function(){ localStorage.setItem("typingName",this.value); };

renderStageCards();
/* こども用は、音を最初から消しておく（2026-09-07 本人・教室で30台が一斉に鳴らないように） */
/* ---------- ミスなしチャレンジ（2026-09-15 本人）---------- */
var CH={base:50, round:1}, chWaiting=false;
/* ⭐回ごとの枚数＝選んだ枚数 × 1.5 の(回-1)乗。上限400（小さくなりすぎると見えない） */
function chCount(){ return Math.min(400, Math.round(CH.base*Math.pow(1.5, CH.round-1))); }
function chLabel(){ return STAGES[stageIdx].name+"　"+CH.round+"回目（"+chCount()+"枚）"; }
/* ⭐お題の置き場＝ステージ6〜11（ホームポジション1〜5は入れない・本人） */
/* ⭐日本語は「日常のことば（ながめ）」だけ。枚数の端数は「日常のことば」で合わせる
     （2026-09-16 本人「日本語のながめの文章だけで続けるのでいい。短い文も加えて数の調整するのはあり」）
   ⭐英語は「英語の日常のことば」から */
function chPool(kind){
  var names = (kind === "en") ? ["日常のことば（英語）", "英単語"]
                              : ["日常のことば（ながめ）", "日常のことば"];
  var p=[];
  STAGES.forEach(function(s){
    if(names.indexOf(s.name) < 0) return;
    s.items.forEach(function(w){ p.push({t:w, kana:s.mode==="kana"}); });
  });
  return p;
}
function chKind(){ var s=STAGES[stageIdx]; return (s && s.challenge) || "ja"; }
/* ⭐枚数ぴったりのお題を作る。残りにぴったり入る言葉を探し、なければ最後の言葉を途中で切る */
function buildChallengeItems(n){
  var pool=shuffled(chPool(chKind())), out=[], sum=0, k=0;
  function len(p){ return (p.kana ? toSyllables(p.t) : toDirect(p.t)).length; }
  while(sum<n){
    if(k>=pool.length){ pool=shuffled(chPool(chKind())); k=0; }
    var p=pool[k++], L=len(p), rest=n-sum;
    if(L<=rest){ out.push(p); sum+=L; continue; }
    var fit=null;
    for(var j=k;j<pool.length;j++){ if(len(pool[j])===rest){ fit=pool[j]; break; } }
    out.push(fit ? fit : {t:p.t, kana:p.kana, cut:rest});
    sum=n;
  }
  return out;
}
function chStart(){
  var el=document.querySelector('input[name="chn"]:checked');
  CH.base = el ? parseInt(el.value,10) : 50;
  CH.round=1; chWaiting=false;
  curItems=buildChallengeItems(chCount());
}
function nextChallengeRound(){
  chWaiting=false; hideToast();
  curItems=buildChallengeItems(chCount());
  $("stName").textContent=chLabel();
  buildGrid(); resetRun();
}
/* ⭐枚数を変えたら1回目から。⚠ラジオにカーソルが残ると矢印キーで枚数が変わるので外す */
Array.prototype.forEach.call(document.querySelectorAll('input[name="chn"]'), function(r){
  r.addEventListener("change", function(){
    r.blur();
    if(!STAGES[stageIdx] || !STAGES[stageIdx].challenge) return;
    chStart(); $("stName").textContent=chLabel();
    buildGrid(); resetRun();
  });
});

/* ⭐練習中は「左＝もどる・やり直し・設定・数字／右＝タイルの紙・キーボード」（2026-09-16 本人）。
   ⭐HTMLは触らず、JSで2つの入れ物に振り分ける＝どのページでも同じ形になる */
(function(){
  var sw = document.querySelector(".stagewrap"); if(!sw || sw.querySelector(".playleft")) return;
  var left = document.createElement("div"); left.className = "playleft";
  var right = document.createElement("div"); right.className = "playright";
  var toLeft = [".bar", ".statsbar", "#playOpts", "#chOpts"];
  var toRight = [".panel", ".kb", ".fingerlegend"];
  toLeft.forEach(function(q){ var el = sw.querySelector(q); if(el) left.appendChild(el); });
  toRight.forEach(function(q){ var el = sw.querySelector(q); if(el) right.appendChild(el); });
  sw.appendChild(left); sw.appendChild(right);
})();

/* ⭐練習ページは、URLの ?s=3 のステージをすぐ開く（2026-09-16 本人） */
(function(){
  if(!document.body.classList.contains("playpage")) return;
  var m = /[?&]s=(\d+)/.exec(location.search || "");
  var i = m ? parseInt(m[1],10)-1 : 0;
  if(i<0 || i>=STAGES.length) i=0;
  openStage(i);
  showTouchNote();
})();
/* ⭐スマホ・タブレット（指で操作する画面）だけ、練習ページを開いたときに数秒の案内（2026-09-17 本人）。
   ⚠入力欄が無いので、画面のキーボードは出ない＝つないだキーボードでしか打てない。一覧のページには出さない */
function showTouchNote(){
  var touch = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 0;
  if(!touch) return;
  var n=document.createElement("div"); n.className="touchnote";
  n.innerHTML="キーボードをつないで練習してください。<wbr>画面のキーボードは指の見本です。";
  /* ⭐スタートのボタンのすぐ上に出す（2026-09-17 本人「スタートの上にメッセージ表示して」）。
     ⚠ボタンと同じ入れ物（お題のカード）の中に置く＝ボタンと一緒に動く */
  var box=document.querySelector(".textwrap");
  if(box){ n.classList.add("inwrap"); box.appendChild(n); } else { document.body.appendChild(n); }
  requestAnimationFrame(function(){ n.classList.add("on"); });
  setTimeout(function(){ n.classList.remove("on"); setTimeout(function(){ if(n.parentNode) n.parentNode.removeChild(n); }, 400); }, 4000);
}

if(KIDS){ document.body.classList.add("kids"); if($("optSound")) $("optSound").checked=false; }
drawCoins();
/* 画面の幅が変わったら、入る列だけ描き直す */
window.addEventListener("resize", function(){ if(window.coinResize) clearTimeout(window.coinResize); window.coinResize=setTimeout(drawCoins,150); });

/* ⭐テスト用：紙吹雪を見るボタン（2026-09-18 本人「テスト用で、紙吹雪見たい。いちいち入力しないといけないのしんどい」）
   ⚠テスト版の札（#testBadge）があるページにだけ出る＝公開のページには出ない。結果や記録には何も残さない */
(function(){
  var b=document.getElementById("testBadge"); if(!b) return;
  var btn=document.createElement("button");
  btn.type="button"; btn.className="noprint"; btn.textContent="🎉 紙吹雪を見る";
  btn.style.cssText="position:fixed;left:6px;bottom:10px;z-index:9999;font-size:11px;padding:3px 9px;border-radius:999px;border:1px solid #c86a8e;background:#fff;color:#c86a8e;cursor:pointer";
  /* ⚠本人の画面で動かなかった（2026-09-18）。何が起きたかをボタンの文字に出す（原因を探すため） */
  btn.onclick=function(){
    btn.blur();
    try{
      var host=document.querySelector("#play .panel");
      fireworks(0,null);
      var cv=document.querySelector("canvas.confetti");
      btn.textContent="🎉 押した（枠 "+(host?host.clientWidth+"×"+host.clientHeight:"なし")+"／紙 "+(cv?"あり":"なし")+"）";
    }catch(err){ btn.textContent="⚠ "+err.message; }
  };
  document.body.appendChild(btn);
})();
