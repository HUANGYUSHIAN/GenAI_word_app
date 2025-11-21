import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST - 從 student 的 LvocabuIDs 中移除單字本
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await request.json();
    const { vocabularyId } = body;

    if (!vocabularyId) {
      return NextResponse.json({ error: "缺少 vocabularyId" }, { status: 400 });
    }

    // 獲取當前 student
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { studentData: true },
    });

    if (!user || user.dataType !== "Student" || !user.studentData) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    // 檢查是否在列表中
    if (!user.studentData.lvocabuIDs.includes(vocabularyId)) {
      return NextResponse.json({ error: "單字本不在列表中" }, { status: 400 });
    }

    // 從 lvocabuIDs 中移除
    const updatedLvocabuIDs = user.studentData.lvocabuIDs.filter(
      (id: string) => id !== vocabularyId
    );

    const updatedStudent = await prisma.student.update({
      where: { userId: session.userId },
      data: {
        lvocabuIDs: updatedLvocabuIDs,
      },
    });

    return NextResponse.json({
      success: true,
      message: "單字本已從列表中移除",
      lvocabuIDs: updatedStudent.lvocabuIDs,
    });
  } catch (error: any) {
    console.error("Error removing vocabulary from student:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

