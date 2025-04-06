"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { clearSupabaseCache } from "@/lib/supabase"
import { useAppContext } from "@/contexts/AppContext"

export function CacheCleaner() {
  const [isClearing, setIsClearing] = useState(false)
  const [success, setSuccess] = useState<boolean | null>(null)
  const [message, setMessage] = useState("")
  const [options, setOptions] = useState({
    clearLocalStorage: true,
    clearSupabaseCache: true,
    reloadContext: true,
  })
  const { clearContextCache } = useAppContext()

  const handleClearCache = async () => {
    try {
      setIsClearing(true)
      setSuccess(null)
      setMessage("Limpando cache...")

      // Limpar localStorage
      if (options.clearLocalStorage) {
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && !key.startsWith("persist:")) {
            // Não remover dados persistentes importantes
            keysToRemove.push(key)
          }
        }

        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key)
          } catch (error) {
            console.error(`Erro ao remover chave ${key} do localStorage:`, error)
          }
        })
      }

      // Limpar cache do Supabase
      if (options.clearSupabaseCache) {
        clearSupabaseCache()
      }

      // Recarregar contexto
      if (options.reloadContext) {
        await clearContextCache()
      }

      setSuccess(true)
      setMessage("Cache limpo com sucesso! Recarregue a página para aplicar as alterações.")
    } catch (error) {
      console.error("Erro ao limpar cache:", error)
      setSuccess(false)
      setMessage(`Erro ao limpar cache: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Limpeza de Cache</CardTitle>
        <CardDescription>
          Use esta ferramenta para resolver problemas de cache sem precisar limpar todo o histórico do navegador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="clearLocalStorage"
            checked={options.clearLocalStorage}
            onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, clearLocalStorage: checked === true }))}
          />
          <label
            htmlFor="clearLocalStorage"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Limpar localStorage
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="clearSupabaseCache"
            checked={options.clearSupabaseCache}
            onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, clearSupabaseCache: checked === true }))}
          />
          <label
            htmlFor="clearSupabaseCache"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Limpar cache do Supabase
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="reloadContext"
            checked={options.reloadContext}
            onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, reloadContext: checked === true }))}
          />
          <label
            htmlFor="reloadContext"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Recarregar dados do contexto
          </label>
        </div>

        {success !== null && (
          <div className={`p-3 rounded-md ${success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {message}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleClearCache}
          disabled={isClearing || (!options.clearLocalStorage && !options.clearSupabaseCache && !options.reloadContext)}
          className="w-full"
        >
          {isClearing ? "Limpando..." : "Limpar Cache"}
        </Button>
      </CardFooter>
    </Card>
  )
}

