import { useRef, useState } from 'react'
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react'

const ACCEPTED = '.pdf,.docx,.txt'
const LABEL_MAP = { '.pdf': 'PDF', '.docx': 'DOCX', '.txt': 'TXT' }

function getExt(filename) {
  return filename ? '.' + filename.split('.').pop().toLowerCase() : ''
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function UploadZone({ label = 'Upload Document', value, onChange, id = 'file-upload' }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    onChange(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const ext = value ? getExt(value.name) : ''

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </label>

      {value ? (
        /* ── File selected state ── */
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-fade-in">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{value.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {LABEL_MAP[ext] || 'Document'} · {formatBytes(value.size)}
            </p>
          </div>
          <button
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = '' }}
            className="w-7 h-7 rounded-lg bg-surface-500 hover:bg-surface-400 flex items-center justify-center transition-colors"
            aria-label="Remove file"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      ) : (
        /* ── Drop zone state ── */
        <div
          className={`upload-zone py-10 px-6 ${drag ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          aria-label={`${label} drop zone`}
        >
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 mx-auto">
            {drag
              ? <FileText className="w-7 h-7 text-primary-400 animate-bounce" />
              : <Upload className="w-7 h-7 text-primary-400" />
            }
          </div>

          <p className="text-sm font-semibold text-slate-300">
            {drag ? 'Drop it here!' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Supports PDF, DOCX, TXT · Max 20 MB</p>
        </div>
      )}
    </div>
  )
}
