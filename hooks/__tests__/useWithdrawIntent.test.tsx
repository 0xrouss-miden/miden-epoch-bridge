import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(() => ({address:'0x1111111111111111111111111111111111111111', chainId:11155111, quote:vi.fn(), solve:vi.fn()}));
vi.mock('wagmi',()=>({useAccount:()=>({address:mocks.address}),useWalletClient:()=>({data:{chain:{id:mocks.chainId}}})}));
vi.mock('@/lib/epoch-sdk',()=>({useEpochSdk:()=>({})}));
vi.mock('@/services/epoch-bridge',()=>({getEVMToMidenQuote:(...args:unknown[])=>mocks.quote(...args),buildEVMToMidenIntent:(...args:unknown[])=>mocks.solve(...args)}));
import { useWithdrawIntent } from '../useWithdrawIntent';
const params={sourceChainId:11155111,destinationChainId:999999999,evmSourceAddress:'0x1111111111111111111111111111111111111111',evmTokenAddress:'0x2222222222222222222222222222222222222222',midenRecipientId:'0xrecipient',midenFaucetId:'0xfaucet',minTokenOut:'1000000'};
beforeEach(()=> { vi.clearAllMocks(); mocks.address=params.evmSourceAddress; mocks.chainId=11155111; mocks.quote.mockResolvedValue({params,quotedAt:Date.now(),quoteResult:{tokenIn:'1010000000000000001'}}); });
it('invalidates quotes when the signer changes',async()=>{
 const {result,rerender}=renderHook(()=>useWithdrawIntent());
 await act(async()=>{await result.current.fetchQuote(params);});
 expect(result.current.pendingQuote).not.toBeNull();
 mocks.address='0x3333333333333333333333333333333333333333';rerender();
 await waitFor(()=>expect(result.current.pendingQuote).toBeNull());
 expect(mocks.solve).not.toHaveBeenCalled();
});
it('does not allow a late quote response to restore a discarded quote',async()=>{
 let finish!:(value:unknown)=>void;mocks.quote.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const {result}=renderHook(()=>useWithdrawIntent());let pending!:Promise<void>;
 act(()=>{pending=result.current.fetchQuote(params);});
 act(()=>{result.current.clearQuote();});
 await act(async()=>{finish({params,quotedAt:Date.now(),quoteResult:{tokenIn:'1'}});await pending;});
 expect(result.current.pendingQuote).toBeNull();
});
it('rejects stale quotes before any wallet action',async()=>{
 mocks.quote.mockResolvedValue({params,quotedAt:Date.now()-61000,quoteResult:{tokenIn:'1'}});
 const {result}=renderHook(()=>useWithdrawIntent());
 await act(async()=>{await result.current.fetchQuote(params);});
 await act(async()=>{await expect(result.current.confirmWithdraw()).rejects.toThrow('more than one minute');});
 expect(mocks.solve).not.toHaveBeenCalled();
});
it('surfaces allocator errors without reporting submission success',async()=>{
 mocks.solve.mockResolvedValue({error:'Epoch API: failure'});
 const {result}=renderHook(()=>useWithdrawIntent());
 await act(async()=>{await result.current.fetchQuote(params);});
 await act(async()=>{await expect(result.current.confirmWithdraw()).rejects.toThrow('Epoch API');});
 expect(result.current.error).toContain('Epoch API');expect(result.current.pendingQuote).toBeNull();expect(result.current.isLoading).toBe(false);
});
