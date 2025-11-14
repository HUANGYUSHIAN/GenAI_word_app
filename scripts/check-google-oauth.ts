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

console.log("\n🔍 Google OAuth 回調 URL 檢查\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// 檢查環境變數
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthUrl = process.env.NEXTAUTH_URL;

let hasError = false;

// 1. 檢查 GOOGLE_CLIENT_ID
console.log("\n1. GOOGLE_CLIENT_ID");
if (!googleClientId) {
  console.log("   ❌ 未設定");
  hasError = true;
} else if (googleClientId === "your-google-client-id" || googleClientId.trim() === "") {
  console.log("   ❌ 使用預設值或為空");
  hasError = true;
} else {
  // 隱藏部分 Client ID（安全起見）
  const maskedId = googleClientId.length > 20 
    ? googleClientId.substring(0, 10) + "..." + googleClientId.substring(googleClientId.length - 10)
    : "***";
  console.log(`   ✅ 已設定 (${maskedId})`);
}

// 2. 檢查 GOOGLE_CLIENT_SECRET
console.log("\n2. GOOGLE_CLIENT_SECRET");
if (!googleClientSecret) {
  console.log("   ❌ 未設定");
  hasError = true;
} else if (googleClientSecret === "your-google-client-secret" || googleClientSecret.trim() === "") {
  console.log("   ❌ 使用預設值或為空");
  hasError = true;
} else {
  // 隱藏部分 Secret（安全起見）
  const maskedSecret = googleClientSecret.length > 10
    ? googleClientSecret.substring(0, 4) + "***" + googleClientSecret.substring(googleClientSecret.length - 4)
    : "***";
  console.log(`   ✅ 已設定 (${maskedSecret})`);
}

// 3. 檢查 NEXTAUTH_URL
console.log("\n3. NEXTAUTH_URL");
if (!nextAuthUrl) {
  console.log("   ❌ 未設定");
  hasError = true;
} else if (nextAuthUrl === "http://localhost:3000" && process.env.NODE_ENV !== "development") {
  console.log("   ⚠️  使用預設值（可能不適合生產環境）");
  console.log(`   當前值: ${nextAuthUrl}`);
} else {
  console.log(`   ✅ 已設定: ${nextAuthUrl}`);
}

// 4. 計算回調 URL
console.log("\n4. Google OAuth 回調 URL");
if (!nextAuthUrl) {
  console.log("   ❌ 無法計算（NEXTAUTH_URL 未設定）");
  hasError = true;
} else {
  // 移除尾隨斜線
  const baseUrl = nextAuthUrl.replace(/\/$/, "");
  const callbackUrl = `${baseUrl}/api/auth/callback/google`;
  
  console.log(`   📍 回調 URL: ${callbackUrl}`);
  
  // 驗證 URL 格式
  try {
    const url = new URL(callbackUrl);
    console.log(`   ✅ URL 格式正確`);
    console.log(`   - 協議: ${url.protocol}`);
    console.log(`   - 主機: ${url.host}`);
    console.log(`   - 路徑: ${url.pathname}`);
  } catch (error) {
    console.log(`   ❌ URL 格式錯誤: ${error}`);
    hasError = true;
  }
}

// 5. 檢查是否需要在 Google Cloud Console 中設定
console.log("\n5. Google Cloud Console 設定檢查");
if (hasError) {
  console.log("   ⚠️  請先修復上述錯誤");
} else if (nextAuthUrl) {
  const baseUrl = nextAuthUrl.replace(/\/$/, "");
  const callbackUrl = `${baseUrl}/api/auth/callback/google`;
  
  console.log("   📋 請在 Google Cloud Console 中添加以下重定向 URI：");
  console.log("   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   ${callbackUrl}`);
  console.log("   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // 如果是本地開發，也提示生產環境
  if (nextAuthUrl.includes("localhost")) {
    console.log("\n   💡 提示：如果還有生產環境，請同時添加生產環境的回調 URL");
    console.log("   例如：https://your-domain.vercel.app/api/auth/callback/google");
  }
}

// 6. 驗證 Client ID 格式
console.log("\n6. Client ID 格式驗證");
if (googleClientId) {
  // Google Client ID 通常是數字-字串.apps.googleusercontent.com 格式
  if (googleClientId.includes(".apps.googleusercontent.com")) {
    console.log("   ✅ Client ID 格式看起來正確");
  } else {
    console.log("   ⚠️  Client ID 格式可能不正確");
    console.log("   預期格式：數字-字串.apps.googleusercontent.com");
  }
}

// 7. 總結
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
if (hasError) {
  console.log("\n❌ 發現配置問題，請修復後再試\n");
  process.exit(1);
} else {
  console.log("\n✅ 所有檢查通過！");
  console.log("\n📝 下一步：");
  console.log("   1. 確認 Google Cloud Console 中已添加回調 URL");
  console.log("   2. 等待 1-2 分鐘讓變更生效");
  console.log("   3. 清除瀏覽器快取後重新嘗試登入\n");
}

