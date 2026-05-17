'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Sparkles, Loader2 } from 'lucide-react'
import { BloqueEditorPayload } from '@/types'

interface AIGeneratorModalProps {
  nombreCliente: string
  empresaCliente: string
  onGenerate: (bloques: BloqueEditorPayload[]) => void
}

export function AIGeneratorModal({ nombreCliente, empresaCliente, onGenerate }: AIGeneratorModalProps) {
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState('')

  // Campos de formulario
  const [rubro, setRubro] = useState('')
  const [tamanioEmpresa, setTamanioEmpresa] = useState('')
  const [tipoServicio, setTipoServicio] = useState('')
  const [objetivoDiagnostico, setObjetivoDiagnostico] = useState('')
  const [notasAdicionales, setNotasAdicionales] = useState('')

  const handleGenerate = async () => {
    setIsGenerating(true)
    setStreamText('')
    setError('')

    try {
      const res = await fetch('/api/ai/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_cliente: nombreCliente,
          empresa_cliente: empresaCliente,
          rubro,
          tamanio_empresa: tamanioEmpresa,
          tipo_servicio: tipoServicio,
          objetivo_diagnostico: objetivoDiagnostico,
          notas_adicionales: notasAdicionales,
        }),
      })

      if (!res.ok) {
        throw new Error('Error al conectar con la IA')
      }

      if (!res.body) throw new Error('No body returned')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let accumulated = ''

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        accumulated += chunkValue
        setStreamText(accumulated)
      }

      try {
        const parsed = JSON.parse(accumulated)
        if (!parsed.bloques || !Array.isArray(parsed.bloques)) {
          throw new Error('Formato JSON inválido')
        }

        // Add UUIDs if missing
        const bloquesConIds = parsed.bloques.map((b: any, i: number) => ({
          ...b,
          id: b.id || crypto.randomUUID(),
          orden: i,
          preguntas: (b.preguntas || []).map((p: any, j: number) => ({
            ...p,
            id: p.id || crypto.randomUUID(),
            orden: j,
          })),
        }))

        onGenerate(bloquesConIds)
        setOpen(false)
      } catch (parseErr) {
        console.error('Error parseando JSON:', parseErr, accumulated)
        setError('Claude no devolvió un JSON válido. Inténtalo de nuevo.')
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setOpen(true)}>
        <Sparkles className="mr-2 h-4 w-4" />
        Generar con IA
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar cuestionario con IA</DialogTitle>
          <DialogDescription>
            Completa el contexto para que Claude genere un cuestionario a medida.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 font-medium">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generando cuestionario...
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm whitespace-pre-wrap font-mono h-[300px] overflow-y-auto">
              {streamText || 'Iniciando conexión con Claude...'}
            </pre>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={nombreCliente} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={empresaCliente} disabled className="bg-gray-50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rubro">Rubro / Industria <span className="text-red-500">*</span></Label>
              <Input 
                id="rubro" 
                placeholder="Ej. Software B2B, Logística, Consultoría" 
                value={rubro} 
                onChange={e => setRubro(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tamanio">Tamaño de la empresa</Label>
                <Input 
                  id="tamanio" 
                  placeholder="Ej. 50-100 empleados" 
                  value={tamanioEmpresa} 
                  onChange={e => setTamanioEmpresa(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="servicio">Servicio de BARCO</Label>
                <Input 
                  id="servicio" 
                  placeholder="Ej. Rebranding completo" 
                  value={tipoServicio} 
                  onChange={e => setTipoServicio(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo principal del diagnóstico</Label>
              <Textarea 
                id="objetivo" 
                placeholder="Ej. Entender por qué están perdiendo clientes frente a competidores más baratos..." 
                value={objetivoDiagnostico} 
                onChange={e => setObjetivoDiagnostico(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas adicionales</Label>
              <Textarea 
                id="notas" 
                placeholder="Cualquier otro detalle relevante para Claude..." 
                value={notasAdicionales} 
                onChange={e => setNotasAdicionales(e.target.value)} 
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}

            <div className="pt-4 flex justify-end">
              <Button onClick={handleGenerate} disabled={!rubro}>
                Generar Preguntas
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      </Dialog>
    </>
  )
}
