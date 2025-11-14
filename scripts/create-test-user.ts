import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

function generateUserId(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const name = args[0] || "Test User";
  const email = args[1] || `test${Date.now()}@example.com`;

  // 生成唯一的userId
  let userId: string;
  let isUnique = false;

  while (!isUnique) {
    userId = generateUserId(30);
    const existingUser = await prisma.user.findUnique({
      where: { userId },
    });
    if (!existingUser) {
      isUnique = true;
    }
  }

  try {
    const user = await prisma.user.create({
      data: {
        userId: userId!,
        name,
        email,
      },
    });

    console.log("\n✅ 測試用戶創建成功！");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`User ID: ${user.userId}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Created At: ${user.createdAt}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ 創建用戶失敗:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

