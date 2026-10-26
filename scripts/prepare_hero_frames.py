"""Pretvara hero video u niz WebP kadrova za glatko premotavanje skrolom (canvas).

Upotreba:
    pip install imageio-ffmpeg
    python scripts/prepare_hero_frames.py <video.mp4>

Napravi:
    public/hero-frames/d/001.webp ...   svi kadrovi, 1280 px (desktop)
    public/hero-frames/m/001.webp ...   svaki drugi kadar, 960 px (telefon)
    public/img/hero-start.webp          kadar od kojeg animacija počinje (data-start, zadano 25 %)

Broj kadrova upišite u index.html na <canvas class="hero-canvas"> (data-frames, data-frames-mobile).
Statičnu sliku za telefon i OG sliku pravi stranica sama (vidi README, „Hero animacija“).
"""
import shutil
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "hero-frames"


def run(args):
    subprocess.run([str(a) for a in args], check=True)


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    src = Path(sys.argv[1])
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "d").mkdir(parents=True)
    (OUT / "m").mkdir(parents=True)
    common = ["-hide_banner", "-loglevel", "error", "-y", "-i", src, "-an", "-c:v", "libwebp", "-compression_level", "6"]
    run([ff, *common, "-vf", "scale=1280:-2", "-quality", "72", OUT / "d" / "%03d.webp"])
    run([ff, *common, "-vf", "fps=12,scale=960:-2", "-quality", "68", OUT / "m" / "%03d.webp"])
    frames = sorted((OUT / "d").glob("*.webp"))
    shutil.copy(frames[round(0.25 * (len(frames) - 1))], ROOT / "public" / "img" / "hero-start.webp")
    for folder in ("d", "m"):
        files = sorted((OUT / folder).glob("*.webp"))
        size = sum(f.stat().st_size for f in files) / 1e6
        print(f"{folder}: {len(files)} kadrova, {size:.1f} MB")


if __name__ == "__main__":
    main()
