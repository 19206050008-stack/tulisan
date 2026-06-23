"""Download the Wikidepia Indonesian TTS v1.2 model files into the working dir.

Files are saved at the working directory root (NOT a models/ subfolder) because
the model's config.json references speakers.pth via a relative path that resolves
to the current working directory (e.g. /app/speakers.pth)."""
import os
import urllib.request

BASE = "https://github.com/Wikidepia/indonesian-tts/releases/download/v1.2"
FILES = {
    "checkpoint.pth": f"{BASE}/checkpoint_1260000-inference.pth",
    "config.json": f"{BASE}/config.json",
    "speakers.pth": f"{BASE}/speakers.pth",
}

for name, url in FILES.items():
    if os.path.exists(name):
        print(f"skip {name} (exists)")
        continue
    print(f"downloading {name} <- {url}")
    urllib.request.urlretrieve(url, name)
    print(f"  saved {name} ({os.path.getsize(name)} bytes)")
print("done")
