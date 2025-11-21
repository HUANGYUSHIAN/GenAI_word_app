/**
 * 語音播放工具函數
 * 使用 Web Speech API 進行語音合成
 */

/**
 * 異步語音播放函數
 * @param language - 語言代碼 (例如: 'zh-TW', 'en-US', 'ja-JP')
 * @param text - 要播放的文字內容
 * @param rate - 播放速度 (預設為 1.0)
 * @returns Promise<void> - 語音播放結束後 resolve
 */
export function speakAsync(
  language: string,
  text: string,
  rate: number = 1.0
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      reject(new Error('瀏覽器不支援語音播放'))
      return
    }

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = language
    utter.rate = rate

    utter.onend = () => {
      resolve()
    }

    utter.onerror = (e) => {
      console.error('Speech synthesis error:', e)
      reject(new Error(`語音播放錯誤: ${(e as any).error}`))
    }

    try {
      window.speechSynthesis.speak(utter)
    } catch (error) {
      reject(error)
    }
  })
}

