# Miden Epoch Bridge

A testnet bridge between Ethereum Sepolia and Miden, built with Next.js, the Epoch Intents SDK, and the Miden wallet adapter.

[Live app](https://miden-epoch-bridge.vercel.app/) · [Epoch integration reference](https://github.com/epochprotocol/miden-integration-example)

## Requirements

- Bun 1.3.14
- An EVM wallet connected through Reown AppKit (injected or WalletConnect), on Sepolia
- Bread Wallet for Miden Testnet
- Test tokens and sufficient funds for transaction fees

Set `NEXT_PUBLIC_REOWN_PROJECT_ID` to enable Reown AppKit and WalletConnect. Without it, local development falls back to injected EVM wallets.

## Local development

```sh
bun install --frozen-lockfile
cp .env.example .env.local
bun run dev
```

Open http://localhost:3017.

## Configuration

| Variable | Purpose / default |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | App origin; use the deployed HTTPS URL in production. |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Optional Reown project ID. Without it, the app uses injected EVM wallets. |
| `NEXT_PUBLIC_ALLOCATOR_URL` | Epoch allocator; defaults to `https://testnet-dev.epochprotocol.xyz`. |
| `NEXT_PUBLIC_MIDEN_NETWORK` | Defaults to `testnet`. Published token mappings target Miden Testnet. |
| `NEXT_PUBLIC_MIDEN_RPC_URL` | Miden RPC URL or SDK network preset; defaults to the selected network. |
| `NEXT_PUBLIC_MIDEN_PROVER` | SDK prover preset; defaults to the selected network. |
| `NEXT_PUBLIC_MIDEN_USDC_FAUCET_ID` | Optional override for the published Miden USDC faucet. |
| `NEXT_PUBLIC_MIDENSCAN_URL` | Optional Miden explorer URL. |
| `SEPOLIA_RPC_URL` | Server-only Sepolia RPC endpoint; defaults to PublicNode. |

Public variables are embedded at build time. Rebuild after changing them. Keep RPC credentials in server-only variables, never in `NEXT_PUBLIC_*` variables.

## Supported tokens

Only these five Epoch test tokens are selectable. The Miden asset list filters wallet assets by faucet ID, not by symbol. Sepolia tokens use 18 decimals; these Miden faucets use 6.

| Token | Sepolia address | Miden faucet |
| --- | --- | --- |
| USDC | `0x2BB4FfD7E2c6D432b697554Efd77fA13bdbefd69` | `0x537c15a622074e91188aa894456c52` |
| DAI | `0xc30f1Ce05d1434d484E9A47283aA925fc8A8699a` | `0xd17976f0809a8191412f2a126625df` |
| USDT | `0xc04d2869665Be874881133943523723Be5782720` | `0x6500ca8c2dd69e9147ab7eafad162c` |
| WETH | `0x7946dd86eE310D0aC16804A37787289Fa5b88A8A` | `0x4a09f13153d9cd114c078bfb62a7ec` |
| WBTC | `0x9b2a2754a9182fD65360E23afCDf3BeFF51796E9` | `0x5fd2e6fd17712c51404d09c2b847f7` |

Mappings are defined in `lib/epoch-tokens.ts`, based on the [Epoch faucet dashboard](https://userdashboard.epochprotocol.xyz/faucets). Epoch test USDC is distinct from Circle USDC used by the AggLayer bridge.

## Wallet integration

EVM connections use Reown AppKit with Wagmi on Sepolia. Bread connections use `WalletProvider` and `useWallet` from the Miden wallet adapter. The app requests asset access and sends custom transaction requests to Bread for approval and execution.

The independent `MidenProvider` synchronizes public chain data and supports collateral-note construction. It does not import the connected private account or use `MidenFiSignerProvider`. A withdrawal quote requires chain synchronization, a connected wallet, and a supported asset balance.

## Transfer flows

### Sepolia to Miden

Request a quote for a minimum Miden output amount, review the required Sepolia deposit, and confirm in the EVM wallet. The app tracks destination settlement. Consume the received Miden note through Bread Wallet to add the assets to the account balance.

### Miden to Sepolia

Select a supported asset from the Miden wallet, request a quote, and confirm creation of a public, mandate-bound P2IDE collateral note. The app tracks execution on the destination EVM chain. The allocator is a trusted participant; note reclaimability alone does not guarantee EVM settlement.

## Epoch response handling

The app uses Epoch SDK `1.0.39` with a local Bun patch in `patches/`. The patch preserves the nonce and deposit result when the allocation request fails after collateral submission. It does not change request bodies, signatures, or deposit calldata, and does not retry deposits.

An HTTP error from `/compact` is treated as an uncertain submission when tracking metadata is available. The app continues querying the same intent and only reports destination completion when supported by status data. The latest inbound result with a nonce is stored per EVM account and network in browser storage when available; this is not a full transaction history.

This handles ambiguous responses; it does not fix the allocator's underlying `INTERNAL_ERROR`. Check an existing intent before creating another deposit.

## Checks

```sh
bun run test
bun run typecheck
bun run build
```

Tests cover intent construction, token units, collateral, settlement selection, response recovery, polling, and UI behavior. They do not prove live end-to-end settlement.

## Deploy to Vercel

`vercel.json` selects Next.js, installs with `bun install --frozen-lockfile`, and builds with `bun run build`. Commit `bun.lock` and `patches/` so the SDK patch is applied during installation.

Import the repository into Vercel, configure the environment variables, and set `NEXT_PUBLIC_APP_URL` to the production URL. If using Reown, configure the deployed domain in the corresponding Reown project. The `/api/rpc` route proxies allowlisted read-only Sepolia RPC methods.

For a linked project, deploy with:

```sh
bunx vercel --prod
```

Verify the deployed page, RPC access, and wallet connection before testing a transfer.
