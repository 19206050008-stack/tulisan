---
title: F5-TTS Indonesia
emoji: 🎙️
colorFrom: indigo
colorTo: purple
sdk: gradio
app_file: app.py
pinned: false
---

# F5-TTS Indonesia (ZeroGPU)

TTS Bahasa Indonesia yang natural dengan **zero-shot voice cloning** (F5-TTS).
Unggah klip referensi pendek (suara yang Anda miliki/izinkan), tulis teks, dapat
suara natural + ekspresif dalam gaya suara itu.

Model: [`PapaRazi/Ijazah_Palsu_V2`](https://huggingface.co/PapaRazi/Ijazah_Palsu_V2)
(F5-TTS finetune Indonesia, lisensi CC-BY-NC-4.0 → **non-komersial**).

## Cara deploy

1. Buat **Space baru** di Hugging Face → SDK **Gradio**.
2. **Settings → Hardware → ZeroGPU** (Nvidia, gratis dengan kuota).
3. Upload `app.py` + `requirements.txt` (+ README ini) ke Space.
4. Tunggu build. Buka tab **App** untuk uji manual.
5. Endpoint API otomatis tersedia dengan nama **`/infer`**.

## Memanggil dari aplikasi (tanpa key berbayar, pakai token HF gratis)

```python
from gradio_client import Client, handle_file
client = Client("USERNAME/NAMA-SPACE", hf_token="hf_xxx")
result = client.predict(
    handle_file("referensi.wav"),  # reference_audio
    "Halo, ini contoh narasi cerita.",  # gen_text
    "",  # reference_text (opsional)
    api_name="/infer",
)
print(result)  # path ke wav hasil
```

> Catatan lisensi: model ini **non-komersial (CC-BY-NC-4.0)**. Untuk pemakaian
> komersial Di.tulis, ganti dengan model F5-TTS Indonesia berlisensi komersial
> atau latih sendiri (`F5_MODEL_REPO`, `F5_CKPT_FILE`, `F5_VOCAB_FILE` bisa
> di-override lewat env Space).
>
> Etika: hanya gunakan suara referensi yang Anda miliki/izinkan.

## Env opsional (Space → Settings → Variables)

- `F5_MODEL_REPO` (default `PapaRazi/Ijazah_Palsu_V2`)
- `F5_CKPT_FILE` (default `model_last_v2.safetensors`)
- `F5_VOCAB_FILE` (default `vocab.txt`)
- `F5_BASE` (default `F5TTS_v1_Base`; coba `F5TTS_Base` bila ada error config)
