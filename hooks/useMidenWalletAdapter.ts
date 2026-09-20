import { epochMidenToken } from "@/lib/epoch-tokens";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@miden-sdk/miden-wallet-adapter-react";
import { AllowedPrivateData, PrivateDataPermission, WalletAdapterNetwork } from "@miden-sdk/miden-wallet-adapter-base";
import { MIDEN_NETWORK } from "@/config";
import { useAssetMetadata, toBech32AccountId } from "@miden-sdk/react";
import { AccountId, Address } from "@miden-sdk/miden-sdk";
import type { Asset } from "@miden-sdk/miden-wallet-adapter-base";

export interface NormalizedMidenAccountId {
  hex: string;
}

export interface MidenWalletAsset {
  assetId: string; // faucet id
  assetIdDisplay: string;
  amount: bigint;
  symbol?: string;
  decimals?: number;
}

export interface UseMidenWalletAdapterOptions {
  enabled?: boolean;
}

export interface UseMidenWalletAdapterResult {
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  address: string | null;
  accountId: NormalizedMidenAccountId | null;
  assets: MidenWalletAsset[];
  isLoadingAssets: boolean;
  assetsError: string | null;
  refreshAssets: () => Promise<void>;
}

const normalizeAccountId = (rawAddress: string | null): NormalizedMidenAccountId | null => {
  if (!rawAddress) return null;
  const input = rawAddress.replace(/\s+/g, "").trim();
  if (!input) return null;

  let id: AccountId | null = null;
  try {
    if (input.startsWith("0x") || input.startsWith("0X")) {
      id = AccountId.fromHex(input);
    } else if (/^[0-9a-fA-F]+$/.test(input) && input.length % 2 === 0) {
      id = AccountId.fromHex(`0x${input}`);
    }
  } catch {
    id = null;
  }

  if (!id) {
    if (input.includes("_")) {
      try {
        id = Address.fromBech32(input).accountId();
      } catch {
        const accountBech32 = input.slice(0, input.indexOf("_"));
        try {
          id = AccountId.fromBech32(accountBech32);
        } catch {
          id = null;
        }
      }
    } else {
      try {
        id = AccountId.fromBech32(input);
      } catch {
        try {
          id = Address.fromBech32(input).accountId();
        } catch {
          id = null;
        }
      }
    }
  }

  if (!id) return null;
  try {
    return { hex: id.toString() };
  } catch {
    return null;
  }
};

export function useMidenWalletAdapter(
  options: UseMidenWalletAdapterOptions = {},
): UseMidenWalletAdapterResult {
  const { enabled = true } = options;
  const {
    connected, connecting, wallet, wallets, select,
    connect: adapterConnect,
    address,
    requestAssets,
  } = useWallet();

  const accountId = useMemo(() => normalizeAccountId(address), [address]);
  const [rawAssets, setRawAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // In-flight dedup: requestAssets() opens a Miden Wallet "Request Assets"
  // confirmation popup. If two callers fire concurrently (e.g. React StrictMode
  // double-invokes the mount effect in dev, or a manual connect() races with
  // the auto-refresh effect), holding the promise in a ref collapses concurrent
  // calls to one popup.
  const inflightRef = useRef<Promise<void> | null>(null);

  const refreshAssets = useCallback(async () => {
    if (!enabled || !connected) return;
    if (!requestAssets) {
      setRawAssets([]);
      setAssetsError("Connected wallet does not support requestAssets()");
      return;
    }
    if (inflightRef.current) {
      return inflightRef.current;
    }
    const promise = (async () => {
      setIsLoadingAssets(true);
      setAssetsError(null);
      try {
        const raw = await requestAssets();
        setRawAssets(raw ?? []);
      } catch (err) {
        setRawAssets([]);
        setAssetsError(err instanceof Error ? err.message : "Failed to load assets");
      } finally {
        setIsLoadingAssets(false);
      }
    })();
    inflightRef.current = promise;
    promise.finally(() => {
      if (inflightRef.current === promise) inflightRef.current = null;
    });
    return promise;
  }, [enabled, connected, requestAssets]);

  const faucetIds = useMemo(() => rawAssets.map((a) => a.faucetId), [rawAssets]);
  const { assetMetadata } = useAssetMetadata(faucetIds);

  const assets = useMemo<MidenWalletAsset[]>(
    () =>
      rawAssets.filter((a) => epochMidenToken(normalizeAccountId(a.faucetId)?.hex ?? a.faucetId)).map((a) => {
        const meta = assetMetadata.get(a.faucetId);
        const known = epochMidenToken(normalizeAccountId(a.faucetId)?.hex ?? a.faucetId);
        let display = a.faucetId;
        try {
          display = toBech32AccountId(a.faucetId);
        } catch {
          // keep raw faucetId
        }
        return {
          assetId: a.faucetId,
          assetIdDisplay: display,
          amount: BigInt(a.amount),
          symbol: known?.symbol ?? meta?.symbol,
          decimals: known?.midenDecimals ?? meta?.decimals,
        };
      }),
    [rawAssets, assetMetadata],
  );

  const pendingConnect = useRef<{
    promise: Promise<void>; resolve: () => void; reject: (error: unknown) => void;
  } | null>(null);
  const [connectRequested, setConnectRequested] = useState(false);
  const connectStarted = useRef(false);

  useEffect(() => {
    if (!connectRequested || !wallet || connectStarted.current) return;
    connectStarted.current = true;
    const network = MIDEN_NETWORK === "devnet" ? WalletAdapterNetwork.Devnet
      : MIDEN_NETWORK === "local" ? WalletAdapterNetwork.Localnet : WalletAdapterNetwork.Testnet;
    void adapterConnect(PrivateDataPermission.UponRequest, network, AllowedPrivateData.Assets)
      .then(() => pendingConnect.current?.resolve())
      .catch(error => pendingConnect.current?.reject(error))
      .finally(() => {
        pendingConnect.current = null;
        connectStarted.current = false;
        setConnectRequested(false);
      });
  }, [connectRequested, wallet, adapterConnect]);

  const connect = useCallback((): Promise<void> => {
    if (connected) return refreshAssets();
    if (pendingConnect.current) return pendingConnect.current.promise;
    const candidate = wallet ?? wallets[0];
    if (!candidate) return Promise.reject(new Error("Bread Wallet is not available."));
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    pendingConnect.current = { promise, resolve, reject };
    if (!wallet) select(candidate.adapter.name);
    setConnectRequested(true);
    return promise;
  }, [connected, refreshAssets, wallet, wallets, select]);

  useEffect(() => {
    if (!enabled || !connected) {
      setRawAssets([]);
      setAssetsError(null);
      setIsLoadingAssets(false);
      return;
    }
    void refreshAssets();
  }, [enabled, connected, refreshAssets]);

  return {
    connected,
    connecting: connecting || connectRequested,
    connect,
    address,
    accountId,
    assets,
    isLoadingAssets,
    assetsError,
    refreshAssets,
  };
}
