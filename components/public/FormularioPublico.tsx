'use client'

import { useState } from 'react'
import { BloquePublico } from './BloquePublico'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function FormularioPublico({ form }: { form: any }) {
  const router = useRouter()
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)
  const [globalSaveState, setGlobalSaveState] = useState<'' | 'saving' | 'saved'>('')
  const bloques = form.bloques || []

  const allPreguntas = bloques.flatMap((b: any) => b.preguntas || [])
  const totalPreguntas = allPreguntas.length

  const [localAnswers, setLocalAnswers] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {}
    allPreguntas.forEach((p: any) => {
      if (p.respuestas && p.respuestas.length > 0) {
        initial[p.id] = p.respuestas[0]
      }
    })
    return initial
  })

  const answeredCount = Object.values(localAnswers).filter((r: any) => {
    if (r.valor_texto?.trim()) return true
    if (r.valor_opciones?.length > 0) return true
    if (r.archivos?.length > 0) return true
    return false
  }).length

  const progress = totalPreguntas > 0 ? (answeredCount / totalPreguntas) * 100 : 0

  const handleNext = () => {
    if (currentBlockIndex < bloques.length - 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setCurrentBlockIndex(curr => curr + 1)
    }
  }

  const handlePrev = () => {
    if (currentBlockIndex > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setCurrentBlockIndex(curr => curr - 1)
    }
  }

  const handleFinish = async () => {
    const missing = allPreguntas.filter((p: any) => {
      if (p.obligatoria === false) return false // Es opcional
      const r = localAnswers[p.id]
      if (!r) return true
      if (r.valor_texto?.trim()) return false
      if (r.valor_opciones?.length > 0) return false
      if (r.archivos?.length > 0) return false
      return true
    })

    if (missing.length > 0) {
      alert(`Aún te faltan completar ${missing.length} preguntas.\nRevisa el progreso de las secciones en el menú lateral.`)
      return
    }

    setIsFinishing(true)
    try {
      const res = await fetch(`/api/public/${form.id}/completar`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Error al finalizar')
      
      router.refresh()
    } catch (err) {
      alert("Hubo un error al enviar el formulario. Intenta de nuevo.")
    } finally {
      setIsFinishing(false)
    }
  }

  const handleQuestionUpdate = (preguntaId: string, hasAnswer: boolean, savingState: 'saving' | 'saved', payload?: any) => {
    if (payload) {
      setLocalAnswers(prev => ({
        ...prev,
        [preguntaId]: { ...(prev[preguntaId] || {}), ...payload }
      }))
    }
    
    setGlobalSaveState(savingState)
    if (savingState === 'saved') {
      setTimeout(() => {
        setGlobalSaveState(prev => prev === 'saved' ? '' : prev)
      }, 3000)
    }
  }

  if (bloques.length === 0) {
    return <div className="text-center p-8">Este formulario no tiene preguntas configuradas.</div>
  }

  const currentBlock = bloques[currentBlockIndex]

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Sidebar Menu */}
      <div className="w-full md:w-64 shrink-0 space-y-1 mb-8 md:mb-0 md:sticky md:top-8">
        <div className="mb-12 px-3">
          <img src="/logo-barco-dark.svg" alt="BARCO" className="h-6" />
        </div>

        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-3">Secciones del Diagnóstico</h3>
        <div className="space-y-1">
          {bloques.map((b: any, i: number) => {
            const numQuestions = b.preguntas?.length || 0
            const numAnswered = b.preguntas?.filter((p: any) => {
              const r = localAnswers[p.id]
              if (!r) return false
              if (r.valor_texto?.trim()) return true
              if (r.valor_opciones?.length > 0) return true
              if (r.archivos?.length > 0) return true
              return false
            }).length || 0

            let statusColor = "text-gray-400"
            if (numAnswered > 0 && numAnswered < numQuestions) statusColor = "text-amber-500 font-medium"
            if (numAnswered === numQuestions && numQuestions > 0) statusColor = "text-green-600 font-medium"

            return (
              <button
                key={b.id}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                  setCurrentBlockIndex(i)
                }}
                className={`w-full text-left px-4 py-3 text-sm transition-all border-l-2 flex flex-col gap-1 ${
                  currentBlockIndex === i 
                    ? 'border-black bg-gray-100/50 shadow-sm' 
                    : 'border-transparent hover:bg-gray-50/50'
                }`}
              >
                <div className={`flex items-start gap-2 ${currentBlockIndex === i ? 'text-black font-semibold' : 'text-gray-500 hover:text-gray-900'}`}>
                  <span className="opacity-50 shrink-0">{i + 1}.</span>
                  <span className="line-clamp-2 leading-tight flex-1">{b.titulo}</span>
                </div>
                {numQuestions > 0 && (
                  <div className={`text-[10px] pl-5 tracking-wider ${statusColor}`}>
                    {numAnswered}/{numQuestions} RESPUESTAS
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Global Save Indicator */}
        <div className="mt-8 px-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {globalSaveState === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span>Guardando respuestas...</span>
              </>
            )}
            {globalSaveState === 'saved' && (
              <>
                <CheckCircle2 className="h-4 w-4 text-black" />
                <span>Autoguardado activado. Puedes cerrar o continuar.</span>
              </>
            )}
            {globalSaveState === '' && (
              <>
                <CheckCircle2 className="h-4 w-4 text-gray-300" />
                <span>El formulario se guarda automáticamente.</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 w-full">
        <div className="mb-10 pl-2">
          <h1 className="text-2xl font-light tracking-tight text-gray-900 uppercase">
            Diagnóstico de Marca
          </h1>
          <p className="mt-3 text-sm font-normal text-gray-600 max-w-2xl leading-relaxed">
            Hola <span className="font-medium text-gray-900">{form.nombre_cliente}</span>, por favor completa este cuestionario para que podamos entender mejor la situación actual de <span className="font-medium text-gray-900">{form.empresa_cliente}</span>.
          </p>
        </div>

        <div className="bg-white shadow-sm border border-gray-200">
        {/* Progress Bar */}
      <div className="bg-gray-100 h-1 w-full">
        <div 
          className="bg-black h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-8 sm:p-12">
        <div className="mb-10 flex justify-between items-center text-xs font-semibold tracking-widest uppercase text-gray-400">
          <span>Paso {currentBlockIndex + 1} de {bloques.length}</span>
          <span>{Math.round(progress)}% Completado</span>
        </div>

        <BloquePublico 
          key={currentBlock.id} 
          bloque={currentBlock} 
          formularioId={form.id} 
          localAnswers={localAnswers}
          onUpdate={handleQuestionUpdate}
        />

        {/* Navigation */}
        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrev} 
            disabled={currentBlockIndex === 0}
            className="w-32 rounded-none border-gray-200 hover:bg-gray-50 hover:text-black font-medium tracking-wide"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {currentBlockIndex < bloques.length - 1 ? (
            <Button onClick={handleNext} className="w-32 bg-black hover:bg-gray-900 text-white rounded-none font-medium tracking-wide">
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleFinish} 
              disabled={isFinishing}
              className="w-32 bg-black hover:bg-gray-900 text-white rounded-none font-medium tracking-wide"
            >
              {isFinishing ? 'Enviando...' : 'Finalizar'}
              {!isFinishing && <Send className="h-4 w-4 ml-2" />}
            </Button>
          )}
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}
