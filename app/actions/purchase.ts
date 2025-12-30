"use server"

import { Contract, JsonRpcProvider, Wallet } from "@coti-io/coti-ethers"

const POWER_UP_PRICES: Record<string, number> = {
  magnet: 300,
  shield: 500,
  turbo: 700,
}

const TOKEN_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
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
    name: "transferFrom",
    outputs: [
      {
        internalType: "gtBool",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
]

export async function purchasePowerUp(playerAddress: string, powerUpId: string) {
  const price = POWER_UP_PRICES[powerUpId]
  if (!price) {
    return { success: false, error: "Invalid power-up" }
  }

  // Convert price to token amount (6 decimals)
  const tokenAmount = BigInt(price) * BigInt(1_000_000)

  // Connect owner wallet
  const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_COTI_RPC_URL)
  const owner = new Wallet(process.env.OWNER_PRIVATE_KEY!, provider)
  await owner.generateOrRecoverAes()

  const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!
  const tokenContract = new Contract(tokenAddress, TOKEN_ABI, owner)

  // Encrypt the amount
  const encryptedAmount = await owner.encryptValue(
    tokenAmount,
    tokenAddress,
    tokenContract.transferFrom.fragment.selector,
  )

  try {
    // Take tokens from player
    const tx = await tokenContract.transferFrom(
      playerAddress, // from player
      owner.address, // to owner (treasury)
      encryptedAmount,
      { gasLimit: 12000000 },
    )

    await tx.wait()

    return {
      success: true,
      powerUpId,
      txHash: tx.hash,
    }
  } catch (error: any) {
    console.error("Purchase failed:", error)
    return {
      success: false,
      error: "Transaction failed. Check your balance and approval.",
    }
  }
}
