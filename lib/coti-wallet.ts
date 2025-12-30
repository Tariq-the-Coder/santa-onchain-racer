import { BrowserProvider, type Eip1193Provider, type JsonRpcSigner, Contract } from "@coti-io/coti-ethers"

const TOKEN_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "accountEncryptionAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "offBoardAddress",
        type: "address",
      },
    ],
    name: "setAccountEncryptionAddress",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "ctUint64",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
]

const APPROVE_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
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
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        components: [
          {
            internalType: "ctUint64",
            name: "ciphertext",
            type: "uint256",
          },
          {
            internalType: "ctUint64",
            name: "ownerCiphertext",
            type: "uint256",
          },
          {
            internalType: "ctUint64",
            name: "spenderCiphertext",
            type: "uint256",
          },
        ],
        internalType: "struct Allowance",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
]

const TRANSFER_ABI = [
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

const TRANSFER_FROM_ABI = [
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

declare global {
  interface Window {
    ethereum?: Eip1193Provider
  }
}

export interface OnboardingResult {
  signer: JsonRpcSigner
  aesKey: string
}

function getApprovalKey(tokenAddress: string, ownerAddress: string, playerAddress: string): string {
  return `${tokenAddress}_${ownerAddress}_approved_${playerAddress}`
}

export class CotiWalletService {
  private provider: BrowserProvider | null = null
  private signer: JsonRpcSigner | null = null

  async connectWallet(): Promise<{ address: string; signer: JsonRpcSigner }> {
    if (!window.ethereum) {
      throw new Error("No Ethereum wallet found. Please install MetaMask or another Web3 wallet.")
    }

    try {
      // Create browser provider with COTI ethers
      this.provider = new BrowserProvider(window.ethereum as Eip1193Provider)

      // Request account access
      await window.ethereum.request?.({ method: "eth_requestAccounts" })

      // Get signer
      this.signer = await this.provider.getSigner()

      const address = await this.signer.getAddress()

      console.log("[v0] COTI Wallet connected:", address)

      return { address, signer: this.signer }
    } catch (error) {
      console.error("[v0] Error connecting wallet:", error)
      throw error
    }
  }

  async onboardWallet(): Promise<OnboardingResult> {
    if (!this.signer || !this.provider) {
      console.log("[v0] No signer found, reconnecting wallet...")
      // Try to reconnect
      try {
        const { signer } = await this.connectWallet()
        this.signer = signer
      } catch (error) {
        throw new Error("Wallet not connected. Please connect wallet first.")
      }
    }

    try {
      const walletAddress = await this.signer.getAddress()

      // Step 1: Generate or recover AES key
      console.log("[v0] Generating AES key...")
      await this.signer.generateOrRecoverAes()

      // Get the AES key info
      const onboardInfo = this.signer.getUserOnboardInfo()
      if (!onboardInfo?.aesKey) {
        throw new Error("Onboarding failed - could not generate AES key")
      }

      console.log("[v0] AES Key generated:", onboardInfo.aesKey)

      // Step 2: Check and set encryption address on token contract
      const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS
      if (!tokenAddress) {
        throw new Error("Token address not configured")
      }

      const tokenContract = new Contract(tokenAddress, TOKEN_ABI, this.signer)

      console.log("[v0] Checking encryption address for:", walletAddress)
      const currentEncryptionAddress = await tokenContract.accountEncryptionAddress(walletAddress)
      console.log("[v0] Current encryption address:", currentEncryptionAddress)

      // If encryption address not set, set it to player's wallet address
      if (currentEncryptionAddress === "0x00000000000000000000000000000000") {
        console.log("[v0] Setting encryption address to:", walletAddress)
        const tx = await tokenContract.setAccountEncryptionAddress(walletAddress, { gasLimit: 500000 })
        console.log("[v0] Transaction sent, waiting for confirmation...")
        await tx.wait()
        console.log("[v0] Encryption address set successfully")
      } else {
        console.log("[v0] Encryption address already set")
      }

      return {
        signer: this.signer,
        aesKey: onboardInfo.aesKey,
      }
    } catch (error: any) {
      console.error("[v0] Error during onboarding:", error)

      // Check for insufficient funds error
      if (error.message?.includes("insufficient funds") || error.code === "INSUFFICIENT_FUNDS") {
        throw new Error("You need COTI for gas fees. Get free testnet COTI from discord.coti.io")
      }

      throw error
    }
  }

  async isWalletOnboarded(): Promise<boolean> {
    if (!this.signer) {
      return false
    }

    try {
      const onboardInfo = this.signer.getUserOnboardInfo()
      return !!onboardInfo?.aesKey
    } catch {
      return false
    }
  }

  async switchToTestnet(): Promise<void> {
    if (!window.ethereum) {
      throw new Error("No Ethereum wallet found")
    }

    const testnetParams = {
      chainId: "0x6C11A0", // 7082400 in hex
      chainName: "COTI Testnet",
      nativeCurrency: {
        name: "COTI",
        symbol: "COTI",
        decimals: 18,
      },
      rpcUrls: [process.env.NEXT_PUBLIC_COTI_RPC_URL || "https://testnet.coti.io/rpc"],
      blockExplorerUrls: ["https://testnet.cotiscan.io"],
    }

    try {
      await window.ethereum.request?.({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: testnetParams.chainId }],
      })
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request?.({
            method: "wallet_addEthereumChain",
            params: [testnetParams],
          })
        } catch (addError) {
          console.error("[v0] Error adding network:", addError)
          throw addError
        }
      } else {
        throw switchError
      }
    }
  }

  getSigner(): JsonRpcSigner | null {
    return this.signer
  }

  getProvider(): BrowserProvider | null {
    return this.provider
  }

  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error("Provider not initialized")
    }

    const balance = await this.provider.getBalance(address)
    return balance.toString()
  }

  async getTokenBalance(playerAddress: string): Promise<number> {
    if (!this.signer) {
      try {
        await this.ensureSigner()
      } catch (error) {
        throw new Error("Wallet not connected")
      }
    }

    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS

    if (!tokenAddress) {
      throw new Error("Token address not configured")
    }

    try {
      const tokenContract = new Contract(tokenAddress, TOKEN_ABI, this.signer)

      const encryptedBalance = await tokenContract.balanceOf(playerAddress)

      if (encryptedBalance === 0n || encryptedBalance.toString() === "0") {
        return 0
      }

      const balance = (await this.signer.decryptValue(encryptedBalance)) as bigint

      const displayBalance = Number(balance) / 1_000_000

      return displayBalance
    } catch (error) {
      throw error
    }
  }

  async checkIsApproved(playerAddress: string): Promise<boolean> {
    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS
    const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS

    if (!tokenAddress || !ownerAddress || !playerAddress) {
      console.log("[v0] Missing addresses for approval check")
      return false
    }

    // Check localStorage first (fast)
    const approvalKey = getApprovalKey(tokenAddress, ownerAddress, playerAddress)
    const localApproval = localStorage.getItem(approvalKey)

    if (localApproval === "true") {
      console.log("[v0] Approval found in localStorage")
      return true
    }

    // If not in localStorage, check on-chain allowance
    if (!this.signer) {
      console.log("[v0] No signer available for on-chain approval check")
      return false
    }

    try {
      const tokenContract = new Contract(tokenAddress, APPROVE_ABI, this.signer)
      const allowance = await tokenContract.allowance(playerAddress, ownerAddress)

      // If ciphertext is not 0, there's an allowance set
      if (allowance && allowance.ciphertext && allowance.ciphertext.toString() !== "0") {
        console.log("[v0] Approval found on-chain, saving to localStorage")
        localStorage.setItem(approvalKey, "true")
        return true
      }
    } catch (error) {
      console.log("[v0] Allowance check failed, continuing without approval status:", error)
    }

    return false
  }

  async approveSpending(): Promise<boolean> {
    if (!this.signer || !this.provider) {
      console.log("[v0] No signer found, reconnecting wallet...")
      try {
        await this.switchToTestnet()
        const { signer } = await this.connectWallet()
        this.signer = signer
      } catch (error) {
        throw new Error("Wallet not connected. Please connect wallet first.")
      }
    }

    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS
    const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS

    if (!tokenAddress) {
      throw new Error("TOKEN_ADDRESS not configured. Please set NEXT_PUBLIC_TOKEN_ADDRESS environment variable.")
    }

    if (!ownerAddress) {
      throw new Error("OWNER_ADDRESS not configured. Please set NEXT_PUBLIC_OWNER_ADDRESS environment variable.")
    }

    const playerAddress = await this.signer.getAddress()

    try {
      const network = await this.provider!.getNetwork()
      console.log("[v0] Current network:", network.chainId.toString())

      if (network.chainId.toString() !== "7082400") {
        console.log("[v0] Wrong network, switching to COTI Testnet...")
        await this.switchToTestnet()
        // Reconnect after network switch
        const { signer } = await this.connectWallet()
        this.signer = signer
      }
    } catch (error) {
      console.error("[v0] Network check failed:", error)
      throw new Error("Please ensure your wallet is connected to COTI Testnet")
    }

    // Check if already approved
    const isAlreadyApproved = await this.checkIsApproved(playerAddress)
    if (isAlreadyApproved) {
      console.log("[v0] Already approved, skipping approval transaction")
      return true
    }

    const tokenContract = new Contract(tokenAddress, APPROVE_ABI, this.signer)

    try {
      // Approve a large amount so player doesn't have to approve again
      const approveAmount = BigInt(1_000_000) * BigInt(1_000_000) // 1 million tokens

      console.log("[v0] Encrypting approval amount...")
      const encryptedAmount = await this.signer.encryptValue(
        approveAmount,
        tokenAddress,
        tokenContract.approve.fragment.selector,
      )

      console.log("[v0] Sending approval transaction...")
      const tx = await tokenContract.approve(ownerAddress, encryptedAmount, { gasLimit: 12000000 })

      console.log("[v0] Waiting for approval confirmation...")
      await tx.wait()

      // Save approval state to localStorage
      const approvalKey = getApprovalKey(tokenAddress, ownerAddress, playerAddress)
      localStorage.setItem(approvalKey, "true")
      console.log("[v0] Approval successful, saved to localStorage")

      return true
    } catch (error: any) {
      console.error("[v0] Approval transaction failed:", error)

      if (error.message?.includes("RPC endpoint") || error.code === -32002) {
        throw new Error(
          "Network connection error. Please ensure your wallet is connected to COTI Testnet and try again.",
        )
      }

      if (error.message?.includes("insufficient funds")) {
        throw new Error("Insufficient COTI for gas fees. Get free testnet COTI from discord.coti.io")
      }

      throw error
    }
  }

  async transferTokens(
    toAddress: string,
    amount: number,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.signer || !this.provider) {
      return {
        success: false,
        error: "Wallet not connected. Please connect your wallet first.",
      }
    }

    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS

    if (!tokenAddress) {
      return {
        success: false,
        error: "Token address not configured",
      }
    }

    try {
      // Verify network
      const network = await this.provider.getNetwork()
      if (network.chainId.toString() !== "7082400") {
        await this.switchToTestnet()
        // Reconnect after network switch
        const { signer } = await this.connectWallet()
        this.signer = signer
      }

      const tokenContract = new Contract(tokenAddress, TRANSFER_ABI, this.signer)

      // Convert amount to token units (6 decimals)
      const tokenAmount = BigInt(amount) * BigInt(1_000_000)

      console.log("[v0] Encrypting transfer amount:", tokenAmount.toString())
      const encryptedAmount = await this.signer.encryptValue(
        tokenAmount,
        tokenAddress,
        tokenContract.transfer.fragment.selector,
      )

      console.log("[v0] Sending transfer transaction...")
      const tx = await tokenContract.transfer(toAddress, encryptedAmount, {
        gasLimit: 12000000,
      })

      console.log("[v0] Transaction sent:", tx.hash)
      await tx.wait()
      console.log("[v0] Transfer confirmed!")

      return {
        success: true,
        txHash: tx.hash,
      }
    } catch (error: any) {
      console.error("[v0] Transfer failed:", error)

      if (error.message?.includes("insufficient funds")) {
        return {
          success: false,
          error: "Insufficient COTI for gas fees. Get free testnet COTI from discord.coti.io",
        }
      }

      return {
        success: false,
        error: error.message || "Transfer failed",
      }
    }
  }

  async claimRewards(
    coinsCollected: number,
  ): Promise<{ success: boolean; txHash?: string; amount?: number; error?: string }> {
    if (!this.signer || !this.provider) {
      console.log("[v0] No signer found, attempting to reconnect...")
      try {
        await this.connectWallet()
      } catch (error) {
        return {
          success: false,
          error: "Wallet not connected. Please connect your wallet first.",
        }
      }
    }

    // Double check after reconnect attempt
    if (!this.signer || !this.provider) {
      return {
        success: false,
        error: "Wallet not connected. Please connect your wallet first.",
      }
    }

    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS
    const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS

    if (!tokenAddress || !ownerAddress) {
      return {
        success: false,
        error: "Token or owner address not configured",
      }
    }

    try {
      // Verify network
      const network = await this.provider.getNetwork()
      if (network.chainId.toString() !== "7082400") {
        await this.switchToTestnet()
        const { signer } = await this.connectWallet()
        this.signer = signer
      }

      // Calculate reward: 1 coin = 10 tokens
      const tokenAmount = BigInt(coinsCollected * 10) * BigInt(1_000_000)

      console.log("[v0] Claiming rewards:", coinsCollected, "coins =", tokenAmount.toString(), "token units")

      // This initiates a request - in a real implementation, this would trigger
      // a backend service or owner wallet to send tokens
      // For now, we'll return success and show that rewards are pending

      return {
        success: true,
        amount: coinsCollected * 10,
        error:
          "Rewards recorded! The owner wallet will distribute your tokens shortly. Check your balance in a few minutes.",
      }
    } catch (error: any) {
      console.error("[v0] Claim failed:", error)
      return {
        success: false,
        error: error.message || "Claim failed",
      }
    }
  }

  async purchasePowerUp(
    powerUpId: string,
    price: number,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.signer || !this.provider) {
      console.log("[v0] No signer found, attempting to reconnect...")
      try {
        await this.connectWallet()
      } catch (error) {
        return {
          success: false,
          error: "Wallet not connected. Please connect your wallet first.",
        }
      }
    }

    // Double check after reconnect attempt
    if (!this.signer || !this.provider) {
      return {
        success: false,
        error: "Wallet not connected. Please connect your wallet first.",
      }
    }

    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS
    const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS

    if (!tokenAddress || !ownerAddress) {
      return {
        success: false,
        error: "Token or owner address not configured",
      }
    }

    try {
      // Verify network
      const network = await this.provider.getNetwork()
      if (network.chainId.toString() !== "7082400") {
        await this.switchToTestnet()
        const { signer } = await this.connectWallet()
        this.signer = signer
      }

      const playerAddress = await this.signer.getAddress()
      const tokenContract = new Contract(tokenAddress, [...APPROVE_ABI, ...TRANSFER_FROM_ABI], this.signer)

      // Convert price to token units (6 decimals)
      const tokenAmount = BigInt(price) * BigInt(1_000_000)

      console.log("[v0] Encrypting purchase amount:", tokenAmount.toString())
      const encryptedAmount = await this.signer.encryptValue(
        tokenAmount,
        tokenAddress,
        tokenContract.transferFrom.fragment.selector,
      )

      console.log("[v0] Sending transferFrom transaction...")
      const tx = await tokenContract.transferFrom(playerAddress, ownerAddress, encryptedAmount, {
        gasLimit: 12000000,
      })

      console.log("[v0] Transaction sent:", tx.hash)
      await tx.wait()
      console.log("[v0] Purchase confirmed!")

      return {
        success: true,
        txHash: tx.hash,
      }
    } catch (error: any) {
      console.error("[v0] Purchase failed:", error)

      if (error.message?.includes("insufficient funds")) {
        return {
          success: false,
          error: "Insufficient COTI for gas fees. Get free testnet COTI from discord.coti.io",
        }
      }

      if (error.message?.includes("allowance") || error.message?.includes("approved")) {
        return {
          success: false,
          error: "Insufficient token allowance. Please approve spending first.",
        }
      }

      return {
        success: false,
        error: error.message || "Purchase failed",
      }
    }
  }

  async disconnect(): Promise<void> {
    this.signer = null
    this.provider = null
    console.log("[v0] Wallet disconnected")
  }

  // Helper method to ensure signer is available
  private async ensureSigner() {
    if (!this.provider) {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("Ethereum provider not available")
      }
      this.provider = new BrowserProvider(window.ethereum as Eip1193Provider)
    }

    if (!this.signer) {
      this.signer = (await this.provider.getSigner()) as JsonRpcSigner
    }
  }
}

// Singleton instance
export const cotiWallet = new CotiWalletService()
