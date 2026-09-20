// Application display name (used by wallet adapter).
export const APP_NAME = "Miden x Epoch Bridge";

// Miden SDK configuration — override via environment variables.
export const MIDEN_NETWORK = process.env.NEXT_PUBLIC_MIDEN_NETWORK || "testnet";
if (!["devnet", "testnet", "local"].includes(MIDEN_NETWORK)) {
  throw new Error("NEXT_PUBLIC_MIDEN_NETWORK must be devnet, testnet, or local");
}
export const MIDEN_RPC_URL =
  process.env.NEXT_PUBLIC_MIDEN_RPC_URL || MIDEN_NETWORK;
export const MIDEN_PROVER =
  (process.env.NEXT_PUBLIC_MIDEN_PROVER || MIDEN_NETWORK) as "devnet" | "testnet" | "local";

// Faucet IDs change across networks and resets. Configure the allocator-approved
// asset for the selected network.
export const MIDEN_USDC_FAUCET_ID = process.env.NEXT_PUBLIC_MIDEN_USDC_FAUCET_ID?.trim() ||
  (MIDEN_NETWORK === "testnet" ? "0x537c15a622074e91188aa894456c52" : undefined);
