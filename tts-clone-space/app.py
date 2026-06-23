"""
F5-TTS Indonesia — Hugging Face Space (ZeroGPU).

Natural Indonesian TTS with zero-shot voice cloning. Upload a short reference
clip (a voice you OWN or are licensed to use), provide the story text, and get
natural, expressive speech in that voice.

Model: PapaRazi/Ijazah_Palsu_V2 (F5-TTS finetuned for Indonesian, base SWivid/F5-TTS).

Deploy:
  - Create a new Space (SDK: Gradio), set Hardware = ZeroGPU.
  - Upload app.py + requirements.txt (+ this README).
  - The Space exposes a callable API endpoint named "/infer".

API (via gradio_client / @gradio/client):
  predict("/infer", [reference_audio, gen_text, reference_text])
  -> returns a wav file.
"""
import os
import tempfile

import gradio as gr
import spaces
from huggingface_hub import hf_hub_download
from f5_tts.api import F5TTS

MODEL_REPO = os.environ.get("F5_MODEL_REPO", "PapaRazi/Ijazah_Palsu_V2")
CKPT_FILE = os.environ.get("F5_CKPT_FILE", "model_last_v2.safetensors")
VOCAB_FILE = os.environ.get("F5_VOCAB_FILE", "vocab.txt")
# If you get a config/shape error, try "F5TTS_Base" instead of "F5TTS_v1_Base".
BASE_CFG = os.environ.get("F5_BASE", "F5TTS_v1_Base")

_model = None


def _load():
    global _model
    if _model is None:
        ckpt = hf_hub_download(MODEL_REPO, CKPT_FILE)
        vocab = hf_hub_download(MODEL_REPO, VOCAB_FILE)
        _model = F5TTS(model=BASE_CFG, ckpt_file=ckpt, vocab_file=vocab)
    return _model


@spaces.GPU(duration=120)
def infer(reference_audio, gen_text, reference_text=""):
    if not reference_audio:
        raise gr.Error("Unggah audio referensi (suara yang Anda miliki/izinkan), ~6-12 detik.")
    if not (gen_text or "").strip():
        raise gr.Error("Teks wajib diisi.")
    if len(gen_text) > 5000:
        raise gr.Error("Teks terlalu panjang (maks 5000 karakter).")

    model = _load()
    out_path = tempfile.mktemp(suffix=".wav")
    # ref_text kosong -> F5-TTS auto-transkrip referensi dengan Whisper.
    model.infer(
        ref_file=reference_audio,
        ref_text=(reference_text or "").strip(),
        gen_text=gen_text.strip(),
        remove_silence=True,
        file_wave=out_path,
    )
    return out_path


with gr.Blocks(title="F5-TTS Indonesia") as demo:
    gr.Markdown(
        "# 🎙️ F5-TTS Indonesia — narasi natural + voice cloning\n"
        "Unggah **suara referensi yang Anda miliki/izinkan** (~6-12 detik), "
        "tulis teks cerita, lalu hasilkan suara natural dalam gaya suara itu."
    )
    ref = gr.Audio(label="Suara referensi (wav/mp3)", type="filepath")
    ref_txt = gr.Textbox(label="Transkrip referensi (opsional — kosongkan untuk auto)")
    txt = gr.Textbox(label="Teks untuk dibacakan", lines=5)
    btn = gr.Button("Hasilkan suara", variant="primary")
    out = gr.Audio(label="Hasil")
    btn.click(infer, [ref, txt, ref_txt], out, api_name="/infer")

demo.queue().launch()
