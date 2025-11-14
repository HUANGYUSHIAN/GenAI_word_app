import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json(
        { error: "未登入", clearSession: true },
        { status: 401 }
      );
    }

    // 使用重試機制，給資料庫一些時間回應（特別是本地資料庫）
    let user = null;
    let lastError = null;
    const maxRetries = 3;
    const retryDelay = 100; // 100ms

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        user = await prisma.user.findUnique({
          where: { userId: session.userId },
          select: {
            userId: true,
            googleId: true,
            name: true,
            email: true,
            image: true,
            dataType: true,
            isLock: true,
          },
        });

        // 如果找到用戶，跳出重試循環
        if (user) {
          break;
        }

        // 如果沒找到用戶，等待一下再重試（可能是資料庫還沒寫入完成）
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error: any) {
        lastError = error;
        // 如果是資料庫連接錯誤，立即返回錯誤
        const isDatabaseError = 
          error.message?.includes("database") || 
          error.message?.includes("connection") || 
          error.message?.includes("MongoDB") ||
          error.message?.includes("invalid") ||
          error.code === "P1001" ||
          error.code === "P1002";
        
        if (isDatabaseError) {
          // 資料庫連接錯誤，不應該清除 session（可能是暫時的連接問題）
          console.error("Database connection error:", error);
          return NextResponse.json(
            { 
              error: "資料庫連接錯誤，請稍後再試",
              clearSession: false // 不清除 session，可能是暫時的連接問題
            },
            { status: 503 } // 503 Service Unavailable
          );
        }

        // 其他錯誤，等待後重試
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 如果重試後仍然找不到用戶，才清除 session
    if (!user) {
      console.error(`User not found after ${maxRetries} attempts:`, session.userId);
      return NextResponse.json(
        { error: "找不到用戶", clearSession: true },
        { status: 404 }
      );
    }

    // 检查用户是否被锁定
    if (user.isLock) {
      return NextResponse.json(
        { error: "帳號已被鎖定", clearSession: true },
        { status: 403 }
      );
    }

    return NextResponse.json({
      userId: user.userId,
      googleId: user.googleId,
      name: user.name,
      email: user.email,
      image: user.image,
      dataType: user.dataType,
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    
    // 只有在確認是資料庫連接錯誤且無法恢復時，才標記需要清除 session
    const isDatabaseError = 
      error.message?.includes("database") || 
      error.message?.includes("connection") || 
      error.message?.includes("MongoDB") ||
      error.message?.includes("invalid") ||
      error.code === "P1001" ||
      error.code === "P1002";

    // 資料庫連接錯誤不應該清除 session（可能是暫時的連接問題）
    // 只有在確認用戶真的不存在時才清除 session
    return NextResponse.json(
      { 
        error: isDatabaseError ? "資料庫連接錯誤，請稍後再試" : "伺服器錯誤",
        clearSession: false // 不立即清除 session，給資料庫一些時間
      },
      { status: isDatabaseError ? 503 : 500 }
    );
  }
}

