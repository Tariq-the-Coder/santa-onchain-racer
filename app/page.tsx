"use client"

import { useEffect, useState } from "react"
import { GameMenu } from "@/components/game/game-menu"
import { GameCanvas } from "@/components/game/game-canvas"
import { GameOver } from "@/components/game/game-over"
import { GiftShop } from "@/components/game/gift-shop"
import { cotiWallet } from "@/lib/coti-wallet"

export type GameState = "menu" | "playing" | "gameover" | "shop"

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("menu")
  const [walletBalance, setWalletBalance] = useState(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [aesKey, setAesKey] = useState<string | null>(null)
  const [distance, setDistance] = useState(0)
  const [giftsCollected, setGiftsCollected] = useState(0)
  const [personalBest, setPersonalBest] = useState(0)

  useEffect(() => {
    // Load personal best from localStorage
    const saved = localStorage.getItem("personalBest")
    if (saved) setPersonalBest(Number.parseInt(saved))

    const savedAddress = localStorage.getItem("walletAddress")
    if (savedAddress) setWalletAddress(savedAddress)

    const savedOnboarded = localStorage.getItem("isOnboarded")
    if (savedOnboarded === "true") setIsOnboarded(true)

    const savedAesKey = localStorage.getItem("aesKey")
    if (savedAesKey) setAesKey(savedAesKey)
  }, [])

  const fetchTokenBalance = async () => {
    if (!walletAddress || !isOnboarded) {
      console.log("[v0] Cannot fetch balance: wallet not connected or not onboarded")
      return
    }

    const signer = cotiWallet.getSigner()
    if (!signer) {
      console.log("[v0] Wallet signer not available, skipping balance fetch")
      return
    }

    setIsLoadingBalance(true)
    try {
      const balance = await cotiWallet.getTokenBalance(walletAddress)
      setWalletBalance(balance)
      console.log("[v0] Token balance updated:", balance)
    } catch (error) {
      console.error("[v0] Failed to fetch token balance:", error)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address)
    localStorage.setItem("walletAddress", address)
  }

  const handleOnboarding = (aesKey: string) => {
    setIsOnboarded(true)
    setAesKey(aesKey)
    localStorage.setItem("isOnboarded", "true")
    localStorage.setItem("aesKey", aesKey)
    setTimeout(() => fetchTokenBalance(), 500)
  }

  const handleGameOver = (finalDistance: number, finalGifts: number) => {
    setDistance(finalDistance)
    setGiftsCollected(finalGifts)

    if (finalDistance > personalBest) {
      setPersonalBest(finalDistance)
      localStorage.setItem("personalBest", finalDistance.toString())
    }

    setGameState("gameover")
    setTimeout(() => fetchTokenBalance(), 1000)
  }

  const handlePurchase = (cost: number) => {
    setWalletBalance((prev) => prev - cost)
    setTimeout(() => fetchTokenBalance(), 1000)
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0a0e27]">
      {gameState === "menu" && (
        <GameMenu
          walletBalance={walletBalance}
          isLoadingBalance={isLoadingBalance}
          walletAddress={walletAddress}
          isOnboarded={isOnboarded}
          onStart={() => setGameState("playing")}
          onShop={() => setGameState("shop")}
          onWalletConnect={handleWalletConnect}
          onOnboarding={handleOnboarding}
          onRefreshBalance={fetchTokenBalance}
        />
      )}

      {gameState === "playing" && <GameCanvas onGameOver={handleGameOver} walletBalance={walletBalance} />}

      {gameState === "gameover" && (
        <GameOver
          distance={distance}
          giftsCollected={giftsCollected}
          personalBest={personalBest}
          walletAddress={walletAddress}
          onReplay={() => setGameState("playing")}
          onMenu={() => setGameState("menu")}
          onShop={() => setGameState("shop")}
          onRefreshBalance={fetchTokenBalance}
        />
      )}

      {gameState === "shop" && (
        <GiftShop
          walletBalance={walletBalance}
          isLoadingBalance={isLoadingBalance}
          walletAddress={walletAddress}
          onPurchase={handlePurchase}
          onBack={() => setGameState("menu")}
          onRefreshBalance={fetchTokenBalance}
        />
      )}
    </main>
  )
}
