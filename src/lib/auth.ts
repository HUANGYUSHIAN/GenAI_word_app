import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { generateUserId } from "@/lib/utils";

// 臨時存儲新使用者標記（用於 redirect callback）
let isCurrentUserNew = false;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      name: "Test Login",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId) {
          console.log("[Credentials] No userId provided");
          return null;
        }

        try {
          console.log("[Credentials] Looking up user:", credentials.userId);
          const user = await prisma.user.findUnique({
            where: { userId: credentials.userId },
          });

          console.log("[Credentials] User found:", user ? "Yes" : "No", user ? { userId: user.userId, name: user.name } : null);

          if (!user) {
            console.log("[Credentials] User not found in database");
            return null;
          }

          if (user.isLock) {
            console.log("[Credentials] User is locked");
            throw new Error("帳號已被鎖定");
          }

          // 返回用戶信息，確保 id 是 userId
          const result = {
            id: user.userId, // 必須是 userId，JWT callback 會使用這個
            name: user.name || undefined,
            email: user.email || undefined,
            image: user.image || undefined,
          };
          console.log("[Credentials] Returning user:", { id: result.id, name: result.name });
          return result;
        } catch (error: any) {
          console.error("[Credentials] Error in authorize:", error);
          if (error.message?.includes("database") || error.message?.includes("connection") || error.message?.includes("MongoDB")) {
            throw new Error("資料庫連接錯誤，請檢查環境變數設定");
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 只處理 Google OAuth
      if (account?.provider !== "google") {
        return true; // 測試登入直接通過
      }

      console.log("[SignIn] Google OAuth - googleId:", account.providerAccountId, "user.email:", user.email);
      const googleId = account.providerAccountId;
      const email = user.email;
      const name = user.name || undefined;
      const image = user.image || undefined;

      // 查找是否已存在該 Google ID 的用戶
      let dbUser = await prisma.user.findUnique({
        where: { googleId },
      });

      console.log("[SignIn] Database lookup result:", dbUser ? "Found existing user" : "New user", dbUser ? { userId: dbUser.userId } : null);

      let finalUserId: string;

      if (!dbUser) {
        // 新用戶：生成唯一的 userId
        let userId: string;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
          userId = generateUserId(30);
          const existingUser = await prisma.user.findUnique({
            where: { userId },
          });
          if (!existingUser) {
            isUnique = true;
          }
          attempts++;
        }

        if (!isUnique) {
          console.error("[SignIn] Failed to generate unique userId after", maxAttempts, "attempts");
          throw new Error("無法創建用戶，請稍後再試");
        }

        // 創建新用戶
        const userData = {
          userId: userId!,
          googleId,
          email,
          name,
          image,
        };

        console.log("[SignIn] Creating new user with data:", userData);
        dbUser = await prisma.user.create({
          data: userData,
        });

        console.log("[SignIn] Created new user:", { userId: dbUser.userId, dbUserKeys: Object.keys(dbUser) });

        // 確保 dbUser.userId 存在
        if (!dbUser.userId) {
          console.error("[SignIn] ERROR: dbUser.userId is missing after create!", dbUser);
          dbUser = { ...dbUser, userId: userId! };
        }

        finalUserId = dbUser.userId;
        isCurrentUserNew = true;
        (user as any).isNewUser = true;
      } else {
        // 已存在用戶：更新信息
        dbUser = await prisma.user.update({
          where: { googleId },
          data: {
            email,
            name,
            image,
          },
        });
        console.log("[SignIn] Updated existing user:", { userId: dbUser.userId });
        finalUserId = dbUser.userId;
        isCurrentUserNew = false;
      }

      // 關鍵：設置 user.id 為 userId，JWT callback 會使用這個
      user.id = finalUserId;
      (user as any).googleId = googleId;

      // 確保用戶信息完整
      if (!user.email && dbUser.email) user.email = dbUser.email;
      if (!user.name && dbUser.name) user.name = dbUser.name;
      if (!user.image && dbUser.image) user.image = dbUser.image;

      console.log("[SignIn] Final user object:", { id: user.id, email: user.email, name: user.name, isNewUser: (user as any).isNewUser });
      return true;
    },

    async jwt({ token, user, account }) {
      // 首次登入：有 user 和 account
      if (user && account) {
        if (account.provider === "google") {
          // Google OAuth 登入
          console.log("[JWT] OAuth login - user.id:", user.id);
          token.userId = user.id as string; // 這是 userId
          token.googleId = (user as any).googleId || account.providerAccountId;
          token.isNewUser = (user as any).isNewUser || false;
          if (token.isNewUser) {
            isCurrentUserNew = true;
          }
        } else if (account.provider === "credentials") {
          // 測試登入
          console.log("[JWT] Credentials login - user.id:", user.id);
          token.userId = user.id as string; // 這是 userId
          token.googleId = null;
          token.isNewUser = false;
          isCurrentUserNew = false;
        }

        // 設置用戶信息
        token.email = user.email || undefined;
        token.name = user.name || undefined;
        token.picture = user.image || undefined;
        token.provider = account.provider;
        if (account.access_token) {
          token.accessToken = account.access_token;
        }

        console.log("[JWT] Set token.userId to:", token.userId);
      } else if (user && !account) {
        // 只有 user 沒有 account（不應該發生，但以防萬一）
        console.log("[JWT] User without account - user.id:", user.id);
        if (!token.userId && user.id) {
          token.userId = user.id as string;
        }
      }

      // 後續請求：確保 token.userId 存在
      if (!token.userId) {
        console.error("[JWT] WARNING: token.userId is missing!", { hasUser: !!user, hasAccount: !!account, tokenKeys: Object.keys(token) });
      } else {
        console.log("[JWT] token.userId:", token.userId);
      }

      // 清除 isNewUser 標記（只在首次登入時使用一次）
      if (token.isNewUser && !user) {
        delete token.isNewUser;
      }

      return token;
    },

    async session({ session, token }) {
      console.log("[Session] token.userId:", token.userId, "tokenKeys:", Object.keys(token));

      if (token.userId) {
        session.userId = token.userId as string;
        console.log("[Session] session.userId set to:", session.userId);
      } else {
        console.error("[Session] WARNING: token.userId is missing! Session will be invalid.");
      }

      if (token.googleId !== undefined) {
        session.googleId = token.googleId as string | null;
      }

      // 確保 session.user 存在
      if (!session.user) {
        session.user = {
          email: token.email as string | null || null,
          name: token.name as string | null || null,
          image: token.picture as string | null || null,
        };
      } else {
        if (token.email !== undefined) session.user.email = token.email as string | null;
        if (token.name !== undefined) session.user.name = token.name as string | null;
        if (token.picture !== undefined) session.user.image = token.picture as string | null;
      }

      console.log("[Session] Final session:", { userId: session.userId, hasUser: !!session.user });
      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log("[Redirect] url:", url, "baseUrl:", baseUrl, "isCurrentUserNew:", isCurrentUserNew);

      if (url.startsWith("/")) {
        url = `${baseUrl}${url}`;
      }

      const urlObj = new URL(url);
      console.log("[Redirect] Parsed URL:", urlObj.pathname);

      // 新用戶導向首頁（首頁會檢查 dataType 並顯示角色選擇）
      if (isCurrentUserNew && (urlObj.pathname === "/" || url === baseUrl || urlObj.pathname === "" || urlObj.pathname === "/login")) {
        isCurrentUserNew = false; // 清除標記
        const homeUrl = baseUrl;
        console.log("[Redirect] New user, redirecting to:", homeUrl);
        return homeUrl;
      }

      // 已登入用戶不應該在 /login
      if (urlObj.pathname === "/login") {
        const homeUrl = baseUrl;
        console.log("[Redirect] Already logged in, redirecting from /login to:", homeUrl);
        return homeUrl;
      }

      const finalUrl = url.startsWith(baseUrl) ? url : baseUrl;
      console.log("[Redirect] Final redirect URL:", finalUrl);
      return finalUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
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
  debug: process.env.NODE_ENV === "development" || process.env.VERCEL === "1",
};
