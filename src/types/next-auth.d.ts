import "next-auth";

declare module "next-auth" {
  interface Session {
    userId?: string; // 本网站的 userId
    googleId?: string | null; // Google ID（OAuth 登录）或 null（测试登录）
    user: {
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string; // 本网站的 userId
    email?: string | null;
    name?: string | null;
    image?: string | null;
    googleId?: string | null; // Google ID（仅 OAuth 登录时）
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string; // 本网站的 userId
    googleId?: string | null; // Google ID（OAuth 登录）或 null（测试登录）
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    accessToken?: string;
    provider?: string;
    isNewUser?: boolean; // 標記是否為新使用者
  }
}

