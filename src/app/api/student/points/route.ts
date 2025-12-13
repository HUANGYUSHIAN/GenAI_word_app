import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取當前用戶的積分
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
    });

    if (!student) {
      return NextResponse.json({ error: "學生資料不存在" }, { status: 404 });
    }

    // 從 paraGame 中讀取積分
    let points = 0;
    if (student.paraGame) {
      try {
        const gameData = typeof student.paraGame === "string" 
          ? JSON.parse(student.paraGame) 
          : student.paraGame;
        points = gameData.points || 0;
      } catch (e) {
        // 如果解析失敗，使用默認值
        points = 0;
      }
    }

    return NextResponse.json({ points });
  } catch (error: any) {
    console.error("獲取積分失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

// POST - 增加用戶積分
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await request.json();
    const { pointsToAdd } = body;

    if (typeof pointsToAdd !== "number" || pointsToAdd < 0) {
      return NextResponse.json({ error: "無效的積分數值" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
    });

    if (!student) {
      return NextResponse.json({ error: "學生資料不存在" }, { status: 404 });
    }

    // 讀取現有積分
    let currentPoints = 0;
    let gameData: any = {};
    if (student.paraGame) {
      try {
        gameData = typeof student.paraGame === "string" 
          ? JSON.parse(student.paraGame) 
          : student.paraGame;
        currentPoints = gameData.points || 0;
      } catch (e) {
        gameData = {};
      }
    }

    // 增加積分
    const newPoints = currentPoints + pointsToAdd;
    gameData.points = newPoints;

    // 更新資料庫
    await prisma.student.update({
      where: { userId: session.userId },
      data: {
        paraGame: JSON.stringify(gameData),
      },
    });

    return NextResponse.json({ points: newPoints });
  } catch (error: any) {
    console.error("增加積分失敗:", error);
    return NextResponse.json(
      { error: error.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}

