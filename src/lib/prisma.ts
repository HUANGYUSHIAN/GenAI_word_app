/**
 * Prisma Client wrapper
 * 根據 DATABASE_local 環境變數決定使用本地資料庫或 MongoDB
 */

import { PrismaClient } from "@prisma/client";
import { initLocalDb, localUserDb, localStudentDb, localSupplierDb, localAdminDb, localVocabularyDb, localWordDb, localCouponDb } from "./local-db";

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
        return localUserDb.update(options.where, options.data);
      },
      delete: async (options: { where: { userId: string } }) => {
        // Prisma API: delete({ where: { userId: '...' } })
        // 本地資料庫 API: delete({ userId: '...' })
        return localUserDb.delete(options.where);
      },
    },
    student: localStudentDb,
    supplier: localSupplierDb,
    admin: localAdminDb,
    vocabulary: {
      findUnique: async (where: { vocabularyId: string }, options?: any) => {
        return localVocabularyDb.findUnique(where, options);
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
      count: localVocabularyDb.count,
      create: localVocabularyDb.create,
      update: localVocabularyDb.update,
      delete: localVocabularyDb.delete,
    },
    word: {
      findMany: async (where: { vocabularyId: string }, options?: any) => {
        return localWordDb.findMany(where, options);
      },
      count: localWordDb.count,
      createMany: localWordDb.createMany,
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
