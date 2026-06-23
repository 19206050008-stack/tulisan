"""Download the Wikidepia Indonesian TTS v1.2 model files into ./models."""
import os
import urllib.request

BASE = "https://github.com/Wikidepia/indonesian-tts/releases/download/v1.2"
FILES = {
    "checkpoint.pth": f"{BASE}/checkpoint_1260000-inference.pth",
    "config.json": f"{BASE}/config.json",
    "speakers.pth": f"{BASE}/speakers.pth",
}

os.makedirs("models", exist_ok=True)
for name, url in FILES.items():
    dest = os.path.join("models", name)
    if os.path.exists(dest):
        print(f"skip {name} (exists)")
        continue
    print(f"downloading {name} <- {url}")
    urllib.request.urlretrieve(url, dest)
    print(f"  saved {dest} ({os.path.getsize(dest)} bytes)")
print("done")
