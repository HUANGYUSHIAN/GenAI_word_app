import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ALLOWED_LANGUAGES = ["Japanese", "Traditional Chinese", "English"] as const;
const ALLOWED_LEVELS = ["初級", "中級", "高級"] as const;
const TARGET_COUNT = 30;
const MIN_ACCEPTABLE = 25;
const MAX_ATTEMPTS = 3;

type AllowedLang = (typeof ALLOWED_LANGUAGES)[number];
type AllowedLevel = (typeof ALLOWED_LEVELS)[number];

interface GeneratedWord {
  word: string;
  spelling: string | null;
  explanation: string;
  partOfSpeech: string | null;
  sentence: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      langUse,
      langExp,
      topic,
      level = "初級",
    }: {
      name: string;
      langUse: AllowedLang;
      langExp: AllowedLang;
      topic: string;
      level?: AllowedLevel;
    } = body;

    if (!name || !langUse || !langExp || !topic) {
      return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
    }

    if (!ALLOWED_LANGUAGES.includes(langUse) || !ALLOWED_LANGUAGES.includes(langExp)) {
      return NextResponse.json({ error: "僅支援日文、繁體中文、英文" }, { status: 400 });
    }

    if (!ALLOWED_LEVELS.includes(level)) {
      return NextResponse.json({ error: "程度僅能為 初級 / 中級 / 高級" }, { status: 400 });
    }

    // 迭代生成，確保至少 25 個單字，最多嘗試 3 次
    let collected: GeneratedWord[] = [];
    let attempt = 0;

    while (
      attempt < MAX_ATTEMPTS &&
      (collected.length < MIN_ACCEPTABLE || !hasPosMinimum(collected, attempt >= 2))
    ) {
      const needed = Math.max(TARGET_COUNT - collected.length, 10);
      const prompt = buildPrompt({
        topic,
        langUse,
        langExp,
        level,
        count: needed,
        existingWords: collected.map((w) => w.word),
        relaxPos: attempt >= 2,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是一個嚴謹的語言學習助手，請只輸出有效 JSON，並嚴格遵守使用者的格式與語言要求。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      const words = safeParseWords(responseText);
      const filtered = filterAndNormalize(words, langUse, langExp);
      collected = mergeUnique(collected, filtered);

      attempt += 1;
    }

    if (collected.length < MIN_ACCEPTABLE) {
      return NextResponse.json(
        { error: `生成單字不足 ${MIN_ACCEPTABLE} 個，請再試一次` },
        { status: 500 }
      );
    }

    // 創建單字本
    const vocabularyId = `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const vocabulary = await prisma.vocabulary.create({
      data: {
        vocabularyId,
        name,
        langUse,
        langExp,
        copyrights: "由 AI 生成",
        establisher: session.userId,
      },
    });

    // 創建單字
    const wordData = collected.map((word) => ({
      vocabularyId: vocabulary.id,
      word: word.word,
      spelling: word.spelling,
      explanation: word.explanation,
      partOfSpeech: word.partOfSpeech,
      sentence: word.sentence,
    }));

    await prisma.word.createMany({ data: wordData });

    const wordCount = await prisma.word.count({
      where: { vocabularyId: vocabulary.id },
    });

    // 將單字本加入學生列表
    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
    });

    if (student) {
      await prisma.student.update({
        where: { userId: session.userId },
        data: { lvocabuIDs: { push: vocabulary.vocabularyId } },
      });
    } else {
      await prisma.student.create({
        data: { userId: session.userId, lvocabuIDs: [vocabulary.vocabularyId] },
      });
    }

    return NextResponse.json({
      success: true,
      vocabulary: {
        vocabularyId: vocabulary.vocabularyId,
        name: vocabulary.name,
        wordCount,
      },
    });
  } catch (error: any) {
    console.error("Error generating vocabulary:", error);
    return NextResponse.json(
      { error: error.message || "生成單字本失敗" },
      { status: 500 }
    );
  }
}

function buildPrompt({
  topic,
  langUse,
  langExp,
  level,
  count,
  existingWords,
  relaxPos,
}: {
  topic: string;
  langUse: AllowedLang;
  langExp: AllowedLang;
  level: AllowedLevel;
  count: number;
  existingWords: string[];
  relaxPos: boolean;
}) {
  const langUseLabel = getLanguageName(langUse);
  const langExpLabel = getLanguageName(langExp);
  const difficultyHint =
    level === "初級"
      ? "使用常見、基礎詞彙"
      : level === "中級"
      ? "使用中階詞彙，包含較長或抽象概念"
      : "使用進階、少見或專業詞彙，詞彙難度明顯高於初級與中級";

  const existingList =
    existingWords.length > 0 ? `避免與以下單字重複：${existingWords.join("、")}` : "不得重複先前已產生的單字";

  const posRequirement = relaxPos
    ? "詞性最低數量要求已放寬（若可行仍盡量包含動詞/形容詞/名詞）。"
    : "必須至少包含 5 個動詞、5 個形容詞、5 個名詞。";

  const spellingRule =
    langUse === "Japanese"
      ? `Word.spelling 規則（日文）：\n` +
        `  - 如果 Word.word 包含漢字，spelling 必須是該單字的平假名讀音（例如：刺身 -> さしみ）。\n` +
        `  - 如果 Word.word 是純平假名（無漢字、無片假名），spelling 必須與 word 相同（例如：おすすめ -> おすすめ，不能是 null）。\n` +
        `  - 如果 Word.word 是純片假名（無漢字、無平假名），spelling 必須與 word 相同（例如：メニュー -> メニュー，不能是 null）。\n` +
        `  - 重要：日文的 spelling 絕對不能是 null，必須根據上述規則填寫。`
      : langUse === "Traditional Chinese"
      ? `Word.spelling 規則（繁體中文）：必須填寫注音，不能是 null。例如：你好 -> ㄋㄧˇ ㄏㄠˇ`
      : `Word.spelling 規則（英文）：請填 null。`;

  return `請生成「${topic}」主題的單字，數量：大約 ${count} 個，至少要達到 25 個有效單字。

共同要求：
- 只允許使用的語言：單字語言 ${langUseLabel}，解釋語言 ${langExpLabel}。
- 請考慮程度 ${level}，${difficultyHint}。
- Word.word 與 Word.sentence 都必須用 ${langUseLabel}，Word.explanation 及 Word.partOfSpeech 用 ${langExpLabel}。
- ${spellingRule}
- Word.sentence 必須包含該單字，格式必須是 <單字<（用左尖括號包裹單字，不能出現 '>'，不能缺少標記）。
  例如：正確格式「<運営<が円滑に行われています。」，錯誤格式「...<運営<...が円滑に行われています。」（不要字面顯示 '...'）。
  注意：單字在句子中可以使用時態變化（如動詞變形），但必須保持是同一單字且符合 Explanation 的意思，不能變成其他單字。
- 詞性 (Word.partOfSpeech)：請用 ${langExpLabel} 語言表示詞性；若為日文動詞，標示其動詞類別 (I, II, III)。
- ${posRequirement}
- 單字不可重複。${existingList}

輸出 JSON：
{
  "words": [
    { "word": "...", "spelling": "...或null", "explanation": "...", "partOfSpeech": "...", "sentence": "..." }
  ]
}

只輸出純 JSON，不要任何額外文字。`;
}

function safeParseWords(responseText: string): GeneratedWord[] {
  try {
    const parsed = JSON.parse(responseText);
    if (parsed && Array.isArray(parsed.words)) return parsed.words;
  } catch (_) {
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed && Array.isArray(parsed.words)) return parsed.words;
      } catch {
        // ignore
      }
    }
  }
  return [];
}

function filterAndNormalize(words: GeneratedWord[], langUse: AllowedLang, langExp: AllowedLang): GeneratedWord[] {
  return (words || [])
    .map((w) => {
      const word = (w.word || "").toString().trim();
      let spelling = w.spelling === null || w.spelling === undefined ? null : w.spelling.toString().trim();
      
      // 後處理：自動填充日文和繁體中文的 spelling
      if (langUse === "Japanese" && (!spelling || spelling === "null")) {
        // 日文：如果 spelling 為 null，根據 word 的字符類型自動填充
        if (isPureHiragana(word)) {
          // 純平假名：spelling 等於 word
          spelling = word;
        } else if (isPureKatakana(word)) {
          // 純片假名：spelling 等於 word
          spelling = word;
        } else if (containsKanji(word)) {
          // 包含漢字：應該有平假名讀音，如果 LLM 沒給，保留 null（但會在驗證時被過濾）
          // 這裡不自動填充，因為我們無法準確轉換漢字到平假名
        }
      } else if (langUse === "Traditional Chinese" && (!spelling || spelling === "null")) {
        // 繁體中文：如果 spelling 為 null，無法自動生成注音，保留 null（會在驗證時被過濾）
        // 注音需要外部庫或 API，這裡依賴 LLM 正確生成
      } else if (langUse === "English") {
        // 英文：spelling 必須是 null
        spelling = null;
      }
      
      return {
        word,
        spelling,
        explanation: (w.explanation || "").toString().trim(),
        partOfSpeech: w.partOfSpeech === null || w.partOfSpeech === undefined ? null : w.partOfSpeech.toString().trim(),
        sentence: (w.sentence || "").toString().trim(),
      };
    })
    .filter((w) => {
      if (!w.word || !w.explanation || !w.sentence) return false;
      if (!w.sentence.includes(`<${w.word}<`)) return false;
      
      // 驗證 spelling 規則
      if (langUse === "Japanese" && !w.spelling) {
        // 日文 spelling 不能為 null
        return false;
      }
      if (langUse === "Traditional Chinese" && !w.spelling) {
        // 繁體中文 spelling 不能為 null
        return false;
      }
      if (langUse === "English" && w.spelling !== null) {
        // 英文 spelling 必須是 null
        w.spelling = null;
      }
      
      return true;
    });
}

// 輔助函數：判斷是否為純平假名
function isPureHiragana(str: string): boolean {
  // 平假名範圍：\u3040-\u309F
  return /^[\u3040-\u309F]+$/.test(str);
}

// 輔助函數：判斷是否為純片假名
function isPureKatakana(str: string): boolean {
  // 片假名範圍：\u30A0-\u30FF
  return /^[\u30A0-\u30FF]+$/.test(str);
}

// 輔助函數：判斷是否包含漢字
function containsKanji(str: string): boolean {
  // 漢字範圍：\u4E00-\u9FAF（CJK 統一漢字）
  return /[\u4E00-\u9FAF]/.test(str);
}

function mergeUnique(existing: GeneratedWord[], incoming: GeneratedWord[]): GeneratedWord[] {
  const seen = new Set(existing.map((w) => w.word));
  const merged = [...existing];
  for (const w of incoming) {
    if (!seen.has(w.word)) {
      seen.add(w.word);
      merged.push(w);
    }
  }
  return merged;
}

function hasPosMinimum(words: GeneratedWord[], relaxed: boolean): boolean {
  if (relaxed) return true;
  let verbs = 0;
  let adjs = 0;
  let nouns = 0;
  for (const w of words) {
    const pos = (w.partOfSpeech || "").toLowerCase();
    if (pos.includes("動詞") || pos.includes("verb")) verbs += 1;
    if (pos.includes("形容詞") || pos.includes("adjective")) adjs += 1;
    if (pos.includes("名詞") || pos.includes("noun")) nouns += 1;
  }
  return verbs >= 5 && adjs >= 5 && nouns >= 5;
}

function getLanguageName(code: AllowedLang): string {
  const languageMap: Record<AllowedLang, string> = {
    English: "英文",
    "Traditional Chinese": "繁體中文",
    Japanese: "日文",
  };
  return languageMap[code] || code;
}

