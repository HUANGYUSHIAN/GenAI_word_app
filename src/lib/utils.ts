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

