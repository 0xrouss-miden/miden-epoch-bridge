import { useEpochSdk } from "@/lib/epoch-sdk";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import {
  buildEVMToMidenIntent,
  getEVMToMidenQuote,
  type EVMToMidenQuote,
} from '../services/epoch-bridge';
import type { EVMToMidenIntentParams, IntentResult } from '../types/miden';

export function useWithdrawIntent() {
  const inFlight = useRef(false);
  const quoteGeneration = useRef(0);
  const [withdrawResult, setWithdrawResult] = useState<IntentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuote, setPendingQuote] = useState<EVMToMidenQuote | null>(null);
  const sdk = useEpochSdk();

  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();



  useEffect(() => {
    quoteGeneration.current += 1;
    setPendingQuote(null);
    setWithdrawResult(null);
    setError(null);
    if (address && walletClient?.chain?.id) {
      try {
        const raw = window.localStorage.getItem(`epoch-deposit:${walletClient.chain.id}:${address.toLowerCase()}`);
        if (raw) {
          const saved = JSON.parse(raw) as IntentResult;
          if (saved.intentNonce && String(saved.intentData?.recipient).toLowerCase() === address.toLowerCase() && saved.depositChainId === walletClient.chain.id) setWithdrawResult(saved);
        }
      } catch { /* Storage may be disabled; in-session tracking still works. */ }
    }
  }, [address, walletClient?.chain?.id]);

  const fetchQuote = useCallback(
    async (params: EVMToMidenIntentParams) => {
      if (!sdk) throw new Error('Epoch SDK not ready — connect your EVM wallet');
      if (!address) throw new Error('Connect EVM wallet first');
      const generation = ++quoteGeneration.current;
      setIsFetchingQuote(true);
      setError(null);
      setPendingQuote(null);
      try {
        const quote = await getEVMToMidenQuote(sdk, params, address);
        if (!quote.quoteResult.tokenIn || quote.quoteResult.tokenIn === '0') {
          throw new Error('Quote returned no EVM input amount — try different minTokenOut or token pair');
        }
        if (generation === quoteGeneration.current) setPendingQuote(quote);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Quote failed';
        setError(msg);
        throw err;
      } finally {
        setIsFetchingQuote(false);
      }
    },
    [sdk, address],
  );

  const confirmWithdraw = useCallback(async () => {
    if (!sdk) throw new Error('Epoch SDK not ready');
    if (!address) throw new Error('Connect EVM wallet first');
    if (!pendingQuote) throw new Error('Fetch a quote first');
    if (inFlight.current) throw new Error('A request is already in progress.');
    if (pendingQuote.params.evmSourceAddress.toLowerCase() !== address.toLowerCase() || pendingQuote.params.sourceChainId !== walletClient?.chain?.id) {
      setPendingQuote(null);
      throw new Error('The wallet or network has changed. Request a new quote.');
    }
    if (!pendingQuote.quotedAt || Date.now() - pendingQuote.quotedAt > 60000) {
      setPendingQuote(null);
      throw new Error('The quote is more than one minute old. Request a new one before signing.');
    }
    inFlight.current = true;
    setIsLoading(true);
    setError(null);
    setWithdrawResult(null);
    try {
      const result = await buildEVMToMidenIntent(sdk, {
        ...pendingQuote.params,
        evmSourceAddress: address,
        preFetchedQuote: pendingQuote,
      });
      if (result.error) {
        setWithdrawResult(result);
        setPendingQuote(null);
        throw new Error(result.error);
      }
      const r = result as any;
      const isNonceLike = (v: unknown) =>
        typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint';
      const rawNonce = isNonceLike(r?.intentNonce)
        ? r.intentNonce
        : isNonceLike(r?.solveResult?.nonce)
          ? r.solveResult.nonce
          : isNonceLike(r?.solveResult?.submittedIntentData?.nonce)
            ? r.solveResult.submittedIntentData.nonce
            : isNonceLike(r?.solveResult?.compact?.nonce)
              ? r.solveResult.compact.nonce
              : undefined;
      const nonce = rawNonce != null ? String(rawNonce) : undefined;
      console.log('[useWithdrawIntent] extracted nonce', { nonce, raw: rawNonce, solveResult: r?.solveResult });
      // Chain the deposit tx landed on — taken from the wallet client at submit
      // time; this is the chain where `depositERC20AndRegister` was called.
      const depositChainId = walletClient?.chain?.id;
      const resultWithNonce: IntentResult = {
        ...(result as IntentResult),
        ...(nonce ? { intentNonce: nonce } : {}),
        ...(depositChainId != null ? { depositChainId } : {}),
      };
      setWithdrawResult(resultWithNonce);
      if (resultWithNonce.intentNonce) {
        try { window.localStorage.setItem(`epoch-deposit:${depositChainId}:${address.toLowerCase()}`, JSON.stringify(resultWithNonce)); } catch { /* Optional persistence. */ }
      }
      setPendingQuote(null);
      return resultWithNonce;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm withdraw intent';
      setError(msg);
      throw err;
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [sdk, address, pendingQuote, walletClient]);

  const clearQuote = useCallback(() => {
    quoteGeneration.current += 1;
    setPendingQuote(null);
    setError(null);
  }, []);

  return {
    fetchQuote,
    confirmWithdraw,
    clearQuote,
    pendingQuote,
    withdrawResult,
    isLoading,
    isFetchingQuote,
    error,
    address,
    isSDKReady: !!sdk,
  };
}
