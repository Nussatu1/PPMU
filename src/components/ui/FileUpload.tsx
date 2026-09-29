import React, { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  HeroArrowUpTray,
  HeroDocumentText,
  HeroPhoto,
  HeroTrash,
  HeroCheckCircle,
} from '@/components/icons/HeroIcons'

export interface FileItem {
  id: string
  name: string
  size: number
  dataUrl: string
  type: string
}

export interface FileUploadProps {
  label?: string
  helperText?: string
  error?: string
  accept?: string
  multiple?: boolean
  maxSizeMB?: number
  value?: string | string[]
  onChange?: (value: any) => void
  className?: string
  disabled?: boolean
  required?: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  helperText,
  error,
  accept = '.pdf,.jpg,.jpeg,.png,.docx,.xlsx',
  multiple = false,
  maxSizeMB = 10,
  value,
  onChange,
  className,
  disabled = false,
  required = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [localFiles, setLocalFiles] = useState<FileItem[]>(() => {
    if (!value) return []
    const valArr = Array.isArray(value) ? value : [value]
    return valArr.filter(Boolean).map((item, idx) => ({
      id: `existing-${idx}-${Date.now()}`,
      name: item.startsWith('data:') ? 'Berkas Unggahan' : item.split('/').pop() || 'Berkas Dokumen',
      size: 0,
      dataUrl: item,
      type: item.includes('.pdf') ? 'application/pdf' : 'image/jpeg',
    }))
  })

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newItems: FileItem[] = []
    const readers: Promise<void>[] = []

    const fileArray = Array.from(files)
    const targetFiles = multiple ? fileArray : [fileArray[0]]

    targetFiles.forEach((file) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`Ukuran berkas ${file.name} melebihi batas maksimal ${maxSizeMB} MB.`)
        return
      }

      const p = new Promise<void>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          newItems.push({
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            dataUrl: result,
            type: file.type,
          })
          resolve()
        }
        reader.onerror = () => resolve()
        reader.readAsDataURL(file)
      })
      readers.push(p)
    })

    Promise.all(readers).then(() => {
      if (newItems.length === 0) return

      let updated: FileItem[]
      if (multiple) {
        updated = [...localFiles, ...newItems]
      } else {
        updated = [newItems[0]]
      }

      setLocalFiles(updated)
      if (onChange) {
        if (multiple) {
          onChange(updated.map((f) => f.dataUrl))
        } else {
          onChange(updated[0]?.dataUrl || '')
        }
      }
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return
    processFiles(e.dataTransfer.files)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (id: string) => {
    const updated = localFiles.filter((f) => f.id !== id)
    setLocalFiles(updated)
    if (onChange) {
      if (multiple) {
        onChange(updated.map((f) => f.dataUrl))
      } else {
        onChange(updated[0]?.dataUrl || '')
      }
    }
  }

  const isImage = (type: string, name: string) => {
    return type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name)
  }

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-medium text-fg">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'group relative flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none',
          isDragging
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-line hover:border-amber-500/50 bg-surface-muted/50 hover:bg-surface-muted',
          disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
          error && 'border-red-500/70 bg-red-500/5'
        )}
      >
        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform duration-200 ring-1 ring-amber-500/20">
          <HeroArrowUpTray className="w-5 h-5" />
        </div>

        <p className="text-xs font-semibold text-fg text-center">
          <span className="text-amber-600 dark:text-amber-400 hover:underline">
            Klik untuk memilih berkas
          </span>{' '}
          atau seret berkas ke area ini
        </p>

        <p className="text-[11px] text-fg-muted mt-1 text-center">
          Format: {accept.replace(/\./g, ' ').toUpperCase()} • Maksimal {maxSizeMB} MB
          {multiple && ' • Multi-berkas'}
        </p>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {/* Uploaded Files List */}
      {localFiles.length > 0 && (
        <div className="space-y-2 pt-1.5">
          {localFiles.map((file) => {
            const hasImage = isImage(file.type, file.name)
            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-line bg-surface hover:bg-hover-bg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {hasImage ? (
                    <div className="w-9 h-9 rounded-md overflow-hidden bg-surface-muted ring-1 ring-line shrink-0">
                      <img
                        src={file.dataUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                      <HeroDocumentText className="w-4 h-4" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-fg truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {file.size > 0 && (
                        <span className="text-[11px] text-fg-muted font-mono">
                          {formatSize(file.size)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <HeroCheckCircle className="w-3 h-3" />
                        Siap disimpan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-3 shrink-0">
                  {file.dataUrl && (
                    <a
                      href={file.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Pratinjau berkas"
                      className="p-1.5 rounded-md text-fg-muted hover:text-amber-500 hover:bg-surface-muted transition-colors cursor-pointer"
                    >
                      <HeroPhoto className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(file.id)
                    }}
                    aria-label="Hapus berkas"
                    className="p-1.5 rounded-md text-fg-muted hover:text-red-500 hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    <HeroTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-fg-muted">{helperText}</p>}
    </div>
  )
}
