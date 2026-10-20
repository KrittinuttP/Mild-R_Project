"""
Invisible watermark for the cafe KV cutout (and any image the team publishes).

  python3 scripts/kv-watermark.py embed  <original> <output.webp> [--height 1440] [--code MHC-KV26]
  python3 scripts/kv-watermark.py verify <suspect-image> [--size 453x1440] [--code MHC-KV26]

How it works: the image is split into 16x16 blocks. In every block two
low-mid-frequency DCT coefficients of the brightness channel are nudged so
that they carry one bit of the code (quantisation index modulation). The 64-bit
code repeats across all blocks, and `verify` takes a majority vote, so a
copy that was recompressed, resized (it is scaled back first) or pasted on
a background still reads. Cropping shifts the block grid, so a cropped copy
usually does not read. Flat areas (skin, plain fabric) are left untouched,
since a mark there shows as a faint grid. Measured on the KV: PSNR about
48 dB, no pixel moves more than 7 levels out of 255, so the picture looks
the same. Needs only
numpy and Pillow. Keep KEY, BLOCK, STEP and COEFS unchanged once images are
published, or old copies stop reading.
"""

import argparse
import sys

import numpy as np
from PIL import Image

BLOCK = 16
STEP = 30.0  # quantisation step: larger survives more, smaller changes less
COEFS = ((1, 2), (2, 1))  # low-mid frequency: survives JPEG and halving, invisible to the eye
TEXTURE = 12.0  # skip blocks smoother than this (brightness std): marks would show on flat skin
MATCH = 10  # at most this many of 64 bits may differ; an unmarked image misses about 32
KEY = 0x6D696C64  # seeds the per-block offsets; keep it with the script
COPYRIGHT = "Mild HoneyComb fan project - cafe key visual. Reuse not permitted."


def dct_matrix(n=BLOCK):
    m = np.zeros((n, n))
    for k in range(n):
        for i in range(n):
            m[k, i] = np.cos(np.pi * (2 * i + 1) * k / (2 * n))
    m[0] *= np.sqrt(1 / n)
    m[1:] *= np.sqrt(2 / n)
    return m


D = dct_matrix()


def code_bits(code: str):
    data = code.encode("ascii")[:8].ljust(8, b"\0")
    return [(byte >> (7 - b)) & 1 for byte in data for b in range(8)]


def bits_to_code(bits):
    out = bytearray()
    for i in range(0, 64, 8):
        out.append(int("".join(str(b) for b in bits[i : i + 8]), 2))
    return out.rstrip(b"\0").decode("ascii", "replace")


def to_ycbcr(rgb):
    rgb = rgb.astype(np.float64)
    y = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    return y, rgb - y[..., None]


def blocks(h, w):
    for by in range(0, h - BLOCK + 1, BLOCK):
        for bx in range(0, w - BLOCK + 1, BLOCK):
            yield by, bx


def offsets(count):
    """A keyed random shift per block and coefficient. Without it, flat areas
    (a copy pasted on a plain background) would all read as 0."""
    return np.random.default_rng(KEY).uniform(0, STEP, size=(count, len(COEFS)))


def solid(alpha, by, bx):
    return alpha is None or alpha[by : by + BLOCK, bx : bx + BLOCK].min() == 255


def embed(src, dst, height, code):
    im = Image.open(src).convert("RGBA")
    if height and im.height != height:
        width = round(im.width * height / im.height)
        im = im.resize((width, height), Image.LANCZOS)
    arr = np.asarray(im)
    y, chroma = to_ycbcr(arr[..., :3])
    bits = code_bits(code)
    grid = list(blocks(*y.shape))
    shift = offsets(len(grid))
    for index, (by, bx) in enumerate(grid):
        tile = y[by : by + BLOCK, bx : bx + BLOCK]
        # Flat or see-through blocks stay untouched; their keyed offsets make
        # them vote at random, so they only add noise, never a wrong bias.
        if tile.std() < TEXTURE or not solid(arr[..., 3], by, bx):
            continue
        block = D @ tile @ D.T
        bit = bits[index % 64]
        for k, coef in enumerate(COEFS):
            c = block[coef] - shift[index, k]
            q = np.round(c / STEP)
            if int(q) % 2 != bit:
                q += 1 if c >= q * STEP else -1
            block[coef] = q * STEP + shift[index, k]
        y[by : by + BLOCK, bx : bx + BLOCK] = D.T @ block @ D
    rgb = np.clip(np.round(y[..., None] + chroma), 0, 255).astype(np.uint8)
    out = Image.fromarray(np.dstack([rgb, arr[..., 3]]), "RGBA")
    exif = Image.Exif()
    exif[0x8298] = COPYRIGHT  # Copyright
    exif[0x010E] = "Mild-R: Sherlock Sweetie - cafe key visual"  # ImageDescription
    out.save(dst, "WEBP", quality=92, method=6, exif=exif.tobytes())

    before = np.asarray(im)[..., :3].astype(np.float64)
    after = np.asarray(Image.open(dst).convert("RGBA"))[..., :3].astype(np.float64)
    opaque = np.asarray(im)[..., 3] > 0
    mse_mark = np.mean((before[opaque] - rgb.astype(np.float64)[opaque]) ** 2)
    psnr = 10 * np.log10(255**2 / mse_mark) if mse_mark else float("inf")
    print(f"saved {dst} {out.width}x{out.height}")
    print(f"watermark only, visible pixels: PSNR {psnr:.1f} dB, max change {np.abs(before - rgb)[opaque].max():.0f}/255")
    mse_file = np.mean((before[opaque] - after[opaque]) ** 2)
    print(f"final file vs resized original (incl. WebP): PSNR {10 * np.log10(255**2 / mse_file):.1f} dB")


def read_bits(img, size):
    im = Image.open(img) if isinstance(img, str) else img
    if size and im.size != size:
        im = im.convert("RGBA").resize(size, Image.LANCZOS)
    # A copy that kept its transparency: read only the solid blocks.
    alpha = np.asarray(im.convert("RGBA"))[..., 3] if "A" in im.getbands() else None
    y, _ = to_ycbcr(np.asarray(im.convert("RGB")))
    grid = list(blocks(*y.shape))
    shift = offsets(len(grid))
    votes = np.zeros((64, 2))
    for index, (by, bx) in enumerate(grid):
        if not solid(alpha, by, bx):
            continue
        block = D @ y[by : by + BLOCK, bx : bx + BLOCK] @ D.T
        for k, coef in enumerate(COEFS):
            votes[index % 64, int(np.round((block[coef] - shift[index, k]) / STEP)) % 2] += 1
    bits = [int(v[1] > v[0]) for v in votes]
    margin = float(np.mean(np.abs(votes[:, 1] - votes[:, 0]) / votes.sum(axis=1)))
    return bits, margin


def verify(img, size, code):
    bits, margin = read_bits(img, size)
    want = code_bits(code)
    wrong = sum(a != b for a, b in zip(bits, want))
    verdict = "MATCH" if wrong <= MATCH else "no match"
    print(f"{verdict} · read {bits_to_code(bits)!r} · wrong bits {wrong}/64 · vote margin {margin:.2f}")
    return wrong


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["embed", "verify"])
    p.add_argument("src")
    p.add_argument("dst", nargs="?")
    p.add_argument("--height", type=int, default=1440)
    p.add_argument("--size", default=None, help="original WxH, to scale a resized copy back")
    p.add_argument("--code", default="MHC-KV26")
    a = p.parse_args()
    if a.cmd == "embed":
        embed(a.src, a.dst, a.height, a.code)
    else:
        size = tuple(int(v) for v in a.size.split("x")) if a.size else None
        sys.exit(0 if verify(a.src, size, a.code) <= MATCH else 1)
