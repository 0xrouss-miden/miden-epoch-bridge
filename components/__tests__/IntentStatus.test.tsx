import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { IntentStatus } from '../crosschain/IntentStatus';
afterEach(cleanup);
const result={taskTypeString:'test',intentData:{},intentNonce:'42',submissionWarning:'HTTP 400: Internal server error',depositChainId:11155111,solveResult:{depositResult:{success:true,transactionHash:'0xdeposit'}}};
it('shows uncertain response with tracking identity instead of Intent Error',()=>{
 render(<IntentStatus result={result} error={null} flowStatus={null} isPolling />);
 expect(screen.getByText('Checking delivery')).toBeInTheDocument();
 expect(screen.getByText('Intent: 42')).toBeInTheDocument();
 expect(screen.queryByText('Intent Error')).not.toBeInTheDocument();
});
it('reconciles the HTTP warning when destination settlement is confirmed',()=>{
 render(<IntentStatus result={result} error={null} flowStatus={{evmCompleted:true,midenTxId:'0xmiden',midenNoteId:'0xnote'}} isPolling={false} />);
 expect(screen.getByText('Delivery confirmed by Epoch')).toBeInTheDocument();
 expect(screen.queryByText('Checking delivery')).not.toBeInTheDocument();
});
