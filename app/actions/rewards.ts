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
    // Calculate reward: 1 coin = 10 tokens (with 6 decimals)
    const tokenAmount = BigInt(coinsCollected) * BigInt(10) * BigInt(1_000_000)

    // Connect owner wallet (server-side, private key is secret)
    const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_COTI_RPC_URL)
    const owner = new Wallet(process.env.OWNER_PRIVATE_KEY!, provider)

    // Recover owner's AES key
    await owner.generateOrRecoverAes()

    // Get token contract
    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!
    const tokenContract = new Contract(tokenAddress, TOKEN_ABI, owner)

    // Encrypt the transfer amount
    const encryptedAmount = await owner.encryptValue(
      tokenAmount,
      tokenAddress,
      tokenContract.transfer.fragment.selector,
    )

    // Send tokens to player
    const tx = await tokenContract.transfer(playerAddress, encryptedAmount, { gasLimit: 12000000 })

    await tx.wait()

    return {
      success: true,
      amount: coinsCollected * 10,
      txHash: tx.hash,
    }
  } catch (error) {
    console.error("Claim reward error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to claim reward",
    }
  }
}
