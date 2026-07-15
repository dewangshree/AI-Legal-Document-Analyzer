import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 120_000, // 2 min — LLM calls can take a moment
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const toForm = (...files) => {
  const fd = new FormData()
  files.forEach(([key, file]) => fd.append(key, file))
  return fd
}

// ── API Calls ─────────────────────────────────────────────────────────────────

export const uploadDocument = (file) =>
  api.post('/upload', toForm(['file', file])).then((r) => r.data)

export const getSummary = (file) =>
  api.post('/summary', toForm(['file', file])).then((r) => r.data)

export const getClauses = (file) =>
  api.post('/clauses', toForm(['file', file])).then((r) => r.data)

export const getRisks = (file) =>
  api.post('/risks', toForm(['file', file])).then((r) => r.data)

export const compareContracts = (file1, file2) =>
  api.post('/compare', toForm(['file1', file1], ['file2', file2])).then((r) => r.data)

// ── Error Normaliser ──────────────────────────────────────────────────────────

export const getErrorMessage = (err) => {
  if (err?.response?.data?.detail) return err.response.data.detail
  if (err?.response?.data?.message) return err.response.data.message
  if (err?.message) return err.message
  return 'An unexpected error occurred. Please try again.'
}
