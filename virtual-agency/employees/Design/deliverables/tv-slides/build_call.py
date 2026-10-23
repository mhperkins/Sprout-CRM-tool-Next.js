"""Build buzzkill-call.html: the Buzzkill NYC co-host slide with two QR codes.

  - "Learn more about Buzzkill"  -> tracked code new-sprout-sign-in-2026-buzzkill-linktree
                                    (-> linktr.ee/buzzkillnyc)
  - Call for submissions          -> tracked code new-sprout-sign-in-2026-call-for-submissions
                                    (-> /submit, which emails the gallery form)

Both are tracked, so scans are counted and destinations can change without a new slide.
The logo art is shown whole (contain), never cropped.
Run: python build_call.py   (needs pillow + qrcode)
"""
import base64, io, urllib.request
from pathlib import Path
from PIL import Image, ImageOps
import qrcode

HERE = Path(__file__).parent
VOL = "Sprout N Tell Vol. 5 x Buzzkill NYC"
TRACK = "https://qr-tracker-gold.vercel.app/track?qr="
QR_SUBMIT = TRACK + "new-sprout-sign-in-2026-call-for-submissions"
QR_LINKTREE = TRACK + "new-sprout-sign-in-2026-buzzkill-linktree"
PHOTO = ("https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/event-portal-files/"
         "evt_sprout_n_tell_sprout_society_x_buzzkill_/program/1792698418502_tamvfr.jpeg")


def b64(im, fmt="JPEG"):
    buf = io.BytesIO()
    im.save(buf, fmt, **({"quality": 85} if fmt == "JPEG" else {}))
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(buf.getvalue()).decode()


def qr(url):
    q = qrcode.QRCode(border=1, box_size=16, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url)
    return b64(q.make_image(fill_color="black", back_color="white").get_image().convert("RGB"), "PNG")


im = ImageOps.exif_transpose(Image.open(io.BytesIO(urllib.request.urlopen(PHOTO).read()))).convert("RGB")
im.thumbnail((1000, 1000))
photo = b64(im)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sprout Society: Buzzkill NYC</title>
<!-- ============================================================
     SPROUT SOCIETY TV SLIDE: CO-HOST + CALL FOR SUBMISSIONS
     {VOL} (2026-10-23). Built by build_call.py.
     QRs: new-sprout-sign-in-2026-buzzkill-linktree (Linktree),
          new-sprout-sign-in-2026-call-for-submissions (/submit).
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
  .body{{flex:1; min-height:0; display:grid; grid-template-columns:min(34vw,60vh) minmax(0,1fr); gap:min(2vw,3.5vh);}}
  .host{{display:flex; flex-direction:column; min-height:0;}}
  .art{{flex:1 1 0; min-height:0; display:flex; align-items:flex-start; justify-content:flex-start;}}
  .art img{{width:100%; height:auto; max-height:100%; object-fit:contain; display:block; border-radius:min(1vw,1.8vh);}}
  .host .name{{font-size:min(2.2vw,3.9vh); font-weight:900; margin-top:min(.8vw,1.4vh);}}
  .host .handle{{font-size:min(1.5vw,2.7vh); font-weight:900; color:var(--banana);}}
  .host p{{font-size:min(1.55vw,2.75vh); line-height:1.35; color:#e8e8e4; margin-top:min(.4vw,.7vh);}}
  /* Right side: two QR cards that fill the space beside the logo. */
  .qrs{{display:flex; flex-direction:column; justify-content:stretch; align-items:stretch; gap:min(1.6vw,2.8vh); min-height:0;}}
  .qcard{{flex:1 1 0; min-height:0; display:flex; align-items:center; gap:min(2.4vw,4.2vh); border-radius:min(1.2vw,2.1vh);
         padding:min(2vw,3.5vh);}}
  .qcard img{{width:min(15vw,26.5vh); height:min(15vw,26.5vh); background:#fff; padding:min(.45vw,.8vh);
             border-radius:min(.7vw,1.2vh); flex-shrink:0; display:block;}}
  .qcard .k{{font-size:min(1.2vw,2.1vh); font-weight:900; letter-spacing:.28em; text-transform:uppercase;}}
  .qcard .t{{font-size:min(2.7vw,4.8vh); font-weight:900; line-height:1.12; margin-top:min(.4vw,.7vh);}}
  .qcard .s{{font-size:min(1.55vw,2.75vh); font-weight:700; line-height:1.3; margin-top:min(.5vw,.9vh);}}
  .learn{{background:#1a1616; border:2px solid #3a3333; color:#fff;}}
  .learn .k{{color:var(--cyan);}}
  .submit{{background:var(--banana); color:var(--ink);}}
  .submit .k{{color:var(--fuchsia);}}
</style>
</head>
<body>
<div class="slide">
  <div class="eyebrow">{VOL}</div>
  <h2>Co-hosted by Buzzkill NYC</h2>
  <div class="rule"></div>
  <div class="body">
    <div class="host">
      <div class="art"><img src="{photo}" alt="Buzzkill NYC" /></div>
      <div class="name">Buzzkill NYC <span class="handle">@buzzkillnyc</span></div>
      <p>Free and low-cost art gatherings and workshops for the sober and sober-curious community.</p>
    </div>
    <div class="qrs">
      <div class="qcard learn">
        <img src="{qr(QR_LINKTREE)}" alt="QR code to Buzzkill NYC's links" />
        <div>
          <div class="k">Buzzkill NYC</div>
          <div class="t">Learn more about Buzzkill</div>
        </div>
      </div>
      <div class="qcard submit">
        <img src="{qr(QR_SUBMIT)}" alt="QR code to the submission sign-up" />
        <div>
          <div class="k">Call for submissions</div>
          <div class="t">Submit your work to showcase in future Buzzkill x Sprout Society shows.</div>
          <div class="s">Scan, leave your email, and we'll send you the form.</div>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
"""
(HERE / "buzzkill-call.html").write_text(html, encoding="utf-8", newline="\n")
print("buzzkill-call.html", len(html))
