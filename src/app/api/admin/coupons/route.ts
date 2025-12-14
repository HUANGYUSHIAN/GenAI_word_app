import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateUserId } from "@/lib/utils";

// 輸入類型定義（與 supplier 相同）
interface CouponFormInput {
  shopName: string;
  couponName: string;
  description: string;
  discountType: "threshold_amount_off" | "amount_off" | "percentage";
  minimumOrderAmount?: number | null;
  discountAmount?: number | null;
  discountPercentage?: number | null;
  startDate: string;
  endDate: string;
  totalQuantity?: number | null;
  perUserLimit?: number | null;
  perDayLimit?: number | null;
  branch?: string | null;
  picture?: string | null;
}

/**
 * 生成唯一的優惠券ID（基於優惠券名稱生成slug + 隨機後綴）
 */
async function generateUniqueCouponId(couponName: string): Promise<string> {
  // 將優惠券名稱轉換為 slug（小寫，移除特殊字符，空格轉為連字符）
  const slug = couponName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  let couponId: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // 生成隨機後綴（6位字符）
    const randomSuffix = generateUserId(6).toLowerCase();
    couponId = `${slug}-${randomSuffix}`;

    // 檢查是否已存在
    const existing = await prisma.coupon.findUnique({
      where: { couponId },
    });

    if (!existing) {
      isUnique = true;
    } else {
      attempts++;
    }
  }

  if (!isUnique) {
    // 如果所有嘗試都失敗，使用完全隨機的ID
    couponId = generateUserId(30).toLowerCase();
  }

  return couponId!;
}

/**
 * 規範化優惠券輸入數據
 */
async function normalizeCouponInput(input: CouponFormInput) {
  // 生成唯一的 couponId
  const couponId = await generateUniqueCouponId(input.couponName);

  // 規範化日期（確保格式一致）
  let startDate = input.startDate;
  let endDate = input.endDate;
  startDate = new Date(startDate).toISOString().split("T")[0];
  endDate = new Date(endDate).toISOString().split("T")[0];

  // 規範化折扣類型相關字段
  let minimumOrderAmount: number | null = null;
  let discountAmount: number | null = null;
  let discountPercentage: number | null = null;

  if (input.discountType === "threshold_amount_off") {
    minimumOrderAmount = Math.max(0, input.minimumOrderAmount || 0);
    discountAmount = Math.max(0, input.discountAmount || 0);
  } else if (input.discountType === "amount_off") {
    discountAmount = Math.max(0, input.discountAmount || 0);
  } else if (input.discountType === "percentage") {
    discountPercentage = Math.max(0, Math.min(100, input.discountPercentage || 0));
  }

  // 規範化數量限制
  const totalQuantity = Math.max(1, input.totalQuantity || 100);
  const perUserLimit = Math.max(1, input.perUserLimit || 1);
  const perDayLimit = input.perDayLimit !== null && input.perDayLimit !== undefined 
    ? Math.max(1, input.perDayLimit) 
    : null;

  return {
    couponId,
    shopName: input.shopName,
    name: input.couponName,
    description: input.description || "",
    imageUrl: (input.picture && input.picture.trim()) ? input.picture.trim() : null, // 處理空字串
    discountType: input.discountType,
    minimumOrderAmount,
    discountAmount,
    discountPercentage,
    startDate,
    endDate,
    totalQuantity,
    perUserLimit,
    perDayLimit,
    branch: input.branch || null,
    status: "active", // Admin coupons are always active
  };
}

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

    const body = await request.json() as CouponFormInput;

    // 驗證必要字段
    if (!body.shopName || !body.couponName || !body.discountType || !body.startDate || !body.endDate) {
      return NextResponse.json({ 
        error: "缺少必要字段：shopName, couponName, discountType, startDate, endDate" 
      }, { status: 400 });
    }

    // 規範化數據
    const couponData = await normalizeCouponInput(body);

    // 儲存優惠券到數據庫
    const maxIssuance = couponData.totalQuantity !== null && couponData.totalQuantity !== undefined
      ? couponData.totalQuantity
      : null;

    const savedCoupon = await prisma.coupon.create({
      data: {
        couponId: couponData.couponId,
        name: couponData.name,
        period: new Date(couponData.endDate),
        link: null,
        text: JSON.stringify({
          description: couponData.description,
          shopName: couponData.shopName,
          branch: couponData.branch,
          discountType: couponData.discountType,
          minimumOrderAmount: couponData.minimumOrderAmount,
          discountAmount: couponData.discountAmount,
          discountPercentage: couponData.discountPercentage,
          totalQuantity: couponData.totalQuantity,
          perUserLimit: couponData.perUserLimit,
          perDayLimit: couponData.perDayLimit,
          status: couponData.status,
          startDate: couponData.startDate,
          endDate: couponData.endDate,
        }),
        picture: couponData.imageUrl || null, // 確保空值時設為 null
        weight: 1, // Default weight is 1
        maxIssuance: maxIssuance,
        issuedCount: 0, // Initialize to 0
      },
    });

    return NextResponse.json({ coupon: savedCoupon });
  } catch (error: any) {
    console.error("Error creating coupon:", error);
    return NextResponse.json({ 
      error: "伺服器錯誤",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    }, { status: 500 });
  }
}

