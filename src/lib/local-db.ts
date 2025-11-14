/**
 * 本地資料庫系統（使用 JSON 文件）
 * 當 DATABASE_local=true 時使用此系統
 */

import * as fs from "fs";
import * as path from "path";

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

// 確保資料庫目錄存在
function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// 初始化資料庫文件
function initDbFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf-8");
  }
}

// 初始化所有資料庫文件
export function initLocalDb() {
  ensureDbDir();
  Object.values(DB_FILES).forEach(initDbFile);
}

// 讀取資料並修復舊的嵌套結構
function readData<T>(filePath: string): T[] {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, "utf-8");
    if (!content || content.trim() === "") {
      return [];
    }
    const data = JSON.parse(content) as T[];
    if (!Array.isArray(data)) {
      return [];
    }
    // 修復舊的嵌套結構（如果數據被包在 data 對象中）
    return data.map((item: any) => {
      if (!item) return item;
      if (item.data && typeof item.data === "object") {
        // 展開嵌套的 data 對象，但保留頂層屬性（如 id, createdAt, updatedAt）
        const { data: nestedData, ...topLevel } = item;
        return { ...topLevel, ...nestedData };
      }
      return item;
    }) as T[];
  } catch (error) {
    console.error(`Error reading data from ${filePath}:`, error);
    return [];
  }
}

// 寫入資料
function writeData<T>(filePath: string, data: T[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// 生成 ObjectId
function generateObjectId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// User 操作
export const localUserDb = {
  findUnique: async (where: { userId?: string; googleId?: string }, options?: { include?: any; select?: any }) => {
    const users = readData<any>(DB_FILES.users);
    let user: any = null;
    
    console.log("[LocalDB] findUnique - where:", where, "total users:", users.length);
    
    if (where.userId) {
      // 直接匹配 userId（簡化邏輯，不處理嵌套結構）
      user = users.find((u: any) => {
        // 處理可能的嵌套結構
        const flatUser = u.data && typeof u.data === "object" ? { ...u, ...u.data } : u;
        const match = flatUser.userId === where.userId;
        if (match) {
          console.log("[LocalDB] Found user by userId:", flatUser.userId, "match:", match);
        }
        return match;
      }) || null;
      
      // 如果找到用戶，展開嵌套結構
      if (user && user.data && typeof user.data === "object") {
        const { data: nestedData, ...topLevel } = user;
        user = { ...topLevel, ...nestedData };
      }
    } else if (where.googleId) {
      // 直接匹配 googleId（簡化邏輯）
      user = users.find((u: any) => {
        // 處理可能的嵌套結構
        const flatUser = u.data && typeof u.data === "object" ? { ...u, ...u.data } : u;
        const match = flatUser.googleId === where.googleId;
        if (match) {
          console.log("[LocalDB] Found user by googleId:", flatUser.googleId, "match:", match);
        }
        return match;
      }) || null;
      
      // 如果找到用戶，展開嵌套結構
      if (user && user.data && typeof user.data === "object") {
        const { data: nestedData, ...topLevel } = user;
        user = { ...topLevel, ...nestedData };
      }
    }
    
    if (!user) {
      console.log("[LocalDB] User not found");
      return null;
    }
    
    console.log("[LocalDB] User found:", { userId: user.userId, name: user.name, email: user.email });
    
    // 處理 include
    if (options?.include) {
      if (options.include.studentData) {
        const students = readData<any>(DB_FILES.students);
        user.studentData = students.find((s) => s.userId === user.userId) || null;
      }
      if (options.include.supplierData) {
        const suppliers = readData<any>(DB_FILES.suppliers);
        user.supplierData = suppliers.find((s) => s.userId === user.userId) || null;
      }
      if (options.include.adminData) {
        const admins = readData<any>(DB_FILES.admins);
        user.adminData = admins.find((a) => a.userId === user.userId) || null;
      }
    }
    
    // 處理 select
    if (options?.select) {
      const selected: any = {};
      Object.keys(options.select).forEach((key) => {
        if (options.select[key] === true && user[key] !== undefined) {
          selected[key] = user[key];
        }
      });
      return selected;
    }
    
    return user;
  },

  findMany: async (options?: { skip?: number; take?: number; orderBy?: any; select?: any }) => {
    let users = readData<any>(DB_FILES.users);
    
    // 排序
    if (options?.orderBy) {
      const [key, order] = Object.entries(options.orderBy)[0];
      users.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (order === "desc") {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      });
    }
    
    // 處理 select
    if (options?.select) {
      users = users.map((user: any) => {
        const selected: any = {};
        Object.keys(options.select).forEach((key) => {
          if (options.select[key] === true && user[key] !== undefined) {
            selected[key] = user[key];
          }
        });
        return selected;
      });
    }
    
    // 分頁
    const skip = options?.skip || 0;
    const take = options?.take || users.length;
    return users.slice(skip, skip + take);
  },

  count: async () => {
    const users = readData<any>(DB_FILES.users);
    return users.length;
  },

  create: async (data: any) => {
    const users = readData<any>(DB_FILES.users);
    
    // 確保 userId 存在（這是關鍵字段）
    if (!data.userId) {
      console.error("[LocalDB] ERROR: userId is missing in create data!", data);
      throw new Error("userId is required to create a user");
    }
    
    const newUser = {
      id: generateObjectId(),
      userId: data.userId, // 確保 userId 被正確設置
      googleId: data.googleId || null,
      name: data.name || null,
      email: data.email || null,
      image: data.image || null,
      phoneNumber: data.phoneNumber || null,
      birthday: data.birthday || null,
      language: data.language || null,
      isLock: data.isLock || false,
      dataType: data.dataType || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log("[LocalDB] Creating user with data:", { userId: data.userId, email: data.email, name: data.name });
    console.log("[LocalDB] New user object:", { userId: newUser.userId, id: newUser.id });
    
    users.push(newUser);
    writeData(DB_FILES.users, users);
    
    // 再次確認返回的用戶有 userId
    if (!newUser.userId) {
      console.error("[LocalDB] CRITICAL ERROR: userId is still missing after creating user!", newUser);
      throw new Error("Failed to create user: userId is missing");
    }
    
    console.log("[LocalDB] Created user successfully:", { userId: newUser.userId, id: newUser.id });
    return newUser;
  },

  update: async (where: { userId: string; googleId?: string }, data: any) => {
    const users = readData<any>(DB_FILES.users);
    let index = -1;
    
    if (where.userId) {
      index = users.findIndex((u) => u.userId === where.userId);
    } else if (where.googleId) {
      index = users.findIndex((u) => u.googleId === where.googleId);
    }
    
    if (index === -1) {
      throw new Error("User not found");
    }
    
    // 處理日期轉換
    const processedData = { ...data };
    if (processedData.birthday && typeof processedData.birthday !== "string") {
      processedData.birthday = processedData.birthday.toISOString();
    }
    
    users[index] = {
      ...users[index],
      ...processedData,
      updatedAt: new Date().toISOString(),
    };
    writeData(DB_FILES.users, users);
    return users[index];
  },

  delete: async (where: { userId: string }) => {
    const users = readData<any>(DB_FILES.users);
    const filtered = users.filter((u) => u.userId !== where.userId);
    writeData(DB_FILES.users, filtered);
    return { userId: where.userId };
  },
};

// Student 操作
export const localStudentDb = {
  findUnique: async (where: { userId: string }) => {
    const students = readData<any>(DB_FILES.students);
    return students.find((s) => s.userId === where.userId) || null;
  },

  create: async (data: any) => {
    const students = readData<any>(DB_FILES.students);
    const newStudent = {
      id: generateObjectId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    students.push(newStudent);
    writeData(DB_FILES.students, students);
    return newStudent;
  },

  delete: async (where: { userId: string }) => {
    const students = readData<any>(DB_FILES.students);
    const filtered = students.filter((s) => s.userId !== where.userId);
    writeData(DB_FILES.students, filtered);
    return { userId: where.userId };
  },
};

// Supplier 操作
export const localSupplierDb = {
  findUnique: async (where: { userId: string }) => {
    const suppliers = readData<any>(DB_FILES.suppliers);
    return suppliers.find((s) => s.userId === where.userId) || null;
  },

  create: async (data: any) => {
    const suppliers = readData<any>(DB_FILES.suppliers);
    const newSupplier = {
      id: generateObjectId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    suppliers.push(newSupplier);
    writeData(DB_FILES.suppliers, suppliers);
    return newSupplier;
  },

  delete: async (where: { userId: string }) => {
    const suppliers = readData<any>(DB_FILES.suppliers);
    const filtered = suppliers.filter((s) => s.userId !== where.userId);
    writeData(DB_FILES.suppliers, filtered);
    return { userId: where.userId };
  },
};

// Admin 操作
export const localAdminDb = {
  findUnique: async (where: { userId: string }) => {
    const admins = readData<any>(DB_FILES.admins);
    return admins.find((a) => a.userId === where.userId) || null;
  },

  create: async (data: any) => {
    const admins = readData<any>(DB_FILES.admins);
    const newAdmin = {
      id: generateObjectId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    admins.push(newAdmin);
    writeData(DB_FILES.admins, admins);
    return newAdmin;
  },
};

// Vocabulary 操作
export const localVocabularyDb = {
  findUnique: async (where: { vocabularyId: string }, options?: { include?: any }) => {
    const vocabularies = readData<any>(DB_FILES.vocabularies);
    const vocabulary = vocabularies.find((v) => v.vocabularyId === where.vocabularyId);
    
    if (!vocabulary) return null;
    
    // 處理 include
    if (options?.include) {
      if (options.include.words) {
        const words = readData<any>(DB_FILES.words);
        vocabulary.words = words.filter((w) => w.vocabularyId === vocabulary.id);
      }
      if (options.include._count) {
        const words = readData<any>(DB_FILES.words);
        vocabulary._count = {
          words: words.filter((w) => w.vocabularyId === vocabulary.id).length,
        };
      }
    }
    
    return vocabulary;
  },

  findMany: async (options?: { skip?: number; take?: number; orderBy?: any; include?: any }) => {
    let vocabularies = readData<any>(DB_FILES.vocabularies);
    
    // 排序
    if (options?.orderBy) {
      const [key, order] = Object.entries(options.orderBy)[0];
      vocabularies.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (order === "desc") {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      });
    }
    
    // 處理 include
    if (options?.include) {
      if (options.include._count) {
        const words = readData<any>(DB_FILES.words);
        vocabularies = vocabularies.map((v: any) => ({
          ...v,
          _count: {
            words: words.filter((w) => w.vocabularyId === v.id).length,
          },
        }));
      }
    }
    
    // 分頁
    const skip = options?.skip || 0;
    const take = options?.take || vocabularies.length;
    return vocabularies.slice(skip, skip + take);
  },

  count: async () => {
    const vocabularies = readData<any>(DB_FILES.vocabularies);
    return vocabularies.length;
  },

  create: async (data: any) => {
    const vocabularies = readData<any>(DB_FILES.vocabularies);
    const newVocabulary = {
      id: generateObjectId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vocabularies.push(newVocabulary);
    writeData(DB_FILES.vocabularies, vocabularies);
    return newVocabulary;
  },

  update: async (where: { vocabularyId: string }, data: any) => {
    const vocabularies = readData<any>(DB_FILES.vocabularies);
    const index = vocabularies.findIndex((v) => v.vocabularyId === where.vocabularyId);
    if (index === -1) {
      throw new Error("Vocabulary not found");
    }
    vocabularies[index] = {
      ...vocabularies[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    writeData(DB_FILES.vocabularies, vocabularies);
    return vocabularies[index];
  },

  delete: async (where: { vocabularyId: string }) => {
    const vocabularies = readData<any>(DB_FILES.vocabularies);
    const filtered = vocabularies.filter((v) => v.vocabularyId !== where.vocabularyId);
    writeData(DB_FILES.vocabularies, filtered);
    return { vocabularyId: where.vocabularyId };
  },
};

// Word 操作
export const localWordDb = {
  findMany: async (where: { vocabularyId: string }, options?: { skip?: number; take?: number; orderBy?: any }) => {
    const words = readData<any>(DB_FILES.words);
    // vocabularyId 可能是 vocabulary.id 或 vocabulary.vocabularyId
    // 先嘗試直接匹配 vocabularyId（如果是 id）
    // 如果不是，則查找 vocabulary 的 id
    const vocabularies = readData<any>(DB_FILES.vocabularies);
    let vocabId = where.vocabularyId;
    
    // 檢查是否是 vocabularyId（不是 id）
    const vocabulary = vocabularies.find((v: any) => v.vocabularyId === where.vocabularyId);
    if (vocabulary) {
      vocabId = vocabulary.id;
    }
    
    let filtered = words.filter((w) => w.vocabularyId === vocabId);
    
    // 排序
    if (options?.orderBy) {
      const [key, order] = Object.entries(options.orderBy)[0];
      filtered.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (order === "asc") {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      });
    }
    
    // 分頁
    const skip = options?.skip || 0;
    const take = options?.take || filtered.length;
    return filtered.slice(skip, skip + take);
  },

  count: async (where: { vocabularyId: string }) => {
    const words = readData<any>(DB_FILES.words);
    const vocabularies = readData<any>(DB_FILES.vocabularies);
    
    // 檢查是否是 vocabularyId（不是 id）
    const vocabulary = vocabularies.find((v: any) => v.vocabularyId === where.vocabularyId);
    const vocabId = vocabulary ? vocabulary.id : where.vocabularyId;
    
    return words.filter((w) => w.vocabularyId === vocabId).length;
  },

  createMany: async (data: any[]) => {
    const words = readData<any>(DB_FILES.words);
    const vocabularies = readData<any>(DB_FILES.vocabularies);
    
    const newWords = data.map((d) => {
      // 如果 vocabularyId 是 vocabularyId（不是 id），需要轉換
      let vocabId = d.vocabularyId;
      const vocabulary = vocabularies.find((v: any) => v.vocabularyId === d.vocabularyId);
      if (vocabulary) {
        vocabId = vocabulary.id;
      }
      
      return {
        id: generateObjectId(),
        ...d,
        vocabularyId: vocabId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    
    words.push(...newWords);
    writeData(DB_FILES.words, words);
    return { count: newWords.length };
  },
};

// Coupon 操作
export const localCouponDb = {
  findUnique: async (where: { couponId: string }) => {
    const coupons = readData<any>(DB_FILES.coupons);
    return coupons.find((c) => c.couponId === where.couponId) || null;
  },

  findMany: async (options?: { skip?: number; take?: number; orderBy?: any }) => {
    let coupons = readData<any>(DB_FILES.coupons);
    
    // 排序
    if (options?.orderBy) {
      const [key, order] = Object.entries(options.orderBy)[0];
      coupons.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (order === "desc") {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      });
    }
    
    // 分頁
    const skip = options?.skip || 0;
    const take = options?.take || coupons.length;
    return coupons.slice(skip, skip + take);
  },

  count: async () => {
    const coupons = readData<any>(DB_FILES.coupons);
    return coupons.length;
  },

  create: async (data: any) => {
    const coupons = readData<any>(DB_FILES.coupons);
    const newCoupon = {
      id: generateObjectId(),
      ...data,
      period: typeof data.period === "string" ? data.period : data.period.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    coupons.push(newCoupon);
    writeData(DB_FILES.coupons, coupons);
    return newCoupon;
  },

  update: async (where: { couponId: string }, data: any) => {
    const coupons = readData<any>(DB_FILES.coupons);
    const index = coupons.findIndex((c) => c.couponId === where.couponId);
    if (index === -1) {
      throw new Error("Coupon not found");
    }
    coupons[index] = {
      ...coupons[index],
      ...data,
      period: typeof data.period === "string" ? data.period : data.period.toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeData(DB_FILES.coupons, coupons);
    return coupons[index];
  },

  delete: async (where: { couponId: string }) => {
    const coupons = readData<any>(DB_FILES.coupons);
    const filtered = coupons.filter((c) => c.couponId !== where.couponId);
    writeData(DB_FILES.coupons, filtered);
    return { couponId: where.couponId };
  },
};

