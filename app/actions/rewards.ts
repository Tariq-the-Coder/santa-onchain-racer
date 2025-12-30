"use server"

// This file is no longer used - claim requests are handled via API route
// The COTI library's encryptValue and transaction methods don't work in Node.js server environments
// See app/api/claim-request/route.ts for the new implementation

export async function claimReward(playerAddress: string, coinsCollected: number) {
  return {
    success: false,
    error: "This function is deprecated. Claims are now handled via /api/claim-request",
  }
}
