const DATA = [
  // 合計・計算
  {n:"SUM", k:"さむ ごうけい たしざん", c:"合計・計算", w:"合計する", u:"数字をぜんぶ足したい", h:"=SUM(B2:B10)", m:"いちばん使う関数。範囲を選ぶだけです。"},
  {n:"SUMIF", k:"さむいふ じょうけん ごうけい", c:"合計・計算", w:"条件に合うものだけ合計する", u:"「A支店」の分だけ合計したい", h:'=SUMIF(A2:A20,"A支店",C2:C20)', m:"順番は「どこを見て / 何と一致したら / どこを足す」。"},
  {n:"SUMIFS", k:"さむいふす ふくすう じょうけん ごうけい", c:"合計・計算", w:"条件が2つ以上のときに合計する", u:"「A支店」の「4月分」だけ合計したい", h:'=SUMIFS(C2:C20,A2:A20,"A支店",B2:B20,"4月")', m:"SUMIFと引数の順番が逆です。足す範囲が先。"},
  {n:"SUBTOTAL", k:"さぶとーたる しぼりこみ ごうけい", c:"合計・計算", w:"絞り込んで表示されている分だけ合計する", u:"フィルターをかけた分だけ合計したい", h:"=SUBTOTAL(9,C2:C20)", m:"SUMだと隠れた行まで足してしまいます。"},
  {n:"AVERAGE", k:"あべれーじ へいきん", c:"合計・計算", w:"平均を出す", u:"平均点や平均金額を出したい", h:"=AVERAGE(B2:B10)", m:"空白は無視されますが、0は計算に入ります。"},
  {n:"ROUND", k:"らうんど ししゃごにゅう", c:"合計・計算", w:"四捨五入する", u:"小数点以下がずらっと出るのを直したい", h:"=ROUND(B2,0)", m:"最後の数字が桁。0で整数、1で小数第1位まで。"},
  {n:"ROUNDUP", k:"らうんどあっぷ きりあげ", c:"合計・計算", w:"切り上げる", u:"箱の数など、切り上げないと足りないとき", h:"=ROUNDUP(B2,0)", m:"ROUNDと使い方は同じです。"},
  {n:"ROUNDDOWN", k:"らうんどだうん きりすて", c:"合計・計算", w:"切り捨てる", u:"消費税の端数を切り捨てたい", h:"=ROUNDDOWN(B2,0)", m:"INTでも切り捨てできますが、桁を指定できるのはこちら。"},

  // 数える
  {n:"COUNT", k:"かうんと かぞえる すうじ", c:"数える", w:"数字が入っているセルを数える", u:"何件データが入っているか知りたい", h:"=COUNT(B2:B20)", m:"文字が入っているセルは数えません。"},
  {n:"COUNTA", k:"かうんとえー かぞえる くうはく", c:"数える", w:"空白でないセルを数える", u:"名前が入っている人数を数えたい", h:"=COUNTA(A2:A20)", m:"文字でも数字でも、何か入っていれば1件。"},
  {n:"COUNTIF", k:"かうんといふ じょうけん かぞえる", c:"数える", w:"条件に合うものの数を数える", u:"「済」が何件あるか数えたい", h:'=COUNTIF(D2:D20,"済")', m:"重複チェックにも使えます（2以上なら重複）。"},
  {n:"COUNTIFS", k:"かうんといふす ふくすう じょうけん かぞえる", c:"数える", w:"条件が2つ以上のときに数える", u:"「A支店」の「未着手」が何件か数えたい", h:'=COUNTIFS(A2:A20,"A支店",D2:D20,"未着手")', m:"条件は何組でも足せます。"},
  {n:"COUNTBLANK", k:"かうんとぶらんく くうはく かぞえる", c:"数える", w:"空白のセルを数える", u:"未記入がいくつ残っているか知りたい", h:"=COUNTBLANK(D2:D20)", m:"提出物のチェックに便利です。"},

  // 探す・引っぱる
  {n:"XLOOKUP", k:"えっくするっくあっぷ さがす ひっぱる", c:"探す・引っぱる", w:"別の表から探して持ってくる", u:"商品コードを入れたら商品名が出るようにしたい", h:"=XLOOKUP(A2,商品!A:A,商品!B:B)", m:"VLOOKUPの新しい版。左方向にも探せます。"},
  {n:"VLOOKUP", k:"ぶいるっくあっぷ さがす ひっぱる", c:"探す・引っぱる", w:"表の左端で探して、右にある値を持ってくる", u:"別の表から名前や単価を引っぱってきたい", h:"=VLOOKUP(A2,商品!A:C,2,FALSE)", m:"最後のFALSEを忘れると、違う行を拾うことがあります。"},
  {n:"HLOOKUP", k:"えいちるっくあっぷ よこ さがす", c:"探す・引っぱる", w:"横方向に探して持ってくる", u:"表が横並びになっているとき", h:"=HLOOKUP(A2,料金!A1:F3,2,FALSE)", m:"縦の表が多いので、出番は少なめです。"},
  {n:"INDEX", k:"いんでっくす とりだす", c:"探す・引っぱる", w:"「上から〇番目」の値を取り出す", u:"MATCHと組にして自由な方向に探したい", h:"=INDEX(B2:B20,3)", m:"単体より、MATCHとセットで使います。"},
  {n:"MATCH", k:"まっち なんばんめ", c:"探す・引っぱる", w:"探すものが何番目にあるかを返す", u:"リストの何行目にあるか知りたい", h:'=MATCH("田中",A2:A20,0)', m:"最後の0は「完全に一致するもの」の意味。"},
  {n:"IFERROR", k:"いふえらー えらー かくす", c:"探す・引っぱる", w:"エラーのときに別の表示にする", u:"#N/A が並ぶのを消したい", h:'=IFERROR(VLOOKUP(A2,商品!A:C,2,FALSE),"")', m:"隠すだけなので、原因が分かってから使ってください。"},

  // 条件で分ける
  {n:"IF", k:"いふ もし じょうけん", c:"条件で分ける", w:"条件で表示を分ける", u:"80点以上なら「合格」と出したい", h:'=IF(B2>=80,"合格","不合格")', m:"「もし〜なら / そうならA / ちがえばB」の順です。"},
  {n:"IFS", k:"いふす ふくすう じょうけん", c:"条件で分ける", w:"条件を上から順に判定して分ける", u:"点数でA・B・Cに分けたい", h:'=IFS(B2>=80,"A",B2>=60,"B",TRUE,"C")', m:"IFを何個も入れ子にするより読みやすいです。"},
  {n:"AND", k:"あんど かつ りょうほう", c:"条件で分ける", w:"条件をすべて満たすかを判定する", u:"「A支店」かつ「10万円以上」を見つけたい", h:'=IF(AND(A2="A支店",C2>=100000),"○","")', m:"IFの中に入れて使います。"},
  {n:"OR", k:"おあ または どちらか", c:"条件で分ける", w:"条件のどれかを満たすかを判定する", u:"「未着手」か「保留」なら印を付けたい", h:'=IF(OR(D2="未着手",D2="保留"),"要確認","")', m:"ANDと同じくIFの中で使います。"},

  // 日付・曜日
  {n:"TODAY", k:"とぅでい きょう ひづけ", c:"日付・曜日", w:"今日の日付を出す", u:"開いた日の日付を自動で入れたい", h:"=TODAY()", m:"かっこの中は空。開くたびに更新されます。"},
  {n:"DATE", k:"でーと ひづけ つくる", c:"日付・曜日", w:"年・月・日から日付を作る", u:"年月を変えるだけのカレンダーを作りたい", h:"=DATE(B1,C1,1)", m:"シフト表や勤怠表の土台になります。"},
  {n:"TEXT", k:"てきすと ひょうじけいしき ようび", c:"日付・曜日", w:"表示の形を変える（曜日を出す）", u:"日付から曜日を自動で出したい", h:'=TEXT(B3,"aaa")', m:'"aaa"で「月」、"aaaa"で「月曜日」になります。'},
  {n:"WEEKDAY", k:"うぃーくでい ようび ばんごう", c:"日付・曜日", w:"曜日を番号で返す", u:"土日だけ色を変える条件にしたい", h:"=WEEKDAY(B3)", m:"1が日曜。条件付き書式と組で使います。"},
  {n:"EOMONTH", k:"いーおーまんす げつまつ", c:"日付・曜日", w:"月末の日付を出す", u:"締め日や月末を自動で出したい", h:"=EOMONTH(TODAY(),0)", m:"0で今月末、1で翌月末、-1で先月末。"},
  {n:"DATEDIF", k:"でいとでぃふ きかん ねんすう", c:"日付・曜日", w:"2つの日付のあいだの期間を数える", u:"勤続年数や年齢を出したい", h:'=DATEDIF(B2,TODAY(),"Y")', m:'"Y"で年、"M"で月、"D"で日。候補に出てこない関数です。'},

  // 文字をあつかう
  {n:"LEFT", k:"れふと ひだり とりだす", c:"文字をあつかう", w:"左から指定した文字数を取り出す", u:"郵便番号の上3桁だけ取り出したい", h:"=LEFT(A2,3)", m:"住所や商品コードの分解に。"},
  {n:"RIGHT", k:"らいと みぎ とりだす", c:"文字をあつかう", w:"右から指定した文字数を取り出す", u:"電話番号の下4桁だけ取り出したい", h:"=RIGHT(A2,4)", m:"LEFTと使い方は同じです。"},
  {n:"MID", k:"みっど とちゅう とりだす", c:"文字をあつかう", w:"途中から指定した文字数を取り出す", u:"コードの4文字目から3文字だけ欲しい", h:"=MID(A2,4,3)", m:"「何文字目から / 何文字」の順です。"},
  {n:"LEN", k:"れん もじすう かぞえる", c:"文字をあつかう", w:"文字数を数える", u:"入力ミスで桁数が違うものを探したい", h:"=LEN(A2)", m:"空白も1文字として数えます。"},
  {n:"TRIM", k:"とりむ よぶんな くうはく けす", c:"文字をあつかう", w:"よけいな空白を消す", u:"貼り付けたデータの前後に空白が入っている", h:"=TRIM(A2)", m:"VLOOKUPが合わない原因は、たいていこれです。"},
  {n:"SUBSTITUTE", k:"さぶすてぃちゅーと おきかえ", c:"文字をあつかう", w:"特定の文字を別の文字に置き換える", u:"ハイフンを消したい・全部まとめて直したい", h:'=SUBSTITUTE(A2,"-","")', m:"置換（Ctrl+H）と違って、元のデータを残せます。"},
  {n:"TEXTJOIN", k:"てきすとじょいん つなぐ けつごう", c:"文字をあつかう", w:"複数のセルを区切り文字でつなぐ", u:"姓と名を、間に空白を入れてつなげたい", h:'=TEXTJOIN(" ",TRUE,A2,B2)', m:"&でつなぐより、区切りを一度で指定できます。"},
  {n:"PHONETIC", k:"ふぉねてぃっく ふりがな よみがな", c:"文字をあつかう", w:"ふりがなを取り出す", u:"名簿に読みがなの列を足したい", h:"=PHONETIC(A2)", m:"Excelで入力した文字にしか使えません。"},
  {n:"ASC", k:"あすき ぜんかく はんかく", c:"文字をあつかう", w:"全角を半角にそろえる", u:"数字が全角と半角で混ざっている", h:"=ASC(A2)", m:"逆（半角→全角）はJIS関数です。"},

  // 最大・最小・順位
  {n:"MAX", k:"まっくす さいだい いちばんおおきい", c:"最大・最小・順位", w:"いちばん大きい数を出す", u:"最高売上がいくらか知りたい", h:"=MAX(C2:C20)", m:"文字は無視されます。"},
  {n:"MIN", k:"みん さいしょう いちばんちいさい", c:"最大・最小・順位", w:"いちばん小さい数を出す", u:"最低価格を知りたい", h:"=MIN(C2:C20)", m:"空白は0として扱われません。"},
  {n:"RANK", k:"らんく じゅんい", c:"最大・最小・順位", w:"順位を出す", u:"売上の順位を付けたい", h:"=RANK(C2,$C$2:$C$20,0)", m:"範囲は$で固定しないと、下にコピーしたときズレます。"},
  {n:"LARGE", k:"らーじ おおきいほうから", c:"最大・最小・順位", w:"大きいほうから〇番目を出す", u:"ベスト3を出したい", h:"=LARGE(C2:C20,3)", m:"1位ならMAXと同じ結果になります。"},
  {n:"SMALL", k:"すもーる ちいさいほうから", c:"最大・最小・順位", w:"小さいほうから〇番目を出す", u:"ワースト3を出したい", h:"=SMALL(C2:C20,3)", m:"LARGEと使い方は同じです。"},

  // 新しい関数
  {n:"FILTER", k:"ふぃるたー じょうけん ぬきだす", c:"新しい関数", w:"条件に合う行だけを抜き出す", u:"「A支店」の行だけ別の場所に並べたい", h:'=FILTER(A2:C20,A2:A20="A支店")', m:"元の表はそのまま。Microsoft 365で使えます。"},
  {n:"SORT", k:"そーと ならべかえ", c:"新しい関数", w:"並べ替えた結果を出す", u:"元の表を触らずに並べ替えたい", h:"=SORT(A2:C20,3,-1)", m:"-1で大きい順。数式なので自動で並び直ります。"},
  {n:"UNIQUE", k:"ゆにーく じゅうふく けす", c:"新しい関数", w:"重複を除いた一覧を出す", u:"取引先の名前を、ダブりなしで並べたい", h:"=UNIQUE(A2:A20)", m:"ドロップダウンの元データ作りに便利です。"}
];

const CATS = ["合計・計算","数える","探す・引っぱる","条件で分ける","日付・曜日","文字をあつかう","最大・最小・順位","新しい関数"];

// 覚える順番（1→2→3）。入れ替えたいときはこの3行だけ直せばOK
const LV = {
  1: ["SUM","AVERAGE","COUNT","COUNTA","MAX","MIN","TODAY","ROUND","IF","LEFT","RIGHT","LEN"],
  2: ["SUMIF","COUNTIF","COUNTBLANK","ROUNDUP","ROUNDDOWN","SUBTOTAL","VLOOKUP","XLOOKUP","IFERROR",
      "TEXT","DATE","WEEKDAY","MID","TRIM","SUBSTITUTE","RANK","TEXTJOIN","ASC","PHONETIC"],
  3: ["SUMIFS","COUNTIFS","IFS","AND","OR","INDEX","MATCH","HLOOKUP","EOMONTH","DATEDIF",
      "LARGE","SMALL","FILTER","SORT","UNIQUE"]
};
const LVNAME = { 1:"まず覚えたい　1 → 12", 2:"つぎに覚えたい　13 → 31", 3:"慣れてきたら　32 → 46" };
const ORDER = [...LV[1], ...LV[2], ...LV[3]];   // これが「覚える順」の通し番号
DATA.forEach(d => {
  d.lv = LV[1].includes(d.n) ? 1 : LV[2].includes(d.n) ? 2 : 3;
  d.no = ORDER.indexOf(d.n) + 1;
});

let state = { q: "", cat: "すべて", sort: "idx", detail: null };

const $q = document.getElementById("q");
const $clear = document.getElementById("clear");
const $sbtn = document.getElementById("sbtn");
const $sbox = document.getElementById("sbox");
const $cat = document.getElementById("cat");
const $sort = document.getElementById("sort");
const $list = document.getElementById("list");
const $count = document.getElementById("count");

// 分類（プルダウン）
["すべて", ...CATS].forEach(c => {
  const o = document.createElement("option");
  o.value = c;
  o.textContent = c === "すべて" ? "すべての分類" : c;
  $cat.appendChild(o);
});
function setCat(c) {
  state.cat = c;
  $cat.value = c;
  $cat.classList.toggle("on", c !== "すべて");
}
$cat.addEventListener("change", () => { setCat($cat.value); state.detail = null; render(); });

// 並び順（プルダウン）
const SORTS = [
  ["idx", "やりたいこと順"],
  ["lv",  "覚える順"],
  ["abc", "A → Z 順"]
];
SORTS.forEach(([v, label]) => {
  const o = document.createElement("option");
  o.value = v; o.textContent = label;
  $sort.appendChild(o);
});
$sort.value = state.sort;
$sort.addEventListener("change", () => {
  state.sort = $sort.value; state.detail = null; render();
});

// 検索の開け閉め
$sbtn.addEventListener("click", () => {
  const open = $sbox.hidden;
  $sbox.hidden = !open;
  $sbtn.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) { $q.focus(); }
  else if (state.q) { $q.value = ""; state.q = ""; $clear.style.display = "none"; render(); }
});
$q.addEventListener("input", () => {
  state.q = $q.value.trim().toLowerCase();
  $clear.style.display = $q.value ? "block" : "none";
  state.detail = null;
  render();
});
$clear.addEventListener("click", () => {
  $q.value = ""; state.q = ""; $clear.style.display = "none"; $q.focus(); render();
});

function esc(s){ return s.replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m])); }

function render() {
  const q = state.q;
  let rows = DATA.filter(d => {
    if (state.cat !== "すべて" && d.c !== state.cat) return false;
    if (!q) return true;
    return (d.n + " " + d.k + " " + d.w + " " + d.u + " " + d.c).toLowerCase().includes(q);
  });

  if (state.sort === "abc") {
    rows = [...rows].sort((a, b) => a.n.localeCompare(b.n));
  } else if (state.sort === "lv") {
    rows = [...rows].sort((a, b) => a.no - b.no);
  } else {
    rows = [...rows].sort((a, b) => CATS.indexOf(a.c) - CATS.indexOf(b.c));
  }

  // 1件だけの詳細
  if (state.detail) { renderDetail(rows); return; }

  // 一覧
  $count.textContent = (state.cat === "すべて" ? "" : "「" + state.cat + "」")
    + rows.length + " / " + DATA.length + " 件　タップでその関数へ";
  $list.className = "list isidx";
  $list.innerHTML = "";

  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.innerHTML = '<strong>見つかりませんでした。</strong><br>'
      + 'ちがう言葉で探してください。';
    $list.appendChild(p);
    return;
  }

  let lastGroup = null;
  rows.forEach(d => {
    const g = state.sort === "idx" ? d.c
            : state.sort === "lv"  ? LVNAME[d.lv]
            : null;
    if (g && g !== lastGroup) {
      const h = document.createElement("div");
      h.className = "groupname";
      h.textContent = g;
      $list.appendChild(h);
      lastGroup = g;
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "idxrow";
    if (state.sort === "idx") {
      b.innerHTML = '<span class="iw">' + esc(d.w) + '</span>'
                  + '<span class="ifn">' + esc(d.n) + '</span>';
    } else {
      b.innerHTML = (state.sort === "lv" ? '<span class="ino">' + d.no + '</span>' : '')
                  + '<span class="ifn lead">' + esc(d.n) + '</span>'
                  + '<span class="iw">' + esc(d.w) + '</span>';
    }
    b.addEventListener("click", () => openDetail(d.n));
    $list.appendChild(b);
  });
}

function openDetail(name) {
  state.detail = name;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderDetail(rows) {
  const d = DATA.find(x => x.n === state.detail);
  if (!d) { state.detail = null; render(); return; }

  const i = rows.findIndex(x => x.n === d.n);
  const prev = i > 0 ? rows[i - 1] : null;
  const next = i >= 0 && i < rows.length - 1 ? rows[i + 1] : null;

  $count.textContent = state.sort === "lv"
    ? "覚える順　" + d.no + " / " + DATA.length
    : "";
  $list.className = "list";
  $list.innerHTML = "";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "backbtn";
  back.innerHTML = '<span aria-hidden="true">&lsaquo;</span> 一覧にもどる';
  back.addEventListener("click", () => {
    state.detail = null; render(); window.scrollTo({ top: 0 });
  });
  $list.appendChild(back);

  const art = document.createElement("article");
  art.className = "detail";
  art.innerHTML =
      '<div class="dhead">'
    +   '<span class="dname">' + esc(d.n) + '</span>'
    +   '<span class="dcat">' + esc(d.c) + '</span>'
    + '</div>'
    + '<p class="dwhat">' + esc(d.w) + '</p>'
    + '<dl>'
    +   '<div><dt>こんなとき</dt><dd>' + esc(d.u) + '</dd></div>'
    +   '<div><dt>書き方</dt><dd><code class="code mono">' + esc(d.h) + '</code></dd></div>'
    +   '<div><dt>メモ</dt><dd class="dnote">' + esc(d.m) + '</dd></div>'
    + '</dl>';

  const nav = document.createElement("div");
  nav.className = "dnav";
  const mk = (item, label) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = item ? label.replace("%s", item.n) : label.replace("%s", "―");
    b.disabled = !item;
    if (item) b.addEventListener("click", () => openDetail(item.n));
    return b;
  };
  nav.appendChild(mk(prev, "‹ %s"));
  nav.appendChild(mk(next, "%s ›"));
  art.appendChild(nav);

  $list.appendChild(art);
}

render();