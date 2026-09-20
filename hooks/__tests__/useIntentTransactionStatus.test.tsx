import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const f=vi.hoisted(()=>({getIntentStatus:vi.fn()}));
vi.mock('@/lib/epoch-sdk',()=>({useEpochSdk:()=>f}));
import { useIntentTransactionStatus } from '../useIntentTransactionStatus';
afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks();});
it('keeps polling after an origin success until a destination success exists',async()=>{
 vi.useFakeTimers();
 f.getIntentStatus.mockResolvedValueOnce([{chainId:11155111,status:'success',transactionHash:'0xorigin'}]).mockResolvedValueOnce([{chainId:999999999,status:'success',transactionHash:'0xdestination'}]);
 const {result}=renderHook(()=>useIntentTransactionStatus('0xsponsor','42',999999999));
 await act(async()=>{});
 expect(result.current.isPolling).toBe(true);
 await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
 expect(f.getIntentStatus).toHaveBeenNthCalledWith(2,'0xsponsor','42');
 expect(result.current.isPolling).toBe(false);
});
it('does not apply a response from the previous intent after switching',async()=>{
 let finish!:(rows:unknown[])=>void;
 f.getIntentStatus.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValue([]);
 const {result,rerender}=renderHook(({nonce})=>useIntentTransactionStatus('0xsponsor',nonce,999999999),{initialProps:{nonce:'42'}});
 rerender({nonce:'43'});
 await act(async()=>{finish([{chainId:999999999,status:'success',transactionHash:'0xold'}]);});
 expect(result.current.statuses).toEqual([]);expect(result.current.isPolling).toBe(true);
});
