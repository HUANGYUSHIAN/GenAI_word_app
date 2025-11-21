'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import EditIcon from '@mui/icons-material/Edit'
import { useSession } from 'next-auth/react'

interface FeedbackQuestion {
  id: string
  question: string
  type: 'choice' | 'text'
  options?: string[]
}

interface UserFeedback {
  userId: string
  feedback: Record<string, any> | null
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([])
  const [userFeedbacks, setUserFeedbacks] = useState<UserFeedback[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<Record<string, any> | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<FeedbackQuestion | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }
    if (tab === 0) {
      loadUserFeedbacks()
    } else {
      loadForm()
    }
    setLoading(false)
  }, [router, tab, session])

  const loadForm = async () => {
    try {
      const response = await fetch('/api/admin/feedback/form')
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
      }
    } catch (error) {
      console.error('載入表單失敗:', error)
      setError('載入表單失敗')
    }
  }

  const loadUserFeedbacks = async () => {
    try {
      const response = await fetch('/api/admin/feedback/users')
      if (response.ok) {
        const data = await response.json()
        setUserFeedbacks(data.userFeedbacks || [])
      }
    } catch (error) {
      console.error('載入用戶反饋失敗:', error)
      setError('載入用戶反饋失敗')
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue)
    if (newValue === 0) {
      loadUserFeedbacks()
    } else {
      loadForm()
    }
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    const user = userFeedbacks.find(u => u.userId === userId)
    setSelectedFeedback(user?.feedback || null)
  }

  const handleAddQuestion = () => {
    const newQuestion: FeedbackQuestion = {
      id: Date.now().toString(),
      question: '',
      type: 'choice',
      options: [''],
    }
    setEditingQuestion(newQuestion)
    setDialogOpen(true)
  }

  const handleEditQuestion = (question: FeedbackQuestion) => {
    setEditingQuestion({ ...question })
    setDialogOpen(true)
  }

  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const handleSaveQuestion = () => {
    if (!editingQuestion) return
    if (!editingQuestion.question.trim()) {
      setError('問題內容不能為空')
      return
    }
    if (editingQuestion.type === 'choice' && (!editingQuestion.options || editingQuestion.options.length === 0)) {
      setError('選擇題必須至少有一個選項')
      return
    }

    const existingIndex = questions.findIndex(q => q.id === editingQuestion.id)
    if (existingIndex >= 0) {
      setQuestions(prev => prev.map((q, i) => i === existingIndex ? editingQuestion : q))
    } else {
      setQuestions(prev => [...prev, editingQuestion])
    }
    setDialogOpen(false)
    setEditingQuestion(null)
    setError('')
  }

  const handleSaveForm = async () => {
    setError('')
    setSuccess(false)
    try {
      const response = await fetch('/api/admin/feedback/form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const data = await response.json()
        setError(data.error || '保存失敗')
      }
    } catch (error) {
      console.error('保存表單失敗:', error)
      setError('保存失敗')
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
          <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab label="查看回饋" />
            <Tab label="修改表單" />
          </Tabs>

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

          {tab === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                查看使用者回饋
              </Typography>
              <FormControl fullWidth sx={{ mb: 3, mt: 2 }}>
                <InputLabel>選擇使用者</InputLabel>
                <Select
                  value={selectedUserId}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  label="選擇使用者"
                >
                  {userFeedbacks.map((user) => (
                    <MenuItem key={user.userId} value={user.userId}>
                      {user.userId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedUserId && (
                <Box>
                  {selectedFeedback ? (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        回饋內容
                      </Typography>
                      {Object.entries(selectedFeedback).map(([key, value]) => (
                        <Box key={key} sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {key}
                          </Typography>
                          <Typography variant="body1">
                            {String(value)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      尚未評價
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          )}

          {tab === 1 && (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  表單題目
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveForm}
                    sx={{ mr: 2 }}
                  >
                    保存表單
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddQuestion}
                  >
                    新增題目
                  </Button>
                </Box>
              </Box>

              {questions.map((question) => (
                <Paper key={question.id} sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {question.question}
                      </Typography>
                      <Chip
                        label={question.type === 'choice' ? '選擇題' : '填充題'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      {question.type === 'choice' && question.options && (
                        <Box sx={{ mt: 1 }}>
                          {question.options.map((option, idx) => (
                            <Chip key={idx} label={option} size="small" sx={{ mr: 1, mb: 1 }} />
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEditQuestion(question)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}

              {questions.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  尚無題目，請點擊「新增題目」添加
                </Typography>
              )}
            </Paper>
          )}

          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
              {editingQuestion && questions.find(q => q.id === editingQuestion.id) ? '編輯題目' : '新增題目'}
            </DialogTitle>
            <DialogContent>
              {editingQuestion && (
                <Box sx={{ pt: 2 }}>
                  <TextField
                    fullWidth
                    label="問題內容"
                    value={editingQuestion.question}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>題目類型</InputLabel>
                    <Select
                      value={editingQuestion.type}
                      onChange={(e) => {
                        const newType = e.target.value as 'choice' | 'text'
                        setEditingQuestion({
                          ...editingQuestion,
                          type: newType,
                          options: newType === 'choice' ? (editingQuestion.options || ['']) : undefined,
                        })
                      }}
                      label="題目類型"
                    >
                      <MenuItem value="choice">選擇題（單選）</MenuItem>
                      <MenuItem value="text">填充題</MenuItem>
                    </Select>
                  </FormControl>
                  {editingQuestion.type === 'choice' && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        選項
                      </Typography>
                      {editingQuestion.options?.map((option, idx) => (
                        <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(editingQuestion.options || [])]
                              newOptions[idx] = e.target.value
                              setEditingQuestion({ ...editingQuestion, options: newOptions })
                            }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              const newOptions = editingQuestion.options?.filter((_, i) => i !== idx) || []
                              setEditingQuestion({ ...editingQuestion, options: newOptions.length > 0 ? newOptions : [''] })
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ))}
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setEditingQuestion({
                            ...editingQuestion,
                            options: [...(editingQuestion.options || []), ''],
                          })
                        }}
                      >
                        新增選項
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setDialogOpen(false); setEditingQuestion(null) }}>
                取消
              </Button>
              <Button onClick={handleSaveQuestion} variant="contained">
                保存
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
    </Box>
  )
}

