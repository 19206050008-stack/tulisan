#!/usr/bin/env python3
"""Konversi rekaman mentah ke format dataset VITS: WAV mono 22050 Hz 16-bit.

Pemakaian:
    python prepare_audio.py --input rekaman_mentah/ --output dataset/wavs/

Mendukung input .wav/.mp3/.m4a/.flac (butuh ffmpeg terpasang). File output
dinomori 0001.wav, 0002.wav, ... sesuai urutan nama file input.

Catatan: skrip ini TIDAK membuat transkrip. Buat metadata.csv sendiri
(lihat metadata_example.csv) agar transkrip persis sesuai ucapan.
"""
import argparse
import os
import subprocess
import sys

EXTS = (".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="folder rekaman mentah")
    ap.add_argument("--output", required=True, help="folder output wavs/")
    ap.add_argument("--start", type=int, default=1, help="nomor awal")
    args = ap.parse_args()

    if not os.path.isdir(args.input):
        print(f"Folder input tidak ada: {args.input}", file=sys.stderr)
        sys.exit(1)
    os.makedirs(args.output, exist_ok=True)

    files = sorted(f for f in os.listdir(args.input) if f.lower().endswith(EXTS))
    if not files:
        print("Tidak ada file audio yang ditemukan.", file=sys.stderr)
        sys.exit(1)

    idx = args.start
    for f in files:
        src = os.path.join(args.input, f)
        dst = os.path.join(args.output, f"{idx:04d}.wav")
        cmd = [
            "ffmpeg", "-y", "-i", src,
            "-ac", "1",          # mono
            "-ar", "22050",      # 22.05 kHz
            "-sample_fmt", "s16",  # 16-bit PCM
            dst,
        ]
        print(f"{f} -> {os.path.basename(dst)}")
        res = subprocess.run(cmd, capture_output=True)
        if res.returncode != 0:
            print(res.stderr.decode(errors="ignore")[-300:], file=sys.stderr)
            print(f"  GAGAL konversi {f} (pastikan ffmpeg terpasang)", file=sys.stderr)
            continue
        idx += 1

    print(f"selesai: {idx - args.start} file -> {args.output}")


if __name__ == "__main__":
    main()
