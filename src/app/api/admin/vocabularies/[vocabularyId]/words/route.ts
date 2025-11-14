import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取單字列表（分頁）
export async function GET(
  request: NextRequest,
  { params }: { params: { vocabularyId: string } }
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
    
    const [words, total] = await Promise.all([
      prisma.word.findMany(
        useLocalDb ? { vocabularyId } : { vocabularyId: (vocabulary as any).id },
        {
          skip,
          take: limit,
          orderBy: { createdAt: "asc" },
        }
      ),
      prisma.word.count(
        useLocalDb ? { vocabularyId } : { vocabularyId: (vocabulary as any).id }
      ),
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

