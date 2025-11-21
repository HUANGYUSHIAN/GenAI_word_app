export type QuestionType = 0 | 1 | 2 | 3 | 4 | 5 // 0: 看句子選意思, 1: 看意思選句子, 2: 看句子選單字, 3: 聽句子選意思, 4: 聽句子選單字, 5: 混合選項

export interface Word {
  id?: string
  word: string
  spelling?: string | null
  explanation: string
  partOfSpeech?: string | null
  sentence?: string | null
}

export interface Question {
  testWord: Word
  questionType: QuestionType
  question: string
  questionHighlight?: { word: string; startIndex: number; endIndex: number }
  options: string[]
  optionsHighlight?: Array<{ word: string; startIndex: number; endIndex: number }[]>
  correctAnswer: number
}

function extractWordFromSentence(sentence: string): string {
  const match = sentence.match(/<([^<]+)</)
  return match ? match[1] : ''
}

function extractAllWordsFromSentences(sentences: string[]): string[] {
  const words: string[] = []
  sentences.forEach(sentence => {
    const match = sentence.match(/<([^<]+)</g)
    if (match) {
      match.forEach(m => {
        const word = m.replace(/</g, '')
        if (word && !words.includes(word)) {
          words.push(word)
        }
      })
    }
  })
  return words
}

function removeParentheses(text: string): string {
  let result = text.replace(/\([^)]*\)/g, '')
  result = result.replace(/（[^）]*）/g, '')
  return result.trim()
}

function replaceWordInSentence(sentence: string): string {
  return sentence.replace(/<[^<]+</g, '??')
}

function processSentenceWithHighlight(sentence: string): {
  processedText: string
  highlight: { word: string; startIndex: number; endIndex: number } | null
} {
  let processed = removeParentheses(sentence)
  const match = processed.match(/<([^<]+)</)
  if (!match || match.index === undefined) {
    return { processedText: processed, highlight: null }
  }
  const word = match[1]
  const beforeMatch = processed.substring(0, match.index)
  processed = processed.replace(/<([^<]+)</g, '$1')
  const startIndex = beforeMatch.length
  const endIndex = startIndex + word.length
  return {
    processedText: processed,
    highlight: {
      word,
      startIndex,
      endIndex
    }
  }
}

function randomSelect<T>(array: T[], count: number, exclude: T[] = []): T[] {
  const available = array.filter(item => !exclude.includes(item))
  if (available.length < count) {
    return available
  }
  const selected: T[] = []
  const indices = new Set<number>()
  while (selected.length < count && indices.size < available.length) {
    const randomIndex = Math.floor(Math.random() * available.length)
    if (!indices.has(randomIndex)) {
      indices.add(randomIndex)
      selected.push(available[randomIndex])
    }
  }
  return selected
}

export function examiner(vocabulary: Word[], questionType: QuestionType): Question | null {
  if (!vocabulary || vocabulary.length === 0) {
    return null
  }

  const length = vocabulary.length
  const testWordIndex = Math.floor(Math.random() * length)
  const testWord = vocabulary[testWordIndex]

  const options: (string | null)[] = [null, null, null, null]
  const correctAnswer = Math.floor(Math.random() * 4)

  let Qvar: string | null = null
  let Avar: string | null = null
  let question: string = ''

  let questionHighlight: { word: string; startIndex: number; endIndex: number } | null = null
  let optionsHighlight: Array<{ word: string; startIndex: number; endIndex: number }[]> | null = null
  
  if (questionType === 0 || questionType === 3) {
    Qvar = testWord.sentence || ''
    Avar = testWord.explanation
  } else if (questionType === 1) {
    Qvar = testWord.explanation
    Avar = testWord.sentence || ''
  } else if (questionType === 2 || questionType === 4) {
    Qvar = testWord.sentence || ''
  }

  if (questionType === 2 || questionType === 4) {
    let processedSentence = removeParentheses(Qvar || '')
    processedSentence = replaceWordInSentence(processedSentence)
    question = processedSentence.trim()
    const correctWord = extractWordFromSentence(testWord.sentence || '')
    if (correctWord) {
      options[correctAnswer] = correctWord
    } else {
      options[correctAnswer] = testWord.word || ''
    }
  } else if (questionType === 0) {
    const processed = processSentenceWithHighlight(Qvar || '')
    question = processed.processedText
    questionHighlight = processed.highlight
    options[correctAnswer] = removeParentheses(Avar || '')
  } else if (questionType === 3) {
    const processed = processSentenceWithHighlight(Qvar || '')
    const word = processed.highlight?.word || extractWordFromSentence(testWord.sentence || '') || testWord.word || ''
    question = processed.processedText + ' ' + word
    options[correctAnswer] = removeParentheses(Avar || '')
  } else if (questionType === 1) {
    question = Qvar || ''
    const processed = processSentenceWithHighlight(Avar || '')
    options[correctAnswer] = processed.processedText
    optionsHighlight = []
    optionsHighlight[correctAnswer] = processed.highlight ? [processed.highlight] : []
  }

  for (let i = 0; i < 4; i++) {
    if (options[i] !== null) {
      continue
    }

    if (questionType === 2 || questionType === 4) {
      const allSentences = vocabulary.map(w => w.sentence || '')
      const allWords = extractAllWordsFromSentences(allSentences)
      const excludeWords = options.filter((opt): opt is string => opt !== null)
      const selectedWords = randomSelect(allWords, 1, excludeWords)
      if (selectedWords.length > 0) {
        options[i] = selectedWords[0]
      } else {
        const otherWords = vocabulary
          .filter((_, idx) => idx !== testWordIndex)
          .map(w => w.word)
        const exclude = options.filter((opt): opt is string => opt !== null)
        const selected = randomSelect(otherWords, 1, exclude)
        options[i] = selected.length > 0 ? selected[0] : ''
      }
    } else if (questionType === 0 || questionType === 3) {
      const otherWords = vocabulary
        .filter((_, idx) => idx !== testWordIndex)
        .map(w => w.explanation)
        .map(text => removeParentheses(text))
      const exclude = options.filter((opt): opt is string => opt !== null)
      const selected = randomSelect(otherWords, 1, exclude)
      options[i] = selected.length > 0 ? selected[0] : ''
    } else if (questionType === 1) {
      const otherSentences = vocabulary
        .filter((_, idx) => idx !== testWordIndex)
        .map(w => w.sentence || '')
      const processedOptions = options
        .map((opt, idx) => opt !== null ? opt : null)
        .filter((opt): opt is string => opt !== null)
      const selectedSentences = randomSelect(otherSentences, 1, [])
      if (selectedSentences.length > 0) {
        const processed = processSentenceWithHighlight(selectedSentences[0])
        if (!processedOptions.includes(processed.processedText)) {
          options[i] = processed.processedText
          if (!optionsHighlight) {
            optionsHighlight = []
          }
          optionsHighlight[i] = processed.highlight ? [processed.highlight] : []
        } else {
          const remainingSentences = otherSentences.filter(s => {
            const p = processSentenceWithHighlight(s)
            return !processedOptions.includes(p.processedText)
          })
          if (remainingSentences.length > 0) {
            const nextProcessed = processSentenceWithHighlight(remainingSentences[0])
            options[i] = nextProcessed.processedText
            if (!optionsHighlight) {
              optionsHighlight = []
            }
            optionsHighlight[i] = nextProcessed.highlight ? [nextProcessed.highlight] : []
          } else {
            options[i] = ''
            if (!optionsHighlight) {
              optionsHighlight = []
            }
            optionsHighlight[i] = []
          }
        }
      } else {
        options[i] = ''
        if (!optionsHighlight) {
          optionsHighlight = []
        }
        optionsHighlight[i] = []
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    if (options[i] === null) {
      options[i] = ''
    }
  }

  const result: Question = {
    testWord,
    questionType,
    question,
    options: options as string[],
    correctAnswer,
  }
  
  if (questionHighlight) {
    result.questionHighlight = questionHighlight
  }
  
  if (optionsHighlight) {
    result.optionsHighlight = optionsHighlight
  }
  
  return result
}

