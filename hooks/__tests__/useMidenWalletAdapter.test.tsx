import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllowedPrivateData, PrivateDataPermission, WalletAdapterNetwork } from '@miden-sdk/miden-wallet-adapter-base';
import { useMidenWalletAdapter } from '../useMidenWalletAdapter';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(), select: vi.fn(), requestAssets: vi.fn(),
  wallet: { adapter: { name: 'Bread' } },
  selected: false,
}));
vi.mock('@miden-sdk/miden-wallet-adapter-react', () => ({
  useWallet: () => ({ connected: false, connecting: false, address: null,
    wallet: mocks.selected ? mocks.wallet : null, wallets: [mocks.wallet],
    select: mocks.select, connect: mocks.connect, requestAssets: mocks.requestAssets }),
}));
vi.mock('@miden-sdk/react', () => ({ useAssetMetadata: () => ({ assetMetadata: new Map() }), toBech32AccountId: (id: string) => id }));
vi.mock('@miden-sdk/miden-sdk', () => ({ AccountId: {}, Address: {} }));
vi.mock('@/config', () => ({ MIDEN_NETWORK: 'testnet', MIDEN_USDC_FAUCET_ID: '0x537c15a622074e91188aa894456c52' }));

describe('Bread connection', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.selected = false; mocks.connect.mockResolvedValue(undefined); });
  it('waits for provider selection and deduplicates connection requests', async () => {
    const { result, rerender } = renderHook(() => useMidenWalletAdapter());
    let pending!: Promise<void>;
    act(() => { pending = result.current.connect(); expect(result.current.connect()).toBe(pending); });
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith('Bread');
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(result.current.connecting).toBe(true);
    mocks.selected = true;
    rerender();
    await act(async () => { await pending; });
    expect(mocks.connect).toHaveBeenCalledExactlyOnceWith(PrivateDataPermission.UponRequest, WalletAdapterNetwork.Testnet, AllowedPrivateData.Assets);
    await waitFor(() => expect(result.current.connecting).toBe(false));
  });
  it('propagates a wallet rejection and permits another attempt', async () => {
    mocks.selected = true;
    mocks.connect.mockRejectedValueOnce(new Error('User rejected'));
    const { result } = renderHook(() => useMidenWalletAdapter());
    let pending!: Promise<void>;
    act(() => { pending = result.current.connect(); });
    await act(async () => { await expect(pending).rejects.toThrow('User rejected'); });
    await waitFor(() => expect(result.current.connecting).toBe(false));
    act(() => { pending = result.current.connect(); });
    await act(async () => { await pending; });
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });
});
