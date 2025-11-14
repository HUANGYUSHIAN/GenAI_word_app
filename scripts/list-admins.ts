/**
 * Script to list all admin accounts
 * Usage: npx tsx scripts/list-admins.ts
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const useLocalDb = process.env.DATABASE_local === "true";

// 本地資料庫路徑
const DB_DIR = path.join(process.cwd(), ".local-db");
const USERS_FILE = path.join(DB_DIR, "users.json");
const ADMINS_FILE = path.join(DB_DIR, "admins.json");

async function listAdmins() {
  try {
    if (useLocalDb) {
      // 讀取本地資料庫
      if (!fs.existsSync(USERS_FILE) || !fs.existsSync(ADMINS_FILE)) {
        console.log("\n❌ 本地資料庫文件不存在。請先創建管理員帳號。");
        console.log("   執行: npm run db:create-admin\n");
        return;
      }

      const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      const admins = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));

      // 找出所有管理員（處理可能的嵌套結構）
      const adminUsers = users.filter((u: any) => {
        const dataType = u.dataType || (u.data && u.data.dataType);
        return dataType === "Admin";
      });

      if (adminUsers.length === 0) {
        console.log("\n❌ 沒有找到管理員帳號。");
        console.log("   執行: npm run db:create-admin\n");
        return;
      }

      console.log("\n✅ 找到以下管理員帳號：");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      adminUsers.forEach((user: any, index: number) => {
        // 處理可能的嵌套結構
        const userData = user.data || user;
        console.log(`\n${index + 1}. 管理員帳號`);
        console.log(`   User ID: ${userData.userId || user.userId}`);
        console.log(`   Name: ${userData.name || user.name || "未設定"}`);
        console.log(`   Email: ${userData.email || user.email || "未設定"}`);
        console.log(`   Created At: ${userData.createdAt || user.createdAt}`);
      });

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("\n📝 使用方式：");
      console.log(`   1. 前往登入頁面: http://localhost:3000/login`);
      console.log(`   2. 選擇「測試登入」`);
      console.log(`   3. 輸入上述任一 User ID`);
      console.log(`   4. 登入後即可進入 /admin 管理後台`);
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } else {
      // MongoDB
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      try {
        const adminUsers = await prisma.user.findMany({
          where: { dataType: "Admin" },
          include: { adminData: true },
        });

        if (adminUsers.length === 0) {
          console.log("\n❌ 沒有找到管理員帳號。");
          console.log("   執行: npm run db:create-admin\n");
          return;
        }

        console.log("\n✅ 找到以下管理員帳號：");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        adminUsers.forEach((user: any, index: number) => {
          console.log(`\n${index + 1}. 管理員帳號`);
          console.log(`   User ID: ${user.userId}`);
          console.log(`   Name: ${user.name || "未設定"}`);
          console.log(`   Email: ${user.email || "未設定"}`);
          console.log(`   Created At: ${user.createdAt}`);
        });

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n📝 使用方式：");
        console.log(`   1. 前往登入頁面: http://localhost:3000/login`);
        console.log(`   2. 選擇「測試登入」`);
        console.log(`   3. 輸入上述任一 User ID`);
        console.log(`   4. 登入後即可進入 /admin 管理後台`);
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      } finally {
        await prisma.$disconnect();
      }
    }
  } catch (error: any) {
    console.error("❌ 讀取管理員帳號失敗:", error);
    process.exit(1);
  }
}

listAdmins();

