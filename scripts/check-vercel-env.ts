import * as dotenv from "dotenv";
import * as path from "path";

// 明確指定 .env 文件路徑
const envPath = path.resolve(process.cwd(), ".env");
const result = dotenv.config({ path: envPath });

console.log("\n🔍 Vercel 部署環境檢查\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// 檢查關鍵環境變數
const requiredVars = [
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
];

console.log("\n📋 環境變數檢查:\n");

let hasError = false;
requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: 未設定`);
    hasError = true;
  } else {
    // 隱藏敏感信息
    let displayValue = value;
    if (varName.includes("SECRET") || varName.includes("PASSWORD")) {
      displayValue = value.length > 8 
        ? value.substring(0, 4) + "***" + value.substring(value.length - 4)
        : "***";
    } else if (varName === "DATABASE_URL") {
      displayValue = value.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
    } else if (varName === "GOOGLE_CLIENT_ID") {
      displayValue = value.length > 20
        ? value.substring(0, 10) + "..." + value.substring(value.length - 10)
        : "***";
    }
    
    console.log(`✅ ${varName}: ${displayValue}`);
    
    // 特別檢查 NEXTAUTH_URL
    if (varName === "NEXTAUTH_URL") {
      if (value.includes("localhost") && process.env.VERCEL) {
        console.log(`   ⚠️  警告: 在 Vercel 環境中使用 localhost URL`);
      }
      if (!value.startsWith("http://") && !value.startsWith("https://")) {
        console.log(`   ❌ 錯誤: URL 格式不正確，應以 http:// 或 https:// 開頭`);
        hasError = true;
      }
    }
  }
});

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// 檢查 Vercel 環境
if (process.env.VERCEL) {
  console.log("\n🌐 Vercel 環境資訊:\n");
  console.log(`   VERCEL: ${process.env.VERCEL}`);
  console.log(`   VERCEL_ENV: ${process.env.VERCEL_ENV || "未設定"}`);
  console.log(`   VERCEL_URL: ${process.env.VERCEL_URL || "未設定"}`);
  
  // 計算回調 URL
  const vercelUrl = process.env.VERCEL_URL;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  
  if (vercelUrl && nextAuthUrl) {
    console.log(`\n📍 回調 URL 檢查:\n`);
    const callbackUrl = `${nextAuthUrl}/api/auth/callback/google`;
    console.log(`   應在 Google Cloud Console 中設定: ${callbackUrl}`);
    
    if (vercelUrl !== nextAuthUrl.replace(/^https?:\/\//, "")) {
      console.log(`   ⚠️  警告: VERCEL_URL 與 NEXTAUTH_URL 不匹配`);
      console.log(`   VERCEL_URL: ${vercelUrl}`);
      console.log(`   NEXTAUTH_URL: ${nextAuthUrl.replace(/^https?:\/\//, "")}`);
    }
  }
}

console.log("\n💡 Vercel 部署建議:\n");
console.log("   1. 在 Vercel Dashboard 中檢查環境變數");
console.log("   2. 確認 NEXTAUTH_URL 指向正確的 Vercel 域名");
console.log("   3. 確認 Google Cloud Console 中的回調 URL 與 NEXTAUTH_URL 匹配");
console.log("   4. 使用 'vercel env pull' 檢查本地環境變數");
console.log("   5. 如果使用多個項目，確認每個項目的環境變數是獨立的\n");

if (hasError) {
  console.log("❌ 發現配置問題，請修復後再部署\n");
  process.exit(1);
} else {
  console.log("✅ 環境變數檢查通過\n");
}

