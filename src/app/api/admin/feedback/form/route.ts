import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取反饋表單
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

    // 獲取最新的表單
    const form = await prisma.feedbackForm.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (form) {
      const questions = JSON.parse(form.questions || "[]");
      return NextResponse.json({ questions });
    } else {
      // 創建默認表單
      const defaultForm = [
        {
          id: "1",
          question: "是否完成某項功能",
          type: "choice",
          options: ["yes", "no", "not sure"],
        },
        {
          id: "2",
          question: "整體評價",
          type: "choice",
          options: ["0", "1", "2", "3", "4", "5"],
        },
        {
          id: "3",
          question: "您的簡短回饋",
          type: "text",
        },
      ];
      await prisma.feedbackForm.create({
        data: { questions: JSON.stringify(defaultForm) },
      });
      return NextResponse.json({ questions: defaultForm });
    }
  } catch (error: any) {
    console.error("獲取反饋表單失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

// POST - 保存反饋表單
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { questions } = body;

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "無效的問題列表" }, { status: 400 });
    }

    // 獲取或創建表單
    const existing = await prisma.feedbackForm.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      await prisma.feedbackForm.update({
        where: { id: existing.id },
        data: { questions: JSON.stringify(questions) },
      });
    } else {
      await prisma.feedbackForm.create({
        data: { questions: JSON.stringify(questions) },
      });
    }

    return NextResponse.json({ success: true, questions });
  } catch (error: any) {
    console.error("保存反饋表單失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

