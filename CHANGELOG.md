# Changelog

所有重要變更都會記錄在此。版本格式遵循 Semantic Versioning。

## Unreleased

### Added

- 支援將一張或多張 JPG、PNG、WebP、GIF 直接拖入 Stylebase 視窗匯入。
- 加入全視窗拖放提示、格式拒絕回饋與匯入中重複操作保護。
- 加入素材右鍵選單，可檢視、加入批次、送交 Codex 或移到本機垃圾桶。
- 移除素材前會二次確認，原圖保留於 `library/trash`，索引、分析、佇列與收藏關聯一併清理。
- 加入一鍵「複製 Agent Prompt」，將最新 Codex 分析、原圖路徑、設計證據、約束與成功條件匯出為 Markdown。
- 加入蒸餾過的「Styleboard Brief」匯出，以原圖為視覺事實，只保留關鍵 Visual DNA、色彩角色、採用理由與轉譯邊界；原本的 Agent Prompt 保留為「完整分析」。
- Inspector 顯示 Codex 偵測標籤，並支援新增、移除與全文搜尋獨立保存的自訂標籤。
- Codex 與自訂標籤皆可點擊索引；支援多標籤交集篩選，並在上方索引欄逐一移除或一次清除條件。

### Fixed

- Codex 佇列背景輪詢不再中斷 Inspector 輸入；未儲存草稿、焦點、游標位置與捲動位置會跨刷新保留。

## [1.0.0] - 2026-07-30

### Added

- 本地圖片匯入、掃描、SHA-256 去重與 SQLite 索引。
- 以 FTS5 搜尋設計分類、風格、描述與提示詞。
- Codex 單工分析佇列、一次性 session、唯讀 sandbox 與 JSON Schema 驗證。
- Visual DNA、色票、實作建議與 Prompt Kit。
- 來源、作者、授權備註、收藏與人工修正介面。
- CSP-safe SVG 色票與桌面／手機響應式版面。
- 學員 README、完整教學、SKOOL 文案、架構、隱私、疑難排解與驗證文件。
- GitHub Actions 與開源內容防誤上傳檢查。

### Security

- 服務固定綁定 `127.0.0.1`。
- `.env`、SQLite 與 `library/inbox` 素材預設不進入版本控制。
- 公開版本未包含講師的資料庫、分析結果或參考圖片。
