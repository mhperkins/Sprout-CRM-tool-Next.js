"""Build the TV lineup slides for one Sprout N Tell night.

Edit VOL and SLIDES below, then run:  python build_lineup.py
It downloads each photo, fixes rotation, converts HEIC, shrinks to 720px,
embeds it as base64, and writes lineup-1..N.html next to this file.
The page shell (styles, program QR, bio auto-fit script) is copied from
lineup-1-artists.html so every volume keeps the same structure.
Then re-embed the files into public/sprout-tv.html (see README).
"""
import base64, html, io, re, urllib.request
from pathlib import Path
from PIL import Image, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()
HERE = Path(__file__).parent
VOL = "Sprout N Tell Vol. 5 x Buzzkill NYC"

# Bios are trimmed for reading across the room; full bios live in the program.
SLIDES = [
    ("lineup-1-artists.html", "Tonight's Artists", "a-fuchsia", [
        ("Tristan Baker", "@goldenlemongoblin", "center 30%", "1792517233010_m4hlut.jpg",
         "Tristan is a multidisciplinary artist residing in Brooklyn, NY. Growing up in the deep south as a visibly queer child, their art explores the beauty and strength of existing queerly in unexpected places."),
        ("Arina Andrle", "@fishsodapop", "center 30%", "1792531037183_rjuxxl.jpg",
         "I've taught myself how to draw since I was a little kid. I've always been passionate about artwork and I love drawing portraits."),
        ("Liv Tyler", "@livtyart", "center 30%", "1792584359212_iurwar.jpg",
         "Liv Tyler is an artist and designer based in NYC. They are an abstract intuitive painter and transform memory and emotion into paintings."),
    ]),
    ("lineup-2-artists.html", "Tonight's Artists", "a-fuchsia", [
        ("Pepper Auerbach", "@iwasateenagepepper", "center 30%", "1792602464009_q6bw5m.heic",
         "Pieces tonight: “Blessed (with) Memories”, “Spirit in the Sky”, “NightVisionary” and “MY BRAIN ITCHES!”"),
        ("Stephanie (Izile) Wade", "@wadesinpaint", "center 30%", "1792605165547_hr7cxh.jpg",
         "Raised in the woods of the rural South, but moved to Brooklyn 20 years ago chasing her phoenix from ashes. Exploring various media including acrylic, watercolor, and oil, always with a mind towards the playful and fantastical."),
        ("Glenn Dungan", "@whereisglennnow", "center 30%", "1792605685346_1os51y.jpg",
         "Glenn Dungan is a 3D artist and writer based in Brooklyn, NYC. His work explores the architecture of dreams: the impossible spaces our minds construct while we sleep and the hidden logic that makes them feel real."),
    ]),
    ("lineup-3-artists.html", "Tonight's Artists", "a-fuchsia", [
        ("Emily De Lima", "@emily.delima", "center 30%", "1792689431587_rmempr.jpg",
         "I am a Brazilian-American artist and designer based in Queens, NYC, working across various mediums. My work draws from mythology, folklore, science, and literature to explore questions of origin, identity, healing, and the ways people make meaning of the world."),
        ("Max Sibner", "@adventureskept", "center 30%", "1792767143082_s6fqua.jpeg",
         "I like to capture images of everyday moments around the world, and bring a kind of empathetic curiosity to seemingly mundane scenes!"),
    ]),
    ("lineup-4-music.html", "Tonight's Music", "a-cyan", [
        ("Andie Mechanic", "@andiemechanic.music", "center 30%", "1792534210097_opcnzo.jpeg",
         "Drawing inspiration from the great singer-songwriters of the 1960s while embracing a contemporary voice, Andie Mechanic creates genre-blending pop music that explores the beauty, absurdity, and vulnerability of being human."),
        ("Isabella Paris", "@isabellaparismusic", "center 30%", "1792638990834_6uv9p8.png",
         "Isabella Paris is a folk singer-songwriter who writes story-driven, lyric-heavy music that addresses life’s hardships. She is fueled by imagery and detail-oriented visuals to bring her story to life."),
    ]),
    ("lineup-5-music.html", "Tonight's Music", "a-cyan", [
        ("Sean Jeffers", "@seanrjeffers", "center 30%", "evt_mrkzhez3qdj3/program/1789084169852_oo30y5.jpeg",
         "Once described by Steve Earle as “Almost like musical theater – except that I like it”, Sean Jeffers’ style is built upon character driven songs with singer-songwriter aesthetics."),
        ("Liara Neja", "@liara_neja", "center 30%", "1792700463469_6rfnzf.jpeg",
         "Liara Neja is a Bronx born singer-songwriter blending folk-inspired guitar with soulful vocals. Currently a student at the Brooklyn College Conservatory of Music, she’s been crafting her songwriting voice since middle school."),
    ]),
    # "Something else" submissions show as vendors.
    ("lineup-6-vendors.html", "Tonight's Vendors", "a-banana", [
        ("Buzzkill NYC", "@buzzkillnyc", "center", "1792698418502_tamvfr.jpeg",
         "This shindig is co-hosted by Buzzkill NYC! We organize free and low-cost art gatherings and workshops for people in the sober / sober-curious community."),
        ("Jillian Howery", "@terrafinajewelry", "center", None,
         "Handmade tiny terrarium earrings!"),
    ]),
]

BASE = "https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/event-portal-files/"
EVENT = "evt_sprout_n_tell_sprout_society_x_buzzkill_/program/"


def photo(src):
    url = BASE + (src if "/" in src else EVENT + src)
    raw = urllib.request.urlopen(url).read()
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    im.thumbnail((720, 720))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=82)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def card(name, handle, pos, src, bio):
    e = lambda s: html.escape(s, quote=True)
    if src:
        pic = f'<img src="{photo(src)}" alt="{e(name)}" style="object-position:{pos};" />'
    else:
        initials = "".join(w[0] for w in name.split()[:2]).upper()
        pic = f'<div class="ph">{e(initials)}</div>'
    return f"""      <div class="card">
        <div class="left">
          {pic}
          <div class="name">{e(name)}</div>
          <div class="handle hl">{e(handle)}</div>
        </div>
        <p class="bio">{e(bio)}</p>
      </div>
"""


EXTRA_CSS = """  .a-banana .eyebrow, .a-banana .hl{color:var(--banana);}
  .a-banana .rule{background:var(--banana);}
  .left .ph{flex:1 1 0; min-height:0; width:100%; border-radius:min(1vw,1.8vh); background:#222;
            display:flex; align-items:center; justify-content:center;
            font-size:min(6vw,10vh); font-weight:900; color:var(--banana);}
"""

template = (HERE / "lineup-1-artists.html").read_text(encoding="utf-8")
head, rest = template.split('    <div class="cards">\n', 1)
tail = rest[rest.index("  </div>\n</div>\n\n<script>"):]

for fname, title, accent, acts in SLIDES:
    h = re.sub(r'<div class="slide dark a-\w+">', f'<div class="slide dark {accent}">', head)
    h = re.sub(r'<div class="eyebrow">[^<]*</div>', f'<div class="eyebrow">{VOL}</div>', h)
    h = re.sub(r"<h2>[^<]*</h2>", f"<h2>{html.escape(title, quote=True)}</h2>", h)
    h = re.sub(r"<title>[^<]*</title>", f"<title>Sprout Society: {html.escape(title, quote=True)}</title>", h)
    h = re.sub(r"Sprout N Tell Vol\. \d+ \([0-9-]+\)", f"{VOL} (2026-10-23)", h)
    if ".left .ph" not in h:
        h = h.replace("</style>", EXTRA_CSS + "</style>", 1)
    body = "".join(card(*a) for a in acts)
    out = h + '    <div class="cards">\n' + body + "    </div>\n" + tail
    (HERE / fname).write_text(out, encoding="utf-8", newline="\n")
    print(fname, len(out))
