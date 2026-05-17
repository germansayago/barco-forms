'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function DeleteFormButton({ id }: { id: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este formulario? Se borrarán permanentemente sus bloques, preguntas y respuestas.')) return
    
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/formularios/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      router.refresh()
    } catch (err) {
      alert('Error al eliminar el formulario')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleDelete} 
      disabled={isDeleting} 
      className="text-red-500 hover:text-red-700 hover:bg-red-50"
      title="Eliminar formulario"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
