"""Izvlači pitanja iz zvaničnih kataloga MUP/MON KS u public/data/questions.json.

Upotreba:
    python scripts/extract_questions.py <oblast1.pdf> <oblast2.pdf> <oblast3.pdf> <oblast4.pdf>

Oblast I   - teorija (propisi), svako pitanje ima oznaku kategorija (A,B,C,D,T)
Oblast II  - saobraćajni znakovi (sa slikom)
Oblast III - raskrsnice (sa slikom)
Oblast IV  - prva pomoć (tabela, tačan odgovor je podebljan)

Slike se spremaju kao WebP (najviše 900 px širine), a širina i visina se upisuju u JSON.
Potrebno: pip install pymupdf pillow

U Oblastima I-III tačan odgovor je u PDF-u označen iscrtanim "X" preko broja odgovora.
"""
import io
import json
import re
import sys
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "public" / "data" / "questions.json"
IMG_DIR = ROOT / "public" / "img" / "pitanja"
ALL_CATS = ["A", "B", "C", "D", "T"]
MULTI_RE = re.compile(r"\(?\s*više\s+tačnih\s+odgovora\s*\)?", re.I)


def clean(text):
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([;,.?:])", r"\1", text)
    return text


def strip_answer_end(text):
    return re.sub(r"[;.,]\s*$", "", clean(text)).strip()


def is_bold(span):
    return bool(span["flags"] & 16) or "Bold" in span["font"]


def page_spans(page):
    spans = []
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            for s in line["spans"]:
                t = s["text"].strip()
                if not t:
                    continue
                x0, y0, x1, y1 = s["bbox"]
                spans.append({
                    "text": t, "x": x0, "y": y0, "x1": x1, "y1": y1,
                    "cy": (y0 + y1) / 2, "cx": (x0 + x1) / 2,
                    "bold": is_bold(s), "italic": bool(s["flags"] & 2),
                    "color": s["color"],
                })
    return spans


def x_marks(page):
    """Iscrtano slovo X (dvije dijagonale) preko kućice sa brojem odgovora."""
    marks = []
    for d in page.get_drawings():
        for it in d["items"]:
            if it[0] != "l":
                continue
            a, b = it[1], it[2]
            w, h = abs(a.x - b.x), abs(a.y - b.y)
            if w > 1 and h > 1 and w < 45 and h < 120:
                marks.append(pymupdf.Rect(min(a.x, b.x), min(a.y, b.y), max(a.x, b.x), max(a.y, b.y)))
    return marks


def image_rects(page):
    out = []
    for img in page.get_images(full=True):
        xref = img[0]
        for r in page.get_image_rects(xref):
            if r.width > 10 and r.height > 10:
                out.append((xref, r))
    return out


MAX_IMG_WIDTH = 900


def write_webp(png_or_jpg_bytes, name):
    """Spremi sliku kao WebP; vrati (ime fajla, širina, visina)."""
    img = Image.open(io.BytesIO(png_or_jpg_bytes))
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        img = bg
    else:
        img = img.convert("RGB")
    if img.width > MAX_IMG_WIDTH:
        img = img.resize((MAX_IMG_WIDTH, round(img.height * MAX_IMG_WIDTH / img.width)), Image.LANCZOS)
    path = IMG_DIR / f"{name}.webp"
    img.save(path, "WEBP", quality=80, method=6)
    return path.name, img.width, img.height


def save_image(doc, xref, name):
    info = doc.extract_image(xref)
    if info["ext"] in ("png", "jpeg", "jpg"):
        return write_webp(info["image"], name)
    pix = pymupdf.Pixmap(doc, xref)
    if pix.alpha or pix.n > 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    return write_webp(pix.tobytes("png"), name)


def split_merged_numbers(spans, max_x):
    """'1    niša za ...' u jednom spanu -> broj + tekst."""
    out = []
    for s in spans:
        m = re.fullmatch(r"([1-5])\s{2,}(.+)", s["text"])
        if m and not s["bold"] and s["x"] < max_x:
            num = dict(s, text=m.group(1), x1=s["x"] + 7, cx=s["x"] + 3.5)
            rest = dict(s, text=m.group(2), x=s["x"] + 20)
            out += [num, rest]
        else:
            out.append(s)
    return out


def parse_segment(seg, anchor_x):
    """Vrati listu (broj, tekst, tačan) za odgovore u jednom dijelu pitanja (na jednoj stranici)."""
    spans, marks, img_left = seg["spans"], seg["marks"], seg["img_left"]
    nums = [s for s in spans if not s["bold"] and re.fullmatch(r"[1-5]", s["text"])
            and s["x"] < anchor_x + 25 and s["color"] != 0xFF0000]
    nums.sort(key=lambda s: s["cy"])
    first_cy = nums[0]["cy"] - 6 if nums else 1e9
    texts = [s for s in spans if (not s["bold"] or s["cy"] >= first_cy) and s["color"] != 0xFFFFFF
             and s["color"] != 0xFF0000 and s not in nums and not MULTI_RE.search(s["text"])
             and s["x"] < img_left and not (re.fullmatch(r"\d+", s["text"]) and s["x"] > 450)
             and s["text"] not in (".", ",", ";")]
    out = []
    for i, n in enumerate(nums):
        lo = -1e9 if i == 0 else (nums[i - 1]["cy"] + n["cy"]) / 2
        hi = 1e9 if i + 1 == len(nums) else (n["cy"] + nums[i + 1]["cy"]) / 2
        own = sorted([t for t in texts if lo <= t["cy"] < hi and t["x"] > n["x"] + 5],
                     key=lambda t: (round(t["y"]), t["x"]))
        c = pymupdf.Point(n["cx"], n["cy"])
        ok = any(pymupdf.Rect(m.x0 - 3, m.y0 - 3, m.x1 + 3, m.y1 + 3).contains(c) for m in marks)
        out.append((int(n["text"]), strip_answer_end(" ".join(t["text"] for t in own)), ok))
    return out


def parse_marked_catalog(pdf_path, area, with_images):
    doc = pymupdf.open(pdf_path)
    raw = []  # svako pitanje: anchor + lista segmenata
    for pno, page in enumerate(doc):
        spans = [s for s in page_spans(page) if not (re.fullmatch(r"\d+", s["text"]) and s["x"] > 500 and s["y"] > 690)]
        marks = x_marks(page)
        imgs = image_rects(page) if with_images else []
        anchors = sorted([s for s in spans if s["bold"] and s["color"] == 0xFFFFFF and s["text"].isdigit()],
                         key=lambda s: s["y"])
        spans = split_merged_numbers(spans, 120)
        bounds = [(None, -1e9, anchors[0]["y"] - 8 if anchors else 1e9)]
        for i, a in enumerate(anchors):
            bottom = anchors[i + 1]["y"] - 8 if i + 1 < len(anchors) else 1e9
            bounds.append((a, a["y"] - 8, bottom))
        for a, top, bottom in bounds:
            region = [s for s in spans if top <= s["cy"] < bottom and s is not a]
            if a is None and (not raw or not region):
                continue
            img = [(xref, r) for xref, r in imgs if top - 20 <= (r.y0 + r.y1) / 2 < bottom]
            img_left = min((r.x0 - 2 for _, r in img), default=page.rect.width)
            seg = {"page": pno + 1, "pno": pno, "spans": region, "marks": marks, "img": img, "img_left": img_left}
            if a is None:
                raw[-1]["segs"].append(seg)
            else:
                raw.append({"anchor": a, "segs": [seg]})

    questions, problems = [], []
    for r in raw:
        a = r["anchor"]
        num = int(a["text"])
        qid = f"{area}-{num}"
        all_spans = [s for seg in r["segs"] for s in seg["spans"]]
        img_left = min(seg["img_left"] for seg in r["segs"])
        q_text = ""
        for seg in r["segs"]:
            seg_nums = [s for s in seg["spans"] if not s["bold"] and re.fullmatch(r"[1-5]", s["text"])
                        and s["x"] < a["x"] + 25]
            q_limit = min((s["cy"] for s in seg_nums), default=1e9) - 6
            q_parts = [s for s in seg["spans"] if s["bold"] and s["color"] != 0xFFFFFF
                       and s["x"] < img_left and (s["cy"] < q_limit or MULTI_RE.search(s["text"]))]
            q_text += " " + " ".join(s["text"] for s in sorted(q_parts, key=lambda s: (round(s["y"]), s["x"])))
        q_text = clean(q_text)
        multi = bool(MULTI_RE.search(q_text))
        q_text = clean(MULTI_RE.sub("", q_text))
        cats_text = " ".join(s["text"] for s in all_spans if s["color"] == 0xFF0000)
        cats = re.findall(r"[ABCDT]", cats_text) or list(ALL_CATS)
        answers = []
        for seg in r["segs"]:
            answers += parse_segment(seg, a["x"])
        options = [t for _, t, _ in answers]
        correct = [i for i, (_, _, ok) in enumerate(answers) if ok]
        item = {"id": qid, "area": area, "n": num, "q": q_text, "a": options,
                "c": correct, "multi": multi or len(correct) > 1, "cats": cats}
        seg = next((seg for seg in r["segs"] if seg["img"]), None)
        if seg and len(seg["img"]) == 1 and seg["img"][0][1].width > 40:
            item["img"], item["w"], item["h"] = save_image(doc, seg["img"][0][0], qid)
        elif seg:
            # više manjih slika (npr. dvije table) -> izreži cijelo područje
            clip = pymupdf.Rect(seg["img"][0][1])
            for _, rr in seg["img"][1:]:
                clip |= rr
            png = doc[seg["pno"]].get_pixmap(dpi=200, clip=clip).tobytes("png")
            item["img"], item["w"], item["h"] = write_webp(png, qid)
        elif with_images:
            problems.append(f"{qid}: nema slike")
        nums_seq = [n for n, _, _ in answers]
        if (len(options) < 2 or not correct or any(not o for o in options) or not q_text
                or len(nums_seq) != len(set(nums_seq)) and nums_seq != [1, 2, 2]):
            problems.append(f"{qid} (str. {r['segs'][0]['page']}): brojevi={nums_seq} tačnih={correct} prazni={[i for i,o in enumerate(options) if not o]}")
        questions.append(item)
    return questions, problems


def parse_first_aid(pdf_path):
    """Tabela: R.BR | PITANJE | slovo | ODGOVOR. Tačan odgovor je podebljan.
    Pitanje može preći na sljedeću stranicu, pa se slova A/B/C prate redom kroz cijeli dokument."""
    doc = pymupdf.open(pdf_path)
    numbers, letters, q_spans, a_spans = [], [], [], []
    for pno, page in enumerate(doc):
        for s in page_spans(page):
            s["page"] = pno
            if s["text"] in ("R.", "BR.", "PITANJE", "PONUĐENI ODGOVOR"):
                continue
            if s["x"] < 100 and s["text"].isdigit():
                numbers.append(s)
            elif 280 <= s["x"] < 305 and re.fullmatch(r"[ABC]", s["text"]):
                letters.append(s)
            elif 100 <= s["x"] < 285:
                q_spans.append(s)
            elif s["x"] >= 305:
                a_spans.append(s)
    key = lambda s: (s["page"], s["cy"])
    numbers.sort(key=key)
    letters.sort(key=key)

    groups = []
    for L in letters:
        if L["text"] == "A" or not groups:
            groups.append([])
        groups[-1].append(L)

    questions, problems = [], []
    if len(groups) != len(numbers):
        problems.append(f"prva pomoć: {len(numbers)} brojeva, {len(groups)} grupa odgovora")
    for num_span, group in zip(numbers, groups):
        num = int(num_span["text"])
        own_q = [s for s in q_spans
                 if min((l for l in letters if l["page"] == s["page"]), key=lambda l: abs(l["cy"] - s["cy"])) in group]
        q_text = clean(" ".join(s["text"] for s in sorted(own_q, key=lambda s: (round(s["y"]), s["x"]))))
        options, correct = [], []
        for i, L in enumerate(group):
            page_letters = [l for l in letters if l["page"] == L["page"]]
            own = [s for s in a_spans if s["page"] == L["page"]
                   and min(page_letters, key=lambda l: abs(l["cy"] - s["cy"])) is L]
            own.sort(key=lambda s: (round(s["y"]), s["x"]))
            options.append(strip_answer_end(" ".join(s["text"] for s in own)))
            if L["bold"] or (own and all(s["bold"] for s in own)):
                correct.append(i)
        item = {"id": f"pp-{num}", "area": "pp", "n": num, "q": q_text, "a": options,
                "c": correct, "multi": len(correct) > 1, "cats": list(ALL_CATS)}
        if len(options) < 2 or len(correct) != 1 or not q_text or any(not o for o in options):
            problems.append(f"pp-{num} (str. {num_span['page'] + 1}): odgovora={len(options)} tačnih={correct}")
        questions.append(item)
    return questions, problems


def main():
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    data, problems = {}, []
    for key, path, imgs in [("teorija", sys.argv[1], False), ("znakovi", sys.argv[2], True), ("raskrsnice", sys.argv[3], True)]:
        area = {"teorija": "t", "znakovi": "z", "raskrsnice": "r"}[key]
        qs, pr = parse_marked_catalog(path, area, imgs)
        data[key] = qs
        problems += pr
    qs, pr = parse_first_aid(sys.argv[4])
    data["prvaPomoc"] = qs
    problems += pr
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    counts = {k: len(v) for k, v in data.items()}
    counts["total"] = sum(counts.values())
    (OUT_JSON.parent / "meta.json").write_text(json.dumps({"counts": counts}), encoding="utf-8")
    for k, v in data.items():
        print(f"{k}: {len(v)} pitanja")
    print(f"Problema: {len(problems)}")
    for p in problems:
        print("  -", p)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
