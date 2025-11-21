import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 瀏覽所有單字本，支援過濾
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = page * limit;

    const name = searchParams.get("name");
    const langUseParams = searchParams.getAll("langUse");
    const langExpParams = searchParams.getAll("langExp");

    // 獲取 student 資料，包含 lvocabuIDs
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { studentData: true },
    });

    if (!user || user.dataType !== "Student" || !user.studentData) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const lvocabuIDs = user.studentData.lvocabuIDs || [];

    // 構建過濾條件
    const where: any = {
      // 排除自己建立的單字本
      establisher: {
        not: session.userId,
      },
    };

    // Name 過濾（部分匹配）
    if (name) {
      // Prisma 的 contains 在 MongoDB 中會轉換為正則表達式
      where.name = {
        contains: name,
      };
    }

    // LangUse 過濾（支援多選）
    if (langUseParams.length > 0) {
      where.langUse = {
        in: langUseParams,
      };
    }

    // LangExp 過濾（支援多選）
    if (langExpParams.length > 0) {
      where.langExp = {
        in: langExpParams,
      };
    }

    const [vocabularies, total] = await Promise.all([
      prisma.vocabulary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { words: true },
          },
        },
      }),
      prisma.vocabulary.count({ where }),
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
      isInMyList: lvocabuIDs.includes(v.vocabularyId), // 標記是否已在列表中
    }));

    return NextResponse.json({
      vocabularies: vocabulariesWithCount,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("Error browsing vocabularies:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

