"use client"

import { useState, useEffect } from "react"
import { Save } from "lucide-react"

export function AutoSaveIndicator() {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  let previousSize = 0 // Declare previousSize here

  // Monitorar mudanças no localStorage
  useEffect(() => {
    const handleStorage = () => {
      setSaving(true)
      setTimeout(() => {
        setSaving(false)
        setLastSaved(new Date())
      }, 1000)
    }

    // Adicionar listener para o evento de storage
    window.addEventListener("storage", handleStorage)

    // Também monitorar mudanças no localStorage através de um intervalo
    const interval = setInterval(() => {
      try {
        const currentSize = JSON.stringify(localStorage).length
        if (currentSize !== previousSize) {
          previousSize = currentSize
          handleStorage()
        }
      } catch (error) {
        console.error("Erro ao verificar tamanho do localStorage:", error)
      }
    }, 5000)

    try {
      previousSize = JSON.stringify(localStorage).length
    } catch (error) {
      console.error("Erro ao inicializar tamanho do localStorage:", error)
    }

    return () => {
      window.removeEventListener("storage", handleStorage)
      clearInterval(interval)
    }
  }, [])

  // Simular salvamento inicial
  useEffect(() => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setLastSaved(new Date())
    }, 1000)
  }, [])

  // Adicione esta função após o último useEffect
  const clearLocalCache = () => {
    setSaving(true)
    try {
      // Apenas limpa o cache de tamanho, não os dados reais
      previousSize = JSON.stringify(localStorage).length
    } catch (error) {
      console.error("Erro ao limpar cache local:", error)
    }
    setTimeout(() => {
      setSaving(false)
      setLastSaved(new Date())
    }, 1000)
  }

  if (!lastSaved) return null

  return (
    <div className="fixed bottom-16 right-4 bg-white dark:bg-gray-800 shadow-md rounded-md p-2 text-sm flex items-center gap-2 z-20">
      {saving ? (
        <>
          <Save className="h-4 w-4 animate-pulse text-yellow-500" />
          <span>Salvando...</span>
        </>
      ) : (
        <>
          <Save className="h-4 w-4 text-green-500" />
          <span>Salvo às {lastSaved.toLocaleTimeString()}</span>
        </>
      )}
    </div>
  )
}

