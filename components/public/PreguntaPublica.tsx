'use client'

import { useState, useEffect, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Loader2, UploadCloud, FileText, Trash2 } from 'lucide-react'

interface PreguntaPublicaProps {
  pregunta: any
  formularioId: string
  respuestaInicial?: any
  onUpdate?: (id: string, hasAnswer: boolean, state: 'saving'|'saved', payload?: any) => void
}

export function PreguntaPublica({ pregunta, formularioId, respuestaInicial, onUpdate }: PreguntaPublicaProps) {
  const [valorTexto, setValorTexto] = useState(respuestaInicial?.valor_texto || '')
  const [valorOpciones, setValorOpciones] = useState<string[]>(respuestaInicial?.valor_opciones || [])
  const [archivos, setArchivos] = useState<{url: string, nombre: string, path: string}[]>(respuestaInicial?.archivos || [])
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const saveToSupabase = async (payload: any) => {
    setIsSaving(true)
    setIsSaved(false)
    if (onUpdate) onUpdate(pregunta.id, false, 'saving') 
    try {
      const res = await fetch(`/api/public/${formularioId}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregunta_id: pregunta.id,
          ...payload
        })
      })
      if (!res.ok) throw new Error('Error saving')
      setIsSaved(true)
      
      let hasAnswer = false
      if (pregunta.tipo === 'texto_largo' && payload.valor_texto?.trim()) hasAnswer = true
      if ((pregunta.tipo === 'seleccion_unica' || pregunta.tipo === 'seleccion_multiple') && payload.valor_opciones?.length > 0) hasAnswer = true
      if (pregunta.tipo === 'archivo' && payload.archivos?.length > 0) hasAnswer = true
      
      if (onUpdate) onUpdate(pregunta.id, hasAnswer, 'saved', payload)
      
      setTimeout(() => setIsSaved(false), 2000)
    } catch (err) {
      console.error(err)
      if (onUpdate) onUpdate(pregunta.id, false, 'saved') // Revert to empty state on error or similar
    } finally {
      setIsSaving(false)
    }
  }

  // Handle texto_largo
  useEffect(() => {
    if (pregunta.tipo !== 'texto_largo') return

    // Evitar guardar en el montaje inicial si no cambió nada
    if (valorTexto === (respuestaInicial?.valor_texto || '')) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(() => {
      saveToSupabase({ valor_texto: valorTexto })
    }, 800)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [valorTexto])

  // Handle selecciones
  const toggleOpcion = (opcion: string) => {
    let nuevasOpciones = [...valorOpciones]
    
    if (pregunta.tipo === 'seleccion_unica') {
      nuevasOpciones = [opcion]
    } else {
      if (nuevasOpciones.includes(opcion)) {
        nuevasOpciones = nuevasOpciones.filter(o => o !== opcion)
      } else {
        nuevasOpciones.push(opcion)
      }
    }

    setValorOpciones(nuevasOpciones)
    saveToSupabase({ valor_opciones: nuevasOpciones })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Prevención de seguridad de extensión
    const filename = file.name.toLowerCase()
    if (filename.endsWith('.exe') || filename.endsWith('.bat') || filename.endsWith('.sh') || filename.endsWith('.js')) {
      alert("Por razones de seguridad, no se permiten archivos ejecutables.")
      return
    }

    setIsSaving(true)
    if (onUpdate) onUpdate(pregunta.id, false, 'saving')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('pregunta_id', pregunta.id)
      
      const res = await fetch(`/api/public/${formularioId}/archivos`, {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error('Error al subir archivo')
      
      const data = await res.json()
      
      const newArchivos = [...archivos, { url: data.url, nombre: data.filename, path: data.path }]
      setArchivos(newArchivos)
      saveToSupabase({ archivos: newArchivos })
      
    } catch (err) {
      console.error(err)
      alert("Error al subir archivo. Intente de nuevo.")
      if (onUpdate) onUpdate(pregunta.id, false, 'saved')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveFile = async (pathToRemove: string) => {
    const newArchivos = archivos.filter(a => a.path !== pathToRemove)
    setArchivos(newArchivos)
    saveToSupabase({ archivos: newArchivos })

    fetch(`/api/public/${formularioId}/archivos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathToRemove })
    }).catch(console.error)
  }

  return (
    <div className="space-y-4 mb-10">
      <div className="flex items-start justify-between gap-4">
        <Label className="text-base font-normal text-black leading-relaxed">
          {pregunta.texto}
          {pregunta.obligatoria && <span className="text-red-500 ml-1 font-bold">*</span>}
        </Label>
        
        {/* Status Indicator */}
        <div className="flex items-center text-xs h-5 shrink-0">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {isSaved && <CheckCircle2 className="h-4 w-4 text-black" />}
        </div>
      </div>

      {pregunta.tipo === 'texto_largo' && (
        <Textarea 
          placeholder="Escribe tu respuesta aquí..."
          className="min-h-[140px] resize-y bg-white text-base text-gray-900 placeholder:text-gray-500 rounded-none border-gray-300 focus:border-black focus:ring-black shadow-sm transition-all"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
        />
      )}

      {(pregunta.tipo === 'seleccion_unica' || pregunta.tipo === 'seleccion_multiple') && (
        <div className="space-y-3 mt-4">
          {pregunta.opciones?.map((opcion: string, i: number) => (
            <label key={i} className="flex items-center space-x-4 p-4 border border-gray-200 hover:border-black cursor-pointer transition-colors bg-white shadow-sm">
              <input 
                type={pregunta.tipo === 'seleccion_unica' ? 'radio' : 'checkbox'} 
                checked={valorOpciones.includes(opcion)}
                onChange={() => toggleOpcion(opcion)}
                className="h-4 w-4 text-black focus:ring-black border-gray-300"
              />
              <span className="text-black font-normal">{opcion}</span>
            </label>
          ))}
        </div>
      )}

      {pregunta.tipo === 'archivo' && (
        <div className="mt-4 space-y-4">
          {archivos.map((archivo, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="h-5 w-5 text-black shrink-0" />
                <a 
                  href={archivo.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm font-medium text-black hover:underline truncate"
                >
                  {archivo.nombre || 'Archivo adjunto'}
                </a>
              </div>
              <button 
                onClick={() => handleRemoveFile(archivo.path)}
                className="text-gray-400 hover:text-red-600 transition-colors shrink-0 ml-4 p-1"
                title="Eliminar archivo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          <div className="flex justify-center border border-gray-300 px-6 py-12 bg-[#fafafa] hover:bg-gray-100 transition-colors">
            <div className="text-center">
              <UploadCloud className="mx-auto h-10 w-10 text-black mb-4" aria-hidden="true" />
              <div className="flex flex-col items-center text-sm leading-6 text-gray-600">
                <label
                  htmlFor={`file-upload-${pregunta.id}`}
                  className="relative cursor-pointer bg-black text-white px-4 py-2 font-medium hover:bg-gray-800 transition-colors mb-2"
                >
                  <span>Subir archivo</span>
                  <input 
                    id={`file-upload-${pregunta.id}`} 
                    name="file-upload" 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.zip,.rar"
                    className="sr-only" 
                    onChange={handleFileUpload} 
                  />
                </label>
                <p className="pl-1 mt-2 text-gray-500">o arrástralo y suéltalo aquí</p>
              </div>
              <p className="text-xs leading-5 text-gray-400 mt-2">PDF, PNG, JPG, DOCX, ZIP hasta 10MB</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
