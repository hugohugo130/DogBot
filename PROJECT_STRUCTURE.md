# DogBot 專案結構完整說明文檔

> **版本**: 1.0.1
> **最後更新**: 2026/2/24
> **專案類型**: Discord Bot (Node.js)

---

## 📋 目錄

1. [專案概述](#專案概述)
2. [技術架構](#技術架構)
3. [核心系統](#核心系統)
4. [目錄結構詳解](#目錄結構詳解)
5. [啟動流程](#啟動流程)
6. [功能模組說明](#功能模組說明)
7. [資料庫系統](#資料庫系統)
8. [開發指南](#開發指南)

---

## 專案概述

### 專案簡介

DogBot 是一個功能豐富的 Discord 機器人，主要提供以下核心功能：

- **RPG 遊戲系統**: 完整的角色扮演遊戲，包含職業、物品、製作、交易等系統
- **音樂播放系統**: 支援多平台音樂串流播放（SoundCloud、Jamendo 等）
- **伺服器管理**: 動態語音頻道、前綴設定、權限管理
- **資料持久化**: JSON 檔案系統 + 線上備份系統
- **排程任務**: 定時執行維護任務

### 技術棧

| 類別 | 技術 |
|------|------|
| **運行環境** | Node.js (CommonJS) |
| **核心框架** | Discord.js v14.25.1 |
| **語音處理** | @discordjs/voice v0.19.0, @discordjs/opus |
| **資料庫** | JSON 檔案系統 |
| **音訊處理** | FFmpeg, fluent-ffmpeg, prism-media |
| **音樂來源** | soundcloud.ts, Jamendo API |
| **日誌系統** | Winston v3.19.0 |
| **HTTP 服務** | Express v5.2.1 |
| **其他工具** | axios, file-type, diff |

---

## 技術架構

### 事件流程

#### 1. 機器人啟動流程

```
index.js (主程序)
    -> 檢查環境變數 (.env)
    -> 載入資料庫檢查 (checkDBFilesExists)
    -> 載入 Cogs (事件監聽器)
    -> 註冊斜線指令 (registcmd)
    -> 登入 Discord (client.login)
    -> 觸發 ClientReady 事件
    -> 啟動排程系統 (run_schedule)
    -> 機器人就緒
```

#### 2. 指令執行流程

```
用戶輸入斜線指令
    -> Discord API 接收
    -> InteractionCreate 事件觸發
    -> handle_slashcmd.js (Cog) 接收
    -> 驗證權限與參數
    -> 查找對應指令檔案 (slashcmd/...)
    -> 執行指令邏輯 (execute 函數)
    -> 回傳結果給用戶
```

#### 3. RPG 系統流程

```
用戶執行 RPG 指令 (如 /farm)
    -> 檢查職業是否符合
    -> 檢查冷卻時間
    -> 讀取用戶 RPG 資料 (load_rpg_data)
    -> 執行遊戲邏輯
    -> 更新背包與金幣
    -> 儲存資料 (save_rpg_data)
    -> 回傳結果 Embed
```

---

## 核心系統

### 1. 自定義 Discord Client

**檔案位置**: `utils/customs/client.js`

核心屬性：
- `commands` - 斜線指令集合
- `dvoice` - 動態語音頻道資料
- `musicTrackSession` - 音樂追蹤會話
- `oven_sessions` - 烤爐會話 (RPG)
- `smelter_sessions` - 熔爐會話 (RPG)
- `cook_sessions` - 烹飪會話 (RPG)
- `lock` - 指令鎖 (防止併發)

特色功能：
- **快取管理**: 定時清理不活躍的頻道、伺服器、用戶快取
- **分片支援**: 支援多分片部署
- **鎖機制**: 防止 RPG 指令併發執行導致資料不一致

### 2. RPG 遊戲系統

**檔案位置**: `utils/rpg.js` (1000+ 行)

職業系統：fisher(漁夫)、farmer(農夫)、miner(礦工)、lumberjack(伐木工)、herder(牧農)、blacksmith(鐵匠)、cook(廚師)、pharmacist(藥劑師)

物品分類：礦物、錠、原木、木板、食物、武器防具、藥水

核心機制：
- **冷卻系統**: 根據執行次數動態計算冷卻時間
- **合成系統**: 根據配方合成物品 (recipes)
- **熔煉系統**: 熔煉礦石 (smeltable_recipe)
- **經濟系統**: 商店買賣、出售價格為商店價的 90%
- **金錢交易追蹤**: add_money / remove_money 記錄所有交易

### 3. 音樂播放系統

**檔案位置**: `utils/music/music.js` (800+ 行)

核心類別：
- **MusicTrack**: 單首音樂物件 (id, title, url, duration, thumbnail, author, source, stream, uuid)
- **MusicQueue**: 播放佇列管理 (tracks, player, currentTrack, loopStatus, connection)

支援來源：
- SoundCloud (`utils/music/soundcloud.js`)
- Jamendo (`utils/music/jamendo.js`)
- 直接音訊網址

### 4. 排程系統

**檔案位置**: `utils/run_schedule.js`

| 類型 | 執行頻率 | 目錄 |
|------|---------|------|
| everysec | 每秒 | `schedule/everysec/` |
| everymin | 每分鐘 | `schedule/everymin/` |
| every5min | 每5分鐘 | `schedule/every5min/` |

現有排程任務：
- `process_send_queue.js` (每秒) - 處理訊息發送佇列，避免 API 速率限制
- `fix_user_rpg_database.js` (每5分鐘) - 修復用戶 RPG 資料庫異常
- `upload_db_files.js` (每5分鐘) - 上傳資料庫至線上備份

使用鎖機制 (run_lock) 防止排程任務重複執行。

### 5. error_reader.js (開發工具)

**檔案位置**: `error_reader.js`

獨立執行的開發輔助腳本，用於讀取指定 Discord 錯誤頻道中的 Bot 錯誤訊息，自動：
- 過濾已知可忽略的錯誤 (ignore_keywords 清單)
- 對需要標記的錯誤訊息加上 X 反應
- 方便開發者快速定位尚未處理的真實錯誤

---

## 目錄結構詳解

```
DogBot/
├── index.js                    # 主程式入口
├── register_commands.js        # 斜線指令註冊
├── error_reader.js             # 錯誤訊息讀取開發工具 (新增)
├── package.json                # 專案配置
├── .env                        # 環境變數 (需自行建立)
├── .env.example                # 環境變數範例
├── Dockerfile                  # Docker 部署配置
├── global.d.ts                 # 全域型別定義
├── jsconfig.json               # JS 配置
│
├── cogs/                       # 事件處理器 (Cogs)
│   ├── on_ready.js             # 機器人就緒事件
│   ├── handle_slashcmd.js      # 斜線指令處理
│   ├── AutoComplete.js         # 自動完成處理
│   ├── dailySign.js            # 每日簽到
│   ├── dynamicVoice.js         # 動態語音頻道
│   ├── getInfoByMention.js     # 提及資訊取得
│   ├── admin_cmds.js           # 管理員指令
│   ├── 過夜.js                 # 過夜系統
│   └── rpg/                    # RPG 相關事件
│       ├── msg_handler.js      # RPG 訊息處理
│       └── interactions.js     # RPG 互動處理
│
├── slashcmd/                   # 斜線指令
│   ├── ping.js                 # Ping 指令
│   ├── info.js                 # 資訊指令
│   ├── music/                  # 音樂指令
│   │   ├── play.js             # 播放音樂
│   │   ├── pause.js            # 暫停
│   │   ├── resume.js           # 繼續
│   │   ├── skip.js             # 跳過
│   │   ├── queue.js            # 查看佇列
│   │   ├── nowplaying.js       # 正在播放
│   │   ├── join.js             # 加入語音
│   │   ├── disconnect.js       # 離開語音
│   │   └── swap.js             # 交換佇列順序
│   ├── game/rpg/               # RPG 遊戲指令
│   │   ├── farm.js             # 農耕
│   │   ├── cook.js             # 烹飪
│   │   ├── bake.js             # 烘烤
│   │   ├── smelt.js            # 熔煉
│   │   ├── make.js             # 製作
│   │   ├── setLang.js          # 設定語言
│   │   └── admins/             # 管理員 RPG 指令
│   │       └── getuserdata.js
│   └── admins/                 # 管理員指令
│       └── guild_only/         # 伺服器限定
│           ├── prefix.js       # 前綴設定
│           ├── setrpg.js       # RPG 設定
│           └── dynamicvoice.js # 動態語音設定
│
├── utils/                      # 工具模組
│   ├── rpg.js                  # RPG 遊戲邏輯 (1000+ 行)
│   ├── config.js               # 配置管理
│   ├── logger.js               # 日誌系統
│   ├── file.js                 # 檔案操作
│   ├── language.js             # 多語言支援
│   ├── message.js              # 訊息處理
│   ├── discord.js              # Discord 工具
│   ├── random.js               # 隨機工具
│   ├── timestamp.js            # 時間戳處理
│   ├── time.js                 # 時間工具
│   ├── sleep.js                # 延遲工具
│   ├── cache.js                # 快取管理
│   ├── onlineDB.js             # 線上資料庫
│   ├── auto_register.js        # 自動註冊指令
│   ├── check_db_files.js       # 資料庫檢查
│   ├── check.env.js            # 環境變數檢查
│   ├── hot_reload.js           # 熱重載
│   ├── load_cogs.js            # 載入 Cogs
│   ├── loadslashcmd.js         # 載入斜線指令
│   ├── run_schedule.js         # 排程執行器
│   ├── safeshutdown.js         # 安全關閉
│   ├── wait_for_client.js      # 等待就緒 (原 wait_until_ready.js)
│   ├── senderr.js              # 錯誤發送
│   ├── readline.js             # 命令列輸入
│   ├── getSeverIPSync.js       # 取得伺服器 IP
│   ├── delete_user_all_messages.js  # 刪除用戶訊息
│   ├── customs/                # 自定義類別
│   │   ├── client.js           # 自定義 Discord Client
│   │   └── embedBuilder.js     # 自定義 Embed 建構器
│   └── music/                  # 音樂系統
│       ├── music.js            # 音樂核心 (800+ 行)
│       ├── soundcloud.js       # SoundCloud API
│       └── jamendo.js          # Jamendo API
│
├── schedule/                   # 排程任務
│   ├── everysec/               # 每秒執行
│   │   └── process_send_queue.js
│   ├── everymin/               # 每分鐘執行 (目前無任務)
│   └── every5min/              # 每5分鐘執行
│       ├── fix_user_rpg_database.js
│       └── upload_db_files.js
│
├── db/                         # 資料庫目錄 (JSON 平坦結構)
│   ├── database.json           # 主資料庫 (用戶/伺服器通用資料)
│   ├── rpg_database.json       # RPG 主資料庫 (角色資料)
│   ├── rpg_farm.json           # RPG 農耕資料
│   ├── rpg_shop.json           # RPG 商店資料
│   ├── bake_db.json            # RPG 烘烤作業資料
│   ├── smelt_db.json           # RPG 熔煉作業資料
│   ├── dvoice_db.json          # 動態語音頻道資料
│   ├── music.json              # 音樂相關資料
│   └── serverIP.json           # 伺服器 IP 資料
│
├── server/                     # Express HTTP 伺服器
│   └── index.js
│
├── database_recovery/          # 資料庫恢復工具
│   └── main.py                 # Python 恢復腳本
│
├── changelog/                  # 更新日誌 (新增)
│   └── 20260223_214658.md      # v1.0.0 更新記錄
│
├── ai_update/                  # AI 操作記錄
│
├── .bailurules/                # AI IDE 規則
│   ├── aiUpdateMd.md           # AI 更新記錄規則
│   ├── r-w_project_structure.md # 專案結構讀寫規則
│   └── toolsUsage.md           # 工具使用規則
│
└── 開發工具腳本
    ├── check_circular_dependencies.js  # 檢查循環依賴
    ├── generateDependencyReport.js     # 生成依賴報告
    ├── downloadFile.js                 # 下載檔案工具
    └── test.js                         # 測試腳本
```

---

## 啟動流程

### 前置準備

1. **安裝 Node.js** (建議 v18+)
2. **安裝 FFmpeg** (音樂播放必需)
3. **建立 Discord Bot** 並取得 Token

### 環境設定

建立 `.env` 檔案：
```env
TOKEN=你的_Discord_Bot_Token
CLIENT_ID=你的_Bot_Client_ID
```

### 啟動步驟

```bash
# 1. 安裝依賴
npm i --save

# 2. 啟動機器人
npm start

# 3. 測試模式 (可選)
npm test
```

### Docker 部署

```bash
docker build -t dogbot .
docker run -d --name dogbot --env-file .env -v ./db:/app/db dogbot
```

### 命令列指令 (運行中)

| 指令 | 功能 |
|------|------|
| `stop` | 安全關閉機器人 |
| `fstop` | 強制關閉 (不建議) |
| `music` | 查看音樂播放器狀態 |
| `musicd <depth>` | 詳細音樂播放器資訊 |

---

## 功能模組說明

### RPG 遊戲系統

職業與工作指令：

| 職業 | 工作指令 | 生產物品 |
|------|---------|---------|
| 漁夫 (Fisher) | `/fish` | 生魚類 |
| 農夫 (Farmer) | `/farm` | 作物 |
| 礦工 (Miner) | `/mine` | 礦物 |
| 伐木工 (Lumberjack) | `/chop` | 木材 |
| 牧農 (Herder) | `/herd` | 動物產品 |
| 鐵匠 (Blacksmith) | `/make` | 武器防具 |
| 廚師 (Cook) | `/cook`, `/bake` | 食物 |
| 藥劑師 (Pharmacist) | `/brew` | 藥水 |

遊戲機制：
- 工作冷卻時間根據執行次數動態調整
- 可能出現失敗事件 (炸彈、暴風雨、坍塌等)
- `/make` 合成、`/bake` 烘烤、`/smelt` 熔煉、`/cook` 烹飪
- 商店買賣、賣出為買入價的 90%
- `/ls` 查看背包

### 音樂系統

| 指令 | 功能 |
|------|------|
| `/play <query>` | 搜尋並播放音樂 |
| `/pause` | 暫停 |
| `/resume` | 繼續 |
| `/skip` | 跳過 |
| `/queue` | 查看佇列 |
| `/nowplaying` | 正在播放 |
| `/join` | 加入語音頻道 |
| `/disconnect` | 離開語音頻道 |
| `/swap <a> <b>` | 交換佇列順序 |

### 管理功能

- **動態語音頻道**: 用戶加入觸發頻道時自動建立專屬頻道，離開後自動刪除
- **前綴系統**: 支援多個自訂前綴，伺服器獨立配置

---

## 資料庫系統

使用 **JSON 檔案** 作為本地資料庫（平坦結構，無子資料夾）。

```
db/
├── database.json       # 主資料庫 (用戶/伺服器通用資料)
├── rpg_database.json   # RPG 主資料庫 (角色資料)
├── rpg_farm.json       # RPG 農耕資料
├── rpg_shop.json       # RPG 商店資料
├── bake_db.json        # RPG 烘烤作業資料
├── smelt_db.json       # RPG 熔煉作業資料
├── dvoice_db.json      # 動態語音頻道資料
├── music.json          # 音樂相關資料
└── serverIP.json       # 伺服器 IP 資料
```

主要操作 (`utils/file.js`)：
- `load_rpg_data(userID)` - 載入 RPG 資料
- `save_rpg_data(userID, data)` - 儲存 RPG 資料
- `loadData(guildID)` - 載入伺服器資料
- `saveData(guildID, data)` - 儲存伺服器資料

資料保護：
- 每5分鐘自動上傳備份至線上儲存
- 每5分鐘執行資料完整性修復
- 所有操作包含錯誤捕獲與鎖定機制

---

## 開發指南

### 新增斜線指令

在 `slashcmd/` 下建立檔案：

```javascript
const { SlashCommandBuilder } = require("discord.js");
module.exports = {
    data: new SlashCommandBuilder()
        .setName("test")
        .setDescription("測試指令"),
    async execute(interaction, client) {
        await interaction.reply("測試成功！");
    }
};
```

指令會透過 `utils/auto_register.js` 自動註冊。

### 新增 Cog (事件處理器)

在 `cogs/` 下建立檔案：

```javascript
const { Events } = require("discord.js");
module.exports = {
    name: Events.MessageCreate,
    async execute(client, message) {
        if (message.content === "ping") await message.reply("pong!");
    }
};
```

Cog 會透過 `utils/load_cogs.js` 自動載入。

### 新增排程任務

根據頻率選擇目錄 (`everysec/` / `everymin/` / `every5min/`)：

```javascript
module.exports = {
    async execute(client) {
        // 任務邏輯
    }
};
```

### 程式碼規範

- 檔案名稱：小寫 + 底線 (e.g. `load_cogs.js`)
- 函數名稱：駝峰式 (e.g. `loadData`)
- 類別名稱：Pascal Case (e.g. `DogClient`)
- 日誌：使用 `get_logger()` 取得 logger 實例
- 錯誤處理：所有非同步操作使用 try-catch

---

## 版本歷史

### v1.0.1 (2026/2/24 - 當前版本)
- 新增 `error_reader.js` 開發工具
- 新增 `changelog/` 目錄
- 修正 RPG `&shop add` 不存在物品的處理
- 修正 logger 模組名稱顯示為 unknown 的問題
- 更新 `discord-api-types` 套件版本
- 調整部分物品的 price 與 hunger 數值
- 重新命名：`哈哈哈熱狗` -> `烤哈狗`
- 重新命名：`wait_until_ready.js` -> `wait_for_client.js`

### v1.0.0 (2026/2/2)
- 完整的 RPG 遊戲系統
- 音樂播放功能
- 伺服器管理功能
- 排程系統
- 資料庫備份

---

## 授權

本專案使用 **MIT License**

---

**文檔最後更新**: 2026/2/24
**文檔版本**: 1.0.1
**專案版本**: 1.0.1
