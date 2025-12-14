import * as dotenv from "dotenv";
import * as path from "path";

// 明確指定 .env 文件路徑
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * 測試優惠券生成 API
 * 
 * 使用方法：
 * 1. 確保開發伺服器正在運行 (npm run dev)
 * 2. 先登入並獲取 session cookie
 * 3. 運行此腳本: npm run test:coupon-generate
 * 
 * 注意：此腳本需要手動設置 session cookie，建議使用瀏覽器開發者工具獲取
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

interface TestCase {
  name: string;
  data: any;
  description: string;
}

const testCases: TestCase[] = [
  {
    name: "滿額折扣優惠券",
    description: "測試滿額折扣類型的優惠券",
    data: {
      supplierId: "YOUR_SUPPLIER_ID", // 需要替換為實際的 supplierId
      shopName: "Awesome Coffee",
      couponName: "滿 300 折 50",
      description: "僅限內用，不與其他優惠併用",
      imageUrl: "https://example.com/coffee.jpg",
      discountType: "threshold_amount_off",
      minimumOrderAmount: 300,
      discountAmount: 50,
      discountPercentage: null,
      startDate: "2025-01-01",
      endDate: "2025-03-31",
      totalQuantity: 100,
      perUserLimit: 1,
      perDayLimit: 10,
      requiredPoints: 500,
      internalCode: "COFFEE2025",
      branch: "台北信義店",
      status: "active",
    },
  },
  {
    name: "固定金額折扣",
    description: "測試固定金額折扣類型的優惠券",
    data: {
      supplierId: "YOUR_SUPPLIER_ID",
      shopName: "Sweet Bakery",
      couponName: "折 20 元",
      description: "適用於所有商品",
      discountType: "amount_off",
      discountAmount: 20,
      startDate: "2025-02-01",
      endDate: "2025-04-30",
      totalQuantity: 200,
      perUserLimit: 2,
      requiredPoints: 300,
      status: "active",
    },
  },
  {
    name: "百分比折扣",
    description: "測試百分比折扣類型的優惠券",
    data: {
      supplierId: "YOUR_SUPPLIER_ID",
      shopName: "Fashion Store",
      couponName: "全單 9 折",
      description: "不適用於特價商品",
      discountType: "percentage",
      discountPercentage: 90, // 90% = 9 折
      startDate: "2025-01-15",
      endDate: "2025-05-15",
      totalQuantity: 500,
      perUserLimit: 1,
      perDayLimit: null, // 無每日限制
      requiredPoints: 800,
      status: "draft",
    },
  },
];

async function testCouponGenerate(testCase: TestCase, sessionCookie?: string) {
  console.log(`\n🧪 測試: ${testCase.name}`);
  console.log(`   描述: ${testCase.description}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }

    const response = await fetch(`${BASE_URL}/api/supplier/coupons/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify(testCase.data),
    });

    const responseText = await response.text();
    let result: any;

    try {
      result = JSON.parse(responseText);
    } catch {
      console.log(`❌ 響應不是有效的 JSON`);
      console.log(`   狀態碼: ${response.status}`);
      console.log(`   響應內容: ${responseText.substring(0, 200)}`);
      return;
    }

    if (!response.ok) {
      console.log(`❌ 請求失敗`);
      console.log(`   狀態碼: ${response.status}`);
      console.log(`   錯誤訊息: ${result.error || "未知錯誤"}`);
      if (result.details) {
        console.log(`   詳細資訊: ${result.details}`);
      }
      return;
    }

    console.log("✅ 請求成功！");
    console.log("\n📦 返回的優惠券數據:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Coupon ID: ${result.couponData.couponId}`);
    console.log(`優惠券名稱: ${result.couponData.name}`);
    console.log(`店家名稱: ${result.couponData.shopName}`);
    console.log(`折扣類型: ${result.couponData.discountType}`);
    console.log(`兌換 URL: ${result.couponData.redemptionUrl}`);
    console.log(`QR Code: ${result.couponData.qrCodeContent}`);
    console.log(`Barcode: ${result.couponData.barcodeContent}`);
    console.log(`所需點數: ${result.couponData.requiredPoints}`);
    console.log("\n📱 供應商預覽:");
    console.log(`   標題: ${result.supplierPreview.title}`);
    console.log(`   副標題: ${result.supplierPreview.subtitle}`);
    console.log(`   主要說明: ${result.supplierPreview.mainText}`);
    console.log(`   有效期間: ${result.supplierPreview.validityText}`);
    console.log(`   點數需求: ${result.supplierPreview.pointsText}`);
    console.log("\n👨‍🎓 學生視圖:");
    console.log(`   標題: ${result.studentView.title}`);
    console.log(`   簡短描述: ${result.studentView.shortDescription}`);
    console.log(`   折扣摘要: ${result.studentView.discountSummary}`);
    console.log(`   使用規則: ${result.studentView.usageRules}`);
    console.log(`   兌換條件: ${result.studentView.canRedeemCondition}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error: any) {
    console.log(`❌ 測試失敗: ${error.message}`);
    if (error.stack) {
      console.log(`   堆疊追蹤: ${error.stack}`);
    }
  }
}

async function main() {
  console.log("\n🚀 優惠券生成 API 測試");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`測試 URL: ${BASE_URL}/api/supplier/coupons/generate`);
  console.log("\n⚠️  注意：此測試需要有效的 session cookie");
  console.log("   請先登入系統，然後從瀏覽器開發者工具獲取 session cookie");
  console.log("   或使用前端測試頁面進行測試\n");

  // 從環境變數或命令行參數獲取 session cookie
  const sessionCookie = process.env.SESSION_COOKIE || process.argv[2];

  if (!sessionCookie) {
    console.log("❌ 未提供 session cookie");
    console.log("   請設置環境變數 SESSION_COOKIE 或作為命令行參數提供");
    console.log("   例如: SESSION_COOKIE='next-auth.session-token=xxx' npm run test:coupon-generate");
    console.log("\n💡 建議：使用前端測試頁面進行測試會更方便\n");
    return;
  }

  // 檢查是否有需要替換的 supplierId
  const needsSupplierId = testCases.some(
    (tc) => tc.data.supplierId === "YOUR_SUPPLIER_ID"
  );

  if (needsSupplierId) {
    console.log("⚠️  警告：測試數據中的 supplierId 需要替換為實際值");
    console.log("   請編輯此腳本並替換 YOUR_SUPPLIER_ID\n");
  }

  // 運行測試
  for (const testCase of testCases) {
    // 跳過需要替換 supplierId 的測試
    if (testCase.data.supplierId === "YOUR_SUPPLIER_ID") {
      console.log(`\n⏭️  跳過測試: ${testCase.name} (需要設置 supplierId)`);
      continue;
    }

    await testCouponGenerate(testCase, sessionCookie);
    // 等待一下避免請求過快
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n✅ 所有測試完成！\n");
}

main();


