"""Builds both front ends from one source:
   out/App.html  – the page Apps Script serves (google.script.run), code packed so Google's sandbox can't alter it
   out/pwa/      – the installable phone app for GitHub Pages (talks to the same script over HTTPS)"""
import base64, os, re, shutil, sys
SRC = '/home/claude/family/src'; OUT = '/home/claude/family/out'
head = open(f'{SRC}/head.html').read()
js = open(f'{SRC}/app.dev.js').read()
orig = open(f'{SRC}/App.html').read().split('\n')
guard = '\n'.join(orig[153:223])            # lines 154–223: the startup guard <script>…</script>
assert guard.startswith('<script>') and guard.rstrip().endswith('</script>'), guard[:40]
assert '</script' not in js
b64 = base64.b64encode(js.encode('utf-8')).decode()
payload = '\n'.join(b64[i:i + 100] for i in range(0, len(b64), 100))
os.makedirs(f'{OUT}/pwa', exist_ok=True)
app = head + '\n' + guard + '\n\n<script type="text/plain" id="payload">\n' + payload + '\n</script>\n<script type="text/plain" id="canary">\n' + js + '</script>\n<script>window.__start && window.__start();</script>\n</body>\n</html>\n'
open(f'{OUT}/App.html', 'w').write(app)
# phone app
h = head.replace('<base target="_top">\n', '')
h = h.replace('<meta charset="utf-8">', '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Family HQ</title>
<meta name="theme-color" content="#A6DDEF">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Family HQ">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/favicon-32.png">''', 1)
assert 'manifest.webmanifest' in h
h = h.replace('header{position:sticky;top:0;', 'header{position:sticky;top:0;padding-top:calc(14px + env(safe-area-inset-top));', 1)
pwa = h + '\n<script src="config.js"></script>\n<script src="app.js"></script>\n<script>if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function(){});</script>\n</body>\n</html>\n'
open(f'{OUT}/pwa/index.html', 'w').write(pwa)
open(f'{OUT}/pwa/app.js', 'w').write(js)
for f in os.listdir(f'{SRC}/pwa'):
    p = f'{SRC}/pwa/{f}'
    (shutil.copytree(p, f'{OUT}/pwa/{f}', dirs_exist_ok=True) if os.path.isdir(p) else shutil.copy(p, f'{OUT}/pwa/{f}'))
shutil.copy(f'{SRC}/Code.gs', f'{OUT}/Code.gs')
print('built', len(app), 'bytes App.html;', len(pwa), 'bytes index.html')
