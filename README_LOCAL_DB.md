# 本地資料庫使用說明

## 概述

本專案支援兩種資料庫模式：
- **本地資料庫模式**：使用 JSON 文件儲存在 `.local-db/` 目錄
- **MongoDB 模式**：使用 MongoDB Atlas 雲端資料庫

## 設定方式

在 `.env` 或 `.env.local` 文件中設定：

```env
# 使用本地資料庫（開發階段推薦）
DATABASE_local=true

# 或使用 MongoDB（生產環境）
DATABASE_local=false
# DATABASE_URL=mongodb+srv://...
```

## 本地資料庫結構

本地資料庫文件會自動創建在 `.local-db/` 目錄下：

```
.local-db/
├── users.json          # 使用者資料
├── students.json       # 學生資料
├── suppliers.json      # 供應商資料
├── admins.json         # 管理員資料
├── vocabularies.json   # 單字本資料
├── words.json          # 單字資料
├── coupons.json        # 優惠券資料
├── stores.json         # 商店資料
└── comments.json       # 評論資料
```

## 使用本地資料庫的優點

1. **無需網路連接**：不需要連接到 MongoDB Atlas
2. **快速開發**：無需等待資料庫連接
3. **易於測試**：可以輕鬆重置資料庫（刪除 `.local-db/` 目錄）
4. **版本控制**：可以選擇性地將測試資料加入版本控制

## 注意事項

1. `.local-db/` 目錄已加入 `.gitignore`，不會被提交到版本控制
2. 本地資料庫僅適用於開發和測試環境
3. 生產環境建議使用 MongoDB
4. 切換模式時，資料不會自動遷移

## 創建測試管理員帳號

使用本地資料庫時，創建管理員帳號：

```bash
npm run db:create-admin
```

或指定名稱和郵箱：

```bash
npm run db:create-admin "管理員名稱" "admin@example.com"
```

## 重置本地資料庫

如需重置本地資料庫，只需刪除 `.local-db/` 目錄：

```bash
# Windows PowerShell
Remove-Item -Recurse -Force .local-db

# Linux/Mac
rm -rf .local-db
```

下次啟動應用時，會自動重新創建空的資料庫文件。



