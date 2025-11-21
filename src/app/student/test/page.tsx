'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Card,
  CardContent,
  Chip,
  IconButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import { useSession, signOut } from 'next-auth/react'
import { examiner, Question, QuestionType } from '@/lib/utils/examiner'
import { getLanguageLabel, LANGUAGE_OPTIONS } from '@/components/LanguageSelect'
import { speakAsync } from '@/lib/utils/speechUtils'
import { normalizeLanguage } from '@/lib/utils/languageUtils'

type TestStage = 'setup' | 'testing' | 'result'

interface AnswerRecord {
  question: Question
  userAnswer: number
  timeSpent: number
  isCorrect: boolean
}

interface WrongAnswer {
  question: Question
  userAnswer: number
  correctAnswer: number
  timeSpent: number
}

interface Vocabulary {
  vocabularyId: string
  name: string
  langUse: string
  langExp: string
  wordCount: number
}

interface Word {
  id?: string
  word: string
  spelling?: string | null
  explanation: string
  partOfSpeech?: string | null
  sentence?: string | null
}

export default function TestPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([])
  const [filteredVocabularies, setFilteredVocabularies] = useState<Vocabulary[]>([])
  
  const [stage, setStage] = useState<TestStage>('setup')
  const [selectedLangUse, setSelectedLangUse] = useState('')
  const [selectedLangExp, setSelectedLangExp] = useState('')
  const [selectedVocabId, setSelectedVocabId] = useState('')
  const [selectedVocab, setSelectedVocab] = useState<any>(null)
  const [questionCount, setQuestionCount] = useState(10)
  const [questionType, setQuestionType] = useState<QuestionType>(0)
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [currentAnswer, setCurrentAnswer] = useState<number | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState(0)
  const [testStartTime, setTestStartTime] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([])
  const [currentWrongIndex, setCurrentWrongIndex] = useState(0)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }
    loadVocabularies()
    setLoading(false)
  }, [router, session])

  useEffect(() => {
    if (selectedLangUse && selectedLangExp) {
      const filtered = vocabularies.filter(
        vocab => vocab.langUse === selectedLangUse && vocab.langExp === selectedLangExp
      )
      setFilteredVocabularies(filtered)
      if (filtered.length === 0) {
        setSelectedVocabId('')
        setSelectedVocab(null)
      } else if (!filtered.find(v => v.vocabularyId === selectedVocabId)) {
        setSelectedVocabId('')
        setSelectedVocab(null)
      }
    } else {
      setFilteredVocabularies([])
      setSelectedVocabId('')
      setSelectedVocab(null)
    }
  }, [selectedLangUse, selectedLangExp, vocabularies, selectedVocabId])

  const loadVocabularies = async () => {
    try {
      const response = await fetch('/api/student/vocabularies')
      if (response.ok) {
        const data = await response.json()
        setVocabularies(data.vocabularies || [])
      }
    } catch (error) {
      console.error('載入單字本失敗:', error)
    }
  }

  const handleVocabChange = async (vocabId: string) => {
    setSelectedVocabId(vocabId)
    try {
      const response = await fetch(`/api/student/vocabularies/${vocabId}`)
      if (response.ok) {
        const data = await response.json()
        const vocab = data.vocabulary
        
        const wordsResponse = await fetch(`/api/student/vocabularies/${vocabId}/words?limit=1000`)
        if (wordsResponse.ok) {
          const wordsData = await wordsResponse.json()
          setSelectedVocab({
            ...vocab,
            words: wordsData.words || [],
          })
        } else {
          setSelectedVocab(vocab)
        }
      }
    } catch (error) {
      console.error('載入單字本詳情失敗:', error)
    }
  }

  const handleStartTest = () => {
    if (!selectedLangUse || !selectedLangExp) {
      alert('請選擇背誦語言和解釋語言')
      return
    }

    if (!selectedVocab || !selectedVocab.words || selectedVocab.words.length === 0) {
      alert('請選擇有效的單字本')
      return
    }

    if (selectedVocab.langUse !== selectedLangUse || selectedVocab.langExp !== selectedLangExp) {
      alert('單字本的語言設定與選擇的語言不符，請重新選擇')
      return
    }

    if (questionCount < 1 || questionCount > selectedVocab.words.length) {
      alert(`題目數量必須在 1 到 ${selectedVocab.words.length} 之間`)
      return
    }

    const generatedQuestions: Question[] = []
    for (let i = 0; i < questionCount; i++) {
      let actualQuestionType: QuestionType = questionType
      if (questionType === 5) {
        actualQuestionType = Math.floor(Math.random() * 5) as QuestionType
      }
      
      const question = examiner(selectedVocab.words, actualQuestionType)
      if (question) {
        generatedQuestions.push(question)
      }
    }

    if (generatedQuestions.length === 0) {
      alert('無法生成題目，請確認單字本有足夠的單字')
      return
    }

    setQuestions(generatedQuestions)
    setAnswers([])
    setCurrentQuestionIndex(0)
    setCurrentAnswer(null)
    setStage('testing')
    setTestStartTime(Date.now())
    setQuestionStartTime(Date.now())
  }

  const handleAnswer = (answerIndex: number) => {
    if (currentAnswer !== null) return

    if (isSpeaking) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setIsSpeaking(false)
    }

    const timeSpent = Date.now() - questionStartTime
    const currentQuestion = questions[currentQuestionIndex]
    const isCorrect = answerIndex === currentQuestion.correctAnswer

    const answerRecord: AnswerRecord = {
      question: currentQuestion,
      userAnswer: answerIndex,
      timeSpent,
      isCorrect,
    }

    setAnswers(prev => [...prev, answerRecord])
    setCurrentAnswer(answerIndex)

    setTimeout(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setIsSpeaking(false)

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setCurrentAnswer(null)
        setQuestionStartTime(Date.now())
      } else {
        finishTest()
      }
    }, 300)
  }

  const handleSpeak = async () => {
    if (!selectedVocab || questions.length === 0) return
    
    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion) return

    if (isSpeaking) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setIsSpeaking(false)
      return
    }

    setIsSpeaking(true)

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const langUseCode = normalizeLanguage(selectedVocab.langUse)
      const langExpCode = normalizeLanguage(selectedVocab.langExp)

      if (currentQuestion.questionType === 0) {
        const processedSentence = currentQuestion.question || ''
        if (processedSentence) {
          await speakAsync(langUseCode, processedSentence, 0.8)
        }
      } else if (currentQuestion.questionType === 3) {
        const questionText = currentQuestion.question || ''
        const parts = questionText.split(' ')
        if (parts.length >= 2) {
          const sentence = parts.slice(0, -1).join(' ')
          const word = parts[parts.length - 1]
          if (sentence) {
            await speakAsync(langUseCode, sentence, 0.8)
            await new Promise(resolve => setTimeout(resolve, 300))
          }
          if (word) {
            await speakAsync(langUseCode, word, 0.8)
          }
        } else {
          await speakAsync(langUseCode, questionText, 0.8)
        }
      } else if (currentQuestion.questionType === 1) {
        let explanation = currentQuestion.testWord.explanation || ''
        explanation = explanation.replace(/\([^)]*\)/g, '').trim()
        if (explanation) {
          await speakAsync(langExpCode, explanation, 1.0)
        }
      } else if (currentQuestion.questionType === 2 || currentQuestion.questionType === 4) {
        const processedSentence = currentQuestion.question || ''
        if (processedSentence) {
          await speakAsync(langUseCode, processedSentence, 0.8)
        }
      }
    } catch (error) {
      console.error('語音播放錯誤:', error)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    } finally {
      setIsSpeaking(false)
    }
  }

  const finishTest = () => {
    const wrongAnswersList: WrongAnswer[] = answers
      .filter(a => !a.isCorrect)
      .map(a => ({
        question: a.question,
        userAnswer: a.userAnswer,
        correctAnswer: a.question.correctAnswer,
        timeSpent: a.timeSpent,
      }))
    
    setWrongAnswers(wrongAnswersList)
    setCurrentWrongIndex(0)
    setStage('result')
  }

  const handleReset = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    
    setStage('setup')
    setCurrentQuestionIndex(0)
    setQuestions([])
    setAnswers([])
    setCurrentAnswer(null)
    setWrongAnswers([])
    setCurrentWrongIndex(0)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (stage === 'setup') {
    return (
      <Box>
          <Box sx={{ mt: 4 }}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                設定測驗
              </Typography>

              <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                <InputLabel>背誦語言</InputLabel>
                <Select
                  value={selectedLangUse}
                  onChange={(e) => setSelectedLangUse(e.target.value)}
                  label="背誦語言"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <MenuItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>解釋語言</InputLabel>
                <Select
                  value={selectedLangExp}
                  onChange={(e) => setSelectedLangExp(e.target.value)}
                  label="解釋語言"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <MenuItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>選擇單字本</InputLabel>
                <Select
                  value={selectedVocabId}
                  onChange={(e) => handleVocabChange(e.target.value)}
                  label="選擇單字本"
                  disabled={!selectedLangUse || !selectedLangExp}
                >
                  {filteredVocabularies.length > 0 ? (
                    filteredVocabularies.map((vocab) => (
                      <MenuItem key={vocab.vocabularyId} value={vocab.vocabularyId}>
                        {vocab.name} ({getLanguageLabel(vocab.langUse)} - {getLanguageLabel(vocab.langExp)})
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>
                      {selectedLangUse && selectedLangExp ? '沒有符合的單字本' : '請先選擇語言'}
                    </MenuItem>
                  )}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                type="number"
                label="題目數量"
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, max: selectedVocab?.words?.length || 1 }}
                disabled={!selectedVocab}
                sx={{ mb: 2 }}
                helperText={selectedVocab ? `最多可選擇 ${selectedVocab.words?.length || 0} 題` : '請先選擇單字本'}
              />

              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <FormLabel component="legend">題目類型</FormLabel>
                <RadioGroup
                  value={questionType}
                  onChange={(e) => setQuestionType(parseInt(e.target.value) as QuestionType)}
                >
                  <FormControlLabel value={0} control={<Radio />} label="看句子選意思" />
                  <FormControlLabel value={1} control={<Radio />} label="看意思選句子" />
                  <FormControlLabel value={2} control={<Radio />} label="看句子選單字" />
                  <FormControlLabel value={3} control={<Radio />} label="聽句子選意思" />
                  <FormControlLabel value={4} control={<Radio />} label="聽句子選單字" />
                  <FormControlLabel value={5} control={<Radio />} label="混合選項" />
                </RadioGroup>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleStartTest}
                disabled={!selectedVocab || !selectedLangUse || !selectedLangExp || questionCount < 1}
              >
                開始測驗
              </Button>
            </Paper>
          </Box>
      </Box>
    )
  }

  if (stage === 'testing') {
    const currentQuestion = questions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    return (
      <Box>
          <Box sx={{ mt: 4 }}>
            <Paper sx={{ p: 4 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  進度: {currentQuestionIndex + 1} / {questions.length}
                </Typography>
                <Box sx={{ width: '100%', height: 8, bgcolor: 'grey.300', borderRadius: 1, mt: 1 }}>
                  <Box
                    sx={{
                      width: `${progress}%`,
                      height: '100%',
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      transition: 'width 0.3s',
                    }}
                  />
                </Box>
              </Box>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      題目
                    </Typography>
                    <IconButton
                      onClick={handleSpeak}
                      color={isSpeaking ? 'error' : 'primary'}
                      size="large"
                    >
                      <VolumeUpIcon />
                    </IconButton>
                  </Box>
                  {currentQuestion.questionType !== 3 && currentQuestion.questionType !== 4 ? (
                    <Typography variant="h4" sx={{ mt: 2, mb: 3 }}>
                      {currentQuestion.questionHighlight ? (
                        <>
                          {currentQuestion.question.substring(0, currentQuestion.questionHighlight.startIndex)}
                          <Box component="span" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                            {currentQuestion.questionHighlight.word}
                          </Box>
                          {currentQuestion.question.substring(currentQuestion.questionHighlight.endIndex)}
                        </>
                      ) : (
                        currentQuestion.question
                      )}
                    </Typography>
                  ) : (
                    <Box sx={{ mt: 2, mb: 3, minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        請點擊聲音圖標聽題目
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Box sx={{ mb: 3 }}>
                {currentQuestion.options.map((option, index) => {
                  const highlights = currentQuestion.optionsHighlight?.[index] || []
                  return (
                    <Button
                      key={index}
                      fullWidth
                      variant={currentAnswer === index ? 'contained' : 'outlined'}
                      onClick={() => handleAnswer(index)}
                      disabled={currentAnswer !== null}
                      sx={{ mb: 2, py: 2, textTransform: 'none' }}
                    >
                      {highlights.length > 0 ? (
                        <>
                          {highlights.map((highlight, hi) => {
                            const prevEnd = hi === 0 ? 0 : highlights[hi - 1].endIndex
                            return (
                              <span key={hi}>
                                {option.substring(prevEnd, highlight.startIndex)}
                                <Box component="span" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                  {highlight.word}
                                </Box>
                                {hi === highlights.length - 1 && option.substring(highlight.endIndex)}
                              </span>
                            )
                          })}
                        </>
                      ) : (
                        option
                      )}
                    </Button>
                  )
                })}
              </Box>
            </Paper>
          </Box>
      </Box>
    )
  }

  const totalTime = Date.now() - testStartTime
  const minutes = Math.floor(totalTime / 60000)
  const seconds = Math.floor((totalTime % 60000) / 1000)
  const correctCount = answers.filter(a => a.isCorrect).length
  const accuracy = questions.length > 0 ? (correctCount / questions.length) * 100 : 0

  return (
    <Box>
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              測驗結果
            </Typography>
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="h6">
                正確率: {accuracy.toFixed(1)}% ({correctCount} / {questions.length})
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                答題時間: {minutes} 分 {seconds} 秒
              </Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={handleReset} sx={{ mr: 2 }}>
                重新測驗
              </Button>
              {wrongAnswers.length > 0 && (
                <Button variant="contained" onClick={() => setCurrentWrongIndex(0)}>
                  查看答錯題目 ({wrongAnswers.length})
                </Button>
              )}
            </Box>
          </Paper>

          {wrongAnswers.length > 0 && (
            <Paper sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  答錯題目 ({currentWrongIndex + 1} / {wrongAnswers.length})
                </Typography>
                <Box>
                  <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => setCurrentWrongIndex(Math.max(0, currentWrongIndex - 1))}
                    disabled={currentWrongIndex === 0}
                    sx={{ mr: 1 }}
                  >
                    上一題
                  </Button>
                  <Button
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => setCurrentWrongIndex(Math.min(wrongAnswers.length - 1, currentWrongIndex + 1))}
                    disabled={currentWrongIndex === wrongAnswers.length - 1}
                  >
                    下一題
                  </Button>
                </Box>
              </Box>

              {wrongAnswers[currentWrongIndex] && (() => {
                const wrong = wrongAnswers[currentWrongIndex]
                const q = wrong.question

                return (
                  <Box>
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          題目
                        </Typography>
                        <Typography variant="h5" sx={{ mt: 2 }}>
                          {q.question}
                        </Typography>
                      </CardContent>
                    </Card>

                    <Box>
                      {q.options.map((option, index) => {
                        const isWrongAnswer = index === wrong.userAnswer && index !== wrong.correctAnswer
                        const isCorrectAnswer = index === wrong.correctAnswer
                        const highlights = q.optionsHighlight?.[index] || []

                        return (
                          <Box
                            key={index}
                            sx={{
                              p: 2,
                              mb: 1,
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: isWrongAnswer ? 'error.main' : isCorrectAnswer ? 'success.main' : 'grey.300',
                              bgcolor: isWrongAnswer ? 'error.light' : isCorrectAnswer ? 'success.light' : 'transparent',
                              color: isWrongAnswer ? 'error.dark' : isCorrectAnswer ? 'success.dark' : 'text.primary',
                            }}
                          >
                            <Typography variant="body1">
                              {highlights.length > 0 ? (
                                <>
                                  {highlights.map((highlight, hi) => {
                                    const prevEnd = hi === 0 ? 0 : highlights[hi - 1].endIndex
                                    return (
                                      <span key={hi}>
                                        {option.substring(prevEnd, highlight.startIndex)}
                                        <Box component="span" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                          {highlight.word}
                                        </Box>
                                        {hi === highlights.length - 1 && option.substring(highlight.endIndex)}
                                      </span>
                                    )
                                  })}
                                </>
                              ) : (
                                option
                              )}
                              {isWrongAnswer && <Chip label="您的答案" color="error" size="small" sx={{ ml: 1 }} />}
                              {isCorrectAnswer && <Chip label="正確答案" color="success" size="small" sx={{ ml: 1 }} />}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        答題時間: {(wrong.timeSpent / 1000).toFixed(1)} 秒
                      </Typography>
                    </Box>
                  </Box>
                )
              })()}
            </Paper>
          )}
        </Box>
    </Box>
  )
}

