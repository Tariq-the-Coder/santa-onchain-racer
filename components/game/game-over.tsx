"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { claimReward } from "@/app/actions/rewards"

interface GameOverProps {
  distance: number
  giftsCollected: number
  personalBest: number
  walletAddress: string
  onReplay: () => void
  onMenu: () => void
  onShop: () => void
  onRefreshBalance: () => Promise<void>
}

export function GameOver({
  distance,
  giftsCollected,
  personalBest,
  walletAddress,
  onReplay,
  onMenu,
  onShop,
  onRefreshBalance,
}: GameOverProps) {
  const isNewRecord = distance >= personalBest
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [tokensEarned, setTokensEarned] = useState(0)

  const handleClaimRewards = async () => {
    if (!walletAddress) {
      setClaimError("Please connect your wallet first")
      return
    }

    setClaiming(true)
    setClaimError(null)

    try {
      const result = await claimReward(walletAddress, giftsCollected)

      if (result.success) {
        setTokensEarned(result.amount)
        setClaimed(true)
        // Refresh balance after claiming
        await onRefreshBalance()
      } else {
        setClaimError(result.error || "Failed to claim rewards")
      }
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : "Failed to claim rewards")
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] p-6">
      {/* Game Over Title */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-balance font-sans text-5xl font-black text-[#dc2626] md:text-7xl">💥 CRASHED! 💥</h1>
        {isNewRecord && <div className="animate-pulse text-2xl font-bold text-[#fbbf24]">NEW RECORD!</div>}
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-[#00ffff] bg-[#1a1f3a]/80 px-8 py-4 text-center backdrop-blur-sm">
          <div className="text-sm text-[#00ffff]">DISTANCE</div>
          <div className="font-mono text-4xl font-bold text-white">{distance} KM</div>
        </div>

        <div className="rounded-xl border-2 border-[#fbbf24] bg-[#1a1f3a]/80 px-8 py-4 text-center backdrop-blur-sm">
          <div className="text-sm text-[#fbbf24]">COINS COLLECTED</div>
          <div className="font-mono text-4xl font-bold text-white">{giftsCollected}</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border-2 border-[#22c55e] bg-[#1a1f3a]/80 px-8 py-4 text-center backdrop-blur-sm">
        <div className="text-sm text-[#22c55e]">TOKENS EARNED</div>
        <div className="font-mono text-4xl font-bold text-white">{giftsCollected * 10} SOR</div>
      </div>

      {/* Personal Best */}
      <div className="mb-8 rounded-xl bg-[#1a1f3a]/60 px-6 py-3 backdrop-blur-sm">
        <div className="text-sm text-[#00ffff]">PERSONAL BEST</div>
        <div className="font-mono text-2xl font-bold text-white">{personalBest} KM</div>
      </div>

      {!claimed && (
        <Button
          onClick={handleClaimRewards}
          disabled={claiming || !walletAddress}
          className="mb-6 bg-[#22c55e] px-12 py-6 text-xl font-bold text-white hover:bg-[#22c55e]/90 disabled:opacity-50"
        >
          {claiming ? "Claiming Rewards..." : "Claim Rewards"}
        </Button>
      )}

      {claimed && (
        <div className="mb-6 rounded-lg border-2 border-[#22c55e] bg-[#22c55e]/10 px-6 py-3 backdrop-blur-sm">
          <div className="text-center font-bold text-[#22c55e]">{tokensEarned} tokens added to your wallet!</div>
          <div className="text-center text-xs text-[#22c55e]/80">Private transaction confirmed on COTI Network</div>
        </div>
      )}

      {claimError && (
        <div className="mb-6 rounded-lg border-2 border-[#dc2626] bg-[#dc2626]/10 px-6 py-3 backdrop-blur-sm">
          <div className="text-center text-sm text-[#dc2626]">{claimError}</div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          onClick={onReplay}
          size="lg"
          className="bg-[#dc2626] px-8 text-lg font-bold text-white hover:bg-[#dc2626]/90"
        >
          REPLAY
        </Button>
        <Button
          onClick={onShop}
          size="lg"
          variant="outline"
          className="border-2 border-[#fbbf24] bg-transparent px-8 text-lg font-bold text-[#fbbf24] hover:bg-[#fbbf24]/10"
        >
          SHOP
        </Button>
        <Button
          onClick={onMenu}
          size="lg"
          variant="outline"
          className="border-2 border-[#00ffff] bg-transparent px-8 text-lg font-bold text-[#00ffff] hover:bg-[#00ffff]/10"
        >
          MENU
        </Button>
      </div>
    </div>
  )
}
