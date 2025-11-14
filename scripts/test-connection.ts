import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

// 明確指定 .env 文件路徑
const envPath = path.resolve(process.cwd(), ".env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`\n❌ 無法讀取 .env 文件: ${result.error.message}`);
  console.error(`   嘗試從路徑讀取: ${envPath}\n`);
  process.exit(1);
}

// 顯示讀取到的環境變數數量（用於調試）
const envKeys = Object.keys(result.parsed || {});
console.log(`\n📝 從 .env 讀取了 ${envKeys.length} 個環境變數`);

const prisma = new PrismaClient();

async function testConnection() {
  console.log("\n🔍 測試資料庫連接...\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 檢查環境變數
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("❌ DATABASE_URL 環境變數未設定");
    console.log(`   當前工作目錄: ${process.cwd()}`);
    console.log(`   .env 文件路徑: ${envPath}`);
    console.log(`   讀取到的環境變數: ${envKeys.join(", ")}\n`);
    process.exit(1);
  }

  // 隱藏密碼顯示連接字串（安全起見）
  const maskedUrl = dbUrl.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
  console.log(`連接字串: ${maskedUrl}\n`);

  try {
    // 測試連接
    console.log("1. 嘗試連接資料庫...");
    await prisma.$connect();
    console.log("   ✅ 連接成功\n");

    // 測試查詢
    console.log("2. 測試資料庫查詢...");
    const userCount = await prisma.user.count();
    console.log(`   ✅ 查詢成功（目前有 ${userCount} 個用戶）\n`);

    // 測試寫入（可選，創建一個測試記錄然後刪除）
    console.log("3. 測試資料庫寫入...");
    const testUser = await prisma.user.create({
      data: {
        userId: "TEST_CONNECTION_" + Date.now(),
        name: "Test Connection",
        email: "test@connection.com",
      },
    });
    console.log("   ✅ 寫入成功\n");

    console.log("4. 測試資料庫刪除...");
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log("   ✅ 刪除成功\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ 所有測試通過！資料庫連接正常。\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error: any) {
    console.log("\n❌ 連接失敗！\n");
    console.log("錯誤詳情:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`錯誤訊息: ${error.message}`);
    
    if (error.code) {
      console.log(`錯誤代碼: ${error.code}`);
    }

    // 檢查連接字串是否包含數據庫名稱
    if (!dbUrl.includes("/") || dbUrl.split("/").length < 2 || dbUrl.split("/")[1].includes("?")) {
      console.log("\n💡 提示: 連接字串缺少資料庫名稱");
      console.log("   請確認 DATABASE_URL 在 '/' 和 '?' 之間包含資料庫名稱");
      console.log("   正確格式: mongodb+srv://user:pass@cluster.net/database_name?options");
      console.log(`   當前連接字串: ${maskedUrl}`);
    } else if (error.message.includes("database string is invalid") || error.message.includes("empty database name")) {
      console.log("\n💡 提示: 連接字串格式錯誤或缺少資料庫名稱");
      console.log("   請確認 DATABASE_URL 包含資料庫名稱");
      console.log("   正確格式: mongodb+srv://user:pass@cluster.net/database_name?options");
      console.log(`   當前連接字串: ${maskedUrl}`);
    } else if (error.message.includes("authentication failed")) {
      console.log("\n💡 提示: 認證失敗");
      console.log("   請檢查用戶名和密碼是否正確");
    } else if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
      console.log("\n💡 提示: 無法解析主機名稱");
      console.log("   請檢查網路連接和 MongoDB 集群地址");
    } else if (error.message.includes("timeout")) {
      console.log("\n💡 提示: 連接超時");
      console.log("   請檢查網路連接或 MongoDB 集群是否可訪問");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

