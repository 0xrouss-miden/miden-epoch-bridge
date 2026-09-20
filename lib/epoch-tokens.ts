import { MIDEN_NETWORK, MIDEN_USDC_FAUCET_ID } from "@/config";

// Published by Epoch Dashboard, Sepolia + Miden Testnet, checked 2026-09-15.
export const EPOCH_FAUCETS_URL = "https://userdashboard.epochprotocol.xyz/faucets";
export type EpochToken = { symbol: string; address: string; decimals: number; midenFaucetId?: string; midenDecimals?: number };
const testnetTokens: readonly EpochToken[] = [
  {
    "symbol": "USDC",
    "address": "0x2BB4FfD7E2c6D432b697554Efd77fA13bdbefd69",
    "decimals": 18,
    "midenFaucetId": "0x537c15a622074e91188aa894456c52",
    "midenDecimals": 6
  },
  {
    "symbol": "DAI",
    "address": "0xc30f1Ce05d1434d484E9A47283aA925fc8A8699a",
    "decimals": 18,
    "midenFaucetId": "0xd17976f0809a8191412f2a126625df",
    "midenDecimals": 6
  },
  {
    "symbol": "USDT",
    "address": "0xc04d2869665Be874881133943523723Be5782720",
    "decimals": 18,
    "midenFaucetId": "0x6500ca8c2dd69e9147ab7eafad162c",
    "midenDecimals": 6
  },
  {
    "symbol": "WETH",
    "address": "0x7946dd86eE310D0aC16804A37787289Fa5b88A8A",
    "decimals": 18,
    "midenFaucetId": "0x4a09f13153d9cd114c078bfb62a7ec",
    "midenDecimals": 6
  },
  {
    "symbol": "WBTC",
    "address": "0x9b2a2754a9182fD65360E23afCDf3BeFF51796E9",
    "decimals": 18,
    "midenFaucetId": "0x5fd2e6fd17712c51404d09c2b847f7",
    "midenDecimals": 6
  }
];

// Miden account IDs are network-specific. Never apply testnet IDs to devnet/local.
export const SEPOLIA_TOKENS: readonly EpochToken[] = testnetTokens.map(token => ({
  ...token,
  midenFaucetId: token.symbol === "USDC" ? MIDEN_USDC_FAUCET_ID : MIDEN_NETWORK === "testnet" ? token.midenFaucetId : undefined,
  midenDecimals: MIDEN_NETWORK === "testnet" && (token.symbol !== "USDC" || MIDEN_USDC_FAUCET_ID === token.midenFaucetId) ? token.midenDecimals : undefined,
}));
export function epochMidenToken(faucetId: string) {
  return SEPOLIA_TOKENS.find(token => token.midenFaucetId?.toLowerCase() === faucetId.toLowerCase());
}
