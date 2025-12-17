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
    });

    if (!user) {
      return NextResponse.json({ error: "找不到用戶" }, { status: 404 });
    }

    // 如果已經有身分，不允許更改（除非是管理員）
    if (user.dataType && user.dataType !== "Admin") {
      return NextResponse.json({ error: "您已經選擇過身分" }, { status: 400 });
    }

    // 根據身分檢查是否已存在對應的資料（直接查詢表，更可靠）
    if (role === "Student") {
      const existingStudent = await prisma.student.findUnique({
        where: { userId: session.userId },
      });
      
      if (!existingStudent) {
        // 如果不存在，先創建 Student 資料
        try {
          await prisma.student.create({
            data: {
              userId: session.userId,
              lvocabuIDs: [],
              lcouponIDs: [],
              lfriendIDs: [],
            },
          });
        } catch (error: any) {
          // 如果創建失敗（可能是並發問題），檢查是否已經存在
          if (error.code === "P2002") {
            // Unique constraint violation - 記錄已存在，繼續執行
            console.log("Student record already exists, continuing...");
          } else {
            throw error;
          }
        }
      }
    } else if (role === "Supplier") {
      const existingSupplier = await prisma.supplier.findUnique({
        where: { userId: session.userId },
      });
      
      if (!existingSupplier) {
        // 如果不存在，先創建 Supplier 資料
        try {
          await prisma.supplier.create({
            data: {
              userId: session.userId,
              lsuppcoIDs: [],
            },
          });
        } catch (error: any) {
          // 如果創建失敗（可能是並發問題），檢查是否已經存在
          if (error.code === "P2002") {
            // Unique constraint violation - 記錄已存在，繼續執行
            console.log("Supplier record already exists, continuing...");
          } else {
            throw error;
          }
        }
      }
    }

    // 更新使用者身分
    await prisma.user.update({
      where: { userId: session.userId },
      data: { dataType: role },
    });

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    console.error("Error selecting role:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

