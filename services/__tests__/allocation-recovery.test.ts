import { expect, it, vi } from 'vitest';
const f=vi.hoisted(()=>({allocation:vi.fn(),deposit:vi.fn()}));
vi.mock('@epoch-protocol/epoch-intents-sdk/dist/services',()=>({
 getCompactData:async()=>({compactData:{nonce:42n,expires:9999999999n,id:1n,lockTag:1n,amount:'101',token:'0x2222222222222222222222222222222222222222',mandate:{tokenInAmount:'101',tokenIn:'0x2222222222222222222222222222222222222222',destinationChainId:'999999999'}},witnessTypeString:'test',typehash:'0xhash',tokenType:'erc20'}),
 getForcedWithdrawalStatusService:async()=>({status:'Disabled'}),
 depositToCompact:(...args:unknown[])=>f.deposit(...args),createAllocation:(...args:unknown[])=>f.allocation(...args),
 checkIfDepositNeeded:vi.fn(),getMidenCollateralConfig:vi.fn(),
}));
vi.mock('@epoch-protocol/epoch-commons-sdk',async importOriginal=>({...await importOriginal<object>(),getClaimHash:()=>`0x${'1'.repeat(64)}`}));
import { solveIntent } from '@epoch-protocol/epoch-intents-sdk/dist/sdk/solve-intent';
import { APIError } from '@epoch-protocol/epoch-intents-sdk';
it('preserves the exact submitted nonce and successful deposit on HTTP error; never retries',async()=>{
 const apiError=new APIError('Internal server error',400,'INTERNAL_ERROR');
 f.deposit.mockResolvedValue({success:true,transactionHash:'0xdeposit'});f.allocation.mockRejectedValue(apiError);
 let caught:any;
 try {await solveIntent({apiBaseUrl:'https://example.com',walletClient:{chain:{id:11155111},account:{type:'json-rpc'}}} as any,{sponsorAddress:'0x1111111111111111111111111111111111111111',collateralType:'evm',quoteResult:{resourceLockRequired:true,tokenIn:'101'}} as any,{} as any);} catch(error){caught=error;}
 expect(caught).toBe(apiError);
 expect(caught.epochSubmission.nonce).toBe('42');
 expect(caught.epochSubmission.depositResult).toEqual({success:true,transactionHash:'0xdeposit'});
 expect(caught.epochSubmission.intentRequestData).toEqual(f.allocation.mock.calls[0][1]);
 expect(f.deposit).toHaveBeenCalledTimes(1);expect(f.allocation).toHaveBeenCalledTimes(1);
});
