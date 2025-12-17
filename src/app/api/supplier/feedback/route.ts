import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取當前用戶的反饋（僅限 Supplier）
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

    if (user.dataType !== "Supplier") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    // 只返回 Supplier 表單的反饋
    const feedback = user.feedback
      ? typeof user.feedback === "string"
        ? JSON.parse(user.feedback)
        : user.feedback
      : {};

    // 過濾出 Supplier 表單的問題（通過檢查問題 ID 是否在 Supplier 表單中）
    const supplierForm = await prisma.feedbackForm.findUnique({
      where: { targetRole: "Supplier" },
    });

    if (supplierForm) {
      const supplierQuestions = JSON.parse(supplierForm.questions || "[]");
      const supplierQuestionIds = supplierQuestions.map((q: any) => q.id);
      const filteredFeedback: Record<string, any> = {};
      for (const [key, value] of Object.entries(feedback)) {
        if (supplierQuestionIds.includes(key)) {
          filteredFeedback[key] = value;
        }
      }
      return NextResponse.json({ feedback: filteredFeedback });
    }

    return NextResponse.json({ feedback: {} });
  } catch (error: any) {
    console.error("獲取用戶反饋失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

// POST - 保存當前用戶的反饋（僅限 Supplier，只能回答 Supplier 表單）
export async function POST(request: NextRequest) {
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

    if (user.dataType !== "Supplier") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const body = await request.json();
    const { feedback } = body;

    if (!feedback || typeof feedback !== "object") {
      return NextResponse.json({ error: "無效的反饋數據" }, { status: 400 });
    }

    // 驗證反饋只包含 Supplier 表單的問題
    const supplierForm = await prisma.feedbackForm.findUnique({
      where: { targetRole: "Supplier" },
    });

    if (supplierForm) {
      const supplierQuestions = JSON.parse(supplierForm.questions || "[]");
      const supplierQuestionIds = supplierQuestions.map((q: any) => q.id);
      const filteredFeedback: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(feedback)) {
        if (supplierQuestionIds.includes(key)) {
          filteredFeedback[key] = value;
        }
      }

      // 獲取現有的反饋（可能包含 Student 表單的反饋）
      const existingFeedback = user.feedback
        ? typeof user.feedback === "string"
          ? JSON.parse(user.feedback)
          : user.feedback
        : {};

      // 合併反饋（保留 Student 表單的反饋，更新 Supplier 表單的反饋）
      const studentForm = await prisma.feedbackForm.findUnique({
        where: { targetRole: "Student" },
      });

      if (studentForm) {
        const studentQuestions = JSON.parse(studentForm.questions || "[]");
        const studentQuestionIds = studentQuestions.map((q: any) => q.id);
        for (const [key, value] of Object.entries(existingFeedback)) {
          if (studentQuestionIds.includes(key)) {
            filteredFeedback[key] = value; // 保留 Student 表單的反饋
          }
        }
      }

      await prisma.user.update({
        where: { userId: session.userId },
        data: { feedback: JSON.stringify(filteredFeedback) },
      });
    } else {
      // 如果沒有 Supplier 表單，直接保存（但這不應該發生）
      await prisma.user.update({
        where: { userId: session.userId },
        data: { feedback: JSON.stringify(feedback) },
      });
    }

    return NextResponse.json({ success: true, message: "反饋保存成功" });
  } catch (error: any) {
    console.error("保存用戶反饋失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

