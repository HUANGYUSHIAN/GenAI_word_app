import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST - 將單字本添加到 student 的 LvocabuIDs
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

    // 檢查單字本是否存在
    const vocabulary = await prisma.vocabulary.findUnique({
      where: { vocabularyId },
    });

    if (!vocabulary) {
      return NextResponse.json({ error: "找不到單字本" }, { status: 404 });
    }

    // 獲取當前 student
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { studentData: true },
    });

    if (!user || user.dataType !== "Student" || !user.studentData) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    // 檢查是否已經在列表中
    if (user.studentData.lvocabuIDs.includes(vocabularyId)) {
      return NextResponse.json({ error: "單字本已在列表中" }, { status: 400 });
    }

    // 添加到 lvocabuIDs
    // 檢查是否使用本地資料庫
    const useLocalDb = process.env.DATABASE_local === "true";
    
    let updatedStudent;
    if (useLocalDb) {
      // 本地資料庫：手動處理 push
      updatedStudent = await prisma.student.update({
        where: { userId: session.userId },
        data: {
          lvocabuIDs: {
            push: vocabularyId,
          },
        },
      });
    } else {
      // MongoDB：使用 Prisma 的 push
      updatedStudent = await prisma.student.update({
        where: { userId: session.userId },
        data: {
          lvocabuIDs: {
            push: vocabularyId,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "單字本已成功加入",
      lvocabuIDs: updatedStudent.lvocabuIDs,
    });
  } catch (error: any) {
    console.error("Error adding vocabulary to student:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

