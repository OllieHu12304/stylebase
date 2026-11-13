# Stylebase｜設計靈感資料庫（Ollie 自訂版）

> 把散落的網頁、UI、產品與品牌設計截圖，整理成可搜尋、可分析、可轉成 Agent 交接文件的本地資料庫。

Stylebase 是一套 local-first 視覺參考資料庫。圖片與 SQLite 資料只保存在自己的電腦；只有使用者主動按下「送交 Codex」時，選取的圖片才會交給本機已登入的 Codex CLI 分析。

## 出處與致謝

本專案衍生自 **Winston** 的開源教材專案：

- 原始倉庫：[Winston774/Winston-10xAI-Toolspack](https://github.com/Winston774/Winston-10xAI-Toolspack)
- 原始路徑：`weeks/2026/2026-w31-stylebase-design-inspiration-library/completed/stylebase-design-inspiration-library`
- 原始版本：2026-W31 Stylebase `v1.0.0`（以 Toolspack tag `2026-w33-v1.0.0` 為基礎 clone）
- 原始授權：MIT License，Copyright (c) 2026 Winston

本倉庫以 `git subtree split` 從原倉庫抽出 Stylebase 子目錄，**保留原作者的 commit 紀錄**，之後的 commit 為 Ollie 的自訂修改。原作者的版權聲明保留於 [LICENSE](LICENSE)。本倉庫不是原作者的官方版本，問題請回報至本倉庫，不要打擾原作者。

## 與原版的差異

以下功能為本 fork 新增或修改，原版 `v1.0.0` 沒有：

| 範圍 | 自訂內容 |
|---|---|
| 匯入 | 將一張或多張圖片直接拖進視窗匯入，含全視窗拖放提示、格式拒絕回饋與匯入中防重複操作。 |
| 素材管理 | 素材右鍵選單（也支援 `Shift+F10`／選單鍵）：檢視、加入／移出批次、送交 Codex、從目前收藏集移出、移到垃圾桶。 |
| 可復原移除 | 「移到垃圾桶」會二次確認，原圖移到 `library/trash`，同步清理索引、分析、佇列與收藏集關聯；分析中的素材不可移除。 |
| 自訂標籤 | Inspector 顯示 Codex 偵測標籤，並可新增最多 50 個自訂標籤（每個 ≤ 80 字）；自訂標籤獨立保存，重新分析不會覆蓋。 |
| 標籤索引 | 點擊任一 Codex 或自訂標籤即可篩選；可疊加多個標籤取交集（AND），每個條件以「包含」做不分大小寫的模糊比對，可與自由文字搜尋並用。 |
| Agent 匯出 | 「複製 Styleboard Brief」：以原圖路徑為視覺事實，只保留關鍵 Visual DNA、色彩角色與轉譯邊界；「複製完整分析」：含完整 Visual DNA、Prompt Kit 與分析來源。 |
| 批次選取 | 「全選本頁／取消全選」、批次送交 Codex、批次加入收藏集（只加入分析完成的素材，會提示略過數量）。 |
| 收藏集管理 | 重新命名、刪除（素材保留）、拖曳或按鈕調整順序、從收藏集移出素材；收藏集卡片顯示最多 4 張近期封面拼貼。 |
| 輸入保護 | Codex 佇列背景輪詢不再中斷 Inspector 輸入，未儲存草稿、焦點、游標與捲動位置會保留。 |
| Codex 穩定性 | 檔名含逗號或空白時，先複製成安全暫存檔再送交，避免 CLI 把一個路徑拆成多張圖；信心度近 0 且表示無法讀圖的結果不會被存成完成。 |
| 分析提示詞 | 精簡分析指令，要求每個欄位 1–2 句、只描述可見像素證據，降低 token 消耗。 |

完整變更見 [CHANGELOG.md](CHANGELOG.md) 的 `Unreleased` 段落。

## 功能總覽

- **匯入**：從 `library/inbox`（可含子資料夾）掃描，或用「匯入影像」、拖放匯入 JPG、JPEG、PNG、WebP、GIF。
- **索引**：以 SHA-256 內容雜湊去重，建立 SQLite 索引與 FTS5 全文搜尋；資料夾有變動時自動重新掃描。
- **瀏覽**：素材庫／待整理／收藏集三個視圖；依設計領域（網頁、UI、產品、品牌、概念）、分析狀態篩選，並可依最新加入、名稱或分析狀態排序。
- **搜尋**：按 `/` 聚焦搜尋列，自由文字會比對分類、風格、描述、提示詞與標籤；可與多標籤交集同時使用。
- **Codex 分析**：主動送交後進入單工佇列，產生 Visual DNA、構圖／字體／色彩描述、色票、實作建議與 Prompt Kit；Codex 未就緒時工作會停在可重試狀態。
- **Inspector**：檢視與編輯來源網址、作者、授權備註與人工欄位；可拖曳調整寬度，方向鍵切換影像、`Esc` 關閉。
- **收藏集**：人工策展的素材分組，支援建立、重新命名、排序、刪除與批次加入。
- **設定**：查看監看資料夾、指定 Codex 模型、檢查 Codex CLI 狀態。
- **安全預設**：服務只綁定 `127.0.0.1`，不對區域網路或網際網路公開；素材庫為空時顯示標示為「合成示意」的示範卡片，不會被儲存或送交。

## 快速開始

### 需求

- Windows 10／11（原版主要驗證環境；其他系統可嘗試 `npm start`，未經完整驗證）。
- Node.js 24 或更新版本（使用內建 `node:sqlite`）。
- 只瀏覽、搜尋與手動整理時，不需要 Codex。
- 要使用 AI 圖片分析時，需安裝並登入 [OpenAI Codex CLI](https://github.com/openai/codex)。

本專案沒有第三方 npm 依賴，不需要執行 `npm install`。

### 啟動

```powershell
git clone https://github.com/OllieHu12304/stylebase.git
cd stylebase
.\start-stylebase.ps1      # 或 npm.cmd start（macOS／Linux：npm start）
```

開啟 <http://127.0.0.1:4177>。

### 選用設定

複製 `.env.example` 為 `.env`：

| 變數 | 用途 |
|---|---|
| `STYLEBASE_PORT` | 服務埠號，預設 `4177`。 |
| `STYLEBASE_CODEX_MODEL` | 指定 Codex 模型；留空則用 Codex 預設。 |
| `STYLEBASE_CODEX_EXECUTABLE` | `codex` 不在 PATH 時指定執行檔路徑。 |

### 啟用 Codex 分析

```powershell
npm.cmd install -g @openai/codex
codex login
codex login status
```

## 使用流程

```text
圖片匯入（資料夾／按鈕／拖放）
  → SHA-256 去重 → SQLite 索引
  → 瀏覽、搜尋、補充來源
  → 主動按「送交 Codex」→ 單工佇列 → JSON Schema 驗證
  → Visual DNA／色票／Prompt Kit 回寫
  → 加標籤、整理收藏集 → 匯出 Styleboard Brief 給 Agent
```

1. 把圖片放進 `library/inbox`，或直接拖進 Stylebase 視窗。
2. 選取圖片（`Ctrl`／`Cmd` 點擊、右上角選取框或「全選本頁」）後按「送交 Codex」。
3. 在「Codex 分析佇列」查看進度；同一時間只執行一個工作。
4. 完成後檢查 Visual DNA 與 Codex 標籤，視需要加入自訂標籤。
5. 點擊標籤建立索引條件，繼續點其他標籤取交集；上方索引欄可逐一移除或清除。
6. 用批次列把挑出的素材加入收藏集。
7. 按「複製 Styleboard Brief」，連同原圖交給 UI/UX 專案的 Agent，並補上本次任務。
8. 補上來源、作者與授權備註，避免把靈感誤認成可直接複製的資產。
9. 不需要的素材按右鍵「移到垃圾桶」；原圖保留在 `library/trash`，可人工移回 inbox 再掃描。

## Agent 匯出如何選

原圖是視覺事實，匯出內容負責告訴 Agent 應注意哪些證據、如何轉譯，以及哪些部分不應照抄。

| 匯出內容 | 適合情境 | 交給 Agent 的方式 |
|---|---|---|
| **Styleboard Brief（推薦）** | 建立 design board、視覺方向、頁面概念或跨素材比較 | 貼上 Brief 並附原圖（或確認 Brief 內的本機路徑可讀），再補上產品、使用者、平台與交付範圍。 |
| **完整分析** | 審查 Codex 判讀、追溯分析版本，或 Agent 無法看圖時的文字備援 | 若 Agent 能看原圖，通常不需與 Brief 同時提供，以免重複消耗 token。 |
| **UI 實作 Prompt** | 方向已定，要實作單一頁面或元件 | 從 Inspector 的 Prompt Kit 複製，補上目標 repository、既有元件與驗收條件。 |
| **Design tokens Prompt** | 建立或調整色彩、字級、間距 token | 附上既有 token 檔位置，不要同時要求整頁重做。 |
| **視覺生成 Prompt** | mood image、背景、材質探索 | 交給影像生成工具，附原圖作構圖參考；不要當成 UI 規格。 |

最小交接格式：

```text
[貼上 Styleboard Brief]

本次任務：為＿＿產品的＿＿使用者，在＿＿平台產出＿＿。
交付範圍：＿＿。
必須沿用：＿＿。
不要更動：＿＿。
原始圖片：附檔，或確認 Brief 內的本機路徑可讀。
```

多張參考圖時，先用標籤篩出少量候選，每張各匯出一份 Brief，並指定角色（例如「A 只參考資訊層級、B 只參考色彩」）。不要把整個素材庫一次貼給 Agent。

## 專案結構

```text
stylebase/
├─ server.mjs           本機 HTTP 服務與 API（只綁定 127.0.0.1）
├─ src/
│  ├─ db.mjs            SQLite 結構、FTS5、標籤查詢、收藏集
│  ├─ library.mjs       掃描、去重、匯入、垃圾桶
│  ├─ codex-agent.mjs   Codex CLI 呼叫、安全暫存、輸出驗證
│  └─ analysis-schema.mjs  分析指令與 JSON Schema
├─ public/              介面（app.js、agent-prompt.js、drop-import.js…）
├─ tests/               Node 測試
├─ scripts/             smoke test 與發布前檢查
├─ docs/                架構、隱私、疑難排解、驗證文件
├─ library/inbox/       原始圖片（Git 忽略）
├─ library/trash/       已移除原圖（Git 忽略）
└─ data/                SQLite 資料庫（Git 忽略）
```

## 資料與隱私邊界

- 匯入、掃描、搜尋、標籤與收藏集都不會呼叫 AI。
- 只有按「送交 Codex」才會把該張圖片傳至 Codex 服務。
- 兩種匯出都只寫入本機剪貼簿；貼到其他服務前請檢查本機路徑、來源與筆記。
- Stylebase 不保存 API Key，沿用本機 Codex CLI 的登入狀態。
- Agent 工作採一次性 session、唯讀 sandbox 與嚴格 JSON Schema。
- `data/`、`.env`、SQLite 檔與 `library/inbox`、`library/trash` 圖片都不會提交到 Git。
- 請勿分析機密、個資或沒有權利上傳的圖片。

詳見[資料、隱私與圖片權利](docs/privacy-and-content-rights.md)。

## 開發與驗證

```powershell
npm.cmd run check              # 語法檢查
npm.cmd test                   # Node 測試
npm.cmd run smoke              # 隔離暫存目錄的 HTTP 冷啟動測試
npm.cmd run validate:release   # 必要文件、連結、版本、授權與敏感檔檢查
npm.cmd run validate           # 以上全部
```

## 備份

先停止 Stylebase，再備份 `library/`（原始圖片）與 `data/`（索引、分析、標籤與收藏集）。缺少資料庫時可重新掃描，但既有分析、自訂標籤與人工欄位需從備份還原。

## 已知邊界

- 支援 JPG、JPEG、PNG、WebP、GIF，不處理影片與 PDF。
- AI 分析是可編輯的設計觀察，不代表事實、權利狀態或專業判斷。
- `node:sqlite` 可能顯示 ExperimentalWarning；測試會驗證所需功能。
- 本專案不是 OpenAI 官方產品，也不包含任何 Codex 服務額度。

## 延伸文件

- [教學講義（原作者）](lesson.md)
- [系統架構與 Agent Workflow](docs/architecture.md)
- [資料、隱私與圖片權利](docs/privacy-and-content-rights.md)
- [疑難排解](docs/troubleshooting.md)
- [自動驗證與人工驗收](docs/verification.md)

## 授權

程式碼與文件採 [MIT License](LICENSE)：原始程式 Copyright (c) 2026 Winston；本 fork 的修改 Copyright (c) 2026 Ollie Hu。

你匯入的圖片不會因為放進 Stylebase 就改採 MIT，仍受原作者與來源平台的授權條款約束。
