import * as dotenv from "dotenv";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { initLocalDb, localUserDb, localVocabularyDb, localCouponDb } from "../src/lib/local-db";

// 讀取 .env
const envPath = path.resolve(process.cwd(), ".env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`\n❌ 無法讀取 .env 文件: ${result.error.message}`);
  console.error(`   嘗試從路徑讀取: ${envPath}\n`);
  process.exit(1);
}

const useLocalDb = process.env.DATABASE_local === "true";

async function queryDatabase() {
  console.log("\n🔍 資料庫查詢與測試\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`資料庫模式: ${useLocalDb ? "本地 JSON 檔案" : "MongoDB"}`);
  
  if (useLocalDb) {
    console.log(`本地資料庫路徑: ${path.join(process.cwd(), ".local-db")}`);
  } else {
    const dbUrl = process.env.DATABASE_URL || "";
    const maskedUrl = dbUrl.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
    console.log(`MongoDB 連接: ${maskedUrl}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    if (useLocalDb) {
      // 本地資料庫查詢
      initLocalDb();
      
      console.log("📊 查詢本地資料庫...\n");
      
      // 查詢 Users
      const userCount = await localUserDb.count();
      const users = await localUserDb.findMany({ take: 10, orderBy: { createdAt: "desc" } });
      
      console.log(`👥 Users: ${userCount} 筆`);
      if (users.length > 0) {
        console.log("   最新 10 筆:");
        users.forEach((u: any) => {
          console.log(`   - ${u.name || "N/A"} (${u.email || "N/A"}) [${u.userId}]`);
        });
      }
      
      // 查詢 Vocabularies
      const vocabCount = await localVocabularyDb.count();
      const vocabularies = await localVocabularyDb.findMany({ take: 5, orderBy: { createdAt: "desc" } });
      
      console.log(`\n📚 Vocabularies: ${vocabCount} 筆`);
      if (vocabularies.length > 0) {
        console.log("   最新 5 筆:");
        vocabularies.forEach((v: any) => {
          console.log(`   - ${v.name} [${v.vocabularyId}] (${v.langUse} → ${v.langExp})`);
        });
      }
      
      // 查詢 Coupons
      const couponCount = await localCouponDb.count();
      const coupons = await localCouponDb.findMany({ take: 5, orderBy: { createdAt: "desc" } });
      
      console.log(`\n🎫 Coupons: ${couponCount} 筆`);
      if (coupons.length > 0) {
        console.log("   最新 5 筆:");
        coupons.forEach((c: any) => {
          const period = c.period ? new Date(c.period).toISOString().slice(0, 10) : "N/A";
          console.log(`   - ${c.name || c.text || "N/A"} [${c.couponId}] (期限: ${period})`);
        });
      }
      
    } else {
      // MongoDB 查詢
      // 使用與應用程式相同的 Prisma Client 設定
      const prisma = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
      
      console.log("📊 查詢 MongoDB...\n");
      
      // 測試連接（直接執行一個簡單查詢來驗證）
      try {
        // 不單獨調用 $connect()，直接執行查詢會自動連接
        // 使用最簡單的查詢來測試連接
        await prisma.user.count();
        console.log("   ✅ MongoDB 連接成功\n");
      } catch (connectError: any) {
        console.log("   ⚠️  MongoDB 連接失敗:");
        const errorMsg = connectError.message || String(connectError);
        console.log(`      ${errorMsg}`);
        
        if (errorMsg.includes("timeout") || errorMsg.includes("Server selection")) {
          console.log("\n   這可能是網路連接問題。請檢查:");
          console.log("   1. 網路連線是否正常");
          console.log("   2. MongoDB Atlas IP 白名單設定（允許當前 IP）");
          console.log("   3. 防火牆或代理設定");
          console.log("   4. DATABASE_URL 中的超時設定");
          console.log("\n   如果應用程式可以正常使用，這可能是暫時的網路問題。");
          console.log("   建議：");
          console.log("   - 檢查 MongoDB Atlas 控制台的 Network Access");
          console.log("   - 嘗試將當前 IP 加入白名單，或使用 0.0.0.0/0（僅開發環境）");
          console.log("   - 檢查 DATABASE_URL 是否正確");
        } else {
          console.log("\n   錯誤詳情:");
          if (connectError.code) {
            console.log(`   錯誤代碼: ${connectError.code}`);
          }
          if (connectError.meta) {
            console.log(`   錯誤元數據: ${JSON.stringify(connectError.meta, null, 2)}`);
          }
        }
        console.log("");
        await prisma.$disconnect().catch(() => {});
        return;
      }
      
      // 查詢 Users
      try {
        const userCount = await prisma.user.count();
        const users = await prisma.user.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { userId: true, name: true, email: true, dataType: true },
        });
        
        console.log(`👥 Users: ${userCount} 筆`);
        if (users.length > 0) {
          console.log("   最新 10 筆:");
          users.forEach((u) => {
            console.log(`   - ${u.name || "N/A"} (${u.email || "N/A"}) [${u.userId}] ${u.dataType ? `[${u.dataType}]` : ""}`);
          });
        }
      } catch (error: any) {
        console.log(`   ⚠️  查詢 Users 失敗: ${error.message}`);
      }
      
      // 查詢 Vocabularies
      try {
        const vocabCount = await prisma.vocabulary.count();
        const vocabularies = await prisma.vocabulary.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { vocabularyId: true, name: true, langUse: true, langExp: true },
        });
        
        console.log(`\n📚 Vocabularies: ${vocabCount} 筆`);
        if (vocabularies.length > 0) {
          console.log("   最新 5 筆:");
          vocabularies.forEach((v) => {
            console.log(`   - ${v.name} [${v.vocabularyId}] (${v.langUse} → ${v.langExp})`);
          });
        }
      } catch (error: any) {
        console.log(`\n   ⚠️  查詢 Vocabularies 失敗: ${error.message}`);
      }
      
      // 查詢 Coupons
      try {
        const couponCount = await prisma.coupon.count();
        const coupons = await prisma.coupon.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { couponId: true, name: true, text: true, period: true },
        });
        
        console.log(`\n🎫 Coupons: ${couponCount} 筆`);
        if (coupons.length > 0) {
          console.log("   最新 5 筆:");
          coupons.forEach((c) => {
            const period = c.period ? c.period.toISOString().slice(0, 10) : "N/A";
            console.log(`   - ${c.name || c.text || "N/A"} [${c.couponId}] (期限: ${period})`);
          });
        }
      } catch (error: any) {
        console.log(`\n   ⚠️  查詢 Coupons 失敗: ${error.message}`);
      }
      
      await prisma.$disconnect();
    }
    
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ 查詢完成！\n");
    
  } catch (error: any) {
    console.log("\n❌ 查詢失敗！\n");
    console.log("錯誤詳情:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`錯誤訊息: ${error.message}`);
    if (error.code) {
      console.log(`錯誤代碼: ${error.code}`);
    }
    if (error.stack) {
      console.log(`\n堆疊追蹤:\n${error.stack}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    process.exit(1);
  }
}

queryDatabase();

