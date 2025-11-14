import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PUT - 更新優惠券
export async function PUT(
  request: Request,
  { params }: { params: { couponId: string } }
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
    const body = await request.json();
    const { name, period, link, text, picture } = body;

    const coupon = await prisma.coupon.update({
      where: { couponId },
      data: {
        name,
        period: new Date(period),
        link: link || null,
        text: text || null,
        picture: picture || null,
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
  request: Request,
  { params }: { params: { couponId: string } }
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

