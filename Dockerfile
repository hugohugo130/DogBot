FROM node:22.14.0-alpine

WORKDIR /app

# 安裝編譯依賴 (某些套件會需要)
RUN apk add --no-cache python3 make g++ git curl

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

ENTRYPOINT [ "node", "utils/safeshutdown_exec.js" ]

# 啟動
CMD ["node", "--trace-deprecation", "--trace-warnings", "index.js"]
