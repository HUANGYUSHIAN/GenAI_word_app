# OAuth 無限循環問題完整分析與解決方案

## 📋 問題症狀

### 本地環境（正常）
- ✅ OAuth 登入後正常跳轉到首頁
- ✅ Session 正確建立
- ✅ Cookie 正確設置

### Vercel 生產環境（異常）
- ❌ OAuth 登入後陷入無限循環：`/login` ↔ `/`
- ❌ 日誌顯示：
  ```
  GET /login → 307 → /
  GET / → 200 /api/auth/session
  GET /login → 307 → /
  GET / → 200 /api/auth/session
  ...
  ```
- ❌ Session 無法正確建立或讀取
- ❌ Cookie 可能無法正確設置

## 🔍 根本原因分析

### 為什麼本地正常但 Vercel 不正常？

通過對比正常運行的 `xcopy` 項目，發現了三個關鍵差異：

#### 1. Cookie 配置不一致（最關鍵）

**問題**：
- NextAuth 在生產環境（HTTPS）會自動使用 `__Secure-next-auth.session-token` 作為 cookie 名稱
- 但我們的配置可能使用了 `next-auth.session-token`
- Middleware 讀取 cookie 時使用的名稱與 NextAuth 設置的名稱不一致
- 導致 middleware 無法讀取到 session，認為用戶未登入，重定向到 `/login`
- 登入頁面檢測到已認證（因為 NextAuth 已設置 cookie），又重定向到 `/`
- 形成無限循環

**本地 vs Vercel 差異**：

| 環境 | 協議 | Cookie 名稱 | Secure | 結果 |
|------|------|------------|--------|------|
| 本地 | `http://` | `next-auth.session-token` | `false` | ✅ 正常 |
| Vercel | `https://` | `__Secure-next-auth.session-token` | `true` | ❌ 不一致導致循環 |

#### 2. Middleware 攔截 OAuth Callback

**問題**：
- Middleware 可能攔截了 `/api/auth/callback/google` 路由
- 導致 OAuth 回調無法正確處理
- Session 無法建立

**為什麼本地正常但 Vercel 不正常？**
- 本地環境：開發模式可能較寬鬆，middleware 行為不同
- Vercel 生產環境：嚴格執行，任何攔截都會導致問題

#### 3. 客戶端重定向邏輯衝突

**問題**：
- 登入頁面使用 `useSession` 檢查狀態並自動重定向
- 與 NextAuth 的重定向機制衝突
- 在 session 建立過程中觸發循環

## ✅ 解決方案（基於 xcopy 項目對比）

通過對比正常運行的 `xcopy` 項目，發現了三個關鍵修復點：

### 1. 修復 Cookie 配置（最關鍵）

#### 問題根源

NextAuth 在生產環境（HTTPS）會自動使用 `__Secure-next-auth.session-token` 作為 cookie 名稱，但我們的配置和 middleware 可能使用了不同的名稱，導致無法讀取。

#### 修復方法

```typescript
// src/lib/auth.ts
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === "production" 
      ? "__Secure-next-auth.session-token"  // 生產環境使用 __Secure-* 前綴
      : "next-auth.session-token",           // 開發環境使用普通名稱
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production", // 生產環境必須 true
      // 不設置 domain，讓瀏覽器自動處理（Vercel 需要）
    },
  },
},
```

#### 為什麼這樣修復？

1. **`__Secure-*` 前綴**：
   - 瀏覽器要求使用 `__Secure-*` 前綴的 cookie 必須在 HTTPS 下設置
   - 這確保了生產環境的安全性
   - NextAuth 在生產環境會自動使用這個前綴

2. **明確指定 cookie 名稱**：
   - 確保 NextAuth 設置的 cookie 名稱與 middleware 讀取的名稱一致
   - 這是解決無限循環的關鍵

3. **不設置 domain**：
   - Vercel 使用多個域名（如 `*.vercel.app`）
   - 設置 domain 可能導致 cookie 無法正確設置
   - 讓瀏覽器自動處理是最安全的做法

### 2. 修復 Middleware（關鍵）

#### 問題根源

Middleware 可能攔截了 OAuth callback 路由，導致 session 無法建立。必須最優先跳過 callback 路由，並明確指定 cookie 名稱。

#### 修復方法

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 最優先：完全跳過 OAuth callback 路由
  // 這是關鍵！確保 callback 路由完全不被 middleware 處理
  if (pathname.startsWith("/api/auth/callback/")) {
    return NextResponse.next();
  }

  // 允許 API 路由
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 允許登入頁面
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // 使用 getToken 明確指定 cookie 名稱
  // 必須與 auth.ts 中的配置完全一致
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"  // 必須與 auth.ts 一致
      : "next-auth.session-token",
  });

  // 檢查 token 和 userId
  if (token && token.userId) {
    return NextResponse.next();
  }

  // 重定向到登入頁
  return NextResponse.redirect(new URL("/login", request.url));
}
```

#### 為什麼這樣修復？

1. **最優先跳過 callback 路由**：
   - OAuth callback 必須由 NextAuth 直接處理
   - 任何攔截都可能導致 session 無法建立
   - 這是解決無限循環的關鍵

2. **明確指定 cookie 名稱**：
   - 確保 middleware 能讀取到正確的 cookie
   - 必須與 `auth.ts` 中的配置完全一致
   - 這是解決無限循環的關鍵

3. **使用 `getToken` 而不是 `withAuth`**：
   - 更靈活，可以明確控制 cookie 名稱
   - 避免 NextAuth 自動處理導致的問題

### 3. 修復登入頁面（關鍵）

#### 問題根源

登入頁面使用 `useSession` 檢查狀態並自動重定向，與 NextAuth 的重定向機制衝突，在 session 建立過程中觸發循環。

#### 修復方法

```typescript
// src/app/login/page.tsx
function LoginForm() {
  // 完全移除 useSession 和所有 session 檢查
  // 完全移除客戶端重定向邏輯
  // 讓 NextAuth 和 middleware 處理所有重定向

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 如果還未掛載，顯示加載狀態（避免 hydration mismatch）
  if (!mounted) {
    return <LoadingState />;
  }

  // 顯示登入表單
  // 如果已認證，middleware 會允許訪問首頁
  // 如果未認證，顯示登入表單
  return <LoginForm />;
}
```

#### 為什麼這樣修復？

1. **移除所有客戶端重定向**：
   - 避免與 NextAuth 的重定向機制衝突
   - 讓 NextAuth 和 middleware 統一處理重定向

2. **移除 session 檢查**：
   - 登入頁面不需要檢查 session
   - Middleware 會處理認證檢查

3. **使用 `mounted` 狀態**：
   - 避免 hydration mismatch
   - 確保只在客戶端執行某些邏輯

## 🎯 關鍵差異：本地 vs Vercel

### 為什麼本地正常但 Vercel 不正常？

| 項目 | 本地環境 | Vercel 生產環境 |
|------|---------|----------------|
| **協議** | `http://` | `https://` |
| **Cookie 名稱** | `next-auth.session-token` | `__Secure-next-auth.session-token` |
| **Secure 屬性** | `false` | `true`（必須） |
| **Session 建立速度** | 較快 | 較慢（網絡延遲） |
| **Middleware 執行** | 較寬鬆 | 嚴格執行 |
| **Cookie 設置** | 較寬鬆 | 嚴格（必須 HTTPS） |

### 關鍵問題

1. **Cookie 名稱不一致**：
   - 本地：NextAuth 使用 `next-auth.session-token`
   - Vercel：NextAuth 使用 `__Secure-next-auth.session-token`
   - 如果配置不正確，middleware 無法讀取到 cookie
   - **這是導致無限循環的主要原因**

2. **Session 建立時機**：
   - 本地：Session 建立較快，可能不會觸發循環
   - Vercel：Session 建立需要時間，在建立過程中觸發了循環

3. **Middleware 行為**：
   - 本地：可能因為開發模式，行為不同
   - Vercel：嚴格執行，任何攔截都會導致問題

## 🔄 完整流程（修復後）

### OAuth 登入流程

1. **用戶點擊登入按鈕**：
   - 登入頁面調用 `signIn("google", { redirect: true })`
   - NextAuth 重定向到 Google 登入頁

2. **Google 回調**：
   - Google 重定向到 `/api/auth/callback/google`
   - **Middleware 最優先跳過此路由**（關鍵！）
   - NextAuth 處理回調，執行 `signIn` callback → `jwt` callback → `session` callback
   - 設置 cookie：`__Secure-next-auth.session-token`（生產環境）

3. **重定向到首頁**：
   - NextAuth 重定向到 `callbackUrl`（通常是 `/`）
   - **Middleware 檢查 token**：
     - 讀取 cookie：`__Secure-next-auth.session-token`（必須與 auth.ts 一致）
     - 使用 `getToken` 解析 token
     - 檢查 `token.userId` 是否存在
   - 如果 `token.userId` 存在，允許訪問
   - 如果不存在，重定向到 `/login`

4. **首頁顯示**：
   - 如果已認證，顯示用戶信息
   - 如果未認證，重定向到登入頁（由 middleware 處理）

### 為什麼修復後不會循環？

1. **Cookie 正確設置和讀取**：
   - `auth.ts` 使用 `__Secure-next-auth.session-token`（生產環境）
   - `middleware.ts` 也使用 `__Secure-next-auth.session-token`（生產環境）
   - 名稱完全一致，middleware 能正確讀取到 cookie

2. **Session 正確建立**：
   - OAuth callback 不被攔截
   - JWT callback 正確設置 `token.userId`
   - Session callback 正確設置 `session.userId`

3. **沒有客戶端重定向衝突**：
   - 登入頁面不進行客戶端重定向
   - 所有重定向由 NextAuth 和 middleware 處理

4. **Middleware 正確檢查**：
   - 明確指定 cookie 名稱
   - 正確檢查 `token.userId`

## 📝 關鍵修復點總結

### 1. Cookie 配置（最關鍵）

```typescript
// ✅ 正確的配置
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === "production" 
      ? "__Secure-next-auth.session-token"  // 生產環境
      : "next-auth.session-token",           // 開發環境
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      // 不設置 domain
    },
  },
},
```

**關鍵點**：
- 生產環境必須使用 `__Secure-next-auth.session-token`
- 必須與 middleware 中的 `cookieName` 完全一致

### 2. Middleware 配置（關鍵）

```typescript
// ✅ 正確的配置
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. 最優先：跳過 OAuth callback
  if (pathname.startsWith("/api/auth/callback/")) {
    return NextResponse.next();
  }

  // 2. 明確指定 cookie 名稱（必須與 auth.ts 一致）
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"  // 必須與 auth.ts 一致
      : "next-auth.session-token",
  });

  // 3. 檢查 token 和 userId
  if (token && token.userId) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
```

**關鍵點**：
- 最優先跳過 `/api/auth/callback/` 路由
- 明確指定 cookie 名稱，必須與 `auth.ts` 完全一致
- 使用 `getToken` 而不是 `withAuth`

### 3. 登入頁面（關鍵）

```typescript
// ✅ 正確的做法
function LoginForm() {
  // 1. 不使用 useSession
  // 2. 不檢查 session 狀態
  // 3. 不進行客戶端重定向
  // 4. 只使用 mounted 狀態避免 hydration mismatch

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingState />;
  }

  return <LoginForm />;
}
```

**關鍵點**：
- 完全移除 `useSession` 和所有 session 檢查
- 完全移除客戶端重定向邏輯
- 讓 NextAuth 和 middleware 處理所有重定向

## 🔧 調試步驟

### 1. 檢查 Cookie

在瀏覽器開發者工具中：
1. Application > Cookies > `https://oauth-test-five.vercel.app`
2. 檢查是否有 `__Secure-next-auth.session-token` cookie
3. 檢查 cookie 屬性：
   - `Secure`: 應該是 `true`
   - `SameSite`: 應該是 `Lax`
   - `HttpOnly`: 應該是 `true`
   - `Path`: 應該是 `/`

### 2. 檢查 Session API

在瀏覽器控制台中：
```javascript
fetch('/api/auth/session').then(r => r.json()).then(console.log)
```

應該返回包含 `userId` 的對象。如果沒有 `userId`，說明 JWT callback 沒有正確設置。

### 3. 檢查 Vercel 日誌

在 Vercel Dashboard > Deployments > Functions Logs 中：
- 查看 NextAuth debug 日誌
- 確認 JWT callback 是否執行
- 確認 Session callback 是否執行
- 確認 `token.userId` 是否正確設置

### 4. 檢查環境變數

在 Vercel Dashboard > Settings > Environment Variables：
- `NEXTAUTH_URL`: 必須是 `https://oauth-test-five.vercel.app`（完整 URL，無尾隨斜線）
- `NEXTAUTH_SECRET`: 必須正確設置（至少 32 字符）
- `GOOGLE_CLIENT_ID`: 必須正確設置
- `GOOGLE_CLIENT_SECRET`: 必須正確設置

## ⚠️ 常見錯誤

### 1. Cookie 名稱不一致（最常見）

**錯誤**：
```typescript
// auth.ts
name: "next-auth.session-token"

// middleware.ts
cookieName: "__Secure-next-auth.session-token"
```

**後果**：Middleware 無法讀取到 cookie，導致無限循環

**解決**：確保兩處使用相同的 cookie 名稱

### 2. 攔截 OAuth Callback

**錯誤**：
```typescript
// middleware.ts
if (pathname.startsWith("/api/")) {
  return NextResponse.next();
}
// 但沒有優先跳過 /api/auth/callback/
```

**後果**：OAuth callback 被攔截，session 無法建立

**解決**：最優先跳過 `/api/auth/callback/` 路由

### 3. 客戶端重定向

**錯誤**：
```typescript
// login/page.tsx
useEffect(() => {
  if (status === "authenticated") {
    window.location.href = "/";
  }
}, [status]);
```

**後果**：與 NextAuth 的重定向機制衝突，導致循環

**解決**：移除所有客戶端重定向邏輯

### 4. 設置 Domain

**錯誤**：
```typescript
cookies: {
  sessionToken: {
    options: {
      domain: ".vercel.app",
    },
  },
},
```

**後果**：Cookie 可能無法正確設置

**解決**：不設置 domain，讓瀏覽器自動處理

## 🚀 快速修復指南

如果遇到無限循環問題，按以下順序檢查：

### 步驟 1：檢查 Cookie 配置

```typescript
// src/lib/auth.ts
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === "production" 
      ? "__Secure-next-auth.session-token"  // ✅ 生產環境
      : "next-auth.session-token",           // ✅ 開發環境
    options: {
      secure: process.env.NODE_ENV === "production", // ✅ 生產環境必須 true
      // 不設置 domain ✅
    },
  },
},
```

### 步驟 2：檢查 Middleware

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ✅ 最優先跳過 callback
  if (pathname.startsWith("/api/auth/callback/")) {
    return NextResponse.next();
  }

  // ✅ 明確指定 cookie 名稱（必須與 auth.ts 一致）
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"  // ✅ 必須與 auth.ts 一致
      : "next-auth.session-token",
  });

  // ✅ 檢查 token 和 userId
  if (token && token.userId) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
```

### 步驟 3：檢查登入頁面

```typescript
// src/app/login/page.tsx
function LoginForm() {
  // ✅ 移除 useSession
  // ✅ 移除所有客戶端重定向
  // ✅ 只使用 mounted 狀態

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingState />;
  }

  return <LoginForm />;
}
```

### 步驟 4：檢查環境變數

- `NEXTAUTH_URL`: 必須是完整 URL，無尾隨斜線
- `NEXTAUTH_SECRET`: 必須正確設置

## 📋 檢查清單

### 部署前檢查

- [ ] Cookie 配置正確（生產環境使用 `__Secure-*`）
- [ ] Middleware 最優先跳過 `/api/auth/callback/`
- [ ] Middleware 明確指定 cookie 名稱（與 auth.ts 一致）
- [ ] 登入頁面移除所有客戶端重定向
- [ ] 登入頁面移除 `useSession` 檢查
- [ ] Vercel 環境變數正確設置

### 部署後檢查

- [ ] 清除瀏覽器 Cookie 後測試
- [ ] 檢查 Cookie 是否正確設置（`__Secure-next-auth.session-token`）
- [ ] 檢查 Session API 是否返回 `userId`
- [ ] 檢查 Vercel 日誌是否有錯誤
- [ ] 測試 OAuth 登入流程
- [ ] 測試測試登入流程

## 🎓 經驗總結

### 關鍵教訓

1. **Cookie 名稱必須一致**：
   - 生產環境必須使用 `__Secure-next-auth.session-token`
   - Cookie 名稱必須在 `auth.ts` 和 `middleware.ts` 中完全一致
   - 這是解決無限循環的關鍵

2. **Middleware 必須跳過 Callback**：
   - OAuth callback 路由必須最優先跳過
   - 任何攔截都可能導致 session 無法建立

3. **避免客戶端重定向**：
   - 讓 NextAuth 和 middleware 處理所有重定向
   - 客戶端重定向容易導致循環

4. **對比正常運行的項目**：
   - 通過對比 `xcopy` 項目發現了真正的問題
   - 之前的修改可能都是無效的
   - 只有最後一步（對比正常項目）才是真正的解決方案

### 開發建議

1. **始終在生產環境測試**：
   - 本地環境可能正常，但生產環境可能有問題
   - 使用 Vercel Preview 部署測試

2. **啟用 Debug 模式**：
   - 在 Vercel 上啟用 NextAuth debug
   - 查看詳細的日誌輸出

3. **檢查 Cookie**：
   - 在瀏覽器開發者工具中檢查 cookie
   - 確認 cookie 名稱和屬性正確

4. **統一配置**：
   - Cookie 名稱必須在 `auth.ts` 和 `middleware.ts` 中一致
   - 使用環境變數統一管理

## 📝 版本信息

- **NextAuth 版本**: v4.24.10
- **Next.js 版本**: 16.0.1
- **修復日期**: 2024-11-12
- **修復方法**: 對比正常運行的 `xcopy` 項目

## 🔗 相關文件

- `src/lib/auth.ts` - NextAuth 配置（Cookie 配置）
- `src/middleware.ts` - Middleware 配置（跳過 callback，明確指定 cookie 名稱）
- `src/app/login/page.tsx` - 登入頁面（移除 useSession 和客戶端重定向）

## 💡 核心要點

**無限循環的根本原因**：
1. Cookie 名稱不一致：`auth.ts` 和 `middleware.ts` 使用了不同的 cookie 名稱
2. Middleware 攔截 callback：導致 session 無法建立
3. 客戶端重定向衝突：與 NextAuth 的重定向機制衝突

**解決方案的核心**：
1. **Cookie 配置**：生產環境使用 `__Secure-next-auth.session-token`，與 middleware 一致
2. **Middleware**：最優先跳過 `/api/auth/callback/`，明確指定 cookie 名稱
3. **登入頁面**：完全移除 `useSession` 和客戶端重定向邏輯

**為什麼對比正常項目才找到真正問題**：
- 之前的修改可能都是無效的
- 只有通過對比正常運行的 `xcopy` 項目，才發現了真正的差異
- Cookie 名稱不一致是導致無限循環的根本原因
