'use client'

export default function Header() {
  return (
    <header className="h-[70px] border-b border-white/10 bg-[#111a33] px-6 flex items-center justify-between">

      {/* Left */}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
          Nexial
        </p>
        <h2 className="text-lg font-semibold text-white">
          Investment Engine
        </h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">

        <div className="text-right">
          <p className="text-xs text-blue-200">Mode</p>
          <p className="text-sm font-semibold text-white">Invest</p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300/20 text-white">
          O
        </div>

      </div>
    </header>
  )
}