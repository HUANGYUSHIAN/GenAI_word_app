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

console.log("\n📋 環境變數檢查\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// 顯示所有讀取到的環境變數（隱藏敏感信息）
const envKeys = Object.keys(result.parsed || {});
console.log(`讀取到 ${envKeys.length} 個環境變數:\n`);

envKeys.forEach((key) => {
  let value = process.env[key] || "";
  
  // 隱藏敏感信息
  if (key.includes("SECRET") || key.includes("PASSWORD") || key.includes("KEY")) {
    value = value ? "***" + value.slice(-4) : "(未設定)";
  } else if (key === "DATABASE_URL") {
    // 隱藏密碼但顯示完整結構
    value = value.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
  }
  
  console.log(`  ${key}: ${value}`);
});

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// 特別檢查 DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log("\n❌ DATABASE_URL 未設定\n");
} else {
  console.log("\n🔍 DATABASE_URL 詳細分析:\n");
  
  // 檢查是否包含數據庫名稱
  const urlParts = dbUrl.split("/");
  if (urlParts.length < 2 || !urlParts[1] || urlParts[1].startsWith("?")) {
    console.log("❌ 缺少資料庫名稱！");
    console.log("\n當前格式:");
    const masked = dbUrl.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
    console.log(`  ${masked}`);
    
    console.log("\n💡 修復方法:");
    console.log("   在 .env 文件中，將 DATABASE_URL 修改為：");
    console.log("   mongodb+srv://user:pass@cluster.net/oauth?options");
    console.log("   ↑ 注意在 '/' 和 '?' 之間添加資料庫名稱（例如：oauth）\n");
  } else {
    const dbName = urlParts[1].split("?")[0];
    console.log(`✅ 資料庫名稱: ${dbName}`);
    
    const masked = dbUrl.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
    console.log(`   完整連接字串: ${masked}\n`);
  }
}

console.log(`📁 .env 文件路徑: ${envPath}\n`);

