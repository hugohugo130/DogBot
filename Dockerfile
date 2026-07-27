FROM mwader/static-ffmpeg:latest as ffmpeg-builder
FROM node:24-bookworm-slim

WORKDIR /app

# 安裝 fluidsynth (MIDI 合成引擎)
# 還有編譯依賴 (某些套件會需要)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        fluidsynth \
        python3 make g++ git && \
    rm -rf /var/lib/apt/lists/*

# 複製 ffmpeg 和 ffprobe
COPY --from=ffmpeg-builder /ffmpeg /usr/local/bin/
COPY --from=ffmpeg-builder /ffprobe /usr/local/bin/

# 複製 package.json 和 package-lock.json
COPY package.json package-lock.json* ./

# 安裝依賴項
RUN if [ -f package-lock.json ]; then \
        npm ci --omit=dev; \
    else \
        npm i --omit=dev; \
fi && npm cache clean --force

# 刪掉編譯依賴
RUN apt-get remove -y python3 make g++ git && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 複製剩下的程式碼
COPY . .

# 啟動機器人
CMD ["node", "--trace-deprecation", "--trace-warnings", "index.js"]
