/**
 * Prisma Client wrapper
 * 根據 DATABASE_local 環境變數決定使用本地資料庫或 MongoDB
 */

import { PrismaClient } from "@prisma/client";
import { initLocalDb, localUserDb, localStudentDb, localSupplierDb, localAdminDb, localVocabularyDb, localWordDb, localCouponDb, localFeedbackFormDb, readData, DB_FILES } from "./local-db";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var localPrisma: any | undefined;
}

const useLocalDb = process.env.DATABASE_local === "true";

// 初始化本地資料庫
if (useLocalDb) {
  initLocalDb();
  console.log("✅ 使用本地資料庫模式");
}

// 創建本地資料庫 wrapper
function createLocalPrisma() {
  return {
    user: {
      ...localUserDb,
      create: async (options: { data: any }) => {
        // Prisma API: create({ data: {...} })
        // 本地資料庫 API: create(data)
        return localUserDb.create(options.data);
      },
      findUnique: async (options: { where: { userId?: string; googleId?: string }; select?: any; include?: any }) => {
        // Prisma API: findUnique({ where: { userId: '...' }, select: {...} })
        // 本地資料庫 API: findUnique({ userId: '...' }, { select: {...} })
        return localUserDb.findUnique(options.where, { select: options.select, include: options.include });
      },
      findMany: localUserDb.findMany,
      count: localUserDb.count,
      update: async (options: { where: { userId?: string; googleId?: string }; data: any }) => {
        // Prisma API: update({ where: { userId: '...' }, data: {...} })
        // 本地資料庫 API: update({ userId: '...' }, data)
        if (!options.where.userId && !options.where.googleId) {
          throw new Error("Either userId or googleId must be provided");
        }
        // local-db.update implementation handles both userId and googleId
        // Type assertion is safe because we've verified at least one exists
        return localUserDb.update(options.where as { userId: string; googleId?: string }, options.data);
      },
      delete: async (options: { where: { userId: string } }) => {
        // Prisma API: delete({ where: { userId: '...' } })
        // 本地資料庫 API: delete({ userId: '...' })
        return localUserDb.delete(options.where);
      },
    },
    student: {
      ...localStudentDb,
      findMany: async (options?: { where?: any }) => {
        const students = readData<any>(DB_FILES.students);
        let filtered = students;
        
        if (options?.where) {
          // 處理 lvocabuIDs.has 過濾（查找包含特定 vocabularyId 的 students）
          if (options.where.lvocabuIDs?.has) {
            const vocabularyId = options.where.lvocabuIDs.has;
            filtered = filtered.filter((s: any) => {
              const lvocabuIDs = s.lvocabuIDs || [];
              return lvocabuIDs.includes(vocabularyId);
            });
          }
        }
        
        return filtered;
      },
      update: async (options: { where: { userId: string }; data: any }) => {
        return localStudentDb.update(options.where, options.data);
      },
    },
    supplier: localSupplierDb,
    admin: localAdminDb,
    vocabulary: {
      findUnique: async (options: { where: { vocabularyId: string }; include?: any }) => {
        return localVocabularyDb.findUnique(options.where, { include: options.include });
      },
      findMany: async (options?: any) => {
        const result = await localVocabularyDb.findMany(options);
        // 處理日期格式
        return result.map((v: any) => ({
          ...v,
          createdAt: typeof v.createdAt === "string" ? new Date(v.createdAt) : v.createdAt,
          updatedAt: typeof v.updatedAt === "string" ? new Date(v.updatedAt) : v.updatedAt,
        }));
      },
      count: async (options?: { where?: any }) => {
        return localVocabularyDb.count(options?.where);
      },
      create: async (options: { data: any }) => {
        // Prisma API: create({ data: {...} })
        // 本地資料庫 API: create(data)
        return localVocabularyDb.create(options.data);
      },
      update: async (options: { where: { vocabularyId: string }; data: any }) => {
        // Prisma API: update({ where: { vocabularyId: '...' }, data: {...} })
        // 本地資料庫 API: update({ vocabularyId: '...' }, data)
        return localVocabularyDb.update(options.where, options.data);
      },
      delete: async (options: { where: { vocabularyId: string } }) => {
        // Prisma API: delete({ where: { vocabularyId: '...' } })
        // 本地資料庫 API: delete({ vocabularyId: '...' })
        return localVocabularyDb.delete(options.where);
      },
    },
    word: {
      findMany: async (options: { where: { vocabularyId: string }; skip?: number; take?: number; orderBy?: any }) => {
        return localWordDb.findMany(options.where, { skip: options.skip, take: options.take, orderBy: options.orderBy });
      },
      count: async (options: { where: { vocabularyId: string } }) => {
        return localWordDb.count(options.where);
      },
      createMany: async (options: { data: any[] }) => {
        // Prisma API: createMany({ data: [...] })
        // 本地資料庫 API: createMany([...])
        return localWordDb.createMany(options.data);
      },
      update: async (options: { where: { id: string }; data: any }) => {
        // Prisma API: update({ where: { id: '...' }, data: {...} })
        // 本地資料庫 API: update({ id: '...' }, data)
        return localWordDb.update(options.where, options.data);
      },
      create: async (options: { data: any }) => {
        // Prisma API: create({ data: {...} })
        // 本地資料庫 API: create(data)
        return localWordDb.create(options.data);
      },
    },
    coupon: {
      findUnique: async (where: { couponId: string }) => {
        const coupon = await localCouponDb.findUnique(where);
        if (!coupon) return null;
        return {
          ...coupon,
          period: typeof coupon.period === "string" ? new Date(coupon.period) : coupon.period,
          createdAt: typeof coupon.createdAt === "string" ? new Date(coupon.createdAt) : coupon.createdAt,
          updatedAt: typeof coupon.updatedAt === "string" ? new Date(coupon.updatedAt) : coupon.updatedAt,
        };
      },
      findMany: async (options?: any) => {
        const result = await localCouponDb.findMany(options);
        return result.map((c: any) => ({
          ...c,
          period: typeof c.period === "string" ? new Date(c.period) : c.period,
          createdAt: typeof c.createdAt === "string" ? new Date(c.createdAt) : c.createdAt,
          updatedAt: typeof c.updatedAt === "string" ? new Date(c.updatedAt) : c.updatedAt,
        }));
      },
      count: localCouponDb.count,
      create: async (data: any) => {
        const result = await localCouponDb.create(data);
        return {
          ...result,
          period: typeof result.period === "string" ? new Date(result.period) : result.period,
          createdAt: typeof result.createdAt === "string" ? new Date(result.createdAt) : result.createdAt,
          updatedAt: typeof result.updatedAt === "string" ? new Date(result.updatedAt) : result.updatedAt,
        };
      },
      update: async (where: { couponId: string }, data: any) => {
        const result = await localCouponDb.update(where, data);
        return {
          ...result,
          period: typeof result.period === "string" ? new Date(result.period) : result.period,
          createdAt: typeof result.createdAt === "string" ? new Date(result.createdAt) : result.createdAt,
          updatedAt: typeof result.updatedAt === "string" ? new Date(result.updatedAt) : result.updatedAt,
        };
      },
      delete: localCouponDb.delete,
    },
    feedbackForm: {
      findFirst: async (options?: { orderBy?: any }) => {
        return localFeedbackFormDb.findFirst(options);
      },
      create: async (options: { data: any }) => {
        return localFeedbackFormDb.create(options.data);
      },
      update: async (options: { where: { id: string }; data: any }) => {
        return localFeedbackFormDb.update(options.where, options.data);
      },
    },
    $disconnect: async () => {
      // 本地資料庫不需要斷開連接
    },
  };
}

// 根據環境變數決定使用哪種資料庫
let prismaInstance: any;

if (useLocalDb) {
  // 使用本地資料庫
  prismaInstance = globalThis.localPrisma ?? createLocalPrisma();
  if (process.env.NODE_ENV !== "production") {
    globalThis.localPrisma = prismaInstance;
  }
} else {
  // 使用 MongoDB
  // 檢查 DATABASE_URL（只在開發環境檢查）
  if (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL) {
    console.warn(
      "⚠️  DATABASE_URL 環境變數未設定。請檢查 .env 文件。"
    );
  }

  prismaInstance =
    globalThis.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

  if (process.env.NODE_ENV !== "production") {
    globalThis.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;
