import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Radio } from '@/components/ui/Radio'
import type { Personnel } from '@/types/database'
import { HeroTrash, HeroExclamationTriangle } from '@/components/icons/HeroIcons'

export interface HierarchyDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  personnel: Personnel | null
  subordinates: Personnel[]
  parentPersonnel: Personnel | null
  onConfirm: (
    prs: Personnel,
    options: { reassignToParentId?: string | null; cascade?: boolean }
  ) => Promise<void>
}

export const HierarchyDeleteModal: React.FC<HierarchyDeleteModalProps> = ({
  isOpen,
  onClose,
  personnel,
  subordinates,
  parentPersonnel,
  onConfirm,
}) => {
  const [strategy, setStrategy] = useState<'reassign' | 'cascade'>('reassign')
  const [isDeleting, setIsDeleting] = useState(false)

  if (!personnel) return null

  const hasChildren = subordinates.length > 0

  const handleExecute = async () => {
    setIsDeleting(true)
    try {
      if (hasChildren && strategy === 'reassign') {
        await onConfirm(personnel, {
          reassignToParentId: parentPersonnel ? parentPersonnel.id : null,
          cascade: false,
        })
      } else if (hasChildren && strategy === 'cascade') {
        await onConfirm(personnel, {
          cascade: true,
        })
      } else {
        await onConfirm(personnel, {})
      }
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hasChildren ? 'Tindakan Penghapusan Jabatan Berhierarki' : 'Konfirmasi Hapus Jabatan'}
      size="md"
    >
      <div className="space-y-4">
        {hasChildren ? (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-300 flex items-start gap-3">
            <HeroExclamationTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="font-semibold block text-sm mb-1">
                Jabatan ini memiliki {subordinates.length} struktur di bawahnya!
              </strong>
              Jabatan <span className="font-bold underline">{personnel.position}</span> memiliki bawahan langsung yang terdaftar. Tentukan tindakan penanganan bawahan sebelum menghapus:
            </div>
          </div>
        ) : (
          <p className="text-xs text-fg-muted leading-relaxed">
            Apakah Anda yakin ingin menghapus jabatan{' '}
            <strong className="text-fg">{personnel.position}</strong>
            {personnel.name ? ` (${personnel.name})` : ''}? Tindakan ini akan menghapus penugasan dari bagan organisasi.
          </p>
        )}

        {hasChildren && (
          <div className="space-y-3 pt-2">
            <div
              onClick={() => setStrategy('reassign')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                strategy === 'reassign'
                  ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500'
                  : 'border-line bg-surface hover:bg-hover-bg'
              }`}
            >
              <div className="flex items-start gap-3">
                <Radio
                  name="delete-strategy"
                  checked={strategy === 'reassign'}
                  onChange={() => setStrategy('reassign')}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-fg block">
                    Pindahkan seluruh bawahan ke atasan
                  </span>
                  <p className="text-[11px] text-fg-muted leading-relaxed">
                    Bawahan akan dinaikkan langsung ke{' '}
                    <strong className="text-fg">
                      {parentPersonnel ? parentPersonnel.position : 'Pucuk Pimpinan Tertinggi (Root)'}
                    </strong>
                    . Hierarki cabang tetap aman dan tidak terputus.
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setStrategy('cascade')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                strategy === 'cascade'
                  ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500'
                  : 'border-line bg-surface hover:bg-hover-bg'
              }`}
            >
              <div className="flex items-start gap-3">
                <Radio
                  name="delete-strategy"
                  checked={strategy === 'cascade'}
                  onChange={() => setStrategy('cascade')}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 block">
                    Hapus permanen beserta seluruh bawahan (Cascade)
                  </span>
                  <p className="text-[11px] text-fg-muted leading-relaxed">
                    Jabatan ini beserta seluruh {subordinates.length} bawahan dan sub-cabangnya akan dihapus total secara bersamaan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <Button
            type="button"
            variant="secondary"
            disabled={isDeleting}
            onClick={onClose}
          >
            Batal
          </Button>

          <Button
            type="button"
            variant="danger"
            isLoading={isDeleting}
            onClick={handleExecute}
            icon={<HeroTrash className="w-4 h-4" />}
          >
            {hasChildren
              ? strategy === 'cascade'
                ? 'Hapus Beserta Bawahan'
                : 'Pindahkan & Hapus'
              : 'Konfirmasi Hapus'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
