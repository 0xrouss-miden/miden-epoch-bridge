import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { sepolia } from "@reown/appkit/networks";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
export const adapter = projectId
  ? new WagmiAdapter({
      projectId,
      networks: [sepolia],
      ssr: true,
      transports: { [sepolia.id]: http("/api/rpc") },
    })
  : null;
export const wagmiConfig =
  adapter?.wagmiConfig ??
  createConfig({
    chains: [sepolia],
    connectors: [injected()],
    ssr: true,
    transports: { [sepolia.id]: http("/api/rpc") },
  });
