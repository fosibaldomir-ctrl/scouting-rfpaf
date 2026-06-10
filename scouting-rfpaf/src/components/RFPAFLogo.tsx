import { useState } from 'react'

export default function RFPAFLogo() {
  const [imageError, setImageError] = useState(false)

  // URL del escudo oficial de la RFPAF
  const logoUrl = 'https://files.asturfutbol.es/pnfg/img/web_responsive_2/ESP/logo(rffpa).png'

  if (imageError) {
    return (
      <svg viewBox="0 0 100 130" className="w-12 h-16" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="130" fill="#FFD700" rx="4"/>
        <path d="M 30 30 L 70 30 L 70 85 Q 50 110 50 110 Q 30 85 30 85 Z" fill="#1a3a6b"/>
        <text x="50" y="120" fontSize="8" fontWeight="bold" fill="#1a3a6b" textAnchor="middle">RFPAF</text>
      </svg>
    )
  }

  return (
    <img
      src={logoUrl}
      alt="RFPAF Logo"
      className="w-12 h-16 object-contain"
      onError={() => setImageError(true)}
    />
  )
}
