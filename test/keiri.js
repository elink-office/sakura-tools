/* 請求書メーカー
   ⭐このツールは「作る道具」で「保管庫」ではない（2026-09-09 本人）。
     覚えるのは 自分の情報・取引先・振込先・番号の形と最後の番号 だけ。
     ⚠作った請求書そのもの（品目・金額）は保存しない。画面を閉じたら消える。
   ⭐PDFのファイル名は、印刷の直前に document.title を書き換えて決める。
   ⭐見本はA4を1枚まるごと出す。画面が狭いときは縮めて見せ、押すと大きくなる。 */
(function(){
'use strict';

/* ⭐経理の箱（→ ページの型 4）。⭐請求書・領収書・見積書で同じデータを使う（2026-09-09 本人）
   ⚠名簿の箱（sakura-tools-rosters-v1）とは分ける。座席表の一覧に取引先が出てはいけない */
/* ⭐書類の種類は HTML の <body data-doc="..."> で決める（2026-09-10）。
   ⚠請求書・見積書・領収書で1本のJSを共有する（→ ページの型 16-a） */
var DOC = (document.body.getAttribute('data-doc') || 'seikyu');
var DOCS = {
  seikyu: {
    title:'請求書', file:'請求書',
    amount:'ご請求金額（税込）', lead:'下記のとおりご請求申し上げます。',
    dueLabel:'お支払い期限', showBank:true, dueMode:'monthEnd',
    payLabel:'差引ご請求額'
  },
  mitsumori: {
    title:'見積書', file:'見積書',
    amount:'お見積金額（税込）', lead:'下記のとおりお見積り申し上げます。',
    dueLabel:'有効期限', showBank:false, dueMode:'plus1m',
    payLabel:'差引お支払予定額'
  }
};
var D = DOCS[DOC] || DOCS.seikyu;

var KEY = 'sakura-keiri-v1';
/* ⭐ひな形だけ30件（2026-09-10 本人「ここだけ件数を増やしたい。せめて30件」）。
   ⚠取引先・自分の情報は今までどおり */
var MAX_FORMS = 30;
var OLD_KEYS = ['sakura-invoice-v1', 'sakura-seikyu-v1'];
var $ = function(id){ return document.getElementById(id); };

/* ========== 覚えているもの ========== */
var db = { me:{}, clients:[], bank:'', note:'', logo:'',
           noPrefix:'', noDigits:3, usedNos:[], lastSeq:0, docs:{}, forms:[] };

/* ⭐取引先を1件足す（同じ名前があれば足さない） */
function addClient(c){
  if(!c || !c.name) return;
  for(var i=0;i<db.clients.length;i++){ if(db.clients[i].name === c.name) return; }
  if(db.clients.length >= 20) return;
  db.clients.push({ name:c.name, honor:c.honor || '御中', person:c.person || '', addr:c.addr || '' });
}
/* ⭐内容から相手の情報を取り除く。⚠名前が無いときは「会社名／件名」を作る */
function cleanForm(f, who){
  var label = f.label || '';
  if(!label){
    var sub = f.subject || '';
    label = who ? (sub ? who + '／' + sub : who) : (sub || '名前なし');
  }
  return { label:label, subject:f.subject || '', items:f.items || [],
           round:f.round || '', cols:f.cols || null, note:f.note || '' };
}

function load(){
  try{
    var s = localStorage.getItem(KEY);
    /* 前の置き場に残っていたら引き継ぐ */
    if(!s){
      for(var k=0;k<OLD_KEYS.length;k++){
        var old = localStorage.getItem(OLD_KEYS[k]);
        if(old){ localStorage.setItem(KEY, old); localStorage.removeItem(OLD_KEYS[k]); s = old; break; }
      }
    }
    if(!s) return false;
    var o = JSON.parse(s);
    if(o && typeof o === 'object'){
      db.me       = o.me || {};
      db.clients  = o.clients || [];
      db.bank     = o.bank || '';
      db.note     = o.note || '';
      db.logo     = o.logo || '';
      /* ⭐取引先は「相手の情報」だけ。内容（件名・明細）は別の箱（2026-09-10 本人
         「取引先データっていうのは、あくまでもその情報。明細は別だわ」）。
         ⚠同じ相手に2つの案を出すことがあるので、内容は相手にぶら下げない */
      db.forms = [];
      (o.forms || []).forEach(function(f){
        if(!f) return;
        /* ⚠古い形は相手を丸ごと抱えていた。⭐相手は取引先の箱へ移し、内容からは外す */
        var fc = f.client;
        if(fc && fc.name) addClient(fc);
        db.forms.push(cleanForm(f, fc && fc.name ? fc.name : (f.name || '')));
      });
      /* ⚠いったん取引先に明細を入れた形（2026-09-10 の途中）も、ここで分ける */
      db.clients.forEach(function(c){
        if((c.items || []).length) db.forms.push(cleanForm(c, c.name));
        delete c.subject; delete c.items; delete c.round; delete c.cols; delete c.note;
      });
      if(db.forms.length > MAX_FORMS) db.forms.length = MAX_FORMS;
      db.handoff  = o.handoff || null;
      db.noPrefix = o.noPrefix || '';
      db.noDigits = o.noDigits || 3;
      /* ⭐番号の記録は書類ごとに分ける（請求書と見積書で連番が混ざらないように） */
      db.docs = o.docs || {};
      if(!db.docs[DOC]) db.docs[DOC] = {};
      /* ⚠古い形（usedNos / lastSeq が直に入っている）から引き継ぐ */
      if(o.usedNos || o.lastSeq){
        if(!db.docs.seikyu) db.docs.seikyu = {};
        if(!db.docs.seikyu.usedNos) db.docs.seikyu.usedNos = o.usedNos || [];
        if(!db.docs.seikyu.lastSeq) db.docs.seikyu.lastSeq = o.lastSeq || 0;
      }
      db.usedNos  = db.docs[DOC].usedNos || [];
      db.lastSeq  = db.docs[DOC].lastSeq || 0;
      return true;
    }
  }catch(e){}
  return false;
}
function save(){
  try{
    if(!db.docs) db.docs = {};
    db.docs[DOC] = { usedNos: db.usedNos, lastSeq: db.lastSeq };
    var out = {};
    ['me','clients','bank','note','logo','noPrefix','noDigits','docs','forms','handoff'].forEach(function(k){ out[k]=db[k]; });
    localStorage.setItem(KEY, JSON.stringify(out));
  }catch(e){}
}

/* ⭐ヘッダー（＋帯）の下に見える位置へ飛ぶ（2026-09-10 本人
   「「？のしるしを押すと、くわしい説明が出ます。」が見える場所に飛ぶ方がいいわ」）。
   ⚠52px の決め打ちだと、帯のぶんだけ隠れていた */
function scrollToEl(el){
  if(!el) return;
  var head = document.querySelector('.site-head');
  var hh = head ? head.getBoundingClientRect().height : 52;
  var y = el.getBoundingClientRect().top + window.pageYOffset - hh - 12;
  window.scrollTo(0, Math.max(0, y));
}

/* 保存の知らせ（共通CSSの .saving＝桃色・太字。3.5秒で消す） */
function flash(el){
  if(!el) return;
  el.hidden = false;
  setTimeout(function(){ el.hidden = true; }, 3500);
}

/* ========== 日付 ========== */
function pad(n){ return (n<10?'0':'') + n; }
function todayStr(){
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}
function ymd(v){ return v ? v.replace(/-/g,'') : ''; }
function jpDate(v){
  if(!v) return '';
  var p = v.split('-');
  return p[0] + '年' + Number(p[1]) + '月' + Number(p[2]) + '日';
}
/* ⭐見積書は「発行日から1か月後」（2026-09-10） */
function plusOneMonth(){
  var v = $('invDate').value;
  var d = v ? new Date(v) : new Date();
  d.setMonth(d.getMonth() + 1);
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}
function nextMonthEnd(){
  var d = new Date();
  var e = new Date(d.getFullYear(), d.getMonth() + 2, 0);   /* 来月の末日 */
  return e.getFullYear() + '-' + pad(e.getMonth()+1) + '-' + pad(e.getDate());
}

/* ========== 請求書番号 ==========
   ⭐頭は自由に決められる（例 2026- ／ SAKURA- ／ A）。末尾の番号だけが1つずつ増える。
   ⭐頭が「西暦4桁＋区切り」の形のときは、年が変わったら頭を書き替えて 1 に戻す。 */
function defaultPrefix(){ return new Date().getFullYear() + '-'; }

function fixPrefixForYear(){
  var m = /^(\d{4})(\D*)$/.exec(db.noPrefix || '');
  if(!m) return;
  var y = new Date().getFullYear();
  if(Number(m[1]) !== y){
    db.noPrefix = y + m[2];
    db.lastSeq = 0;
    save();
  }
}
function zeroPad(n, d){
  var s = String(n);
  while(s.length < d) s = '0' + s;
  return s;
}
function makeNo(){
  return (db.noPrefix || '') + zeroPad(db.lastSeq + 1, db.noDigits);
}
function refreshNo(){
  db.noPrefix = $('noPrefix').value;
  db.noDigits = parseInt($('noDigits').value, 10) || 3;
  $('invNo').value = makeNo();
  checkNo();
}
function checkNo(){
  var v = $('invNo').value.trim();
  var hint = $('noHint');
  /* 🔴⚠サンプルは番号を 001 に固定しているので、使ったことがある番号になる。
     ⭐お試しで見ている人に警告を出さない（2026-09-10 本人「サンプルに出なくできないのかな」） */
  var sampleNo = (db.noPrefix || '') + zeroPad(1, db.noDigits);
  if(!(SAMPLE_ON && v === sampleNo) && v && db.usedNos.indexOf(v) >= 0){
    hint.innerHTML = '⚠ <strong>この番号は使ったことがあります。</strong>別の番号にしてください。';
    hint.style.color = 'var(--bad)';
    return false;
  }
  hint.textContent = '自動で振っています。書き直せます。';
  hint.style.color = '';
  return true;
}

/* ========== 明細 ========== */
var RATES = [['10','10%'],['8','8%'],['0','なし']];

function addRow(v){
  v = v || {};
  var tr = document.createElement('tr');

  function cell(el, cls){
    var td = document.createElement('td');
    if(cls){ td.className = cls; td.hidden = !$(cls === 'col-date' ? 'colDate' : 'colCode').checked; }
    td.appendChild(el); return td;
  }

  var tdNo = document.createElement('td');
  tdNo.className = 'c-no';

  var iDate = document.createElement('input');
  iDate.type = 'text'; iDate.className = 'i-date'; iDate.value = v.date || '';
  iDate.placeholder = '9/1';

  var iCode = document.createElement('input');
  iCode.type = 'text'; iCode.className = 'i-code'; iCode.value = v.code || '';
  iCode.placeholder = 'A-1234';

  var iName = document.createElement('input');
  iName.type = 'text'; iName.className = 'i-name'; iName.value = v.name || '';
  iName.placeholder = 'ホームページ制作費';

  var iQty = document.createElement('input');
  iQty.type = 'number'; iQty.className = 'i-qty'; iQty.min = '0'; iQty.step = 'any';
  iQty.value = (v.qty === undefined ? '' : v.qty);

  var iUnit = document.createElement('input');
  iUnit.type = 'text'; iUnit.className = 'i-unit'; iUnit.value = v.unit || '';
  iUnit.placeholder = '式';
  iUnit.setAttribute('list', 'unitList');   /* ⭐候補から選べる。ここに無いものも打てる */

  var iPrice = document.createElement('input');
  iPrice.type = 'number'; iPrice.className = 'i-price'; iPrice.step = 'any';
  iPrice.value = (v.price === undefined ? '' : v.price);

  var sRate = document.createElement('select');
  sRate.className = 'i-rate';
  for(var i=0;i<RATES.length;i++){
    var op = document.createElement('option');
    op.value = RATES[i][0]; op.textContent = RATES[i][1];
    sRate.appendChild(op);
  }
  sRate.value = (v.rate === undefined ? '10' : String(v.rate));

  var tdAmt = document.createElement('td');
  tdAmt.className = 'c-amt'; tdAmt.textContent = '0';

  var tdDel = document.createElement('td');
  tdDel.className = 'c-del';
  var bDel = document.createElement('button');
  bDel.type = 'button'; bDel.textContent = '×'; bDel.title = 'この行を消す';
  bDel.onclick = function(){
    tr.parentNode.removeChild(tr);
    if(!$('itemBody').children.length) addRow();
    calc();
  };
  tdDel.appendChild(bDel);

  tr.appendChild(tdNo);
  tr.appendChild(cell(iDate, 'col-date'));
  tr.appendChild(cell(iName));
  tr.appendChild(cell(iCode, 'col-code'));
  tr.appendChild(cell(iQty)); tr.appendChild(cell(iUnit));
  tr.appendChild(cell(iPrice));
  tr.appendChild(cell(sRate));
  tr.appendChild(tdAmt); tr.appendChild(tdDel);
  $('itemBody').appendChild(tr);
}

/* 列の出し入れ（入力の表） */
function drawCols(){
  var d = $('colDate').checked, c = $('colCode').checked;
  Array.prototype.forEach.call(document.querySelectorAll('.col-date'), function(e){ e.hidden = !d; });
  Array.prototype.forEach.call(document.querySelectorAll('.col-code'), function(e){ e.hidden = !c; });
}

function rows(){ return Array.prototype.slice.call($('itemBody').children); }

function readRow(tr){
  var q = parseFloat(tr.querySelector('.i-qty').value);
  var p = parseFloat(tr.querySelector('.i-price').value);
  if(isNaN(q)) q = 0;
  if(isNaN(p)) p = 0;
  var name = tr.querySelector('.i-name').value.trim();
  var unit = tr.querySelector('.i-unit').value.trim();
  var date = tr.querySelector('.i-date').value.trim();
  var code = tr.querySelector('.i-code').value.trim();
  return {
    name : name,
    qty  : q,
    unit : unit,
    date : date,
    code : code,
    price: p,
    rate : parseInt(tr.querySelector('.i-rate').value, 10),
    amt  : Math.round(q * p),
    empty: !name && !q && !p && !unit && !date && !code
  };
}

function roundTax(x){
  var m = $('roundSel').value;
  if(m === 'ceil')  return Math.ceil(x);
  if(m === 'round') return Math.round(x);
  return Math.floor(x);
}
function yen(n){ return Number(n).toLocaleString('ja-JP'); }

/* ⭐住所は「/」で改行できる（2026-09-11 本人
   「自分の住所が変なところで改行されることがある」）。
   ⭐日本の住所に「/」は使わないので、区切りに使って安全。⭐全角の「／」も受ける */
function addrHtml(v){
  return esc(v).replace(/[\/／]\s*/g, '<br>');
}

/* ⭐郵便番号は7桁固定。⭐数字だけで打っても 100-0005 にできる */
function fmtZip(v){
  var d = v.replace(/[^0-9]/g, '');
  return (d.length === 7) ? (d.slice(0,3) + '-' + d.slice(3)) : v;
}
/* ⭐電話番号に「－」を入れる（2026-09-11 本人「-なしで入力した人には-を付けて保存して」）。
   🔴⚠市外局番の桁数は番号だけでは決められない（03＝2桁、045＝3桁、0166＝4桁）。
   ⭐だから**確実に分かるものだけ**付ける。⚠分からないものは触らない＝壊さない */
function fmtTel(v){
  var d = v.replace(/[^0-9]/g, '');
  if(d.length === 11 && /^(070|080|090|050)/.test(d)) return d.slice(0,3) + '-' + d.slice(3,7) + '-' + d.slice(7);
  if(d.length === 10 && /^0120/.test(d))              return '0120-' + d.slice(4,7) + '-' + d.slice(7);
  if(d.length === 10 && /^(03|06)/.test(d))           return d.slice(0,2) + '-' + d.slice(2,6) + '-' + d.slice(6);
  return v;
}

/* ⭐源泉徴収税額（2026-09-11）
   出典＝国税庁 No.2795「原稿料や講演料等を支払ったとき」
     ⭐100万円以下 … A × 10.21%
     ⭐100万円超　 … (A - 100万円) × 20.42% ＋ 102,100円
   ⚠1円未満は切り捨て（決まっている）。⭐消費税の端数の設定（roundSel）は流用しない */
function withholdTax(a){
  if(!(a > 0)) return 0;
  var t = (a <= 1000000) ? a * 0.1021 : (a - 1000000) * 0.2042 + 102100;
  return Math.floor(t);
}

/* ========== 計算と見本 ========== */
var TOTAL = 0;
/* ⭐単価を税込で入れているか（2026-09-11 本人「税込も欲しいって言われた」） */
var INC = false;
/* ⭐税率ごとの打ったままの合計（税込モードのときは税込額） */
var GROSS = {10:0, 8:0, 0:0};
/* ⭐源泉徴収の状態 */
var WH = { on:false, gross:false, base:0, tax:0 };
/* ⭐サンプルのまま刷ってしまう事故を防ぐ透かし。手を入れたら消える */
var SAMPLE_ON = false;

function calc(){
  /* ⭐単価を税込で入れているか（2026-09-11） */
  INC = !!($('priceMode') && $('priceMode').value === 'in');

  var list = [], sum = 0, gross = {10:0, 8:0, 0:0};

  var no = 0;
  rows().forEach(function(tr){
    var r = readRow(tr);
    tr.querySelector('.c-amt').textContent = r.amt ? yen(r.amt) : '0';
    if(!r.empty) no++;
    tr.querySelector('.c-no').textContent = r.empty ? '' : no;
    list.push(r);
    sum += r.amt;
    gross[r.rate] = (gross[r.rate] || 0) + r.amt;
  });

  /* ⭐途中の空の行はそのまま紙に出す。いちばん下に続く空の行だけ落とす（2026-09-09 本人） */
  while(list.length && list[list.length-1].empty) list.pop();

  var base = {10:0, 8:0, 0:0}, tax10, tax8, sub, total;
  if(INC){
    /* ⭐税込で入れたときは割り戻す。
       ⚠1行ずつ割り戻すと1円ずつずれて合計が合わなくなる。
       ⭐割り戻しは税率ごとに「合計で1回だけ」 */
    tax10 = roundTax(gross[10] * 10 / 110);
    tax8  = roundTax(gross[8]  *  8 / 108);
    base[10] = gross[10] - tax10;
    base[8]  = gross[8]  - tax8;
    base[0]  = gross[0];
    sub = total = sum;              /* ⭐打った金額がそのまま合計（税込） */
  } else {
    base  = gross;
    tax10 = roundTax(base[10] * 0.10);
    tax8  = roundTax(base[8]  * 0.08);
    sub   = sum;
    total = sum + tax10 + tax8;
  }
  GROSS = gross;
  TOTAL = total;

  /* ⭐源泉徴収。⭐もとにする額は原則税込だが、
     ⭐請求書に消費税額が分けて書いてあれば税抜でよい（国税庁 No.6929）。
     ⭐この道具は消費税額を必ず出すので、既定は税抜 */
  var whOn    = !!($('useWithhold') && $('useWithhold').checked);
  var whGross = !!(whOn && $('whTarget') && $('whTarget').value === 'gross');
  var whBase  = whOn ? (whGross ? total : (base[10] + base[8] + base[0])) : 0;
  WH = { on:whOn, gross:whGross, base:whBase, tax: whOn ? withholdTax(whBase) : 0 };
  var payAmt = total - WH.tax;

  /* --- 画面の合計欄 --- */
  var set = function(id, txt){ var e = $(id); if(e) e.textContent = txt; };
  var show = function(id, on){ var e = $(id); if(e) e.style.display = on ? '' : 'none'; };
  set('sumSubTh',   INC ? '合計（税込）' : '小計');
  set('sumSub',     yen(sub) + ' 円');   /* ⭐税込のときは sub がそのまま合計 */
  set('sumTax10Th', INC ? '（うち消費税 10%）' : '消費税（10%）');
  set('sumTax8Th',  INC ? '（うち消費税 8%）'  : '消費税（8%）');
  set('sumTax10',   yen(tax10) + ' 円');
  set('sumTax8',    yen(tax8) + ' 円');
  set('sumTotal',   yen(total) + ' 円');
  set('sumWh',      '-' + yen(WH.tax) + ' 円');
  set('sumPayTh',   D.payLabel);
  set('sumPay',     yen(payAmt) + ' 円');
  show('rowTax8',  gross[8] > 0);
  show('rowTotal', !INC);            /* 税込のときは一番上がもう合計 */
  show('rowWh',    whOn);
  show('rowPay',   whOn);
  if($('whTargetWrap')) $('whTargetWrap').hidden = !whOn;

  renderPages(list, sub, base, tax10, tax8, total);
  fitSheet();
  drawFname();
}

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function headHtml(total){
  var useInv = $('useInvoice').checked;

  var toName = $('toName').value.trim() || '　';
  var honor  = $('toHonor').value;
  var fromLines = [];
  /* ⭐屋号を書いていない人は、氏名を目立たせない（2026-09-09 本人「名前が一番上に来るの、なんか気恥ずかしい」）
     ⚠見分け方＝空白より前に「屋号らしい語」が無ければ、個人名だけとみなす */
  var meName = $('meName').value.trim();
  var solo = meName && !/(事務所|工房|デザイン|オフィス|スタジオ|商店|工務店|企画|製作所|舎|堂|屋|Studio|Office|Design|Works|Lab)/i.test(meName);
  var nameLine = meName ? ('<span class="from-name' + (solo ? ' solo' : '') + '">' + esc(meName) + '</span>') : '';
  var zip  = $('meZip').value.trim()  ? ('〒' + esc($('meZip').value.trim())) : '';
  var addr = $('meAddr').value.trim() ? addrHtml($('meAddr').value.trim()) : '';
  var tel  = $('meTel').value.trim()  ? ('TEL ' + esc($('meTel').value.trim())) : '';
  var mail = $('meMail').value.trim() ? esc($('meMail').value.trim()) : '';

  /* ⭐屋号がある人＝名前が先。⭐屋号がない人＝〒・住所のあとに名前（2026-09-09 本人）
     ⚠個人名がいちばん上に来ると気恥ずかしい、という本人の感覚から */
  if(solo){
    [zip, addr, nameLine, tel, mail].forEach(function(x){ if(x) fromLines.push(x); });
  }else{
    [nameLine, zip, addr, tel, mail].forEach(function(x){ if(x) fromLines.push(x); });
  }
  if(useInv && $('meTno').value.trim()) fromLines.push('登録番号 ' + esc($('meTno').value.trim()));

  var h = '';
  h += '<h3>' + D.title + '</h3>';

  h += '<div class="inv-meta">';
  if($('invNo').value.trim()) h += 'No. ' + esc($('invNo').value.trim()) + '<br>';
  h += esc(jpDate($('invDate').value));
  h += '</div>';

  h += '<div class="inv-head">';
  h += '<div class="inv-to"><div class="to-name">' + esc(toName) + (honor ? '　' + esc(honor) : '') + '</div>';
  if($('toAddr').value.trim())   h += '<div class="to-addr">' + addrHtml($('toAddr').value.trim()) + '</div>';
  if($('toPerson').value.trim()) h += '<div class="to-addr">' + esc($('toPerson').value.trim()) + '</div>';
  h += '</div>';
  h += '<div class="inv-from">' +
       (db.logo ? '<img class="inv-logo" src="' + esc(db.logo).replace(/"/g,'&quot;') + '" alt="">' : '') +
       fromLines.join('<br>') + '</div>';
  h += '</div>';

  if($('subject').value.trim()){
    h += '<p style="margin:14px 0 0">件名：' + esc($('subject').value.trim()) + '</p>';
  }
  h += '<p style="margin:10px 0 0">' + D.lead + '</p>';

  h += '<div class="inv-total-box"><span class="lbl">' + D.amount + '</span>' +
       '<span class="val">' + yen(total) + ' 円</span></div>';

  return h;
}

/* 明細の1行（ページに分けて流し込むので、行だけを作る）
   ⭐No.は空の行を飛ばして数える（2026-09-09 本人「行番号も必要」） */
function rowHtml(r, no){
  var useInv = $('useInvoice').checked;
  var d = $('colDate').checked, c = $('colCode').checked;
  if(r.empty){
    return '<tr><td class="c"></td>' + (d ? '<td></td>' : '') +
           '<td>' + (r.mark ? '<span class="inv-endmark">' + esc(r.mark) + '</span>' : '&nbsp;') + '</td>' +
           (c ? '<td></td>' : '') + '<td></td><td></td><td></td></tr>';
  }
  var q = r.qty ? (yen(r.qty) + (r.unit ? ' ' + esc(r.unit) : '')) : '';
  return '<tr><td class="c">' + no + '</td>' +
         (d ? '<td class="c">' + esc(r.date) + '</td>' : '') +
         '<td>' + esc(r.name) + (useInv && r.rate === 8 ? ' ※' : '') + '</td>' +
         (c ? '<td class="c">' + esc(r.code) + '</td>' : '') +
         '<td class="c">' + q + '</td>' +
         '<td class="n">' + (r.price ? yen(r.price) : '') + '</td>' +
         '<td class="n">' + (r.amt ? yen(r.amt) : '') + '</td></tr>';
}
function tableOpen(){
  var d = $('colDate').checked, c = $('colCode').checked;
  /* ⭐幅は中身に合わせて決める（2026-09-09 本人「データのサイズによって動くの？」→ 動くようにした）。
     ⚠数字や日付の列は中身のぶんだけ取り、⭐余った幅は全部「品目」が受ける（width:99%）。
       列を増やしても、ほかの列が縮んで収まる */
  return '<table class="det"><thead><tr>' +
    '<th class="w-min">No.</th>' +
    (d ? '<th class="w-date2">日付</th>' : '') +
    '<th>品目</th>' +                       /* 幅を書かない＝残りをここが受ける */
    (c ? '<th class="w-code">品番</th>' : '') +
    '<th class="w-qty">数量</th>' +
    '<th class="w-num">単価</th>' +
    '<th class="w-num">金額</th>' +
    '</tr></thead><tbody></tbody></table>';
}

/* 紙の下半分（合計・支払い・備考）＝いちばん最後のページに置く */
function footHtml(sub, base, tax10, tax8, total){
  var useInv = $('useInvoice').checked;
  var h = '';
  h += '<div class="det-sum"><table>';
  if(INC){
    /* ⭐税込で入れたとき＝内税の書き方。
       ⭐消費税額は必ず出す（※インボイスにも、源泉の「区分」にも要る） */
    h += '<tr class="t"><th>合計（税込）</th><td>' + yen(total) + '</td></tr>';
    if(useInv){
      if(GROSS[10]) h += '<tr><th>10%対象（税込）</th><td>' + yen(GROSS[10]) + '</td></tr>';
      if(GROSS[8])  h += '<tr><th>※8%対象（税込）</th><td>' + yen(GROSS[8]) + '</td></tr>';
    }
    if(tax10) h += '<tr><th>（うち消費税 10%）</th><td>' + yen(tax10) + '</td></tr>';
    if(tax8)  h += '<tr><th>（うち消費税 8%）</th><td>' + yen(tax8) + '</td></tr>';
  } else {
    h += '<tr><th>小計</th><td>' + yen(sub) + '</td></tr>';
    if(useInv){
      if(base[10]) h += '<tr><th>10%対象</th><td>' + yen(base[10]) + '</td></tr>';
      if(base[8])  h += '<tr><th>※8%対象</th><td>' + yen(base[8]) + '</td></tr>';
    }
    if(tax10) h += '<tr><th>消費税（10%）</th><td>' + yen(tax10) + '</td></tr>';
    if(tax8)  h += '<tr><th>消費税（8%）</th><td>' + yen(tax8) + '</td></tr>';
    h += '<tr class="t"><th>合計</th><td>' + yen(total) + '</td></tr>';
  }
  /* ⭐源泉徴収を引いて、実際に振り込まれる額を出す */
  if(WH.on){
    h += '<tr><th>源泉徴収税額</th><td>-' + yen(WH.tax) + '</td></tr>';
    h += '<tr class="t"><th>' + esc(D.payLabel) + '</th><td>' + yen(total - WH.tax) + '</td></tr>';
  }
  h += '</table></div>';

  var notes = [];
  if(INC) notes.push('※単価・金額は税込です。');
  if(useInv && (INC ? GROSS[8] : base[8])) notes.push('※は軽減税率（8%）の対象です。');
  if(WH.on){
    notes.push('源泉徴収税額は' +
      (WH.gross ? '合計（税込）' : '報酬額（税抜）') +
      ' ' + yen(WH.base) + '円 に対する額です。');
  }
  if(notes.length){
    h += '<p style="font-size:.85em;margin-top:8px">' + notes.map(esc).join('<br>') + '</p>';
  }

  var pay = [];
  if($('dueDate').value) pay.push(D.dueLabel + '　' + jpDate($('dueDate').value));
  if(D.showBank && $('bank') && $('bank').value.trim()) pay.push($('bank').value.trim());
  if(pay.length){
    h += '<div class="inv-pay"><span class="ttl">' + (D.showBank ? 'お支払いについて' : D.dueLabel) + '</span>' +
         '<div class="body">' + esc(pay.join('\n')) + '</div></div>';
  }
  if($('note') && $('note').value.trim()){
    h += '<div class="inv-note">' + esc($('note').value.trim()) + '</div>';
  }
  return h;
}

/* ========== 紙を1枚ずつ組み立てる ==========
   ⭐画面の見本を「長い1枚」にしない。⭐A4に入らなくなったら次の紙へ送る（2026-09-09 本人）
   ⚠1mm = 3.7795px（ブラウザは96dpiで数える）。A4のたては 297mm */
var MM = 3.779527559;
/* 🔴⭐紙は297mmだが、分割は⭐291mmで打ち切る（2026-09-10）。
   ⚠画面では入っていた最後の1行が、印刷だと次の紙に落ちていた
     （本人のPDFで確認。画面は18行、紙は17行）。
   ⭐印刷は文字の丸め方が少し違うので、6mm の逃げを作る。
   ⚠こうすれば⑥確認と紙が同じ行数になる */
/* ⭐紙は297mm。⚠1mm だけ逃げる（丸めで割れないように）。
   ⚠以前は6mm逃げていたが、それは印刷が縮んでいたための応急処置だった。
   ⭐余白を20mmにして縮まなくなったので、逃げを戻す（2026-09-10） */
var PAGE_H = 296 * MM;
/* ⭐紙そのものの高さ（印刷の .inv-sheet と同じ）。⚠分割は291mmで安全に切るので、
   ⭐そのままだと紙との差（5mm）が下に残る。→ fillToBottom で最後の行を伸ばして埋める */
var SHEET_H = 296 * MM;

/* 🔴⭐表を紙の底まで伸ばす（2026-09-10 本人「見本は用紙いっぱいにデザインされているのに、
   PDFにすると下がすごく開く」）。
   ⚠空の行を足す方法だと、1行（約7.8mm）ずつしか埋まらず、端数が必ず残る。
   ⭐最後の1行の高さを、余ったぶんだけ mm で足す＝印刷でも同じ高さになる */
function fillToBottom(page){
  var t = page.querySelector('table.det');
  if(!t || !t.tBodies[0]) return;
  var rows = t.tBodies[0].rows;
  if(!rows.length) return;
  var last = rows[rows.length - 1];
  last.style.height = '';
  /* ⚠ページ番号は浮かせてあるので、高さの計算から外す */
  var lastEl = null;
  for(var i=0;i<page.children.length;i++){
    if(getComputedStyle(page.children[i]).position !== 'absolute') lastEl = page.children[i];
  }
  if(!lastEl) return;
  var pb = parseFloat(getComputedStyle(page).paddingBottom) || 0;
  var used = lastEl.getBoundingClientRect().bottom - page.getBoundingClientRect().top + pb;
  var rest = SHEET_H - used;
  if(rest > 2){
    /* ⚠最後の1行だけを伸ばすと、その行だけ太くなって目立つ
       （2026-09-10 本人「今回は十八行目が太くなってる」）。
       ⭐余った分を全部の行に均等に分ける＝1行あたりはわずか */
    var add = rest / rows.length;
    for(var i=0;i<rows.length;i++){
      var rh = rows[i].getBoundingClientRect().height + add;
      rows[i].style.height = (Math.round(rh / MM * 100) / 100) + 'mm';
    }
  }
}

/* 2枚目からの見出し。⭐請求書番号と宛先だけを小さく出す */
function contHtml(){
  var no = $('invNo').value.trim();
  var to = $('toName').value.trim();
  var h = '<div class="inv-cont">';
  h += '<span>' + D.title + (no ? '　No. ' + esc(no) : '') + '（続き）</span>';
  if(to) h += '<span>' + esc(to) + (($('toHonor').value) ? '　' + esc($('toHonor').value) : '') + '</span>';
  h += '</div>';
  return h;
}

/* ⭐1枚に入りきらないときは、字を少しずつ小さくして1枚に収める（2026-09-09 本人）
   ⚠それでも入らない量なら、字は元に戻して素直に2枚にする（小さいうえに2枚は最悪） */
var FONTS = [10.5, 10, 9.5, 9, 8.5, 8];

function renderPages(list, sub, base, tax10, tax8, total){
  var wrap = $('pages');
  for(var i=0;i<FONTS.length;i++){
    wrap.style.fontSize = FONTS[i] + 'pt';
    buildPages(list, sub, base, tax10, tax8, total);
    if(wrap.children.length <= 1) return;
  }
  wrap.style.fontSize = FONTS[0] + 'pt';
  buildPages(list, sub, base, tax10, tax8, total);
}

function buildPages(list, sub, base, tax10, tax8, total){
  var wrap = $('pages');
  wrap.innerHTML = '';
  wrap.style.transform = 'none';

  function newPage(){
    var d = document.createElement('div');
    d.className = 'inv-sheet' + (SAMPLE_ON ? ' sample' : '');
    d.style.minHeight = '0';        /* 測るあいだは下限を外す */
    wrap.appendChild(d);
    return d;
  }
  function newTable(page){
    var box = document.createElement('div');
    box.innerHTML = tableOpen();
    var tbl = box.firstChild;
    page.appendChild(tbl);
    return tbl.querySelector('tbody');
  }
  /* ⚠scrollHeight は使えない。⭐SAMPLEの透かし（斜めに回した文字）が紙の外へ出て、
       高さを押し広げてしまう＝まだ入るのに「はみ出した」と誤判定していた（2026-09-09）。
     ⭐中身のいちばん下＋下の余白で測る */
  function over(page){
    var last = page.lastElementChild;
    if(!last) return false;
    var pb = parseFloat(getComputedStyle(page).paddingBottom) || 0;
    return (last.getBoundingClientRect().bottom - page.getBoundingClientRect().top + pb) > PAGE_H;
  }

  var page = newPage();
  page.innerHTML = headHtml(total);
  var tbody = newTable(page);

  var items = list.length ? list : [{empty:true}];
  var no = 0;
  items.forEach(function(r){
    if(!r.empty) no++;
    var tmp = document.createElement('tbody');
    tmp.innerHTML = rowHtml(r, no);
    var tr = tmp.firstChild;
    tbody.appendChild(tr);
    if(over(page)){
      tbody.removeChild(tr);
      page = newPage();
      /* ⭐2枚目からは「どの請求書の続きか」を出す（2026-09-09 調べ）。
         ⚠法律の決まりはないが、紙が分かれて届くことがあるため実務ではこうする */
      page.innerHTML = contHtml();
      tbody = newTable(page);
      tbody.appendChild(tr);
    }
  });

  var foot = document.createElement('div');
  foot.innerHTML = footHtml(sub, base, tax10, tax8, total);
  page.appendChild(foot);
  var lastBody = tbody;
  if(over(page)){
    page.removeChild(foot);
    page = newPage();
    page.innerHTML = contHtml();
    page.appendChild(foot);
    /* ⚠合計だけが次の紙に行ったときは、ひとつ前の紙はもう満杯 */
    lastBody = null;
  }

  /* ⭐下の余白を、空の枠で締める（2026-09-09 本人「下が空かないほうがきれい」）
     ⚠決まりではないが、⭐空いたところに書き足されるのを防ぐ慣習（「以下余白」） */
  if($('fillRest').checked && lastBody){
    var first = true;
    for(var k=0;k<80;k++){
      var tmp2 = document.createElement('tbody');
      tmp2.innerHTML = rowHtml({empty:true, mark: first ? '以下余白' : ''}, '');
      var frow = tmp2.firstChild;
      lastBody.appendChild(frow);
      if(over(page)){ lastBody.removeChild(frow); break; }
      first = false;
    }
  }

  /* 2枚以上のときだけページ番号を出す */
  var pages = wrap.children;
  if(pages.length > 1){
    for(var i=0;i<pages.length;i++){
      var no = document.createElement('div');
      no.className = 'inv-pageno';
      no.textContent = (i+1) + ' / ' + pages.length;
      pages[i].appendChild(no);
    }
  }
  /* 下限を戻す＝どの紙もA4の高さになる */
  for(var j=0;j<pages.length;j++) pages[j].style.minHeight = '';
  /* ⭐そのうえで、表を紙の底まで伸ばす（下が中途半端に空かないように） */
  for(var m=0;m<pages.length;m++) fillToBottom(pages[m]);
}

/* ========== 見本の大きさ ==========
   ⭐A4の形のまま、画面の幅に収まるところまで縮めて見せる */
var SCALE = 1;
/* ⭐ふだんは小さく出して全体の雰囲気を見せる。押すと画面の幅いっぱいまで大きくなる
   （2026-09-09 本人「実物大である必要はない。拡大したい人はクリックで」）*/
/* ⭐小さいときは、画面の幅にかかわらず「一番小さいサイズ」で出す（2026-09-09 本人
     「幅を一番狭くした状態の一番小さいサイズでいいよ。全体の雰囲気をまず見て、押して確認」）
   ＝スマホ（375px）で見たときと同じ大きさ。パソコンでも同じ */
var SMALL = 0.272;
var BIG = false;
function fitSheet(){
  var stage = $('stage'), sheet = $('pages');
  if(!stage || !sheet) return;
  sheet.style.transform = 'none';
  stage.style.height = 'auto';
  var w = sheet.offsetWidth, h = sheet.offsetHeight;
  var avail = stage.clientWidth;
  /* ⚠画面の幅がまだ決まっていないことがある（開いた直後・隠れているとき）。
     ⭐そのときは次の描き直しでもう一度測る */
  if(!w || !avail){
    if(fitSheet.retry === undefined) fitSheet.retry = 0;
    if(fitSheet.retry < 20){ fitSheet.retry++; requestAnimationFrame(fitSheet); }
    return;
  }
  fitSheet.retry = 0;
  var fit = Math.min(1, avail / w);
  /* 🔴⭐押したときは実物大（倍率1）にする（2026-09-10 本人「同じ位置に置いてるのに
     倍率が違う」）。⚠以前は「画面の幅に収まるまで」だったので、紙と大きさが違っていた。
     ⭐実物大なら、PDFと並べて同じ大きさになる。⚠横にはみ出す分は横スクロール */
  SCALE = BIG ? 1 : Math.min(fit, SMALL);
  sheet.style.transform = 'scale(' + SCALE + ')';
  stage.style.height = Math.ceil(h * SCALE) + 'px';
  /* ⚠縮めても紙は左に寄ったまま（transform は場所を取らない）。⭐左の余白で中央に寄せる */
  sheet.style.marginLeft = Math.max(0, Math.round((avail - w * SCALE) / 2)) + 'px';
}

/* 🔴⭐印刷の一瞬だけ、紙を body の直下に出す（2026-09-10）。
   ⚠画面用の指定（章の枠・幅・余白・min-width）が紙にかかっていると、
     ⭐ブラウザは「その幅が必要」と見て、紙に収まるまで全体を縮める。
   ⭐body 直下に出せば、どの指定もかからない＝帳票CSSの定石（paper-css）と同じ条件になる。
   ⚠印刷が終わったら必ず元の場所へ戻す */
function liftPages(){
  var pages = $('pages');
  if(!pages) return function(){};
  var home = pages.parentNode, next = pages.nextSibling;
  document.body.appendChild(pages);
  document.body.classList.add('printing');
  return function(){
    document.body.classList.remove('printing');
    if(next) home.insertBefore(pages, next); else home.appendChild(pages);
    fitSheet();
  };
}

/* ========== ファイル名 ========== */
/* ⚠ファイル名に使えない文字を外す。全角の空白と半角の空白も詰める */
function safe(s){
  return String(s || '').replace(/[\\\/:\*\?"<>\|]/g, '').replace(/[\s　]+/g, '');
}
function fileName(){
  var p = [D.file];
  if($('fnDate').checked   && $('invDate').value) p.push(ymd($('invDate').value));
  if($('fnClient').checked && $('toName').value.trim()) p.push(safe($('toName').value.trim()));
  if($('fnAmount').checked && TOTAL) p.push(String(TOTAL));
  return p.join('_');
}
function drawFname(){ $('fnameOut').textContent = fileName() + '.pdf'; }

/* ========== ロゴ ==========
   ⭐紙の右上に出す。⚠画像は使っている端末の中だけ（localStorage）。
     大きいままだと入りきらないので、横240pxに縮めてから覚える */
function drawLogo(){
  if(db.logo){
    $('logoImg').src = db.logo;
    $('logoPrev').hidden = false;
  }else{
    $('logoImg').removeAttribute('src');
    $('logoPrev').hidden = true;
  }
}
function readLogo(file){
  var fr = new FileReader();
  fr.onload = function(){
    var img = new Image();
    img.onload = function(){
      var w = img.width, h = img.height, max = 240;
      if(w > max){ h = Math.round(h * max / w); w = max; }
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      var png = cv.toDataURL('image/png');
      /* ⚠あまりに大きいときはJPEGにして軽くする */
      if(png.length > 400000) png = cv.toDataURL('image/jpeg', 0.85);
      db.logo = png;
      save();
      drawLogo();
      calc();
    };
    img.onerror = function(){ alert('この画像は読めませんでした。別のファイルでお試しください。'); };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* ========== 取引の内容（③の件名＋④の明細）==========
   ⭐見積の中身をそのまま請求書にできるようにするための保存（2026-09-10 本人）
   ⚠出した書類の控えは保存しない。⭐ここは「次も使う内容」を残す場所。
   🔴⭐取引先とは別の箱にする（2026-09-10 本人「取引先データっていうのは、あくまでもその情報。
     明細は別だわ」）。⭐同じ相手に2つの案を出すことがあるので、相手にぶら下げない。
   ⚠ここに相手の情報を持たせない。⭐持たせると、取引先の住所を直しても古い住所が残る */
function nowForm(){
  var items = [];
  rows().forEach(function(tr){
    var r = readRow(tr);
    if(r.empty) return;
    items.push({name:r.name, qty:r.qty, unit:r.unit, price:r.price, rate:r.rate, code:r.code, date:r.date});
  });
  /* ⭐名前は自分で付けられる（「株式会社もみじ　案1」）。⚠空なら会社名と件名から作る */
  var lab = ($('formName') && $('formName').value.trim()) || '';
  if(!lab){
    var who = $('toName').value.trim();
    var sub = $('subject').value.trim();
    lab = who ? (sub ? who + '／' + sub : who) : (sub || '名前なし');
  }
  return {
    label  : lab,
    subject: $('subject').value.trim(),
    items  : items,
    round  : $('roundSel').value,
    price  : $('priceMode') ? $('priceMode').value : 'ex',
    wh     : { on: !!($('useWithhold') && $('useWithhold').checked),
               target: $('whTarget') ? $('whTarget').value : 'net' },
    cols   : { code:$('colCode').checked, date:$('colDate').checked },
    note   : $('note') ? $('note').value : ''
  };
}

/* ⚠相手は入れない（②は②で選ぶ）。⭐入れるのは件名と④の中身だけ */
function useForm(f){
  if(!f) return;
  if(f.subject) $('subject').value = f.subject;
  if(f.round) $('roundSel').value = f.round;
  if(f.price && $('priceMode')) $('priceMode').value = f.price;
  if(f.wh && $('useWithhold')){
    $('useWithhold').checked = !!f.wh.on;
    if(f.wh.target && $('whTarget')) $('whTarget').value = f.wh.target;
  }
  if(f.cols){ $('colCode').checked = !!f.cols.code; $('colDate').checked = !!f.cols.date; }
  $('itemBody').innerHTML = '';
  (f.items || []).forEach(function(r){ addRow(r); });
  addRow();
  drawCols();
  SAMPLE_ON = false;
  calc();
}

/* ========== エクセルからの貼り付け ==========
   ⭐手で打ち直させない（2026-09-09 本人「PCで作ったものが先にあると思うんだよね」）。
     見積書やエクセルの表をそのまま受ける。タブ・カンマ・全角の空白のどれでも切る。 */
/* ⭐1行目に見出しがあれば、並び順が違っても振り分ける（2026-09-09 本人
     「エクセルだと自動で配置できるよね？項目名を自分でそろえたほうがいい？」→ そろえなくてよい） */
var HEADS = [
  ['code',  /品番|型番|品目コード|商品コード|コード|品目番号/],
  ['date',  /日付|年月日|納品日|作業日|実施日|購入日|発生日/],
  ['name',  /品目|品名|項目|内容|商品名|商品|摘要|作業内容|名称/],
  ['qty',   /数量|個数|員数|数$/],
  ['unit',  /単位/],
  ['price', /単価|価格|税抜単価/],
  ['skip',  /金額|小計|合計|税|備考/]
];

function splitLine(line){
  var c = line.indexOf('\t') >= 0 ? line.split('\t')
        : (line.indexOf(',') >= 0 ? line.split(',') : line.split(/[\s　]{2,}/));
  return c.map(function(x){ return String(x).replace(/^["']|["']$/g,'').trim(); });
}

/* 見出しの行なら {列の位置} を返す。違えば null */
function readHead(cells){
  var map = {}, hit = 0;
  cells.forEach(function(t, i){
    if(!t) return;
    for(var k=0;k<HEADS.length;k++){
      if(HEADS[k][1].test(t)){
        if(HEADS[k][0] !== 'skip' && map[HEADS[k][0]] === undefined){
          map[HEADS[k][0]] = i;
        }
        hit++;
        return;
      }
    }
  });
  /* ⚠2つ以上あたって、品目か単価がある行だけを見出しとみなす */
  if(hit >= 2 && (map.name !== undefined || map.price !== undefined)) return map;
  return null;
}

function num(v){
  var t = String(v || '').replace(/[,¥￥円\s　]/g,'');
  if(t === '' || isNaN(Number(t))) return '';
  return Number(t);
}

function parseTable(text){
  var lines = String(text || '').replace(/\r/g,'').split('\n').filter(function(l){ return l.trim(); });
  if(!lines.length) return [];

  var map = readHead(splitLine(lines[0]));
  var out = [], start = 0;
  if(map){ start = 1; }

  for(var i=start;i<lines.length;i++){
    var c = splitLine(lines[i]);
    var r = { rate:10 };

    if(map){
      r.name  = (map.name  !== undefined) ? (c[map.name]  || '') : '';
      r.code  = (map.code  !== undefined) ? (c[map.code]  || '') : '';
      r.date  = (map.date  !== undefined) ? (c[map.date]  || '') : '';
      r.unit  = (map.unit  !== undefined) ? (c[map.unit]  || '') : '';
      r.qty   = (map.qty   !== undefined) ? num(c[map.qty])   : '';
      r.price = (map.price !== undefined) ? num(c[map.price]) : '';
    }else{
      /* 見出しがないときは 品目・数量・単位・単価 の順に読む */
      r.name = c[0] || '';
      var nums = [], units = [];
      for(var j=1;j<c.length;j++){
        var v = num(c[j]);
        if(v !== '') nums.push(v);
        else if(c[j]) units.push(c[j]);
      }
      r.qty = nums.length ? nums[0] : '';
      r.price = (nums.length >= 2) ? nums[1] : '';
      /* 「品目・単価」の2列だけのときは、数量ではなく単価として読む */
      if(nums.length === 1 && Math.abs(nums[0]) >= 1000){ r.qty = 1; r.price = nums[0]; }
      r.unit = units[0] || '';
      r.code = ''; r.date = '';
    }
    if(!r.name && r.qty === '' && r.price === '' && !r.code && !r.date) continue;
    out.push(r);
  }
  return out;
}

/* ⭐入ったら true、読めなかったら false を返す（2026-09-11）。
   ⭐呼んだ側が「入ったときだけ④を開く」をできるように */
function putRows(list, msgEl){
  if(!list.length){
    alert('読み取れる行がありませんでした。品目・数量・単位・単価の順に並んでいるか見てください。');
    return false;
  }
  /* ⭐品番や日付が入っていたら、その列を自動で出す */
  if(list.some(function(r){ return r.code; })) $('colCode').checked = true;
  if(list.some(function(r){ return r.date; })) $('colDate').checked = true;
  $('itemBody').innerHTML = '';
  list.forEach(function(r){ addRow(r); });
  addRow();
  drawCols();
  calc();
  if(msgEl){
    /* ⭐どこに入ったかまで書く（2026-09-11 本人）。
       ⚠請求書は「④請求の内容」、見積書は「④見積の内容」。
       ⭐文字を手で持たず、見出し（summary）から取る＝必ず一致する */
    var s4 = $('s4Box') && $('s4Box').querySelector('summary');
    var where = s4 ? s4.textContent.replace(/\s+/g, '') : '④';
    msgEl.textContent = list.length + '行を' + where + 'に入れました';
    flash(msgEl);
  }
  return true;
}

/* ========== 取引先 ========== */
function drawClients(){
  /* ⭐②は呼び出しだけ、⑦は保存・上書き・削除。一覧は両方に出す（座席表と同じ形） */
  [$('clientSel'), $('clientSel2')].forEach(function(sel){
    if(!sel) return;
    var keep = sel.value;
    sel.innerHTML = '';
    var head = document.createElement('option');
    head.value = ''; head.textContent = db.clients.length ? '－' : '（まだありません）';
    sel.appendChild(head);
    db.clients.forEach(function(c, i){
      var op = document.createElement('option');
      op.value = String(i); op.textContent = c.name;
      sel.appendChild(op);
    });
    if(keep) sel.value = keep;
  });
  $('clientCount').textContent = db.clients.length + '／20件';
  /* ⚠1件も無いときは、②の呼び出しを出さない（はじめての人には邪魔なだけ） */
  $('quickLoad').hidden = !db.clients.length;
  /* ⭐0件のときは⑧の「えらぶ」「上書き」「削除」も出さない（2026-09-11 本人）。
     ⚠何も無いのに消せるように見えていた。⭐残るのは「新しい名前で保存」だけ */
  showWhenHas(db.clients.length, 'clientHave', ['clientSave', 'clientDel']);
}

/* ⭐件数が0なら隠す、あれば出す（一覧の行と、それを使うボタン） */
function showWhenHas(n, rowId, btnIds){
  var on = n > 0;
  if($(rowId)) $(rowId).hidden = !on;
  btnIds.forEach(function(id){ if($(id)) $(id).hidden = !on; });
}

/* ========== 取引の内容の一覧 ========== */
function drawForms(){
  [$('formSel'), $('formSel2')].forEach(function(sel){
    if(!sel) return;
    var keep = sel.value;
    sel.innerHTML = '';
    var head = document.createElement('option');
    head.value = ''; head.textContent = db.forms.length ? '－' : '（まだありません）';
    sel.appendChild(head);
    db.forms.forEach(function(f, i){
      var op = document.createElement('option');
      op.value = String(i); op.textContent = f.label || '名前なし';
      sel.appendChild(op);
    });
    if(keep) sel.value = keep;
  });
  if($('formCount')) $('formCount').textContent = db.forms.length + '／' + MAX_FORMS + '件';
  if($('formLoad')) $('formLoad').hidden = !db.forms.length;
  /* ⭐0件のときは⑧の「えらぶ」「上書き」「削除」も出さない（2026-09-11 本人） */
  showWhenHas(db.forms.length, 'formHave', ['formSave', 'formDel']);
}

/* ⭐④をまとめて消す（2026-09-10 本人「内容を消すっていうことも必要だよね」） */
function clearItems(){
  $('itemBody').innerHTML = '';
  for(var i=0;i<4;i++) addRow();
  drawCols();
  SAMPLE_ON = false;
  calc();
}

/* ========== サンプル ========== */
var SAMPLE_ME = {
  meName:'さくら事務所　山田花子', meZip:'100-0005',
  meAddr:'東京都千代田区丸の内1-2-3', meTel:'03-0000-0000', meMail:'info@example.com'
};
function hasSavedMe(){
  return !!(db.me && (db.me.meName || db.me.meAddr));
}

/* ⭐サンプルは2つ。①1ページに収まるもの ②2ページになるもの（2026-09-09 本人） */
var SAMPLE_1 = [
  {name:'ホームページ制作費', qty:1, unit:'式', price:120000, rate:10},
  {name:'写真の撮影',        qty:2, unit:'点', price:8000,   rate:10},
  {name:'交通費',            qty:1, unit:'式', price:3200,   rate:10}
];
var SAMPLE_3 = [
  {name:'焙煎コーヒー豆 200g',   qty:10, unit:'袋', price:1200, rate:8},
  {name:'ドリップバッグ',        qty:24, unit:'個', price:180,  rate:8},
  {name:'ギフト箱（包装資材）',  qty:10, unit:'枚', price:250,  rate:10},
  {name:'送料',                  qty:1,  unit:'式', price:800,  rate:10}
];
/* 🔴⭐日付は「発行日から何日前か」で持つ（2026-09-10 本人「サンプルの日付の整合性を全部確認して」）。
   ⚠固定の日付にしていたら、9/11 のように発行日より後の日が出ていた */
var SAMPLE_4 = [
  {code:'BP-1234', back:9, name:'油性ボールペン（黒）', qty:20, unit:'本', price:120, rate:10},
  {code:'NB-0087', back:9, name:'ノート A5 5冊組',      qty:15, unit:'組', price:180, rate:10},
  {code:'FL-2201', back:6, name:'クリアファイル A4',     qty:50, unit:'枚', price:45,  rate:10},
  {code:'ST-0310', back:2, name:'ふせん 75×25mm',        qty:30, unit:'個', price:160, rate:10}
];
/* ⭐発行日から back 日前を「9/2」の形で返す */
function sampleDate(back){
  var v = $('invDate') && $('invDate').value;
  var d = v ? new Date(v) : new Date();
  d.setDate(d.getDate() - back);
  return (d.getMonth() + 1) + '/' + d.getDate();
}
var SAMPLE_2 = [
  {name:'サイト設計・打ち合わせ',        qty:3,  unit:'時間', price:8000,  rate:10},
  {name:'トップページ デザイン',          qty:1,  unit:'式',  price:80000, rate:10},
  {name:'下層ページ デザイン',            qty:6,  unit:'頁',  price:18000, rate:10},
  {name:'お問い合わせフォーム 設置',      qty:1,  unit:'式',  price:35000, rate:10},
  {name:'スマートフォン用の調整',          qty:1,  unit:'式',  price:42000, rate:10},
  {name:'写真の撮影（店舗）',              qty:12, unit:'点',  price:4000,  rate:10},
  {name:'写真の加工',                      qty:12, unit:'点',  price:1500,  rate:10},
  {name:'原稿の作成',                      qty:8,  unit:'頁',  price:6000,  rate:10},
  {name:'ロゴの調整',                      qty:1,  unit:'式',  price:25000, rate:10},
  {name:'', qty:0, unit:'', price:0, rate:10},
  {name:'サーバーの設定',                  qty:1,  unit:'式',  price:15000, rate:10},
  {name:'ドメインの取得代行',              qty:1,  unit:'件',  price:5000,  rate:10},
  {name:'常時SSLの設定',                   qty:1,  unit:'式',  price:12000, rate:10},
  {name:'アクセス解析の導入',              qty:1,  unit:'式',  price:18000, rate:10},
  {name:'操作説明会',                      qty:2,  unit:'時間', price:9000,  rate:10},
  {name:'マニュアルの作成',                qty:1,  unit:'式',  price:22000, rate:10},
  {name:'公開後の修正対応（3か月）',       qty:3,  unit:'か月', price:10000, rate:10},
  {name:'交通費・宿泊費',                  qty:1,  unit:'式',  price:38600, rate:10},
  /* ⚠2つ目の空行は取った（2026-09-10 本人「17の下を1行空けると不細工」）。
     ⭐空行が使えることは、上の1つで伝わる */
  {name:'名刺デザイン',                    qty:1,  unit:'式',  price:18000, rate:10},
  {name:'チラシデザイン（A4片面）',        qty:2,  unit:'点',  price:24000, rate:10},
  {name:'印刷立ち会い',                    qty:1,  unit:'式',  price:12000, rate:10},
  {name:'SNS用の画像作成',                 qty:10, unit:'点',  price:3000,  rate:10},
  {name:'原稿の校正',                      qty:1,  unit:'式',  price:14000, rate:10},
  {name:'差し替え対応（2回目以降）',        qty:4,  unit:'回',  price:5000,  rate:10},
  {name:'素材写真の購入代行',              qty:6,  unit:'点',  price:2200,  rate:10},
  {name:'打ち合わせ（追加分）',            qty:2,  unit:'時間', price:8000,  rate:10}
];

var SAMPLE_5 = [
  {name:'記事の執筆（3本）',  qty:3, unit:'本',   price:18000, rate:10},
  {name:'写真の選定と加工',   qty:1, unit:'式',   price:12000, rate:10},
  {name:'打ち合わせ',         qty:2, unit:'時間', price:6000,  rate:10}
];
/* ⭐税込で金額が決まっている仕事（2026-09-11 本人「税込も欲しいって言われた」）。
   ⚠単価はすべて税込。⭐合計 47,300円（うち消費税 4,300円）になる */
var SAMPLE_6 = [
  {name:'記事の執筆',        qty:3, unit:'本', price:11000, rate:10},
  {name:'バナー画像の作成', qty:2, unit:'点', price:5500,  rate:10},
  {name:'修正対応',            qty:1, unit:'式', price:3300,  rate:10}
];
/* ⭐源泉徴収がある仕事（原稿料）。
   ⭐小計 120,000 → 消費税 12,000 → 合計 132,000、
   ⭐源泉 12,252（120,000×10.21%）→ 差引 119,748 */
var SAMPLE_7 = [
  {name:'原稿執筆料（特集記事 4ページ）', qty:1, unit:'式', price:80000, rate:10},
  {name:'取材の同行',                    qty:1, unit:'回', price:20000, rate:10},
  {name:'写真の提供',                    qty:5, unit:'点', price:4000,  rate:10}
];
var SAMPLES = {1:SAMPLE_1, 2:SAMPLE_2, 3:SAMPLE_3, 4:SAMPLE_4, 5:SAMPLE_5, 6:SAMPLE_6, 7:SAMPLE_7};
var SUBJECTS = {
  1:'9月分　ホームページ制作',
  2:'9月分　ホームページ制作一式',
  3:'9月分　商品代',
  4:'9月分　事務用品',
  5:'9月分　記事執筆',
  6:'9月分　記事執筆・バナー制作',
  7:'9月分　原稿料'
};
/* ⭐屋号を付けていない個人事業主のサンプル（2026-09-09 本人） */
var SAMPLE_ME_5 = {
  meName:'山田　花子', meZip:'100-0005',
  meAddr:'東京都千代田区丸の内1-2-3', meTel:'090-0000-0000', meMail:'hanako@example.com'
};

function sampleAdd(kind){
  kind = Number(kind) || 1;
  var items = SAMPLES[kind] || SAMPLE_1;
  if(!hasSavedMe()){
    /* ⭐屋号なしの個人名で出す＝5（屋号なし）・6（税込）・7（源泉）。
       ⭐この3つは副業・フリーランスの場面（2026-09-11） */
    var me = (kind === 5 || kind === 6 || kind === 7) ? SAMPLE_ME_5 : SAMPLE_ME;
    ['meName','meZip','meAddr','meTel','meMail'].forEach(function(k){ $(k).value = me[k] || ''; });
  }
  /* ③はインボイス、④は品番と日付を出した形にする */
  $('useInvoice').checked = (kind === 3);
  $('invoiceWrap').hidden = !$('useInvoice').checked;
  if(kind === 3 && !$('meTno').value.trim()) $('meTno').value = 'T1234567890123';
  $('colCode').checked = (kind === 4);
  $('colDate').checked = (kind === 4);
  /* ⭐⑥は税込で入れた形、⑦は源泉徴収あり（2026-09-11） */
  if($('priceMode')) $('priceMode').value = (kind === 6) ? 'in' : 'ex';
  if($('useWithhold')){
    $('useWithhold').checked = (kind === 7);
    if($('whTarget')) $('whTarget').value = 'net';
    if($('whTargetWrap')) $('whTargetWrap').hidden = !$('useWithhold').checked;
  }

  $('toName').value   = '株式会社さくら商事';
  $('toHonor').value  = '御中';
  $('toPerson').value = '経理部　佐藤様';
  $('toAddr').value   = '東京都中央区銀座4-5-6';
  $('subject').value  = SUBJECTS[kind] || SUBJECTS[1];

  $('itemBody').innerHTML = '';
  /* ⚠日付を持つサンプルは、発行日から数えて入れる（未来の日付を出さない） */
  items.forEach(function(r){
    if(r.back !== undefined){
      var c = {}; for(var k in r) c[k] = r[k];
      c.date = sampleDate(r.back);
      addRow(c);
    }else{
      addRow(r);
    }
  });
  addRow();
  drawCols();

  /* ⭐サンプルの番号は必ず 1 から（2026-09-09 本人）。
     ⚠本来の「次の番号」を出すと、お試しで見ている人に 2026-007 のような数字が出てしまう */
  /* ⚠SAMPLE_ON を先に立てる═checkNo() の中で見ているため（2026-09-10） */
  SAMPLE_ON = true;
  $('invNo').value = (db.noPrefix || '') + zeroPad(1, db.noDigits);
  checkNo();

  /* 🔴⚠ここが書類の種類を見ていなかった（2026-09-10 本人「有効期限は発行日より1か月です、と
     書いてあるのに 10月31日 になってる」）。⭐見積書は1か月後、請求書は来月末 */
  if(!$('dueDate').value) $('dueDate').value = (D.dueMode === 'plus1m') ? plusOneMonth() : nextMonthEnd();
  if($('bank') && !$('bank').value.trim() && !db.bank){
    $('bank').value = 'さくら銀行　丸の内支店\n普通　1234567\nヤマダ ハナコ';
  }
  if($('note') && !$('note').value.trim() && !db.note){
    $('note').value = (D.showBank ? 'お振込手数料は貴社にてご負担くださいますようお願いいたします。' : 'このお見積の有効期限は発行日より1か月です。');
  }
  if(kind === 5 || kind === 7) $('toPerson').value = '編集部　鈴木様';
  calc();
}

function sampleDel(){
  /* ⚠消すのは画面のサンプルだけ。覚えている中身は消さない（消すのは⑥） */
  SAMPLE_ON = false;
  $('useInvoice').checked = false;
  $('invoiceWrap').hidden = true;
  $('colCode').checked = false;
  $('colDate').checked = false;
  if($('priceMode')) $('priceMode').value = 'ex';
  if($('useWithhold')){
    $('useWithhold').checked = false;
    if($('whTargetWrap')) $('whTargetWrap').hidden = true;
  }
  if(!hasSavedMe()){
    Object.keys(SAMPLE_ME).forEach(function(k){ $(k).value = ''; });
  }else{
    ['meName','meZip','meAddr','meTel','meMail','meTno'].forEach(function(k){
      $(k).value = db.me[k] || '';
    });
  }
  ['toName','toPerson','toAddr','subject','dueDate'].forEach(function(k){ $(k).value = ''; });
  $('toHonor').value = '御中';
  if($('bank')) $('bank').value = db.bank || '';
  if($('note')) $('note').value = db.note || '';
  $('itemBody').innerHTML = '';
  for(var i=0;i<4;i++) addRow();
  drawCols();
  /* サンプルを消したら、本来の次の番号に戻す */
  $('invNo').value = makeNo();
  checkNo();
  calc();
}

/* ========== 起動 ========== */
function boot(){
  var had = load();
  fixPrefixForYear();
  if(!db.noPrefix) db.noPrefix = defaultPrefix();

  /* 自分の情報 */
  ['meName','meZip','meAddr','meTel','meMail','meTno'].forEach(function(k){
    if(db.me[k]) $(k).value = db.me[k];
  });
  if(db.me.useInvoice){ $('useInvoice').checked = true; $('invoiceWrap').hidden = false; }
  if(db.bank && $('bank')) $('bank').value = db.bank;
  if(db.note && $('note')) $('note').value = db.note;

  drawClients();

  /* 🔴⭐最初は全部たたんで始める（2026-09-10 本人「やっぱり全部出てるの、うっとうしい。
     サンプル見て、納得したら、①から開ければいいと思う」）。
     ⚠以前は全部開いていた＝何をする道具か分かるようにするため。
     ⭐いまは上の見本画像とサンプルがその役目を持っている。
     ⭐2回目からは③④だけ開ける＝自分の情報も取引先も保存済みなので、使うのはそこだけ
     （本人「保存まで見たら、次は入れなくていいってのがわかるから閉じたまま」）*/
  if(hasSavedMe()){
    if($('s3Box')) $('s3Box').open = true;
    if($('s4Box')) $('s4Box').open = true;
  }

  $('invDate').value  = todayStr();
  $('noPrefix').value = db.noPrefix;
  $('noDigits').value = String(db.noDigits);
  $('invNo').value    = makeNo();

  for(var i=0;i<4;i++) addRow();
  drawCols();

  /* ⭐見積書から渡ってきた中身があれば、それを入れる（10分以内のものだけ） */
  var handed = false;
  if(DOC === 'seikyu' && db.handoff && (Date.now() - db.handoff.at) < 600000){
    useForm(db.handoff.form);
    /* ⭐相手も入れる。⚠古い形は内容の中に入っていた */
    var hc = db.handoff.client || (db.handoff.form && db.handoff.form.client);
    if(hc){
      $('toName').value   = hc.name || '';
      $('toHonor').value  = hc.honor || '御中';
      $('toPerson').value = hc.person || '';
      $('toAddr').value   = hc.addr || '';
    }
    db.handoff = null; save();
    handed = true;
    /* ⭐見積書から渡ってきた人は、中身がもう入っている。⚠③④を開けて見せる */
    if($('s3Box')) $('s3Box').open = true;
    if($('s4Box')) $('s4Box').open = true;
    var m = $('handoffMsg');
    if(m){ m.hidden = false; }
  }

  /* ⭐はじめての人には、最初からサンプルを入れておく（2026-09-09 本人
     「初めて使う人のために。とにかくパッと見るから」） */
  if(!had && !handed){
    sampleAdd(1);
    Array.prototype.forEach.call(document.querySelectorAll('.js-sample-sel'), function(o){ o.value = '1'; });
  }
  else if(!handed) calc();

  /* --- 打つたびに描き直す --- */
  document.addEventListener('input', function(e){
    if(!(e.target.closest && e.target.closest('main'))) return;
    /* ⭐どこか1か所でも打ち直したら、サンプルの透かしは消す */
    if(SAMPLE_ON && !e.target.closest('.inv-sample')){
      SAMPLE_ON = false;
      Array.prototype.forEach.call(document.querySelectorAll('.js-sample-sel'), function(o){ o.value = ''; });
    }
    calc();
  });
  document.addEventListener('change', function(e){
    if(e.target.closest && e.target.closest('main')) calc();
  });
  /* ⭐打ち終わったら「－」を入れて整える（2026-09-11 本人）。
     ⭐欄の中そのものを書き換えるので、⭐**保存される値も紙もこの形になる**。
     ⚠calc() は呼ばない＝document の change がこのあとに走る */
  if($('meZip')) $('meZip').addEventListener('change', function(){
    var v = fmtZip(this.value.trim()); if(v !== this.value) this.value = v;
  });
  if($('meTel')) $('meTel').addEventListener('change', function(){
    var v = fmtTel(this.value.trim()); if(v !== this.value) this.value = v;
  });
  $('invNo').addEventListener('input', checkNo);
  $('noPrefix').addEventListener('input', refreshNo);
  $('noDigits').addEventListener('change', refreshNo);

  window.addEventListener('resize', fitSheet);

  /* --- 「？」の開け閉め（共通の形） --- */
  document.addEventListener('click', function(e){
    var b = e.target;
    while(b && b !== document.body && !(b.classList && b.classList.contains('tip-btn'))) b = b.parentElement;
    if(!b || b === document.body) return;
    var body = b.parentElement.nextElementSibling;
    while(body && !(body.classList && body.classList.contains('tip-body'))) body = body.nextElementSibling;
    if(!body) return;
    var open = body.hidden;
    body.hidden = !open;
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* --- インボイスの欄 --- */
  $('useInvoice').addEventListener('change', function(){
    $('invoiceWrap').hidden = !this.checked;
    calc();
  });

  /* --- サンプル（2か所に同じボタンがある） --- */
  var sels = document.querySelectorAll('.js-sample-sel');
  Array.prototype.forEach.call(sels, function(sel){
    sel.onchange = function(){
      var v = this.value;
      if(!v) return;
      /* 2か所のえらび欄をそろえる */
      Array.prototype.forEach.call(sels, function(o){ o.value = v; });
      sampleAdd(v);
      /* 🔴⭐どちらのえらび欄から選んでも、⑥確認を開く（2026-09-10 本人）。
         ⚠下のえらび欄から選んだときは開いていなかった */
      if($('prevBox') && !$('prevBox').open) $('prevBox').open = true;
      /* ⭐上のえらび欄から選んだ人は、そのまま見本まで送る（2026-09-09 本人） */
      if(this.closest('#sampleTop')){
        /* ⭐飛び先は「下のサンプル欄」＝そこに行くと、⭐サンプルと⑤が両方見える（2026-09-09 本人） */
        scrollToEl($('sampleLow'));
        /* ⭐上から飛んできた人にだけ、①へ戻る道を出す（2026-09-10 本人） */
        if($('backToTop')) $('backToTop').hidden = false;
      }
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll('.js-sample-del'), function(b){
    b.onclick = function(){
      Array.prototype.forEach.call(sels, function(o){ o.value = ''; });
      sampleDel();
      /* ⚠サンプルを消したら、戻る道も役目が終わる */
      if($('backToTop')) $('backToTop').hidden = true;
    };
  });

  /* ⭐①へ戻る。⚠たたんであったら開いてから動く */
  if($('backToTop')) $('backToTop').onclick = function(){
    if($('meBox') && !$('meBox').open) $('meBox').open = true;
    /* ⭐飛び先は①の1つ上＝「？のしるし」の行（2026-09-10 本人
       「①にすると上の余白が０になるから、そのうえに飛ばして」）*/
    scrollToEl(document.querySelector('.tip-guide') || $('meBox'));
    this.hidden = true;
  };

  /* --- ロゴ --- */
  drawLogo();
  $('logoFile').onchange = function(){
    if(this.files && this.files[0]) readLogo(this.files[0]);
    /* ⚠ここで value を空に戻していたので、選んだあとに
       「ファイルが選択されていません」と出ていた（2026-09-09 本人）。空に戻さない */
  };
  $('logoDel').onclick = function(){
    db.logo = ''; save(); drawLogo(); calc();
    $('logoFile').value = '';   /* 消したときだけ、選択欄も空に戻す */
  };

  /* --- 覚える --- */
  $('saveMe').onclick = function(){
    ['meName','meZip','meAddr','meTel','meMail','meTno'].forEach(function(k){
      db.me[k] = $(k).value.trim();
    });
    db.me.useInvoice = $('useInvoice').checked;
    db.bank = $('bank') ? $('bank').value : db.bank;
    db.note = $('note') ? $('note').value : db.note;
    db.noPrefix = $('noPrefix').value;
    db.noDigits = parseInt($('noDigits').value, 10) || 3;
    if(!db.me.meName && !db.me.meAddr){ alert('先に①で、屋号・氏名か住所を入れてください。'); return; }
    save();
    drawClients();
    $('meMsg').textContent = 'この端末に保存しました';
    flash($('meMsg'));
  };

  /* ⭐取引先＝相手の情報だけ（2026-09-10 本人）。⚠件名と明細は「取引の内容」のほう */
  function nowClient(){
    return {
      name  : $('toName').value.trim(),
      honor : $('toHonor').value,
      person: $('toPerson').value.trim(),
      addr  : $('toAddr').value.trim()
    };
  }
  function tellClient(t){ $('clientMsg').textContent = t; flash($('clientMsg')); }

  /* ⭐新しい名前で保存＝②の中身を1件足す。名前は会社名（氏名）がそのまま付く */
  $('clientNew').onclick = function(){
    var c = nowClient();
    if(!c.name){ alert('先に②で、会社名か氏名を入れてください。'); return; }
    if(db.clients.length >= 20){ alert('保存できるのは20件までです。いらないものを削除してください。'); return; }
    var hit = -1;
    for(var i=0;i<db.clients.length;i++){ if(db.clients[i].name === c.name){ hit = i; break; } }
    if(hit >= 0){
      if(!confirm('「' + c.name + '」はもう保存されています。差し替えますか。')) return;
      db.clients[hit] = c;
    }else{
      db.clients.push(c);
    }
    save(); drawClients();
    $('clientSel').value = String(hit >= 0 ? hit : db.clients.length - 1);
    tellClient('この端末に保存しました');
  };

  /* ⭐上書き＝選んでいる1件を、②の中身で置きかえる */
  $('clientSave').onclick = function(){
    var v = $('clientSel').value;
    if(v === ''){ alert('先に、上書きする取引先をえらんでください。'); return; }
    var c = nowClient();
    if(!c.name){ alert('先に②で、会社名か氏名を入れてください。'); return; }
    var old = db.clients[Number(v)];
    if(!old) return;
    if(!confirm('「' + old.name + '」を、いま②に入っている内容で上書きします。よろしいですか。')) return;
    db.clients[Number(v)] = c;
    save(); drawClients();
    tellClient('上書きしました');
  };

  $('clientUse').onclick = function(){
    var v = $('clientSel2').value;
    if(v === ''){ alert('先に、呼び出す取引先をえらんでください。'); return; }
    var c = db.clients[Number(v)];
    if(!c) return;
    $('toName').value   = c.name || '';
    $('toHonor').value  = c.honor || '御中';
    $('toPerson').value = c.person || '';
    $('toAddr').value   = c.addr || '';
    $('clientSel').value = v;
    calc();
  };

  $('clientDel').onclick = function(){
    var v = $('clientSel').value;
    if(v === ''){ alert('先に、削除する取引先をえらんでください。'); return; }
    var c = db.clients[Number(v)];
    if(!c) return;
    if(!confirm('「' + c.name + '」を、保存済の取引先から削除します。よろしいですか。')) return;
    db.clients.splice(Number(v), 1);
    save(); drawClients();
    tellClient('削除しました');
  };

  /* ⭐自分の情報は1件だけ（押すたびに上書き） */
  $('meDel').onclick = function(){
    if(!hasSavedMe()){ alert('まだ保存されていません。'); return; }
    if(!confirm('保存した自分の情報（①のロゴと④の振込先をふくむ）を削除します。よろしいですか。')) return;
    db.me = {}; db.bank = ''; db.note = ''; db.logo = '';
    save(); drawClients(); drawLogo();
    $('meMsg').textContent = '削除しました'; flash($('meMsg'));
  };

  /* --- 取引の内容（件名＋④の明細） --- */
  drawForms();
  if($('formSel')) $('formSel').onchange = function(){
    /* ⭐選んだら名前の欄に入れる。そのまま「上書き」が押せる */
    var f = db.forms[Number($('formSel').value)];
    if(f && $('formName')) $('formName').value = f.label || '';
  };
  if($('formNew')) $('formNew').onclick = function(){
    var f = nowForm();
    if(!f.items.length){ alert('先に④で、品目と金額を入れてください。'); return; }
    if(db.forms.length >= MAX_FORMS){
      alert('保存できるのは' + MAX_FORMS + '件までです。\n\n控えはPDFで保存してください。ここは「次も使う内容」を残す場所です。\nいらないものを削除してから、もう一度お試しください。');
      return;
    }
    var hit = -1;
    for(var i=0;i<db.forms.length;i++){ if(db.forms[i].label === f.label){ hit = i; break; } }
    if(hit >= 0){
      if(!confirm('「' + f.label + '」はもう保存されています。差し替えますか。')) return;
      db.forms[hit] = f;
    }else{ db.forms.push(f); }
    save(); drawForms();
    $('formSel').value = String(hit >= 0 ? hit : db.forms.length - 1);
    if($('formName')) $('formName').value = f.label;
    $('formMsg').textContent = 'この端末に保存しました'; flash($('formMsg'));
  };
  if($('formSave')) $('formSave').onclick = function(){
    var v = $('formSel').value;
    if(v === ''){ alert('先に、上書きするものをえらんでください。'); return; }
    var old = db.forms[Number(v)];
    if(!old) return;
    if(!confirm('「' + old.label + '」を、いまの③④の内容で上書きします。よろしいですか。')) return;
    var f = nowForm();
    if(!$('formName') || !$('formName').value.trim()) f.label = old.label;
    db.forms[Number(v)] = f;
    save(); drawForms();
    $('formSel').value = v;
    $('formMsg').textContent = '上書きしました'; flash($('formMsg'));
  };
  if($('formDel')) $('formDel').onclick = function(){
    var v = $('formSel').value;
    if(v === ''){ alert('先に、削除するものをえらんでください。'); return; }
    var f = db.forms[Number(v)];
    if(!f) return;
    if(!confirm('「' + f.label + '」を削除します。よろしいですか。')) return;
    db.forms.splice(Number(v), 1);
    save(); drawForms();
    if($('formName')) $('formName').value = '';
    $('formMsg').textContent = '削除しました'; flash($('formMsg'));
  };
  if($('formUse')) $('formUse').onclick = function(){
    var v = $('formSel2').value;
    if(v === ''){ alert('先に、呼び出すものをえらんでください。'); return; }
    var f = db.forms[Number(v)];
    if(!f) return;
    /* ⚠すでに④に入力があったら、消す前に聞く */
    var live = false;
    rows().forEach(function(tr){ if(!readRow(tr).empty) live = true; });
    if(live && !confirm('④に入力済みの内容があります。\n「' + f.label + '」の内容で入れ替えますか。')) return;
    useForm(f);
    if($('formSel')) $('formSel').value = String(v);
    if($('formName')) $('formName').value = f.label || '';
  };

  /* ⭐④をまとめて消す */
  if($('clearItems')) $('clearItems').onclick = function(){
    var live = false;
    rows().forEach(function(tr){ if(!readRow(tr).empty) live = true; });
    if(live && !confirm('④に入れた品目を全部消します。よろしいですか。')) return;
    clearItems();
  };

  /* ⭐この内容で請求書を作る（見積書だけ）＝取引の内容に残してから請求書へ移る */
  if($('toSeikyu')) $('toSeikyu').onclick = function(){
    var f = nowForm();
    if(!f.items.length){ alert('先に④で、品目と金額を入れてください。'); return; }
    /* ⚠ここで移ると見積書が画面から消える。⭐控えを取ったか先に聞く（2026-09-10 本人） */
    if(!confirm('請求書メーカーに移動します。\n\n⚠この見積書の控えは残りません。\n⑥「PDFで保存」を済ませましたか。\n\n（中身は「取引の内容」として残るので、あとで見積書に戻すこともできます）')) return;
    /* ⭐取引の内容に残す（同じ名前があれば上書き） */
    var hit = -1;
    for(var i=0;i<db.forms.length;i++){ if(db.forms[i].label === f.label){ hit = i; break; } }
    if(hit >= 0) db.forms[hit] = f;
    else if(db.forms.length < MAX_FORMS) db.forms.push(f);
    /* ⭐相手も一緒に渡す（請求書側で②に入る）。⚠内容には持たせない */
    db.handoff = { at: Date.now(), form: f, client: nowClient() };
    save();
    location.href = '../seikyu/';
  };

  /* --- 明細 --- */
  $('addRow').onclick = function(){ addRow(); drawCols(); calc(); };

  /* --- 列を増やす --- */
  $('colDate').onchange = function(){ drawCols(); calc(); };
  $('colCode').onchange = function(){ drawCols(); calc(); };
  $('fillRest').onchange = calc;

  /* --- 貼り付け --- */
  $('pasteIn').onclick = function(){
    /* 🔴⭐入れたら④を開いて、そこまで送る（2026-09-11 本人
       「④請求の内容は、今の『入れる』ボタンを押したら展開しよう」）。
       ⚠今までは中身は入っていたのに、④が閉じたままで何も起きていないように見えた */
    if(putRows(parseTable($('paste').value), $('pasteMsg')) === false) return;
    /* 🔴⭐開くだけ。画面は動かさない（2026-09-11 本人
       「④に飛ぶとビックリするから、画面の移動なしで展開して」） */
    if($('s4Box') && !$('s4Box').open) $('s4Box').open = true;
  };
  $('pasteClear').onclick = function(){ $('paste').value = ''; };

  /* ⭐表のどこかに直接貼り付けても入る（2行以上のときだけ差し替える） */
  $('itemBody').addEventListener('paste', function(e){
    var t = (e.clipboardData || window.clipboardData).getData('text') || '';
    if(t.indexOf('\n') < 0 && t.indexOf('\t') < 0) return;   /* ふつうの貼り付けはそのまま */
    e.preventDefault();
    putRows(parseTable(t), $('pasteMsg'));
  });

  /* --- 支払い --- */
  if($('dueEnd')) $('dueEnd').onclick = function(){
    $('dueDate').value = (D.dueMode === 'plus1m') ? plusOneMonth() : nextMonthEnd();
    calc();
  };

  /* --- 見本をたたんだり開いたりしたら、大きさを測り直す --- */
  $('prevBox').addEventListener('toggle', function(){ if(this.open) fitSheet(); });

  /* --- 押すと大きく／もう一度押すと戻る --- */
  $('pages').onclick = function(){
    BIG = !BIG;
    $('stage').classList.toggle('big', BIG);
    $('zoomHint').textContent = BIG ? '押すと小さくなります' : '押すと実物大になります（A4サイズ）';
    fitSheet();
  };

  /* --- 印刷（PDF） --- */
  var oldTitle = document.title;
  function restoreTitle(){ document.title = oldTitle; }
  window.addEventListener('afterprint', restoreTitle);
  /* ⚠afterprint が飛ばない機器があるので、戻す道をもう1本持つ */
  window.addEventListener('focus', restoreTitle);

  $('doPrint').onclick = function(){
    if(!$('toName').value.trim()){ alert('先に②で、請求先を入れてください。'); return; }
    if(!TOTAL){ alert('先に④で、品目と金額を入れてください。'); return; }
    if(!checkNo()){
      if(!confirm('この請求書番号は、前に使ったことがあります。このまま進めますか。')) return;
    }
    var no = $('invNo').value.trim();
    if(no && db.usedNos.indexOf(no) < 0){
      db.usedNos.push(no);
      if(db.usedNos.length > 500) db.usedNos = db.usedNos.slice(-500);
      /* 末尾の数字を読んで、次の番号に進める */
      var pre = db.noPrefix || '';
      var tail = (pre && no.indexOf(pre) === 0) ? no.slice(pre.length) : no;
      var m = /(\d+)\s*$/.exec(tail);
      if(m) db.lastSeq = Math.max(db.lastSeq, Number(m[1]));
      save();
    }
    /* 🔴⚠⑥がたたまれていると、紙に何も出ない（閉じた details は印刷されない）。
       ⭐押したら必ず開けてから印刷する（2026-09-10） */
    if($('prevBox') && !$('prevBox').open) $('prevBox').open = true;
    /* ⭐ここが肝。印刷の直前に題名を変えると、保存の名前がこれになる */
    document.title = fileName();
    var putBack = liftPages();
    setTimeout(function(){
      window.print();
      /* ⚠印刷の画面を閉じたら元に戻す。⭐onafterprint が来ない環境のために時間でも戻す */
      var done = false;
      var back = function(){ if(done) return; done = true; putBack(); restoreTitle(); };
      window.addEventListener('afterprint', back, { once:true });
      setTimeout(back, 4000);
    }, 30);
  };

  /* --- 全部消す --- */
  $('clearAll').onclick = function(){
    if(!confirm('この端末に保存したものと、いま画面に入っているものを、全部消します。\n自分の情報・取引先・ひな形・振込先・番号の記録と、①〜⑤に打った内容すべて。\n戻せません。よろしいですか。')) return;
    try{ localStorage.removeItem(KEY); }catch(e){}
    /* 🔴⚠ docs と forms が抜けていた（2026-09-11 に見つけた）。
       ⚠db.forms が undefined になり、このあとひな形を保存しようとすると止まっていた。
       ⭐最初の db と同じ形にそろえる */
    db = { me:{}, clients:[], bank:'', note:'', logo:'',
           noPrefix:defaultPrefix(), noDigits:3, usedNos:[], lastSeq:0, docs:{}, forms:[] };
    /* 🔴⭐画面の中身も全部消す（2026-09-11 本人「本当に全部」）。
       ⚠以前は①と⑤だけ消えて、②③④が残っていた＝半分残るのが一番困る。
       🔴⚠見積書には bank（お振込先）の欄がない（2026-09-11 に見つけた）。
       ⚠null に value を入れようとしてここで止まり、この下が全部走っていなかった。
       ⭐欄があるときだけ消す */
    ['meName','meZip','meAddr','meTel','meMail','meTno',
     'toName','toPerson','toAddr','subject','dueDate','bank','note',
     'formName','paste','logoFile'].forEach(function(k){ if($(k)) $(k).value = ''; });
    if($('toHonor')) $('toHonor').value = '御中';
    /* ⭐③のスイッチを全部初期に戻す */
    $('useInvoice').checked = false;
    $('invoiceWrap').hidden = true;
    if($('colCode'))   $('colCode').checked = false;
    if($('colDate'))   $('colDate').checked = false;
    if($('roundSel'))  $('roundSel').value  = 'floor';
    if($('priceMode')) $('priceMode').value = 'ex';
    if($('whTarget'))  $('whTarget').value  = 'net';
    if($('useWithhold')){
      $('useWithhold').checked = false;
      if($('whTargetWrap')) $('whTargetWrap').hidden = true;
    }
    $('noPrefix').value = db.noPrefix;
    $('noDigits').value = '3';
    /* ⭐④を空の4行に戻す（サンプルの透かしもここで消える） */
    clearItems();
    /* ⭐サンプルのえらび欄も戻す */
    Array.prototype.forEach.call(document.querySelectorAll('.js-sample-sel'), function(o){ o.value = ''; });
    if($('backToTop')) $('backToTop').hidden = true;
    drawClients();
    /* ⚠ひな形の一覧を描き直していなかった＝消したのに画面に残っていた */
    drawForms();
    drawLogo();
    $('invNo').value = makeNo();
    calc();
  };

  calc();
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
