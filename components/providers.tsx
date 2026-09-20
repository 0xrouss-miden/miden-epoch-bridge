"use client";
import { MidenProvider } from "@miden-sdk/react";
import { Toaster } from "sonner";
import { MIDEN_RPC_URL, MIDEN_PROVER, MIDEN_NETWORK } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { sepolia } from "@reown/appkit/networks";
import { MidenFiSignerProvider } from "@miden-sdk/miden-wallet-adapter-react";
import {
  AllowedPrivateData,
  WalletAdapterNetwork,
} from "@miden-sdk/miden-wallet-adapter-base";
import { adapter, projectId, wagmiConfig } from "@/lib/wallet-config";
import { useState, type ReactNode } from "react";

export const appKit =
  adapter && projectId
    ? createAppKit({
        adapters: [adapter],
        projectId,
        networks: [sepolia],
        defaultNetwork: sepolia,
        enableWalletConnect: true,
        metadata: {
          name: "Miden Epoch Bridge",
          description: "Sepolia ↔ Miden Testnet · Epoch",
          url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3017",
          icons: [],
        },
        themeMode: "light",
        themeVariables: {
          "--w3m-accent": "#d9400b",
          "--w3m-border-radius-master": "2px",
        },
        features: {
          analytics: false,
          swaps: false,
          onramp: false,
          email: false,
          socials: [],
        },
      })
    : null;

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
      }),
  );
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MidenFiSignerProvider
          appName="Miden Epoch Bridge"
          network={MIDEN_NETWORK === "devnet" ? WalletAdapterNetwork.Devnet : MIDEN_NETWORK === "local" ? WalletAdapterNetwork.Localnet : WalletAdapterNetwork.Testnet}
          allowedPrivateData={AllowedPrivateData.Assets}
          autoConnect={false}
        >
          <MidenProvider config={{ rpcUrl: MIDEN_RPC_URL, prover: MIDEN_PROVER }} loadingComponent={<div className="boot">Connecting to Miden…</div>}>
            {children}<Toaster position="bottom-right" closeButton />
          </MidenProvider>
        </MidenFiSignerProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
