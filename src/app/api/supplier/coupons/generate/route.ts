import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateCouponId } from "@/lib/utils";

// 輸入類型定義
interface CouponFormInput {
  supplierId: string;
  shopName: string;
  couponName: string;
  description: string;
  imageUrl?: string | null;
  picture?: string | null; // Also accept "picture" field name
  discountType: "threshold_amount_off" | "amount_off" | "percentage";
  minimumOrderAmount?: number | null;
  discountAmount?: number | null;
  discountPercentage?: number | null;
  startDate: string;
  endDate: string;
  totalQuantity?: number | null;
  perUserLimit?: number | null;
  perDayLimit?: number | null;
  internalCode?: string | null;
  branch?: string | null;
  status?: "draft" | "active" | "disabled";
}

// 規範化後的優惠券數據類型
interface CouponData {
  couponId: string;
  supplierId: string;
  shopName: string;
  name: string;
  description: string;
  imageUrl: string | null;
  discountType: "threshold_amount_off" | "amount_off" | "percentage";
  minimumOrderAmount: number | null;
  discountAmount: number | null;
  discountPercentage: number | null;
  startDate: string;
  endDate: string;
  totalQuantity: number;
  perUserLimit: number;
  perDayLimit: number | null;
  internalCode: string | null;
  branch: string | null;
  status: "draft" | "active" | "disabled";
}

interface SupplierPreview {
  title: string;
  subtitle: string;
  mainText: string;
  validityText: string;
  pointsText: string;
}

interface StudentView {
  title: string;
  shortDescription: string;
  shopName: string;
  branch: string | null;
  rewardCost: number;
  validityText: string;
  discountSummary: string;
  usageRules: string;
  canRedeemCondition: string;
}

interface GenerateCouponResponse {
  couponData: CouponData;
  supplierPreview: SupplierPreview;
  studentView: StudentView;
}

/**
 * 生成唯一的 couponId（檢查數據庫唯一性）
 */
async function generateUniqueCouponId(couponName: string): Promise<string> {
  let couponId: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // 每次嘗試都生成新的 ID，如果已嘗試多次，添加額外的隨機後綴
    const baseId = generateCouponId(couponName);
    const extraSuffix = attempts > 0 ? generateCouponId("").substring(0, 4) : "";
    couponId = baseId + extraSuffix;
    
    // 確保 couponId 長度至少為 8
    if (couponId.length < 8) {
      const additionalSuffix = generateCouponId("").substring(0, 8 - couponId.length);
      couponId = couponId + additionalSuffix;
    }
    
    // 檢查數據庫中是否已存在
    const existing = await prisma.coupon.findUnique({
      where: { couponId },
    });
    
    if (!existing) {
      isUnique = true;
    } else {
      attempts++;
    }
  }

  if (!isUnique) {
    throw new Error("無法生成唯一的優惠券ID，請稍後再試");
  }

  return couponId!;
}

/**
 * 驗證和規範化輸入數據
 */
async function normalizeCouponInput(input: CouponFormInput): Promise<CouponData> {
  // 驗證日期
  let startDate = input.startDate;
  let endDate = input.endDate;
  
  if (new Date(endDate) < new Date(startDate)) {
    // 如果結束日期早於開始日期，交換它們
    [startDate, endDate] = [endDate, startDate];
  }

  // 確保日期格式為 YYYY-MM-DD
  startDate = new Date(startDate).toISOString().split("T")[0];
  endDate = new Date(endDate).toISOString().split("T")[0];

  // 生成唯一的 couponId
  const couponId = await generateUniqueCouponId(input.couponName);

  // 規範化折扣類型相關字段
  let minimumOrderAmount: number | null = null;
  let discountAmount: number | null = null;
  let discountPercentage: number | null = null;

  if (input.discountType === "threshold_amount_off") {
    minimumOrderAmount = Math.max(0, input.minimumOrderAmount || 0);
    discountAmount = Math.max(0, input.discountAmount || 0);
  } else if (input.discountType === "amount_off") {
    discountAmount = Math.max(0, input.discountAmount || 0);
  } else if (input.discountType === "percentage") {
    discountPercentage = Math.max(0, Math.min(100, input.discountPercentage || 0));
  }

  // 規範化數量限制
  const totalQuantity = Math.max(1, input.totalQuantity || 100);
  const perUserLimit = Math.max(1, input.perUserLimit || 1);
  const perDayLimit = input.perDayLimit !== null && input.perDayLimit !== undefined 
    ? Math.max(1, input.perDayLimit) 
    : null;


  return {
    couponId,
    supplierId: input.supplierId,
    shopName: input.shopName,
    name: input.couponName,
    description: input.description || "",
    imageUrl: (input.imageUrl && input.imageUrl.trim()) 
      ? input.imageUrl.trim() 
      : (input.picture && input.picture.trim()) 
        ? input.picture.trim() 
        : null, // 處理空字串
    discountType: input.discountType,
    minimumOrderAmount,
    discountAmount,
    discountPercentage,
    startDate,
    endDate,
    totalQuantity,
    perUserLimit,
    perDayLimit,
    internalCode: input.internalCode || null,
    branch: input.branch || null,
    status: input.status || "draft",
  };
}

/**
 * 生成折扣摘要文字
 */
function generateDiscountSummary(couponData: CouponData): string {
  if (couponData.discountType === "threshold_amount_off") {
    return `滿 ${couponData.minimumOrderAmount} 元折 ${couponData.discountAmount} 元`;
  } else if (couponData.discountType === "amount_off") {
    return `折 ${couponData.discountAmount} 元`;
  } else if (couponData.discountType === "percentage") {
    // 將百分比轉換為「折」的顯示方式（例如 90% -> 9 折）
    const discountValue = couponData.discountPercentage!;
    // 如果 discountPercentage 是 0-100 的整數，除以 10 得到「折」數
    // 例如：90 -> 9 折，85 -> 8.5 折
    const zheValue = discountValue / 10;
    if (zheValue % 1 === 0) {
      return `全單 ${zheValue} 折`;
    } else {
      return `全單 ${zheValue.toFixed(1)} 折`;
    }
  }
  return "";
}

/**
 * 生成供應商預覽
 */
function generateSupplierPreview(couponData: CouponData): SupplierPreview {
  const discountSummary = generateDiscountSummary(couponData);
  
  // 生成主要文字說明
  let mainText = discountSummary;
  if (couponData.description) {
    mainText += `，${couponData.description}`;
  }
  if (couponData.perUserLimit > 0) {
    mainText += `，每人限用 ${couponData.perUserLimit} 次`;
  }
  if (couponData.perDayLimit !== null) {
    mainText += `，每日限用 ${couponData.perDayLimit} 次`;
  }

  // 有效期間文字
  const validityText = `有效期間：${couponData.startDate} 至 ${couponData.endDate}`;

  // 點數需求文字（已移除，現在使用抽獎系統）
  const pointsText = `抽獎獲得：每次抽獎花費 15 點`;

  return {
    title: couponData.name,
    subtitle: couponData.branch ? `${couponData.shopName} - ${couponData.branch}` : couponData.shopName,
    mainText,
    validityText,
    pointsText,
  };
}

/**
 * 生成學生視圖
 */
function generateStudentView(couponData: CouponData): StudentView {
  const discountSummary = generateDiscountSummary(couponData);

  // 生成使用規則
  const rules: string[] = [];
  if (couponData.perUserLimit > 0) {
    rules.push(`每人限用 ${couponData.perUserLimit} 次`);
  }
  if (couponData.description) {
    // 從描述中提取關鍵規則
    if (couponData.description.includes("不與其他優惠併用")) {
      rules.push("不與其他優惠併用");
    }
    if (couponData.description.includes("內用") || couponData.description.includes("外帶")) {
      const usageType = couponData.description.includes("內用") ? "內用" : "外帶";
      rules.push(`限${usageType}`);
    }
  }
  // QR code 相關規則已移除
  
  const usageRules = rules.join("，");

  // 有效期間文字
  const validityText = `有效期間：${couponData.startDate} 至 ${couponData.endDate}`;

  // 兌換條件說明（已移除，現在使用抽獎系統）
  const canRedeemCondition = `使用 15 點進行抽獎，即有機會獲得此優惠券。`;

  return {
    title: couponData.name,
    shortDescription: couponData.description || discountSummary,
    shopName: couponData.shopName,
    branch: couponData.branch,
    rewardCost: 15, // 固定抽獎成本
    validityText,
    discountSummary,
    usageRules,
    canRedeemCondition,
  };
}

/**
 * POST - 生成優惠券
 */
export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "無權限，僅供應商可使用此功能" }, { status: 403 });
    }

    const body = await request.json() as CouponFormInput;

    // 驗證必要字段
    if (!body.supplierId || !body.shopName || !body.couponName || !body.discountType || !body.startDate || !body.endDate) {
      return NextResponse.json({ 
        error: "缺少必要字段：supplierId, shopName, couponName, discountType, startDate, endDate" 
      }, { status: 400 });
    }

    // 驗證 supplierId 是否與當前用戶匹配
    if (body.supplierId !== session.userId) {
      return NextResponse.json({ error: "supplierId 與當前登入用戶不匹配" }, { status: 403 });
    }

    // 規範化數據
    const couponData = await normalizeCouponInput(body);

    // 儲存優惠券到數據庫
    // Extract weight and maxIssuance from couponData if provided
    // Default weight is 1, maxIssuance can be derived from totalQuantity
    const weight = couponData.weight || 1;
    const maxIssuance = couponData.totalQuantity !== null && couponData.totalQuantity !== undefined
      ? couponData.totalQuantity
      : null;

    const savedCoupon = await prisma.coupon.create({
      data: {
        couponId: couponData.couponId,
        name: couponData.name,
        period: new Date(couponData.endDate),
        link: null,
        text: JSON.stringify({
          description: couponData.description,
          shopName: couponData.shopName,
          branch: couponData.branch,
          discountType: couponData.discountType,
          minimumOrderAmount: couponData.minimumOrderAmount,
          discountAmount: couponData.discountAmount,
          discountPercentage: couponData.discountPercentage,
          totalQuantity: couponData.totalQuantity,
          perUserLimit: couponData.perUserLimit,
          perDayLimit: couponData.perDayLimit,
          internalCode: couponData.internalCode,
          status: couponData.status || "active", // Default to "active" if not specified
          supplierId: couponData.supplierId,
          startDate: couponData.startDate,
          endDate: couponData.endDate,
        }),
        picture: couponData.imageUrl || null, // 確保空值時設為 null
        weight: 1, // Default weight is 1 (can be customized by admin later)
        maxIssuance: couponData.totalQuantity !== null && couponData.totalQuantity !== undefined
          ? couponData.totalQuantity
          : null, // Use totalQuantity as maxIssuance
        issuedCount: 0, // Initialize to 0
      },
    });

    // 更新供應商的優惠券列表
    const supplier = await prisma.supplier.findUnique({
      where: { userId: session.userId },
    });

    if (supplier) {
      const updatedCouponIds = [...(supplier.lsuppcoIDs || []), couponData.couponId];
      await prisma.supplier.update({
        where: { userId: session.userId },
        data: {
          lsuppcoIDs: updatedCouponIds,
        },
      });
    }

    // 生成預覽和學生視圖
    const supplierPreview = generateSupplierPreview(couponData);
    const studentView = generateStudentView(couponData);

    // 構建響應
    const response: GenerateCouponResponse = {
      couponData,
      supplierPreview,
      studentView,
    };

    // 返回 JSON（不包裝在 Markdown 中）
    return NextResponse.json(response, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error generating coupon:", error);
    return NextResponse.json({ 
      error: "伺服器錯誤",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    }, { status: 500 });
  }
}

