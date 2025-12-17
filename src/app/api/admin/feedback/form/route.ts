import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取反饋表單（支援 targetRole 參數）
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const targetRole = searchParams.get("targetRole") || "Student"; // 默認為 Student

    if (targetRole !== "Student" && targetRole !== "Supplier") {
      return NextResponse.json({ error: "無效的 targetRole" }, { status: 400 });
    }

    // 獲取指定角色的表單
    const form = await prisma.feedbackForm.findUnique({
      where: { targetRole },
    });

    if (form) {
      const questions = JSON.parse(form.questions || "[]");
      return NextResponse.json({ questions, targetRole });
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
      try {
        await prisma.feedbackForm.create({
          data: { 
            targetRole,
            questions: JSON.stringify(defaultForm) 
          },
        });
      } catch (error: any) {
        // 如果創建失敗（可能是並發問題），嘗試再次獲取
        const existing = await prisma.feedbackForm.findUnique({
          where: { targetRole },
        });
        if (existing) {
          const questions = JSON.parse(existing.questions || "[]");
          return NextResponse.json({ questions, targetRole });
        }
      }
      return NextResponse.json({ questions: defaultForm, targetRole });
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
    const { questions, targetRole = "Student" } = body;

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "無效的問題列表" }, { status: 400 });
    }

    if (targetRole !== "Student" && targetRole !== "Supplier") {
      return NextResponse.json({ error: "無效的 targetRole" }, { status: 400 });
    }

    // 獲取或創建表單
    const existing = await prisma.feedbackForm.findUnique({
      where: { targetRole },
    });

    if (existing) {
      await prisma.feedbackForm.update({
        where: { id: existing.id },
        data: { questions: JSON.stringify(questions) },
      });
    } else {
      await prisma.feedbackForm.create({
        data: { 
          targetRole,
          questions: JSON.stringify(questions) 
        },
      });
    }

    return NextResponse.json({ success: true, questions, targetRole });
  } catch (error: any) {
    console.error("保存反饋表單失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

