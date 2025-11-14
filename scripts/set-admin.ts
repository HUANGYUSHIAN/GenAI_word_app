/**
 * Script to set a user as admin
 * Usage: npx tsx scripts/set-admin.ts <userId>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setAdmin(userId: string) {
  try {
    console.log(`Setting user ${userId} as admin...`);

    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        studentData: true,
        supplierData: true,
        adminData: true,
      },
    });

    if (!user) {
      console.error(`User with userId ${userId} not found`);
      process.exit(1);
    }

    // 如果已經是管理員，不需要做任何事
    if (user.dataType === "Admin" && user.adminData) {
      console.log("User is already an admin");
      return;
    }

    // 刪除原有的 Student 或 Supplier 資料
    if (user.studentData) {
      await prisma.student.delete({
        where: { userId },
      });
      console.log("Deleted student data");
    }

    if (user.supplierData) {
      // 刪除 supplier 的 stores 和相關資料
      const supplier = await prisma.supplier.findUnique({
        where: { userId },
        include: { stores: true },
      });

      if (supplier) {
        // 刪除所有 stores 和 comments
        for (const store of supplier.stores) {
          await prisma.comment.deleteMany({
            where: { storeId: store.id },
          });
        }
        await prisma.store.deleteMany({
          where: { supplierId: supplier.id },
        });
        await prisma.supplier.delete({
          where: { userId },
        });
        console.log("Deleted supplier data");
      }
    }

    // 更新用戶為 Admin
    await prisma.user.update({
      where: { userId },
      data: { dataType: "Admin" },
    });

    // 創建 Admin 資料（如果不存在）
    if (!user.adminData) {
      await prisma.admin.create({
        data: {
          userId,
          permissions: [],
        });
      console.log("Created admin data");
    }

    console.log(`Successfully set user ${userId} as admin`);
  } catch (error: any) {
    console.error("Error setting admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 從命令行參數獲取 userId
const userId = process.argv[2];

if (!userId) {
  console.error("Usage: npx tsx scripts/set-admin.ts <userId>");
  process.exit(1);
}

setAdmin(userId);



