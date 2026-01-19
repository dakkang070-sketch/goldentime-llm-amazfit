#!/bin/bash

# MongoDB 백업 스크립트

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="goldentime_backup_${TIMESTAMP}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/goldentime}"

echo "🗄️  MongoDB 백업 시작..."
echo "백업 위치: ${BACKUP_DIR}/${BACKUP_NAME}"

# 백업 디렉토리 생성
mkdir -p "${BACKUP_DIR}"

# MongoDB 백업
if command -v mongodump &> /dev/null; then
    # mongodump 사용
    mongodump --uri="${MONGODB_URI}" --out="${BACKUP_DIR}/${BACKUP_NAME}"
    echo "✅ 백업 완료: ${BACKUP_DIR}/${BACKUP_NAME}"
    
    # 압축
    echo "📦 백업 압축 중..."
    tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
    rm -rf "${BACKUP_DIR}/${BACKUP_NAME}"
    echo "✅ 압축 완료: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
else
    echo "⚠️  mongodump가 설치되어 있지 않습니다."
    echo "   MongoDB 도구를 설치하거나 Docker를 사용하세요."
    
    # Docker를 통한 백업 시도
    if command -v docker &> /dev/null; then
        echo "🐳 Docker를 통한 백업 시도..."
        docker exec goldentime-mongodb mongodump --out=/backup/${BACKUP_NAME} || {
            echo "❌ Docker 백업 실패"
            exit 1
        }
        docker cp goldentime-mongodb:/backup/${BACKUP_NAME} "${BACKUP_DIR}/"
        echo "✅ Docker 백업 완료"
    else
        echo "❌ 백업 도구를 찾을 수 없습니다."
        exit 1
    fi
fi

# 오래된 백업 삭제 (30일 이상)
echo "🧹 오래된 백업 정리 중..."
find "${BACKUP_DIR}" -name "goldentime_backup_*.tar.gz" -mtime +30 -delete
echo "✅ 정리 완료"

echo ""
echo "📊 백업 정보:"
ls -lh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" 2>/dev/null || ls -lh "${BACKUP_DIR}/${BACKUP_NAME}"
