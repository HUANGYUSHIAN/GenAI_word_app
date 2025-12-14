import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/draw-cost
 * 
 * Returns the current draw cost in points.
 * This is a public endpoint (no auth required) as students need to know the cost.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the first admin's drawCostPoints setting
    // In a multi-admin system, you might want to use a system-wide config instead
    const admin = await prisma.admin.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const drawCostPoints = admin?.drawCostPoints ?? 0;

    return NextResponse.json({ drawCostPoints });
  } catch (error: any) {
    console.error("Error fetching draw cost:", error);
    return NextResponse.json({ drawCostPoints: 0 }); // Default to 0 on error
  }
}

/**
 * PUT /api/admin/draw-cost
 * 
 * Updates the draw cost in points.
 * Only admins can update this.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: { adminData: true },
    });

    if (!user || user.dataType !== "Admin" || !user.adminData) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const body = await request.json();
    const { drawCostPoints } = body;

    if (typeof drawCostPoints !== "number" || drawCostPoints < 0) {
      return NextResponse.json(
        { error: "點數必須是非負整數" },
        { status: 400 }
      );
    }

    // Check if admin record exists, if not create it
    let adminRecord = await prisma.admin.findUnique({
      where: { userId: session.userId },
    });

    if (!adminRecord) {
      // Create admin record if it doesn't exist
      adminRecord = await prisma.admin.create({
        data: {
          userId: session.userId,
          drawCostPoints,
        },
      });
    } else {
      // Update the admin's drawCostPoints setting
      adminRecord = await prisma.admin.update({
        where: { userId: session.userId },
        data: { drawCostPoints },
      });
    }

    return NextResponse.json({
      success: true,
      drawCostPoints: adminRecord.drawCostPoints,
    });
  } catch (error: any) {
    console.error("Error updating draw cost:", error);
    return NextResponse.json(
      {
        error: "更新失敗",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

