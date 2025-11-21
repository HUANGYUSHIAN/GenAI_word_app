import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - 獲取所有用戶的反饋
export async function GET() {
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

    // 獲取所有非管理員用戶
    const users = await prisma.user.findMany({
      where: {
        dataType: {
          not: "Admin",
        },
      },
    });

    const userFeedbacks = users.map((user: any) => {
      const feedback = user.feedback
        ? typeof user.feedback === "string"
          ? JSON.parse(user.feedback)
          : user.feedback
        : null;
      return {
        userId: user.userId,
        feedback: feedback && Object.keys(feedback).length > 0 ? feedback : null,
      };
    });

    return NextResponse.json({ userFeedbacks });
  } catch (error: any) {
    console.error("獲取用戶反饋失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

