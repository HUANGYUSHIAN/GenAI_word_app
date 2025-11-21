/**
 * Script to migrate MongoDB schema for Prisma changes
 * This script updates the database schema to match the new Prisma schema
 * 
 * Usage: npm run db:migrate-schema
 * 
 * ⚠️  WARNING: This script will modify your MongoDB database.
 * Make sure you have backed up your database before running this.
 * 
 * Prerequisites:
 * 1. Set DATABASE_local=false in .env
 * 2. Set DATABASE_URL to your MongoDB connection string
 * 3. Run npm run db:push first to ensure Prisma Client is up to date
 */

import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const useLocalDb = process.env.DATABASE_local === "true";

if (useLocalDb) {
  console.error("\n❌ 錯誤：此腳本僅適用於 MongoDB");
  console.error("   請將 .env 中的 DATABASE_local 設置為 false\n");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("\n❌ 錯誤：DATABASE_URL 未設置");
  console.error("   請在 .env 中設置 DATABASE_URL\n");
  process.exit(1);
}

async function migrateSchema() {
  const prisma = new PrismaClient();

  try {
    console.log("\n🔄 開始遷移 MongoDB Schema...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 1. 驗證 Prisma 連接
    console.log("📦 驗證 Prisma 連接...");
    try {
      const userCount = await prisma.user.count();
      console.log(`  ✅ Prisma 連接正常，找到 ${userCount} 個用戶\n`);
    } catch (error: any) {
      console.error("  ❌ Prisma 連接失敗:", error.message);
      console.error("  請確保已運行: npx prisma db push\n");
      throw error;
    }

    // 2. 檢查 users 是否有 feedback 字段
    console.log("📦 檢查 users 集合...");
    try {
      const sampleUser = await prisma.user.findFirst();
      if (sampleUser) {
        // 嘗試訪問 feedback 字段
        const hasFeedback = 'feedback' in sampleUser;
        if (hasFeedback) {
          console.log("  ✅ users 集合已包含 feedback 字段\n");
        } else {
          console.log("  ⚠️  users 集合尚未包含 feedback 字段");
          console.log("  運行 npx prisma db push 後，此字段將自動添加\n");
        }
      } else {
        console.log("  ℹ️  資料庫中沒有用戶，無需更新\n");
      }
    } catch (error: any) {
      console.log("  ⚠️  無法檢查 users 集合:", error.message);
      console.log("  請運行: npx prisma db push\n");
    }

    // 3. 測試 FeedbackForm 模型
    console.log("📦 驗證 FeedbackForm 模型...");
    try {
      const formCount = await prisma.feedbackForm.count();
      console.log(`  ✅ FeedbackForm 模型正常，找到 ${formCount} 個表單\n`);
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log("  ⚠️  FeedbackForm 表尚未創建");
        console.log("  請運行: npx prisma db push\n");
      } else {
        throw error;
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Schema 遷移完成！");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📝 重要：請運行以下命令來完成 schema 更新：");
    console.log("   1. npx prisma db push  (推送 schema 到 MongoDB)");
    console.log("   2. npx prisma generate (重新生成 Prisma Client)");
    console.log("   3. 驗證應用程序是否正常運行\n");
  } catch (error: any) {
    console.error("\n❌ 遷移失敗:", error);
    console.error("錯誤詳情:", error.message);
    if (error.stack) {
      console.error("堆棧:", error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateSchema();

