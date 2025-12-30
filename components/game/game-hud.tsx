interface GameHUDProps {
  speed: number
  distance: number
  gifts: number
  multiplier: number
  activePowerups: string[]
  walletBalance: number
}

export function GameHUD({ speed, distance, gifts, multiplier, activePowerups, walletBalance }: GameHUDProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Top HUD */}
      <div className="flex items-start justify-between p-6">
        {/* Left stats */}
        <div className="space-y-2">
          <div className="rounded-lg bg-[#0a0e27]/80 px-4 py-2 backdrop-blur-sm">
            <div className="text-xs text-[#00ffff]">SPEED</div>
            <div className="font-mono text-2xl font-bold text-white">{speed} KM/H</div>
          </div>
          <div className="rounded-lg bg-[#0a0e27]/80 px-4 py-2 backdrop-blur-sm">
            <div className="text-xs text-[#00ffff]">DISTANCE</div>
            <div className="font-mono text-2xl font-bold text-white">{distance} KM</div>
          </div>
        </div>

        {/* Right stats */}
        <div className="space-y-2 text-right">
          <div className="rounded-lg bg-[#0a0e27]/80 px-4 py-2 backdrop-blur-sm">
            <div className="text-xs text-[#fbbf24]">GIFTS</div>
            <div className="font-mono text-2xl font-bold text-white">{gifts} SOR</div>
          </div>
          <div className="rounded-lg bg-[#0a0e27]/80 px-4 py-2 backdrop-blur-sm">
            <div className="text-xs text-[#22c55e]">MULTIPLIER</div>
            <div className="font-mono text-2xl font-bold text-white">x{multiplier.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Active powerups */}
      {activePowerups.length > 0 && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 space-y-2">
          {activePowerups.map((powerup) => (
            <div key={powerup} className="rounded-lg bg-[#22c55e]/80 px-4 py-2 backdrop-blur-sm">
              <div className="text-sm font-bold text-white">{powerup}</div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile controls hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center md:hidden">
        <div className="rounded-lg bg-[#0a0e27]/60 px-6 py-3 backdrop-blur-sm">
          <div className="text-sm text-[#00ffff]">Swipe LEFT/RIGHT to change lanes</div>
          <div className="text-sm text-[#f59e0b]">Swipe UP for NITRO BOOST</div>
        </div>
      </div>
    </div>
  )
}
