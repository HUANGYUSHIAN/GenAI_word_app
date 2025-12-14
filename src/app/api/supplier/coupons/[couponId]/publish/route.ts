import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST - 發布優惠券（將狀態從 draft 改為 active）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
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

    const { couponId } = await params;

    // 檢查優惠券是否存在且屬於當前供應商
    const coupon = await prisma.coupon.findUnique({
      where: { couponId },
    });

    if (!coupon) {
      return NextResponse.json({ error: "優惠券不存在" }, { status: 404 });
    }

    // 解析優惠券的 text 欄位
    let couponDetails: any = {};
    try {
      if (coupon.text) {
        couponDetails = JSON.parse(coupon.text);
      }
    } catch (e) {
      // 如果解析失敗，使用原始 text
      couponDetails = { description: coupon.text };
    }

    // 檢查優惠券是否屬於當前供應商
    if (couponDetails.supplierId !== session.userId) {
      return NextResponse.json(
        { error: "無權限操作此優惠券" },
        { status: 403 }
      );
    }

    // 檢查優惠券狀態是否為 draft
    if (couponDetails.status !== "draft") {
      return NextResponse.json(
        { error: "只能發布草稿狀態的優惠券" },
        { status: 400 }
      );
    }

    // 更新優惠券狀態為 active
    couponDetails.status = "active";

    const updatedCoupon = await prisma.coupon.update({
      where: { couponId },
      data: {
        text: JSON.stringify(couponDetails),
      },
    });

    return NextResponse.json({
      success: true,
      coupon: updatedCoupon,
    });
  } catch (error: any) {
    console.error("Error publishing coupon:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

