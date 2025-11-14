import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取單字列表（分頁）
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
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = page * limit;

    // 獲取 vocabulary 的 id
    const vocabulary = await prisma.vocabulary.findUnique({
      where: { vocabularyId },
    });

    if (!vocabulary) {
      return NextResponse.json({ error: "找不到單字本" }, { status: 404 });
    }

    // 根據是否使用本地資料庫決定查詢方式
    const useLocalDb = process.env.DATABASE_local === "true";
    const vocabId = useLocalDb ? vocabularyId : (vocabulary as any).id;
    
    const [words, total] = await Promise.all([
      prisma.word.findMany({
        where: { vocabularyId: vocabId },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
      }),
      prisma.word.count({
        where: { vocabularyId: vocabId },
      }),
    ]);

    return NextResponse.json({
      words,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("Error fetching words:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// PUT - 批量更新單字（僅限建立者是自己）
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
    const { words } = body;

    if (!Array.isArray(words)) {
      return NextResponse.json({ error: "無效的單字資料" }, { status: 400 });
    }

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

    // 根據是否使用本地資料庫決定 vocabularyId
    const useLocalDb = process.env.DATABASE_local === "true";
    const vocabId = useLocalDb ? vocabularyId : (vocabulary as any).id;

    // 批量更新單字
    const updatePromises = words.map((word: any) => {
      if (!word.id) {
        // 如果沒有 id，創建新單字
        return prisma.word.create({
          data: {
            vocabularyId: vocabId,
            word: word.word,
            spelling: word.spelling || null,
            explanation: word.explanation,
            partOfSpeech: word.partOfSpeech || null,
            sentence: word.sentence || null,
          },
        });
      } else {
        // 更新現有單字
        return prisma.word.update({
          where: { id: word.id },
          data: {
            word: word.word,
            spelling: word.spelling || null,
            explanation: word.explanation,
            partOfSpeech: word.partOfSpeech || null,
            sentence: word.sentence || null,
          },
        });
      }
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, count: words.length });
  } catch (error: any) {
    console.error("Error updating words:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

