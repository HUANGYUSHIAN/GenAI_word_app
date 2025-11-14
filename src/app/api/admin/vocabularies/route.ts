import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateUserId } from "@/lib/utils";

// GET - 獲取單字本列表（分頁）
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = page * limit;

    const [vocabularies, total] = await Promise.all([
      prisma.vocabulary.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { words: true },
          },
        },
      }),
      prisma.vocabulary.count(),
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

// POST - 新增單字本
export async function POST(request: Request) {
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

    const body = await request.json();
    const { name, langUse, langExp, copyrights, establisher } = body;

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

    const vocabulary = await prisma.vocabulary.create({
      data: {
        vocabularyId: vocabularyId!,
        name,
        langUse,
        langExp,
        copyrights: copyrights || null,
        establisher,
      },
    });

    return NextResponse.json({ vocabulary });
  } catch (error: any) {
    console.error("Error creating vocabulary:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

