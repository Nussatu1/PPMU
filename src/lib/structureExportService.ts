import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import * as htmlToImage from 'html-to-image'
import type { Personnel, Section, Organization } from '@/types/database'

export interface ExportLayoutNode {
  data: Personnel
  level: number
  x: number
  y: number
  width: number
  height: number
}

export interface ExportConnection {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  fromId: string
  toId: string
}

export interface ExportLayoutResult {
  layoutNodes: ExportLayoutNode[]
  connections: ExportConnection[]
  bounds: {
    width: number
    height: number
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
}

export interface ExportOptions {
  scope: 'all' | 'branch' | 'section'
  targetId?: string // Personnel ID (if branch) or Section ID (if section)
  format: 'png' | 'jpg' | 'pdf' | 'all'
  orientation: 'horizontal' | 'vertical'
  organization?: Organization | null
  title?: string
  subtitle?: string
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 80
const HORIZONTAL_SPACING = 90
const VERTICAL_SPACING = 30
const PADDING = 60
const HEADER_HEIGHT = 120

/**
 * Filter personel untuk sub-cabang tertentu (root + seluruh bawahan rekursif)
 */
export function getSubtreePersonnel(
  rootId: string,
  allPersonnels: Personnel[]
): Personnel[] {
  const root = allPersonnels.find(p => p.id === rootId)
  if (!root) return allPersonnels

  const result: Personnel[] = [{ ...root, parent_id: null }]
  const queue = [rootId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = allPersonnels.filter(p => p.parent_id === currentId)
    for (const child of children) {
      result.push(child)
      queue.push(child.id)
    }
  }

  return result
}

/**
 * Filter personel untuk seksi tertentu (memutuskan parent jika berada di luar seksi)
 */
export function getSectionPersonnel(
  sectionId: string,
  allPersonnels: Personnel[]
): Personnel[] {
  const secPersonnels = allPersonnels.filter(p => p.section_id === sectionId)
  const secIds = new Set(secPersonnels.map(p => p.id))

  return secPersonnels.map(p => {
    if (p.parent_id && !secIds.has(p.parent_id)) {
      return { ...p, parent_id: null }
    }
    return p
  })
}

/**
 * Menghitung koordinat dan relasi untuk rendering ekspor statis resolusi tinggi
 */
export function computeExportLayout(
  personnels: Personnel[],
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): ExportLayoutResult {
  const nodes: ExportLayoutNode[] = []
  const conns: ExportConnection[] = []

  const rootNodes = personnels.filter(p => !p.parent_id || !personnels.some(other => other.id === p.parent_id))

  let maxX = 0
  let maxY = 0

  function measureSubtree(prs: Personnel): number {
    const directChildren = personnels.filter(p => p.parent_id === prs.id)
    if (directChildren.length === 0) {
      return orientation === 'horizontal' ? NODE_HEIGHT + VERTICAL_SPACING : NODE_WIDTH + HORIZONTAL_SPACING
    }
    return directChildren.reduce((acc, child) => acc + measureSubtree(child), 0)
  }

  if (orientation === 'horizontal') {
    let currentY = PADDING + HEADER_HEIGHT

    function positionNodeH(prs: Personnel, level: number, startY: number): ExportLayoutNode {
      const subtreeHeight = measureSubtree(prs)
      const nodeY = startY + subtreeHeight / 2 - NODE_HEIGHT / 2
      const nodeX = PADDING + level * (NODE_WIDTH + HORIZONTAL_SPACING)

      const directChildren = personnels.filter(p => p.parent_id === prs.id)

      if (directChildren.length > 0) {
        let childY = startY
        directChildren.forEach(child => {
          const childSubtreeHeight = measureSubtree(child)
          const childNode = positionNodeH(child, level + 1, childY)

          const fromX = nodeX + NODE_WIDTH
          const fromY = nodeY + NODE_HEIGHT / 2
          const toX = childNode.x
          const toY = childNode.y + NODE_HEIGHT / 2

          conns.push({
            id: `${prs.id}->${child.id}`,
            fromX,
            fromY,
            toX,
            toY,
            fromId: prs.id,
            toId: child.id,
          })

          childY += childSubtreeHeight
        })
      }

      const tNode: ExportLayoutNode = {
        data: prs,
        level,
        x: nodeX,
        y: nodeY,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      }

      nodes.push(tNode)
      maxX = Math.max(maxX, nodeX + NODE_WIDTH + PADDING)
      maxY = Math.max(maxY, nodeY + NODE_HEIGHT + PADDING)
      return tNode
    }

    rootNodes.forEach(root => {
      const subHeight = measureSubtree(root)
      positionNodeH(root, 0, currentY)
      currentY += subHeight + 40
    })
  } else {
    let currentX = PADDING

    function positionNodeV(prs: Personnel, level: number, startX: number): ExportLayoutNode {
      const subtreeWidth = measureSubtree(prs)
      const nodeX = startX + subtreeWidth / 2 - NODE_WIDTH / 2
      const nodeY = PADDING + HEADER_HEIGHT + level * (NODE_HEIGHT + 70)

      const directChildren = personnels.filter(p => p.parent_id === prs.id)

      if (directChildren.length > 0) {
        let childX = startX
        directChildren.forEach(child => {
          const childSubtreeWidth = measureSubtree(child)
          const childNode = positionNodeV(child, level + 1, childX)

          const fromX = nodeX + NODE_WIDTH / 2
          const fromY = nodeY + NODE_HEIGHT
          const toX = childNode.x + NODE_WIDTH / 2
          const toY = childNode.y

          conns.push({
            id: `${prs.id}->${child.id}`,
            fromX,
            fromY,
            toX,
            toY,
            fromId: prs.id,
            toId: child.id,
          })

          childX += childSubtreeWidth
        })
      }

      const tNode: ExportLayoutNode = {
        data: prs,
        level,
        x: nodeX,
        y: nodeY,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      }

      nodes.push(tNode)
      maxX = Math.max(maxX, nodeX + NODE_WIDTH + PADDING)
      maxY = Math.max(maxY, nodeY + NODE_HEIGHT + PADDING)
      return tNode
    }

    rootNodes.forEach(root => {
      const subWidth = measureSubtree(root)
      positionNodeV(root, 0, currentX)
      currentX += subWidth + 60
    })
  }

  const finalWidth = Math.max(maxX, 960)
  const finalHeight = Math.max(maxY, 640)

  return {
    layoutNodes: nodes,
    connections: conns,
    bounds: {
      width: finalWidth,
      height: finalHeight,
      minX: PADDING,
      minY: PADDING + HEADER_HEIGHT,
      maxX,
      maxY,
    },
  }
}

/**
 * Membangun elemen DOM terisolasi untuk rendering foto beresolusi tinggi.
 * Elemen ini diposisikan pada koordinat lokal (0, 0) agar foreignObject / canvas capture
 * tidak tergeser ke koordinat negatif.
 */
export function buildExportDOM(
  layoutResult: ExportLayoutResult,
  sections: Section[],
  options: {
    orgName: string
    documentTitle: string
    dateString: string
    orientation: 'horizontal' | 'vertical'
    transparentBackground?: boolean
  }
): HTMLElement {
  const { layoutNodes, connections, bounds } = layoutResult
  const sectionMap = new Map(sections.map(s => [s.id, s]))

  // Wrapper Container Utama (Koordinat lokal 0,0)
  const wrapper = document.createElement('div')
  wrapper.style.position = 'absolute'
  wrapper.style.left = '0px'
  wrapper.style.top = '0px'
  wrapper.style.width = `${bounds.width}px`
  wrapper.style.height = `${bounds.height}px`
  wrapper.style.backgroundColor = options.transparentBackground ? 'transparent' : '#ffffff'
  wrapper.style.color = '#18181b'
  wrapper.style.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  wrapper.style.boxSizing = 'border-box'
  wrapper.style.overflow = 'hidden'

  // Header Banner Dokumen Resmi
  const header = document.createElement('div')
  header.style.position = 'absolute'
  header.style.top = '28px'
  header.style.left = `${PADDING}px`
  header.style.right = `${PADDING}px`
  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'
  header.style.borderBottom = '2px solid #f4f4f5'
  header.style.paddingBottom = '16px'

  const headerLeft = document.createElement('div')
  headerLeft.style.display = 'flex'
  headerLeft.style.flexDirection = 'column'
  headerLeft.style.alignItems = 'flex-start'
  headerLeft.style.justifyContent = 'center'
  headerLeft.style.gap = '6px'

  const titleEl = document.createElement('h1')
  titleEl.innerText = options.documentTitle.toUpperCase()
  titleEl.style.fontSize = '20px'
  titleEl.style.fontWeight = '800'
  titleEl.style.letterSpacing = '-0.02em'
  titleEl.style.margin = '0'
  titleEl.style.padding = '0'
  titleEl.style.lineHeight = '1.2'
  titleEl.style.color = '#09090b'

  const orgEl = document.createElement('p')
  orgEl.innerText = options.orgName
  orgEl.style.fontSize = '13px'
  orgEl.style.fontWeight = '600'
  orgEl.style.color = '#71717a'
  orgEl.style.margin = '0'
  orgEl.style.padding = '0'
  orgEl.style.lineHeight = '1.4'

  headerLeft.appendChild(titleEl)
  headerLeft.appendChild(orgEl)

  const headerRight = document.createElement('div')
  headerRight.style.display = 'flex'
  headerRight.style.flexDirection = 'column'
  headerRight.style.alignItems = 'flex-end'
  headerRight.style.justifyContent = 'center'
  headerRight.style.gap = '4px'
  headerRight.style.textAlign = 'right'

  const dateLabel = document.createElement('span')
  dateLabel.innerText = 'DITERBITKAN PADA:'
  dateLabel.style.fontSize = '10px'
  dateLabel.style.fontWeight = '700'
  dateLabel.style.letterSpacing = '0.05em'
  dateLabel.style.color = '#a1a1aa'
  dateLabel.style.margin = '0'
  dateLabel.style.padding = '0'

  const dateValue = document.createElement('span')
  dateValue.innerText = options.dateString
  dateValue.style.fontSize = '12px'
  dateValue.style.fontWeight = '600'
  dateValue.style.color = '#27272a'
  dateValue.style.margin = '0'
  dateValue.style.padding = '0'

  headerRight.appendChild(dateLabel)
  headerRight.appendChild(dateValue)

  header.appendChild(headerLeft)
  header.appendChild(headerRight)
  wrapper.appendChild(header)

  // SVG Connector Splines
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', `${bounds.width}`)
  svg.setAttribute('height', `${bounds.height}`)
  svg.style.position = 'absolute'
  svg.style.top = '0'
  svg.style.left = '0'
  svg.style.pointerEvents = 'none'

  connections.forEach(c => {
    let d = ''
    if (options.orientation === 'horizontal') {
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

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', '#d4d4d8')
    path.setAttribute('stroke-width', '2')
    path.setAttribute('stroke-linecap', 'round')
    svg.appendChild(path)

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', `${c.toX}`)
    circle.setAttribute('cy', `${c.toY}`)
    circle.setAttribute('r', '3.5')
    circle.setAttribute('fill', '#f59e0b')
    svg.appendChild(circle)
  })

  wrapper.appendChild(svg)

  // HTML Node Cards
  layoutNodes.forEach(node => {
    const card = document.createElement('div')
    card.style.position = 'absolute'
    card.style.left = `${node.x}px`
    card.style.top = `${node.y}px`
    card.style.width = `${node.width}px`
    card.style.height = `${node.height}px`
    card.style.backgroundColor = '#ffffff'
    card.style.border = '1.5px solid #e4e4e7'
    card.style.borderRadius = '12px'
    card.style.padding = '12px'
    card.style.boxSizing = 'border-box'
    card.style.display = 'flex'
    card.style.flexDirection = 'column'
    card.style.justifyContent = 'space-between'
    card.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05)'

    if (node.level === 0 || node.data.node_type === 'ketua') {
      card.style.borderTop = '3px solid #f59e0b'
    }

    // Top Header: Position + Section Code
    const topRow = document.createElement('div')
    topRow.style.display = 'flex'
    topRow.style.alignItems = 'flex-start'
    topRow.style.justifyContent = 'space-between'
    topRow.style.gap = '6px'

    const posEl = document.createElement('span')
    posEl.innerText = node.data.position || 'Jabatan'
    posEl.style.fontSize = '12px'
    posEl.style.fontWeight = '700'
    posEl.style.color = '#18181b'
    posEl.style.whiteSpace = 'nowrap'
    posEl.style.overflow = 'hidden'
    posEl.style.textOverflow = 'ellipsis'
    posEl.style.flex = '1'

    topRow.appendChild(posEl)

    const sec = sectionMap.get(node.data.section_id)
    if (sec) {
      const badge = document.createElement('span')
      badge.innerText = sec.code
      badge.style.fontSize = '9px'
      badge.style.fontWeight = '700'
      badge.style.fontFamily = 'monospace'
      badge.style.backgroundColor = '#f4f4f5'
      badge.style.color = '#3f3f46'
      badge.style.padding = '2px 5px'
      badge.style.borderRadius = '4px'
      badge.style.border = '1px solid #e4e4e7'
      badge.style.flexShrink = '0'
      topRow.appendChild(badge)
    }

    card.appendChild(topRow)

    // Bottom Row: Person Name
    const bottomRow = document.createElement('div')
    bottomRow.style.borderTop = '1px solid #f4f4f5'
    bottomRow.style.paddingTop = '6px'

    const nameEl = document.createElement('span')
    if (node.data.name && node.data.name.trim().length > 0) {
      nameEl.innerText = node.data.name
      nameEl.style.fontSize = '11px'
      nameEl.style.fontWeight = '600'
      nameEl.style.color = '#27272a'
    } else {
      nameEl.innerText = 'Belum ditentukan'
      nameEl.style.fontSize = '10px'
      nameEl.style.fontStyle = 'italic'
      nameEl.style.color = '#a1a1aa'
    }
    nameEl.style.whiteSpace = 'nowrap'
    nameEl.style.overflow = 'hidden'
    nameEl.style.textOverflow = 'ellipsis'
    nameEl.style.display = 'block'

    bottomRow.appendChild(nameEl)
    card.appendChild(bottomRow)

    wrapper.appendChild(card)
  })

  return wrapper
}

/**
 * Validasi ketat hasil buffer DataURL gambar untuk memastikan tidak ada output kosong/blank
 */
export function validateCapturedImage(dataUrl: string | null | undefined, formatName: string): void {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    throw new Error(`Ekspor ${formatName} gagal: Format data gambar tidak valid atau tidak dihasilkan.`)
  }
  // Canvas kosong berukuran 960x640 hanya menghasilkan buffer DataURL kecil (< 5000 karakter)
  if (dataUrl.length < 5000) {
    throw new Error(`Ekspor ${formatName} gagal: Hasil tangkapan layar kosong (blank output).`)
  }
}

/**
 * Konversi DataURL base64 ke Blob biner
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(parts[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Trigger download file blob ke browser pengguna
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Menghasilkan file PDF dari data URL gambar dengan penyesuaian rasio cetak A4
 */
export function createStructurePDF(
  imgDataUrl: string,
  widthPx: number,
  heightPx: number,
  title: string
): Blob {
  const isLandscape = widthPx >= heightPx
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const margin = 10
  const availWidth = pageWidth - margin * 2
  const availHeight = pageHeight - margin * 2

  // Hitung skala agar muat di dalam 1 lembar A4 secara proporsional
  const scale = Math.min(availWidth / widthPx, availHeight / heightPx)
  const renderWidth = widthPx * scale
  const renderHeight = heightPx * scale

  // Posisikan tepat di tengah halaman (centering)
  const posX = (pageWidth - renderWidth) / 2
  const posY = (pageHeight - renderHeight) / 2

  pdf.addImage(imgDataUrl, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST')
  pdf.setProperties({
    title,
    subject: 'Struktur Organisasi',
    creator: 'Filament Organization Engine',
  })

  return pdf.output('blob')
}

/**
 * Eksekutor Utama Pipeline Ekspor Struktur Organisasi:
 * Pipeline: DOM/Design -> Wait for Render -> Wait for Assets -> Capture -> Validate Output -> Convert -> Export
 */
export async function exportOrganizationStructure(
  personnels: Personnel[],
  sections: Section[],
  options: ExportOptions
): Promise<void> {
  // 1. Filter data personel berdasarkan Scope yang dipilih
  let targetPersonnels = [...personnels]
  let scopeTitle = options.title || 'Struktur Organisasi'

  if (options.scope === 'branch' && options.targetId) {
    targetPersonnels = getSubtreePersonnel(options.targetId, personnels)
    const targetNode = personnels.find(p => p.id === options.targetId)
    if (targetNode) {
      scopeTitle = `Cabang Jabatan - ${targetNode.position}`
    }
  } else if (options.scope === 'section' && options.targetId) {
    targetPersonnels = getSectionPersonnel(options.targetId, personnels)
    const sec = sections.find(s => s.id === options.targetId)
    if (sec) {
      scopeTitle = `Struktur Seksi ${sec.name}`
    }
  }

  if (targetPersonnels.length === 0) {
    throw new Error('Tidak ada data personel untuk diekspor pada filter ini.')
  }

  // 2. Hitung Layout Tata Letak Offscreen
  const layoutResult = computeExportLayout(targetPersonnels, options.orientation)

  const dateStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const orgName = options.organization?.name || 'Organisasi'

  // 3. Bangun Elemen DOM Terisolasi (PNG wajib transparan secara default)
  const exportElement = buildExportDOM(layoutResult, sections, {
    orgName,
    documentTitle: scopeTitle,
    dateString: dateStr,
    orientation: options.orientation,
    transparentBackground: true,
  })

  // Wadah mount tersembunyi yang tetap berada dalam ruang layout valid (0, 0)
  const mountContainer = document.createElement('div')
  mountContainer.id = 'filament-export-mount-container'
  mountContainer.style.position = 'fixed'
  mountContainer.style.left = '0px'
  mountContainer.style.top = '0px'
  mountContainer.style.width = '0px'
  mountContainer.style.height = '0px'
  mountContainer.style.overflow = 'hidden'
  mountContainer.style.zIndex = '-99999'
  mountContainer.style.pointerEvents = 'none'

  // Elemen ekspor berada di (0, 0) di dalam mount container
  exportElement.style.position = 'absolute'
  exportElement.style.left = '0px'
  exportElement.style.top = '0px'

  mountContainer.appendChild(exportElement)
  document.body.appendChild(mountContainer)

  try {
    // 4. Wait for Render & Assets (Font Loading + Browser Paint Tick)
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 80))))

    // 5. Helper Capture Pipeline
    const cleanFilename = `${scopeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}`

    // Capture PNG: Wajib Alpha Channel murni (transparan) & Lossless Retina 2x
    const capturePng = async (transparent: boolean = true): Promise<string> => {
      exportElement.style.backgroundColor = transparent ? 'transparent' : '#ffffff'
      const dataUrl = await htmlToImage.toPng(exportElement, {
        pixelRatio: 2,
        backgroundColor: transparent ? undefined : '#ffffff',
        skipFonts: true,
        cacheBust: true,
      })
      validateCapturedImage(dataUrl, 'PNG')
      return dataUrl
    }

    // Capture JPG: Selalu solid white, tidak ada transparansi, kualitas maksimal 1.0 (tanpa kompresi berlebih)
    const captureJpg = async (): Promise<string> => {
      exportElement.style.backgroundColor = '#ffffff'
      const dataUrl = await htmlToImage.toJpeg(exportElement, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        quality: 1.0,
        skipFonts: true,
        cacheBust: true,
      })
      validateCapturedImage(dataUrl, 'JPG')
      return dataUrl
    }

    if (options.format === 'png') {
      const pngDataUrl = await capturePng(true)
      const pngBlob = dataUrlToBlob(pngDataUrl)
      triggerFileDownload(pngBlob, `${cleanFilename}.png`)
    } else if (options.format === 'jpg') {
      const jpgDataUrl = await captureJpg()
      const jpgBlob = dataUrlToBlob(jpgDataUrl)
      triggerFileDownload(jpgBlob, `${cleanFilename}.jpg`)
    } else if (options.format === 'pdf') {
      // PDF selalu memerlukan latar solid putih agar tidak terjadi render artefak hitam
      const pdfPngDataUrl = await capturePng(false)
      const pdfBlob = createStructurePDF(
        pdfPngDataUrl,
        layoutResult.bounds.width,
        layoutResult.bounds.height,
        scopeTitle
      )
      if (pdfBlob.size < 1000) {
        throw new Error('Gagal menghasilkan dokumen PDF: Ukuran berkas tidak valid.')
      }
      triggerFileDownload(pdfBlob, `${cleanFilename}.pdf`)
    } else if (options.format === 'all') {
      // OPSI 2: Mengemas PNG (transparan), JPG (kualitas maksimal solid), dan PDF (solid cetak) ke dalam 1 ZIP
      const zip = new JSZip()

      // 1. PNG file (wajib transparan dengan alpha channel)
      const pngDataUrl = await capturePng(true)
      const pngBlob = dataUrlToBlob(pngDataUrl)
      zip.file(`${cleanFilename}.png`, pngBlob)

      // 2. JPG file (selalu solid dengan kualitas maksimal 1.0)
      const jpgDataUrl = await captureJpg()
      const jpgBlob = dataUrlToBlob(jpgDataUrl)
      zip.file(`${cleanFilename}.jpg`, jpgBlob)

      // 3. PDF file (selalu solid white agar cetak optimal)
      const pdfPngDataUrl = await capturePng(false)
      const pdfBlob = createStructurePDF(
        pdfPngDataUrl,
        layoutResult.bounds.width,
        layoutResult.bounds.height,
        scopeTitle
      )
      zip.file(`${cleanFilename}.pdf`, pdfBlob)

      // Bundling ke zip tunggal
      const zipContent = await zip.generateAsync({ type: 'blob' })
      if (zipContent.size < 2000) {
        throw new Error('Gagal menghasilkan arsip ZIP: Ukuran berkas tidak valid.')
      }
      triggerFileDownload(zipContent, `${cleanFilename}.zip`)
    }
  } finally {
    // 6. Cleanup mount container dari DOM
    if (mountContainer.parentNode) {
      mountContainer.parentNode.removeChild(mountContainer)
    }
  }
}
