FROM python:3.11-slim

# System deps for torch / audio
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libsndfile1 espeak-ng curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py download_models.py ./

# Download model weights at build time (large, ~300MB)
RUN python download_models.py

EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
