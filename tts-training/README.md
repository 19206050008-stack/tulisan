# Latih Suara Kustom (VITS) → ONNX → Railway

Panduan Opsi 3: melatih satu suara Bahasa Indonesia dengan VITS (Coqui TTS),
mengekspornya ke ONNX, lalu menyajikannya di server `tts-server` kita (ringan,
CPU, tanpa pihak ketiga saat inference).

> Ringkasnya: **rekam dataset → training di Colab (GPU gratis) → ekspor ONNX →
> upload model → tempel URL di `tts-server/download_models.py`**. Setelah itu
> suara otomatis muncul di `/tts-demo` (grup "Kustom").

---

## 0. Ekspektasi yang jujur

- **Bukan clone instan.** VITS belajar dari dataset Anda; makin banyak & bersih
  datanya, makin mirip & natural.
- **Jumlah data:**
  - Fine-tune dari checkpoint Indonesia: minimal **~30 menit**, ideal **1–3 jam**.
  - Latih dari nol: butuh **10+ jam** (tidak disarankan).
- **Kualitas data > kuantitas.** Rekaman harus: 1 orang, mikrofon sama, hening
  (tanpa musik/noise/echo), volume konsisten.
- **Hak suara:** hanya latih suara yang Anda **miliki/izinkan** (suara Anda
  sendiri atau yang berlisensi). Jangan pakai demo reel orang lain.

---

## 1. Siapkan dataset (format LJSpeech)

Struktur folder:

```
dataset/
  wavs/
    0001.wav
    0002.wav
    ...
  metadata.csv
```

`metadata.csv` (pemisah `|`, tanpa header):

```
0001|Selamat datang di Di.tulis.
0002|Hari ini kita akan membaca sebuah cerita pendek.
```

Aturan audio:
- WAV mono, **22050 Hz**, 16-bit PCM.
- Tiap klip **2–12 detik**, berisi **satu kalimat**.
- Transkrip harus **persis** sesuai ucapan (huruf, angka ditulis sebagai kata:
  "dua puluh", bukan "20").
- Target: **300–1500 klip** (≈ 30 menit – 2 jam).

### Bantu konversi audio
Pakai `prepare_audio.py` (resample ke 22.05kHz mono) — lihat file di folder ini:

```bash
python prepare_audio.py --input rekaman_mentah/ --output dataset/wavs/
```

Lalu buat/rapikan `metadata.csv` (boleh manual, atau transkrip otomatis dengan
Whisper lalu **dikoreksi tangan**).

---

## 2. Training di Google Colab (GPU gratis)

Buka Colab (Runtime → GPU). Jalankan sel berikut.

```python
# 1) Install Coqui TTS (fork yang dipelihara)
!pip install -q coqui-tts

# 2) Upload/letakkan dataset/ (mis. dari Google Drive)
from google.colab import drive; drive.mount('/content/drive')
# pastikan ada /content/dataset/wavs dan /content/dataset/metadata.csv
```

Buat config training VITS berbasis karakter (cocok untuk Indonesia, tanpa
phonemizer). Simpan sebagai `config.json` — contoh ringkas:

```python
from TTS.tts.configs.vits_config import VitsConfig
from TTS.tts.configs.shared_configs import BaseDatasetConfig
from TTS.config import save_config

dataset = BaseDatasetConfig(
    formatter="ljspeech",
    meta_file_train="metadata.csv",
    path="/content/dataset",
)
config = VitsConfig(
    run_name="vits-id-kustom",
    batch_size=16,
    eval_batch_size=8,
    num_loader_workers=2,
    epochs=1000,
    text_cleaner="basic_cleaners",   # tanpa phoneme (char-based)
    use_phonemes=False,
    print_step=50,
    save_step=1000,
    output_path="/content/out",
    datasets=[dataset],
    test_sentences=[
        "Halo, ini contoh suara kustom Bahasa Indonesia.",
        "Selamat membaca cerita di Di.tulis.",
    ],
)
config.audio.sample_rate = 22050
save_config("/content/config.json", config)
```

Mulai training (fine-tune dari checkpoint Indonesia jika ada, agar cepat):

```bash
# Latih (tambahkan --restore_path <checkpoint.pth> untuk fine-tune)
!python -m TTS.bin.train_tts --config_path /content/config.json
```

Pantau sampel audio di `--output_path`. Hentikan saat suara sudah bagus
(biasanya beberapa ribu step untuk fine-tune). Checkpoint terbaik:
`/content/out/.../best_model.pth` + `config.json`.

> Tips: kalau punya checkpoint VITS Indonesia (mis. dari repo
> ZahrizhalAli/indonesian-tts-vits atau Coqui), pakai sebagai `--restore_path`
> supaya dataset kecil pun cukup.

---

## 3. Ekspor ke ONNX (untuk sherpa-onnx)

Coqui VITS bisa diekspor ke ONNX, lalu dibuat token list untuk sherpa-onnx.
Pakai script resmi sherpa-onnx untuk Coqui:

```bash
# di Colab
!git clone https://github.com/k2-fsa/sherpa-onnx
# Ikuti scripts/coqui/ pada repo sherpa-onnx untuk:
#   - export model_best.pth + config.json -> model.onnx
#   - generate tokens.txt dari daftar karakter di config.json
```

Cara cepat (Coqui bawaan) membuat `model.onnx`:

```python
from TTS.utils.synthesizer import Synthesizer
synth = Synthesizer("/content/out/.../best_model.pth", "/content/config.json")
synth.tts_model.export_onnx("/content/model.onnx")  # menghasilkan model.onnx
```

Buat `tokens.txt` dari karakter (`<char> <id>` per baris) — sherpa-onnx butuh
ini. Lihat `scripts/coqui` di sherpa-onnx untuk format pastinya.

Verifikasi cepat dengan sherpa-onnx (opsional):

```bash
!pip install -q sherpa-onnx
!python -c "import sherpa_onnx; print('ok')"
```

---

## 4. Pack & upload

Bungkus jadi arsip yang **extract ke folder `custom-<nama>/`**:

```bash
mkdir custom-rosa
cp model.onnx tokens.txt custom-rosa/
tar -cjf custom-rosa.tar.bz2 custom-rosa
```

Upload `custom-rosa.tar.bz2` ke tempat dengan **URL langsung**, mis:
- Repo model Hugging Face Anda → `.../resolve/main/custom-rosa.tar.bz2`
- GitHub Release

---

## 5. Daftarkan ke server (Railway)

Edit `tts-server/download_models.py`, isi `CUSTOM_MODELS`:

```python
CUSTOM_MODELS = {
    "custom-rosa": "https://huggingface.co/USER/REPO/resolve/main/custom-rosa.tar.bz2",
}
```

Commit & push → Railway build ulang, mengunduh model, dan server **otomatis**
menyajikannya sebagai voice `rosa` (grup "Kustom"). Halaman `/tts-demo` akan
menampilkannya tanpa perubahan kode lain.

> Alternatif tanpa edit kode: set env Railway
> `CUSTOM_TTS_MODELS=custom-rosa=https://.../custom-rosa.tar.bz2`

---

## Ringkasan alur

1. Rekam + transkrip → `dataset/` (LJSpeech, 22.05kHz mono).
2. Colab: `pip install coqui-tts` → training VITS (fine-tune lebih cepat).
3. Ekspor `model.onnx` + buat `tokens.txt` (sherpa-onnx).
4. `tar -cjf custom-<nama>.tar.bz2 custom-<nama>/` → upload (URL langsung).
5. Tempel URL di `CUSTOM_MODELS` → push → otomatis jadi voice di `/tts-demo`.
