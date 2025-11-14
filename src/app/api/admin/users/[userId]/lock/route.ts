import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST - 切換用戶鎖定狀態
export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
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
    const { isLock } = body;

    const user = await prisma.user.update({
      where: { userId },
      data: { isLock },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error toggling user lock:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

