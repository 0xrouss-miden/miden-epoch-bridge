import { useEffect, useState, useCallback } from 'react';
import { useEpochSdk } from '@/lib/epoch-sdk';
import type { IntentTransactionStatus } from '@epoch-protocol/epoch-intents-sdk';
import { selectDestinationSettlement } from '@/lib/intentSettlement';

// A completed origin step does not imply that the destination step exists yet.
export function useIntentTransactionStatus(userAddress?: string, intentNonce?: string, destinationChainId?: number) {
  const sdk = useEpochSdk();
  const [statuses, setStatuses] = useState<IntentTransactionStatus[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refetch = useCallback(() => { setRevision(value => value + 1); }, []);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setStatuses([]); setError(null);
    if (!sdk || !userAddress || !intentNonce) { setIsPolling(false); return; }
    setIsPolling(true);
    async function poll() {
      try {
        const rows = await sdk!.getIntentStatus(userAddress!, intentNonce!);
        if (cancelled) return;
        const current = Array.isArray(rows) ? rows : [];
        setStatuses(current); setError(null);
        if (selectDestinationSettlement(current, destinationChainId).completed) {
          setIsPolling(false); return;
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not fetch the intent status.');
      }
      if (!cancelled) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [sdk, userAddress, intentNonce, destinationChainId, revision]);
  return { statuses, isPolling, error, refetch };
}
