"""Priprema Flow video za hero sekciju (premotavanje skrolom).

Upotreba:
    pip install imageio-ffmpeg
    python scripts/prepare_hero_video.py <flow-video.mp4>

Napravi:
    public/video/hero.mp4         1920px, svaki frejm je ključni (glatko premotavanje unazad i naprijed)
    public/video/hero-mobile.mp4  960px verzija za mobitele
    public/video/hero-poster.jpg  prvi frejm
Zvuk se uklanja jer se video ne reproducira, nego premotava.
"""
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "video"


def run(args):
    print(" ".join(str(a) for a in args[1:]))
    subprocess.run(args, check=True)


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    src = Path(sys.argv[1])
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    OUT.mkdir(parents=True, exist_ok=True)
    common = ["-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow",
              "-g", "1", "-keyint_min", "1", "-sc_threshold", "0", "-movflags", "+faststart"]
    run([ff, "-y", "-i", src, "-vf", "scale=1920:-2", "-crf", "24", *common, OUT / "hero.mp4"])
    run([ff, "-y", "-i", src, "-vf", "scale=960:-2", "-crf", "27", *common, OUT / "hero-mobile.mp4"])
    run([ff, "-y", "-i", src, "-frames:v", "1", "-q:v", "3", OUT / "hero-poster.jpg"])
    for f in sorted(OUT.iterdir()):
        print(f"{f.name}: {f.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
