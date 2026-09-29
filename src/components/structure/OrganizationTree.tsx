import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { Personnel, Section } from '@/types/database'
import {
  HeroPlus,
  HeroMinus,
  HeroArrowsPointingOut,
  HeroArrowsRightLeft,
  HeroArrowsUpDown,
  HeroMagnifyingGlass,
  HeroUser,
  HeroChevronRight,
  HeroXMark,
  HeroArrowDownTray,
} from '@/components/icons/HeroIcons'

export interface OrganizationTreeProps {
  personnels: Personnel[]
  sections: Section[]
  selectedNodeId?: string | null
  onNodeClick: (prs: Personnel) => void
  onClearSelection?: () => void
  onAddSubordinate?: (prs: Personnel) => void
  onAddRoot?: () => void
  onExport?: () => void
}

interface TreeNode {
  data: Personnel
  children: TreeNode[]
  level: number
  x: number
  y: number
  width: number
  height: number
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 80
const HORIZONTAL_SPACING = 90
const VERTICAL_SPACING = 30

export const OrganizationTree: React.FC<OrganizationTreeProps> = ({
  personnels,
  sections,
  selectedNodeId,
  onNodeClick,
  onClearSelection,
  onAddRoot,
  onExport,
}) => {
  // Controls state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 60, y: 120 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal')
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedSearchIndex, setFocusedSearchIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)

  // Map sections for quick lookup
  const sectionMap = useMemo(() => {
    const map = new Map<string, Section>()
    sections.forEach(s => map.set(s.id, s))
    return map
  }, [sections])

  // Build recursive tree from personnels
  const { rootNodes } = useMemo(() => {
    const byId = new Map<string, Personnel>()
    const childrenMap = new Map<string, Personnel[]>()
    const roots: Personnel[] = []

    personnels.forEach(p => {
      byId.set(p.id, p)
      childrenMap.set(p.id, [])
    })

    personnels.forEach(p => {
      if (p.parent_id && byId.has(p.parent_id)) {
        childrenMap.get(p.parent_id)?.push(p)
      } else {
        roots.push(p)
      }
    })

    // Sort children by sort_order
    childrenMap.forEach(children => {
      children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    })

    roots.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    return { rootNodes: roots, allNodesById: byId, childrenMap }
  }, [personnels])

  // Collapse / Expand handlers
  const toggleCollapse = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set())
  }, [])

  const collapseAll = useCallback(() => {
    const allParentIds = new Set<string>()
    personnels.forEach(p => {
      if (personnels.some(sub => sub.parent_id === p.id)) {
        allParentIds.add(p.id)
      }
    })
    setCollapsedIds(allParentIds)
  }, [personnels])

  // Compute Layout Positions (Horizontal Mind-Map or Vertical Hierarchy)
  const { layoutNodes, connections, canvasBounds } = useMemo(() => {
    const nodes: TreeNode[] = []
    const conns: Array<{
      id: string
      fromX: number
      fromY: number
      toX: number
      toY: number
      fromId: string
      toId: string
      isHighlighted: boolean
    }> = []

    let maxY = 0
    let maxX = 0

    // Measure subtree height/width
    function measureSubtree(prs: Personnel): number {
      const isCollapsed = collapsedIds.has(prs.id)
      const directChildren = personnels.filter(p => p.parent_id === prs.id)
      if (isCollapsed || directChildren.length === 0) {
        return orientation === 'horizontal' ? NODE_HEIGHT + VERTICAL_SPACING : NODE_WIDTH + HORIZONTAL_SPACING
      }
      return directChildren.reduce((acc, child) => acc + measureSubtree(child), 0)
    }

    if (orientation === 'horizontal') {
      // Horizontal Mind-Map Layout (Branching Left to Right like Reference Image)
      let currentY = 40

      function positionNodeH(prs: Personnel, level: number, startY: number): TreeNode {
        const subtreeHeight = measureSubtree(prs)
        const nodeY = startY + subtreeHeight / 2 - NODE_HEIGHT / 2
        const nodeX = 40 + level * (NODE_WIDTH + HORIZONTAL_SPACING)

        const isCollapsed = collapsedIds.has(prs.id)
        const directChildren = personnels.filter(p => p.parent_id === prs.id)
        const childTreeNodes: TreeNode[] = []

        if (!isCollapsed && directChildren.length > 0) {
          let childY = startY
          directChildren.forEach(child => {
            const childSubtreeHeight = measureSubtree(child)
            const childNode = positionNodeH(child, level + 1, childY)
            childTreeNodes.push(childNode)

            // Connect from right of parent to left of child
            const fromX = nodeX + NODE_WIDTH
            const fromY = nodeY + NODE_HEIGHT / 2
            const toX = childNode.x
            const toY = childNode.y + NODE_HEIGHT / 2

            const isHighlighted =
              selectedNodeId === prs.id ||
              selectedNodeId === child.id ||
              (selectedNodeId && (prs.id === selectedNodeId || child.id === selectedNodeId))

            conns.push({
              id: `${prs.id}->${child.id}`,
              fromX,
              fromY,
              toX,
              toY,
              fromId: prs.id,
              toId: child.id,
              isHighlighted: !!isHighlighted,
            })

            childY += childSubtreeHeight
          })
        }

        const tNode: TreeNode = {
          data: prs,
          children: childTreeNodes,
          level,
          x: nodeX,
          y: nodeY,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        }

        nodes.push(tNode)
        maxX = Math.max(maxX, nodeX + NODE_WIDTH + 100)
        maxY = Math.max(maxY, nodeY + NODE_HEIGHT + 100)
        return tNode
      }

      rootNodes.forEach(root => {
        const subHeight = measureSubtree(root)
        positionNodeH(root, 0, currentY)
        currentY += subHeight + 40
      })
    } else {
      // Vertical Tree Layout (Top to Bottom)
      let currentX = 40

      function positionNodeV(prs: Personnel, level: number, startX: number): TreeNode {
        const subtreeWidth = measureSubtree(prs)
        const nodeX = startX + subtreeWidth / 2 - NODE_WIDTH / 2
        const nodeY = 40 + level * (NODE_HEIGHT + 70)

        const isCollapsed = collapsedIds.has(prs.id)
        const directChildren = personnels.filter(p => p.parent_id === prs.id)
        const childTreeNodes: TreeNode[] = []

        if (!isCollapsed && directChildren.length > 0) {
          let childX = startX
          directChildren.forEach(child => {
            const childSubtreeWidth = measureSubtree(child)
            const childNode = positionNodeV(child, level + 1, childX)
            childTreeNodes.push(childNode)

            // Connect from bottom of parent to top of child
            const fromX = nodeX + NODE_WIDTH / 2
            const fromY = nodeY + NODE_HEIGHT
            const toX = childNode.x + NODE_WIDTH / 2
            const toY = childNode.y

            const isHighlighted =
              selectedNodeId === prs.id ||
              selectedNodeId === child.id

            conns.push({
              id: `${prs.id}->${child.id}`,
              fromX,
              fromY,
              toX,
              toY,
              fromId: prs.id,
              toId: child.id,
              isHighlighted: !!isHighlighted,
            })

            childX += childSubtreeWidth
          })
        }

        const tNode: TreeNode = {
          data: prs,
          children: childTreeNodes,
          level,
          x: nodeX,
          y: nodeY,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        }

        nodes.push(tNode)
        maxX = Math.max(maxX, nodeX + NODE_WIDTH + 100)
        maxY = Math.max(maxY, nodeY + NODE_HEIGHT + 100)
        return tNode
      }

      rootNodes.forEach(root => {
        const subWidth = measureSubtree(root)
        positionNodeV(root, 0, currentX)
        currentX += subWidth + 60
      })
    }

    return {
      layoutNodes: nodes,
      connections: conns,
      canvasBounds: { width: Math.max(maxX, 1200), height: Math.max(maxY, 800) },
    }
  }, [orientation, rootNodes, personnels, collapsedIds, selectedNodeId])

  // Search filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return personnels.filter(p => {
      const sec = sectionMap.get(p.section_id)
      return (
        (p.position && p.position.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (sec && (sec.name.toLowerCase().includes(q) || sec.code.toLowerCase().includes(q))) ||
        (p.tupoksi && p.tupoksi.toLowerCase().includes(q))
      )
    })
  }, [searchQuery, personnels, sectionMap])

  // Pan to specific node
  const panToNode = useCallback((nodeId: string) => {
    const node = layoutNodes.find(n => n.data.id === nodeId)
    if (!node || !containerRef.current) return
    const container = containerRef.current.getBoundingClientRect()
    const targetX = container.width / 2 - (node.x + NODE_WIDTH / 2) * zoom
    const targetY = container.height / 2 - (node.y + NODE_HEIGHT / 2) * zoom
    setPan({ x: targetX, y: targetY })
  }, [layoutNodes, zoom])

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(2, Math.round((z + 0.15) * 100) / 100))
  const handleZoomOut = () => setZoom(z => Math.max(0.2, Math.round((z - 0.15) * 100) / 100))

  const handleZoomReset = () => {
    if (!containerRef.current || layoutNodes.length === 0) {
      setZoom(1)
      setPan({ x: 60, y: 120 })
      return
    }
    const container = containerRef.current.getBoundingClientRect()
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    layoutNodes.forEach(n => {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x + n.width)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y + n.height)
    })

    const contentCenterX = (minX + maxX) / 2
    const contentCenterY = (minY + maxY) / 2

    setZoom(1)
    setPan({
      x: Math.round(container.width / 2 - contentCenterX * 1),
      y: Math.round(container.height / 2 - contentCenterY * 1),
    })
  }

  // Mathematically exact Fit to Screen with dynamic centering and adaptive bounds
  const handleFit = useCallback(() => {
    if (!containerRef.current || layoutNodes.length === 0) return
    const container = containerRef.current.getBoundingClientRect()

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    layoutNodes.forEach(n => {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x + n.width)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y + n.height)
    })

    const contentWidth = Math.max(1, maxX - minX)
    const contentHeight = Math.max(1, maxY - minY)
    const contentCenterX = (minX + maxX) / 2
    const contentCenterY = (minY + maxY) / 2

    // Safe padding from viewport boundaries
    const padding = 60
    const availableWidth = Math.max(100, container.width - padding * 2)
    const availableHeight = Math.max(100, container.height - padding * 2)

    const scaleX = availableWidth / contentWidth
    const scaleY = availableHeight / contentHeight

    // When structure is small: do not exceed 1.0 (keeps natural scale)
    // When structure is large: allow scaling down to 0.2 so 100% of nodes fit in frame
    const optimalScale = Math.min(scaleX, scaleY)
    const targetZoom = Math.min(Math.max(optimalScale, 0.2), 1.0)
    const roundedZoom = Math.round(targetZoom * 100) / 100

    // Center content in viewport
    const targetPanX = container.width / 2 - contentCenterX * roundedZoom
    const targetPanY = container.height / 2 - contentCenterY * roundedZoom

    setZoom(roundedZoom)
    setPan({ x: Math.round(targetPanX), y: Math.round(targetPanY) })
  }, [layoutNodes])

  // Auto-pan: ensures clicked node is fully inside safe viewport bounds
  const ensureNodeVisible = useCallback((nodeId: string) => {
    const node = layoutNodes.find(n => n.data.id === nodeId)
    if (!node || !containerRef.current) return
    const container = containerRef.current.getBoundingClientRect()

    const nodeLeft = pan.x + node.x * zoom
    const nodeRight = nodeLeft + node.width * zoom
    const nodeTop = pan.y + node.y * zoom
    const nodeBottom = nodeTop + node.height * zoom

    const margin = 80 // Safe viewport margin in px
    let newPanX = pan.x
    let newPanY = pan.y
    let needsPan = false

    if (nodeLeft < margin) {
      newPanX = pan.x + (margin - nodeLeft)
      needsPan = true
    } else if (nodeRight > container.width - margin) {
      newPanX = pan.x - (nodeRight - (container.width - margin))
      needsPan = true
    }

    if (nodeTop < margin) {
      newPanY = pan.y + (margin - nodeTop)
      needsPan = true
    } else if (nodeBottom > container.height - margin) {
      newPanY = pan.y - (nodeBottom - (container.height - margin))
      needsPan = true
    }

    if (needsPan) {
      setPan({ x: Math.round(newPanX), y: Math.round(newPanY) })
    }
  }, [layoutNodes, pan, zoom])

  const dragDistRef = useRef(0)
  const dragStartPosRef = useRef({ x: 0, y: 0 })

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // only left click
    setIsDragging(true)
    dragDistRef.current = 0
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartPosRef.current.x
    const dy = e.clientY - dragStartPosRef.current.y
    dragDistRef.current = Math.hypot(dx, dy)
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleCanvasClick = () => {
    // If user clicked without dragging/panning, unselect
    if (dragDistRef.current < 5) {
      onClearSelection?.()
    }
  }

  // Keyboard navigation / unselect on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClearSelection?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClearSelection])

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      setZoom(z => Math.min(2, Math.max(0.4, Math.round((z + delta) * 100) / 100)))
    }
  }

  // Auto center on initial load
  useEffect(() => {
    if (personnels.length > 0) {
      handleFit()
    }
  }, [personnels.length, handleFit])

  // If no structure data exists, show custom empty state
  if (personnels.length === 0) {
    return (
      <div className="p-16 rounded-2xl border border-line bg-surface text-center space-y-4 shadow-2xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <HeroUser className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-bold text-fg">Belum Ada Struktur Organisasi</h3>
          <p className="text-xs text-fg-muted leading-relaxed">
            Tambahkan jabatan pertama (misalnya Ketua atau Pucuk Pimpinan) untuk mulai membangun bagan struktur hierarki organisasi.
          </p>
        </div>
        {onAddRoot && (
          <button
            type="button"
            onClick={onAddRoot}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary-500 hover:bg-primary-400 text-primary-950 shadow-sm transition-colors cursor-pointer"
          >
            <HeroPlus className="w-4 h-4" />
            Tambah Struktur Pertama
          </button>
        )}
      </div>
    )
  }

  // Hierarchy relationships for selected node
  const selectedPerson = useMemo(() => {
    return selectedNodeId ? personnels.find(p => p.id === selectedNodeId) || null : null
  }, [selectedNodeId, personnels])

  const directSubordinateIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    return new Set(personnels.filter(p => p.parent_id === selectedNodeId).map(p => p.id))
  }, [selectedNodeId, personnels])

  const handleNodeCardClick = (nodeData: Personnel) => {
    ensureNodeVisible(nodeData.id)
    onNodeClick(nodeData)
  }

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface shadow-2xs overflow-hidden h-[680px]">
      {/* Interactive Mind-Map Toolbar */}
      <div className="px-4 py-3 border-b border-line bg-surface-muted flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Search Input */}
        <div className="relative w-72">
          <HeroMagnifyingGlass className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setFocusedSearchIndex(0)
            }}
            placeholder="Cari jabatan, personel, seksi..."
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-surface border border-line text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg p-0.5 rounded cursor-pointer transition-colors"
              aria-label="Bersihkan pencarian"
            >
              <HeroXMark className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Search Popover */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 top-full mt-1.5 w-80 max-h-64 overflow-y-auto rounded-xl bg-surface border border-line shadow-2xl z-50 p-1.5 space-y-1 divide-y divide-line">
              <div className="px-2 py-1 text-[10px] font-bold text-fg-muted uppercase tracking-wider">
                Ditemukan {searchResults.length} Jabatan
              </div>
              {searchResults.map((res, i) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    panToNode(res.id)
                    onNodeClick(res)
                    setSearchQuery('')
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    focusedSearchIndex === i ? 'bg-amber-50 dark:bg-amber-500/10' : 'hover:bg-hover-bg'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-fg truncate">{res.position}</p>
                    <p className="text-[11px] text-fg-muted truncate">
                      {res.name || 'Belum ditentukan'} • {sectionMap.get(res.section_id)?.code || 'Seksi'}
                    </p>
                  </div>
                  <HeroChevronRight className="w-3.5 h-3.5 text-fg-muted shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Orientation Toggle */}
          <button
            type="button"
            onClick={() => setOrientation(o => (o === 'horizontal' ? 'vertical' : 'horizontal'))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-line text-fg hover:bg-hover-bg transition-colors cursor-pointer"
            aria-label="Ubah Orientasi Bagan"
          >
            {orientation === 'horizontal' ? (
              <>
                <HeroArrowsRightLeft className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Bagan Mind-Map (Horizontal)</span>
              </>
            ) : (
              <>
                <HeroArrowsUpDown className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Bagan Hierarki (Vertikal)</span>
              </>
            )}
          </button>

          {/* Expand/Collapse All */}
          <div className="flex items-center rounded-lg border border-line bg-surface overflow-hidden">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-hover-bg transition-colors border-r border-line cursor-pointer"
              title="Buka Seluruh Cabang"
            >
              Buka Semua
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-hover-bg transition-colors cursor-pointer"
              title="Tutup Seluruh Cabang"
            >
              Tutup Semua
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center rounded-lg border border-line bg-surface overflow-hidden">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-fg hover:bg-hover-bg border-r border-line transition-colors cursor-pointer"
              aria-label="Perkecil"
            >
              <HeroMinus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="px-2 py-1.5 text-[11px] font-mono font-semibold text-fg hover:bg-hover-bg border-r border-line transition-colors min-w-[3rem] text-center cursor-pointer"
              title="Reset Skala 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-fg hover:bg-hover-bg border-r border-line transition-colors cursor-pointer"
              aria-label="Perbesar"
            >
              <HeroPlus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFit}
              className="p-1.5 text-fg hover:bg-hover-bg transition-colors cursor-pointer"
              title="Paskan ke Layar"
              aria-label="Paskan ke Layar"
            >
              <HeroArrowsPointingOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export Button */}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-line text-fg hover:border-amber-500/60 hover:text-amber-500 hover:bg-hover-bg transition-colors cursor-pointer"
              title="Ekspor Bagan (PNG / JPG / PDF / ZIP)"
              aria-label="Ekspor Bagan"
            >
              <HeroArrowDownTray className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Ekspor</span>
            </button>
          )}
        </div>
      </div>

      {/* Mind-Map Interactive Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        className="relative flex-1 overflow-hidden select-none cursor-grab active:cursor-grabbing bg-dots"
        style={{
          backgroundColor: 'rgb(var(--fi-bg))',
          backgroundImage: 'radial-gradient(circle, rgb(var(--fi-divider)) 1.25px, transparent 1.25px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* World Transform Layer with smooth camera transitions */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: `${canvasBounds.width}px`,
            height: `${canvasBounds.height}px`,
            position: 'absolute',
            top: 0,
            left: 0,
            transition: isDragging ? 'none' : 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* SVG Connector Splines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasBounds.width}
            height={canvasBounds.height}
            style={{ overflow: 'visible' }}
          >
            {connections.map(c => {
              // Calculate curved Bezier Spline
              let d = ''
              if (orientation === 'horizontal') {
                const deltaX = c.toX - c.fromX
                const controlX1 = c.fromX + deltaX * 0.45
                const controlX2 = c.toX - deltaX * 0.45
                d = `M ${c.fromX} ${c.fromY} C ${controlX1} ${c.fromY}, ${controlX2} ${c.toY}, ${c.toX} ${c.toY}`
              } else {
                const deltaY = c.toY - c.fromY
                const controlY1 = c.fromY + deltaY * 0.45
                const controlY2 = c.toY - deltaY * 0.45
                d = `M ${c.fromX} ${c.fromY} C ${c.fromX} ${controlY1}, ${c.toX} ${controlY2}, ${c.toX} ${c.toY}`
              }

              return (
                <g key={c.id}>
                  {/* Subtle background glow for selected branches */}
                  {c.isHighlighted && (
                    <path
                      d={d}
                      fill="none"
                      stroke="rgb(var(--fi-primary-500))"
                      strokeWidth={6}
                      strokeOpacity={0.25}
                    />
                  )}
                  {/* Main Connector Wire */}
                  <path
                    d={d}
                    fill="none"
                    stroke={c.isHighlighted ? 'rgb(var(--fi-primary-500))' : 'rgb(var(--fi-divider))'}
                    strokeWidth={c.isHighlighted ? 2.5 : 2}
                    strokeLinecap="round"
                    className="transition-colors duration-200"
                  />
                  {/* Dot indicator at destination port */}
                  <circle
                    cx={c.toX}
                    cy={c.toY}
                    r={c.isHighlighted ? 4 : 3}
                    fill={c.isHighlighted ? 'rgb(var(--fi-primary-500))' : 'rgb(var(--fi-divider))'}
                  />
                </g>
              )
            })}
          </svg>

          {/* HTML Nodes */}
          {layoutNodes.map(node => {
            const isSelected = selectedNodeId === node.data.id
            const isDirectParent = !!selectedPerson && selectedPerson.parent_id === node.data.id
            const isDirectSubordinate = !!selectedPerson && directSubordinateIds.has(node.data.id)
            const hasSelection = !!selectedNodeId
            const isUnrelated = hasSelection && !isSelected && !isDirectParent && !isDirectSubordinate
            const isMatchingSearch = searchResults.some(r => r.id === node.data.id)
            const childrenCount = personnels.filter(p => p.parent_id === node.data.id).length
            const isCollapsed = collapsedIds.has(node.data.id)
            const sec = sectionMap.get(node.data.section_id)
            const hasName = node.data.name && node.data.name.trim().length > 0
            const isRoot = node.level === 0 || node.data.node_type === 'ketua'

            return (
              <div
                key={node.data.id}
                onMouseDown={e => {
                  e.stopPropagation()
                }}
                onClick={e => {
                  e.stopPropagation()
                  handleNodeCardClick(node.data)
                }}
                style={{
                  position: 'absolute',
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                }}
                className={`group rounded-xl border transition-all duration-200 p-3 flex flex-col justify-between cursor-pointer select-none ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10 scale-102 bg-surface z-20'
                    : isDirectParent
                    ? 'border-amber-500/70 ring-1 ring-amber-500/30 bg-surface shadow-md z-10'
                    : isDirectSubordinate
                    ? 'border-amber-500/50 ring-1 ring-amber-500/20 bg-surface shadow-md z-10'
                    : isMatchingSearch
                    ? 'border-amber-400 bg-surface shadow-lg ring-2 ring-amber-400/40'
                    : isRoot
                    ? 'border-line-strong bg-surface shadow-md shadow-black/5 dark:shadow-black/40 hover:border-amber-500/60 hover:shadow-lg border-t-2 border-t-amber-500'
                    : isUnrelated
                    ? 'border-line bg-surface opacity-80 hover:opacity-100 hover:border-amber-500/40 shadow-2xs'
                    : 'border-line-strong bg-surface shadow-md shadow-black/5 dark:shadow-black/40 hover:border-amber-500/50 hover:shadow-lg'
                }`}
              >
                {/* Node Header: Jabatan + Section Badge */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="truncate flex-1">
                    <span className="text-xs font-bold text-fg truncate block leading-snug group-hover:text-amber-500 transition-colors">
                      {node.data.position || 'Jabatan'}
                    </span>
                  </div>

                  {sec && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-surface-muted text-fg border border-line-divider shrink-0">
                      {sec.code}
                    </span>
                  )}
                </div>

                {/* Node Body: Nama Personel (Optional) */}
                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-line-divider">
                  <div className="truncate flex-1">
                    {hasName ? (
                      <span className="text-[11px] font-semibold text-fg truncate block">
                        {node.data.name}
                      </span>
                    ) : (
                      <span className="text-[10px] italic text-fg-muted font-normal block">
                        Belum ditentukan
                      </span>
                    )}
                  </div>

                  {/* Collapse / Expand Toggle Button on Node */}
                  {childrenCount > 0 && (
                    <button
                      type="button"
                      onClick={e => toggleCollapse(node.data.id, e)}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors flex items-center gap-0.5 shrink-0 ${
                        isCollapsed
                          ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-2xs font-bold'
                          : 'bg-surface-muted text-fg border-line-divider hover:bg-hover-bg'
                      }`}
                      title={isCollapsed ? `Buka ${childrenCount} bawahan` : 'Tutup cabang'}
                    >
                      <span>{isCollapsed ? '+' : '−'}</span>
                      <span>{childrenCount}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Status / Navigation Hints */}
      <div className="px-4 py-2 border-t border-line bg-surface-muted flex flex-wrap items-center justify-between text-[11px] text-fg-muted">
        <div className="flex items-center gap-4">
          <span>
            Total <strong className="text-fg">{personnels.length}</strong> Posisi Jabatan
          </span>
          <span>•</span>
          <span>
            <strong className="text-fg">{sections.length}</strong> Seksi Pelaksana
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>Geser kanvas untuk navigasi (Pan)</span>
          <span>•</span>
          <span>
            {selectedNodeId ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                Kartu Terpilih • Klik lagi untuk Detail Jabatan
              </span>
            ) : (
              'Klik 1x untuk memilih • Klik 2x untuk Detail'
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
