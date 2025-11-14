# OAuth 登入功能設置指南

## 🎯 目標

在 Next.js 項目中一次性成功設置 OAuth 登入功能，避免無限循環等常見問題。

## 📋 核心原則

1. **Cookie 名稱必須一致**：`auth.ts` 和 `middleware.ts` 必須使用相同的 cookie 名稱
2. **Middleware 必須跳過 Callback**：OAuth callback 路由必須最優先跳過
3. **避免客戶端重定向**：讓 NextAuth 和 middleware 處理所有重定向

## 🔧 必要配置

### 1. NextAuth 配置 (`src/lib/auth.ts`)

```typescript
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // 首次登入時設置 token
      if (user && account) {
        token.userId = user.id; // 或從數據庫獲取的 userId
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      // 將 token 中的信息添加到 session
      if (token.userId) {
        session.userId = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  // ⚠️ 關鍵：Cookie 配置
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token"  // 生產環境
        : "next-auth.session-token",           // 開發環境
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production", // 生產環境必須 true
        // 不設置 domain
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
```

### 2. Middleware 配置 (`src/middleware.ts`)

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ⚠️ 關鍵：最優先跳過 OAuth callback
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

  // ⚠️ 關鍵：明確指定 cookie 名稱（必須與 auth.ts 一致）
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

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### 3. 登入頁面 (`src/app/login/page.tsx`)

```typescript
"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ⚠️ 關鍵：不使用 useSession，不進行客戶端重定向
  // 讓 NextAuth 和 middleware 處理所有重定向

  const handleGoogleLogin = async () => {
    if (!mounted) return;
    
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    await signIn("google", { 
      callbackUrl,
      redirect: true, // 讓 NextAuth 處理重定向
    });
  };

  if (!mounted) {
    return <LoadingState />;
  }

  return (
    <Container>
      <Button onClick={handleGoogleLogin}>
        使用 Google 登入
      </Button>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
```

### 4. NextAuth API 路由 (`src/app/api/auth/[...nextauth]/route.ts`)

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

## ✅ 檢查清單

### 環境變數

```env
# 本地開發
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Vercel 生產環境
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 代碼檢查

- [ ] `auth.ts` 中 cookie 名稱：生產環境使用 `__Secure-next-auth.session-token`
- [ ] `middleware.ts` 中 cookie 名稱：必須與 `auth.ts` 完全一致
- [ ] `middleware.ts` 最優先跳過 `/api/auth/callback/`
- [ ] 登入頁面不使用 `useSession`
- [ ] 登入頁面不進行客戶端重定向
- [ ] 使用 `mounted` 狀態避免 hydration mismatch

### Google Cloud Console

- [ ] 已創建 OAuth 2.0 客戶端
- [ ] 已添加重定向 URI：`https://your-domain.vercel.app/api/auth/callback/google`
- [ ] 本地開發：`http://localhost:3000/api/auth/callback/google`

## ⚠️ 常見錯誤避免

### ❌ 錯誤 1：Cookie 名稱不一致

```typescript
// ❌ 錯誤
// auth.ts
name: "next-auth.session-token"

// middleware.ts
cookieName: "__Secure-next-auth.session-token"
```

```typescript
// ✅ 正確：兩處必須一致
// auth.ts
name: process.env.NODE_ENV === "production" 
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token"

// middleware.ts
cookieName: process.env.NODE_ENV === "production"
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token"
```

### ❌ 錯誤 2：攔截 OAuth Callback

```typescript
// ❌ 錯誤：沒有優先跳過 callback
if (pathname.startsWith("/api/")) {
  return NextResponse.next();
}
```

```typescript
// ✅ 正確：最優先跳過 callback
if (pathname.startsWith("/api/auth/callback/")) {
  return NextResponse.next();
}
if (pathname.startsWith("/api/")) {
  return NextResponse.next();
}
```

### ❌ 錯誤 3：客戶端重定向

```typescript
// ❌ 錯誤
const { data: session, status } = useSession();
useEffect(() => {
  if (status === "authenticated") {
    window.location.href = "/";
  }
}, [status]);
```

```typescript
// ✅ 正確：移除所有客戶端重定向
// 不使用 useSession
// 讓 middleware 處理重定向
```

## 🎯 關鍵要點總結

1. **Cookie 名稱一致性**：
   - 生產環境：`__Secure-next-auth.session-token`
   - 開發環境：`next-auth.session-token`
   - `auth.ts` 和 `middleware.ts` 必須完全一致

2. **Middleware 優先級**：
   - 最優先跳過 `/api/auth/callback/`
   - 明確指定 cookie 名稱
   - 使用 `getToken` 而不是 `withAuth`

3. **登入頁面簡化**：
   - 不使用 `useSession`
   - 不進行客戶端重定向
   - 只使用 `mounted` 狀態避免 hydration mismatch

4. **環境變數**：
   - `NEXTAUTH_URL` 必須是完整 URL，無尾隨斜線
   - 生產環境必須使用 HTTPS URL

## 📝 快速模板

### 最小化配置

```typescript
// auth.ts - 最小化配置
export const authOptions: NextAuthOptions = {
  providers: [GoogleProvider({ ... })],
  callbacks: { jwt, session },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// middleware.ts - 最小化配置
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/callback/")) {
    return NextResponse.next();
  }
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token",
  });
  if (token && token.userId) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
```

## 🔗 相關文件

- `plan/oauth_error.md` - 詳細的問題分析和解決方案
- `src/lib/auth.ts` - NextAuth 配置
- `src/middleware.ts` - Middleware 配置
- `src/app/login/page.tsx` - 登入頁面

