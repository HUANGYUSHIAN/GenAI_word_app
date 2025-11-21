'use client'

import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
} from '@mui/material'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { speakAsync } from '@/lib/utils/speechUtils'
import { normalizeLanguage } from '@/lib/utils/languageUtils'

interface Word {
  id?: string
  word: string
  spelling?: string | null
  explanation: string
  partOfSpeech?: string | null
  sentence?: string | null
}

interface Vocabulary {
  vocabularyId: string
  name: string
  langUse: string
  langExp: string
  words?: Word[]
}

interface ReviewCardProps {
  vocabulary: Vocabulary
}

export default function ReviewCard({ vocabulary }: ReviewCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const currentWord = vocabulary.words?.[currentIndex]
  const totalWords = vocabulary.words?.length || 0

  const handleSpeak = async () => {
    if (!currentWord) return

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

      const langUseCode = normalizeLanguage(vocabulary.langUse)
      const langExpCode = normalizeLanguage(vocabulary.langExp)

      let explanation = currentWord.explanation || ''
      explanation = explanation.replace(/\([^)]*\)/g, '').trim()

      let sentence = currentWord.sentence || ''
      sentence = sentence.replace(/\([^)]*\)/g, '')
      sentence = sentence.replace(/</g, '')
      sentence = sentence.trim()

      if (currentWord.word) {
        await speakAsync(langUseCode, currentWord.word, 0.8)
      }

      if (explanation) {
        await speakAsync(langExpCode, explanation, 1.0)
      }

      if (sentence) {
        await speakAsync(langUseCode, sentence, 0.8)
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

  const handlePrevious = () => {
    if (isSpeaking) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setIsSpeaking(false)
    }
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (isSpeaking) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setIsSpeaking(false)
    }
    if (currentIndex < totalWords - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  if (!currentWord) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1">沒有單字</Typography>
      </Paper>
    )
  }

  const processSentence = (sentence: string, word: string) => {
    const pattern = /<([^<]+)</g
    const parts: (string | React.ReactElement)[] = []
    let lastIndex = 0
    let match

    while ((match = pattern.exec(sentence)) !== null) {
      if (match.index > lastIndex) {
        parts.push(sentence.substring(lastIndex, match.index))
      }
      parts.push(
        <Box component="span" key={match.index} sx={{ color: 'error.main', fontWeight: 'bold' }}>
          {match[1]}
        </Box>
      )
      lastIndex = pattern.lastIndex
    }

    if (lastIndex < sentence.length) {
      parts.push(sentence.substring(lastIndex))
    }

    return parts.length > 0 ? parts : sentence
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {currentWord.word}
          </Typography>
          <IconButton
            onClick={handleSpeak}
            color={isSpeaking ? 'error' : 'primary'}
            size="large"
            disabled={!currentWord}
          >
            <VolumeUpIcon />
          </IconButton>
        </Box>

        {currentWord.spelling && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            拼音: {currentWord.spelling}
          </Typography>
        )}

        <Typography variant="body1" sx={{ mb: 2 }}>
          {currentWord.explanation}
        </Typography>

        {currentWord.partOfSpeech && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            詞性: {currentWord.partOfSpeech}
          </Typography>
        )}

        {currentWord.sentence && (
          <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
            {processSentence(currentWord.sentence, currentWord.word)}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            上一個
          </Button>
          <Typography variant="body2" color="text.secondary">
            {currentIndex + 1} / {totalWords}
          </Typography>
          <Button
            variant="outlined"
            endIcon={<ArrowForwardIcon />}
            onClick={handleNext}
            disabled={currentIndex === totalWords - 1}
          >
            下一個
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

