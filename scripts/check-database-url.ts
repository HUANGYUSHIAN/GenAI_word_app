/**
 * Script to check DATABASE_URL format
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL 環境變數未設定");
  process.exit(1);
}

console.log("✅ DATABASE_URL 已設定");
console.log("\n檢查連接字串格式...\n");

// 隱藏密碼顯示
const maskedUrl = dbUrl.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
console.log(`連接字串: ${maskedUrl}\n`);

// 檢查格式
if (dbUrl.startsWith("mongodb+srv://")) {
  const url = new URL(dbUrl);
  const hostname = url.hostname;
  const parts = hostname.split(".");
  
  console.log(`Hostname: ${hostname}`);
  console.log(`Hostname parts: ${parts.length}`);
  
  if (parts.length < 3) {
    console.error("❌ 錯誤：mongodb+srv 的 hostname 必須至少包含 3 個以 '.' 分隔的部分");
    console.error(`   當前 hostname: ${hostname}`);
    console.error(`   部分數量: ${parts.length}`);
    console.error("\n正確格式範例：");
    console.error("   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database");
    process.exit(1);
  }
  
  console.log("✅ Hostname 格式正確");
} else if (dbUrl.startsWith("mongodb://")) {
  console.log("✅ 使用標準 MongoDB 連接字串");
} else {
  console.error("❌ 錯誤：連接字串必須以 'mongodb://' 或 'mongodb+srv://' 開頭");
  process.exit(1);
}

// 檢查是否有資料庫名稱
try {
  const url = new URL(dbUrl);
  const pathname = url.pathname;
  if (!pathname || pathname === "/") {
    console.warn("⚠️  警告：連接字串中沒有指定資料庫名稱");
  } else {
    console.log(`✅ 資料庫名稱: ${pathname.substring(1)}`);
  }
} catch (error) {
  console.error("❌ 無法解析連接字串:", error);
  process.exit(1);
}

console.log("\n✅ 連接字串格式檢查通過！");



