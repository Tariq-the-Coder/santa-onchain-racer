import { type NextRequest, NextResponse } from "next/server"
import { writeFile, readFile, mkdir } from "fs/promises"
import { join } from "path"

interface ClaimRequest {
  playerAddress: string
  coinsCollected: number
  tokensEarned: number
  timestamp: number
  processed: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { playerAddress, coinsCollected } = await request.json()

    const tokensEarned = coinsCollected * 10

    const claimRequest: ClaimRequest = {
      playerAddress,
      coinsCollected,
      tokensEarned,
      timestamp: Date.now(),
      processed: false,
    }

    // Store claim request
    const dataDir = join(process.cwd(), ".data")
    await mkdir(dataDir, { recursive: true })

    const requestsFile = join(dataDir, "claim-requests.json")

    let requests: ClaimRequest[] = []
    try {
      const data = await readFile(requestsFile, "utf-8")
      requests = JSON.parse(data)
    } catch {
      // File doesn't exist yet
    }

    requests.push(claimRequest)
    await writeFile(requestsFile, JSON.stringify(requests, null, 2))

    return NextResponse.json({
      success: true,
      tokensEarned,
    })
  } catch (error) {
    console.error("Claim request error:", error)
    return NextResponse.json({ success: false, error: "Failed to record claim request" }, { status: 500 })
  }
}
