import { useEffect, useState } from "react";
import { useWalletClient } from "wagmi";
import type { WalletClient } from "viem";
import type { EpochIntentSDK } from "@epoch-protocol/epoch-intents-sdk";


interface SdkEntry {
  client: WalletClient;
  chainIdOverride?: number;
  apiBaseUrl: string;
  sdk: EpochIntentSDK;
}

/**
 * Lazily instantiate `EpochIntentSDK` from the connected EVM wallet.
 *
 * `chainIdOverride` rewrites `walletClient.chain.id` before handing the client
 * to the SDK. Miden→EVM passes `MIDEN_VIRTUAL_CHAIN_ID` so `solveIntent`
 * resolves the Miden arbiter rather than the wallet's EVM arbiter; EVM→Miden
 * and status polling leave the wallet's real chain intact.
 */
export function useEpochSdk(chainIdOverride?: number): EpochIntentSDK | null {
  const [entry, setEntry] = useState<SdkEntry | null>(null);
  const { data: walletClient } = useWalletClient();
  const apiBaseUrl = process.env.NEXT_PUBLIC_ALLOCATOR_URL || "https://testnet-dev.epochprotocol.xyz";

  useEffect(() => {
    if (!walletClient || !apiBaseUrl) {
      return;
    }
    let cancelled = false;

    void import("@epoch-protocol/epoch-intents-sdk")
      .then(({ EpochIntentSDK: SDK }) => {
        if (cancelled) return;
        const client: WalletClient =
          chainIdOverride == null
            ? walletClient
            : {
                ...walletClient,
                chain: { ...walletClient.chain, id: chainIdOverride },
              };
        setEntry({
          client: walletClient,
          chainIdOverride,
          apiBaseUrl,
          sdk: new SDK({
            apiBaseUrl,
            walletClient: client,
          }),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[Epoch] SDK load failed:", err);
        setEntry(null);
      });

    return () => {
      cancelled = true;
    };
  }, [walletClient, chainIdOverride, apiBaseUrl]);

  // An SDK is only valid for the client and chain it was built from; returning
  // it after either changes would hand callers the previous wallet's SDK.
  return entry &&
    entry.client === walletClient &&
    entry.chainIdOverride === chainIdOverride &&
    entry.apiBaseUrl === apiBaseUrl
    ? entry.sdk
    : null;
}
