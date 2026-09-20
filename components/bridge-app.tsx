"use client";
import { useState } from "react";
import { ArrowRight, Wallet, Layers } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import Providers, { appKit } from "./providers";
import { MidenWalletAdapterProvider, useMidenWalletAdapterContext } from "@/hooks/MidenWalletAdapterProvider";
import { CrosschainTab } from "./tabs/CrosschainTab";
import { WithdrawTab } from "./tabs/WithdrawTab";
import { toast } from "sonner";
import { MIDEN_USDC_FAUCET_ID } from "@/config";
const allocator = process.env.NEXT_PUBLIC_ALLOCATOR_URL || "https://testnet-dev.epochprotocol.xyz";
const short = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;

function Bridge() {
  const [direction, setDirection] = useState("deposit");
  const [visited, setVisited] = useState(new Set(["deposit"]));
  const [tab, setTab] = useState("bridge");
  const account = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const miden = useMidenWalletAdapterContext();
  const evmConnecting = account.isConnecting || account.isReconnecting;
  async function connectEvm() {
    try {
      if (appKit) await appKit.open({ view: "Connect" });
      else if (connectors[0]) await connectAsync({ connector: connectors[0] });
      else throw new Error("Install an EVM wallet to connect.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not connect the wallet"); }
  }
  function changeDirection(value: string) {
    setDirection(value); setVisited(previous => new Set(previous).add(value));
  }
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="header"><div className="header-inner">
      <a className="brand" href="/" aria-label="Miden Epoch Bridge">miden<span className="brand-dot" /></a>
      <nav className="nav" aria-label="Main navigation">
        <button className={tab === "bridge" ? "active" : ""} onClick={() => setTab("bridge")}>Bridge</button>
        <button className={tab === "network" ? "active" : ""} onClick={() => setTab("network")}>Settings</button>
      </nav>
      <div className="header-actions"><span className="testnet-badge"><span />Testnet</span>
        <button className="button wallet-button" disabled={evmConnecting} onClick={account.isConnected ? () => disconnect() : connectEvm}><Wallet size={16}/>{evmConnecting ? "Connecting…" : account.isConnected && account.address ? `${short(account.address)} · Disconnect` : "Connect EVM wallet"}</button>
      </div>
    </div></header>
    <main id="main" className="main">
      <div className="page-title"><div><h1>{tab === "bridge" ? "Your assets, across chains." : "Your connection to Epoch."}</h1><p className="muted">Sepolia and Miden Testnet, connected through Epoch.</p></div></div>
      <div hidden={tab !== "bridge"}>
        <div className="bridge-layout">
          <section className="form-panel epoch-form" aria-label="Transfer with Epoch">
            <div className="section-top"><h2>Transfer</h2><span className="muted small">Epoch Protocol</span></div>
            <div className="direction-tabs" role="group" aria-label="Transfer direction">
              <button aria-pressed={direction === "deposit"} className={direction === "deposit" ? "selected" : ""} onClick={() => changeDirection("deposit")}>Deposit to Miden</button>
              <button aria-pressed={direction === "withdraw"} className={direction === "withdraw" ? "selected" : ""} onClick={() => changeDirection("withdraw")}>Withdraw to Sepolia</button>
            </div>
            <div className="epoch-route"><strong>{direction === "deposit" ? "Sepolia" : "Miden"}</strong><ArrowRight size={18}/><strong>{direction === "deposit" ? "Miden" : "Sepolia"}</strong></div>
            {visited.has("deposit") && <div hidden={direction !== "deposit"}><WithdrawTab /></div>}
            {visited.has("withdraw") && <div hidden={direction !== "withdraw"}><CrosschainTab /></div>}
          </section>
          <aside className="epoch-aside">
            <section className="epoch-wallets"><h2>Your wallets</h2><p className="muted">Connect both to get a quote and transfer.</p>
              <div className="epoch-wallet-row"><div><strong>Sepolia</strong><p className="muted small">{account.address ? short(account.address) : "MetaMask or WalletConnect"}</p></div><button className="button" disabled={account.isConnected || evmConnecting} onClick={connectEvm}>{evmConnecting ? "Connecting…" : account.isConnected ? "Connected" : "Connect"}</button></div>
              <div className="epoch-wallet-row"><div><strong>Miden</strong><p className="muted small">{miden.accountId?.hex ? short(miden.accountId.hex) : "Bread Wallet"}</p></div><button className="button" disabled={miden.connected || miden.connecting} onClick={() => void miden.connect().catch(error => toast.error(error instanceof Error ? error.message : "Could not connect Bread"))}>{miden.connecting ? "Connecting…" : miden.connected ? "Connected" : "Connect"}</button></div>
            </section>
            <section className="epoch-guide"><h2>How it works</h2><ol><li><strong>Get a quote</strong><p>Epoch calculates the amount needed to receive your chosen tokens.</p></li><li><strong>Review and sign</strong><p>Confirm the quote and authorize the transaction in your wallet.</p></li><li><strong>Receive your tokens</strong><p>{direction === "deposit" ? "On Miden, consume the received note to add the tokens to your balance." : "Track intent settlement on Sepolia and check the tokens in your EVM wallet."}</p></li></ol></section>
            <div className="notice"><Layers size={18}/><p>Epoch tutorial tokens are test assets. Epoch USDC is different from the Circle USDC used by the AggLayer bridge.</p></div>
          </aside>
        </div>
      </div>
      {tab === "network" && <section className="configuration-block epoch-config"><h2>Integration settings</h2><dl><dt>Allocator</dt><dd><code>{allocator}</code></dd><dt>EVM network</dt><dd>Sepolia · 11155111</dd><dt>Epoch Miden destination</dt><dd>999999999</dd><dt>Miden USDC faucet</dt><dd><code>{MIDEN_USDC_FAUCET_ID || "Not configured · enter it in the form"}</code></dd><dt>SDK</dt><dd>Epoch Intents 1.0.39 · Miden 0.16.0</dd></dl><p className="muted">The allocator must be available and support the selected faucet. These settings do not confirm service availability.</p></section>}
      <footer className="footer"><span>Miden <span className="footer-cross">×</span> Epoch</span><span>Testnet · Quote before signing</span></footer>
    </main>
  </>;
}
export default function BridgeApp() { return <Providers><MidenWalletAdapterProvider><Bridge /></MidenWalletAdapterProvider></Providers>; }
