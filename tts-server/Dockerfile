FROM python:3.11-slim

# libgomp1: required by onnxruntime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py download_models.py ./

# Download model at build time (baked into image → no download at runtime).
RUN python download_models.py

EXPOSE 8080

# Single worker, single thread → minimal RAM (~350MB peak).
# Railway/Render inject $PORT; fallback 8080 for local.
ENV WEB_CONCURRENCY=1
ENV PYTHONUNBUFFERED=1
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --limit-concurrency 2 --timeout-keep-alive 30"]
