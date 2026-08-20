import { useState, useRef, useCallback } from 'react'
import { Card, SectionHeader } from '../../components/ui/Cards'
import { cn } from '../../utils/format'

const API = 'http://localhost:8080'

interface VideoMeta {
  session_id: string
  filename: string
  width: number
  height: number
  fps: number
  total_frames: number
  duration: number
}

export default function VideoDetectionPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [meta, setMeta] = useState<VideoMeta | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    const validExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
    if (!validExts.includes(ext)) {
      setError(`Unsupported format: ${ext}. Use MP4, AVI, MOV, MKV, or WebM.`)
      return
    }
    setFile(f)
    setError(null)
    setMeta(null)
    setStreaming(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API}/api/detection/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Upload failed')
      }
      const data: VideoMeta = await res.json()
      setMeta(data)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const startDetection = () => {
    if (!meta) return
    setStreaming(true)
  }

  const stopDetection = () => {
    setStreaming(false)
    // Force the img to stop loading
    if (imgRef.current) {
      imgRef.current.src = ''
    }
  }

  const reset = () => {
    stopDetection()
    setFile(null)
    setMeta(null)
    setError(null)
  }

  const streamUrl = meta ? `${API}/api/detection/stream/${meta.session_id}` : ''

  return (
    <>
      <SectionHeader
        title="AI Vehicle Detection"
        subtitle="Upload real traffic footage and watch YOLOv8 detect vehicles in real-time with live bounding boxes"
        kicker="REAL-TIME YOLOv8"
      />

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Left — Upload + Controls */}
        <div className="xl:col-span-4 space-y-5">
          <Card>
            <h3 className="text-sm font-bold text-ink-900 mb-4 flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white text-xs">📹</span>
              Upload Video
            </h3>

            {/* Drop Zone */}
            <div
              className={cn(
                'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                dragOver
                  ? 'border-indigo-400 bg-indigo-50/50 scale-[1.02]'
                  : file
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-ink-200 bg-ink-50/50 hover:border-indigo-300 hover:bg-indigo-50/30',
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/avi,video/mov,video/mkv,video/webm,.mp4,.avi,.mov,.mkv,.webm"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div>
                  <div className="text-3xl mb-2">🎬</div>
                  <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                  <p className="text-xs text-ink-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3 opacity-60">📁</div>
                  <p className="text-sm font-semibold text-ink-700">Drop a video file here</p>
                  <p className="text-xs text-ink-500 mt-1">or click to browse • MP4, AVI, MOV, MKV</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                ⚠ {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-4 flex gap-2">
              {!meta ? (
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-all',
                    file && !uploading
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200'
                      : 'bg-ink-300 cursor-not-allowed'
                  )}
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </span>
                  ) : '⬆ Upload & Analyze'}
                </button>
              ) : !streaming ? (
                <button
                  onClick={startDetection}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200 transition-all"
                >
                  ▶ Start Detection
                </button>
              ) : (
                <button
                  onClick={stopDetection}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-200 transition-all"
                >
                  ⏹ Stop
                </button>
              )}
              {(file || meta) && (
                <button
                  onClick={reset}
                  className="rounded-lg px-4 py-2.5 text-sm font-bold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-all"
                >
                  ↻ Reset
                </button>
              )}
            </div>
          </Card>

          {/* Video Metadata */}
          {meta && (
            <Card>
              <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center text-white text-xs">ℹ</span>
                Video Info
              </h3>
              <div className="space-y-2.5">
                {[
                  ['Filename', meta.filename],
                  ['Resolution', `${meta.width} × ${meta.height}`],
                  ['FPS', `${meta.fps}`],
                  ['Total Frames', meta.total_frames.toLocaleString()],
                  ['Duration', `${meta.duration}s`],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between text-sm">
                    <span className="text-ink-500 font-medium">{label}</span>
                    <span className="font-bold text-ink-900 tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Detection Legend */}
          <Card>
            <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center text-white text-xs">🎯</span>
              Detection Classes
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Car', color: '#22C55E', icon: '🚗' },
                { name: 'Motorcycle', color: '#3B82F6', icon: '🏍' },
                { name: 'Bus', color: '#F59E0B', icon: '🚌' },
                { name: 'Truck', color: '#EF4444', icon: '🚛' },
              ].map((cls) => (
                <div key={cls.name} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 ring-1 ring-ink-100">
                  <span className="text-lg">{cls.icon}</span>
                  <span className="text-xs font-bold text-ink-700">{cls.name}</span>
                  <span className="ml-auto h-3 w-3 rounded-full" style={{ background: cls.color }} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ink-500 leading-relaxed">
              Powered by <span className="font-bold text-indigo-600">YOLOv8 Nano</span> — real-time inference on uploaded footage. 
              Bounding boxes with confidence scores are drawn on each frame.
            </p>
          </Card>
        </div>

        {/* Right — Video Stream */}
        <div className="xl:col-span-8">
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {streaming && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                  <span className="text-sm font-bold text-ink-900">
                    {streaming ? 'YOLO Detection — LIVE' : 'Detection Preview'}
                  </span>
                </div>
                {streaming && (
                  <span className="chip bg-red-50 text-red-600 ring-1 ring-red-200 text-[10px] font-bold">
                    ● PROCESSING
                  </span>
                )}
              </div>
              {meta && (
                <span className="text-xs font-mono text-ink-500">
                  {meta.width}×{meta.height} @ {meta.fps}fps
                </span>
              )}
            </div>

            <div className="relative bg-slate-950 flex items-center justify-center" style={{ minHeight: '480px' }}>
              {streaming ? (
                <img
                  ref={imgRef}
                  src={streamUrl}
                  alt="YOLO Vehicle Detection Stream"
                  className="w-full h-auto"
                  style={{ maxHeight: '600px', objectFit: 'contain' }}
                />
              ) : meta ? (
                <div className="text-center py-20 px-8">
                  <div className="text-6xl mb-4 opacity-80">🎥</div>
                  <p className="text-lg font-bold text-white/90">Video Ready for Detection</p>
                  <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
                    <span className="font-mono text-emerald-400">{meta.filename}</span> uploaded successfully.
                    Click <span className="font-bold text-emerald-400">"Start Detection"</span> to begin YOLOv8 vehicle detection.
                  </p>
                  <button
                    onClick={startDetection}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-emerald-500/30 transition-all hover:scale-105"
                  >
                    ▶ Start Detection
                  </button>
                </div>
              ) : (
                <div className="text-center py-20 px-8">
                  <div className="text-6xl mb-4 opacity-40">🔍</div>
                  <p className="text-lg font-bold text-white/70">No Video Uploaded</p>
                  <p className="text-sm text-white/40 mt-2 max-w-sm mx-auto">
                    Upload a traffic video clip to start real-time AI vehicle detection using YOLOv8.
                  </p>
                </div>
              )}

              {/* Streaming Overlay */}
              {streaming && (
                <>
                  <span className="absolute left-3 top-3 chip bg-black/60 text-white ring-white/20 text-[10px] font-bold backdrop-blur-sm">
                    YOLOv8n · Vehicle Detection
                  </span>
                  <span className="absolute right-3 top-3 chip bg-red-600/90 text-white ring-red-400/30 text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    LIVE DETECTION
                  </span>
                </>
              )}
            </div>

            {/* Bottom Stats Bar */}
            {meta && (
              <div className="grid grid-cols-4 divide-x divide-ink-100 border-t border-ink-100">
                {[
                  ['MODEL', 'YOLOv8 Nano', '#6366F1'],
                  ['CONFIDENCE', '≥ 40%', '#10B981'],
                  ['STATUS', streaming ? 'DETECTING' : 'READY', streaming ? '#EF4444' : '#F59E0B'],
                  ['CLASSES', '4 Vehicle Types', '#8B5CF6'],
                ].map(([k, v, c]) => (
                  <div key={k as string} className="px-4 py-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">{k}</div>
                    <div className="mt-0.5 text-sm font-extrabold tracking-tight" style={{ color: c as string }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
