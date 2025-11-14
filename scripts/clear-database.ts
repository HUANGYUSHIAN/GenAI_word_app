import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("\n⚠️  警告：此操作將刪除所有用戶資料！\n");
    
    // 獲取當前用戶數量
    const userCount = await prisma.user.count();
    console.log(`目前資料庫中有 ${userCount} 個用戶\n`);

    if (userCount === 0) {
      console.log("資料庫已經是空的，無需清除。\n");
      await prisma.$disconnect();
      return;
    }

    // 刪除所有用戶
    const result = await prisma.user.deleteMany({});
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ 成功刪除 ${result.count} 個用戶記錄`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 驗證刪除結果
    const remainingCount = await prisma.user.count();
    if (remainingCount === 0) {
      console.log("✅ 資料庫已清空\n");
    } else {
      console.log(`⚠️  警告：仍有 ${remainingCount} 個記錄未被刪除\n`);
    }
  } catch (error: any) {
    console.error("\n❌ 清除資料失敗:");
    console.error(error.message);
    if (error.code) {
      console.error(`錯誤代碼: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

