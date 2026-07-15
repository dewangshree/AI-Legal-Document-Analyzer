export default function Spinner({ text = 'Analyzing document…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5 animate-fade-in">
      {/* Layered spinner rings */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary-900" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-400 animate-spin" />
        <div
          className="absolute inset-2 rounded-full border-4 border-transparent border-t-violet-400 animate-spin"
          style={{ animationDuration: '1.4s', animationDirection: 'reverse' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-primary-400 animate-pulse" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-slate-300">{text}</p>
        <p className="text-xs text-slate-500 mt-1">Powered by Groq · LLaMA 3.3 70B</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
