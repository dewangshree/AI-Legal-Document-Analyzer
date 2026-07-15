import { useState } from 'react'
import {
  FileText, ChevronDown, Lock, XCircle, CreditCard, AlertTriangle,
  Shield, Lightbulb, Globe, Swords, Wind, Slash, Hash,
  RefreshCw, Briefcase, LayoutGrid, List,
} from 'lucide-react'

// ── Icon map by category name ─────────────────────────────────────────────────

const CATEGORY_META = {
  Confidentiality:       { icon: Lock,          bg: 'bg-violet-500/15', color: 'text-violet-400',  border: 'border-violet-500/20' },
  Termination:           { icon: XCircle,       bg: 'bg-red-500/15',    color: 'text-red-400',     border: 'border-red-500/20'    },
  Payment:               { icon: CreditCard,    bg: 'bg-green-500/15',  color: 'text-green-400',   border: 'border-green-500/20'  },
  Liability:             { icon: AlertTriangle, bg: 'bg-amber-500/15',  color: 'text-amber-400',   border: 'border-amber-500/20'  },
  Indemnity:             { icon: Shield,        bg: 'bg-orange-500/15', color: 'text-orange-400',  border: 'border-orange-500/20' },
  'Governing Law':       { icon: Globe,         bg: 'bg-blue-500/15',   color: 'text-blue-400',    border: 'border-blue-500/20'   },
  'Dispute Resolution':  { icon: Swords,        bg: 'bg-pink-500/15',   color: 'text-pink-400',    border: 'border-pink-500/20'   },
  Renewal:               { icon: RefreshCw,     bg: 'bg-teal-500/15',   color: 'text-teal-400',    border: 'border-teal-500/20'   },
  Obligations:           { icon: Briefcase,     bg: 'bg-indigo-500/15', color: 'text-indigo-400',  border: 'border-indigo-500/20' },
  'Intellectual Property':{ icon: Lightbulb,   bg: 'bg-yellow-500/15', color: 'text-yellow-400',  border: 'border-yellow-500/20' },
  'Force Majeure':       { icon: Wind,          bg: 'bg-cyan-500/15',   color: 'text-cyan-400',    border: 'border-cyan-500/20'   },
  'Non-Compete':         { icon: Slash,         bg: 'bg-rose-500/15',   color: 'text-rose-400',    border: 'border-rose-500/20'   },
  General:               { icon: Hash,          bg: 'bg-primary-500/15',color: 'text-primary-400', border: 'border-primary-500/20'},
}

// Fuzzy match a clause_name or category to one of our known categories
function resolveCategory(clause) {
  const cat = (clause.category || '').trim()
  if (CATEGORY_META[cat]) return cat

  // Try matching by clause_name if category is missing/unknown
  const name = (clause.clause_name || '').toLowerCase()
  for (const key of Object.keys(CATEGORY_META)) {
    if (name.includes(key.toLowerCase())) return key
  }
  return 'General'
}

function getCategoryMeta(categoryKey) {
  return CATEGORY_META[categoryKey] || CATEGORY_META.General
}

// ── Single clause accordion ───────────────────────────────────────────────────

function ClauseCard({ clause, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const catKey = resolveCategory(clause)
  const meta = getCategoryMeta(catKey)
  const Icon = meta.icon

  return (
    <div className={`rounded-xl overflow-hidden border ${open ? meta.border : 'border-white/5'} bg-surface-700/40 transition-all duration-200`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/2 transition-colors"
        aria-expanded={open}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">{clause.clause_name}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className="accordion-content"
        style={{ maxHeight: open ? '600px' : '0', opacity: open ? 1 : 0 }}
      >
        <div className="px-4 pb-4">
          <div className="border-t border-white/5 pt-3">
            <p className="text-sm text-slate-400 leading-relaxed">{clause.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Category group ────────────────────────────────────────────────────────────

function CategoryGroup({ category, clauses }) {
  const [groupOpen, setGroupOpen] = useState(true)
  const meta = getCategoryMeta(category)
  const Icon = meta.icon

  return (
    <div className={`glass-card overflow-hidden border ${meta.border}`}>
      {/* Group header */}
      <button
        onClick={() => setGroupOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/2 transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <span className={`text-sm font-bold flex-1 ${meta.color}`}>{category}</span>
        <span className="text-xs font-semibold text-slate-500 mr-2">{clauses.length} clause{clauses.length !== 1 ? 's' : ''}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${groupOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Clauses within this group */}
      <div
        className="accordion-content"
        style={{ maxHeight: groupOpen ? `${clauses.length * 200}px` : '0', opacity: groupOpen ? 1 : 0 }}
      >
        <div className="px-3 pb-3 space-y-2 border-t border-white/5">
          <div className="pt-2" />
          {clauses.map((clause, i) => (
            <ClauseCard key={i} clause={clause} defaultOpen={i === 0 && clauses.length === 1} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Flat list view ────────────────────────────────────────────────────────────

function FlatList({ clauses }) {
  return (
    <div className="space-y-2">
      {clauses.map((clause, i) => (
        <ClauseCard key={i} clause={clause} defaultOpen={i < 2} />
      ))}
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  'Payment', 'Termination', 'Confidentiality', 'Liability', 'Indemnity',
  'Governing Law', 'Dispute Resolution', 'Renewal', 'Obligations',
  'Intellectual Property', 'Force Majeure', 'Non-Compete', 'General',
]

export default function ClausesSection({ data }) {
  const clauses = data.clauses || []
  const [viewMode, setViewMode] = useState('grouped') // 'grouped' | 'flat'

  // Group clauses by category
  const grouped = {}
  for (const clause of clauses) {
    const cat = resolveCategory(clause)
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(clause)
  }

  // Sort categories by our preferred order
  const sortedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  // Category count pills for the header
  const categoryCount = sortedCategories.length

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="section-title">
          <span className="section-title-icon"><FileText className="w-4 h-4 text-primary-400" /></span>
          Clause Extraction
        </h2>

        <div className="flex items-center gap-2">
          {/* Stats */}
          <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
            {clauses.length} clause{clauses.length !== 1 ? 's' : ''}
          </span>
          <span className="badge" style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
            {categoryCount} categor{categoryCount !== 1 ? 'ies' : 'y'}
          </span>

          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              onClick={() => setViewMode('grouped')}
              title="Grouped view"
              className={`p-2 transition-colors ${viewMode === 'grouped' ? 'bg-primary-600 text-white' : 'bg-surface-600 text-slate-400 hover:text-slate-200'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('flat')}
              title="Flat list"
              className={`p-2 transition-colors border-l border-white/10 ${viewMode === 'flat' ? 'bg-primary-600 text-white' : 'bg-surface-600 text-slate-400 hover:text-slate-200'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {clauses.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-500">No clauses detected.</div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-3">
          {sortedCategories.map((cat) => (
            <CategoryGroup key={cat} category={cat} clauses={grouped[cat]} />
          ))}
        </div>
      ) : (
        <FlatList clauses={clauses} />
      )}
    </div>
  )
}
