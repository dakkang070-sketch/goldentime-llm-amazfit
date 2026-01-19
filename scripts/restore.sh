#!/bin/bash

# MongoDB 복구 스크립트

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "사용법: $0 <백업파일경로>"
    echo ""
    echo "사용 가능한 백업 파일:"
    ls -lh ./backups/*.tar.gz 2>/dev/null || echo "백업 파일이 없습니다."
    exit 1
fi

MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/goldentime}"

echo "⚠️  경고: 이 작업은 현재 데이터베이스를 덮어씁니다!"
read -p "계속하시겠습니까? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "복구가 취소되었습니다."
    exit 0
fi

echo "🔄 MongoDB 복구 시작..."
echo "백업 파일: ${BACKUP_FILE}"

# 압축 해제
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    TEMP_DIR=$(mktemp -d)
    echo "📦 압축 해제 중..."
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    BACKUP_DIR="$TEMP_DIR/$(ls "$TEMP_DIR" | head -1)"
else
    BACKUP_DIR="$BACKUP_FILE"
fi

# MongoDB 복구
if command -v mongorestore &> /dev/null; then
    mongorestore --uri="${MONGODB_URI}" --drop "$BACKUP_DIR"
    echo "✅ 복구 완료"
else
    echo "⚠️  mongorestore가 설치되어 있지 않습니다."
    
    # Docker를 통한 복구 시도
    if command -v docker &> /dev/null; then
        echo "🐳 Docker를 통한 복구 시도..."
        docker cp "$BACKUP_DIR" goldentime-mongodb:/backup/restore
        docker exec goldentime-mongodb mongorestore --drop /backup/restore || {
            echo "❌ Docker 복구 실패"
            exit 1
        }
        echo "✅ Docker 복구 완료"
    else
        echo "❌ 복구 도구를 찾을 수 없습니다."
        exit 1
    fi
fi

# 임시 디렉토리 정리
if [ -n "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

echo "✅ 복구가 완료되었습니다!"
