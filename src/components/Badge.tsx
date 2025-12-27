import React from 'react'
import './Badge.css'

export default function Badge({ children, tone = 'neutral' }: { children: React.ReactNode, tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}
