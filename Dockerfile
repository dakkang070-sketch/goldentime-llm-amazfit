# Multi-stage build for Golden Time LLM
# Stage 1: Python dependencies and AI models
FROM python:3.11-slim as python-builder

WORKDIR /app

# Install system dependencies for Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python source code
COPY backend/transformers ./transformers
COPY backend/finetuning ./finetuning
COPY backend/dataprocessing ./dataprocessing

# Stage 2: Node.js backend
FROM node:18-alpine as node-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Stage 3: Frontend build
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./
RUN npm run build

# Stage 4: Final production image
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    nodejs \
    npm \
    mongodb-tools \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.ai/install.sh | sh

# Create app user
RUN useradd -m -s /bin/bash appuser
USER appuser
WORKDIR /home/appuser/app

# Copy Python environment from builder
COPY --from=python-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-builder /usr/local/bin /usr/local/bin

# Copy Node.js dependencies
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/package*.json ./

# Copy backend source
COPY --chown=appuser:appuser backend/ ./backend/

# Copy Python AI components
COPY --from=python-builder --chown=appuser:appuser /app/transformers ./backend/transformers
COPY --from=python-builder --chown=appuser:appuser /app/finetuning ./backend/finetuning  
COPY --from=python-builder --chown=appuser:appuser /app/dataprocessing ./backend/dataprocessing

# Copy built frontend
COPY --from=frontend-builder --chown=appuser:appuser /app/frontend/dist ./frontend/dist

# Create directories for models and data
RUN mkdir -p ./weights ./lora_models ./processed_data ./logs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV FRONTEND_PORT=5173
ENV PYTHON_PATH=/usr/bin/python3

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose ports
EXPOSE 3000 5173 11434

# Create startup script
RUN cat > start.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Golden Time LLM 시스템 시작..."

# Start Ollama in background
echo "📡 Ollama 서버 시작..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "⏳ Ollama 준비 대기..."
sleep 10

# Pull required models
echo "📥 LLM 모델 다운로드..."
ollama pull llama3.1:8b || true

# Start data processing (if needed)
if [ "$ENABLE_DATA_PROCESSING" = "true" ]; then
    echo "🔧 데이터 전처리 시작..."
    cd backend && python3 dataprocessing/substanceDataProcessor.py &
fi

# Start model training (if needed)
if [ "$ENABLE_MODEL_TRAINING" = "true" ]; then
    echo "🤖 AI 모델 훈련 시작..."
    cd backend && python3 transformers/alcoholTransformer.py &
    cd backend && python3 transformers/drugTransformer.py &
    cd backend && python3 transformers/psychoactiveTransformer.py &
    wait
fi

# Start LoRA fine-tuning (if needed)
if [ "$ENABLE_LORA_TRAINING" = "true" ]; then
    echo "🔬 LoRA 파인튜닝 시작..."
    cd backend && python3 finetuning/loraFineTuning.py &
fi

# Start main application
echo "🏥 Golden Time LLM 서버 시작..."
exec node backend/server.js

# Cleanup function
cleanup() {
    echo "🛑 시스템 종료 중..."
    kill $OLLAMA_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT
EOF

RUN chmod +x start.sh

# Default command
CMD ["./start.sh"]

# Labels
LABEL maintainer="Golden Time AI Team"
LABEL version="2.0.0"
LABEL description="AI 응급관제시스템 with 물질 남용 탐지"