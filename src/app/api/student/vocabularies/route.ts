import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取當前 student 的單字本列表（包括自己建立的和加入的）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 獲取 student 資料，包含 lvocabuIDs
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { studentData: true },
    });

    if (!user || user.dataType !== "Student" || !user.studentData) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = page * limit;

    // 獲取所有在 lvocabuIDs 中的單字本（包括自己建立的和加入的）
    const lvocabuIDs = user.studentData.lvocabuIDs || [];

    if (lvocabuIDs.length === 0) {
      return NextResponse.json({
        vocabularies: [],
        total: 0,
        page,
        limit,
      });
    }

    const vocabularies = await prisma.vocabulary.findMany({
      where: {
        vocabularyId: {
          in: lvocabuIDs,
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.vocabulary.count({
      where: {
        vocabularyId: {
          in: lvocabuIDs,
        },
      },
    });

    // 直接使用 word.count 獲取每個單字本的單字數（更可靠）
    const useLocalDb = process.env.DATABASE_local === "true";
    const vocabulariesWithCount = await Promise.all(
      vocabularies.map(async (v: any) => {
        const vocabId = useLocalDb ? v.vocabularyId : v.id;
        const wordCount = await prisma.word.count({
          where: { vocabularyId: vocabId },
        });
        return {
          vocabularyId: v.vocabularyId,
          name: v.name,
          langUse: v.langUse,
          langExp: v.langExp,
          copyrights: v.copyrights,
          establisher: v.establisher,
          wordCount: wordCount,
          createdAt: typeof v.createdAt === "string" ? v.createdAt : v.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      vocabularies: vocabulariesWithCount,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("Error fetching vocabularies:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

