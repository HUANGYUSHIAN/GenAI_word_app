import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取供應商的優惠券列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 檢查是否為供應商
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { supplierData: true },
    });

    if (!user || user.dataType !== "Supplier" || !user.supplierData) {
      return NextResponse.json(
        { error: "無權限，僅供應商可使用此功能" },
        { status: 403 }
      );
    }

    // 獲取供應商的優惠券 ID 列表
    const supplierCouponIds = user.supplierData.lsuppcoIDs || [];

    // 從數據庫獲取優惠券詳情
    const coupons = await prisma.coupon.findMany({
      where: {
        couponId: {
          in: supplierCouponIds,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 解析優惠券的 text 欄位（JSON string）
    const couponsWithDetails = coupons.map((coupon) => {
      let couponDetails: any = {};
      try {
        if (coupon.text) {
          couponDetails = JSON.parse(coupon.text);
        }
      } catch (e) {
        // 如果解析失敗，使用原始 text
        couponDetails = { description: coupon.text };
      }

      return {
        couponId: coupon.couponId,
        name: coupon.name,
        period: coupon.period.toISOString(),
        link: coupon.link,
        picture: coupon.picture,
        maxIssuance: coupon.maxIssuance,
        issuedCount: coupon.issuedCount || 0,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
        ...couponDetails,
      };
    });

    return NextResponse.json({
      coupons: couponsWithDetails,
      total: couponsWithDetails.length,
    });
  } catch (error: any) {
    console.error("Error fetching supplier coupons:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

