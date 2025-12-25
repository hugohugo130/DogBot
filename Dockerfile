FROM mwader/static-ffmpeg:latest as ffmpeg-builder
FROM node:latest

WORKDIR /app

# 安裝curl (for onlineDB server IP)
# 安裝編譯依賴 (某些套件會需要)
RUN apt install -y curl \
    python3 make g++ git

# 安裝ffmpeg
COPY --from=ffmpeg-builder /ffmpeg /usr/local/bin/
COPY --from=ffmpeg-builder /ffprobe /usr/local/bin/

# 複製 package.json / package-lock.json
COPY package*.json ./

# npm 安裝
RUN npm install

# 刪掉編譯依賴
RUN apt remove python3 make g++ git -y

# 複製剩下的程式碼
COPY . .

# 更新
ARG update=false
RUN if [ "$update" = "true" ]; then \
    npm update --save && \
    npm audit fix; \
    fi

RUN apt clean && rm -rf /var/lib/apt/lists/* \
    && npm cache clean --force

# 啟動
CMD ["node", "--trace-deprecation", "--trace-warnings", "index.js"]
