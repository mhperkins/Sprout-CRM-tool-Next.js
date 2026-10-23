"""Build buzzkill-call.html: the Buzzkill NYC co-host slide that doubles as the
call for submissions. The QR is the tracked code
new-sprout-sign-in-2026-call-for-submissions (-> /submit), so scans are counted
and the destination can be repointed later without reprinting the deck.
Run: python build_call.py   (needs pillow + qrcode)
"""
import base64, io, urllib.request
from pathlib import Path
from PIL import Image, ImageOps
import qrcode

HERE = Path(__file__).parent
VOL = "Sprout N Tell Vol. 5 x Buzzkill NYC"
QR_URL = "https://qr-tracker-gold.vercel.app/track?qr=new-sprout-sign-in-2026-call-for-submissions"
PHOTO = ("https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/event-portal-files/"
         "evt_sprout_n_tell_sprout_society_x_buzzkill_/program/1792698418502_tamvfr.jpeg")


def b64(im, fmt="JPEG"):
    buf = io.BytesIO()
    im.save(buf, fmt, **({"quality": 85} if fmt == "JPEG" else {}))
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(buf.getvalue()).decode()


im = ImageOps.exif_transpose(Image.open(io.BytesIO(urllib.request.urlopen(PHOTO).read()))).convert("RGB")
im.thumbnail((900, 900))
photo = b64(im)
q = qrcode.QRCode(border=1, box_size=16, error_correction=qrcode.constants.ERROR_CORRECT_M)
q.add_data(QR_URL)
qr = b64(q.make_image(fill_color="black", back_color="white").get_image().convert("RGB"), "PNG")

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sprout Society: Buzzkill NYC + Call for submissions</title>
<!-- ============================================================
     SPROUT SOCIETY TV SLIDE: CO-HOST + CALL FOR SUBMISSIONS
     {VOL} (2026-10-23). Built by build_call.py. QR -> tracked code
     new-sprout-sign-in-2026-call-for-submissions -> /submit
     (sign-ups land in sprout_submission_list).
     ============================================================ -->
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
<style>
  :root{{--ink:#030000; --acid:#C6C902; --banana:#FAD100; --fuchsia:#E10098; --cyan:#73C4D6;}}
  *{{box-sizing:border-box; margin:0; padding:0;}}
  html,body{{height:100%; overflow:hidden;}}
  body{{font-family:'Lato',-apple-system,Segoe UI,Roboto,sans-serif; background:var(--ink); color:#fff;}}
  .slide{{position:absolute; inset:0; display:flex; flex-direction:column;
         padding:min(2.6vw,4.2vh) min(5vw,8vh);}}
  .eyebrow{{font-size:min(1.1vw,2vh); font-weight:900; letter-spacing:.35em; text-transform:uppercase; color:var(--banana); margin-bottom:min(.5vw,.9vh);}}
  h2{{font-size:min(3vw,5.3vh); font-weight:900; line-height:1.05;}}
  .rule{{height:min(.4vw,.7vh); width:min(8vw,14vh); border-radius:.3vw; background:var(--banana); margin:min(.9vw,1.6vh) 0 min(1.6vw,2.8vh); flex-shrink:0;}}
  .body{{flex:1; min-height:0; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.15fr); gap:min(4vw,7vh);}}
  .host{{display:flex; flex-direction:column; min-height:0;}}
  .host img{{flex:1 1 0; min-height:0; width:100%; object-fit:cover; border-radius:min(1vw,1.8vh); display:block;}}
  .host .name{{font-size:min(2.2vw,3.9vh); font-weight:900; margin-top:min(.8vw,1.4vh);}}
  .host .handle{{font-size:min(1.5vw,2.7vh); font-weight:900; color:var(--banana);}}
  .host p{{font-size:min(1.55vw,2.75vh); line-height:1.35; color:#e8e8e4; margin-top:min(.6vw,1vh);}}
  .call{{background:var(--banana); color:var(--ink); border-radius:min(1.4vw,2.4vh);
        padding:min(2.4vw,4.2vh); display:flex; flex-direction:column; justify-content:space-between; min-height:0;}}
  .call .k{{font-size:min(1.2vw,2.1vh); font-weight:900; letter-spacing:.3em; text-transform:uppercase; color:var(--fuchsia);}}
  .call h3{{font-size:min(3.6vw,6.4vh); font-weight:900; line-height:1.02; margin-top:min(.6vw,1vh); letter-spacing:-.01em;}}
  .scan{{display:flex; align-items:center; gap:min(2vw,3.5vh); min-height:0;}}
  .scan img{{width:min(15vw,26.5vh); height:min(15vw,26.5vh); background:#fff; padding:min(.6vw,1vh); border-radius:min(.9vw,1.6vh); flex-shrink:0;}}
  .scan p{{font-size:min(2vw,3.6vh); font-weight:900; line-height:1.2;}}
</style>
</head>
<body>
<div class="slide">
  <div class="eyebrow">{VOL}</div>
  <h2>Co-hosted by Buzzkill NYC</h2>
  <div class="rule"></div>
  <div class="body">
    <div class="host">
      <img src="{photo}" alt="Buzzkill NYC" style="object-position:center;" />
      <div class="name">Buzzkill NYC <span class="handle">@buzzkillnyc</span></div>
      <p>Free and low-cost art gatherings and workshops for the sober and sober-curious community.</p>
    </div>
    <div class="call">
      <div>
        <div class="k">Call for submissions</div>
        <h3>Artists and musicians: show your work at Sprout N Tell.</h3>
      </div>
      <div class="scan">
        <img src="{qr}" alt="QR code to the submission sign-up" />
        <p>Scan, leave your email, and we'll send you the submission form.</p>
      </div>
    </div>
  </div>
</div>
</body>
</html>
"""
(HERE / "buzzkill-call.html").write_text(html, encoding="utf-8", newline="\n")
print("buzzkill-call.html", len(html))
