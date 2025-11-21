import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取單字本詳情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vocabularyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { vocabularyId } = await params;

    const vocabulary = await prisma.vocabulary.findUnique({
      where: { vocabularyId },
      include: {
        _count: {
          select: { words: true },
        },
      },
    });

    if (!vocabulary) {
      return NextResponse.json({ error: "找不到單字本" }, { status: 404 });
    }

    const vocabularyWithCount = {
      vocabularyId: vocabulary.vocabularyId,
      name: vocabulary.name,
      langUse: vocabulary.langUse,
      langExp: vocabulary.langExp,
      copyrights: vocabulary.copyrights,
      establisher: vocabulary.establisher,
      wordCount: vocabulary._count?.words || 0,
      createdAt: typeof vocabulary.createdAt === "string" 
        ? vocabulary.createdAt 
        : vocabulary.createdAt.toISOString(),
    };

    return NextResponse.json({ vocabulary: vocabularyWithCount });
  } catch (error: any) {
    console.error("Error fetching vocabulary:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// PUT - 更新單字本基本資訊（僅限建立者是自己）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vocabularyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { vocabularyId } = await params;
    const body = await request.json();
    const { name, langUse, langExp, copyrights } = body;

    // 檢查單字本是否存在，並驗證建立者
    const vocabulary = await prisma.vocabulary.findUnique({
      where: { vocabularyId },
    });

    if (!vocabulary) {
      return NextResponse.json({ error: "找不到單字本" }, { status: 404 });
    }

    // 檢查是否為建立者
    if (vocabulary.establisher !== session.userId) {
      return NextResponse.json({ error: "無權限修改此單字本" }, { status: 403 });
    }

    // 更新單字本
    const updated = await prisma.vocabulary.update({
      where: { vocabularyId },
      data: {
        name,
        langUse,
        langExp,
        copyrights: copyrights || null,
      },
    });

    return NextResponse.json({ vocabulary: updated });
  } catch (error: any) {
    console.error("Error updating vocabulary:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// DELETE - 刪除單字本（僅限建立者）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vocabularyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { vocabularyId } = await params;

    // 檢查單字本是否存在
    const vocabulary = await prisma.vocabulary.findUnique({
      where: { vocabularyId },
    });

    if (!vocabulary) {
      return NextResponse.json({ error: "找不到單字本" }, { status: 404 });
    }

    // 檢查是否為建立者
    if (vocabulary.establisher !== session.userId) {
      return NextResponse.json({ error: "無權限：只能刪除自己建立的單字本" }, { status: 403 });
    }

    // 獲取所有 student，找出包含此 vocabularyId 的
    const students = await prisma.student.findMany({
      where: {
        lvocabuIDs: {
          has: vocabularyId,
        },
      },
    });

    // 從所有相關 student 的 lvocabuIDs 中移除該 vocabularyId
    const updatePromises = students.map((student: any) => {
      const updatedLvocabuIDs = (student.lvocabuIDs || []).filter(
        (id: string) => id !== vocabularyId
      );
      return prisma.student.update({
        where: { userId: student.userId },
        data: {
          lvocabuIDs: updatedLvocabuIDs,
        },
      });
    });

    await Promise.all(updatePromises);

    // 刪除單字本（會自動刪除相關的 words，因為有 onDelete: Cascade）
    await prisma.vocabulary.delete({
      where: { vocabularyId },
    });

    return NextResponse.json({ success: true, message: "單字本已成功刪除" });
  } catch (error: any) {
    console.error("Error deleting vocabulary:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

