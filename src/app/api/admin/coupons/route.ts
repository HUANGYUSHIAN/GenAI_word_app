import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateUserId } from "@/lib/utils";

// GET - 獲取優惠券列表（分頁）
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

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.coupon.count(),
    ]);

    const couponsWithDate = coupons.map((c: any) => ({
      ...c,
      period: c.period.toISOString(),
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({
      coupons: couponsWithDate,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// POST - 新增優惠券
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
    const { name, period, link, text, picture } = body;

    // 生成唯一的 couponId
    let couponId: string;
    let isUnique = false;

    while (!isUnique) {
      couponId = generateUserId(30);
      const existing = await prisma.coupon.findUnique({
        where: { couponId },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    const coupon = await prisma.coupon.create({
      data: {
        couponId: couponId!,
        name,
        period: new Date(period),
        link: link || null,
        text: text || null,
        picture: picture || null,
      },
    });

    return NextResponse.json({ coupon });
  } catch (error: any) {
    console.error("Error creating coupon:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

