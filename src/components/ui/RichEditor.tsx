import React, { useState } from 'react'

import { cn } from '@/lib/utils'
import {
  HeroBold,
  HeroItalic,
  HeroStrikethrough,
  HeroHeading2,
  HeroList,
  HeroListOrdered,
  HeroQuote,
  HeroCode,
  HeroLink,
  HeroEye,
  HeroEdit3,
} from '@/components/icons/HeroIcons'

import { t } from '@/i18n'

export interface RichEditorProps {
  label?: string
  value?: string
  onChange?: (val: string) => void
  error?: string
  helperText?: string
  required?: boolean
  placeholder?: string
  className?: string
}

export const RichEditor: React.FC<RichEditorProps> = ({
  label,
  value = '',
  onChange,
  error,
  helperText,
  required,
  placeholder = t.components.richEditor.placeholder,
  className,
}) => {
  const [isPreview, setIsPreview] = useState(false)
  const [internalValue, setInternalValue] = useState(value)

  const handleTextChange = (newVal: string) => {
    setInternalValue(newVal)
    onChange?.(newVal)
  }

  const applyFormat = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('rich-editor-textarea') as HTMLTextAreaElement | null
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = internalValue.substring(start, end)
    const replacement = `${prefix}${selected || 'text'}${suffix}`
    const updated = internalValue.substring(0, start) + replacement + internalValue.substring(end)

    handleTextChange(updated)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
    }, 10)
  }

  return (
    <div className={cn('w-full space-y-1', className)}>
      {label && (
        <label className="block text-xs font-medium text-fg">
          {label}
          {required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
        </label>
      )}

      <div
        className={cn(
          'rounded-lg border overflow-hidden shadow-2xs transition-all bg-surface',
          error
            ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/20'
            : 'border-line-strong focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
        )}
      >
        {/* Editor Toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-1 p-1.5 border-b bg-surface-muted border-line"
        >
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => applyFormat('**', '**')}
              className="p-1 text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
              aria-label={t.components.richEditor.bold}
            >
              <HeroBold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('*', '*')}
              className="p-1 text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
              aria-label={t.components.richEditor.italic}
            >
              <HeroItalic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('~~', '~~')}
              className="p-1 text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
              aria-label={t.components.richEditor.strikethrough}
            >
              <HeroStrikethrough className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-line mx-1" />
            <button
              type="button"
              onClick={() => applyFormat('## ')}
              className="p-1 text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
              aria-label={t.components.richEditor.h2}
            >
              <HeroHeading2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('- ')}
              className="p-1 text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
              aria-label={t.components.richEditor.list}
            >
              <HeroList className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('1. ')}
              className="p-1 text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
              aria-label={t.components.richEditor.orderedList}
            >
              <HeroListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('> ')}
              className="p-1 text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
              aria-label={t.components.richEditor.quote}
            >
              <HeroQuote className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('`', '`')}
              className="p-1 text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
              aria-label={t.components.richEditor.code}
            >
              <HeroCode className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('[HeroLink Text](https://', ')')}
              className="p-1 text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
              aria-label={t.components.richEditor.link}
            >
              <HeroLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-surface rounded transition-colors cursor-pointer"
          >
            {isPreview ? (
              <>
                <HeroEdit3 className="w-3 h-3" />
                {t.components.richEditor.write}
              </>
            ) : (
              <>
                <HeroEye className="w-3 h-3" />
                {t.components.richEditor.preview}
              </>
            )}
          </button>
        </div>

        {/* Content area */}
        {isPreview ? (
          <div className="p-3.5 min-h-[140px] prose dark:prose-invert max-w-none text-xs sm:text-sm text-fg">
            {internalValue ? (
              <div className="whitespace-pre-wrap">{internalValue}</div>
            ) : (
              <p className="text-fg-muted italic">{t.components.richEditor.noPreview}</p>
            )}
          </div>
        ) : (
          <textarea
            id="rich-editor-textarea"
            rows={5}
            value={internalValue}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 text-xs sm:text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-fg placeholder:text-fg-muted font-normal leading-relaxed resize-y"
          />
        )}
      </div>

      {error && <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-fg-muted">{helperText}</p>}
    </div>
  )
}
