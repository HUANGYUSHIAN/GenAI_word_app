import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/student/coupons/mine/[id]/redeem/start
 * 
 * Starts the redemption process for an owned coupon.
 * 
 * Server responsibilities:
 * - Validate authenticated student owns this coupon
 * - Ensure coupon status is UNUSED and not expired
 * - Set status = REDEEMING
 * - Set redeemStartedAt = now
 * - Set redeemExpiresAt = now + 5 minutes
 * - Return redeemExpiresAt to client
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Find the purchased coupon
    const purchasedCoupon = await prisma.purchasedCoupon.findUnique({
      where: { id },
      include: { coupon: true },
    });

    if (!purchasedCoupon) {
      return NextResponse.json({ error: "優惠券不存在" }, { status: 404 });
    }

    // Verify the coupon belongs to the authenticated student
    if (purchasedCoupon.studentUserId !== session.userId) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    // Check coupon status - must be UNUSED
    if (purchasedCoupon.status !== "UNUSED") {
      return NextResponse.json(
        { error: `優惠券狀態為 ${purchasedCoupon.status}，無法開始兌換` },
        { status: 400 }
      );
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
        where: { id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "優惠券已過期" }, { status: 400 });
    }

    // Start redemption: set status to REDEEMING and set timestamps
    const redeemStartedAt = new Date();
    const redeemExpiresAt = new Date(redeemStartedAt.getTime() + 5 * 60 * 1000); // 5 minutes

    const updated = await prisma.purchasedCoupon.update({
      where: { id },
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

