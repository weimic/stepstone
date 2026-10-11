"""Convert a few CC0 Kenney clips to small mono WAVs in src/assets/sfx/.

WAV decodes everywhere (Safari included), and at 22 kHz mono these clips are
about 10 KB each. Sources (both CC0, www.kenney.nl):
  Impact Sounds 1.0     -> knock-*.wav (impactWood_light)
  Interface Sounds 1.0  -> bubble-*.wav (drop)

    pip install soundfile
    python scripts/build_sfx.py
"""

from __future__ import annotations

import urllib.request
import zipfile

import numpy as np
import soundfile as sf

from common import CACHE, ROOT

PACKS = {
    "kenney_impact-sounds": "https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip",
    "kenney_interface-sounds": "https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip",
}
CLIPS = {
    "knock-1": ("kenney_impact-sounds", "impactWood_light_000.ogg", 0.8),
    "knock-2": ("kenney_impact-sounds", "impactWood_light_002.ogg", 0.8),
    "knock-3": ("kenney_impact-sounds", "impactWood_light_004.ogg", 0.8),
    "bubble-1": ("kenney_interface-sounds", "drop_002.ogg", 0.7),
    "bubble-2": ("kenney_interface-sounds", "drop_003.ogg", 0.7),
}
OUT = ROOT / "src" / "assets" / "sfx"
RATE = 22050


def pack_dir(name: str):
    d = CACHE / "sfx" / name
    if not d.exists():
        z = CACHE / "sfx" / f"{name}.zip"
        z.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(PACKS[name], z)
        zipfile.ZipFile(z).extractall(d)
    return d


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for out, (pack, file, gain) in CLIPS.items():
        audio, rate = sf.read(pack_dir(pack) / "Audio" / file, dtype="float32", always_2d=True)
        mono = audio.mean(axis=1)
        if rate == 2 * RATE:
            mono = mono[: len(mono) // 2 * 2].reshape(-1, 2).mean(axis=1)
        else:
            assert rate == RATE, f"unexpected sample rate {rate}"
        loud = np.flatnonzero(np.abs(mono) > 0.003 * np.abs(mono).max())
        mono = mono[loud[0] : loud[-1] + 1]
        fade = min(len(mono), int(0.02 * RATE))
        mono[-fade:] *= np.linspace(1, 0, fade)
        mono *= gain / max(1e-6, np.abs(mono).max())
        path = OUT / f"{out}.wav"
        sf.write(path, mono, RATE, subtype="PCM_16")
        total += path.stat().st_size
        print(f"{path.name}: {len(mono) / RATE:.2f}s, {path.stat().st_size / 1024:.1f} KB")
    print(f"total {total / 1024:.1f} KB")


if __name__ == "__main__":
    main()
