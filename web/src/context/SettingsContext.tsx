import React, { createContext, useContext, useState, useEffect } from 'react'

interface SettingsContextType {
  volume: number
  setVolume: (v: number) => void
  promotionSetting: 'auto-queen' | 'selective'
  setPromotionSetting: (s: 'auto-queen' | 'selective') => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [volume, setVolumeState] = useState<number>(0.5)
  const [promotionSetting, setPromotionState] = useState<'auto-queen' | 'selective'>('auto-queen')

  useEffect(() => {
    try {
      const vol = localStorage.getItem('chessVolume')
      if (vol !== null) setVolumeState(parseFloat(vol))
      
      const promo = localStorage.getItem('chessPromotionSetting')
      if (promo === 'auto-queen' || promo === 'selective') setPromotionState(promo)
    } catch (e) {
      console.warn('Failed to load settings from storage', e)
    }
  }, [])

  const setVolume = (v: number) => {
    setVolumeState(v)
    try {
      localStorage.setItem('chessVolume', v.toString())
    } catch (e) {
      console.error(e)
    }
  }

  const setPromotionSetting = (s: 'auto-queen' | 'selective') => {
    setPromotionState(s)
    try {
      localStorage.setItem('chessPromotionSetting', s)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <SettingsContext.Provider value={{ volume, setVolume, promotionSetting, setPromotionSetting }}>
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
