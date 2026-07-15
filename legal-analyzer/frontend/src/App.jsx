import { useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import {
  Sparkles, FileText, Shield, GitCompare,
  ChevronRight, RotateCcw, AlertCircle
} from 'lucide-react'

import Header from './components/Header'
import UploadZone from './components/UploadZone'
import SummarySection from './components/SummarySection'
import ClausesSection from './components/ClausesSection'
import RisksSection from './components/RisksSection'
import CompareSection from './components/CompareSection'
import Spinner from './components/Spinner'

import {
  getSummary, getClauses, getRisks,
  compareContracts, getErrorMessage
} from './api'

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'summary',  label: 'Summary',    icon: Sparkles,    color: 'text-violet-400' },
  { id: 'clauses',  label: 'Clauses',    icon: FileText,    color: 'text-blue-400'   },
  { id: 'risks',    label: 'Risks',      icon: Shield,      color: 'text-red-400'    },
  { id: 'compare',  label: 'Compare',    icon: GitCompare,  color: 'text-emerald-400'},
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 animate-fade-in">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-400">Error</p>
        <p className="text-sm text-slate-400 mt-0.5">{message}</p>
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState('summary')

  // Single-document state
  const [file, setFile] = useState(null)

  // Compare state
  const [file1, setFile1] = useState(null)
  const [file2, setFile2] = useState(null)

  // Results
  const [results, setResults] = useState({})   // { summary, clauses, risks, compare }
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // ── Actions ──────────────────────────────────────────────────────────────

  const run = async (tabId) => {
    setError('')

    // Validate inputs
    if (tabId !== 'compare' && !file) {
      toast.error('Please upload a document first.')
      return
    }
    if (tabId === 'compare' && (!file1 || !file2)) {
      toast.error('Please upload both contracts to compare.')
      return
    }

    setLoading(true)
    try {
      let data
      if (tabId === 'summary')  data = await getSummary(file)
      if (tabId === 'clauses')  data = await getClauses(file)
      if (tabId === 'risks')    data = await getRisks(file)
      if (tabId === 'compare')  data = await compareContracts(file1, file2)

      setResults((prev) => ({ ...prev, [tabId]: data }))
      toast.success('Analysis complete!', { icon: '✨' })
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      toast.error(msg.slice(0, 80))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null); setFile1(null); setFile2(null)
    setResults({}); setError('')
  }

  const currentResult = results[activeTab]
  const isCompare = activeTab === 'compare'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' },
          success: { iconTheme: { primary: '#818cf8', secondary: '#1a1a2e' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#1a1a2e' } },
        }}
      />

      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── Hero tagline ──────────────────────────────────── */}
        <div className="text-center py-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            <span className="text-gradient">AI-Powered</span>{' '}
            <span className="text-slate-100">Legal Document Analysis</span>
          </h2>
          <p className="text-slate-500 mt-2 text-sm max-w-xl mx-auto">
            Upload any contract and instantly get summaries, clause breakdowns, risk assessments, and side-by-side comparisons — all powered by LLaMA 3.3 70B.
          </p>
        </div>

        {/* ── Tabs ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-700/60 border border-white/5 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 flex-1 min-w-[100px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap
                ${activeTab === id
                  ? 'bg-primary-600 text-white shadow-glow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-500/50'
                }`}
            >
              <Icon className={`w-4 h-4 ${activeTab === id ? 'text-white' : color}`} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Upload panel ───────────────────────────────────── */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">
              <span className="section-title-icon">
                {(() => { const T = TABS.find(t => t.id === activeTab); return T ? <T.icon className="w-4 h-4 text-primary-400" /> : null })()}
              </span>
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            {(file || file1 || file2 || Object.keys(results).length > 0) && (
              <button onClick={reset} className="btn-secondary text-xs gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>

          {isCompare ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UploadZone id="file1-upload" label="Contract 1" value={file1} onChange={setFile1} />
              <UploadZone id="file2-upload" label="Contract 2" value={file2} onChange={setFile2} />
            </div>
          ) : (
            <UploadZone id="single-upload" label="Legal Document" value={file} onChange={setFile} />
          )}

          <div className="mt-5 flex justify-end">
            <button
              className="btn-primary"
              onClick={() => run(activeTab)}
              disabled={loading}
              id={`run-${activeTab}-btn`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  Run Analysis
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Loading ────────────────────────────────────────── */}
        {loading && (
          <div className="glass-card">
            <Spinner text={
              activeTab === 'summary'  ? 'Generating AI summary…'      :
              activeTab === 'clauses'  ? 'Extracting legal clauses…'   :
              activeTab === 'risks'    ? 'Identifying legal risks…'     :
              'Comparing contracts…'
            } />
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────── */}
        {!loading && error && <ErrorBanner message={error} />}

        {/* ── Results ────────────────────────────────────────── */}
        {!loading && currentResult && (
          <>
            {activeTab === 'summary' && <SummarySection data={currentResult} />}
            {activeTab === 'clauses' && <ClausesSection data={currentResult} />}
            {activeTab === 'risks'   && <RisksSection   data={currentResult} />}
            {activeTab === 'compare' && <CompareSection  data={currentResult} />}
          </>
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {!loading && !currentResult && !error && (
          <div className="glass-card p-10 flex flex-col items-center text-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              {(() => { const T = TABS.find(t => t.id === activeTab); return T ? <T.icon className="w-8 h-8 text-primary-400 opacity-60" /> : null })()}
            </div>
            <div>
              <p className="text-slate-400 font-semibold text-sm">
                {activeTab === 'compare'
                  ? 'Upload two contracts and click Run Analysis to compare them'
                  : 'Upload a document and click Run Analysis to get started'
                }
              </p>
              <p className="text-slate-600 text-xs mt-1">Supports PDF, DOCX, and TXT files up to 20 MB</p>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 mt-16 py-6 text-center">
        <p className="text-xs text-slate-600">
          AI Legal Document Analyzer · Built with FastAPI + Groq · LLaMA 3.3 70B
        </p>
      </footer>
    </div>
  )
}
