import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { role } = await request.json();

    if (!role || (role !== "Student" && role !== "Supplier")) {
      return NextResponse.json({ error: "無效的身分" }, { status: 400 });
    }

    // 檢查使用者是否已經選擇過身分
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: {
        studentData: true,
        supplierData: true,
        adminData: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "找不到用戶" }, { status: 404 });
    }

    // 如果已經有身分，不允許更改（除非是管理員）
    if (user.dataType && user.dataType !== "Admin") {
      return NextResponse.json({ error: "您已經選擇過身分" }, { status: 400 });
    }

    // 更新使用者身分
    await prisma.user.update({
      where: { userId: session.userId },
      data: { dataType: role },
    });

    // 根據身分創建對應的資料
    if (role === "Student") {
      // 檢查是否已存在 Student 資料
      if (!user.studentData) {
        await prisma.student.create({
          data: {
            userId: session.userId,
            lvocabuIDs: [],
            lcouponIDs: [],
            lfriendIDs: [],
          },
        });
      }
    } else if (role === "Supplier") {
      // 檢查是否已存在 Supplier 資料
      if (!user.supplierData) {
        await prisma.supplier.create({
          data: {
            userId: session.userId,
            lsuppcoIDs: [],
          },
        });
      }
    }

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    console.error("Error selecting role:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

