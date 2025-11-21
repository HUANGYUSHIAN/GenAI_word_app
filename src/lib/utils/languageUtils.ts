/**
 * 語言工具函數
 * 統一管理語言：系統標準使用 Web Speech API 格式，UI 顯示使用英文名稱
 */

/**
 * 系統支持的語言列表（Web Speech API 格式）
 * 這是系統內部統一使用的語言表示方式
 */
export const SUPPORTED_LANGUAGES = ['zh-TW', 'ja-JP', 'ko-KR', 'en-US'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

/**
 * Web Speech API 代碼到英文名稱的映射（用於 UI 顯示）
 */
const SPEECH_CODE_TO_ENGLISH: Record<SupportedLanguage, string> = {
  'zh-TW': 'Traditional Chinese',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'en-US': 'English',
}

/**
 * 英文名稱到 Web Speech API 代碼的映射（用於兼容舊數據）
 */
const ENGLISH_TO_SPEECH_CODE: Record<string, SupportedLanguage> = {
  'Traditional Chinese': 'zh-TW',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'English': 'en-US',
}

/**
 * 獲取語言的英文顯示名稱
 * @param langCode - Web Speech API 語言代碼
 * @returns 英文名稱，如果無法識別則返回原始值
 */
export function getLanguageLabel(langCode: string): string {
  if (langCode in SPEECH_CODE_TO_ENGLISH) {
    return SPEECH_CODE_TO_ENGLISH[langCode as SupportedLanguage]
  }
  
  // 如果是英文名稱，直接返回
  if (langCode in ENGLISH_TO_SPEECH_CODE) {
    return langCode
  }
  
  // 無法識別，返回原始值
  return langCode
}

/**
 * 標準化語言代碼（將英文名稱轉換為 Web Speech API 格式）
 * @param lang - 語言名稱或代碼（支持 Web Speech API 格式或英文名稱）
 * @returns 標準化的 Web Speech API 語言代碼，如果無法識別則返回 'en-US'
 */
export function normalizeLanguage(lang: string): SupportedLanguage {
  // 如果已經是 Web Speech API 格式，直接返回
  if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage
  }
  
  // 如果是英文名稱，轉換為 Web Speech API 格式
  if (lang in ENGLISH_TO_SPEECH_CODE) {
    return ENGLISH_TO_SPEECH_CODE[lang]
  }
  
  // 無法識別，返回默認值
  console.warn(`無法識別的語言: ${lang}，使用默認值 en-US`)
  return 'en-US'
}

