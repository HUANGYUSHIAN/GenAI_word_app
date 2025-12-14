import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/student/coupons/available
 * 
 * Returns a list of all published (active) coupons.
 * Shows all active coupons regardless of student's points balance.
 * Purchase availability is determined client-side based on points.
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

    const now = new Date();
    const nowDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Fetch all coupons and filter client-side (since text is JSON string)
    // In production, consider adding indexed fields for better performance
    const allCoupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Parse and filter coupons
    const availableCoupons = [];
    for (const coupon of allCoupons) {
      try {
        if (!coupon.text) continue;

        const couponData = JSON.parse(coupon.text);

        // Check status - only show active coupons
        if (couponData.status !== "active") continue;

        // Check stock (if applicable) - calculate remaining stock
        let remainingStock: number | null = null;
        let isOutOfStock = false;
        if (couponData.totalQuantity !== null && couponData.totalQuantity !== undefined) {
          // Count how many have been purchased
          const purchasedCount = await prisma.purchasedCoupon.count({
            where: { couponId: coupon.couponId },
          });
          remainingStock = couponData.totalQuantity - purchasedCount;
          isOutOfStock = remainingStock <= 0;
        }

        // Get shop name and location from coupon data
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

        availableCoupons.push({
          couponId: coupon.couponId,
          name: coupon.name,
          shopName,
          branch,
          storeLocation,
          validFrom: couponData.startDate || null,
          validTo: couponData.endDate || null,
          pointsCost: couponData.requiredPoints || 0,
          valueDescription,
          description: couponData.description || null,
          picture: coupon.picture || null,
          discountType: couponData.discountType,
          discountAmount: couponData.discountAmount || null,
          discountPercentage: couponData.discountPercentage || null,
          minimumOrderAmount: couponData.minimumOrderAmount || null,
          perUserLimit: couponData.perUserLimit || null,
          totalQuantity: couponData.totalQuantity || null,
          remainingStock,
          isOutOfStock,
        });
      } catch (parseError) {
        console.error(`Error parsing coupon ${coupon.couponId}:`, parseError);
        // Skip invalid coupons
        continue;
      }
    }

    return NextResponse.json({ coupons: availableCoupons });
  } catch (error: any) {
    console.error("Error fetching available coupons:", error);
    // Return empty array instead of error to prevent UI error messages
    return NextResponse.json({ coupons: [] });
  }
}

