import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/coupons/catalog
 * 
 * Returns a read-only catalog of all available coupons for lottery draw.
 * This is informational only - no purchase or selection actions.
 * 
 * Shows:
 * - Store name and location
 * - Validity period
 * - Coupon value/description
 * - Remaining issuance count or "Out of stock"
 * - No QR codes, no tokens, no purchase buttons
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // Verify user is a student (catalog is for students)
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { studentData: true },
    });

    if (!user || user.dataType !== "Student" || !user.studentData) {
      return NextResponse.json({ error: "無權限，僅學生可使用此功能" }, { status: 403 });
    }

    const now = new Date();

    // Fetch all coupons
    const allCoupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    // First pass: build eligible coupons list and calculate total weight
    const eligibleCoupons = [];
    let totalWeight = 0;

    for (const coupon of allCoupons) {
      try {
        if (!coupon.text) {
          console.log(`Coupon ${coupon.couponId} has no text field`);
          continue;
        }

        const couponData = JSON.parse(coupon.text);

        // Include active coupons (draft coupons are not shown to students)
        // Only show coupons with status "active"
        if (couponData.status !== "active") {
          continue;
        }

        // Check date validity
        // Note: We compare dates at day level (ignore time) to avoid timezone issues
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        
        // Use endDate from couponData, or fallback to coupon.period
        if (couponData.endDate) {
          endDate = new Date(couponData.endDate);
        } else if (coupon.period) {
          // Fallback to period field if endDate is not in couponData
          endDate = new Date(coupon.period);
        }
        
        if (couponData.startDate) {
          startDate = new Date(couponData.startDate);
        }
        
        // Normalize dates to day level for comparison
        if (startDate) {
          startDate.setHours(0, 0, 0, 0);
        }
        if (endDate) {
          endDate.setHours(23, 59, 59, 999);
        }

        const nowDate = new Date(now);
        nowDate.setHours(0, 0, 0, 0); // Compare at day level

        // If startDate exists and is in the future, skip
        if (startDate && nowDate < startDate) {
          continue;
        }
        // If endDate exists and is in the past, skip
        if (endDate && nowDate > endDate) {
          continue;
        }

        // Check stock (remaining issuance count)
        // Note: We show coupons even if out of stock in catalog, but mark them as isOutOfStock
        // This allows students to see all available coupons in the catalog
        const maxIssuance = coupon.maxIssuance;
        const issuedCount = coupon.issuedCount || 0;
        // Don't filter out of stock coupons here - they will be marked as isOutOfStock later

        // Coupon is eligible
        const weight = coupon.weight || 1;
        eligibleCoupons.push({
          coupon,
          couponData,
          weight,
        });
        totalWeight += weight;
      } catch (parseError) {
        console.error(`Error parsing coupon ${coupon.couponId}:`, parseError);
        continue;
      }
    }

    // Process eligible coupons and build catalog with probability
    const catalogCoupons = [];
    for (const item of eligibleCoupons) {
      const { coupon, couponData } = item;
      try {
        // Calculate remaining issuance count
        const maxIssuance = coupon.maxIssuance;
        const issuedCount = coupon.issuedCount || 0;
        const remainingCount =
          maxIssuance !== null && maxIssuance !== undefined
            ? Math.max(0, maxIssuance - issuedCount)
            : null;
        const isOutOfStock = maxIssuance !== null && remainingCount !== null && remainingCount <= 0;

        // Calculate probability (weight / totalWeight * 100)
        const probability = totalWeight > 0 ? (item.weight / totalWeight) * 100 : 0;

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

        catalogCoupons.push({
          couponId: coupon.couponId,
          name: coupon.name,
          shopName,
          branch,
          storeLocation,
          validFrom: couponData.startDate || null,
          validTo: couponData.endDate || null,
          valueDescription,
          description: couponData.description || null,
          picture: coupon.picture || null,
          weight: item.weight,
          probability: probability, // 抽中機率（百分比）
          maxIssuance,
          issuedCount,
          remainingCount,
          isOutOfStock,
          discountType: couponData.discountType,
          discountAmount: couponData.discountAmount || null,
          discountPercentage: couponData.discountPercentage || null,
          minimumOrderAmount: couponData.minimumOrderAmount || null,
        });
      } catch (parseError) {
        console.error(`Error processing coupon ${coupon.couponId}:`, parseError);
        continue;
      }
    }

    return NextResponse.json({ coupons: catalogCoupons });
  } catch (error: any) {
    console.error("Error fetching coupon catalog:", error);
    return NextResponse.json({ coupons: [] });
  }
}

