import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

interface DemoModeContextValue {
  demoMode: boolean
  toggleDemoMode: () => void
  setDemoMode: (v: boolean) => void
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined)

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const raw = localStorage.getItem('rw_demo_mode')
    if (raw) return raw === 'true'
    return true
  })

  useEffect(() => {
    localStorage.setItem('rw_demo_mode', String(demoMode))
  }, [demoMode])

  const value = useMemo<DemoModeContextValue>(() => ({
    demoMode,
    toggleDemoMode: () => setDemoMode((v) => !v),
    setDemoMode,
  }), [demoMode])

  return (
    <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
  )
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext)
  if (!ctx) throw new Error('useDemoMode must be used inside DemoModeProvider')
  return ctx
}
