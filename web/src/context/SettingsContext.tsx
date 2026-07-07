import React, { createContext, useContext, useState, useMemo, useCallback } from 'react'

interface SettingsContextType {
  volume: number
  setVolume: (v: number) => void
  promotionSetting: 'auto-queen' | 'selective'
  setPromotionSetting: (s: 'auto-queen' | 'selective') => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lazy initialisers: read localStorage synchronously on first render,
  // avoiding an extra render cycle and any value-flash for consumers.
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const vol = localStorage.getItem('chessVolume')
      return vol !== null ? parseFloat(vol) : 0.5
    } catch {
      return 0.5
    }
  })

  const [promotionSetting, setPromotionState] = useState<'auto-queen' | 'selective'>(() => {
    try {
      const promo = localStorage.getItem('chessPromotionSetting')
      return promo === 'auto-queen' || promo === 'selective' ? promo : 'auto-queen'
    } catch {
      return 'auto-queen'
    }
  })

  // Stable function references via useCallback — prevents consumers that
  // list these as effect dependencies from firing on every provider render.
  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
    try {
      localStorage.setItem('chessVolume', v.toString())
    } catch (e) {
      console.error(e)
    }
  }, [])

  const setPromotionSetting = useCallback((s: 'auto-queen' | 'selective') => {
    setPromotionState(s)
    try {
      localStorage.setItem('chessPromotionSetting', s)
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Memoised value object — consumers only re-render when state changes,
  // not on every provider render cycle.
  const value = useMemo(() => ({
    volume,
    setVolume,
    promotionSetting,
    setPromotionSetting,
  }), [volume, setVolume, promotionSetting, setPromotionSetting])

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
