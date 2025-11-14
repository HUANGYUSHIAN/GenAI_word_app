import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取用戶列表（分頁）
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

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          userId: true,
          name: true,
          email: true,
          phoneNumber: true,
          birthday: true,
          language: true,
          isLock: true,
          dataType: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// POST - 新增用戶
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
    const { name, email, phoneNumber, birthday, language } = body;

    // 生成唯一的 userId
    const { generateUserId } = await import("@/lib/utils");
    let userId: string;
    let isUnique = false;

    while (!isUnique) {
      userId = generateUserId(30);
      const existingUser = await prisma.user.findUnique({
        where: { userId },
      });
      if (!existingUser) {
        isUnique = true;
      }
    }

    const user = await prisma.user.create({
      data: {
        userId: userId!,
        name: name || null,
        email: email || null,
        phoneNumber: phoneNumber || null,
        birthday: birthday ? new Date(birthday) : null,
        language: language || null,
      },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

