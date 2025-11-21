import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取當前用戶的反饋
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 404 });
    }

    const feedback = user.feedback
      ? typeof user.feedback === "string"
        ? JSON.parse(user.feedback)
        : user.feedback
      : {};

    return NextResponse.json({ feedback });
  } catch (error: any) {
    console.error("獲取用戶反饋失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

// POST - 保存當前用戶的反饋
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await request.json();
    const { feedback } = body;

    if (!feedback || typeof feedback !== "object") {
      return NextResponse.json({ error: "無效的反饋數據" }, { status: 400 });
    }

    await prisma.user.update({
      where: { userId: session.userId },
      data: { feedback: JSON.stringify(feedback) },
    });

    return NextResponse.json({ success: true, message: "反饋保存成功" });
  } catch (error: any) {
    console.error("保存用戶反饋失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

