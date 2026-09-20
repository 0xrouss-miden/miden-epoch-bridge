import { useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import type { MidenAccount, EVMToMidenIntentParams } from '../../types/miden';
import { MIDEN_DESTINATION_CHAIN_ID } from '../../constants/chains';
import { formatQuoteTokenIn, type EVMToMidenQuote } from '../../services/epoch-bridge';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValue } from '@/components/ui/select';

import { SEPOLIA_TOKENS } from "@/lib/epoch-tokens";

function toNumberOrUndefined(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

interface Props {
  accounts: MidenAccount[];
  onFetchQuote: (params: EVMToMidenIntentParams) => Promise<void>;
  onConfirmWithdraw: () => Promise<unknown>;
  onClearQuote: () => void;
  pendingQuote: EVMToMidenQuote | null;
  isFetchingQuote: boolean;
  isLoading: boolean;
  isSDKReady: boolean;
}

export function WithdrawForm({
  accounts,
  onFetchQuote,
  onConfirmWithdraw,
  onClearQuote,
  pendingQuote,
  isFetchingQuote,
  isLoading,
  isSDKReady,
}: Props) {
  const [evmToken, setEvmToken] = useState(SEPOLIA_TOKENS[0].address);
  const [minTokenOut, setMinTokenOut] = useState('1000000');
  const [midenRecipientId, setMidenRecipientId] = useState(() => accounts[0]?.id ?? '');
  const [midenFaucetId, setMidenFaucetId] = useState(SEPOLIA_TOKENS[0].midenFaucetId ?? '');
  const [status, setStatus] = useState('');

  const { address: connectedAddress } = useAccount();
  const walletChainId = useChainId();

  useEffect(() => {
    if (!midenRecipientId && accounts[0]?.id) {
      setMidenRecipientId(accounts[0].id);
    }
  }, [accounts, midenRecipientId]);

  const resolvedFaucetId = midenFaucetId.trim();

  const finalToken = evmToken;
  const selectedToken = SEPOLIA_TOKENS.find((t) => t.address === finalToken);

  // Auto-derive the Miden faucet ID when the EVM token has a known mapping.
  useEffect(() => {
    if (selectedToken?.midenFaucetId && midenFaucetId !== selectedToken.midenFaucetId) {
      setMidenFaucetId(selectedToken.midenFaucetId);
    }
  }, [selectedToken?.midenFaucetId, midenFaucetId]);

  const faucetIdIsAutoDerived = !!selectedToken?.midenFaucetId;
  const evmDisplayDecimals =
    toNumberOrUndefined((pendingQuote?.quoteResult as any)?.tokenInDecimals) ??
    selectedToken?.decimals ??
    18;

  const buildParams = (): EVMToMidenIntentParams => {
    if (!connectedAddress) {
      throw new Error('Connect EVM wallet first');
    }
    return {
      sourceChainId: walletChainId,
      destinationChainId: MIDEN_DESTINATION_CHAIN_ID,
      evmSourceAddress: connectedAddress,
      evmTokenAddress: finalToken,
      evmTokenDecimals: selectedToken?.decimals ?? 18,
      midenRecipientId,
      midenFaucetId: resolvedFaucetId,
      minTokenOut: minTokenOut.trim(),
    };
  };

  const canQuote =
    isSDKReady &&
    !!connectedAddress &&
    walletChainId > 0 &&
    !!midenRecipientId &&
    !!resolvedFaucetId &&
    !!(evmToken) &&
    minTokenOut.trim() !== '' &&
    minTokenOut.trim() !== '0' &&
    true;

  const handleGetQuote = () => {
    if (!finalToken || finalToken === '0x0000000000000000000000000000000000000000') {
      toast.error('Select or enter a valid source token address');
      return;
    }
    void toast.promise(
      (async () => {
        setStatus('Fetching withdraw quote…');
        await onFetchQuote(buildParams());
        setStatus('Quote ready — review below, then confirm.');
        return 'Quote ready';
      })(),
      {
        loading: 'Fetching quote…',
        success: (msg) => msg,
        error: (err) => {
          const msg = err instanceof Error ? err.message : 'Quote failed';
          setStatus(msg);
          return msg;
        },
      },
    );
  };

  const handleConfirm = () => {
    void toast.promise(
      (async () => {
        setStatus('Submitting withdraw intent…');
        const result = await onConfirmWithdraw();
        if (result && typeof result === 'object' && 'error' in result && (result as { error?: string }).error) {
          throw new Error((result as { error: string }).error);
        }
        if (result && typeof result === 'object' && 'submissionWarning' in result) {
          setStatus('The Epoch response needs verification. Track the intent below; do not repeat the deposit.');
          return 'Deposit submitted; checking intent status';
        }
        setStatus('Withdraw intent submitted successfully.');
        return 'Withdraw intent submitted';
      })(),
      {
        loading: 'Confirming withdraw…',
        success: (msg) => msg,
        error: (err) => {
          const msg = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
          setStatus(msg);
          return msg;
        },
      },
    );
  };

  return (
    <div className="ui-card">
      <h2 className="text-base font-semibold text-neutral-900">Transfer details</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        Choose the Sepolia token and how much to receive on Miden. Epoch will calculate the required deposit.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <Label>Source token (Sepolia)</Label>
          <SelectRoot
            value={evmToken}
            onValueChange={(v) => {
              setEvmToken(v);
              setMidenFaucetId(SEPOLIA_TOKENS.find(token => token.address === v)?.midenFaucetId ?? '');
              onClearQuote();
            }}
          >
            <SelectTrigger aria-label="Select EVM token">
              <SelectValue placeholder="Token" />
            </SelectTrigger>
            <SelectContent>
              {SEPOLIA_TOKENS.map((token) => (
                <SelectItem key={token.symbol} value={token.address}>
                  {token.symbol}
                  {token.address ? ` · ${token.address.slice(0, 10)}…` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        </div>

        <div>
          <Label htmlFor="wd-min-token-out">
            Minimum to receive on Miden{' '}
            <span className="text-xs font-normal text-neutral-500">
              (faucet base units)
            </span>
          </Label>
          <Input
            id="wd-min-token-out"
            value={minTokenOut}
            onChange={(e) => {
              setMinTokenOut(e.target.value);
              onClearQuote();
            }}
            placeholder="e.g. 1000000"
          />
        </div>

        <div>
          <Label>Source wallet on Sepolia</Label>
          <div className="mt-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-[13px] text-neutral-600 break-all">
            {connectedAddress ?? <span className="text-amber-700">Connect your EVM wallet</span>}
          </div>
        </div>

        <div className={faucetIdIsAutoDerived ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
          <div>
            <Label htmlFor="wd-recipient">Destination Miden account</Label>
            <Input id="wd-recipient" type="text" value={midenRecipientId} onChange={(e) => { setMidenRecipientId(e.target.value); onClearQuote(); }} />
          </div>
          {/* Hide the Miden faucet input when the selected EVM token has a
              known Miden mapping (the form auto-derives it). The input stays
              visible when no faucet is configured so users can fill it
              in manually. */}
          {!faucetIdIsAutoDerived && (
            <div>
              <Label htmlFor="wd-faucet-id">Miden faucet ID</Label>
              <Input
                id="wd-faucet-id"
                value={midenFaucetId}
                onChange={(e) => {
                  setMidenFaucetId(e.target.value);
                  onClearQuote();
                }}
                placeholder="0x… Faucet ID"
                className="font-mono text-[13px]"
              />
            </div>
          )}
        </div>

        {pendingQuote && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-900">Quote</span>
              <button type="button" className="text-xs text-neutral-500 underline" onClick={onClearQuote}>
                Discard quote
              </button>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Required deposit</p>
              <p className="mt-1 font-mono text-xl font-semibold text-orange-900">
                {formatQuoteTokenIn(
                  pendingQuote.quoteResult.tokenIn,
                  evmDisplayDecimals,
                  toNumberOrUndefined((pendingQuote.quoteResult as any)?.tokenInDecimals),
                ) || 'calculated at execution'}{' '}
                {pendingQuote.quoteResult.tokenInSymbol ?? selectedToken?.symbol ?? 'tokens'}
              </p>
            </div>
            <p className="text-xs text-neutral-500 italic">
              You need this amount in your EVM wallet to confirm.
            </p>
          </div>
        )}

        {!pendingQuote ? (
          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handleGetQuote}
            disabled={isFetchingQuote || !canQuote}
          >
            {isFetchingQuote ? 'Fetching quote…' : 'Get quote'}
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : 'Confirm and sign'}
          </Button>
        )}

        {!isSDKReady && (
          <p className="text-xs text-amber-800">Connect your EVM wallet to request a quote.</p>
        )}

        {status && (
          <p className={`text-sm ${status.startsWith('Error') ? 'text-red-600' : 'text-amber-800'}`}>{status}</p>
        )}
      </div>
    </div>
  );
}
