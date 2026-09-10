# -*- coding: utf-8 -*-
"""
テスト版を作る（公開前の確認用）
  python make_test.py

いまのローカルのファイルを test/ にコピーして、検索に出ない印を入れる。
⚠フォルダ名にアンダースコアを使わない（GitHub Pages が _ 始まりを無視するため）
⚠test/ を上げて、タブレット等で確認 → よければ本物の場所のファイルを上げる
"""
import io, os, re, shutil, datetime
STAMP = datetime.datetime.now().strftime('%m/%d %H:%M')

ROOT = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(ROOT, 'test')

# 持っていくもの（サイトの形をそのまま保つので、相対パスがそのまま効く）
FILES = ['style.css', 'print.css', 'top.css', 'seating.js', 'tip.js', 'keiri.css', 'keiri.js', 'index.html', 'ogp.png']
# 🔴 img はトップの完成画像。入れないとテスト版でカードが空になる（2026-09-01）
DIRS = ['about', 'seat', 'seki', 'entaku', 'kaigishitsu', 'group', 'slide', 'excel-fx', 'typing', 'seikyu', 'mitsumori', 'contact', 'privacy', 'img']

NOINDEX = '<meta name="robots" content="noindex,nofollow">'

def stamp(path):
    """検索に出ない印を入れて、テスト版と分かるようにする"""
    s = io.open(path, encoding='utf-8').read()
    if 'noindex' not in s:
        s = s.replace('<head>', '<head>\n' + NOINDEX, 1)
    # 見まちがえないように、タイトルの頭に印を付ける
    s = re.sub(r'<title>(?!【テスト】)', '<title>【テスト】', s, count=1)
    # 🔴 いつ作ったテスト版かを、画面の右上に出す（2026-09-01 本人「いつ更新か分からない」）
    # ⚠スマホでヘッダーのリンクに重なって押せなかった（2026-09-06 本人）。ヘッダーの下に置く
    badge = ('<div style="position:fixed;right:6px;top:56px;z-index:9999;'
             'background:#c86a8e;color:#fff;font-size:11px;padding:3px 8px;'
             'border-radius:999px;opacity:.85" class="noprint">テスト版 ' + STAMP + '</div>')
    s = s.replace('<body>', '<body>' + chr(10) + badge, 1)
    io.open(path, 'w', encoding='utf-8', newline='').write(s)

# ================= 右上のリンク（ヘッダー）をそろえる =================
# 🔴 2026-09-06 本人「それは仕組みで対応して」。
#    ⚠ヘッダーは全ページに手で書いてある＝別のセッションが古い形のまま上げると崩れる。
#    ⭐ここで毎回“正しい形”に書き直す。テスト版を作るたびに直るので、書き忘れが残らない。
# ⭐道具を増やすときは、この TOOLS に1行足すだけ（全ページに反映される）
TOOLS = [('seat', '座席表'), ('seki', '席次表'), ('slide', 'スライド'), ('excel-fx', '関数早見表')]
# ⚠5つめが出たら並べきれない（スマホで折り返す）。そのときは「ツール一覧」1つに変える

# 道具ではないページ（右上には出さない。ヘッダー自体はそろえる）
NOT_TOOL = ['about', 'contact', 'privacy']
# まだ公開していない道具（右上にはまだ出さない。公開するとき TOOLS に移す）
PENDING  = ['entaku', 'kaigishitsu', 'group', 'typing', 'seikyu', 'mitsumori']

def nav_html(folder):
    """folder='' はトップ。自分のページへのリンクは出さない"""
    base = '' if folder == '' else '../'
    out = []
    if folder != '':                      # 🔴 トップへは「トップ」で戻る（2026-09-06 本人
        out.append('<a href="%s">トップ</a>' % (base or './'))
        #    「ロゴで戻れるって知らない人もいるから」）
    for d, label in TOOLS:
        if d == folder:                   # ⭐見ているページ自身は出さない
            continue
        out.append('<a href="%s%s/">%s</a>' % (base, d, label))
    # ⭐スマホはハンバーガー、パソコンは並べる（2026-09-08 本人「今は②だね」）。
    #   ⚠JSは使わない＝<details> だけで開け閉めする（全ページに script を置かずに済む）
    #   ⭐☰ に「ツール」の文字を添える（アイコンだけより見つけられる／NN/g の研究）
    # ⚠<details> は閉じていると中身を描かない＝パソコンでリンクが消えた（2026-09-08）。
    #   ⭐チェックボックスで開け閉めする形にした。リンクは常に DOM にある
    links = chr(10).join('      ' + x for x in out)
    return ('<nav>' + chr(10) +
            '      <input type="checkbox" id="navtoggle" class="navtoggle">' + chr(10) +
            '      <label class="navburger" for="navtoggle">ツール</label>' + chr(10) +
            '      <div class="navlist">' + chr(10) +
            links + chr(10) +
            '      </div>' + chr(10) +
            '    </nav>')

NAV_RE = re.compile(r'<nav>.*?</nav>', re.S)

# ⭐ロゴの右に「いま開いている道具の名前」を出す（2026-09-09 本人
#   「全部見た目が同じようになってきて、どれを開いているのかが分からなくなってきた」）
#   ⚠型1で「見ているページ自身へのリンクは出さない」と決めているので、ヘッダーに名前が無かった
#   ⭐名前は各ページの <h1> から自動で取る。表を手で持たない（→ ページの型 16-a）
# ⭐ヘッダーに出す短い名前。⚠h1 は長い（例＝理科室・図工室の座席表メーカー＝15字）ので、
#   ⭐右上のナビと同じ短い言い方にそろえる。ここに無いページは h1 から取る（新しい道具の保険）
# ⭐（パソコンで出す名前, スマホで出す名前）
#   🔴⭐パソコンは「メーカー」まで入れる（2026-09-10 本人「やっぱり、上のピンクの帯、
#     座席表メーカーって入れたほうがいい（スマホ以外）」）。
#     ⚠一度「入れない」と決めたが、同じ日に戻した。⭐入れないのはスマホだけ
#   ⚠パソコンは幅に余裕があるので長く出す。⚠スマホのヘッダーに入るのは約6文字なので短くする
#   （2026-09-09 本人「いま、スマホで考えてると思うけど、パソコンで思ったんだよ」）
#   ⚠「メーカー」を付けるのは、h1 に付いている道具だけ（早見表・上座下座・タイピングは付けない）
NAMES = {
    'seat':        ('座席表メーカー',            '座席表'),
    'seki':        ('席次表メーカー',            '席次表'),
    'slide':       ('簡単スライドメーカー',      '簡単スライド'),
    'excel-fx':    ('Excel 関数早見表',          '関数早見表'),
    'group':       ('特別教室の座席表メーカー',   '特別教室'),
    'entaku':      ('円卓の上座・下座',           '円卓'),
    'kaigishitsu': ('会議室の上座・下座',         '会議室'),
    'typing':      ('タイピング練習',             'タイピング'),
    'seikyu':      ('請求書メーカー',            '請求書'),
    'mitsumori':   ('見積書メーカー',            '見積書'),
}
H1_RE  = re.compile(r'<h1[^>]*>(.*?)</h1>', re.S)
# ⭐ヘッダーの中に入れると幅を取り合って2行になった（2026-09-10 本人のスクショ）。
#   ⭐ヘッダーの下に「細い帯」を作って、そこに名前を出す
# ⚠古い印の消し残しが積み重なる事故があった（2026-09-10）。
#   ⭐ロゴ（</a>）と <nav> のあいだを丸ごと空にする＝残骸が何個あっても必ず消える
CLEAN_RE = re.compile(r'(</a>)(.*?)(<nav>)', re.S)
SUB_RE = re.compile(r'\s*<div class="site-sub">.*?</div>\s*</div>\s*(?=</header>)', re.S)
# ⚠余分な </div> が増えてしまった事故の後始末（2026-09-10）
DUP_DIV_RE = re.compile(r'(</nav>\s*</div>)(\s*</div>)+\s*</header>', re.S)
HEAD_END_RE = re.compile(r'(</nav>\s*</div>)\s*</header>', re.S)

def set_now(s, folder):
    """ヘッダーの下の細い帯に、いま開いている道具の名前を出す。トップページには出さない"""
    s = CLEAN_RE.sub(lambda m: m.group(1) + chr(10) + '    ' + m.group(3), s, count=1)  # ロゴとnavの間を空に
    s = SUB_RE.sub('', s)                                                    # 前の帯を外す
    s = DUP_DIV_RE.sub(lambda m: m.group(1) + chr(10) + '</header>', s)      # 余分な </div> を掃除
    if folder == '':
        return s
    pair = NAMES.get(folder)
    if pair:
        long_name, short_name = pair
    else:
        m = H1_RE.search(s)
        if not m:
            return s
        long_name = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        short_name = long_name
    if not long_name:
        return s
    bar = (chr(10) + '  <div class="site-sub"><div class="wrap">'
           '<span class="now-long">%s</span>'
           '<span class="now-short">%s</span>'
           '</div></div>' + chr(10) + '</header>') % (long_name, short_name)
    return HEAD_END_RE.sub(lambda mm: mm.group(1) + bar, s, count=1)


def pages_with_head():
    """ヘッダーを持つページを、フォルダを見て自分で見つける。
       ⭐DIRS に足し忘れても拾えるようにする（別セッションが作ったページ対策）"""
    found = [('index.html', '')]
    for d in sorted(os.listdir(ROOT)):
        if d in ('test', 'img') or not os.path.isdir(os.path.join(ROOT, d)) or d.startswith(('.', '_')):
            continue
        p = os.path.join(ROOT, d, 'index.html')
        if os.path.exists(p) and 'site-head' in io.open(p, encoding='utf-8').read():
            found.append((d + '/index.html', d))
    return found

def fix_nav():
    fixed = []
    known = [d for d, _ in TOOLS] + NOT_TOOL + PENDING
    unknown = []
    for rel, folder in pages_with_head():
        path = os.path.join(ROOT, rel.replace('/', os.sep))
        s = io.open(path, encoding='utf-8').read()
        if not NAV_RE.search(s):
            continue
        if folder and folder not in known:
            unknown.append(folder)
        new = NAV_RE.sub(lambda m: nav_html(folder), s, count=1)
        new = set_now(new, folder)
        if new != s:
            io.open(path, 'w', encoding='utf-8', newline='').write(new)
            fixed.append(rel)
    if fixed:
        print('ヘッダーを直しました: ' + ' / '.join(fixed))
    else:
        print('ヘッダーは全ページそろっています')
    # ⭐新しいページが増えていたら知らせる（声かけをしなくても気づけるように・2026-09-06）
    for d in unknown:
        print('【注意】%s/ が仲間に入っていません。'
              '道具なら make_test.py の TOOLS に、道具でなければ NOT_TOOL か PENDING に足してください' % d)
    # ⚠ DIRS に無いとテスト版に入らない
    for d in unknown:
        if d not in DIRS:
            print('【注意】%s/ は DIRS にも入っていません（テスト版にコピーされません）' % d)

fix_nav()

if os.path.isdir(DEST):
    shutil.rmtree(DEST)
os.makedirs(DEST)

n = 0
for f in FILES:
    p = os.path.join(ROOT, f)
    if os.path.exists(p):
        shutil.copy2(p, os.path.join(DEST, f)); n += 1
# 🔴⭐サイトに要らないものは test に入れない（2026-09-10 本人
#   「UPのルール知らないし、画像作るルールも知らないから、間違えない方法がよい」）
#   ⚠実例＝img/見本画像の作り方.md が test に混ざって、上げるとき「これ何？」となった。
#   ⭐作り方のメモや作業用のファイルは、手元では画像の隣に置いたまま、test には持っていかない
SKIP_EXT = ('.md', '.py', '.bak', '.txt', '.psd', '.xlsx')
def skip_files(dirpath, names):
    return [x for x in names if x.lower().endswith(SKIP_EXT) or x.startswith(('_', '.'))]

for d in DIRS:
    p = os.path.join(ROOT, d)
    if os.path.isdir(p):
        shutil.copytree(p, os.path.join(DEST, d), ignore=skip_files); n += 1

for base, _, files in os.walk(DEST):
    for f in files:
        if f.endswith('.html'):
            stamp(os.path.join(base, f))

# テスト版だけを検索から外す
io.open(os.path.join(DEST, 'robots.txt'), 'w', encoding='utf-8', newline='').write(
    'User-agent: *\nDisallow: /\n')

print('test/ を作りました（%d 個）' % n)
print('この test フォルダごとGitHubに上げて、タブレットで開いてください：')
print('  https://sakura-tools.com/test/seat/')
print('  https://sakura-tools.com/test/seki/')
