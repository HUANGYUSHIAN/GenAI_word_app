import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取當前 student 建立的單字本列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 獲取自己建立的單字本
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = page * limit;

    const [vocabularies, total] = await Promise.all([
      prisma.vocabulary.findMany({
        where: {
          establisher: session.userId,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { words: true },
          },
        },
      }),
      prisma.vocabulary.count({
        where: {
          establisher: session.userId,
        },
      }),
    ]);

    const vocabulariesWithCount = vocabularies.map((v: any) => ({
      vocabularyId: v.vocabularyId,
      name: v.name,
      langUse: v.langUse,
      langExp: v.langExp,
      copyrights: v.copyrights,
      establisher: v.establisher,
      wordCount: v._count?.words || 0,
      createdAt: typeof v.createdAt === "string" ? v.createdAt : v.createdAt.toISOString(),
    }));

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

