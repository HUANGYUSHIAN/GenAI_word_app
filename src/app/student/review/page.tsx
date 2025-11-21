'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material'
import { useSession } from 'next-auth/react'
import ReviewCard from '@/components/ReviewCard'

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

export default function ReviewPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([])
  const [selectedVocabId, setSelectedVocabId] = useState('')
  const [selectedVocab, setSelectedVocab] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }
    loadVocabularies()
    setLoading(false)
  }, [router, session])

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
        
        // 獲取所有單字
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
        <Box sx={{ mt: 4, mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel>選擇單字本</InputLabel>
            <Select
              value={selectedVocabId}
              onChange={(e) => handleVocabChange(e.target.value)}
              label="選擇單字本"
            >
              {vocabularies.map((vocab) => (
                <MenuItem key={vocab.vocabularyId} value={vocab.vocabularyId}>
                  {vocab.name} ({vocab.langUse} - {vocab.langExp})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        {selectedVocab && selectedVocab.words && selectedVocab.words.length > 0 && (
          <ReviewCard vocabulary={selectedVocab} />
        )}
    </Box>
  )
}
