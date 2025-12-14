import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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
 * 規範化優惠券輸入數據（用於更新，不生成新的 couponId）
 */
function normalizeCouponInputForUpdate(input: CouponFormInput) {
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

// PUT - 更新優惠券
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
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

    const { couponId } = await params;
    const body = await request.json() as CouponFormInput;

    // 驗證必要字段
    if (!body.shopName || !body.couponName || !body.discountType || !body.startDate || !body.endDate) {
      return NextResponse.json({ 
        error: "缺少必要字段：shopName, couponName, discountType, startDate, endDate" 
      }, { status: 400 });
    }

    // 規範化數據
    const couponData = normalizeCouponInputForUpdate(body);

    // 更新優惠券
    const maxIssuance = couponData.totalQuantity !== null && couponData.totalQuantity !== undefined
      ? couponData.totalQuantity
      : null;

    const coupon = await prisma.coupon.update({
      where: { couponId },
      data: {
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
        maxIssuance: maxIssuance,
      },
    });

    return NextResponse.json({ coupon });
  } catch (error: any) {
    console.error("Error updating coupon:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// DELETE - 刪除優惠券
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
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

    const { couponId } = await params;

    await prisma.coupon.delete({
      where: { couponId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

