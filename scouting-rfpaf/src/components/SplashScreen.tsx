import { useEffect, useState } from 'react'
import RFPAFLogo from './RFPAFLogo'

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-6 px-4">
        {/* Shield Logo */}
        <div className="animate-fade-in">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-2xl shadow-2xl flex items-center justify-center p-6">
            <RFPAFLogo />
          </div>
        </div>

        {/* Text */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">STAFF LAB</h1>
          <p className="text-sm md:text-base text-slate-300 mt-2">
            Real Federación de Fútbol<br />
            Principado de Asturias
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="animate-fade-in mt-8" style={{ animationDelay: '0.6s' }}>
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}
