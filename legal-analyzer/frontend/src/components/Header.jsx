import { Scale, Sparkles, Shield, FileText } from 'lucide-react'

export default function Header() {
  return (
    <header className="relative border-b border-white/5 bg-surface-800/60 backdrop-blur-md sticky top-0 z-50">
      {/* Subtle glow line at top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), rgba(139,92,246,0.6), transparent)' }}
      />

      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center shadow-glow">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-surface-800 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">
              <span className="text-gradient">AI Legal</span>{' '}
              <span className="text-slate-100">Analyzer</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
              Powered by Groq · LLaMA 3.3 70B
            </p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="hidden md:flex items-center gap-2">
          {[
            { icon: Sparkles, label: 'AI Summary' },
            { icon: FileText, label: 'Clause Extraction' },
            { icon: Shield, label: 'Risk Detection' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-600/60 border border-white/5 text-slate-400 text-xs font-medium"
            >
              <Icon className="w-3 h-3 text-primary-400" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}
