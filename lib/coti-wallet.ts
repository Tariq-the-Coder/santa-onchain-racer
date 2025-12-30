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
      if (currentEncryptionAddress === "0x0000000000000000000000000000000000000000") {
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
      throw new Error("Wallet not connected")
    }

    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS

    if (!tokenAddress) {
      console.error("[v0] Token address not configured")
      throw new Error("Token address not configured")
    }

    try {
      const tokenContract = new Contract(tokenAddress, TOKEN_ABI, this.signer)

      console.log("[v0] Fetching balance for:", playerAddress)

      // Get encrypted balance
      const encryptedBalance = await tokenContract.balanceOf(playerAddress)

      console.log("[v0] Encrypted balance:", encryptedBalance.toString())

      // If balance is 0, return 0 (no need to decrypt)
      if (encryptedBalance === 0n || encryptedBalance.toString() === "0") {
        console.log("[v0] Balance is 0, no decryption needed")
        return 0
      }

      // Decrypt it using player's AES key
      console.log("[v0] Decrypting balance...")
      const balance = (await this.signer.decryptValue(encryptedBalance)) as bigint

      console.log("[v0] Decrypted balance (raw):", balance.toString())

      // Convert from smallest unit (6 decimals) to display value
      const displayBalance = Number(balance) / 1_000_000

      console.log("[v0] Display balance:", displayBalance)

      return displayBalance
    } catch (error) {
      console.error("[v0] Error fetching token balance:", error)
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
    if (!this.signer) {
      throw new Error("Wallet not connected")
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

    // Check if already approved
    const isAlreadyApproved = await this.checkIsApproved(playerAddress)
    if (isAlreadyApproved) {
      console.log("[v0] Already approved, skipping approval transaction")
      return true
    }

    const tokenContract = new Contract(tokenAddress, APPROVE_ABI, this.signer)

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
  }

  async disconnect(): Promise<void> {
    this.signer = null
    this.provider = null
  }
}

// Singleton instance
export const cotiWallet = new CotiWalletService()
