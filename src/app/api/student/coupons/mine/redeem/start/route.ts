import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/student/coupons/mine/redeem/start
 * 
 * Starts the redemption process for a coupon by couponId.
 * Finds one UNUSED coupon with the given couponId and starts redemption.
 * 
 * Request body: { couponId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // Verify user is a student
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { studentData: true },
    });

    if (!user || user.dataType !== "Student" || !user.studentData) {
      return NextResponse.json({ error: "無權限，僅學生可使用此功能" }, { status: 403 });
    }

    const body = await request.json();
    const { couponId } = body;

    if (!couponId) {
      return NextResponse.json({ error: "缺少 couponId" }, { status: 400 });
    }

    // Find one UNUSED purchased coupon with this couponId for this student
    const purchasedCoupon = await prisma.purchasedCoupon.findFirst({
      where: {
        studentUserId: session.userId,
        couponId: couponId,
        status: "UNUSED",
      },
      include: { coupon: true },
      orderBy: { purchasedAt: "asc" }, // Use the oldest one first
    });

    if (!purchasedCoupon) {
      return NextResponse.json({ error: "沒有可兌換的優惠券" }, { status: 404 });
    }

    // Check if coupon is expired
    let couponData: any = {};
    if (purchasedCoupon.coupon.text) {
      try {
        couponData = JSON.parse(purchasedCoupon.coupon.text);
      } catch (e) {
        console.error("Error parsing coupon data:", e);
      }
    }

    const now = new Date();
    const endDate = couponData.endDate ? new Date(couponData.endDate) : null;
    if (endDate && now > endDate) {
      // Mark as expired
      await prisma.purchasedCoupon.update({
        where: { id: purchasedCoupon.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "優惠券已過期" }, { status: 400 });
    }

    // Start redemption: set status to REDEEMING and set timestamps
    const redeemStartedAt = new Date();
    const redeemExpiresAt = new Date(redeemStartedAt.getTime() + 5 * 60 * 1000); // 5 minutes

    const updated = await prisma.purchasedCoupon.update({
      where: { id: purchasedCoupon.id },
      data: {
        status: "REDEEMING",
        redeemStartedAt,
        redeemExpiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      redeemExpiresAt: redeemExpiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error starting redemption:", error);
    return NextResponse.json(
      {
        error: "開始兌換失敗",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

