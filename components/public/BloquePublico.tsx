'use client'

import { motion } from 'framer-motion'
import { PreguntaPublica } from './PreguntaPublica'

export function BloquePublico({ 
  bloque, 
  formularioId, 
  localAnswers,
  onUpdate 
}: { 
  bloque: any, 
  formularioId: string, 
  localAnswers?: Record<string, any>,
  onUpdate?: (id: string, hasAnswer: boolean, state: 'saving'|'saved', payload?: any) => void 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="border-b border-gray-200 pb-6 mb-10">
        <h2 className="text-3xl text-black tracking-tight">{bloque.titulo}</h2>
        {bloque.descripcion && (
          <p className="mt-3 text-sm text-gray-600 max-w-2xl leading-relaxed">{bloque.descripcion}</p>
        )}
      </div>

      <div className="space-y-10">
        {bloque.preguntas.map((pregunta: any) => {
          const respuestaInicial = localAnswers ? localAnswers[pregunta.id] : null

          return (
            <PreguntaPublica 
              key={pregunta.id} 
              pregunta={pregunta} 
              formularioId={formularioId} 
              respuestaInicial={respuestaInicial}
              onUpdate={onUpdate}
            />
          )
        })}
      </div>
    </motion.div>
  )
}
