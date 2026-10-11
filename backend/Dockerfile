
FROM python:3.13-slim

WORKDIR /app

# Install Linux libraries required by MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgles2 \
    libegl1 \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY models/ ./models/

ENV PYTHONUNBUFFERED=1
ENV PORT=10000

EXPOSE 10000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
