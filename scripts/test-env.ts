import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import https from "https";
import http from "http";

dotenv.config();

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  status: "✅ PASS" | "❌ FAIL" | "⚠️  WARN";
  message: string;
}

const results: TestResult[] = [];

async function testDatabase() {
  try {
    await prisma.$connect();
    await prisma.user.count();
    results.push({
      name: "DATABASE_URL",
      status: "✅ PASS",
      message: "資料庫連接成功",
    });
  } catch (error: any) {
    results.push({
      name: "DATABASE_URL",
      status: "❌ FAIL",
      message: `資料庫連接失敗: ${error.message}`,
    });
  } finally {
    await prisma.$disconnect();
  }
}

function testOAuthProvider() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || clientId === "your-google-client-id") {
    results.push({
      name: "OAuth Provider",
      status: "❌ FAIL",
      message: "GOOGLE_CLIENT_ID 未設定或使用預設值",
    });
    return;
  }

  if (!clientSecret || clientSecret === "your-google-client-secret") {
    results.push({
      name: "OAuth Provider",
      status: "❌ FAIL",
      message: "GOOGLE_CLIENT_SECRET 未設定或使用預設值",
    });
    return;
  }

  results.push({
    name: "OAuth Provider",
    status: "✅ PASS",
    message: "Google OAuth 設定正確",
  });
}

function testNextAuth() {
  const url = process.env.NEXTAUTH_URL;
  const secret = process.env.NEXTAUTH_SECRET;

  if (!url || url === "http://localhost:3000") {
    results.push({
      name: "NEXTAUTH_URL",
      status: "⚠️  WARN",
      message: "使用預設值 http://localhost:3000",
    });
  } else {
    results.push({
      name: "NEXTAUTH_URL",
      status: "✅ PASS",
      message: `設定為: ${url}`,
    });
  }

  if (!secret || secret === "your-nextauth-secret-key-here") {
    results.push({
      name: "NEXTAUTH_SECRET",
      status: "❌ FAIL",
      message: "NEXTAUTH_SECRET 未設定或使用預設值",
    });
    return;
  }

  if (secret.length < 32) {
    results.push({
      name: "NEXTAUTH_SECRET",
      status: "⚠️  WARN",
      message: "NEXTAUTH_SECRET 長度建議至少32字符",
    });
  } else {
    results.push({
      name: "NEXTAUTH_SECRET",
      status: "✅ PASS",
      message: "NEXTAUTH_SECRET 設定正確",
    });
  }
}

function testWebsiteResponse(): Promise<void> {
  return new Promise((resolve) => {
    const url = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const client = isHttps ? https : http;

    const req = client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
        results.push({
          name: "Website Response",
          status: "✅ PASS",
          message: `網站回應正常 (狀態碼: ${res.statusCode})`,
        });
      } else {
        results.push({
          name: "Website Response",
          status: "❌ FAIL",
          message: `網站回應異常 (狀態碼: ${res.statusCode})`,
        });
      }
      resolve();
    });

    req.on("error", (error: any) => {
      results.push({
        name: "Website Response",
        status: "❌ FAIL",
        message: `無法連接到網站: ${error.message}`,
      });
      resolve();
    });

    req.setTimeout(5000, () => {
      req.destroy();
      results.push({
        name: "Website Response",
        status: "❌ FAIL",
        message: "連接超時（請確認網站是否正在運行）",
      });
      resolve();
    });
  });
}

async function main() {
  console.log("\n🧪 開始測試環境設定...\n");

  await testDatabase();
  testOAuthProvider();
  testNextAuth();
  await testWebsiteResponse();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("測試結果:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  results.forEach((result) => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   ${result.message}\n`);
  });

  const failed = results.filter((r) => r.status === "❌ FAIL");
  if (failed.length > 0) {
    console.log(`\n❌ 共有 ${failed.length} 項測試失敗\n`);
    process.exit(1);
  } else {
    console.log("\n✅ 所有測試通過！\n");
  }
}

main();

