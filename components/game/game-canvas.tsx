"use client"

import { useEffect, useRef, useState } from "react"
import { GameHUD } from "./game-hud"
import { getAudioInstance } from "@/lib/audio"

interface GameCanvasProps {
  onGameOver: (distance: number, gifts: number) => void
  walletBalance: number
}

export function GameCanvas({ onGameOver, walletBalance }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [speed, setSpeed] = useState(0)
  const [distance, setDistance] = useState(0)
  const [gifts, setGifts] = useState(0)
  const [multiplier, setMultiplier] = useState(1.0)
  const [activePowerups, setActivePowerups] = useState<string[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const audio = getAudioInstance()
    audio.startBackgroundMusic()

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    let animationId: number
    let currentLane = 1 // 0=left, 1=middle, 2=right
    let targetLane = 1
    let carX = canvas.width / 2
    const laneWidth = canvas.width / 3
    let gameSpeed = 5
    let gameDistance = 0
    let collectedGifts = 0
    let gameMultiplier = 1.0
    let isNitroActive = false
    let nitroEndTime = 0
    let isDrifting = false
    let driftStartTime = 0
    let lastLaneSwitchTime = 0
    let perfectSwitches = 0

    // Road offset for scrolling effect
    let roadOffset = 0
    let curveOffset = 0
    const curveAmplitude = 30

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
      color: string
      size: number
      type: "drift" | "nitro" | "gift" | "crash" | "snow"
    }
    const particles: Particle[] = []

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 2 + Math.random() * 3,
        life: 1,
        maxLife: 1,
        color: "#ffffff",
        size: 2 + Math.random() * 3,
        type: "snow",
      })
    }

    // Obstacles and collectibles
    interface GameObject {
      x: number
      y: number
      lane: number
      type: "coal" | "ice" | "elf" | "gift"
      collected?: boolean
      rotation?: number
    }

    const objects: GameObject[] = []
    let lastSpawnTime = Date.now()

    const switchLane = (direction: "left" | "right") => {
      const now = Date.now()
      if (direction === "left" && currentLane > 0) {
        targetLane = currentLane - 1
        currentLane = targetLane
        isDrifting = true
        driftStartTime = now

        audio.playSwipeSound()

        if (now - lastLaneSwitchTime < 1000 && now - lastLaneSwitchTime > 100) {
          perfectSwitches++
          gameMultiplier = Math.min(gameMultiplier * 1.05, 3.0)
          console.log("[v0] Perfect switch! Multiplier:", gameMultiplier.toFixed(2))
        } else {
          perfectSwitches = 0
        }
        lastLaneSwitchTime = now

        for (let i = 0; i < 10; i++) {
          particles.push({
            x: carX + 40,
            y: canvas.height - 200 + 60,
            vx: 2 + Math.random() * 3,
            vy: Math.random() * 2,
            life: 0.5,
            maxLife: 0.5,
            color: "#60a5fa",
            size: 4 + Math.random() * 4,
            type: "drift",
          })
        }
      } else if (direction === "right" && currentLane < 2) {
        targetLane = currentLane + 1
        currentLane = targetLane
        isDrifting = true
        driftStartTime = now

        audio.playSwipeSound()

        if (now - lastLaneSwitchTime < 1000 && now - lastLaneSwitchTime > 100) {
          perfectSwitches++
          gameMultiplier = Math.min(gameMultiplier * 1.05, 3.0)
          console.log("[v0] Perfect switch! Multiplier:", gameMultiplier.toFixed(2))
        } else {
          perfectSwitches = 0
        }
        lastLaneSwitchTime = now

        for (let i = 0; i < 10; i++) {
          particles.push({
            x: carX - 40,
            y: canvas.height - 200 + 60,
            vx: -2 - Math.random() * 3,
            vy: Math.random() * 2,
            life: 0.5,
            maxLife: 0.5,
            color: "#60a5fa",
            size: 4 + Math.random() * 4,
            type: "drift",
          })
        }
      }
    }

    const activateNitro = () => {
      if (!isNitroActive) {
        isNitroActive = true
        nitroEndTime = Date.now() + 3000
        gameSpeed *= 1.5
        audio.playNitroSound()
        console.log("[v0] Nitro activated!")
      }
    }

    // Input handlers
    let touchStartX = 0
    let touchStartY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const diffX = touchEndX - touchStartX
      const diffY = touchStartY - touchEndY

      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 50) switchLane("right")
        else if (diffX < -50) switchLane("left")
      } else if (diffY > 50) {
        // Upward swipe
        activateNitro()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") switchLane("left")
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") switchLane("right")
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") activateNitro()
    }

    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchend", handleTouchEnd)
    window.addEventListener("keydown", handleKeyDown)

    // Spawn objects
    const spawnObject = () => {
      const now = Date.now()
      if (now - lastSpawnTime > 1500) {
        const lane = Math.floor(Math.random() * 3)
        const types: GameObject["type"][] = ["coal", "ice", "elf", "gift", "gift"]
        const type = types[Math.floor(Math.random() * types.length)]

        objects.push({
          x: lane * laneWidth + laneWidth / 2,
          y: -100,
          lane,
          type,
          collected: false,
          rotation: 0,
        })

        lastSpawnTime = now
      }
    }

    // Check collision
    const checkCollision = (obj: GameObject) => {
      const carY = canvas.height - 200
      const carWidth = 80
      const carHeight = 120
      const objSize = 60

      if (
        obj.lane === currentLane &&
        obj.y + objSize > carY &&
        obj.y < carY + carHeight &&
        Math.abs(obj.x - carX) < carWidth / 2
      ) {
        if (obj.type === "gift" && !obj.collected) {
          obj.collected = true
          collectedGifts += Math.floor(10 * gameMultiplier)
          audio.playGiftSound()
          console.log("[v0] Gift collected:", collectedGifts, "Multiplier:", gameMultiplier.toFixed(2))

          for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20
            particles.push({
              x: obj.x,
              y: obj.y,
              vx: Math.cos(angle) * 3,
              vy: Math.sin(angle) * 3,
              life: 0.8,
              maxLife: 0.8,
              color: "#fbbf24",
              size: 6,
              type: "gift",
            })
          }

          return "collect"
        } else if (obj.type !== "gift") {
          audio.playCrashSound()

          // Explosion particles
          for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 2 + Math.random() * 8
            particles.push({
              x: carX,
              y: carY + 60,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 2,
              life: 1.5,
              maxLife: 1.5,
              color: Math.random() > 0.5 ? "#dc2626" : "#f59e0b",
              size: 4 + Math.random() * 8,
              type: "crash",
            })
          }

          // Cartoon stars effect around the collision
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8
            particles.push({
              x: obj.x,
              y: obj.y,
              vx: Math.cos(angle) * 5,
              vy: Math.sin(angle) * 5 - 3,
              life: 1.2,
              maxLife: 1.2,
              color: i % 2 === 0 ? "#fbbf24" : "#ffffff",
              size: 8 + Math.random() * 4,
              type: "crash",
            })
          }

          return "crash"
        }
      }
      return null
    }

    const updateParticles = (deltaTime: number) => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]

        p.x += p.vx
        p.y += p.vy
        p.life -= deltaTime

        // Snow particles loop
        if (p.type === "snow") {
          if (p.y > canvas.height) {
            p.y = -10
            p.x = Math.random() * canvas.width
          }
        } else if (p.life <= 0) {
          particles.splice(i, 1)
        }

        // Apply gravity to non-snow particles
        if (p.type !== "snow") {
          p.vy += 0.2
        }
      }
    }

    const drawParticles = () => {
      particles.forEach((p) => {
        if (p.type === "snow") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
          ctx.fillRect(p.x, p.y, p.size, p.size)
        } else {
          const alpha = p.life / p.maxLife
          ctx.fillStyle = p.color.replace(")", `, ${alpha})`)
          ctx.shadowColor = p.color
          ctx.shadowBlur = p.size * 2
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      ctx.shadowBlur = 0
    }

    // Draw functions
    const drawRoad = () => {
      // Dark road
      ctx.fillStyle = "#1a1f3a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Starry sky with northern lights effect
      ctx.fillStyle = "#0a0e27"
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.4)

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height * 0.4)
      gradient.addColorStop(0, "rgba(0, 255, 170, 0.1)")
      gradient.addColorStop(0.5, "rgba(138, 43, 226, 0.15)")
      gradient.addColorStop(1, "rgba(0, 191, 255, 0.1)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.4)

      // Stars
      for (let i = 0; i < 50; i++) {
        const x = (i * 137) % canvas.width
        const y = (i * 211) % (canvas.height * 0.4)
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.fillRect(x, y, 2, 2)
      }

      // Lane lines with neon glow
      roadOffset = (roadOffset + gameSpeed * 2) % 80

      for (let lane = 1; lane < 3; lane++) {
        const x = lane * laneWidth + Math.sin(curveOffset) * curveAmplitude
        ctx.strokeStyle = "#00ffff"
        ctx.shadowColor = "#00ffff"
        ctx.shadowBlur = 10
        ctx.lineWidth = 4

        for (let y = -roadOffset; y < canvas.height; y += 80) {
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x, y + 40)
          ctx.stroke()
        }
      }

      ctx.shadowBlur = 0
    }

    const drawCar = () => {
      const carY = canvas.height - 200
      const targetX = currentLane * laneWidth + laneWidth / 2

      // Smooth lane transition
      carX += (targetX - carX) * 0.2

      if (isDrifting && Date.now() - driftStartTime > 200) {
        isDrifting = false
      }

      const driftAngle = isDrifting ? (targetX > carX ? 0.05 : -0.05) : 0

      ctx.save()
      ctx.translate(carX, carY + 60)
      ctx.rotate(driftAngle)

      const carWidth = 60
      const carHeight = 100

      // Car body - main rectangle
      ctx.fillStyle = "#dc2626"
      ctx.shadowColor = "#dc2626"
      ctx.shadowBlur = 20
      ctx.fillRect(-carWidth / 2, -carHeight / 2, carWidth, carHeight)

      // Windshield at front (top)
      ctx.fillStyle = "#60a5fa"
      ctx.shadowColor = "#60a5fa"
      ctx.shadowBlur = 10
      ctx.fillRect(-carWidth / 2 + 8, -carHeight / 2 + 5, carWidth - 16, 25)

      // Front bumper (pointy front)
      ctx.fillStyle = "#991b1b"
      ctx.beginPath()
      ctx.moveTo(-carWidth / 2 + 5, -carHeight / 2)
      ctx.lineTo(0, -carHeight / 2 - 15)
      ctx.lineTo(carWidth / 2 - 5, -carHeight / 2)
      ctx.closePath()
      ctx.fill()

      // Headlights
      ctx.fillStyle = "#fbbf24"
      ctx.shadowColor = "#fbbf24"
      ctx.shadowBlur = 15
      ctx.fillRect(-carWidth / 2 + 5, -carHeight / 2 + 2, 12, 8)
      ctx.fillRect(carWidth / 2 - 17, -carHeight / 2 + 2, 12, 8)

      // Side mirrors
      ctx.fillStyle = "#4b5563"
      ctx.fillRect(-carWidth / 2 - 8, -10, 8, 20)
      ctx.fillRect(carWidth / 2, -10, 8, 20)

      // Rear window
      ctx.fillStyle = "#1e3a8a"
      ctx.fillRect(-carWidth / 2 + 8, carHeight / 2 - 30, carWidth - 16, 25)

      // Racing stripes
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(-3, -carHeight / 2, 6, carHeight)

      ctx.shadowBlur = 0

      // Drift trail particles
      if (gameSpeed > 0) {
        particles.push({
          x: carX,
          y: carY + 120,
          vx: (Math.random() - 0.5) * 2,
          vy: 1 + Math.random(),
          life: 0.3,
          maxLife: 0.3,
          color: "#60a5fa",
          size: 3,
          type: "drift",
        })
      }

      // Nitro flames from back
      if (isNitroActive) {
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: carX + (Math.random() - 0.5) * 40,
            y: carY + 120,
            vx: (Math.random() - 0.5) * 3,
            vy: 3 + Math.random() * 5,
            life: 0.4,
            maxLife: 0.4,
            color: i % 2 === 0 ? "#f59e0b" : "#dc2626",
            size: 6 + Math.random() * 6,
            type: "nitro",
          })
        }

        ctx.fillStyle = "#f59e0b"
        ctx.shadowColor = "#f59e0b"
        ctx.shadowBlur = 30
        for (let i = 0; i < 3; i++) {
          const flameY = carHeight / 2 + i * 10
          const flameWidth = 30 - i * 8
          ctx.fillRect(-flameWidth / 2, flameY, flameWidth, 10)
        }
      }

      ctx.restore()
      ctx.shadowBlur = 0
    }

    const drawObjects = () => {
      objects.forEach((obj) => {
        if (obj.collected) return

        const size = 60

        const curvedX = obj.x + Math.sin(curveOffset + obj.y * 0.01) * curveAmplitude

        ctx.save()
        ctx.translate(curvedX, obj.y)

        if (obj.type === "gift") {
          obj.rotation = (obj.rotation || 0) + 0.05
          ctx.rotate(obj.rotation)

          // Gift box color variations - red, gold, blue, pink
          const giftColors = [
            { box: "#dc2626", ribbon: "#fbbf24" }, // Red with gold ribbon
            { box: "#3b82f6", ribbon: "#f472b6" }, // Blue with pink ribbon
            { box: "#ec4899", ribbon: "#fbbf24" }, // Pink with gold ribbon
            { box: "#a855f7", ribbon: "#60a5fa" }, // Purple with blue ribbon
          ]
          // Ensure colorIndex is always a valid positive number
          const colorIndex = Math.abs(Math.floor(obj.y / 150) % giftColors.length)
          const colors = giftColors[colorIndex]

          ctx.fillStyle = colors.box
          ctx.shadowColor = colors.box
          ctx.shadowBlur = 15
          ctx.fillRect(-size / 2, -size / 2, size, size)

          // Ribbon
          ctx.fillStyle = colors.ribbon
          ctx.fillRect(-size / 2, -5, size, 10)
          ctx.fillRect(-5, -size / 2, 10, size)

          // Bow on top
          ctx.beginPath()
          ctx.arc(-10, -size / 2, 8, 0, Math.PI * 2)
          ctx.arc(10, -size / 2, 8, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.font = `${size * 1.2}px Arial`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.shadowBlur = 15

          // Different emojis for variety
          if (obj.type === "coal") {
            ctx.shadowColor = "#ff69b4"
            ctx.fillText("👰", 0, 0) // Bride
          } else if (obj.type === "ice") {
            ctx.shadowColor = "#ec4899"
            ctx.fillText("💃", 0, 0) // Dancing woman
          } else {
            ctx.shadowColor = "#9333ea"
            ctx.fillText("👸", 0, 0) // Princess
          }
        }

        ctx.restore()
      })

      ctx.shadowBlur = 0
    }

    // Game loop
    let lastFrameTime = Date.now()

    const gameLoop = () => {
      const now = Date.now()
      const deltaTime = (now - lastFrameTime) / 1000
      lastFrameTime = now

      drawRoad()

      curveOffset += deltaTime * 2

      // Update game speed
      gameSpeed += 0.001
      gameDistance += gameSpeed / 60

      if (gameMultiplier > 1.0) {
        gameMultiplier = Math.max(1.0, gameMultiplier - deltaTime * 0.05)
      }

      // Check nitro
      if (isNitroActive && Date.now() > nitroEndTime) {
        isNitroActive = false
        gameSpeed /= 1.5
        console.log("[v0] Nitro ended")
      }

      updateParticles(deltaTime)

      // Spawn and update objects
      spawnObject()

      objects.forEach((obj, index) => {
        obj.y += gameSpeed

        const collision = checkCollision(obj)
        if (collision === "crash") {
          console.log("[v0] Game Over - Collision detected")
          cancelAnimationFrame(animationId)
          audio.stopBackgroundMusic()
          onGameOver(Math.floor(gameDistance), collectedGifts)
          return
        }

        // Remove off-screen objects
        if (obj.y > canvas.height + 100) {
          objects.splice(index, 1)
        }
      })

      drawObjects()

      drawParticles()

      drawCar()

      // Update React state periodically
      setSpeed(Math.floor(gameSpeed * 20))
      setDistance(Math.floor(gameDistance))
      setGifts(collectedGifts)
      setMultiplier(gameMultiplier)

      animationId = requestAnimationFrame(gameLoop)
    }

    gameLoop()

    return () => {
      cancelAnimationFrame(animationId)
      audio.stopBackgroundMusic()
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [onGameOver])

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <GameHUD
        speed={speed}
        distance={distance}
        gifts={gifts}
        multiplier={multiplier}
        activePowerups={activePowerups}
        walletBalance={walletBalance}
      />
    </div>
  )
}
