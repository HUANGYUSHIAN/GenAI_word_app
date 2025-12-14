/**
 * 生成指定长度的随机ID（英文+数字）
 * @param length ID长度
 * @returns 随机生成的ID
 */
export function generateUserId(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成優惠券ID（基於優惠券名稱生成slug + 隨機後綴）
 * @param couponName 優惠券名稱
 * @returns 優惠券ID（小寫，無空格）
 */
export function generateCouponId(couponName: string): string {
  // 將中文和特殊字符轉換為拼音或移除，保留英文數字
  // 簡化處理：移除所有非英文數字字符，轉為小寫
  let slug = couponName
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]/g, "") // 保留英文、數字、中文
    .replace(/[\u4e00-\u9fa5]/g, "") // 移除中文（簡化處理）
    .replace(/\s+/g, "") // 移除所有空格
    .substring(0, 20); // 限制長度
  
  // 如果 slug 為空（例如全是中文），使用 "coupon" 作為前綴
  if (!slug || slug.length === 0) {
    slug = "coupon";
  }
  
  // 生成4位隨機後綴
  const suffix = generateUserId(4).toLowerCase();
  
  return `${slug}${suffix}`;
}

