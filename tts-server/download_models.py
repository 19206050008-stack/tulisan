"""Download lightweight ONNX TTS models (sherpa-onnx) at build time.

These are small VITS models (~30-40MB each) converted from Meta MMS and Piper.
They run on onnxruntime (no torch), so RAM stays low.

Source: https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models

The download is fault-tolerant: if any archive is missing/unavailable, it is
skipped (a warning is logged) and the server simply won't offer that voice.
"""
import os
import sys
import tarfile
import urllib.request

BASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models"
MODELS_DIR = os.environ.get("MODELS_DIR", "models")

# Archive base names (without .tar.bz2). MMS = regional accents; Piper = Indonesian.
ARCHIVES = [
    "vits-piper-id_ID-news_tts-medium",  # Indonesia (Piper)
    "vits-mms-jav",  # Jawa
    "vits-mms-sun",  # Sunda
    "vits-mms-min",  # Minang
    "vits-mms-ban",  # Bali
    "vits-mms-bug",  # Bugis
    "vits-mms-nij",  # Ngaju (Kalimantan)
    "vits-mms-ace",  # Aceh
    "vits-mms-mad",  # Madura
]

os.makedirs(MODELS_DIR, exist_ok=True)

# --- Custom trained voices (Opsi 3) -----------------------------------------
# After you train a VITS voice and export it to ONNX (see /tts-training),
# pack it as a .tar.bz2 that extracts to a folder "custom-<name>/" containing
# model.onnx + tokens.txt, upload it anywhere with a direct URL (mis. Hugging
# Face model repo / GitHub release), and paste the URL here. It will be
# downloaded at build time and auto-served as a voice in group "Kustom".
#
# Example:
#   CUSTOM_MODELS = {"custom-rosa": "https://huggingface.co/USER/REPO/resolve/main/custom-rosa.tar.bz2"}
CUSTOM_MODELS: "dict[str, str]" = {}

# Also allow URLs via env: CUSTOM_TTS_MODELS="custom-rosa=https://...,custom-andi=https://..."
_env_custom = os.environ.get("CUSTOM_TTS_MODELS", "").strip()
if _env_custom:
    for pair in _env_custom.split(","):
        if "=" in pair:
            k, v = pair.split("=", 1)
            CUSTOM_MODELS[k.strip()] = v.strip()

for name in ARCHIVES:
    target = os.path.join(MODELS_DIR, name)
    if os.path.isdir(target):
        print(f"skip {name} (exists)")
        continue
    url = f"{BASE}/{name}.tar.bz2"
    archive = os.path.join(MODELS_DIR, f"{name}.tar.bz2")
    try:
        print(f"downloading {url}")
        urllib.request.urlretrieve(url, archive)
        print(f"extracting {name}")
        with tarfile.open(archive, "r:bz2") as tf:
            tf.extractall(MODELS_DIR)
        os.remove(archive)
        print(f"  ok {name}")
    except Exception as e:  # noqa: BLE001
        print(f"  WARN failed {name}: {e}", file=sys.stderr)
        try:
            if os.path.exists(archive):
                os.remove(archive)
        except OSError:
            pass

# Custom trained voices (folder name should start with "custom-").
for name, url in CUSTOM_MODELS.items():
    folder = name if name.startswith("custom-") else f"custom-{name}"
    target = os.path.join(MODELS_DIR, folder)
    if os.path.isdir(target):
        print(f"skip {folder} (exists)")
        continue
    archive = os.path.join(MODELS_DIR, f"{folder}.tar.bz2")
    try:
        print(f"downloading custom {url}")
        urllib.request.urlretrieve(url, archive)
        print(f"extracting {folder}")
        with tarfile.open(archive, "r:bz2") as tf:
            tf.extractall(MODELS_DIR)
        os.remove(archive)
        print(f"  ok {folder}")
    except Exception as e:  # noqa: BLE001
        print(f"  WARN failed {folder}: {e}", file=sys.stderr)
        try:
            if os.path.exists(archive):
                os.remove(archive)
        except OSError:
            pass

print("done")
