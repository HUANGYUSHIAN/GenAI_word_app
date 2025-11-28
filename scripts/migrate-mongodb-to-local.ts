/**
 * Script to migrate data from MongoDB to local database
 * Usage: npm run db:migrate-to-local
 * 
 * ⚠️  WARNING: This script will overwrite all local database files.
 * Make sure you have backed up your local database before running this.
 * 
 * Prerequisites:
 * 1. Set DATABASE_local=false in .env
 * 2. Set DATABASE_URL to your MongoDB connection string
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { initLocalDb, DB_FILES } from "../src/lib/local-db";

dotenv.config();

const useLocalDb = process.env.DATABASE_local === "true";

if (useLocalDb) {
  console.error("\n❌ 錯誤：請先將 .env 中的 DATABASE_local 設置為 false");
  console.error("   然後設置正確的 DATABASE_URL\n");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("\n❌ 錯誤：DATABASE_URL 未設置");
  console.error("   請在 .env 中設置 DATABASE_URL\n");
  process.exit(1);
}

// 寫入資料到本地文件
function writeLocalData(filePath: string, data: any[]) {
  // 確保目錄存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// 轉換 MongoDB 日期為 ISO 字符串
function convertDate(date: any): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString();
  }
  if (typeof date === "string") {
    return date;
  }
  return null;
}

async function migrateData() {
  const prisma = new PrismaClient();

  try {
    console.log("\n🔄 開始從 MongoDB 遷移資料到本地資料庫...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 初始化本地資料庫目錄
    initLocalDb();

    // 1. 遷移 Users
    console.log("📦 遷移 Users...");
    const users = await prisma.user.findMany();
    const localUsers = users.map((user) => ({
      id: user.id,
      userId: user.userId,
      googleId: user.googleId || null,
      name: user.name || null,
      email: user.email || null,
      image: user.image || null,
      phoneNumber: user.phoneNumber || null,
      birthday: convertDate(user.birthday),
      language: user.language || null,
      isLock: user.isLock || false,
      dataType: user.dataType || null,
      feedback: user.feedback || null,
      createdAt: convertDate(user.createdAt),
      updatedAt: convertDate(user.updatedAt),
    }));
    writeLocalData(DB_FILES.users, localUsers);
    console.log(`  ✅ 已遷移 ${localUsers.length} 個用戶\n`);

    // 2. 遷移 Students
    console.log("📦 遷移 Students...");
    const students = await prisma.student.findMany();
    const localStudents = students.map((student) => ({
      id: student.id,
      userId: student.userId,
      lvocabuIDs: student.lvocabuIDs || [],
      lcouponIDs: student.lcouponIDs || [],
      paraGame: student.paraGame || null,
      payments: student.payments || null,
      lfriendIDs: student.lfriendIDs || [],
      createdAt: convertDate(student.createdAt),
      updatedAt: convertDate(student.updatedAt),
    }));
    writeLocalData(DB_FILES.students, localStudents);
    console.log(`  ✅ 已遷移 ${localStudents.length} 個學生\n`);

    // 3. 遷移 Suppliers
    console.log("📦 遷移 Suppliers...");
    const suppliers = await prisma.supplier.findMany();
    const localSuppliers = suppliers.map((supplier) => ({
      id: supplier.id,
      userId: supplier.userId,
      lsuppcoIDs: supplier.lsuppcoIDs || [],
      payments: supplier.payments || null,
      createdAt: convertDate(supplier.createdAt),
      updatedAt: convertDate(supplier.updatedAt),
    }));
    writeLocalData(DB_FILES.suppliers, localSuppliers);
    console.log(`  ✅ 已遷移 ${localSuppliers.length} 個廠商\n`);

    // 4. 遷移 Admins
    console.log("📦 遷移 Admins...");
    const admins = await prisma.admin.findMany();
    const localAdmins = admins.map((admin) => ({
      id: admin.id,
      userId: admin.userId,
      permissions: admin.permissions || [],
      createdAt: convertDate(admin.createdAt),
      updatedAt: convertDate(admin.updatedAt),
    }));
    writeLocalData(DB_FILES.admins, localAdmins);
    console.log(`  ✅ 已遷移 ${localAdmins.length} 個管理員\n`);

    // 5. 遷移 Vocabularies
    console.log("📦 遷移 Vocabularies...");
    const vocabularies = await prisma.vocabulary.findMany();
    const localVocabularies = vocabularies.map((vocab) => ({
      id: vocab.id,
      vocabularyId: vocab.vocabularyId,
      name: vocab.name,
      langUse: vocab.langUse,
      langExp: vocab.langExp,
      copyrights: vocab.copyrights || null,
      establisher: vocab.establisher,
      createdAt: convertDate(vocab.createdAt),
      updatedAt: convertDate(vocab.updatedAt),
    }));
    writeLocalData(DB_FILES.vocabularies, localVocabularies);
    console.log(`  ✅ 已遷移 ${localVocabularies.length} 個單字本\n`);

    // 6. 遷移 Words
    console.log("📦 遷移 Words...");
    const words = await prisma.word.findMany();
    // 創建 vocabulary id 到 vocabularyId 的映射
    const vocabIdMap = new Map<string, string>();
    localVocabularies.forEach((v) => {
      vocabIdMap.set(v.id, v.vocabularyId);
    });
    
    const localWords = words.map((word) => {
      // 在本地資料庫中，words.vocabularyId 存儲的是 vocabulary.id（內部 ID）
      // 但我們需要保持與 MongoDB 的兼容性
      return {
        id: word.id,
        vocabularyId: word.vocabularyId, // 這是 MongoDB 的 vocabulary.id
        word: word.word,
        spelling: word.spelling || null,
        explanation: word.explanation,
        partOfSpeech: word.partOfSpeech || null,
        sentence: word.sentence || null,
        createdAt: convertDate(word.createdAt),
        updatedAt: convertDate(word.updatedAt),
      };
    });
    writeLocalData(DB_FILES.words, localWords);
    console.log(`  ✅ 已遷移 ${localWords.length} 個單字\n`);

    // 7. 遷移 Coupons
    console.log("📦 遷移 Coupons...");
    const coupons = await prisma.coupon.findMany();
    const localCoupons = coupons.map((coupon) => ({
      id: coupon.id,
      couponId: coupon.couponId,
      name: coupon.name,
      period: convertDate(coupon.period),
      link: coupon.link || null,
      text: coupon.text || null,
      picture: coupon.picture || null,
      createdAt: convertDate(coupon.createdAt),
      updatedAt: convertDate(coupon.updatedAt),
    }));
    writeLocalData(DB_FILES.coupons, localCoupons);
    console.log(`  ✅ 已遷移 ${localCoupons.length} 個優惠券\n`);

    // 8. 遷移 Stores
    console.log("📦 遷移 Stores...");
    const stores = await prisma.store.findMany();
    const localStores = stores.map((store) => ({
      id: store.id,
      supplierId: store.supplierId,
      name: store.name,
      location: store.location || null,
      website: store.website || null,
      lscores: store.lscores || [0, 0, 0, 0, 0],
      createdAt: convertDate(store.createdAt),
      updatedAt: convertDate(store.updatedAt),
    }));
    writeLocalData(DB_FILES.stores, localStores);
    console.log(`  ✅ 已遷移 ${localStores.length} 個店鋪\n`);

    // 9. 遷移 Comments
    console.log("📦 遷移 Comments...");
    const comments = await prisma.comment.findMany();
    const localComments = comments.map((comment) => ({
      id: comment.id,
      storeId: comment.storeId,
      userId: comment.userId,
      score: comment.score,
      content: comment.content || null,
      createdAt: convertDate(comment.createdAt),
      updatedAt: convertDate(comment.updatedAt),
    }));
    writeLocalData(DB_FILES.comments, localComments);
    console.log(`  ✅ 已遷移 ${localComments.length} 個評論\n`);

    // 10. 遷移 FeedbackForms（如果存在）
    try {
      const feedbackForms = await prisma.feedbackForm.findMany();
      if (feedbackForms.length > 0) {
        console.log("📦 遷移 FeedbackForms...");
        const localFeedbackForms = feedbackForms.map((form) => ({
          id: form.id,
          questions: form.questions || null,
          createdAt: convertDate(form.createdAt),
          updatedAt: convertDate(form.updatedAt),
        }));
        writeLocalData(DB_FILES.feedback_forms, localFeedbackForms);
        console.log(`  ✅ 已遷移 ${localFeedbackForms.length} 個反饋表單\n`);
      }
    } catch (error: any) {
      // FeedbackForm 可能不存在，忽略錯誤
      console.log("  ⚠️  跳過 FeedbackForms（可能不存在）\n");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ 遷移完成！");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📝 提示：");
    console.log("   1. 現在可以將 .env 中的 DATABASE_local 設置為 true");
    console.log("   2. 本地資料庫文件已保存在 .local-db/ 目錄");
    console.log("   3. 可以將這些文件提交到版本控制（如果需要的話）\n");
  } catch (error: any) {
    console.error("\n❌ 遷移失敗:", error);
    if (error.message) {
      console.error("   錯誤訊息:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();

