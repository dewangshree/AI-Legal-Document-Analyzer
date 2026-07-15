import { useState } from 'react'
import { GitCompare, Plus, Minus, RefreshCw, MessageSquare } from 'lucide-react'

// ── Change type config ────────────────────────────────────────────────────────

const CHANGE_CONFIG = {
  Added: {
    icon: Plus,
    label: 'Added',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.3)',
    color: '#34d399',
    rowBg: 'rgba(16,185,129,0.03)',
  },
  Removed: {
    icon: Minus,
    label: 'Removed',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.3)',
    color: '#f87171',
    rowBg: 'rgba(239,68,68,0.03)',
  },
  Modified: {
    icon: RefreshCw,
    label: 'Modified',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.3)',
    color: '#fbbf24',
    rowBg: 'rgba(245,158,11,0.02)',
  },
}

const DEFAULT_CHANGE = CHANGE_CONFIG.Modified

// ── Significance config ───────────────────────────────────────────────────────

const SIG_CONFIG = {
  High:   { cls: 'badge-high-sig',   label: 'High Impact'   },
  Medium: { cls: 'badge-medium-sig', label: 'Medium Impact' },
  Low:    { cls: 'badge-low-sig',    label: 'Low Impact'    },
}

function normalizeSig(s) {
  if (!s) return 'Medium'
  const lower = s.toLowerCase()
  if (lower.includes('high')) return 'High'
  if (lower.includes('low')) return 'Low'
  return 'Medium'
}

function normalizeChange(s, c1, c2) {
  if (!s) {
    // Infer from content
    const m1 = (c1 || '').toLowerCase().includes('not present')
    const m2 = (c2 || '').toLowerCase().includes('not present')
    if (m1) return 'Added'
    if (m2) return 'Removed'
    return 'Modified'
  }
  const lower = s.toLowerCase()
  if (lower.includes('add')) return 'Added'
  if (lower.includes('remov')) return 'Removed'
  return 'Modified'
}

// ── Change type badge ─────────────────────────────────────────────────────────

function ChangeTypeBadge({ changeType }) {
  const cfg = CHANGE_CONFIG[changeType] || DEFAULT_CHANGE
  const Icon = cfg.icon
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function SigBadge({ significance }) {
  const key = normalizeSig(significance)
  const cfg = SIG_CONFIG[key] || SIG_CONFIG.Medium
  return <span className={cfg.cls}>{cfg.label}</span>
}

function CellText({ text }) {
  const isMissing = text?.toLowerCase().includes('not present')
  return (
    <span className={isMissing ? 'text-slate-500 italic text-sm' : 'text-slate-300 text-sm leading-relaxed'}>
      {text}
    </span>
  )
}

// ── Comparison summary banner ─────────────────────────────────────────────────

function CompareSummary({ summary }) {
  if (!summary) return null
  return (
    <div className="flex gap-3 p-4 mb-4 rounded-xl"
      style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
    >
      <MessageSquare className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-primary-400 mb-1 uppercase tracking-wider">Comparison Summary</p>
        <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
      </div>
    </div>
  )
}

// ── Change type filter bar ────────────────────────────────────────────────────

function FilterBar({ active, onChange, counts }) {
  const options = [
    { key: 'All',      label: `All (${counts.All})`,           color: 'text-slate-300'  },
    { key: 'Modified', label: `Modified (${counts.Modified})`, color: 'text-amber-400'  },
    { key: 'Added',    label: `Added (${counts.Added})`,       color: 'text-emerald-400'},
    { key: 'Removed',  label: `Removed (${counts.Removed})`,   color: 'text-red-400'    },
  ]
  return (
    <div className="flex gap-1 mb-4 flex-wrap">
      {options.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
            ${active === key
              ? 'bg-surface-400 text-white border border-white/20'
              : `bg-surface-600/50 border border-white/5 hover:border-white/15 ${color}`
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function CompareSection({ data }) {
  const allRows    = (data.comparison || []).map((row) => ({
    ...row,
    _changeType: normalizeChange(row.change_type, row.contract_1, row.contract_2),
  }))
  const summary    = data.summary || ''

  // Counts for filter bar
  const counts = {
    All:      allRows.length,
    Added:    allRows.filter((r) => r._changeType === 'Added').length,
    Removed:  allRows.filter((r) => r._changeType === 'Removed').length,
    Modified: allRows.filter((r) => r._changeType === 'Modified').length,
  }

  const [activeFilter, setActiveFilter] = useState('All')

  const visibleRows = activeFilter === 'All'
    ? allRows
    : allRows.filter((r) => r._changeType === activeFilter)

  const file1Name = data.file1 ? data.file1.replace(/\.[^.]+$/, '') : 'Contract 1'
  const file2Name = data.file2 ? data.file2.replace(/\.[^.]+$/, '') : 'Contract 2'

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="section-title">
          <span className="section-title-icon"><GitCompare className="w-4 h-4 text-primary-400" /></span>
          Contract Comparison
        </h2>
        <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
          {allRows.length} difference{allRows.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* AI comparison summary */}
      <CompareSummary summary={summary} />

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <FilterBar active={activeFilter} onChange={setActiveFilter} counts={counts} />

          {/* Legend */}
          <div className="flex gap-3 flex-wrap">
            {Object.entries(CHANGE_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs"
                  style={{ color: cfg.color }}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </div>
              )
            })}
          </div>
        </div>

        {/* Table header */}
        <div className="grid gap-0 border-b border-white/8"
          style={{ gridTemplateColumns: '1.8fr 2.8fr 2.8fr 1.1fr 1.2fr' }}
        >
          {[`Category`, file1Name, file2Name, 'Change', 'Impact'].map((h, i) => (
            <div key={i} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider bg-surface-600/60 truncate">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {visibleRows.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No {activeFilter !== 'All' ? activeFilter.toLowerCase() : ''} differences detected.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {visibleRows.map((row, i) => {
              const cfg = CHANGE_CONFIG[row._changeType] || DEFAULT_CHANGE
              return (
                <div
                  key={i}
                  className="grid gap-0 hover:bg-white/2 transition-colors"
                  style={{ gridTemplateColumns: '1.8fr 2.8fr 2.8fr 1.1fr 1.2fr', background: i % 2 !== 0 ? cfg.rowBg : undefined }}
                >
                  {/* Category */}
                  <div className="px-4 py-4 flex items-start">
                    <span className="text-sm font-semibold text-slate-300 leading-snug">{row.category}</span>
                  </div>

                  {/* Contract 1 */}
                  <div className="px-4 py-4 border-l border-white/5">
                    <CellText text={row.contract_1} />
                  </div>

                  {/* Contract 2 */}
                  <div className="px-4 py-4 border-l border-white/5">
                    <CellText text={row.contract_2} />
                  </div>

                  {/* Change type */}
                  <div className="px-3 py-4 border-l border-white/5 flex items-start">
                    <ChangeTypeBadge changeType={row._changeType} />
                  </div>

                  {/* Significance */}
                  <div className="px-3 py-4 border-l border-white/5 flex items-start">
                    <SigBadge significance={row.significance} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
