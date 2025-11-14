import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST - 上傳單字
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vocabularyId: string }> }
) {
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

    const { vocabularyId } = await params;
    const body = await request.json();
    const { words } = body;

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: "無效的單字資料" }, { status: 400 });
    }

    // 檢查是否有基本欄位（Word 和 Explanation 是必須的，Sentence 可以是 null）
    const hasBasic = words.every((w: any) => w.word && w.explanation);
    if (!hasBasic) {
      return NextResponse.json(
        { error: "檔案格式不符：每個單字必須包含 Word、Explanation 欄位" },
        { status: 400 }
      );
    }

    // 獲取 vocabulary 的 id
    const vocabulary = await prisma.vocabulary.findUnique({
      where: { vocabularyId },
    });

    if (!vocabulary) {
      return NextResponse.json({ error: "找不到單字本" }, { status: 404 });
    }

    // 根據是否使用本地資料庫決定 vocabularyId
    // MongoDB 使用 vocabulary.id (ObjectId)，本地資料庫使用 vocabularyId (string)
    const useLocalDb = process.env.DATABASE_local === "true";
    const vocabId = useLocalDb ? vocabularyId : (vocabulary as any).id;

    // 批量創建單字
    const wordData = words.map((word: any) => ({
      vocabularyId: vocabId,
      word: word.word,
      spelling: word.spelling || null,
      explanation: word.explanation,
      partOfSpeech: word.partOfSpeech || null,
      sentence: word.sentence || null,
    }));

    await prisma.word.createMany({
      data: wordData,
    });

    return NextResponse.json({ success: true, count: words.length });
  } catch (error: any) {
    console.error("Error uploading words:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

