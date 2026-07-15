import { Shield, AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react'

const SEVERITY_CONFIG = {
  High: {
    bg: 'bg-red-500/8 border-red-500/20',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    dot: 'bg-red-400',
    label: 'High Risk',
  },
  Medium: {
    bg: 'bg-amber-500/8 border-amber-500/20',
    icon: Info,
    iconColor: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'Medium Risk',
  },
  Low: {
    bg: 'bg-emerald-500/8 border-emerald-500/20',
    icon: CheckCircle,
    iconColor: 'text-emerald-400',
    dot: 'bg-emerald-400',
    label: 'Low Risk',
  },
}

function normalize(s) {
  if (!s) return 'Medium'
  const lower = s.toLowerCase()
  if (lower.includes('high')) return 'High'
  if (lower.includes('low')) return 'Low'
  return 'Medium'
}

// ── Overall Risk Score Gauge ──────────────────────────────────────────────────

function scoreLabel(score) {
  if (score >= 75) return { text: 'Very High Risk', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' }
  if (score >= 50) return { text: 'High Risk',      color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' }
  if (score >= 30) return { text: 'Medium Risk',    color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' }
  return             { text: 'Low Risk',            color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' }
}

function RiskScoreGauge({ score }) {
  const lbl = scoreLabel(score)
  const clampedScore = Math.max(0, Math.min(100, score))
  const circumference = 2 * Math.PI * 36 // r=36
  const offset = circumference - (clampedScore / 100) * circumference

  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-5 mb-5"
      style={{ background: lbl.bg, border: `1px solid ${lbl.border}` }}
    >
      {/* SVG donut gauge */}
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={lbl.color}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color: lbl.color }}>{clampedScore}</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Overall Contract Risk Score</p>
        <p className="text-xl font-bold" style={{ color: lbl.color }}>{lbl.text}</p>
        <p className="text-xs text-slate-500 mt-1">Score {clampedScore}/100 — based on identified risk factors</p>
      </div>
    </div>
  )
}

// ── Severity count stats ──────────────────────────────────────────────────────

function RiskStats({ risks }) {
  const counts = { High: 0, Medium: 0, Low: 0 }
  risks.forEach((r) => { counts[normalize(r.severity)]++ })

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {[
        { key: 'High',   label: 'High',   bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.2)',    text: '#f87171' },
        { key: 'Medium', label: 'Medium', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.2)',   text: '#fbbf24' },
        { key: 'Low',    label: 'Low',    bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.2)',   text: '#34d399' },
      ].map(({ key, label, bg, border, text }) => (
        <div key={key} className="rounded-xl p-3 text-center"
          style={{ background: bg, border: `1px solid ${border}` }}
        >
          <p className="text-2xl font-bold" style={{ color: text }}>{counts[key]}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label} Risk</p>
        </div>
      ))}
    </div>
  )
}

// ── Individual risk card ──────────────────────────────────────────────────────

function RiskCard({ risk }) {
  const sev = normalize(risk.severity)
  const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.Medium
  const Icon = cfg.icon

  return (
    <div className={`rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${cfg.bg}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-surface-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-100">{risk.title}</h3>
            <span className={sev === 'High' ? 'badge-high' : sev === 'Low' ? 'badge-low' : 'badge-medium'}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
        </div>
      </div>

      <div className="pl-12 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Why it's a risk</p>
          <p className="text-sm text-slate-400 leading-relaxed">{risk.reason}</p>
        </div>
        <div className="flex gap-2 items-start p-3 rounded-lg bg-surface-600/50 border border-white/5">
          <Lightbulb className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary-400 mb-0.5">Recommendation</p>
            <p className="text-xs text-slate-400 leading-relaxed">{risk.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function RisksSection({ data }) {
  const risks      = data.risks || []
  const riskScore  = typeof data.risk_score === 'number' ? data.risk_score : null

  const highRisks   = risks.filter((r) => normalize(r.severity) === 'High')
  const mediumRisks = risks.filter((r) => normalize(r.severity) === 'Medium')
  const lowRisks    = risks.filter((r) => normalize(r.severity) === 'Low')
  const ordered     = [...highRisks, ...mediumRisks, ...lowRisks]

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">
          <span className="section-title-icon"><Shield className="w-4 h-4 text-primary-400" /></span>
          Risk Analysis
        </h2>
      </div>

      <div className="glass-card p-5">
        {/* Overall score gauge — shown only when backend provides it */}
        {riskScore !== null && <RiskScoreGauge score={riskScore} />}

        {/* Per-severity counts */}
        <RiskStats risks={risks} />

        {ordered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No significant risks detected.</div>
        ) : (
          <div className="space-y-3">
            {ordered.map((risk, i) => <RiskCard key={i} risk={risk} />)}
          </div>
        )}
      </div>
    </div>
  )
}
