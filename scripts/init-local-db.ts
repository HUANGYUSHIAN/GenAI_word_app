/**
 * Script to initialize local database files
 * Usage: npm run db:init-local
 * 
 * This script creates the .local-db directory and initializes all required JSON files.
 */

import * as dotenv from "dotenv";
import { initLocalDb } from "../src/lib/local-db";

dotenv.config();

async function initializeLocalDb() {
  try {
    console.log("\n🔄 正在初始化本地資料庫...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    initLocalDb();
    
    console.log("✅ 本地資料庫初始化完成！");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📁 資料庫文件位置: .local-db/");
    console.log("   - users.json");
    console.log("   - students.json");
    console.log("   - suppliers.json");
    console.log("   - admins.json");
    console.log("   - coupons.json");
    console.log("   - vocabularies.json");
    console.log("   - words.json");
    console.log("   - stores.json");
    console.log("   - comments.json");
    console.log("\n📝 下一步：");
    console.log("   1. 確保 .env 文件中設置了 DATABASE_local=true");
    console.log("   2. 執行: npm run db:create-admin");
    console.log("   3. 執行: npm run dev");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error: any) {
    console.error("❌ 初始化本地資料庫失敗:", error);
    process.exit(1);
  }
}

initializeLocalDb();

