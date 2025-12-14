import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// 輸入類型定義
interface ShopInfoInput {
  supplierId: string;
  shopName: string;
  branchName?: string | null;
  address?: string | null;
  shopType: string;
  shopTypeLabel?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  notes?: string | null;
  branches?: Array<{
    branchName: string;
    address?: string | null;
  }> | null;
}

// 規範化後的店鋪資訊類型
interface ShopProfile {
  supplierId: string;
  shopName: string;
  primaryBranchName: string | null;
  primaryAddress: string | null;
  shopType: string;
  shopTypeLabel: string;
  phoneNumber: string | null;
  website: string | null;
  notes: string | null;
  branches: Array<{
    branchName: string;
    address: string | null;
  }>;
  updatedAt: string;
}

interface BranchOption {
  value: string;
  label: string;
}

interface CouponFormDefaults {
  defaultShopName: string;
  defaultBranchName: string | null;
  defaultAddress: string | null;
  branchOptions: BranchOption[];
  shopType: string;
  shopTypeLabel: string;
  hintText: string;
}

interface NavigationMeta {
  shopInfoPagePath: string;
  newCouponPagePath: string;
  couponManagementPagePath: string;
  description: string;
}

interface ShopProfileResponse {
  shopProfile: ShopProfile;
  couponFormDefaults: CouponFormDefaults;
  navigationMeta: NavigationMeta;
}

// 店鋪類型枚舉
const SHOP_TYPES = [
  "coffee_shop",
  "restaurant",
  "dessert",
  "bar",
  "retail",
  "service",
  "other",
] as const;

// 店鋪類型標籤映射
const SHOP_TYPE_LABELS: Record<string, string> = {
  coffee_shop: "咖啡廳",
  restaurant: "餐廳",
  dessert: "甜點店",
  bar: "酒吧",
  retail: "零售店",
  service: "服務業",
  other: "其他",
};

/**
 * 規範化店鋪類型
 */
function normalizeShopType(shopType: string): string {
  const normalized = shopType.toLowerCase().trim();
  if (SHOP_TYPES.includes(normalized as any)) {
    return normalized;
  }
  return "other";
}

/**
 * 獲取店鋪類型標籤
 */
function getShopTypeLabel(shopType: string, providedLabel?: string | null): string {
  if (providedLabel && providedLabel.trim()) {
    return providedLabel.trim();
  }
  return SHOP_TYPE_LABELS[shopType] || "其他";
}

/**
 * 規範化字符串（去除首尾空格）
 */
function normalizeString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 生成 ISO 時間戳
 */
function generateISOTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

/**
 * 驗證和規範化店鋪資訊
 */
function normalizeShopInfo(input: ShopInfoInput): ShopProfile {
  // 規範化基本字段
  const shopName = normalizeString(input.shopName);
  if (!shopName) {
    throw new Error("shopName 是必填字段");
  }

  const shopType = normalizeShopType(input.shopType);
  const shopTypeLabel = getShopTypeLabel(shopType, input.shopTypeLabel);

  // 處理分店列表
  let branches: Array<{ branchName: string; address: string | null }> = [];

  if (input.branches && input.branches.length > 0) {
    // 使用提供的分店列表
    branches = input.branches
      .filter((b) => b.branchName && b.branchName.trim())
      .map((b) => ({
        branchName: b.branchName.trim(),
        address: normalizeString(b.address),
      }));
  } else {
    // 從單一分店信息構建分店列表
    const branchName = normalizeString(input.branchName);
    const address = normalizeString(input.address);

    if (branchName || address) {
      branches = [
        {
          branchName: branchName || shopName,
          address: address,
        },
      ];
    } else {
      // 如果沒有分店信息，創建一個默認分店
      branches = [
        {
          branchName: shopName,
          address: null,
        },
      ];
    }
  }

  // 確定主要分店（第一個有意義的分店）
  const primaryBranch = branches.length > 0 ? branches[0] : null;
  const primaryBranchName = primaryBranch?.branchName || null;
  const primaryAddress = primaryBranch?.address || null;

  return {
    supplierId: input.supplierId,
    shopName,
    primaryBranchName,
    primaryAddress,
    shopType,
    shopTypeLabel,
    phoneNumber: normalizeString(input.phoneNumber),
    website: normalizeString(input.website),
    notes: normalizeString(input.notes),
    branches,
    updatedAt: generateISOTimestamp(),
  };
}

/**
 * 生成優惠券表單默認值
 */
function generateCouponFormDefaults(shopProfile: ShopProfile): CouponFormDefaults {
  // 構建分店選項
  const branchOptions: BranchOption[] = shopProfile.branches.map((branch) => {
    const label = branch.address
      ? `${branch.branchName}（${branch.address}）`
      : branch.branchName;
    return {
      value: branch.branchName,
      label,
    };
  });

  return {
    defaultShopName: shopProfile.shopName,
    defaultBranchName: shopProfile.primaryBranchName,
    defaultAddress: shopProfile.primaryAddress,
    branchOptions,
    shopType: shopProfile.shopType,
    shopTypeLabel: shopProfile.shopTypeLabel,
    hintText: "此店鋪資訊會顯示在學生看到的優惠券上。",
  };
}

/**
 * 生成導航元數據
 */
function generateNavigationMeta(): NavigationMeta {
  return {
    shopInfoPagePath: "/supplier/store",
    newCouponPagePath: "/supplier/coupon",
    couponManagementPagePath: "/supplier/coupon",
    description:
      "店鋪資訊會作為優惠券的店家來源，優惠券建立後會出現在『優惠券管理』頁面。",
  };
}

/**
 * POST - 保存或更新店鋪資訊
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
      return NextResponse.json(
        { error: "無權限，僅供應商可使用此功能" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ShopInfoInput;

    // 驗證必要字段
    if (!body.supplierId || !body.shopName || !body.shopType) {
      return NextResponse.json(
        {
          error: "缺少必要字段：supplierId, shopName, shopType",
        },
        { status: 400 }
      );
    }

    // 驗證 supplierId 是否與當前用戶匹配
    if (body.supplierId !== session.userId) {
      return NextResponse.json(
        { error: "supplierId 與當前登入用戶不匹配" },
        { status: 403 }
      );
    }

    // 規範化店鋪資訊
    const shopProfile = normalizeShopInfo(body);

    // 確保 Supplier 記錄存在
    let supplierRecord = user.supplierData;
    if (!supplierRecord) {
      supplierRecord = await prisma.supplier.create({
        data: {
          userId: session.userId,
          lsuppcoIDs: [],
          payments: null,
        },
      });
    }

    // 刪除現有的 stores
    await prisma.store.deleteMany({
      where: { supplierId: supplierRecord.id },
    });

    // 創建新的 stores
    const createdStores = await Promise.all(
      shopProfile.branches.map((branch) =>
        prisma.store.create({
          data: {
            supplierId: supplierRecord.id,
            name: branch.branchName,
            location: branch.address,
            website: shopProfile.website, // 將網站存儲在每個分店中
          },
        })
      )
    );

    // 將額外資訊（phoneNumber, notes, shopType, shopTypeLabel）存儲在 Supplier.payments 字段中
    const supplierMetadata = {
      phoneNumber: shopProfile.phoneNumber,
      notes: shopProfile.notes,
      shopType: shopProfile.shopType,
      shopTypeLabel: shopProfile.shopTypeLabel,
      shopName: shopProfile.shopName, // 也存儲 shopName 以便讀取
    };

    // 更新 Supplier 記錄
    await prisma.supplier.update({
      where: { id: supplierRecord.id },
      data: {
        payments: JSON.stringify(supplierMetadata),
      },
    });

    // 生成優惠券表單默認值
    const couponFormDefaults = generateCouponFormDefaults(shopProfile);

    // 生成導航元數據
    const navigationMeta = generateNavigationMeta();

    // 構建響應
    const response: ShopProfileResponse = {
      shopProfile,
      couponFormDefaults,
      navigationMeta,
    };

    // 返回 JSON（不包裝在 Markdown 中）
    return NextResponse.json(response, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error processing shop profile:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - 獲取當前供應商的店鋪資訊
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 檢查是否為供應商
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      include: {
        supplierData: {
          include: {
            stores: true,
          },
        },
      },
    });

    if (!user || user.dataType !== "Supplier" || !user.supplierData) {
      return NextResponse.json(
        { error: "無權限，僅供應商可使用此功能" },
        { status: 403 }
      );
    }

    // 從數據庫獲取店鋪資訊
    const stores = user.supplierData.stores || [];

    // 從 Supplier.payments 字段讀取額外資訊
    let supplierMetadata: {
      phoneNumber?: string | null;
      notes?: string | null;
      shopType?: string;
      shopTypeLabel?: string;
      shopName?: string;
    } = {};
    try {
      if (user.supplierData.payments) {
        supplierMetadata = JSON.parse(user.supplierData.payments);
      }
    } catch (e) {
      console.error("Error parsing supplier payments metadata:", e);
    }

    // 如果沒有店鋪資訊，返回空結構
    if (stores.length === 0) {
      const emptyShopProfile: ShopProfile = {
        supplierId: session.userId,
        shopName: supplierMetadata.shopName || "",
        primaryBranchName: null,
        primaryAddress: null,
        shopType: supplierMetadata.shopType || "other",
        shopTypeLabel: supplierMetadata.shopTypeLabel || "其他",
        phoneNumber: supplierMetadata.phoneNumber || null,
        website: null,
        notes: supplierMetadata.notes || null,
        branches: [],
        updatedAt: generateISOTimestamp(),
      };

      return NextResponse.json({
        shopProfile: emptyShopProfile,
        couponFormDefaults: generateCouponFormDefaults(emptyShopProfile),
        navigationMeta: generateNavigationMeta(),
      });
    }

    // 從 Store 模型構建 shopProfile
    // 注意：Store 模型的結構與 shopProfile 不完全一致，需要轉換
    // 這裡假設第一個 store 是主要店鋪
    const primaryStore = stores[0];
    const shopProfile: ShopProfile = {
      supplierId: session.userId,
      shopName: supplierMetadata.shopName || primaryStore.name || "",
      primaryBranchName: primaryStore.name || null,
      primaryAddress: normalizeString(primaryStore.location),
      shopType: supplierMetadata.shopType || "other",
      shopTypeLabel: supplierMetadata.shopTypeLabel || "其他",
      phoneNumber: supplierMetadata.phoneNumber || null,
      website: normalizeString(primaryStore.website),
      notes: supplierMetadata.notes || null,
      branches: stores.map((store: typeof stores[0]) => ({
        branchName: store.name,
        address: normalizeString(store.location),
      })),
      updatedAt: primaryStore.updatedAt.toISOString(),
    };

    const response: ShopProfileResponse = {
      shopProfile,
      couponFormDefaults: generateCouponFormDefaults(shopProfile),
      navigationMeta: generateNavigationMeta(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error fetching shop profile:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

