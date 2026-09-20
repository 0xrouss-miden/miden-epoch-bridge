import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { formatUnits } from 'viem';
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_MIDEN_NETWORK', 'testnet'); vi.stubEnv('NEXT_PUBLIC_MIDEN_USDC_FAUCET_ID', undefined); vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it('distinguishes Sepolia units from the published Miden faucet units', async () => {
  const { SEPOLIA_TOKENS, epochMidenToken } = await import('../epoch-tokens');
  expect(SEPOLIA_TOKENS).toHaveLength(5);
  const mapped = SEPOLIA_TOKENS.filter(token => token.midenFaucetId);
  expect(mapped.map(token => token.symbol)).toEqual(['USDC', 'DAI', 'USDT', 'WETH', 'WBTC']);
  for (const token of mapped) {
    expect(formatUnits(1000000000000000000n, token.decimals)).toBe('1');
    expect(formatUnits(1000000n, token.midenDecimals!)).toBe('1');
    expect(epochMidenToken(token.midenFaucetId!.toUpperCase())?.symbol).toBe(token.symbol);
  }
  expect(SEPOLIA_TOKENS.find(token => token.symbol === 'PENGU')).toBeUndefined();
});
it('does not reuse testnet faucets on devnet', async () => {
  vi.stubEnv('NEXT_PUBLIC_MIDEN_NETWORK', 'devnet');
  const { SEPOLIA_TOKENS } = await import('../epoch-tokens');
  expect(SEPOLIA_TOKENS.every(token => token.midenFaucetId === undefined)).toBe(true);
});
it('does not assign published decimals to an overridden faucet', async () => {
  vi.stubEnv('NEXT_PUBLIC_MIDEN_USDC_FAUCET_ID', '0xother');
  const { SEPOLIA_TOKENS } = await import('../epoch-tokens');
  expect(SEPOLIA_TOKENS[0].midenFaucetId).toBe('0xother');
  expect(SEPOLIA_TOKENS[0].midenDecimals).toBeUndefined();
});
