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

export async function claimReward(playerAddress: string, coinsCollected: number) {
  try {
    console.log("[v0] Claiming reward for player:", playerAddress, "coins:", coinsCollected)

    // Calculate reward: 1 coin = 10 tokens (with 6 decimals)
    const tokenAmount = BigInt(coinsCollected) * BigInt(10) * BigInt(1_000_000)
    console.log("[v0] Token amount to transfer:", tokenAmount.toString())

    const rpcUrl = process.env.NEXT_PUBLIC_COTI_RPC_URL || "https://testnet.coti.io/rpc"
    console.log("[v0] Connecting to RPC:", rpcUrl)

    const provider = new JsonRpcProvider(rpcUrl)
    const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY

    if (!ownerPrivateKey) {
      throw new Error("OWNER_PRIVATE_KEY not configured")
    }

    const owner = new Wallet(ownerPrivateKey, provider)
    const ownerAddress = await owner.getAddress()
    console.log("[v0] Owner wallet connected:", ownerAddress)

    console.log("[v0] Recovering owner AES key with forceRecover...")
    await owner.generateOrRecoverAes({ forceRecover: true })

    // Verify AES key was recovered
    const ownerInfo = owner.getUserOnboardInfo()
    console.log("[v0] Owner AES recovered:", !!ownerInfo?.aesKey)

    if (!ownerInfo?.aesKey) {
      throw new Error("Owner AES key recovery failed - check onboarding")
    }

    // Get token contract
    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!
    const tokenContract = new Contract(tokenAddress, TOKEN_ABI, owner)
    console.log("[v0] Token contract loaded at:", tokenAddress)

    console.log("[v0] Encrypting transfer amount...")
    console.log("[v0] Encryption params:", {
      tokenAmount: tokenAmount.toString(),
      tokenAddress,
      selector: tokenContract.transfer.fragment.selector,
    })

    let encryptedAmount: any

    try {
      encryptedAmount = await owner.encryptValue(tokenAmount, tokenAddress, tokenContract.transfer.fragment.selector)
      console.log("[v0] Encryption completed:", {
        ciphertext: encryptedAmount?.ciphertext?.toString(),
        hasSignature: !!encryptedAmount?.signature,
      })
    } catch (encryptError: any) {
      console.error("[v0] Encryption error details:", {
        message: encryptError?.message,
        stack: encryptError?.stack,
        error: encryptError,
      })
      throw new Error(`Encryption failed: ${encryptError?.message || encryptError}`)
    }

    // Send tokens to player
    console.log("[v0] Sending transaction...")
    const tx = await tokenContract.transfer(playerAddress, encryptedAmount, { gasLimit: 12000000 })
    console.log("[v0] Transaction sent:", tx.hash)

    console.log("[v0] Waiting for confirmation...")
    await tx.wait()
    console.log("[v0] Transaction confirmed!")

    return {
      success: true,
      amount: coinsCollected * 10,
      txHash: tx.hash,
    }
  } catch (error: any) {
    console.error("[v0] Failed to claim reward:", {
      message: error?.message,
      stack: error?.stack,
      error,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
