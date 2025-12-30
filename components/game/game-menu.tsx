"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cotiWallet } from "@/lib/coti-wallet"

interface GameMenuProps {
  walletBalance: number
  isLoadingBalance: boolean
  walletAddress: string
  isOnboarded: boolean
  onStart: () => void
  onShop: () => void
  onWalletConnect: (address: string) => void
  onOnboarding: (aesKey: string) => void
  onRefreshBalance: () => void
  onDisconnect: () => void
}

export function GameMenu({
  walletBalance,
  isLoadingBalance,
  walletAddress,
  isOnboarded,
  onStart,
  onShop,
  onWalletConnect,
  onOnboarding,
  onRefreshBalance,
  onDisconnect,
}: GameMenuProps) {
  const [connecting, setConnecting] = useState(false)
  const [onboarding, setOnboarding] = useState(false)
  const [error, setError] = useState("")

  const handleConnectWallet = async () => {
    setConnecting(true)
    setError("")

    try {
      // First, switch to COTI testnet
      await cotiWallet.switchToTestnet()

      // Then connect wallet
      const { address } = await cotiWallet.connectWallet()
      onWalletConnect(address)
    } catch (err: any) {
      console.error("[v0] Wallet connection error:", err)
      setError(err.message || "Failed to connect wallet")
    } finally {
      setConnecting(false)
    }
  }

  const handleOnboarding = async () => {
    setOnboarding(true)
    setError("")

    try {
      if (!walletAddress) {
        throw new Error("Please connect your wallet first")
      }

      const { aesKey } = await cotiWallet.onboardWallet()

      const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS
      if (walletAddress.toLowerCase() === ownerAddress?.toLowerCase()) {
        try {
          const response = await fetch("/api/owner-aes-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aesKey, ownerAddress: walletAddress }),
          })

          if (response.ok) {
            console.log("Owner AES key stored successfully")
          }
        } catch (err) {
          console.error("Failed to store owner AES key:", err)
        }
      }

      onOnboarding(aesKey)
    } catch (err: any) {
      console.error("Onboarding error:", err)
      setError(err.message || "Failed to complete onboarding")
    } finally {
      setOnboarding(false)
    }
  }

  const handleDisconnect = () => {
    cotiWallet.disconnect()
    onDisconnect()
  }

  const connected = walletAddress !== ""
  const canPlay = connected && isOnboarded

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] p-6">
      {/* Title */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-balance font-sans text-6xl font-black leading-none tracking-tight text-white md:text-8xl">
          <span className="block text-[#dc2626]">SANTA'S</span>
          <span className="block text-[#00ffff]">ONCHAIN</span>
          <span className="block text-[#fbbf24]">RACE</span>
        </h1>
        <p className="text-lg text-[#00ffff] md:text-xl">Race and deliver gifts without a trace</p>
      </div>

      {/* Wallet balance */}
      <div className="mb-8 rounded-xl border-2 border-[#00ffff] bg-[#1a1f3a]/80 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-[#00ffff]">WALLET BALANCE</div>
            <div className="font-mono text-3xl font-bold text-[#fbbf24]">
              {isLoadingBalance ? "Loading..." : `${walletBalance} SOR`}
            </div>
            {connected && (
              <div className="mt-2 text-xs text-[#22c55e]">
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            )}
            {connected && isOnboarded && <div className="mt-1 text-xs text-[#22c55e]">Wallet Ready</div>}
          </div>
          {connected && (
            <div className="flex gap-2">
              {isOnboarded && (
                <Button
                  onClick={onRefreshBalance}
                  disabled={isLoadingBalance}
                  size="sm"
                  variant="outline"
                  className="border-[#00ffff] bg-transparent text-[#00ffff] hover:bg-[#00ffff]/10"
                >
                  🔄
                </Button>
              )}
              <Button
                onClick={handleDisconnect}
                size="sm"
                variant="outline"
                className="border-[#dc2626] bg-transparent text-[#dc2626] hover:bg-[#dc2626]/10"
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 max-w-md rounded-lg border-2 border-[#dc2626] bg-[#dc2626]/20 px-6 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {connected && !isOnboarded && (
        <div className="mb-6 rounded-lg border-2 border-[#fbbf24] bg-[#fbbf24]/20 px-6 py-3 text-center text-sm text-[#fbbf24]">
          Complete wallet setup to play
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          onClick={onStart}
          size="lg"
          disabled={!canPlay}
          className="bg-[#dc2626] px-12 py-6 text-xl font-bold text-white hover:bg-[#dc2626]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          START RACE!
        </Button>
        <Button
          onClick={onShop}
          size="lg"
          variant="outline"
          className="border-2 border-[#22c55e] bg-transparent px-12 py-6 text-xl font-bold text-[#22c55e] hover:bg-[#22c55e]/10"
        >
          GIFT SHOP
        </Button>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {!connected && (
          <Button
            onClick={handleConnectWallet}
            disabled={connecting}
            variant="outline"
            className="border-[#00ffff] bg-transparent text-[#00ffff] hover:bg-[#00ffff]/10"
          >
            {connecting ? "Connecting..." : "Connect COTI Wallet"}
          </Button>
        )}

        {connected && !isOnboarded && (
          <Button
            onClick={handleOnboarding}
            disabled={onboarding}
            variant="outline"
            className="border-[#fbbf24] bg-transparent text-[#fbbf24] hover:bg-[#fbbf24]/10"
          >
            {onboarding ? "Setting up..." : "Setup Wallet"}
          </Button>
        )}

        {connected && isOnboarded && <div className="text-center text-sm text-[#22c55e]">Wallet Connected & Ready</div>}
      </div>

      {connected && <div className="mt-2 text-xs text-[#00ffff]/60">COTI Testnet</div>}

      {/* Controls hint */}
      <div className="mt-8 rounded-lg bg-[#1a1f3a]/60 px-6 py-4 backdrop-blur-sm">
        <div className="text-center text-sm text-[#00ffff]">
          <div className="mb-2 font-bold">CONTROLS</div>
          <div>Mobile: Swipe LEFT/RIGHT to switch lanes, UP for NITRO</div>
          <div>Desktop: A/D or Arrow Keys to switch lanes, W or UP for NITRO</div>
        </div>
      </div>
    </div>
  )
}
