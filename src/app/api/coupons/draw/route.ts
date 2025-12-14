import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * Get draw cost in points from database
 * Falls back to 0 if not set
 */
async function getDrawCostPoints(): Promise<number> {
  try {
    const admin = await prisma.admin.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    return admin?.drawCostPoints ?? 0;
  } catch (error) {
    console.error("Error fetching draw cost:", error);
    return 0; // Default to 0 on error
  }
}

/**
 * Generate a cryptographically strong random token for redemption
 */
function generateRedemptionToken(): string {
  return randomBytes(32).toString("hex"); // 64 character hex string
}

/**
 * POST /api/coupons/draw
 * 
 * Performs a lottery draw for the authenticated student.
 * 
 * No request body required.
 * 
 * Atomic transaction:
 * 1. Validates student has enough points (≥ DRAW_COST_POINTS)
 * 2. Builds eligible coupon pool (active, valid, in stock)
 * 3. Performs weighted random selection
 * 4. Deducts points from student
 * 5. Increments coupon issuedCount
 * 6. Creates PurchasedCoupon record
 * 
 * All operations succeed or fail together.
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

    // Get current draw cost from database
    const DRAW_COST_POINTS = await getDrawCostPoints();

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check student has enough points
      const student = await tx.student.findUnique({
        where: { userId: session.userId },
      });

      if (!student) {
        throw new Error("學生資料不存在");
      }

      // Only check points if cost is greater than 0
      if (DRAW_COST_POINTS > 0) {
        const currentPoints = student.pointsBalance || 0;
        if (currentPoints < DRAW_COST_POINTS) {
          throw new Error(`點數不足，需要 ${DRAW_COST_POINTS} 點，您目前有 ${currentPoints} 點`);
        }
      }

      // 2. Build eligible coupon pool
      const now = new Date();
      const allCoupons = await tx.coupon.findMany();

      interface EligibleCoupon {
        coupon: any;
        couponData: any;
        weight: number;
      }

      const eligibleCoupons: EligibleCoupon[] = [];

      for (const coupon of allCoupons) {
        try {
          if (!coupon.text) continue;

          const couponData = JSON.parse(coupon.text);

          // Check status
          if (couponData.status !== "active") continue;

          // Check date validity
          const startDate = couponData.startDate ? new Date(couponData.startDate) : null;
          const endDate = couponData.endDate ? new Date(couponData.endDate) : null;

          if (startDate && now < startDate) continue; // Not yet valid
          if (endDate && now > endDate) continue; // Expired

          // Check stock (remaining issuance count)
          const maxIssuance = coupon.maxIssuance;
          const issuedCount = coupon.issuedCount || 0;
          if (maxIssuance !== null && maxIssuance !== undefined) {
            const remainingCount = maxIssuance - issuedCount;
            if (remainingCount <= 0) continue; // Out of stock
          }

          // Coupon is eligible
          eligibleCoupons.push({
            coupon,
            couponData,
            weight: coupon.weight || 1, // Default weight is 1
          });
        } catch (parseError) {
          console.error(`Error parsing coupon ${coupon.couponId}:`, parseError);
          continue;
        }
      }

      // 3. Check if any eligible coupons exist
      if (eligibleCoupons.length === 0) {
        throw new Error("目前沒有可抽獎的優惠券");
      }

      // 4. Weighted random selection
      // Calculate total weight
      const totalWeight = eligibleCoupons.reduce((sum, item) => sum + item.weight, 0);

      if (totalWeight <= 0) {
        throw new Error("優惠券權重配置錯誤");
      }

      // Generate random number in [0, totalWeight)
      const randomValue = Math.random() * totalWeight;

      // Find selected coupon by cumulative weight
      let cumulativeWeight = 0;
      let selectedCoupon: EligibleCoupon | null = null;

      for (const item of eligibleCoupons) {
        cumulativeWeight += item.weight;
        if (randomValue < cumulativeWeight) {
          selectedCoupon = item;
          break;
        }
      }

      // Fallback to first coupon if selection failed (should not happen)
      if (!selectedCoupon) {
        selectedCoupon = eligibleCoupons[0];
      }

      // 5. Generate unique redemption token
      let redemptionToken = generateRedemptionToken();
      let tokenExists = true;
      let attempts = 0;
      const maxAttempts = 10;

      while (tokenExists && attempts < maxAttempts) {
        const existing = await tx.purchasedCoupon.findUnique({
          where: { redemptionToken },
        });
        if (!existing) {
          tokenExists = false;
        } else {
          redemptionToken = generateRedemptionToken();
          attempts++;
        }
      }

      if (tokenExists) {
        throw new Error("無法生成唯一的兌換令牌，請稍後再試");
      }

      // 6. Perform atomic operations: deduct points (if cost > 0), increment issuedCount, create purchased coupon
      const couponDbId = selectedCoupon.coupon.id;

      // Only deduct points if cost is greater than 0
      let updatedStudent;
      if (DRAW_COST_POINTS > 0) {
        updatedStudent = await tx.student.update({
          where: { userId: session.userId },
          data: {
            pointsBalance: {
              decrement: DRAW_COST_POINTS,
            },
          },
        });
      } else {
        // If cost is 0, just use student data
        updatedStudent = student;
      }

      // Increment issued count and create purchased coupon
      const [updatedCoupon, purchasedCoupon] = await Promise.all([
        tx.coupon.update({
          where: { id: selectedCoupon.coupon.id },
          data: {
            issuedCount: {
              increment: 1,
            },
          },
        }),
        tx.purchasedCoupon.create({
          data: {
            couponId: selectedCoupon.coupon.couponId,
            couponDbId: couponDbId,
            studentUserId: session.userId,
            redemptionToken,
            status: "UNUSED",
          },
        }),
      ]);

      // Parse coupon data for response
      const shopName = selectedCoupon.couponData.shopName || "未知店家";
      const branch = selectedCoupon.couponData.branch || null;
      const storeLocation = branch ? `${shopName} - ${branch}` : shopName;

      // Calculate discount value description
      let valueDescription = "";
      if (selectedCoupon.couponData.discountType === "threshold_amount_off") {
        valueDescription = `滿 ${selectedCoupon.couponData.minimumOrderAmount} 元折 ${selectedCoupon.couponData.discountAmount} 元`;
      } else if (selectedCoupon.couponData.discountType === "amount_off") {
        valueDescription = `折 ${selectedCoupon.couponData.discountAmount} 元`;
      } else if (selectedCoupon.couponData.discountType === "percentage") {
        const zheValue = (selectedCoupon.couponData.discountPercentage || 0) / 10;
        valueDescription = `全單 ${zheValue % 1 === 0 ? zheValue : zheValue.toFixed(1)} 折`;
      }

      return {
        success: true,
        awardedCoupon: {
          id: purchasedCoupon.id,
          couponId: selectedCoupon.coupon.couponId,
          name: selectedCoupon.coupon.name,
          shopName,
          branch,
          storeLocation,
          valueDescription,
          description: selectedCoupon.couponData.description || null,
          picture: selectedCoupon.coupon.picture || null,
          validFrom: selectedCoupon.couponData.startDate || null,
          validTo: selectedCoupon.couponData.endDate || null,
        },
        remainingPoints: updatedStudent.pointsBalance,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error performing draw:", error);

    // Return specific error messages
    if (
      error.message.includes("點數") ||
      error.message.includes("沒有可抽獎") ||
      error.message.includes("權重") ||
      error.message.includes("無法生成")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: "抽獎失敗",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

