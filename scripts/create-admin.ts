/**
 * Script to create an admin account for testing login
 * Usage: npx tsx scripts/create-admin.ts [name] [email]
 * 
 * This script creates a new user account with Admin role.
 * You can use the returned userId to login via test login.
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { initLocalDb } from "../src/lib/local-db";

dotenv.config();

const useLocalDb = process.env.DATABASE_local === "true";

// 本地資料庫路徑
const DB_DIR = path.join(process.cwd(), ".local-db");
const USERS_FILE = path.join(DB_DIR, "users.json");
const ADMINS_FILE = path.join(DB_DIR, "admins.json");

// 初始化本地資料庫
if (useLocalDb) {
  initLocalDb();
}

// 根據環境選擇使用本地或 MongoDB
let prisma: any;

if (useLocalDb) {
  // 本地資料庫操作
  prisma = {
    user: {
      findUnique: async (where: { userId?: string; googleId?: string }) => {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
        if (where.userId) {
          const user = users.find((u: any) => {
            // 處理舊的嵌套結構
            const userId = u.userId || (u.data && u.data.userId);
            return userId === where.userId;
          });
          if (!user) return null;
          // 如果是舊的嵌套結構，展開它
          if (user.data) {
            return { ...user, ...user.data };
          }
          return user;
        }
        if (where.googleId) {
          const user = users.find((u: any) => {
            const googleId = u.googleId || (u.data && u.data.googleId);
            return googleId === where.googleId;
          });
          if (!user) return null;
          // 如果是舊的嵌套結構，展開它
          if (user.data) {
            return { ...user, ...user.data };
          }
          return user;
        }
        return null;
      },
      create: async (data: any) => {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
        const newUser = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          userId: data.userId,
          googleId: data.googleId || null,
          name: data.name || null,
          email: data.email || null,
          image: data.image || null,
          phoneNumber: data.phoneNumber || null,
          birthday: data.birthday || null,
          language: data.language || null,
          isLock: data.isLock || false,
          dataType: data.dataType || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
        return newUser;
      },
    },
    admin: {
      create: async (data: any) => {
        const admins = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
        const newAdmin = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        admins.push(newAdmin);
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), "utf-8");
        return newAdmin;
      },
    },
    $disconnect: async () => {},
  };
} else {
  // MongoDB
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
}

function generateUserId(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function createAdmin() {
  const args = process.argv.slice(2);
  const name = args[0] || "Admin User";
  const email = args[1] || `admin${Date.now()}@example.com`;

  // 生成唯一的userId
  let userId: string;
  let isUnique = false;

  while (!isUnique) {
    userId = generateUserId(30);
    const existingUser = await prisma.user.findUnique({
      where: { userId },
    });
    if (!existingUser) {
      isUnique = true;
    }
  }

  try {
    // 創建用戶
    const user = await prisma.user.create({
      data: {
        userId: userId!,
        name,
        email,
        dataType: "Admin",
        googleId: null, // 測試登入不需要 Google ID
      },
    });

    // 創建 Admin 資料
    const admin = await prisma.admin.create({
      data: {
        userId: userId!,
        permissions: [],
      },
    });

    // 確保 user 對象有正確的屬性
    const userDisplay = {
      userId: user.userId || userId!,
      name: user.name || name,
      email: user.email || email,
      createdAt: user.createdAt || new Date().toISOString(),
    };

    console.log("\n✅ 管理員帳號創建成功！");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`User ID: ${userDisplay.userId}`);
    console.log(`Name: ${userDisplay.name}`);
    console.log(`Email: ${userDisplay.email}`);
    console.log(`Role: Admin`);
    console.log(`Created At: ${userDisplay.createdAt}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📝 使用方式：");
    console.log(`   1. 前往登入頁面: http://localhost:3000/login`);
    console.log(`   2. 選擇「測試登入」`);
    console.log(`   3. 輸入 User ID: ${userDisplay.userId}`);
    console.log(`   4. 登入後即可進入 /admin 管理後台`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  重要：請複製並保存以下 User ID，用於測試登入：");
    console.log(`\n   ${userDisplay.userId}\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error: any) {
    console.error("❌ 創建管理員帳號失敗:", error);
    process.exit(1);
  } finally {
    if (!useLocalDb && prisma.$disconnect) {
      await prisma.$disconnect();
    }
  }
}

createAdmin();

