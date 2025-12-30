import { type NextRequest, NextResponse } from "next/server"

// Since filesystem doesn't work on Vercel serverless, we'll use localStorage on client
// and pass the AES key directly to server actions when needed
let ownerAesKey: string | null = null

// Store owner's AES key in memory (temporary, resets on cold starts)
export async function POST(request: NextRequest) {
  try {
    const { aesKey, ownerAddress } = await request.json()

    if (!aesKey || !ownerAddress) {
      return NextResponse.json({ error: "Missing aesKey or ownerAddress" }, { status: 400 })
    }

    // Verify it's the correct owner
    const expectedOwner = process.env.NEXT_PUBLIC_OWNER_ADDRESS?.toLowerCase()
    if (ownerAddress.toLowerCase() !== expectedOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Store in memory (will be lost on cold start, but that's ok for demo)
    ownerAesKey = aesKey

    console.log("[v0] Owner AES key stored in memory successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to store AES key:", error)
    return NextResponse.json({ error: "Failed to store AES key" }, { status: 500 })
  }
}

// Retrieve owner's AES key
export async function GET() {
  if (!ownerAesKey) {
    return NextResponse.json({ error: "AES key not found" }, { status: 404 })
  }
  return NextResponse.json({ aesKey: ownerAesKey })
}
