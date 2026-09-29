export type HelpStep = {
  judul: string
  deskripsi: string
}

export type HelpContent = {
  key: string
  judul: string
  ringkasan: string
  langkah: HelpStep[]
  tips?: string[]
  terkait?: string[]
}
