// src/utils/file.ts
export async function fileToDataUrl(file: File, opts?: { maxW?: number; maxH?: number; quality?: number; maxKB?: number }) {
  const maxW = opts?.maxW ?? 900
  const maxH = opts?.maxH ?? 900
  const quality = opts?.quality ?? 0.82
  const maxKB = opts?.maxKB ?? 300

  // 1) Leer como DataURL base (NO blob:)
  const base = await readFileAsDataUrl(file)

  // Si no es imagen, devuélvelo tal cual
  if (!file.type.startsWith('image/')) return base

  // 2) Si ya es pequeño, no lo tocamos
  const approxKB = Math.round((base.length * 3) / 4 / 1024)
  if (approxKB <= maxKB) return base

  // 3) Reescalar/comprimir con canvas a JPEG para que sea estable y ligero
  const compressed = await compressImageDataUrl(base, { maxW, maxH, quality })

  // Si aún queda pesado, intenta bajar calidad progresivamente
  let q = quality
  let out = compressed
  for (let i = 0; i < 4; i++) {
    const kb = Math.round((out.length * 3) / 4 / 1024)
    if (kb <= maxKB) break
    q = Math.max(0.55, q - 0.08)
    out = await compressImageDataUrl(base, { maxW, maxH, quality: q })
  }

  return out
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('No se pudo leer el archivo'))
    r.onload = () => resolve(String(r.result))
    r.readAsDataURL(file)
  })
}

async function compressImageDataUrl(dataUrl: string, opts: { maxW: number; maxH: number; quality: number }): Promise<string> {
  const img = await loadImage(dataUrl)
  const { w, h } = fit(img.width, img.height, opts.maxW, opts.maxH)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  ctx.drawImage(img, 0, 0, w, h)

  // Siempre JPEG para asegurar tamaño y compatibilidad
  const out = canvas.toDataURL('image/jpeg', opts.quality)
  return out
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}

function fit(srcW: number, srcH: number, maxW: number, maxH: number) {
  const r = Math.min(maxW / srcW, maxH / srcH, 1)
  return { w: Math.round(srcW * r), h: Math.round(srcH * r) }
}
