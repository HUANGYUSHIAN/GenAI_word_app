import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PUT - 更新用戶
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 檢查是否為管理員
    const admin = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { adminData: true },
    });

    if (!admin || admin.dataType !== "Admin" || !admin.adminData) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { name, email, phoneNumber, birthday, language, dataType, isLock, image } = body;

    // 獲取現有用戶資料
    const currentUser = await prisma.user.findUnique({
      where: { userId },
      include: {
        studentData: true,
        supplierData: true,
        adminData: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 404 });
    }

    // 如果 dataType 改變，需要刪除舊的 User.Data 並初始化新的
    if (dataType && dataType !== currentUser.dataType) {
      // 刪除舊的 User.Data
      if (currentUser.studentData) {
        await prisma.student.delete({
          where: { userId },
        });
      }
      if (currentUser.supplierData) {
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
        }
      }
      if (currentUser.adminData) {
        await prisma.admin.delete({
          where: { userId },
        });
      }

      // 初始化新的 User.Data
      if (dataType === "Student") {
        await prisma.student.create({
          data: {
            userId,
            lvocabuIDs: [],
            lcouponIDs: [],
            lfriendIDs: [],
          },
        });
      } else if (dataType === "Supplier") {
        await prisma.supplier.create({
          data: {
            userId,
            lsuppcoIDs: [],
          },
        });
      } else if (dataType === "Admin") {
        await prisma.admin.create({
          data: {
            userId,
            permissions: [],
          },
        });
      }
    }

    // 更新用戶基本資料
    const user = await prisma.user.update({
      where: { userId },
      data: {
        name: name !== undefined ? (name || null) : undefined,
        email: email !== undefined ? (email || null) : undefined,
        phoneNumber: phoneNumber !== undefined ? (phoneNumber || null) : undefined,
        birthday: birthday !== undefined ? (birthday ? new Date(birthday) : null) : undefined,
        language: language !== undefined ? (language || null) : undefined,
        dataType: dataType !== undefined ? dataType : undefined,
        isLock: isLock !== undefined ? isLock : undefined,
        image: image !== undefined ? (image || null) : undefined,
      },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// DELETE - 刪除用戶
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 檢查是否為管理員
    const admin = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { adminData: true },
    });

    if (!admin || admin.dataType !== "Admin" || !admin.adminData) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { userId } = await params;

    await prisma.user.delete({
      where: { userId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

