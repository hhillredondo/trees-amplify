import type { Gender } from '@/types'

interface DefaultAvatarProps {
  readonly gender: Gender
  readonly className?: string
}

function MaleSilhouette() {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className="w-[62%] h-[62%]">
      <circle cx="50" cy="32" r="16" />
      <path d="M50 52c-18 0-30 10-30 24v6c0 2 1 3 3 3h54c2 0 3-1 3-3v-6c0-14-12-24-30-24z" />
    </svg>
  )
}

function FemaleSilhouette() {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className="w-[62%] h-[62%]">
      <circle cx="50" cy="30" r="16" />
      <path d="M34 28c-2 6-3 12-2 18 1 4 3 6 6 6h24c3 0 5-2 6-6 1-6 0-12-2-18" />
      <path d="M50 54c-18 0-30 10-30 24v4c0 2 1 3 3 3h54c2 0 3-1 3-3v-4c0-14-12-24-30-24z" />
    </svg>
  )
}

export default function DefaultAvatar({ gender, className = '' }: DefaultAvatarProps) {
  return (
    <div className={`flex items-center justify-center bg-white text-[var(--color-text-primary)] ${className}`}>
      {gender === 'male' ? <MaleSilhouette /> : <FemaleSilhouette />}
    </div>
  )
}
