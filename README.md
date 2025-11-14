# OAuth 全端框架

這是一個使用 Next.js、NextAuth、Prisma、MongoDB 和 Material-UI 構建的全端 OAuth 認證框架。

## 功能特色

- ✅ Google OAuth 登入
- ✅ 測試登入（使用 User ID）
- ✅ 自動生成 30 字符的唯一 User ID（首次 Google 登入）
- ✅ 會話管理（30 天有效期）
- ✅ Middleware 保護路由
- ✅ Material-UI 現代化界面
- ✅ 資料庫管理腳本

## 環境設定

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

創建 `.env` 文件並填入以下內容：

```env
# Database
DATABASE_URL="mongodb://localhost:27017/oauth"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"
```

### 3. 初始化資料庫

```bash
# 生成 Prisma Client
npm run db:generate

# 推送 schema 到資料庫
npm run db:push
```

## 使用說明

### 啟動開發伺服器

```bash
npm run dev
```

訪問 [http://localhost:3000](http://localhost:3000)

### 登入方式

#### 1. Google OAuth 登入
- 點擊「使用 Google 登入」按鈕
- 首次登入會自動生成 30 字符的唯一 User ID
- Google ID (sub) 會作為唯一鍵值儲存

#### 2. 測試登入
- 使用 `npm run db:seed` 創建測試用戶
- 在登入頁面輸入 User ID 進行登入

### 資料庫管理腳本

#### 創建測試用戶

```bash
# 使用預設值創建
npm run db:seed

# 指定名稱和郵箱
npm run db:seed "John Doe" "john@example.com"
```

#### 查詢用戶資料

```bash
npm run db:query
```

會顯示：
- 總用戶數統計
- 最新 20 個用戶的詳細資訊（表格化）

#### 清除所有資料

```bash
npm run db:clear
```

⚠️ **警告**：此操作會刪除資料庫中所有用戶資料，請謹慎使用！

#### 測試資料庫連接

```bash
npm run db:test
```

此腳本會測試：
- ✅ 資料庫連接
- ✅ 資料庫查詢
- ✅ 資料庫寫入
- ✅ 資料庫刪除

如果連接失敗，會顯示詳細的錯誤訊息和解決建議。

#### 檢查 Google OAuth 回調 URL

```bash
npm run check:oauth
```

此腳本會檢查：
- ✅ GOOGLE_CLIENT_ID 是否設定
- ✅ GOOGLE_CLIENT_SECRET 是否設定
- ✅ NEXTAUTH_URL 是否設定
- ✅ 計算並驗證回調 URL 格式
- ✅ 顯示需要在 Google Cloud Console 中添加的重定向 URI
- ✅ 驗證 Client ID 格式

**特別有用於：**
- 修復 `redirect_uri_mismatch` 錯誤
- 確認 OAuth 配置是否正確
- 獲取需要在 Google Cloud Console 中添加的確切 URI

### 測試環境設定

```bash
npm run test:env
```

此腳本會測試：
- ✅ DATABASE_URL 連接
- ✅ Google OAuth Provider 設定
- ✅ NEXTAUTH_URL 和 NEXTAUTH_SECRET
- ✅ 網站回應狀態

## 專案結構

```
├── prisma/
│   └── schema.prisma          # Prisma 資料庫 schema
├── scripts/
│   ├── create-test-user.ts    # 創建測試用戶腳本
│   ├── query-users.ts         # 查詢用戶腳本
│   └── test-env.ts            # 環境測試腳本
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts    # NextAuth API 路由
│   │   ├── login/
│   │   │   └── page.tsx            # 登入頁面
│   │   ├── layout.tsx              # 根布局
│   │   ├── page.tsx                # 首頁（登入後）
│   │   └── providers.tsx           # 提供者（Session, Theme）
│   ├── lib/
│   │   ├── auth.ts                 # NextAuth 配置
│   │   └── utils.ts                # 工具函數
│   ├── types/
│   │   └── next-auth.d.ts          # NextAuth 類型定義
│   └── middleware.ts               # 路由保護中間件
└── .env                            # 環境變數（需自行創建）
```

## 資料庫 Schema

### User 模型

```prisma
model User {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @unique // 30字符的隨機ID（英文+數字）
  googleId  String?  @unique // Google OAuth的id（sub），作為key
  name      String?
  email     String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Google OAuth 設定

### 基本設定步驟

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用 Google+ API（或 Google Identity API）
4. 創建 OAuth 2.0 憑證
5. **重要**：設定授權重定向 URI

### 重定向 URI 設定

在 Google Cloud Console 的 OAuth 2.0 客戶端設定中，添加以下重定向 URI：

**本地開發環境：**
```
http://localhost:3000/api/auth/callback/google
```

**Vercel 生產環境：**
```
https://your-vercel-domain.vercel.app/api/auth/callback/google
```

**⚠️ 重要：**
- URI 必須完全匹配（包括協議、域名、路徑）
- 如果有多個環境，需要分別添加每個環境的 URI
- 變更後需等待 1-2 分鐘生效

6. 將 Client ID 和 Client Secret 填入 `.env` 文件（或 Vercel 環境變數）

### 遇到 redirect_uri_mismatch 錯誤？

請參考 [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) 獲取詳細的故障排除指南。

## 注意事項

- 首次 Google 登入會自動生成 30 字符的唯一 User ID
- Google ID (sub) 作為唯一鍵值，用於快速查找用戶
- 會話有效期為 30 天
- 測試登入僅允許 Prisma 資料庫中存在的用戶
- 所有路由（除登入頁面外）都需要認證

## 技術棧

- **框架**: Next.js 16
- **認證**: NextAuth.js 4
- **資料庫**: MongoDB + Prisma
- **UI**: Material-UI (MUI) 5
- **語言**: TypeScript

## License

MIT
