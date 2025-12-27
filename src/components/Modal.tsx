import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

export default function Modal({
  title,
  open,
  onClose,
  children,
  footer,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  // ✅ evita que el effect dependa del identity cambiante de onClose
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // ✅ escape + bloquear scroll + foco
  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }

    window.addEventListener('keydown', handleKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // enfoque inicial (opcional)
    const prevActive = document.activeElement as HTMLElement | null

    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
      prevActive?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="modalOverlay"
      role="presentation"
      onClick={() => onCloseRef.current()} // ✅ click (no mousedown)
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()} // ✅ no cerrar al click dentro
      >
        <div className="modal__head">
          <div className="modal__title">{title}</div>
          <button className="btn btn--ghost" type="button" onClick={() => onCloseRef.current()} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal__body">{children}</div>

        {footer ? <div className="modal__foot">{footer}</div> : null}
      </div>
    </div>,
    document.body
  )
}
