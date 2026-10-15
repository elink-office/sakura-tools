/* 単位変換（2026-09-26 たたき台）
   ⭐計算は全部この中で完結。外から何も読み込まない・どこにも送らない・保存もしない
   ⭐換算の数値の出典
     - ヤード・ポンド法（in / ft / yd / mi / lb / oz / gal など）＝1959年の国際協定による定義値
       1 in = 0.0254 m、1 lb = 0.45359237 kg（NIST SP 811 付録B・2026-09-26 に確認）
     - 尺貫法＝Wikipedia「尺貫法」（2026-09-26 閲覧）
       1尺 = 10/33 m、1坪 = 400/121 m²、1升 = 2401/1331 L、1貫 = 3.75 kg（いずれも 1891年 度量衡法の定義）
     - 畳＝Wikipedia「畳」（2026-09-26 閲覧）
       京間 1,910×955mm／中京間 1,820×910mm／江戸間 1,760×880mm／団地間 1,700×850mm
     - Excel の CONVERT 関数の単位記号＝Microsoft サポート「CONVERT 関数」（2026-09-26 閲覧）
       https://support.microsoft.com/office/convert-function-d785bef1-808e-4aac-bdcd-666c810f9af2
       ⚠ CONVERT に無い単位（坪・尺・大さじ など）は excel:null にして、式を出さない
       ⚠ 接頭語つき（cm・kg・km/h・kibyte など）は Microsoft の「接頭語の表」に従った。
          面積・体積の接頭語（cm2・km2・cm3）は自信が無いので式を出していない */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };

  /* ---------- 単位の表 ----------
     f = 基準の単位に直すときの倍率（基準：m / kg / m² / L / m/s / byte）
     excel = CONVERT 関数の単位記号（無いものは null） */
  var CATS = {
    length: { name:'長さ', from:'cm', to:'in', units:[
      {k:'mm',  n:'ミリメートル（mm）', f:0.001,   excel:'mm'},
      {k:'cm',  n:'センチメートル（cm）', f:0.01,  excel:'cm'},
      {k:'m',   n:'メートル（m）',     f:1,       excel:'m'},
      {k:'km',  n:'キロメートル（km）', f:1000,    excel:'km'},
      {k:'in',  n:'インチ（in）',      f:0.0254,  excel:'in'},
      {k:'ft',  n:'フィート（ft）',    f:0.3048,  excel:'ft'},
      {k:'yd',  n:'ヤード（yd）',      f:0.9144,  excel:'yd'},
      {k:'mi',  n:'マイル（mi）',      f:1609.344, excel:'mi'},
      {k:'nmi', n:'海里',              f:1852,    excel:'Nmi'},
      {k:'sun', n:'寸',                f:1/33,    excel:null},
      {k:'shaku',n:'尺',               f:10/33,   excel:null},
      {k:'ken', n:'間（けん）',        f:60/33,   excel:null},
      {k:'cho', n:'町（ちょう）',      f:3600/33, excel:null},
      {k:'ri',  n:'里',                f:129600/33, excel:null}
    ], quick:[['cm','in'],['in','cm'],['m','ft'],['mi','km'],['shaku','cm']] },

    mass: { name:'重さ', from:'kg', to:'lb', units:[
      {k:'mg',  n:'ミリグラム（mg）',  f:0.000001, excel:'mg'},
      {k:'g',   n:'グラム（g）',       f:0.001,    excel:'g'},
      {k:'kg',  n:'キログラム（kg）',  f:1,        excel:'kg'},
      {k:'t',   n:'トン（t）',         f:1000,     excel:null},
      {k:'oz',  n:'オンス（oz）',      f:0.028349523125, excel:'ozm'},
      {k:'lb',  n:'ポンド（lb）',      f:0.45359237, excel:'lbm'},
      {k:'st',  n:'ストーン（st）',    f:6.35029318, excel:'stone'},
      {k:'uston',n:'米トン（ショートトン）', f:907.18474, excel:'ton'},
      {k:'monme',n:'匁（もんめ）',     f:0.00375,  excel:null},
      {k:'ryo', n:'両',                f:0.0375,   excel:null},
      {k:'kin', n:'斤',                f:0.6,      excel:null},
      {k:'kan', n:'貫',                f:3.75,     excel:null}
    ], quick:[['kg','lb'],['lb','kg'],['g','oz'],['kan','kg']] },

    area: { name:'面積', from:'tsubo', to:'m2', units:[
      {k:'cm2', n:'平方センチメートル（cm²）', f:0.0001, excel:null},
      {k:'m2',  n:'平方メートル（m²）', f:1,       excel:'m2'},
      {k:'a',   n:'アール（a）',       f:100,     excel:'ar'},
      {k:'ha',  n:'ヘクタール（ha）',  f:10000,   excel:'ha'},
      {k:'km2', n:'平方キロメートル（km²）', f:1000000, excel:null},
      {k:'in2', n:'平方インチ（in²）', f:0.00064516, excel:'in2'},
      {k:'ft2', n:'平方フィート（ft²）', f:0.09290304, excel:'ft2'},
      {k:'yd2', n:'平方ヤード（yd²）', f:0.83612736, excel:'yd2'},
      {k:'ac',  n:'エーカー（ac）',    f:4046.8564224, excel:'uk_acre'},
      {k:'mi2', n:'平方マイル（mi²）', f:2589988.110336, excel:'mi2'},
      {k:'tsubo',n:'坪',               f:400/121, excel:null},
      {k:'jo_edo',n:'畳（江戸間・1.76×0.88m）', f:1.76*0.88, excel:null},
      {k:'jo_chukyo',n:'畳（中京間・1.82×0.91m）', f:1.82*0.91, excel:null},
      {k:'jo_kyo',n:'畳（京間・1.91×0.955m）', f:1.91*0.955, excel:null},
      {k:'jo_danchi',n:'畳（団地間・1.70×0.85m）', f:1.70*0.85, excel:null},
      {k:'tan', n:'反（たん）',        f:120000/121, excel:null},
      {k:'choA',n:'町（面積）',        f:1200000/121, excel:null}
    ], quick:[['tsubo','m2'],['m2','tsubo'],['jo_edo','m2'],['ft2','m2'],['ac','m2']] },

    volume: { name:'体積', from:'cup_us', to:'ml', units:[
      {k:'ml',  n:'ミリリットル（mL）', f:0.001,  excel:'ml'},
      {k:'l',   n:'リットル（L）',     f:1,       excel:'l'},
      {k:'m3',  n:'立方メートル（m³）', f:1000,   excel:'m3'},
      {k:'tsp_jp',n:'小さじ（5mL）',   f:0.005,   excel:'tspm'},
      {k:'tbsp_jp',n:'大さじ（15mL）', f:0.015,   excel:null},
      {k:'cup_jp',n:'カップ（日本・200mL）', f:0.2, excel:null},
      {k:'tsp_us',n:'小さじ（アメリカ・tsp）', f:0.00492892159375, excel:'tsp'},
      {k:'tbsp_us',n:'大さじ（アメリカ・tbsp）', f:0.01478676478125, excel:'tbs'},
      {k:'cup_us',n:'カップ（アメリカ・cup）', f:0.2365882365, excel:'cup'},
      {k:'floz',n:'液量オンス（アメリカ・fl oz）', f:0.0295735295625, excel:'oz'},
      {k:'pt',  n:'パイント（アメリカ・pt）', f:0.473176473, excel:'us_pt'},
      {k:'qt',  n:'クォート（アメリカ・qt）', f:0.946352946, excel:'qt'},
      {k:'gal', n:'ガロン（アメリカ・gal）', f:3.785411784, excel:'gal'},
      {k:'ukgal',n:'ガロン（イギリス）', f:4.54609, excel:'uk_gal'},
      {k:'in3', n:'立方インチ（in³）', f:0.016387064, excel:'in3'},
      {k:'ft3', n:'立方フィート（ft³）', f:28.316846592, excel:'ft3'},
      {k:'go',  n:'合（ごう）',        f:2401/13310, excel:null},
      {k:'sho', n:'升（しょう）',      f:2401/1331, excel:null},
      {k:'to',  n:'斗（と）',          f:24010/1331, excel:null},
      {k:'koku',n:'石（こく）',        f:240100/1331, excel:null}
    ], quick:[['cup_us','ml'],['tbsp_us','ml'],['gal','l'],['floz','ml'],['sho','l']] },

    temp: { name:'温度', from:'c', to:'f', units:[
      {k:'c', n:'摂氏（°C）', excel:'C'},
      {k:'f', n:'華氏（°F）', excel:'F'},
      {k:'k', n:'ケルビン（K）', excel:'K'}
    ], quick:[['c','f'],['f','c'],['c','k']] },

    speed: { name:'速さ', from:'kmh', to:'mph', units:[
      {k:'ms',  n:'メートル毎秒（m/s）', f:1,       excel:'m/s'},
      {k:'kmh', n:'キロメートル毎時（km/h）', f:1000/3600, excel:'km/h'},
      {k:'mph', n:'マイル毎時（mph）', f:0.44704,  excel:'mph'},
      {k:'kn',  n:'ノット（kn）',      f:1852/3600, excel:'kn'},
      {k:'fts', n:'フィート毎秒（ft/s）', f:0.3048, excel:null}
    ], quick:[['kmh','mph'],['mph','kmh'],['kn','kmh'],['ms','kmh']] },

    data: { name:'データ量', from:'gb', to:'mb', units:[
      {k:'bit', n:'ビット（bit）',     f:0.125,    excel:'bit'},
      {k:'b',   n:'バイト（B）',       f:1,        excel:'byte'},
      {k:'kb',  n:'キロバイト（KB）',  f:1024,     excel:'kibyte'},
      {k:'mb',  n:'メガバイト（MB）',  f:1048576,  excel:'Mibyte'},
      {k:'gb',  n:'ギガバイト（GB）',  f:1073741824, excel:'Gibyte'},
      {k:'tb',  n:'テラバイト（TB）',  f:1099511627776, excel:'Tibyte'}
    ], quick:[['gb','mb'],['mb','kb'],['tb','gb'],['b','bit']] }
  };

  var cat = 'length';

  /* ---------- 温度だけは式 ---------- */
  function toC(v, u){ return u==='c' ? v : u==='f' ? (v-32)*5/9 : v-273.15; }
  function fromC(c, u){ return u==='c' ? c : u==='f' ? c*9/5+32 : c+273.15; }

  function unit(k){
    var us = CATS[cat].units;
    for (var i=0;i<us.length;i++) if(us[i].k===k) return us[i];
    return null;
  }

  function convert(v, fk, tk){
    if (cat==='temp') return fromC(toC(v, fk), tk);
    var a = unit(fk), b = unit(tk);
    return v * a.f / b.f;
  }

  /* ---------- 数の見せ方：有効数字6けた・末尾の0を消す・指数にしない ---------- */
  function fmt(x){
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    var s = Number(x.toPrecision(6)).toString();   /* 1e21 以上・1e-7 未満は e が付く */
    var neg = s.charAt(0)==='-'; if(neg) s = s.slice(1);
    var m = s.split('e'), man = m[0], ex = m[1] ? parseInt(m[1],10) : 0;
    var parts = man.split('.'), ip = parts[0], fp = parts[1] || '';
    if (ex > 0){ while(ex>0){ if(fp.length){ ip += fp.charAt(0); fp = fp.slice(1); } else ip += '0'; ex--; } }
    else if (ex < 0){ while(ex<0){ if(ip.length>1){ fp = ip.charAt(ip.length-1)+fp; ip = ip.slice(0,-1); } else { fp = ip+fp; ip='0'; } ex++; } }
    fp = fp.replace(/0+$/,'');
    ip = ip.replace(/^0+(?=\d)/,'');
    ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg?'-':'') + ip + (fp ? '.'+fp : '');
  }

  /* ⚠Excel の CONVERT の式を出すのは 2026-09-27 にはずした（本人「ない単位とかもあるから、いらないね」）。
     単位の excel の値は表に残してある（使っていない） */

  /* ---------- 画面 ---------- */
  function fillSelect(sel, k){
    sel.innerHTML = '';
    CATS[cat].units.forEach(function(u){
      var o = document.createElement('option'); o.value = u.k; o.textContent = u.n; sel.appendChild(o);
    });
    sel.value = k;
  }

  function readNum(){
    var raw = $('num').value.replace(/[，,]/g,'').replace(/[０-９．－]/g, function(c){ return String.fromCharCode(c.charCodeAt(0)-0xFEE0); }).trim();
    if (raw === '' || raw === '-' ) return NaN;
    return Number(raw);
  }

  function update(){
    var v = readNum(), fk = $('from').value, tk = $('to').value;
    var a = unit(fk), b = unit(tk);
    var out = $('result');
    if (isNaN(v)){
      out.textContent = '—';
      $('resultUnit').textContent = b.n;
      renderTable(NaN);
      return;
    }
    var r = convert(v, fk, tk);
    out.textContent = fmt(r);
    $('resultUnit').textContent = b.n;
    renderTable(v);
  }

  function renderTable(v){
    var tb = $('allBody'); tb.innerHTML = '';
    var fk = $('from').value;
    CATS[cat].units.forEach(function(u){
      var tr = document.createElement('tr');
      var td1 = document.createElement('td'), td2 = document.createElement('td');
      td1.textContent = u.n;
      td2.textContent = isNaN(v) ? '—' : fmt(convert(v, fk, u.k));
      td2.className = 'num';
      if (u.k === fk) tr.className = 'is-from';
      tr.appendChild(td1); tr.appendChild(td2); tb.appendChild(tr);
    });
    $('allHead').textContent = isNaN(v) ? '入れた数' : (fmt(v) + ' ' + unit(fk).n + ' は');
  }

  function renderQuick(){
    var box = $('quick'); box.innerHTML = '';
    CATS[cat].quick.forEach(function(q){
      var a = unit(q[0]), b = unit(q[1]);
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'mini';
      btn.textContent = shortName(a) + ' → ' + shortName(b);
      btn.addEventListener('click', function(){ $('from').value = q[0]; $('to').value = q[1]; update(); });
      box.appendChild(btn);
    });
  }
  /* ボタン用の短い名前＝かっこの中（cm・in）。かっこが無いものは名前そのまま（坪・尺） */
  function shortName(u){
    var m = u.n.match(/（([^）]+)）/);
    if (!m) return u.n;
    var s = m[1].replace(/^アメリカ・/,'').replace(/^日本・/,'');
    if (/^[0-9.]+×/.test(s) || /^\d+mL$/.test(s)) return u.n.replace(/（.*$/,'');   /* 畳（江戸間…）・小さじ（5mL） */
    if (/・/.test(s)) return u.n.replace(/（.*$/,'');
    return s;
  }

  function setCat(c){
    cat = c;
    var btns = $('cats').querySelectorAll('button');
    for (var i=0;i<btns.length;i++){
      var on = btns[i].dataset.cat === c;
      btns[i].classList.toggle('on', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    fillSelect($('from'), CATS[c].from);
    fillSelect($('to'),   CATS[c].to);
    $('dataNote').hidden = (c !== 'data');
    $('joNote').hidden = (c !== 'area');
    renderQuick();
    update();
  }

  function copyText(t, done){
    function ok(){ done(true); }
    function ng(){
      try{
        var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly','');
        ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta);
        ta.select(); var r = document.execCommand('copy'); document.body.removeChild(ta); done(!!r);
      }catch(e){ done(false); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, ng); else ng();
  }
  var msgTimer = 0;
  function say(id, text){
    var el = $(id); el.textContent = text;
    clearTimeout(msgTimer); msgTimer = setTimeout(function(){ el.textContent = ''; }, 3000);
  }

  /* ---------- 起動 ---------- */
  document.addEventListener('DOMContentLoaded', function(){
    var cats = $('cats');
    Object.keys(CATS).forEach(function(k){
      var b = document.createElement('button'); b.type='button'; b.dataset.cat = k; b.textContent = CATS[k].name;
      b.addEventListener('click', function(){ setCat(k); });
      cats.appendChild(b);
    });
    $('num').addEventListener('input', update);
    $('from').addEventListener('change', update);
    $('to').addEventListener('change', update);
    $('swap').addEventListener('click', function(){
      var f = $('from').value; $('from').value = $('to').value; $('to').value = f; update();
    });
    $('copyResult').addEventListener('click', function(){
      var t = $('result').textContent; if (t==='—') return;
      copyText(t.replace(/,/g,''), function(ok){ say('copyMsg', ok ? '結果をコピーしました' : 'コピーできませんでした'); });
    });
    setCat('length');
  });
})();
