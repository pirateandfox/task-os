import flightdeskLogo from '../assets/flightdesk.svg'

interface Props {
  url: string
  size?: number
}

export default function PlatformIcon({ url, size = 14 }: Props) {
  const s = size

  if (/asana\.com/.test(url))
    return (
      <svg width={s} height={s} viewBox="0 0 100 92.4" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="asana-grad" cx="50%" cy="60%" r="70%">
            <stop offset="0%" stopColor="#ffb900"/>
            <stop offset="60%" stopColor="#f95d8f"/>
            <stop offset="100%" stopColor="#f95353"/>
          </radialGradient>
        </defs>
        <circle fill="url(#asana-grad)" cx="78.4" cy="54.3" r="21.7"/>
        <circle fill="url(#asana-grad)" cx="21.7" cy="54.3" r="21.7"/>
        <circle fill="url(#asana-grad)" cx="50" cy="21.7" r="21.7"/>
      </svg>
    )

  if (/missiveapp\.com/.test(url))
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 12.5C2 6 7 4 10 8.5L14 15.5C17 20 22 19.5 22 17.5"/>
        <path d="M21 12.5C22 6 17 4 14 8.5L10 15.5C7 20 2 19.5 2 17.5"/>
      </svg>
    )

  if (/notion\.so/.test(url))
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933z"/>
      </svg>
    )

  if (/linear\.app/.test(url))
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 14.5L9.5 20.5L20.5 3.5"/>
        <path d="M3.5 3.5L20.5 20.5"/>
      </svg>
    )

  if (/github\.com/.test(url))
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    )

  if (/slack\.com/.test(url))
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4a2 2 0 1 0 0 4h2V4a2 2 0 0 0-2-2z"/>
        <path d="M4 9a2 2 0 0 0 0 4h4V9H4z"/>
        <path d="M15 20a2 2 0 0 0 0-4h-2v4a2 2 0 0 0 2 2z"/>
        <path d="M20 15a2 2 0 0 0 0-4h-4v4h4z"/>
      </svg>
    )

  if (/youtu\.be|youtube\.com/.test(url))
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="4"/>
        <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none"/>
      </svg>
    )

  if (/flightdesk\.dev/.test(url))
    return <img src={flightdeskLogo} width={s} height={s} style={{ objectFit: 'contain' }} alt="FlightDesk" />

  // fallback: generic link icon
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}
