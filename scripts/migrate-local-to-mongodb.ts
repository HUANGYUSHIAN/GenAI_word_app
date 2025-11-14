/**
 * Script to migrate data from local database to MongoDB
 * Usage: npm run db:migrate-to-mongodb
 * 
 * ⚠️  WARNING: This script will push all local data to MongoDB.
 * Make sure you have backed up your MongoDB database before running this.
 * 
 * Prerequisites:
 * 1. Set DATABASE_local=false in .env
 * 2. Set DATABASE_URL to your MongoDB connection string
 * 3. Run npm run db:push to ensure schema is up to date
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

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

const DB_DIR = path.join(process.cwd(), ".local-db");
const DB_FILES = {
  users: path.join(DB_DIR, "users.json"),
  students: path.join(DB_DIR, "students.json"),
  suppliers: path.join(DB_DIR, "suppliers.json"),
  admins: path.join(DB_DIR, "admins.json"),
  coupons: path.join(DB_DIR, "coupons.json"),
  vocabularies: path.join(DB_DIR, "vocabularies.json"),
  words: path.join(DB_DIR, "words.json"),
  stores: path.join(DB_DIR, "stores.json"),
  comments: path.join(DB_DIR, "comments.json"),
};

function readLocalData(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    if (!content || content.trim() === "") {
      return [];
    }
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      return [];
    }
    // 處理可能的嵌套結構
    return data.map((item: any) => {
      if (!item) return item;
      if (item.data && typeof item.data === "object") {
        const { data: nestedData, ...topLevel } = item;
        return { ...topLevel, ...nestedData };
      }
      return item;
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

async function migrateData() {
  const prisma = new PrismaClient();

  try {
    console.log("\n🔄 開始遷移本地資料庫到 MongoDB...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 1. 遷移 Users
    console.log("📦 遷移 Users...");
    const users = readLocalData(DB_FILES.users);
    let userCount = 0;
    for (const user of users) {
      try {
        // 檢查是否已存在
        const existing = await prisma.user.findUnique({
          where: { userId: user.userId },
        });
        if (!existing) {
          await prisma.user.create({
            data: {
              userId: user.userId,
              googleId: user.googleId || null,
              name: user.name || null,
              email: user.email || null,
              image: user.image || null,
              phoneNumber: user.phoneNumber || null,
              birthday: user.birthday ? new Date(user.birthday) : null,
              language: user.language || null,
              isLock: user.isLock || false,
              dataType: user.dataType || null,
            },
          });
          userCount++;
        }
      } catch (error: any) {
        console.error(`  ⚠️  跳過用戶 ${user.userId}:`, error.message);
      }
    }
    console.log(`  ✅ 已遷移 ${userCount} 個用戶\n`);

    // 2. 遷移 Students
    console.log("📦 遷移 Students...");
    const students = readLocalData(DB_FILES.students);
    let studentCount = 0;
    for (const student of students) {
      try {
        const existing = await prisma.student.findUnique({
          where: { userId: student.userId },
        });
        if (!existing) {
          await prisma.student.create({
            data: {
              userId: student.userId,
              lvocabuIDs: student.lvocabuIDs || [],
              lcouponIDs: student.lcouponIDs || [],
              paraGame: student.paraGame || null,
              payments: student.payments || null,
              lfriendIDs: student.lfriendIDs || [],
            },
          });
          studentCount++;
        }
      } catch (error: any) {
        console.error(`  ⚠️  跳過學生 ${student.userId}:`, error.message);
      }
    }
    console.log(`  ✅ 已遷移 ${studentCount} 個學生\n`);

    // 3. 遷移 Suppliers
    console.log("📦 遷移 Suppliers...");
    const suppliers = readLocalData(DB_FILES.suppliers);
    let supplierCount = 0;
    for (const supplier of suppliers) {
      try {
        const existing = await prisma.supplier.findUnique({
          where: { userId: supplier.userId },
        });
        if (!existing) {
          await prisma.supplier.create({
            data: {
              userId: supplier.userId,
              lsuppcoIDs: supplier.lsuppcoIDs || [],
              payments: supplier.payments || null,
            },
          });
          supplierCount++;
        }
      } catch (error: any) {
        console.error(`  ⚠️  跳過廠商 ${supplier.userId}:`, error.message);
      }
    }
    console.log(`  ✅ 已遷移 ${supplierCount} 個廠商\n`);

    // 4. 遷移 Admins
    console.log("📦 遷移 Admins...");
    const admins = readLocalData(DB_FILES.admins);
    let adminCount = 0;
    for (const admin of admins) {
      try {
        const existing = await prisma.admin.findUnique({
          where: { userId: admin.userId },
        });
        if (!existing) {
          await prisma.admin.create({
            data: {
              userId: admin.userId,
              permissions: admin.permissions || [],
            },
          });
          adminCount++;
        }
      } catch (error: any) {
        console.error(`  ⚠️  跳過管理員 ${admin.userId}:`, error.message);
      }
    }
    console.log(`  ✅ 已遷移 ${adminCount} 個管理員\n`);

    // 5. 遷移 Vocabularies
    console.log("📦 遷移 Vocabularies...");
    const vocabularies = readLocalData(DB_FILES.vocabularies);
    let vocabCount = 0;
    for (const vocab of vocabularies) {
      try {
        const existing = await prisma.vocabulary.findUnique({
          where: { vocabularyId: vocab.vocabularyId },
        });
        if (!existing) {
          await prisma.vocabulary.create({
            data: {
              vocabularyId: vocab.vocabularyId,
              name: vocab.name,
              langUse: vocab.langUse,
              langExp: vocab.langExp,
              copyrights: vocab.copyrights || null,
              establisher: vocab.establisher,
            },
          });
          vocabCount++;
        }
      } catch (error: any) {
        console.error(`  ⚠️  跳過單字本 ${vocab.vocabularyId}:`, error.message);
      }
    }
    console.log(`  ✅ 已遷移 ${vocabCount} 個單字本\n`);

    // 6. 遷移 Words
    console.log("📦 遷移 Words...");
    const words = readLocalData(DB_FILES.words);
    let wordCount = 0;
    for (const word of words) {
      try {
        // 需要找到對應的 vocabulary id
        const vocabulary = await prisma.vocabulary.findUnique({
          where: { vocabularyId: word.vocabularyId },
        });
        if (vocabulary) {
          await prisma.word.create({
            data: {
              vocabularyId: vocabulary.id,
              word: word.word,
              spelling: word.spelling || null,
              explanation: word.explanation,
              partOfSpeech: word.partOfSpeech || null,
              sentence: word.sentence || null,
            },
          });
          wordCount++;
        }
      } catch (error: any) {
        console.error(`  ⚠️  跳過單字 ${word.word}:`, error.message);
      }
    }
    console.log(`  ✅ 已遷移 ${wordCount} 個單字\n`);

    // 7. 遷移 Coupons
    console.log("📦 遷移 Coupons...");
    const coupons = readLocalData(DB_FILES.coupons);
    let couponCount = 0;
    for (const coupon of coupons) {
      try {
        const existing = await prisma.coupon.findUnique({
          where: { couponId: coupon.couponId },
        });
        if (!existing) {
          await prisma.coupon.create({
            data: {
              couponId: coupon.couponId,
              name: coupon.name,
              period: new Date(coupon.period),
              link: coupon.link || null,
              text: coupon.text || null,
              picture: coupon.picture || null,
            },
          });
          couponCount++;
        }
      } catch (error: any) {
        console.error(`  ⚠️  跳過優惠券 ${coupon.couponId}:`, error.message);
      }
    }
    console.log(`  ✅ 已遷移 ${couponCount} 個優惠券\n`);

    // 8. 遷移 Stores 和 Comments（需要先有 Suppliers）
    console.log("📦 遷移 Stores...");
    const stores = readLocalData(DB_FILES.stores);
    let storeCount = 0;
    for (const store of stores) {
      try {
        // 需要找到對應的 supplier id
        const supplier = await prisma.supplier.findFirst({
          where: { id: store.supplierId },
        });
        if (supplier) {
          await prisma.store.create({
            data: {
              supplierId: supplier.id,
              name: store.name,
              location: store.location || null,
              website: store.website || null,
              lscores: store.lscores || [0, 0, 0, 0, 0],
            },
          });
          storeCount++;
        }
      } catch (error: any) {
        console.error(`  ⚠️  跳過店鋪 ${store.name}:`, error.message);
      }
    }
    console.log(`  ✅ 已遷移 ${storeCount} 個店鋪\n`);

    console.log("📦 遷移 Comments...");
    const comments = readLocalData(DB_FILES.comments);
    let commentCount = 0;
    for (const comment of comments) {
      try {
        // 需要找到對應的 store id
        const store = await prisma.store.findFirst({
          where: { id: comment.storeId },
        });
        if (store) {
          await prisma.comment.create({
            data: {
              storeId: store.id,
              userId: comment.userId,
              score: comment.score,
              content: comment.content || null,
            },
          });
          commentCount++;
        }
      } catch (error: any) {
        console.error(`  ⚠️  跳過評論:`, error.message);
      }
    }
    console.log(`  ✅ 已遷移 ${commentCount} 個評論\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ 遷移完成！");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error: any) {
    console.error("\n❌ 遷移失敗:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();

