import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PUT - 更新單字本
export async function PUT(
  request: Request,
  { params }: { params: { vocabularyId: string } }
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

    const { vocabularyId } = await params;
    const body = await request.json();
    const { name, langUse, langExp, copyrights, establisher } = body;

    const vocabulary = await prisma.vocabulary.update({
      where: { vocabularyId },
      data: {
        name,
        langUse,
        langExp,
        copyrights: copyrights || null,
        establisher,
      },
    });

    return NextResponse.json({ vocabulary });
  } catch (error: any) {
    console.error("Error updating vocabulary:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// DELETE - 刪除單字本
export async function DELETE(
  request: Request,
  { params }: { params: { vocabularyId: string } }
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

    const { vocabularyId } = await params;

    await prisma.vocabulary.delete({
      where: { vocabularyId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting vocabulary:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

