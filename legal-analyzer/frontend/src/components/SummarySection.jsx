import { Sparkles, FileText, Hash, Calendar, Users, CreditCard, XCircle, BookOpen, AlertTriangle } from 'lucide-react'

/* Map section headers to icons */
const SECTION_ICONS = {
  Purpose:                     { icon: BookOpen,      color: 'text-violet-400' },
  'Parties Involved':          { icon: Users,         color: 'text-blue-400'   },
  'Important Dates':           { icon: Calendar,      color: 'text-amber-400'  },
  'Key Obligations':           { icon: Hash,          color: 'text-emerald-400'},
  Termination:                 { icon: XCircle,       color: 'text-red-400'    },
  'Payment Terms':             { icon: CreditCard,    color: 'text-green-400'  },
  'Plain English Explanation': { icon: FileText,      color: 'text-primary-400'},
  // Generic doc types
  Overview:                    { icon: BookOpen,      color: 'text-violet-400' },
  'Key Skills':                { icon: Hash,          color: 'text-emerald-400'},
  Experience:                  { icon: Calendar,      color: 'text-blue-400'   },
  'Key Findings':              { icon: Sparkles,      color: 'text-amber-400'  },
}

function parseSummary(text) {
  /* Split on bold markdown headings like **Purpose** or numbered **1. Purpose** */
  const lines = text.split('\n')
  const sections = []
  let current = null

  for (const line of lines) {
    const headerMatch = line.match(/^\*\*(?:\d+\.\s+)?(.+?)\*\*/)
    if (headerMatch) {
      if (current) sections.push(current)
      current = { title: headerMatch[1].trim(), lines: [] }
    } else if (current) {
      const trimmed = line.replace(/^[-•*]\s*/, '').trim()
      if (trimmed) current.lines.push(trimmed)
    }
  }
  if (current) sections.push(current)
  return sections
}

/* Badge shown when the document is NOT a legal contract */
function DocTypeBadge({ docType }) {
  return (
    <div className="flex items-center gap-2 p-3 mb-5 rounded-xl border"
      style={{
        background: 'rgba(245,158,11,0.08)',
        borderColor: 'rgba(245,158,11,0.25)',
      }}
    >
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <p className="text-xs text-amber-300">
        <span className="font-semibold">Document type detected: {docType}.</span>{' '}
        This does not appear to be a legal contract. A general summary has been generated instead.
      </p>
    </div>
  )
}

export default function SummarySection({ data }) {
  const sections = parseSummary(data.summary || '')
  const isLegal = data.is_legal_contract !== false  // true by default for backward-compat
  const docType = data.doc_type || 'Legal Contract'

  const SectionGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map((sec, idx) => {
        const meta = SECTION_ICONS[sec.title] || { icon: FileText, color: 'text-slate-400' }
        const Icon = meta.icon
        const isWide = sec.title === 'Plain English Explanation' || sec.title === 'Overview'

        return (
          <div
            key={idx}
            className={`rounded-xl p-4 border border-white/5 bg-surface-600/50 hover:border-white/10 transition-all duration-200
              ${isWide ? 'md:col-span-2' : ''}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-surface-500 flex items-center justify-center">
                <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">{sec.title}</h3>
            </div>

            {sec.lines.length === 1 ? (
              <p className="text-sm text-slate-400 leading-relaxed">{sec.lines[0]}</p>
            ) : (
              <ul className="space-y-1.5">
                {sec.lines.map((line, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-400 leading-relaxed">
                    <span className="text-primary-500 mt-0.5 flex-shrink-0">▸</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="glass-card p-6 animate-slide-up">
      <h2 className="section-title mb-5">
        <span className="section-title-icon"><Sparkles className="w-4 h-4 text-primary-400" /></span>
        {isLegal ? 'AI Summary' : `Document Summary`}
      </h2>

      {!isLegal && <DocTypeBadge docType={docType} />}

      {sections.length === 0 ? (
        /* Fallback: raw text */
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{data.summary}</p>
      ) : (
        <SectionGrid />
      )}
    </div>
  )
}
