'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import { useSession } from 'next-auth/react'

interface FeedbackQuestion {
  id: string
  question: string
  type: 'choice' | 'text'
  options?: string[]
}

export default function StudentFeedbackPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }
    Promise.all([loadForm(), loadUserFeedback()]).finally(() => setLoading(false))
  }, [router, session])

  const loadForm = async () => {
    try {
      const response = await fetch('/api/feedback/form')
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
      } else {
        console.error('載入表單失敗:', response.status)
        setError('載入表單失敗')
      }
    } catch (error) {
      console.error('載入表單失敗:', error)
      setError('載入表單失敗')
    }
  }

  const loadUserFeedback = async () => {
    try {
      const response = await fetch('/api/student/feedback')
      if (response.ok) {
        const data = await response.json()
        if (data.feedback && Object.keys(data.feedback).length > 0) {
          setAnswers(data.feedback)
        }
      }
    } catch (error) {
      console.error('載入用戶反饋失敗:', error)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleSave = async () => {
    const unansweredQuestions = questions.filter(q => !answers[q.id] || answers[q.id].trim() === '')
    
    if (unansweredQuestions.length > 0) {
      setError(`請回答所有問題。還有 ${unansweredQuestions.length} 個問題未回答。`)
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/student/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: answers }),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
        }, 3000)
      } else {
        const data = await response.json()
        setError(data.error || '保存失敗')
      }
    } catch (error) {
      console.error('保存反饋失敗:', error)
      setError('保存失敗')
    } finally {
      setSaving(false)
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
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            填寫意見回饋
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
              保存成功！
            </Alert>
          )}

          {questions.map((question) => (
            <Paper key={question.id} sx={{ p: 3, mb: 3 }}>
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend" sx={{ mb: 2 }}>
                  <Typography variant="h6">{question.question}</Typography>
                </FormLabel>
                {question.type === 'choice' && question.options ? (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  >
                    {question.options.map((option) => (
                      <FormControlLabel
                        key={option}
                        value={option}
                        control={<Radio />}
                        label={option}
                      />
                    ))}
                  </RadioGroup>
                ) : (
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="請輸入您的回饋..."
                  />
                )}
              </FormControl>
            </Paper>
          ))}

          {questions.length === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                目前沒有可填寫的表單
              </Typography>
            </Paper>
          )}

          {questions.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </Box>
          )}
        </Box>
    </Box>
  )
}

