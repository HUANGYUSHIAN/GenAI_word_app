import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateUserId } from "@/lib/utils";

// POST - 上傳單字本（建立新的 vocabulary 並上傳單字）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await request.json();
    const { words, name, langUse, langExp, copyrights } = body;

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: "無效的單字資料" }, { status: 400 });
    }

    // 檢查單字數量（必須超過20個）
    if (words.length < 20) {
      return NextResponse.json(
        { error: "單字本必須包含至少20個單字" },
        { status: 400 }
      );
    }

    // 檢查是否有基本欄位
    const hasBasic = words.every((w: any) => w.word && w.explanation);
    if (!hasBasic) {
      return NextResponse.json(
        { error: "檔案格式不符：每個單字必須包含 Word、Explanation 欄位" },
        { status: 400 }
      );
    }

    // 生成唯一的 vocabularyId
    let vocabularyId: string;
    let isUnique = false;

    while (!isUnique) {
      vocabularyId = generateUserId(30);
      const existing = await prisma.vocabulary.findUnique({
        where: { vocabularyId },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    // 建立 vocabulary
    const vocabulary = await prisma.vocabulary.create({
      data: {
        vocabularyId: vocabularyId!,
        name: name || "上傳的單字本",
        langUse: langUse || "English",
        langExp: langExp || "Traditional Chinese",
        copyrights: copyrights || null,
        establisher: session.userId,
      },
    });

    // 批量創建單字
    // MongoDB 使用 vocabulary.id (ObjectId)，本地資料庫使用 vocabulary.id (string)
    const wordData = words.map((word: any) => ({
      vocabularyId: vocabulary.id, // 使用 MongoDB 的 ObjectId 或本地資料庫的 id
      word: word.word,
      spelling: word.spelling || null,
      explanation: word.explanation,
      partOfSpeech: word.partOfSpeech || null,
      sentence: word.sentence || null,
    }));

    await prisma.word.createMany({
      data: wordData,
    });

    // 如果用戶是 student，自動將單字本添加到 lvocabuIDs
    try {
      const user = await prisma.user.findUnique({
        where: { userId: session.userId },
        include: { studentData: true },
      });

      if (user && user.dataType === "Student" && user.studentData) {
        // 檢查是否已經在列表中
        const lvocabuIDs = user.studentData.lvocabuIDs || [];
        if (!lvocabuIDs.includes(vocabularyId!)) {
          // 添加到 lvocabuIDs
          await prisma.student.update({
            where: { userId: session.userId },
            data: {
              lvocabuIDs: {
                push: vocabularyId!,
              },
            },
          });
        }
      }
    } catch (error) {
      // 如果添加失敗，記錄錯誤但不影響上傳結果
      console.error("Error adding vocabulary to student lvocabuIDs:", error);
    }

    return NextResponse.json({
      success: true,
      vocabulary,
      wordCount: words.length,
    });
  } catch (error: any) {
    console.error("Error uploading vocabulary:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

