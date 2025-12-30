"use server"

import { Contract, JsonRpcProvider, Wallet } from "@coti-io/coti-ethers"

const TOKEN_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        components: [
          {
            internalType: "ctUint64",
            name: "ciphertext",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct itUint64",
        name: "value",
        type: "tuple",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "gtBool",
        name: "success",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
]

export async function claimReward(playerAddress: string, coinsCollected: number, ownerAesKey: string) {
  try {
    console.log("[v0] Claim reward request - Player:", playerAddress, "Coins:", coinsCollected)

    // Calculate reward: 1 coin = 10 tokens (with 6 decimals)
    const tokenAmount = BigInt(coinsCollected) * BigInt(10) * BigInt(1_000_000)
    console.log("[v0] Token amount to transfer:", tokenAmount.toString())

    // Connect owner wallet (server-side, private key is secret)
    const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_COTI_RPC_URL)
    const owner = new Wallet(process.env.OWNER_PRIVATE_KEY!, provider)
    console.log("[v0] Owner wallet connected")

    if (!ownerAesKey) {
      throw new Error("Owner AES key is required")
    }

    owner.setAesKey(ownerAesKey)
    console.log("[v0] Owner AES key set")

    // Get token contract
    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!
    const tokenContract = new Contract(tokenAddress, TOKEN_ABI, owner)
    console.log("[v0] Token contract initialized")

    // Encrypt the transfer amount
    console.log("[v0] Encrypting transfer amount...")
    const encryptedAmount = await owner.encryptValue(
      tokenAmount,
      tokenAddress,
      tokenContract.transfer.fragment.selector,
    )
    console.log("[v0] Amount encrypted successfully")

    // Send tokens to player
    console.log("[v0] Sending transaction...")
    const tx = await tokenContract.transfer(playerAddress, encryptedAmount, { gasLimit: 20000000 })
    console.log("[v0] Transaction sent, waiting for confirmation...")

    await tx.wait()
    console.log("[v0] Transaction confirmed:", tx.hash)

    return {
      success: true,
      amount: coinsCollected * 10,
      txHash: tx.hash,
    }
  } catch (error) {
    console.error("[v0] Claim reward error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to claim reward",
    }
  }
}
