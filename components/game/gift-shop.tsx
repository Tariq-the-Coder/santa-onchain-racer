"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { cotiWallet } from "@/lib/coti-wallet"
import { purchasePowerUp } from "@/app/actions/purchase"

interface GiftShopProps {
  walletBalance: number
  isLoadingBalance: boolean
  walletAddress: string
  onPurchase: (cost: number) => void
  onBack: () => void
  onRefreshBalance: () => void
}

const POWERUPS = [
  {
    id: "magnet",
    name: "Gift Magnet",
    cost: 300,
    description: "Auto-pull gifts for 20 seconds",
    icon: "🧲",
    color: "#fbbf24",
  },
  {
    id: "shield",
    name: "Naughty Shield",
    cost: 500,
    description: "Invincible to crashes for 15 seconds",
    icon: "🛡️",
    color: "#60a5fa",
  },
  {
    id: "turbo",
    name: "Turbo Nitro",
    cost: 700,
    description: "2x speed and boost for 25 seconds",
    icon: "🔥",
    color: "#dc2626",
  },
]

export function GiftShop({
  walletBalance,
  isLoadingBalance,
  walletAddress,
  onPurchase,
  onBack,
  onRefreshBalance,
}: GiftShopProps) {
  const [isCheckingApproval, setIsCheckingApproval] = useState(true)
  const [isApproved, setIsApproved] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [purchasedPowerUps, setPurchasedPowerUps] = useState<string[]>([])
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  useEffect(() => {
    const checkApproval = async () => {
      if (!walletAddress) {
        setIsCheckingApproval(false)
        return
      }

      setIsCheckingApproval(true)
      try {
        const approved = await cotiWallet.checkIsApproved(walletAddress)
        setIsApproved(approved)
      } catch (error) {
        console.error("[v0] Error checking approval:", error)
        setIsApproved(false)
      } finally {
        setIsCheckingApproval(false)
      }
    }

    checkApproval()
  }, [walletAddress])

  const handleApprove = async () => {
    setIsApproving(true)
    setPurchaseError(null)

    try {
      await cotiWallet.approveSpending()
      setIsApproved(true)
    } catch (error: any) {
      console.error("[v0] Approval failed:", error)
      setPurchaseError(error.message || "Approval failed. Please try again.")
    } finally {
      setIsApproving(false)
    }
  }

  const handlePurchase = async (powerupId: string, cost: number) => {
    if (walletBalance < cost) {
      setPurchaseError("Insufficient funds")
      return
    }

    if (!isApproved) {
      setPurchaseError("Please approve spending first")
      return
    }

    setPurchasing(powerupId)
    setPurchaseError(null)

    try {
      const result = await purchasePowerUp(walletAddress, powerupId)

      if (result.success) {
        setPurchasedPowerUps((prev) => [...prev, powerupId])
        onPurchase(cost)
        setTimeout(() => {
          onRefreshBalance()
        }, 1000)
      } else {
        setPurchaseError(result.error || "Purchase failed")
      }
    } catch (error: any) {
      console.error("[v0] Purchase error:", error)
      setPurchaseError(error.message || "Purchase failed. Please try again.")
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-balance font-sans text-5xl font-black text-[#fbbf24] md:text-7xl">GIFT SHOP</h1>
        <div className="rounded-xl border-2 border-[#00ffff] bg-[#1a1f3a]/80 px-8 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-4">
            <div>
              <div className="text-sm text-[#00ffff]">YOUR BALANCE</div>
              <div className="font-mono text-3xl font-bold text-[#fbbf24]">
                {isLoadingBalance ? "Loading..." : `${walletBalance} SOR`}
              </div>
            </div>
            <Button
              onClick={onRefreshBalance}
              disabled={isLoadingBalance}
              size="sm"
              variant="outline"
              className="border-[#00ffff] bg-transparent text-[#00ffff] hover:bg-[#00ffff]/10"
            >
              🔄
            </Button>
          </div>
        </div>
      </div>

      {isCheckingApproval ? (
        <div className="mb-8 text-center text-[#00ffff]">Checking approval status...</div>
      ) : !isApproved ? (
        <div className="mb-8 w-full max-w-md">
          <div className="mb-4 rounded-xl border-2 border-[#fbbf24] bg-[#1a1f3a]/80 p-6 text-center backdrop-blur-sm">
            <div className="mb-2 text-xl font-bold text-white">Approve Spending</div>
            <p className="mb-4 text-sm text-[#00ffff]">
              You need to approve the game to spend your SOR tokens for purchases. This is a one-time transaction.
            </p>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="w-full bg-[#fbbf24] font-bold text-black hover:bg-[#fbbf24]/80"
            >
              {isApproving ? "Approving..." : "Approve Spending"}
            </Button>
          </div>
        </div>
      ) : null}

      {purchaseError && (
        <div className="mb-4 rounded-xl border-2 border-red-500 bg-red-500/20 px-6 py-3 text-center text-red-400">
          {purchaseError}
        </div>
      )}

      <div className="mb-8 grid max-w-4xl gap-6 sm:grid-cols-3">
        {POWERUPS.map((powerup) => {
          const canAfford = walletBalance >= powerup.cost
          const isPurchasing = purchasing === powerup.id
          const isPurchased = purchasedPowerUps.includes(powerup.id)
          const isDisabled = !isApproved || !canAfford || isPurchasing || isPurchased

          return (
            <div
              key={powerup.id}
              className="rounded-xl border-2 bg-[#1a1f3a]/80 p-6 backdrop-blur-sm"
              style={{ borderColor: powerup.color }}
            >
              <div className="mb-4 text-center text-5xl">{powerup.icon}</div>
              <h3 className="mb-2 text-center text-xl font-bold text-white">{powerup.name}</h3>
              <p className="mb-4 text-center text-sm text-[#00ffff]">{powerup.description}</p>
              <div className="mb-4 text-center font-mono text-2xl font-bold text-[#fbbf24]">{powerup.cost} SOR</div>
              <Button
                onClick={() => handlePurchase(powerup.id, powerup.cost)}
                disabled={isDisabled}
                className="w-full font-bold"
                style={{
                  backgroundColor: isDisabled ? "#4b5563" : powerup.color,
                  color: "white",
                }}
              >
                {isPurchasing
                  ? "Processing..."
                  : isPurchased
                    ? "Purchased!"
                    : !isApproved
                      ? "Approve First"
                      : !canAfford
                        ? "Insufficient Funds"
                        : "Private Purchase"}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Back button */}
      <Button
        onClick={onBack}
        variant="outline"
        size="lg"
        className="border-2 border-[#00ffff] bg-transparent px-12 text-lg font-bold text-[#00ffff] hover:bg-[#00ffff]/10"
      >
        BACK TO MENU
      </Button>
    </div>
  )
}
