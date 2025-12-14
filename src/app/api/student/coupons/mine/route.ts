import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/student/coupons/mine
 * 
 * Returns all coupons purchased by the authenticated student.
 * Includes redemption status and QR code token.
 */
export async function GET(request: NextRequest) {
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

    // Fetch all purchased coupons for this student
    // Note: If PurchasedCoupon model doesn't exist yet, return empty array
    let purchasedCoupons: any[] = [];
    try {
      purchasedCoupons = await prisma.purchasedCoupon.findMany({
        where: { studentUserId: session.userId },
        include: {
          coupon: true,
        },
        orderBy: { purchasedAt: "desc" },
      });
    } catch (modelError: any) {
      // If model doesn't exist or schema not updated, return empty array
      console.warn("PurchasedCoupon model may not exist yet:", modelError.message);
      return NextResponse.json({ coupons: [] });
    }

    const now = new Date();

    // Auto-finalize expired REDEEMING coupons (Option A: during GET request)
    // Find all REDEEMING coupons that have passed their expiration time
    try {
      const expiredRedeeming = await prisma.purchasedCoupon.findMany({
        where: {
          studentUserId: session.userId,
          status: "REDEEMING",
          redeemExpiresAt: {
            lte: now, // redeemExpiresAt <= now
          },
        },
      });

      // Update them to REDEEMED status
      if (expiredRedeeming.length > 0) {
        await Promise.all(
          expiredRedeeming.map((coupon: typeof expiredRedeeming[0]) =>
            prisma.purchasedCoupon.update({
              where: { id: coupon.id },
              data: {
                status: "REDEEMED",
                redeemedAt: coupon.redeemExpiresAt || now, // Use expire time as redeemed time
              },
            })
          )
        );
      }
    } catch (finalizeError) {
      console.error("Error finalizing expired redemptions:", finalizeError);
      // Continue even if finalization fails
    }

    // Filter out REDEEMED coupons - they should not appear in "My Coupons"
    const visibleCoupons = purchasedCoupons.filter((p) => p.status !== "REDEEMED");

    // Process and enrich with coupon details
    const myCoupons = await Promise.all(
      visibleCoupons.map(async (purchased) => {
        try {
          // Parse coupon data from text field
          let couponData: any = {};
          if (purchased.coupon.text) {
            couponData = JSON.parse(purchased.coupon.text);
          }

          // Determine status
          let status = purchased.status;
          const endDate = couponData.endDate ? new Date(couponData.endDate) : null;
          
          // If expired and not yet redeemed/redeeming, mark as expired
          if ((status === "UNUSED" || status === "REDEEMING") && endDate && now > endDate) {
            status = "EXPIRED";
            // Update in DB
            try {
              await prisma.purchasedCoupon.update({
                where: { id: purchased.id },
                data: { status: "EXPIRED" },
              });
            } catch (updateError) {
              // Ignore update errors
              console.warn("Failed to update expired status:", updateError);
            }
          }

          // Get shop name and location
          const shopName = couponData.shopName || "未知店家";
          const branch = couponData.branch || null;
          const storeLocation = branch ? `${shopName} - ${branch}` : shopName;

          // Calculate discount value description
          let valueDescription = "";
          if (couponData.discountType === "threshold_amount_off") {
            valueDescription = `滿 ${couponData.minimumOrderAmount} 元折 ${couponData.discountAmount} 元`;
          } else if (couponData.discountType === "amount_off") {
            valueDescription = `折 ${couponData.discountAmount} 元`;
          } else if (couponData.discountType === "percentage") {
            const zheValue = (couponData.discountPercentage || 0) / 10;
            valueDescription = `全單 ${zheValue % 1 === 0 ? zheValue : zheValue.toFixed(1)} 折`;
          }

          return {
            id: purchased.id,
            couponId: purchased.couponId,
            name: purchased.coupon.name,
            shopName,
            branch,
            storeLocation,
            validFrom: couponData.startDate || null,
            validTo: couponData.endDate || null,
            pointsCost: couponData.requiredPoints || 0,
            valueDescription,
            description: couponData.description || null,
            picture: purchased.coupon.picture || null,
            purchasedAt: purchased.purchasedAt.toISOString(),
            status,
            redeemStartedAt: purchased.redeemStartedAt?.toISOString() || null,
            redeemExpiresAt: purchased.redeemExpiresAt?.toISOString() || null,
            redeemedAt: purchased.redeemedAt?.toISOString() || null,
            discountType: couponData.discountType,
            discountAmount: couponData.discountAmount || null,
            discountPercentage: couponData.discountPercentage || null,
            minimumOrderAmount: couponData.minimumOrderAmount || null,
          };
        } catch (parseError) {
          console.error(`Error processing purchased coupon ${purchased.id}:`, parseError);
          // Return basic info even if parsing fails
          return {
            id: purchased.id,
            couponId: purchased.couponId,
            name: purchased.coupon.name,
            shopName: "未知店家",
            branch: null,
            storeLocation: "未知店家",
            validFrom: null,
            validTo: null,
            pointsCost: 0,
            valueDescription: "",
            description: null,
            picture: purchased.coupon.picture || null,
            purchasedAt: purchased.purchasedAt.toISOString(),
            status: purchased.status,
            redeemStartedAt: purchased.redeemStartedAt?.toISOString() || null,
            redeemExpiresAt: purchased.redeemExpiresAt?.toISOString() || null,
            redeemedAt: purchased.redeemedAt?.toISOString() || null,
            discountType: null,
            discountAmount: null,
            discountPercentage: null,
            minimumOrderAmount: null,
          };
        }
      })
    );

    return NextResponse.json({ coupons: myCoupons });
  } catch (error: any) {
    console.error("Error fetching student coupons:", error);
    // Return empty array instead of error to prevent UI error messages
    return NextResponse.json({ coupons: [] });
  }
}

