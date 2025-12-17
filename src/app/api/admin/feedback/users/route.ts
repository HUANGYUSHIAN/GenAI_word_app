import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - 獲取所有用戶的反饋（支援 targetRole 參數過濾）
export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const targetRole = url.searchParams.get("targetRole") || "Student";

    if (targetRole !== "Student" && targetRole !== "Supplier") {
      return NextResponse.json({ error: "無效的 targetRole" }, { status: 400 });
    }

    // 獲取指定角色的表單問題 ID
    const form = await prisma.feedbackForm.findUnique({
      where: { targetRole },
    });

    const questionIds: string[] = [];
    if (form) {
      const questions = JSON.parse(form.questions || "[]");
      questionIds.push(...questions.map((q: any) => q.id));
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
      
      // 過濾出指定角色的反饋
      const filteredFeedback: Record<string, any> | null = feedback && Object.keys(feedback).length > 0
        ? Object.fromEntries(
            Object.entries(feedback).filter(([key]) => questionIds.includes(key))
          )
        : null;

      return {
        userId: user.userId,
        feedback: filteredFeedback && Object.keys(filteredFeedback).length > 0 ? filteredFeedback : null,
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

