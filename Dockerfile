FROM node:latest

WORKDIR /app

# 安裝ffmpeg
# RUN apt install --update --no-cache ffmpeg

# 安裝編譯依賴 (某些套件會需要)
RUN apt install --no-cache python3 make g++ git

# 安裝各種東西
RUN apk install --no-cache curl libc6-compat

# 複製 package.json / package-lock.json
COPY package*.json ./

# npm 安裝
RUN npm install

# 刪掉編譯依賴
RUN apk del python3 make g++ git

# 複製剩下的程式碼
COPY . .

# 更新
ARG update=false
RUN if [ "$update" = "true" ]; then \
    npm update --save && \
    npm audit fix; \
fi

RUN npm cache clean --force

# 啟動
CMD ["node", "--trace-deprecation", "--trace-warnings", "index.js"]
