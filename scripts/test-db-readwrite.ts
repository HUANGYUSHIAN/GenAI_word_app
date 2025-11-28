/**
 * Script to test database read/write operations
 * Usage: npm run db:test-readwrite
 * 
 * This script tests:
 * - Database connection
 * - Create operations
 * - Read operations
 * - Update operations
 * - Delete operations
 * 
 * Works with both local database and MongoDB
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { initLocalDb, localUserDb, localVocabularyDb, localWordDb, localCouponDb } from "../src/lib/local-db";

// 讀取 .env
const envPath = path.resolve(process.cwd(), ".env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`\n❌ 無法讀取 .env 文件: ${result.error.message}`);
  console.error(`   嘗試從路徑讀取: ${envPath}\n`);
  process.exit(1);
}

const useLocalDb = process.env.DATABASE_local === "true";

interface TestResult {
  test: string;
  status: "✅ PASS" | "❌ FAIL";
  message: string;
  duration?: number;
}

const results: TestResult[] = [];
const testData: { userId?: string; vocabularyId?: string; wordId?: string; couponId?: string } = {};

// 生成測試 ID
function generateTestId(prefix: string): string {
  return `TEST_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// 執行測試並記錄結果
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({
      test: name,
      status: "✅ PASS",
      message: "測試通過",
      duration,
    });
    console.log(`   ✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      test: name,
      status: "❌ FAIL",
      message: error.message || String(error),
      duration,
    });
    console.log(`   ❌ ${name}: ${error.message || String(error)}`);
    throw error;
  }
}

async function testLocalDatabase() {
  console.log("\n📦 測試本地資料庫讀寫操作...\n");

  // 初始化本地資料庫
  initLocalDb();

  // 1. 測試 User CRUD
  console.log("1. 測試 User 操作...");
  
  await runTest("User - Create", async () => {
    const testUserId = generateTestId("USER");
    const testGoogleId = `TEST_GOOGLE_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    testData.userId = testUserId;
    
    // 先檢查並清理可能存在的測試數據
    try {
      const existing = await localUserDb.findUnique({ userId: testUserId });
      if (existing) {
        await localUserDb.delete({ userId: testUserId });
      }
    } catch (error) {
      // 忽略清理錯誤
    }
    
    const user = await localUserDb.create({
      userId: testUserId,
      googleId: testGoogleId, // 確保 googleId 是唯一的
      name: "Test User",
      email: `test_${Date.now()}@example.com`, // 確保 email 也是唯一的
      dataType: "Student",
    });
    if (!user || user.userId !== testUserId) {
      throw new Error("創建用戶失敗");
    }
  });

  await runTest("User - Read", async () => {
    if (!testData.userId) throw new Error("測試用戶 ID 不存在");
    const user = await localUserDb.findUnique({ userId: testData.userId });
    if (!user || user.userId !== testData.userId) {
      throw new Error("讀取用戶失敗");
    }
  });

  await runTest("User - Update", async () => {
    if (!testData.userId) throw new Error("測試用戶 ID 不存在");
    const updated = await localUserDb.update(
      { userId: testData.userId },
      { name: "Updated Test User" }
    );
    if (updated.name !== "Updated Test User") {
      throw new Error("更新用戶失敗");
    }
  });

  await runTest("User - Count", async () => {
    const count = await localUserDb.count();
    if (typeof count !== "number" || count < 0) {
      throw new Error("計數查詢失敗");
    }
  });

  await runTest("User - Delete", async () => {
    if (!testData.userId) throw new Error("測試用戶 ID 不存在");
    await localUserDb.delete({ userId: testData.userId });
    const user = await localUserDb.findUnique({ userId: testData.userId });
    if (user) {
      throw new Error("刪除用戶失敗，用戶仍然存在");
    }
  });

  // 2. 測試 Vocabulary CRUD
  console.log("\n2. 測試 Vocabulary 操作...");

  await runTest("Vocabulary - Create", async () => {
    const testVocabId = generateTestId("VOCAB");
    testData.vocabularyId = testVocabId;
    const vocab = await localVocabularyDb.create({
      vocabularyId: testVocabId,
      name: "Test Vocabulary",
      langUse: "English",
      langExp: "Traditional Chinese",
      establisher: "test_user",
    });
    if (!vocab || vocab.vocabularyId !== testVocabId) {
      throw new Error("創建單字本失敗");
    }
  });

  await runTest("Vocabulary - Read", async () => {
    if (!testData.vocabularyId) throw new Error("測試單字本 ID 不存在");
    const vocab = await localVocabularyDb.findUnique({ vocabularyId: testData.vocabularyId });
    if (!vocab || vocab.vocabularyId !== testData.vocabularyId) {
      throw new Error("讀取單字本失敗");
    }
  });

  await runTest("Vocabulary - Update", async () => {
    if (!testData.vocabularyId) throw new Error("測試單字本 ID 不存在");
    const updated = await localVocabularyDb.update(
      { vocabularyId: testData.vocabularyId },
      { name: "Updated Test Vocabulary" }
    );
    if (updated.name !== "Updated Test Vocabulary") {
      throw new Error("更新單字本失敗");
    }
  });

  await runTest("Vocabulary - Count", async () => {
    const count = await localVocabularyDb.count();
    if (typeof count !== "number" || count < 0) {
      throw new Error("計數查詢失敗");
    }
  });

  // 3. 測試 Word CRUD（需要 Vocabulary）
  console.log("\n3. 測試 Word 操作...");

  await runTest("Word - Create", async () => {
    if (!testData.vocabularyId) throw new Error("測試單字本 ID 不存在");
    // 先獲取 vocabulary 的內部 id
    const vocab = await localVocabularyDb.findUnique({ vocabularyId: testData.vocabularyId });
    if (!vocab) throw new Error("找不到測試單字本");
    
    const word = await localWordDb.create({
      vocabularyId: vocab.id,
      word: "test",
      explanation: "測試",
      sentence: "This is a <test<sentence.",
    });
    if (!word || !word.id) {
      throw new Error("創建單字失敗");
    }
    testData.wordId = word.id;
  });

  await runTest("Word - Read", async () => {
    if (!testData.vocabularyId) throw new Error("測試單字本 ID 不存在");
    const vocab = await localVocabularyDb.findUnique({ vocabularyId: testData.vocabularyId });
    if (!vocab) throw new Error("找不到測試單字本");
    
    const words = await localWordDb.findMany({ vocabularyId: vocab.id });
    if (!Array.isArray(words) || words.length === 0) {
      throw new Error("讀取單字失敗");
    }
  });

  await runTest("Word - Update", async () => {
    if (!testData.wordId) throw new Error("測試單字 ID 不存在");
    const updated = await localWordDb.update(
      { id: testData.wordId },
      { word: "updated_test" }
    );
    if (updated.word !== "updated_test") {
      throw new Error("更新單字失敗");
    }
  });

  // 清理測試數據
  console.log("\n4. 清理測試數據...");
  try {
    if (testData.vocabularyId) {
      await localVocabularyDb.delete({ vocabularyId: testData.vocabularyId });
    }
  } catch (error) {
    console.log(`   ⚠️  清理單字本失敗: ${error}`);
  }

  // 4. 測試 Coupon CRUD
  console.log("\n5. 測試 Coupon 操作...");

  await runTest("Coupon - Create", async () => {
    const testCouponId = generateTestId("COUPON");
    testData.couponId = testCouponId;
    
    // 先檢查並清理可能存在的測試數據
    try {
      const existing = await localCouponDb.findUnique({ couponId: testCouponId });
      if (existing) {
        await localCouponDb.delete({ couponId: testCouponId });
      }
    } catch (error) {
      // 忽略清理錯誤
    }
    
    const coupon = await localCouponDb.create({
      couponId: testCouponId,
      name: "Test Coupon",
      period: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 天後
      text: "Test coupon description",
    });
    if (!coupon || coupon.couponId !== testCouponId) {
      throw new Error("創建優惠券失敗");
    }
  });

  await runTest("Coupon - Read", async () => {
    if (!testData.couponId) throw new Error("測試優惠券 ID 不存在");
    const coupon = await localCouponDb.findUnique({ couponId: testData.couponId });
    if (!coupon || coupon.couponId !== testData.couponId) {
      throw new Error("讀取優惠券失敗");
    }
  });

  await runTest("Coupon - Update", async () => {
    if (!testData.couponId) throw new Error("測試優惠券 ID 不存在");
    const updated = await localCouponDb.update(
      { couponId: testData.couponId },
      { name: "Updated Test Coupon" }
    );
    if (updated.name !== "Updated Test Coupon") {
      throw new Error("更新優惠券失敗");
    }
  });

  await runTest("Coupon - Delete", async () => {
    if (!testData.couponId) throw new Error("測試優惠券 ID 不存在");
    await localCouponDb.delete({ couponId: testData.couponId });
    const coupon = await localCouponDb.findUnique({ couponId: testData.couponId });
    if (coupon) {
      throw new Error("刪除優惠券失敗，優惠券仍然存在");
    }
  });
}

async function testMongoDB() {
  console.log("\n📦 測試 MongoDB 讀寫操作...\n");

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  try {
    // 測試連接
    console.log("0. 測試連接...");
    try {
      await runTest("MongoDB - Connection", async () => {
        // 使用 $connect() 先嘗試連接，並設置超時
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("連接超時（30秒）")), 30000)
          ),
        ]);
        // 連接成功後執行一個簡單查詢
        await prisma.user.count();
      });
    } catch (error: any) {
      // 連接失敗時提供詳細的錯誤訊息和建議
      const errorMsg = error.message || String(error);
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("❌ MongoDB 連接失敗");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      console.log("錯誤訊息:", errorMsg);
      
      if (errorMsg.includes("timeout") || errorMsg.includes("Server selection") || errorMsg.includes("I/O error")) {
        console.log("\n這可能是網路連接問題。請檢查：");
        console.log("1. 網路連線是否正常");
        console.log("2. MongoDB Atlas IP 白名單設定（允許當前 IP）");
        console.log("3. 防火牆或代理設定");
        console.log("4. DATABASE_URL 中的超時設定");
        console.log("\n建議：");
        console.log("- 檢查 MongoDB Atlas 控制台的 Network Access");
        console.log("- 嘗試將當前 IP 加入白名單，或使用 0.0.0.0/0（僅開發環境）");
        console.log("- 檢查 DATABASE_URL 是否正確");
        console.log("- 嘗試使用本地資料庫模式進行測試（設置 DATABASE_local=true）");
      } else {
        console.log("\n請檢查：");
        console.log("- DATABASE_URL 是否正確");
        console.log("- MongoDB 服務是否正常運行");
        console.log("- 憑證是否有效");
      }
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      throw error;
    }

    // 1. 測試 User CRUD
    console.log("\n1. 測試 User 操作...");

    await runTest("User - Create", async () => {
      const testUserId = generateTestId("USER");
      const testGoogleId = `TEST_GOOGLE_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      testData.userId = testUserId;
      
      // 先檢查並清理可能存在的測試數據
      try {
        const existing = await prisma.user.findUnique({
          where: { userId: testUserId },
        });
        if (existing) {
          await prisma.user.delete({ where: { userId: testUserId } });
        }
      } catch (error) {
        // 忽略清理錯誤
      }
      
      const user = await prisma.user.create({
        data: {
          userId: testUserId,
          googleId: testGoogleId, // 確保 googleId 是唯一的，避免 null 值衝突
          name: "Test User",
          email: `test_${Date.now()}@example.com`, // 確保 email 也是唯一的
          dataType: "Student",
        },
      });
      if (!user || user.userId !== testUserId) {
        throw new Error("創建用戶失敗");
      }
    });

    await runTest("User - Read", async () => {
      if (!testData.userId) throw new Error("測試用戶 ID 不存在");
      const user = await prisma.user.findUnique({
        where: { userId: testData.userId },
      });
      if (!user || user.userId !== testData.userId) {
        throw new Error("讀取用戶失敗");
      }
    });

    await runTest("User - Update", async () => {
      if (!testData.userId) throw new Error("測試用戶 ID 不存在");
      const updated = await prisma.user.update({
        where: { userId: testData.userId },
        data: { name: "Updated Test User" },
      });
      if (updated.name !== "Updated Test User") {
        throw new Error("更新用戶失敗");
      }
    });

    await runTest("User - Count", async () => {
      const count = await prisma.user.count();
      if (typeof count !== "number" || count < 0) {
        throw new Error("計數查詢失敗");
      }
    });

    await runTest("User - Delete", async () => {
      if (!testData.userId) throw new Error("測試用戶 ID 不存在");
      await prisma.user.delete({
        where: { userId: testData.userId },
      });
      const user = await prisma.user.findUnique({
        where: { userId: testData.userId },
      });
      if (user) {
        throw new Error("刪除用戶失敗，用戶仍然存在");
      }
    });

    // 2. 測試 Vocabulary CRUD
    console.log("\n2. 測試 Vocabulary 操作...");

    await runTest("Vocabulary - Create", async () => {
      const testVocabId = generateTestId("VOCAB");
      testData.vocabularyId = testVocabId;
      const vocab = await prisma.vocabulary.create({
        data: {
          vocabularyId: testVocabId,
          name: "Test Vocabulary",
          langUse: "English",
          langExp: "Traditional Chinese",
          establisher: "test_user",
        },
      });
      if (!vocab || vocab.vocabularyId !== testVocabId) {
        throw new Error("創建單字本失敗");
      }
    });

    await runTest("Vocabulary - Read", async () => {
      if (!testData.vocabularyId) throw new Error("測試單字本 ID 不存在");
      const vocab = await prisma.vocabulary.findUnique({
        where: { vocabularyId: testData.vocabularyId },
      });
      if (!vocab || vocab.vocabularyId !== testData.vocabularyId) {
        throw new Error("讀取單字本失敗");
      }
    });

    await runTest("Vocabulary - Update", async () => {
      if (!testData.vocabularyId) throw new Error("測試單字本 ID 不存在");
      const updated = await prisma.vocabulary.update({
        where: { vocabularyId: testData.vocabularyId },
        data: { name: "Updated Test Vocabulary" },
      });
      if (updated.name !== "Updated Test Vocabulary") {
        throw new Error("更新單字本失敗");
      }
    });

    await runTest("Vocabulary - Count", async () => {
      const count = await prisma.vocabulary.count();
      if (typeof count !== "number" || count < 0) {
        throw new Error("計數查詢失敗");
      }
    });

    // 3. 測試 Word CRUD（需要 Vocabulary）
    console.log("\n3. 測試 Word 操作...");

    await runTest("Word - Create", async () => {
      if (!testData.vocabularyId) throw new Error("測試單字本 ID 不存在");
      const vocab = await prisma.vocabulary.findUnique({
        where: { vocabularyId: testData.vocabularyId },
      });
      if (!vocab) throw new Error("找不到測試單字本");

      const word = await prisma.word.create({
        data: {
          vocabularyId: vocab.id,
          word: "test",
          explanation: "測試",
          sentence: "This is a <test<sentence.",
        },
      });
      if (!word || !word.id) {
        throw new Error("創建單字失敗");
      }
      testData.wordId = word.id;
    });

    await runTest("Word - Read", async () => {
      if (!testData.vocabularyId) throw new Error("測試單字本 ID 不存在");
      const vocab = await prisma.vocabulary.findUnique({
        where: { vocabularyId: testData.vocabularyId },
      });
      if (!vocab) throw new Error("找不到測試單字本");

      const words = await prisma.word.findMany({
        where: { vocabularyId: vocab.id },
      });
      if (!Array.isArray(words) || words.length === 0) {
        throw new Error("讀取單字失敗");
      }
    });

    await runTest("Word - Update", async () => {
      if (!testData.wordId) throw new Error("測試單字 ID 不存在");
      const updated = await prisma.word.update({
        where: { id: testData.wordId },
        data: { word: "updated_test" },
      });
      if (updated.word !== "updated_test") {
        throw new Error("更新單字失敗");
      }
    });

    // 清理測試數據
    console.log("\n4. 清理測試數據...");
    try {
      if (testData.vocabularyId) {
        await prisma.vocabulary.delete({
          where: { vocabularyId: testData.vocabularyId },
        });
      }
    } catch (error) {
      console.log(`   ⚠️  清理單字本失敗: ${error}`);
    }

    // 4. 測試 Coupon CRUD
    console.log("\n5. 測試 Coupon 操作...");

    await runTest("Coupon - Create", async () => {
      const testCouponId = generateTestId("COUPON");
      testData.couponId = testCouponId;
      
      // 先檢查並清理可能存在的測試數據
      try {
        const existing = await prisma.coupon.findUnique({
          where: { couponId: testCouponId },
        });
        if (existing) {
          await prisma.coupon.delete({ where: { couponId: testCouponId } });
        }
      } catch (error) {
        // 忽略清理錯誤
      }
      
      const coupon = await prisma.coupon.create({
        data: {
          couponId: testCouponId,
          name: "Test Coupon",
          period: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 天後
          text: "Test coupon description",
        },
      });
      if (!coupon || coupon.couponId !== testCouponId) {
        throw new Error("創建優惠券失敗");
      }
    });

    await runTest("Coupon - Read", async () => {
      if (!testData.couponId) throw new Error("測試優惠券 ID 不存在");
      const coupon = await prisma.coupon.findUnique({
        where: { couponId: testData.couponId },
      });
      if (!coupon || coupon.couponId !== testData.couponId) {
        throw new Error("讀取優惠券失敗");
      }
    });

    await runTest("Coupon - Update", async () => {
      if (!testData.couponId) throw new Error("測試優惠券 ID 不存在");
      const updated = await prisma.coupon.update({
        where: { couponId: testData.couponId },
        data: { name: "Updated Test Coupon" },
      });
      if (updated.name !== "Updated Test Coupon") {
        throw new Error("更新優惠券失敗");
      }
    });

    await runTest("Coupon - Delete", async () => {
      if (!testData.couponId) throw new Error("測試優惠券 ID 不存在");
      await prisma.coupon.delete({
        where: { couponId: testData.couponId },
      });
      const coupon = await prisma.coupon.findUnique({
        where: { couponId: testData.couponId },
      });
      if (coupon) {
        throw new Error("刪除優惠券失敗，優惠券仍然存在");
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("\n🧪 資料庫讀寫測試");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`資料庫模式: ${useLocalDb ? "本地 JSON 檔案" : "MongoDB"}`);

  if (useLocalDb) {
    console.log(`本地資料庫路徑: ${path.join(process.cwd(), ".local-db")}`);
  } else {
    const dbUrl = process.env.DATABASE_URL || "";
    if (!dbUrl) {
      console.error("\n❌ 錯誤：DATABASE_URL 未設置");
      console.error("   請在 .env 中設置 DATABASE_URL，或設置 DATABASE_local=true 使用本地資料庫\n");
      process.exit(1);
    }
    const maskedUrl = dbUrl.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
    console.log(`MongoDB 連接: ${maskedUrl}`);
    console.log("\n💡 提示：如果連接失敗，可以設置 DATABASE_local=true 使用本地資料庫進行測試");
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    if (useLocalDb) {
      await testLocalDatabase();
    } else {
      await testMongoDB();
    }

    // 顯示測試結果摘要
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 測試結果摘要");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const passed = results.filter((r) => r.status === "✅ PASS").length;
    const failed = results.filter((r) => r.status === "❌ FAIL").length;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    console.log(`總測試數: ${results.length}`);
    console.log(`✅ 通過: ${passed}`);
    console.log(`❌ 失敗: ${failed}`);
    console.log(`⏱️  總耗時: ${totalDuration}ms`);
    console.log(`📈 平均耗時: ${Math.round(totalDuration / results.length)}ms\n`);

    if (failed > 0) {
      console.log("失敗的測試:");
      results
        .filter((r) => r.status === "❌ FAIL")
        .forEach((r) => {
          console.log(`  ❌ ${r.test}: ${r.message}`);
        });
      console.log("");
    }

    if (failed === 0) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ 所有測試通過！資料庫讀寫功能正常。");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } else {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("❌ 部分測試失敗，請檢查上述錯誤訊息。");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      process.exit(1);
    }
  } catch (error: any) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌ 測試執行失敗！");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`錯誤訊息: ${error.message}`);
    if (error.stack) {
      console.log(`\n堆疊追蹤:\n${error.stack}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    process.exit(1);
  }
}

main();

