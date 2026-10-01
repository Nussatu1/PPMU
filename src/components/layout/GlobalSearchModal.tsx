import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeroMagnifyingGlass, HeroXMark, HeroArrowPath, HeroArrowRight } from '@/components/icons/HeroIcons'

import { dataService } from '@/lib/dataService'

import { t } from '@/i18n'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

const typeLabelMap: Record<string, string> = {
  program: 'Program Kerja',
  agenda: 'Agenda & Kegiatan',
  report: 'Laporan Kinerja',
  task: 'Tugas',
  organization: 'Organisasi',
  user: 'Pengguna',
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeType, setActiveType] = useState<string>('all')
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await dataService.globalSearch(query)
        setResults(res)
      } finally {
        setIsLoading(false)
      }
    }, 180)

    return () => clearTimeout(timer)
  }, [query])

  // Grouped results by category
  const types = useMemo(() => {
    const set = new Set<string>()
    results.forEach((r) => {
      if (r.type) set.add(r.type)
    })
    return Array.from(set)
  }, [results])

  const filteredResults = useMemo(() => {
    if (activeType === 'all') return results
    return results.filter((r) => r.type === activeType)
  }, [results, activeType])

  if (!isOpen) return null

  const handleSelect = (url: string) => {
    onClose()
    setQuery('')
    navigate(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-overlay transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian global"
        className="relative w-full max-w-xl rounded-xl shadow-xl overflow-hidden z-10 animate-scale-in bg-surface ring-1 ring-line"
      >
        {/* Search Input Bar */}
        <div
          className="flex items-center px-4 py-3 border-b border-line-divider"
        >
          <HeroMagnifyingGlass className="w-5 h-5 text-fg-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.globalSearch.placeholder}
            aria-label="Cari program, agenda, laporan, tugas, dan lainnya"
            className="w-full bg-transparent text-base sm:text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          {isLoading && <HeroArrowPath className="w-4 h-4 animate-spin text-primary-500 mr-2 shrink-0" />}
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg p-1.5 rounded-lg hover:bg-hover-bg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <HeroXMark className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs (if search returned results) */}
        {results.length > 0 && types.length > 1 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 border-b border-line-divider overflow-x-auto text-xs bg-table-header"
          >
            <button
              type="button"
              onClick={() => setActiveType('all')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeType === 'all'
                  ? 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20 dark:bg-primary-500/20 dark:text-primary-300 font-semibold'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {t.globalSearch.all} ({results.length})
            </button>
            {types.map((typeKey) => (
              <button
                key={typeKey}
                type="button"
                onClick={() => setActiveType(typeKey)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer capitalize ${
                  activeType === typeKey
                    ? 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20 dark:bg-primary-500/20 dark:text-primary-300 font-semibold'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {typeLabelMap[typeKey] || typeKey} ({results.filter((r) => r.type === typeKey).length})
              </button>
            ))}
          </div>
        )}

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length >= 2 && results.length === 0 && !isLoading && (
            <div className="p-8 text-center text-xs text-fg-muted">
              {t.globalSearch.noResults(query)}
            </div>
          )}

          {filteredResults.length > 0 && (
            <div className="space-y-0.5">
              {filteredResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(item.url)}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-hover-bg cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-surface-muted text-fg-muted ring-1 ring-inset ring-line-strong uppercase tracking-wider shrink-0">
                      {typeLabelMap[item.type] || item.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-fg group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-fg-muted truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <HeroArrowRight className="w-3.5 h-3.5 text-fg-subtle group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors shrink-0 ml-2" />
                </div>
              ))}
            </div>
          )}

          {!query && (
            <div className="p-6 text-center text-xs text-fg-muted">
              {t.globalSearch.prompt}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 flex items-center justify-between text-xs text-fg-muted bg-surface-muted border-t border-line-divider"
        >
          <span>{t.globalSearch.footerEnter}</span>
          <span>{t.globalSearch.footerEsc}</span>
        </div>
      </div>
    </div>
  )
}
