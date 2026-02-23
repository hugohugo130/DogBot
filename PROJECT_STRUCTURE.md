# DogBot 專案結構完整說明文檔

> **版本**: 1.0.0
> **最後更新**: 2026/2/2
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

### 🎯 專案簡介

DogBot 是一個功能豐富的 Discord 機器人，主要提供以下核心功能：

- **🎮 RPG 遊戲系統**: 完整的角色扮演遊戲，包含職業、物品、製作、交易等系統
- **🎵 音樂播放系統**: 支援多平台音樂串流播放（SoundCloud、Jamendo 等）
- **⚙️ 伺服器管理**: 動態語音頻道、前綴設定、權限管理
- **📊 資料持久化**: JSON 檔案系統 + 線上備份系統
- **🔄 排程任務**: 定時執行維護任務

### 🛠️ 技術棧

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

### 📦 依賴說明

```json
{
  "discord.js": "處理 Discord API 互動",
  "@discordjs/voice": "語音頻道連接與音訊播放",
  "winston": "結構化日誌記錄",
  "soundcloud.ts": "SoundCloud 音樂搜尋與串流",
  "fluent-ffmpeg": "音訊格式轉換",
  "express": "內建 HTTP 伺服器",
  "axios": "HTTP 請求處理"
}
```

---

## 技術架構

### 🏗️ 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        DogBot 系統                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Discord    │  │   Express    │  │   Database   │      │
│  │   Client     │  │   Server     │  │    (JSON)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│  ┌──────▼──────────────────▼──────────────────▼───────┐     │
│  │              核心事件處理層 (Cogs)                  │     │
│  │  • handle_slashcmd  • on_ready  • rpg_handler     │     │
│  │  • dynamicVoice     • dailySign • AutoComplete     │     │
│  └──────┬──────────────────────────────────────────────┘     │
│         │                                                     │
│  ┌──────▼──────────────────────────────────────────────┐    │
│  │              指令執行層 (SlashCmd)                   │    │
│  │  ├─ Music: play, pause, skip, queue...             │    │
│  │  ├─ RPG: farm, cook, bake, smelt, make...         │    │
│  │  └─ Admin: prefix, setrpg, dynamicvoice...        │    │
│  └──────┬──────────────────────────────────────────────┘    │
│         │                                                     │
│  ┌──────▼──────────────────────────────────────────────┐    │
│  │              工具層 (Utils)                          │    │
│  │  ├─ rpg.js: RPG 遊戲邏輯                           │    │
│  │  ├─ music/: 音樂播放系統                          │    │
│  │  ├─ file.js: 檔案與資料庫操作                     │    │
│  │  ├─ logger.js: 日誌系統                           │    │
│  │  └─ customs/: 自定義類別 (Client, EmbedBuilder)   │    │
│  └────────────────────────────────────────────────────┘     │
│         │                                                     │
│  ┌──────▼──────────────────────────────────────────────┐    │
│  │              排程系統 (Schedule)                     │    │
│  │  ├─ everysec/: 每秒執行                            │    │
│  │  ├─ everymin/: 每分鐘執行                          │    │
│  │  └─ every5min/: 每5分鐘執行                        │    │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 事件流程

#### 1. 機器人啟動流程

```
index.js (主程序)
    ↓
檢查環境變數 (.env)
    ↓
載入資料庫檢查 (checkDBFilesExists)
    ↓
載入 Cogs (事件監聽器)
    ↓
註冊斜線指令 (registcmd)
    ↓
登入 Discord (client.login)
    ↓
觸發 ClientReady 事件
    ↓
啟動排程系統 (run_schedule)
    ↓
機器人就緒 ✓
```

#### 2. 指令執行流程

```
用戶輸入斜線指令
    ↓
Discord API 接收
    ↓
InteractionCreate 事件觸發
    ↓
handle_slashcmd.js (Cog) 接收
    ↓
驗證權限與參數
    ↓
查找對應指令檔案 (slashcmd/...)
    ↓
執行指令邏輯 (execute 函數)
    ↓
回傳結果給用戶
```

#### 3. RPG 系統流程

```
用戶執行 RPG 指令 (如 /farm)
    ↓
檢查職業是否符合
    ↓
檢查冷卻時間
    ↓
讀取用戶 RPG 資料 (load_rpg_data)
    ↓
執行遊戲邏輯 (工作、製作等)
    ↓
更新背包與金幣
    ↓
儲存資料 (save_rpg_data)
    ↓
回傳結果 Embed
```

---

## 核心系統

### 1️⃣ 自定義 Discord Client

**檔案位置**: `utils/customs/client.js`

```javascript
class DogClient extends Client {
    constructor() {
        // 配置 Discord.js Client
        // - 設定 Intents (權限)
        // - 配置快取策略 (Sweepers)
        // - 設定重試機制
    }

    // 核心屬性
    commands: Collection         // 斜線指令集合
    dvoice: Collection          // 動態語音頻道資料
    musicTrackSession: Collection // 音樂追蹤會話
    oven_sessions: Collection   // 烤爐會話 (RPG)
    smelter_sessions: Collection // 熔爐會話 (RPG)
    cook_sessions: Collection   // 烹飪會話 (RPG)
    lock: Object               // 指令鎖 (防止併發)

    // 核心方法
    async getAllGuilds()        // 獲取所有伺服器
    async getGuildMembers()     // 獲取伺服器成員
    async getAllGuildMembers()  // 獲取所有成員
}
```

**特色功能**:
- **快取管理**: 定時清理不活躍的頻道、伺服器、用戶快取
- **分片支援**: 支援多分片部署
- **鎖機制**: 防止 RPG 指令併發執行導致資料不一致

### 2️⃣ RPG 遊戲系統

**檔案位置**: `utils/rpg.js` (1000+ 行)

#### 遊戲數據結構

```javascript
// 職業系統
jobs = {
    fisher: { name: "漁夫", emoji: "fisher", desc: "在海邊釣魚" },
    farmer: { name: "農夫", emoji: "farmer", desc: "種植作物" },
    miner: { name: "礦工", emoji: "ore", desc: "挖掘礦物" },
    lumberjack: { name: "伐木工", emoji: "wood", desc: "砍伐樹木" },
    herder: { name: "牧農", emoji: "cow", desc: "飼養動物" },
    blacksmith: { name: "鐵匠", emoji: "swords", desc: "製作武器" },
    cook: { name: "廚師", emoji: "cook", desc: "烹飪食物" },
    pharmacist: { name: "藥劑師", emoji: "potion", desc: "調製藥水" }
}

// 物品分類
mine_gets: 礦物 (coal, diamond_ore, iron_ore...)
ingots: 錠 (diamond, emerald, gold, iron...)
logs: 原木 (oak_wood, birch_wood...)
planks: 木板 (oak_planks, birch_planks...)
foods: 食物 (bread, beef, potato...)
weapons_armor: 武器防具 (iron_sword, iron_armor...)
brew: 藥水 (regen_potion, lucky_potion...)
```

#### 核心機制

**1. 冷卻系統**
```javascript
// 檢查冷卻時間
is_cooldown_finished(command_name, rpg_data)
    → { is_finished: boolean, remaining_time: number }

// 冷卻時間計算
get_cooldown_time(command_name, rpg_data)
    → 根據執行次數動態計算
```

**2. 合成系統**
```javascript
recipes = {
    iron_sword: {
        input: [
            { item: "stick", amount: 1 },
            { item: "iron", amount: 3 }
        ],
        output: "iron_sword",
        amount: 1
    }
}
```

**3. 熔煉系統**
```javascript
smeltable_recipe = [
    {
        input: { item: "iron_ore", amount: 2 },
        output: "iron",
        amount: 1
    }
]
```

**4. 經濟系統**
```javascript
// 商店價格
shop_lowest_price = {
    diamond: 750,
    iron: 250,
    bread: 125,
    ...
}

// 出售價格 (90% 商店價)
sell_data = Object.keys(shop_lowest_price).reduce(
    (result, key) => {
        result[key] = shop_lowest_price[key] * 0.9;
        return result;
    }, {}
);
```

**5. 金錢交易追蹤**
```javascript
// 增加金錢
add_money({ rpg_data, amount, originalUser, targetUser, type })
    → 更新金幣並記錄交易歷史

// 扣除金錢
remove_money({ rpg_data, amount, originalUser, targetUser, type })
    → 更新金幣並記錄交易歷史
```

### 3️⃣ 音樂播放系統

**檔案位置**: `utils/music/music.js` (800+ 行)

#### 核心類別

**MusicTrack 類別**
```javascript
class MusicTrack {
    id: string              // 音樂 ID
    title: string           // 標題
    url: string            // 來源網址
    duration: number       // 時長 (毫秒)
    thumbnail: string      // 縮圖
    author: string         // 作者
    source: string         // 來源平台 (目前只支援soundcloud)
    stream: Readable       // 音訊串流
    uuid: string           // 唯一識別碼

    async prepareStream()  // 準備音訊串流
}
```

**MusicQueue 類別**
```javascript
class MusicQueue {
    guildID: string              // 伺服器 ID
    tracks: MusicTrack[]         // 播放佇列
    player: AudioPlayer          // 音訊播放器
    currentTrack: MusicTrack     // 目前播放的音樂
    loopStatus: number           // 循環狀態 (0:關閉, 1:單曲, 2:全部)
    connection: VoiceConnection  // 語音連接
    textChannel: TextChannel     // 文字頻道
    voiceChannel: VoiceChannel   // 語音頻道

    // 核心方法
    async play(track)            // 播放音樂
    async addTrack(track)        // 加入佇列
    async nextTrack()            // 下一首
    pause()                      // 暫停
    unpause()                    // 繼續
    shuffle()                    // 隨機播放
    destroy()                    // 銷毀佇列
}
```

#### 音樂搜尋引擎

支援多平台搜尋：
```javascript
search_until(query, amount = 25)
    → 依序搜尋 musicSearchEngine 配置的平台
    → 返回 MusicTrack[]
```

**支援的來源**:
- **SoundCloud**: `utils/music/soundcloud.js`
- **Jamendo**: `utils/music/jamendo.js`
- **直接音訊檔案**: 支援網址直接播放

### 4️⃣ 排程系統

**檔案位置**: `utils/run_schedule.js`

#### 排程類型

| 類型 | 執行頻率 | 目錄 |
|------|---------|------|
| **everysec** | 每秒 | `schedule/everysec/` |
| **everymin** | 每分鐘 | `schedule/everymin/` |
| **every5min** | 每5分鐘 | `schedule/every5min/` |

#### 現有排程任務

**1. process_send_queue.js** (每秒)
- 處理訊息發送佇列
- 避免 Discord API 速率限制

**2. fix_user_rpg_database.js** (每5分鐘)
- 修復用戶 RPG 資料庫異常
- 確保資料完整性

**3. upload_db_files.js** (每5分鐘)
- 上傳資料庫檔案至線上備份
- 防止資料遺失

#### 排程執行機制

```javascript
// 使用鎖機制防止重複執行
run_lock = {}

async function scheduleFunc(client, file, per) {
    // 等待鎖釋放
    await wait_for_lock(basename, 20000)

    // 獲取鎖
    run_lock[basename] = true

    try {
        // 執行排程任務
        await schedule.execute(client)
    } finally {
        // 釋放鎖
        run_lock[basename] = false
    }
}
```

---

## 目錄結構詳解

```
DogBot/
├── index.js                    # 主程式入口
├── register_commands.js        # 斜線指令註冊
├── package.json               # 專案配置
├── .env                       # 環境變數 (需自行建立)
├── .env.example              # 環境變數範例
├── Dockerfile                # Docker 部署配置
│
├── cogs/                     # 事件處理器 (Cogs)
│   ├── on_ready.js          # 機器人就緒事件
│   ├── handle_slashcmd.js   # 斜線指令處理
│   ├── AutoComplete.js      # 自動完成處理
│   ├── dailySign.js         # 每日簽到
│   ├── dynamicVoice.js      # 動態語音頻道
│   ├── getInfoByMention.js  # 提及資訊取得
│   ├── admin_cmds.js        # 管理員指令
│   ├── 過夜.js              # 過夜系統
│   └── rpg/                 # RPG 相關事件
│       ├── msg_handler.js   # RPG 訊息處理
│       └── interactions.js  # RPG 互動處理
│
├── slashcmd/                # 斜線指令
│   ├── ping.js             # Ping 指令
│   ├── info.js             # 資訊指令
│   ├── music/              # 音樂指令
│   │   ├── play.js        # 播放音樂
│   │   ├── pause.js       # 暫停
│   │   ├── resume.js      # 繼續
│   │   ├── skip.js        # 跳過
│   │   ├── queue.js       # 查看佇列
│   │   ├── nowplaying.js  # 正在播放
│   │   ├── join.js        # 加入語音
│   │   ├── disconnect.js  # 離開語音
│   │   └── swap.js        # 交換佇列順序
│   ├── game/rpg/           # RPG 遊戲指令
│   │   ├── farm.js        # 農耕
│   │   ├── cook.js        # 烹飪
│   │   ├── bake.js        # 烘烤
│   │   ├── smelt.js       # 熔煉
│   │   ├── make.js        # 製作
│   │   ├── setLang.js     # 設定語言
│   │   └── admins/        # 管理員 RPG 指令
│   │       └── getuserdata.js
│   └── admins/             # 管理員指令
│       └── guild_only/     # 伺服器限定
│           ├── prefix.js   # 前綴設定
│           ├── setrpg.js   # RPG 設定
│           └── dynamicvoice.js # 動態語音設定
│
├── utils/                   # 工具模組
│   ├── rpg.js              # RPG 遊戲邏輯 (1000+ 行)
│   ├── config.js           # 配置管理
│   ├── logger.js           # 日誌系統
│   ├── file.js             # 檔案操作
│   ├── language.js         # 多語言支援
│   ├── message.js          # 訊息處理
│   ├── discord.js          # Discord 工具
│   ├── random.js           # 隨機工具
│   ├── timestamp.js        # 時間戳處理
│   ├── cache.js            # 快取管理
│   ├── onlineDB.js         # 線上資料庫
│   ├── auto_register.js    # 自動註冊指令
│   ├── check_db_files.js   # 資料庫檢查
│   ├── check.env.js        # 環境變數檢查
│   ├── hot_reload.js       # 熱重載
│   ├── load_cogs.js        # 載入 Cogs
│   ├── loadslashcmd.js     # 載入斜線指令
│   ├── run_schedule.js     # 排程執行器
│   ├── safeshutdown.js     # 安全關閉
│   ├── wait_for_client.js # 等待就緒
│   ├── sleep.js            # 延遲工具
│   ├── time.js             # 時間工具
│   ├── senderr.js          # 錯誤發送
│   ├── readline.js         # 命令列輸入
│   ├── getSeverIPSync.js   # 取得伺服器 IP
│   ├── delete_user_all_messages.js # 刪除用戶訊息
│   ├── customs/            # 自定義類別
│   │   ├── client.js      # 自定義 Discord Client
│   │   └── embedBuilder.js # 自定義 Embed 建構器
│   └── music/              # 音樂系統
│       ├── music.js        # 音樂核心 (800+ 行)
│       ├── soundcloud.js   # SoundCloud API
│       └── jamendo.js      # Jamendo API
│
├── schedule/               # 排程任務
│   ├── everysec/          # 每秒執行
│   │   └── process_send_queue.js
│   ├── everymin/          # 每分鐘執行
│   └── every5min/         # 每5分鐘執行
│       ├── fix_user_rpg_database.js
│       └── upload_db_files.js
│
├── db/                    # 資料庫目錄 (需自行建立)
│   ├── guilds/           # 伺服器資料
│   ├── users/            # 用戶資料
│   └── rpg/              # RPG 資料
│
├── server/               # Express HTTP 伺服器
│   └── index.js
│
├── database_recovery/    # 資料庫恢復工具
│   └── main.py          # Python 恢復腳本
│
├── ai_update/            # AI 更新記錄
│
├── .bailurules/          # AI IDE 規則
│   ├── aiUpdateMd.md
│   └── toolsUsage.md
│
└── 開發工具腳本
    ├── check_circular_dependencies.js  # 檢查循環依賴
    ├── generateDependencyReport.js     # 生成依賴報告
    ├── downloadFile.js                 # 下載檔案工具
    └── test.js                        # 測試腳本
```

---

## 啟動流程

### 📝 前置準備

1. **安裝 Node.js** (建議 v18+)
2. **安裝 FFmpeg** (音樂播放必需)
3. **建立 Discord Bot** 並取得 Token

### ⚙️ 環境設定

建立 `.env` 檔案：
```env
TOKEN=你的_Discord_Bot_Token
CLIENT_ID=你的_Bot_Client_ID
```

### 🚀 啟動步驟

```bash
# 1. 安裝依賴
npm install

# 2. 檢查循環依賴 (可選)
npm run check-deps

# 3. 啟動機器人
npm start

# 4. 測試模式 (可選)
npm test
```

### 🐳 Docker 部署

```bash
# 建立映像
docker build -t dogbot .

# 執行容器
docker run -d \
  --name dogbot \
  --env-file .env \
  -v ./db:/app/db \
  dogbot
```

### 🖥️ 命令列指令

機器人運行時可使用以下指令：

| 指令 | 功能 |
|------|------|
| `stop` | 安全關閉機器人 |
| `fstop` | 強制關閉 (不建議) |
| `music` | 查看音樂播放器狀態 |
| `musicd <depth>` | 詳細音樂播放器資訊 |

---

## 功能模組說明

### 🎮 RPG 遊戲系統

#### 職業系統

玩家可選擇以下職業：

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

#### 遊戲機制

**1. 工作系統**
- 每個職業有專屬工作指令
- 有冷卻時間限制 (根據執行次數動態調整)
- 可能失敗 (炸彈、暴風雨、坍塌等事件)
- 成功後獲得物品與經驗

**2. 製作系統**
- `/make`: 根據配方合成物品
- `/bake`: 烘烤食物
- `/smelt`: 熔煉礦石
- `/cook`: 烹飪食物

**3. 經濟系統**
- 商店系統：買賣物品
- 交易追蹤：記錄所有金錢流動
- 價格機制：買價與賣價 (90%)

**4. 背包系統**
- `/ls`: 查看背包
- 物品分類顯示
- 隱私權設定

### 🎵 音樂系統

#### 支援的指令

| 指令 | 功能 | 說明 |
|------|------|------|
| `/play <query>` | 播放音樂 | 搜尋並播放 |
| `/pause` | 暫停 | 暫停當前播放 |
| `/resume` | 繼續 | 繼續播放 |
| `/skip` | 跳過 | 跳過當前歌曲 |
| `/queue` | 佇列 | 查看播放佇列 |
| `/nowplaying` | 正在播放 | 顯示當前歌曲 |
| `/join` | 加入 | 加入語音頻道 |
| `/disconnect` | 離開 | 離開語音頻道 |
| `/swap <a> <b>` | 交換 | 交換佇列順序 |

#### 播放流程

```
用戶執行 /play <query>
    ↓
search_until() 搜尋音樂
    ↓
創建 MusicTrack 物件
    ↓
getQueue() 取得或創建佇列
    ↓
addOrPlay() 加入佇列或直接播放
    ↓
prepareStream() 準備音訊串流
    ↓
createAudioResource() 創建音訊資源
    ↓
player.play() 開始播放
    ↓
發送「正在播放」訊息
```

### ⚙️ 管理功能

#### 動態語音頻道

**功能**: 自動創建和刪除臨時語音頻道

- 用戶加入特定頻道時自動創建專屬語音頻道
- 用戶離開後自動刪除空頻道
- 可設定頻道名稱格式

#### 前綴系統

- 支援多個自訂前綴
- 保留前綴系統 (預設前綴無法刪除)
- 伺服器獨立配置

---

## 資料庫系統

### 📊 資料庫架構

使用 **JSON**  作為本地資料庫。

#### 資料庫檔案結構

```
db/
├── guilds/              # 伺服器資料庫
│   └── {guildID}.db    # 每個伺服器一個資料庫
├── users/               # 用戶資料庫
│   └── {userID}.db     # 每個用戶一個資料庫
└── rpg/                 # RPG 資料庫
```

### 🔄 資料庫操作

**檔案位置**: `utils/file.js`

```javascript
// 載入 RPG 資料
async load_rpg_data(userID)
    → 返回用戶的 RPG 資料物件

// 儲存 RPG 資料
async save_rpg_data(userID, data)
    → 將資料寫入資料庫

// 載入伺服器資料
async loadData(guildID)
    → 返回伺服器配置

// 儲存伺服器資料
async saveData(guildID, data)
    → 更新伺服器配置
```

### 🛡️ 資料保護

**1. 定期備份** (`schedule/every5min/upload_db_files.js`)
- 每5分鐘上傳資料庫至線上儲存
- 防止資料遺失

**2. 資料完整性檢查** (`schedule/every5min/fix_user_rpg_database.js`)
- 檢查並修復損壞的資料
- 確保資料結構正確

**3. 錯誤處理**
- 所有資料庫操作都有錯誤捕獲
- 資料庫鎖定機制防止併發寫入

---

## 開發指南

### 🔧 新增斜線指令

1. **建立指令檔案**

在 `slashcmd/` 目錄下建立新檔案，例如 `slashcmd/test.js`:

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

2. **重啟機器人**

指令會自動註冊 (透過 `utils/auto_register.js`)

### 🎯 新增 Cog (事件處理器)

1. **建立 Cog 檔案**

在 `cogs/` 目錄下建立檔案，例如 `cogs/my_event.js`:

```javascript
const { Events } = require("discord.js");

module.exports = {
    name: Events.MessageCreate,  // Discord 事件名稱
    
    async execute(client, message) {
        // 處理邏輯
        if (message.content === "ping") {
            await message.reply("pong!");
        }
    }
};
```

2. **重啟機器人**

Cog 會自動載入 (透過 `utils/load_cogs.js`)

### ⏰ 新增排程任務

1. **建立排程檔案**

根據執行頻率選擇目錄：
- `schedule/everysec/` - 每秒
- `schedule/everymin/` - 每分鐘
- `schedule/every5min/` - 每5分鐘

例如 `schedule/everymin/my_task.js`:

```javascript
module.exports = {
    async execute(client) {
        console.log("每分鐘執行的任務");
        
        // 執行任務邏輯
        // 例如：清理過期資料、發送通知等
    }
};
```

2. **重啟機器人**

排程會自動註冊並執行

### 📝 程式碼規範

#### 命名規範

```javascript
// 檔案名稱：小寫 + 底線
// utils/load_cogs.js ✓
// utils/LoadCogs.js ✗

// 函數名稱：駝峰式
async loadData(guildID) { ... }  ✓
async load_data(guildID) { ... }  ✗

// 類別名稱：Pascal Case
class DogClient { ... }  ✓
class dogClient { ... }  ✗

// 常數：全大寫 + 底線
const MAX_USERS = 100;  ✓
const maxUsers = 100;   ✗
```

#### 錯誤處理

```javascript
// 使用 try-catch 包裹可能出錯的代碼
try {
    await someAsyncFunction();
} catch (error) {
    const logger = get_logger();
    logger.error(`錯誤: ${error.stack}`);
}
```

#### 日誌記錄

```javascript
const { get_logger } = require("./utils/logger.js");
const logger = get_logger();

logger.info("資訊訊息");
logger.warn("警告訊息");
logger.error("錯誤訊息");
logger.debug("除錯訊息");
```

### 🧪 測試

```bash
# 執行測試
npm test

# 檢查循環依賴
npm run check-deps
```

### 🐛 除錯技巧

**1. 啟用 Debug 模式**

在 `index.js` 中設定：
```javascript
const args = process.argv.slice(2);
const debug = args.includes("--debug");
```

執行：
```bash
node index.js --debug
```

**2. 檢查音樂播放器狀態**

在運行中的機器人命令列輸入：
```
music      # 查看播放器統計
musicd 5   # 查看詳細資訊 (深度 5)
```

**3. 查看日誌**

日誌使用 Winston 記錄，檢查控制台輸出

### 🔐 安全性建議

1. **絕對不要將 `.env` 檔案提交至 Git**
   - 已在 `.gitignore` 中排除

2. **定期更新依賴**
   ```bash
   npm update
   npm audit fix
   ```

3. **使用環境變數管理敏感資訊**
   - Token、API Keys 等都應放在 `.env`

4. **權限最小化原則**
   - 只給機器人必要的 Discord 權限

### 📚 常見問題

**Q: 音樂無法播放？**
- 確認已安裝 FFmpeg
- 檢查機器人是否有連接語音頻道權限
- 確認音樂來源 (SoundCloud) 是否可訪問

**Q: RPG 資料遺失？**
- 檢查 `db/rpg/` 目錄是否存在
- 查看備份是否正常運作 (`upload_db_files.js`)
- 使用 `database_recovery/main.py` 恢復資料

**Q: 指令無法註冊？**
- 確認 `.env` 中的 `CLIENT_ID` 正確
- 檢查 Discord Developer Portal 中的 Bot 設定
- 嘗試手動執行 `node register_commands.js`

**Q: 機器人離線？**
- 檢查網路連接
- 確認 Token 是否有效
- 查看日誌中的錯誤訊息
- 檢查 Discord API 狀態

### 🚀 效能優化建議

1. **快取管理**
   - 已實作自動清理機制 (Sweepers)
   - 定期清理不活躍的快取

2. **資料庫優化**
   - 使用索引加速查詢
   - 批次處理大量資料操作

3. **記憶體監控**
   - `index.js` 已實作記憶體警告機制
   - 超過 500MB 時發出警告

4. **CPU 監控**
   - 每30秒檢查一次 CPU 使用率
   - 超過 80% 時記錄警告

---

## 📄 授權

本專案使用 **MIT License**

---

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

---

## 📞 聯絡資訊

- **專案儲存庫**: https://github.com/hugohugo130/DogBot
- **Discord**: 加入支援伺服器取得協助

---

## 📌 版本歷史

### v1.0.0 (當前版本)
- ✅ 完整的 RPG 遊戲系統
- ✅ 音樂播放功能
- ✅ 伺服器管理功能
- ✅ 排程系統
- ✅ 資料庫備份

---

**文檔最後更新**: 2026/2/2
**文檔版本**: 1.0.0
**專案版本**: 1.0.0

---
