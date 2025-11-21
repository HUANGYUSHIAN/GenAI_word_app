import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - 獲取反饋表單（公開，無需登入）
export async function GET() {
  try {
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
      try {
        await prisma.feedbackForm.create({
          data: { questions: JSON.stringify(defaultForm) },
        });
      } catch (error: any) {
        // 如果創建失敗（可能是表不存在），只返回默認表單
        console.error("創建默認表單失敗:", error);
      }
      return NextResponse.json({ questions: defaultForm });
    }
  } catch (error: any) {
    console.error("獲取反饋表單失敗:", error);
    // 如果表不存在，返回默認表單
    if (error.code === 'P2021') {
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
      return NextResponse.json({ questions: defaultForm });
    }
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

