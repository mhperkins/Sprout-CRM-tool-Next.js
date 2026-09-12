"""Build the Industry TV deck: embeds each slide file as a srcdoc iframe.
Run from anywhere:  python build-deck.py
Writes public/industry-tv.html (hosted) + industry-tv.html here (local copy)."""
import html, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, *[".."]*6))
SLIDES = ["01-title.html", "02-lineup.html", "03-story.html", "04-host.html"]
DUR = 17000

frames = []
for n, f in enumerate(SLIDES):
    doc = open(os.path.join(HERE, f), encoding="utf-8").read()
    frames.append('  <iframe class="frame%s" scrolling="no" srcdoc="%s"></iframe>' % (" on" if n == 0 else "", html.escape(doc, quote=True)))
dots = "\n".join('    <i class="%s"></i>' % ("on" if n == 0 else "") for n in range(len(SLIDES)))

tpl = open(os.path.join(ROOT, "public", "sprout-tv.html"), encoding="utf-8", newline="").read()
head = tpl[:tpl.index('<div id="deck">')]
tail = tpl[tpl.index('<div id="hint">'):]
head = head.replace("<title>Sprout Society - TV Slides</title>", "<title>Industry - TV Slides</title>")
tail = re.sub(r"DUR=\d+", "DUR=%d" % DUR, tail)
out = head + '<div id="deck">\n' + "\n".join(frames) + '\n</div>\n<div id="prog"></div>\n<div id="dots">\n' + dots + "\n</div>\n" + tail
assert out.count('class="frame') == len(SLIDES) and out.count("<i class=") == len(SLIDES)
for p in (os.path.join(ROOT, "public", "industry-tv.html"), os.path.join(HERE, "industry-tv.html")):
    open(p, "w", encoding="utf-8", newline="").write(out)
    print(p, len(out))
