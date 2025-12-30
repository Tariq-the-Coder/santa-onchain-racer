import { type NextRequest, NextResponse } from "next/server"
import { writeFile, readFile, mkdir } from "fs/promises"
import { join } from "path"

const AES_KEY_PATH = join(process.cwd(), ".data", "owner-aes-key.txt")

// Store owner's AES key
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

    // Create .data directory if it doesn't exist
    await mkdir(join(process.cwd(), ".data"), { recursive: true })

    // Store the AES key
    await writeFile(AES_KEY_PATH, aesKey, "utf-8")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to store AES key:", error)
    return NextResponse.json({ error: "Failed to store AES key" }, { status: 500 })
  }
}

// Retrieve owner's AES key
export async function GET() {
  try {
    const aesKey = await readFile(AES_KEY_PATH, "utf-8")
    return NextResponse.json({ aesKey })
  } catch (error) {
    return NextResponse.json({ error: "AES key not found" }, { status: 404 })
  }
}
