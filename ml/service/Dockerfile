# Builds the custom-trained document classifier inference service.
# Build from the repo root so ml/models (your trained model) is included:
#   docker build -f ml/service/Dockerfile -t doc-classifier-service .
#   docker run -p 8000:8000 doc-classifier-service
#
# Deploy the resulting image to any container host (Fly.io, Render, Railway,
# Cloud Run, etc.) and set MODEL_API_URL in the Next.js app to its public URL.

FROM python:3.11-slim

WORKDIR /app

COPY ml/service/requirements.txt ./ml/service/requirements.txt
RUN pip install --no-cache-dir -r ml/service/requirements.txt

COPY ml/ ./ml/

EXPOSE 8000
CMD ["uvicorn", "ml.service.main:app", "--host", "0.0.0.0", "--port", "8000"]
