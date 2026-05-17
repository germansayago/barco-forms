'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, ExternalLink } from 'lucide-react'

export function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/f/${id}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpen = () => {
    window.open(`/f/${id}`, '_blank')
  }

  return (
    <div className="flex gap-2 items-center justify-end">
      <Button variant="ghost" size="sm" onClick={handleOpen} title="Abrir en nueva pestaña" className="text-gray-500 hover:text-gray-900">
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={handleCopy} className={copied ? 'text-green-600 border-green-200 bg-green-50' : ''}>
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? 'Copiado' : 'Copiar Link'}
      </Button>
    </div>
  )
}
