"""
F5-TTS Indonesia — Hugging Face Space (CPU Basic, gratis).

Natural Indonesian TTS with zero-shot voice cloning. Reference voices are read
automatically from the bundled `refs/` folder (drop your sample clips there),
each becoming a selectable voice. You may also upload a custom reference.

Runs on free CPU Basic hardware (no GPU). Generation is SLOW on CPU (~1-4 min),
so it's best used to PRE-RENDER story narration once and cache the result.

Model: PapaRazi/Ijazah_Palsu_V2 (F5-TTS finetuned for Indonesian).

API (gradio_client / @gradio/client):
  predict("/infer", [voice_id, gen_text])                    -> wav (bundled ref)
  predict("/infer_upload", [ref_audio, gen_text, ref_text])  -> wav (custom upload)
"""
import os
import tempfile

import gradio as gr
from huggingface_hub import hf_hub_download
from f5_tts.api import F5TTS

MODEL_REPO = os.environ.get("F5_MODEL_REPO", "PapaRazi/Ijazah_Palsu_V2")
CKPT_FILE = os.environ.get("F5_CKPT_FILE", "model_last_v2.safetensors")
VOCAB_FILE = os.environ.get("F5_VOCAB_FILE", "vocab.txt")
# If you get a config/shape error, try "F5TTS_Base" instead of "F5TTS_v1_Base".
BASE_CFG = os.environ.get("F5_BASE", "F5TTS_v1_Base")
# Fewer steps = faster on CPU, slightly lower quality. 16 is a good CPU balance.
NFE_STEP = int(os.environ.get("F5_NFE_STEP", "16"))

REFS_DIR = os.path.join(os.path.dirname(__file__), "refs")
AUDIO_EXT = (".mp3", ".wav", ".flac", ".m4a", ".ogg")

_model = None
_ref_text_cache: dict[str, str] = {}


def _discover_voices() -> dict[str, str]:
    """voice_id -> reference audio path, read from refs/."""
    voices = {}
    if os.path.isdir(REFS_DIR):
        for f in sorted(os.listdir(REFS_DIR)):
            if f.lower().endswith(AUDIO_EXT):
                vid = os.path.splitext(f)[0]
                voices[vid] = os.path.join(REFS_DIR, f)
    return voices


VOICES = _discover_voices()


def _load():
    global _model
    if _model is None:
        ckpt = hf_hub_download(MODEL_REPO, CKPT_FILE)
        vocab = hf_hub_download(MODEL_REPO, VOCAB_FILE)
        # device=None -> F5TTS auto-selects (cpu when no GPU).
        _model = F5TTS(model=BASE_CFG, ckpt_file=ckpt, vocab_file=vocab)
    return _model


def _ref_text_for(voice_id: str, ref_path: str) -> str:
    """Use refs/<id>.txt transcript if provided; else "" (F5 auto-transcribes)."""
    if voice_id in _ref_text_cache:
        return _ref_text_cache[voice_id]
    txt_path = os.path.splitext(ref_path)[0] + ".txt"
    text = ""
    if os.path.exists(txt_path):
        with open(txt_path, encoding="utf-8") as fh:
            text = fh.read().strip()
    _ref_text_cache[voice_id] = text
    return text


def _synth(ref_file: str, ref_text: str, gen_text: str) -> str:
    model = _load()
    out_path = tempfile.mktemp(suffix=".wav")
    model.infer(
        ref_file=ref_file,
        ref_text=(ref_text or "").strip(),
        gen_text=gen_text.strip(),
        nfe_step=NFE_STEP,
        remove_silence=True,
        file_wave=out_path,
    )
    return out_path


def infer(voice_id, gen_text):
    if not (gen_text or "").strip():
        raise gr.Error("Teks wajib diisi.")
    if len(gen_text) > 5000:
        raise gr.Error("Teks terlalu panjang (maks 5000 karakter).")
    voices = _discover_voices()
    if voice_id not in voices:
        if not voices:
            raise gr.Error("Belum ada suara referensi di folder refs/.")
        voice_id = next(iter(voices))
    ref_path = voices[voice_id]
    return _synth(ref_path, _ref_text_for(voice_id, ref_path), gen_text)


def infer_upload(reference_audio, gen_text, reference_text=""):
    if not reference_audio:
        raise gr.Error("Unggah audio referensi (suara yang Anda miliki/izinkan).")
    if not (gen_text or "").strip():
        raise gr.Error("Teks wajib diisi.")
    return _synth(reference_audio, reference_text, gen_text)


with gr.Blocks(title="F5-TTS Indonesia") as demo:
    gr.Markdown(
        "# 🎙️ F5-TTS Indonesia — narasi natural + voice cloning (CPU gratis)\n"
        "Pilih suara dari koleksi `refs/`, atau unggah referensi sendiri.\n\n"
        "_Catatan: jalan di CPU gratis, jadi proses bisa 1-4 menit. Cocok untuk "
        "membuat audio narasi sekali lalu disimpan._"
    )
    with gr.Tab("Pilih suara"):
        voice = gr.Dropdown(
            choices=list(VOICES.keys()),
            value=(next(iter(VOICES)) if VOICES else None),
            label="Suara",
        )
        txt = gr.Textbox(label="Teks untuk dibacakan", lines=5)
        btn = gr.Button("Hasilkan suara", variant="primary")
        out = gr.Audio(label="Hasil")
        btn.click(infer, [voice, txt], out, api_name="infer")

    with gr.Tab("Unggah referensi"):
        ref = gr.Audio(label="Suara referensi (wav/mp3, ~6-12 dtk)", type="filepath")
        ref_txt = gr.Textbox(label="Transkrip referensi (opsional)")
        txt2 = gr.Textbox(label="Teks untuk dibacakan", lines=5)
        btn2 = gr.Button("Hasilkan suara", variant="primary")
        out2 = gr.Audio(label="Hasil")
        btn2.click(infer_upload, [ref, txt2, ref_txt], out2, api_name="infer_upload")

demo.queue().launch()
