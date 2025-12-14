import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";

/**
 * Generate a cryptographically strong random token for redemption
 */
function generateRedemptionToken(): string {
  return randomBytes(32).toString("hex"); // 64 character hex string
}

/**
 * POST /api/student/coupons/purchase
 * 
 * Purchases a coupon for the authenticated student.
 * 
 * Request body: { couponId: string }
 * 
 * This performs an atomic transaction:
 * 1. Validates coupon is available and student has enough points
 * 2. Checks per-user purchase limit
 * 3. Deducts points from student
 * 4. Creates PurchasedCoupon record with unique redemption token
 * 
 * All operations succeed or fail together.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // Store userId as a const to ensure type safety
    const userId: string = session.userId;

    // Verify user is a student
    const user = await prisma.user.findUnique({
      where: { userId },
      include: { studentData: true },
    });

    if (!user || user.dataType !== "Student" || !user.studentData) {
      return NextResponse.json({ error: "無權限，僅學生可使用此功能" }, { status: 403 });
    }

    const body = await request.json();
    const { couponId } = body;

    if (!couponId || typeof couponId !== "string") {
      return NextResponse.json({ error: "缺少 couponId" }, { status: 400 });
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Fetch and validate coupon
      const coupon = await tx.coupon.findUnique({
        where: { couponId },
      });

      if (!coupon) {
        throw new Error("優惠券不存在");
      }

      if (!coupon.text) {
        throw new Error("優惠券資料不完整");
      }

      const couponData = JSON.parse(coupon.text);

      // 2. Check coupon status
      if (couponData.status !== "active") {
        throw new Error("此優惠券目前不可用");
      }

      // 3. Check date validity
      const now = new Date();
      const startDate = couponData.startDate ? new Date(couponData.startDate) : null;
      const endDate = couponData.endDate ? new Date(couponData.endDate) : null;

      if (startDate && now < startDate) {
        throw new Error("此優惠券尚未開始");
      }

      if (endDate && now > endDate) {
        throw new Error("此優惠券已過期");
      }

      // 4. Check stock (if applicable)
      if (couponData.totalQuantity !== null && couponData.totalQuantity !== undefined) {
        const purchasedCount = await tx.purchasedCoupon.count({
          where: { couponId },
        });

        if (purchasedCount >= couponData.totalQuantity) {
          throw new Error("此優惠券已售完");
        }
      }

      // 5. Check per-user limit
      if (couponData.perUserLimit && couponData.perUserLimit > 0) {
        const userPurchaseCount = await tx.purchasedCoupon.count({
          where: {
            couponId,
            studentUserId: userId,
          },
        });

        if (userPurchaseCount >= couponData.perUserLimit) {
          throw new Error(`您已達到此優惠券的購買上限（每人限購 ${couponData.perUserLimit} 張）`);
        }
      }

      // 6. Check student has enough points
      const requiredPoints = couponData.requiredPoints || 0;
      const student = await tx.student.findUnique({
        where: { userId },
      });

      if (!student) {
        throw new Error("學生資料不存在");
      }

      const currentPoints = student.pointsBalance || 0;

      if (currentPoints < requiredPoints) {
        throw new Error(`點數不足，需要 ${requiredPoints} 點，您目前有 ${currentPoints} 點`);
      }

      // 7. Generate unique redemption token
      let redemptionToken = generateRedemptionToken();
      let tokenExists = true;
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure token is unique (very unlikely collision, but check anyway)
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

      // 8. Find coupon DB ID for relation
      const couponDbId = coupon.id;

      // 9. Perform atomic operations: deduct points (if needed) and create purchased coupon
      let updatedStudent;
      let purchasedCoupon;

      if (requiredPoints > 0) {
        // Only deduct points if requiredPoints > 0
        [updatedStudent, purchasedCoupon] = await Promise.all([
          // Deduct points
          tx.student.update({
            where: { userId },
            data: {
              pointsBalance: {
                decrement: requiredPoints,
              },
            },
          }),
          // Create purchased coupon
          tx.purchasedCoupon.create({
            data: {
              couponId,
              couponDbId: couponDbId,
              studentUserId: userId,
              redemptionToken,
              status: "UNUSED",
            },
          }),
        ]);
      } else {
        // For 0 points, just fetch student and create purchased coupon
        [updatedStudent, purchasedCoupon] = await Promise.all([
          // Just fetch student (no point deduction needed)
          tx.student.findUnique({
            where: { userId },
          }),
          // Create purchased coupon
          tx.purchasedCoupon.create({
            data: {
              couponId,
              couponDbId: couponDbId,
              studentUserId: userId,
              redemptionToken,
              status: "UNUSED",
            },
          }),
        ]);

        if (!updatedStudent) {
          throw new Error("學生資料不存在");
        }
      }

      return {
        success: true,
        purchasedCoupon: {
          id: purchasedCoupon.id,
          couponId: purchasedCoupon.couponId,
          redemptionToken: purchasedCoupon.redemptionToken,
          purchasedAt: purchasedCoupon.purchasedAt.toISOString(),
        },
        remainingPoints: updatedStudent.pointsBalance,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error purchasing coupon:", error);
    console.error("Error stack:", error.stack);

    // Return specific error messages
    if (
      error.message.includes("優惠券") ||
      error.message.includes("點數") ||
      error.message.includes("上限") ||
      error.message.includes("售完") ||
      error.message.includes("過期") ||
      error.message.includes("尚未開始") ||
      error.message.includes("不可用") ||
      error.message.includes("學生資料不存在") ||
      error.message.includes("無法生成")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Check for Prisma/model errors
    if (error.code === "P2002" || error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "此優惠券已購買過或發生衝突，請稍後再試" }, { status: 400 });
    }

    if (error.message.includes("model") || error.message.includes("schema") || error.message.includes("PurchasedCoupon")) {
      return NextResponse.json(
        {
          error: "資料庫模型尚未初始化，請聯繫管理員",
          details: process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "購買失敗",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

