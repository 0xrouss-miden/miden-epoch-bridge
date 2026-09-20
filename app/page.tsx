"use client";
import dynamic from "next/dynamic";
const BridgeApp = dynamic(() => import("@/components/bridge-app"), {
  ssr: false,
  loading: () => (
    <main className="boot">
      <span className="brand">
        miden
        <span className="brand-dot" />
      </span>
      <p>Preparing the bridge and wallet connections…</p>
    </main>
  ),
});
export default function Page() {
  return <BridgeApp />;
}
