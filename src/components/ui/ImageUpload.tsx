import React, { useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import { HeroArrowUpTray, HeroXMark, HeroPhoto, HeroCheckCircle } from '@/components/icons/HeroIcons'

export interface ImageUploadProps {
  label?: string
  value?: string
  onChange: (url: string) => void
  error?: string
  helperText?: string
  required?: boolean
  className?: string
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  required,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
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
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={cn('w-full space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium leading-6 text-fg">
          {label}
          {required && <span className="text-red-600 dark:text-red-400 ml-0.5 font-bold">*</span>}
        </label>
      )}

      {value ? (
        <div
          className="relative group w-full sm:w-64 h-44 rounded-xl overflow-hidden shadow-sm ring-1 ring-line transition-all bg-surface"
        >
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
          />
          {/* Action Overlay */}
          <div className="absolute inset-0 bg-overlay opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
            <div className="flex items-center gap-1.5 text-xs text-white font-medium mb-1">
              <HeroCheckCircle className="w-4 h-4 text-emerald-400" />
              {t.components.imageUpload.uploaded}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-primary-500 hover:bg-primary-400 text-primary-950 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {t.components.imageUpload.change}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                aria-label={t.components.imageUpload.remove}
              >
                <HeroXMark className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 select-none shadow-sm',
            isDragging
              ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
              : error
              ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20'
              : 'border-line-strong bg-surface hover:border-primary-500/70 hover:bg-hover-bg'
          )}
        >
          <div
            className={cn(
              'p-3 rounded-full mb-2.5 transition-colors',
              isDragging
                ? 'bg-primary-500 text-primary-950'
                : 'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400'
            )}
          >
            <HeroArrowUpTray className="w-6 h-6" />
          </div>
          <p className="text-xs font-medium text-fg text-center">
            <span className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              {t.components.imageUpload.browse}
            </span>{' '}
            {t.components.imageUpload.dragDrop}
          </p>
          <p className="text-xs text-fg-muted mt-1 text-center">
            {t.components.imageUpload.formats}
          </p>
        </div>
      )}

      {/* Optional direct URL input */}
      <div className="flex items-center gap-2 mt-2">
        <HeroPhoto className="w-4 h-4 text-fg-subtle shrink-0" />
        <div className="flex-1 rounded-lg bg-input-bg shadow-sm ring-1 ring-line-strong transition duration-75 focus-within:ring-2 focus-within:ring-primary-600 dark:focus-within:ring-primary-500">
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t.components.imageUpload.urlPlaceholder}
            className="w-full bg-transparent px-3 py-1.5 text-xs text-fg outline-none placeholder:text-fg-subtle"
          />
        </div>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-fg-muted">{helperText}</p>
      )}
    </div>
  )
}
