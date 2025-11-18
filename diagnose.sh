#!/bin/bash

# Discord Bot 診斷腳本
# 用於快速收集 CPU 100% 問題的診斷信息

echo "================================"
echo "Discord Bot 診斷工具"
echo "================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查是否提供容器名稱
if [ -z "$1" ]; then
    echo -e "${YELLOW}使用方法: ./diagnose.sh <container_name>${NC}"
    echo ""
    echo "可用的容器:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    exit 1
fi

CONTAINER_NAME=$1
OUTPUT_DIR="diagnostic_$(date +%Y%m%d_%H%M%S)"

# 創建輸出目錄
mkdir -p "$OUTPUT_DIR"
echo -e "${GREEN}診斷信息將保存到: $OUTPUT_DIR${NC}"
echo ""

# 檢查容器是否存在
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}錯誤: 找不到容器 '$CONTAINER_NAME'${NC}"
    exit 1
fi

echo "📊 開始收集診斷信息..."
echo ""

# 1. 容器狀態
echo "1/8 收集容器狀態..."
docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" > "$OUTPUT_DIR/container_status.txt"
echo -e "${GREEN}✓${NC} 容器狀態已保存"

# 2. 容器詳細信息
echo "2/8 收集容器詳細信息..."
docker inspect "$CONTAINER_NAME" > "$OUTPUT_DIR/container_inspect.json"
echo -e "${GREEN}✓${NC} 容器詳細信息已保存"

# 3. CPU 和記憶體使用
echo "3/8 收集資源使用情況..."
docker stats --no-stream "$CONTAINER_NAME" > "$OUTPUT_DIR/resource_usage.txt"
echo -e "${GREEN}✓${NC} 資源使用情況已保存"

# 4. 最近的日誌
echo "4/8 收集日誌 (最近 1000 行)..."
docker logs --tail 1000 "$CONTAINER_NAME" > "$OUTPUT_DIR/logs.txt" 2>&1
echo -e "${GREEN}✓${NC} 日誌已保存"

# 5. 錯誤日誌
echo "5/8 過濾錯誤日誌..."
docker logs --tail 1000 "$CONTAINER_NAME" 2>&1 | grep -i "error\|exception\|failed\|warning" > "$OUTPUT_DIR/errors.txt"
ERROR_COUNT=$(wc -l < "$OUTPUT_DIR/errors.txt")
if [ $ERROR_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC}  發現 $ERROR_COUNT 條錯誤/警告"
else
    echo -e "${GREEN}✓${NC} 沒有發現錯誤"
fi

# 6. 進程信息
echo "6/8 收集進程信息..."
if docker exec "$CONTAINER_NAME" ps aux > "$OUTPUT_DIR/processes.txt" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} 進程信息已保存"
else
    echo -e "${YELLOW}⚠${NC}  無法獲取進程信息 (容器可能未運行)"
fi

# 7. 環境變量
echo "7/8 收集環境變量..."
docker exec "$CONTAINER_NAME" env > "$OUTPUT_DIR/environment.txt" 2>/dev/null || echo "無法獲取環境變量" > "$OUTPUT_DIR/environment.txt"
echo -e "${GREEN}✓${NC} 環境變量已保存"

# 8. 系統信息
echo "8/8 收集系統信息..."
{
    echo "=== Docker 版本 ==="
    docker version
    echo ""
    echo "=== Docker 信息 ==="
    docker info
    echo ""
    echo "=== 主機信息 ==="
    uname -a
    echo ""
    echo "=== 記憶體信息 ==="
    free -h
    echo ""
    echo "=== 磁盤使用 ==="
    df -h
} > "$OUTPUT_DIR/system_info.txt"
echo -e "${GREEN}✓${NC} 系統信息已保存"

# 生成摘要報告
echo ""
echo "📝 生成摘要報告..."

{
    echo "================================"
    echo "Discord Bot 診斷摘要"
    echo "================================"
    echo "容器名稱: $CONTAINER_NAME"
    echo "診斷時間: $(date)"
    echo ""
    
    echo "--- 容器狀態 ---"
    docker ps -a --filter "name=$CONTAINER_NAME" --format "狀態: {{.Status}}"
    echo ""
    
    echo "--- 資源使用 ---"
    cat "$OUTPUT_DIR/resource_usage.txt"
    echo ""
    
    echo "--- 錯誤統計 ---"
    if [ $ERROR_COUNT -gt 0 ]; then
        echo "發現 $ERROR_COUNT 條錯誤/警告"
        echo ""
        echo "最近的錯誤:"
        head -n 10 "$OUTPUT_DIR/errors.txt"
    else
        echo "沒有發現錯誤"
    fi
    echo ""
    
    echo "--- 進程信息 ---"
    if [ -f "$OUTPUT_DIR/processes.txt" ]; then
        grep -E "node|npm|CPU" "$OUTPUT_DIR/processes.txt" || echo "沒有找到相關進程"
    else
        echo "無法獲取進程信息"
    fi
    echo ""
    
    echo "--- 最近的日誌 (最後 20 行) ---"
    tail -n 20 "$OUTPUT_DIR/logs.txt"
    
} > "$OUTPUT_DIR/SUMMARY.txt"

echo -e "${GREEN}✓${NC} 摘要報告已生成"
echo ""

# 顯示摘要
echo "================================"
echo "診斷完成！"
echo "================================"
echo ""
cat "$OUTPUT_DIR/SUMMARY.txt"
echo ""
echo "================================"
echo -e "${GREEN}所有診斷文件已保存到: $OUTPUT_DIR${NC}"
echo ""
echo "文件列表:"
ls -lh "$OUTPUT_DIR"
echo ""

# 檢查 CPU 使用率
CPU_USAGE=$(docker stats --no-stream "$CONTAINER_NAME" --format "{{.CPUPerc}}" | sed 's/%//')
if [ ! -z "$CPU_USAGE" ]; then
    CPU_INT=${CPU_USAGE%.*}
    if [ $CPU_INT -gt 80 ]; then
        echo -e "${RED}⚠️  警告: CPU 使用率過高 ($CPU_USAGE%)${NC}"
        echo ""
        echo "建議操作:"
        echo "1. 查看錯誤日誌: cat $OUTPUT_DIR/errors.txt"
        echo "2. 查看完整日誌: cat $OUTPUT_DIR/logs.txt"
        echo "3. 重啟容器: docker restart $CONTAINER_NAME"
        echo ""
    else
        echo -e "${GREEN}✓ CPU 使用率正常 ($CPU_USAGE%)${NC}"
    fi
fi

# 創建壓縮包
echo "正在創建壓縮包..."
tar -czf "${OUTPUT_DIR}.tar.gz" "$OUTPUT_DIR"
echo -e "${GREEN}✓${NC} 壓縮包已創建: ${OUTPUT_DIR}.tar.gz"
echo ""
echo "你可以將此壓縮包發送給支援人員進行分析"
