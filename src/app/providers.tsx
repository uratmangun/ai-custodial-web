"use client"
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, cookieStorage, createConfig, createStorage,WagmiProvider } from "wagmi";
import {
 baseSepolia,
 base
} from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { coinbaseWallet } from "wagmi/connectors";
import { parseEther, toHex } from 'viem';
export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    coinbaseWallet({
      appName: "My Sub Account Demo",
      preference: {
        keysUrl: "https://keys-dev.coinbase.com/connect",
        options: "smartWalletOnly",
      },
      subAccounts: {
        enableAutoSubAccounts: true,
        defaultSpendLimits: {
          84532: [
            {
              token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
              allowance: toHex(parseEther('0.01')),
              period: 86400,
            },
          ],
          8453: [
            {
              token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
              allowance: toHex(parseEther('0.01')),
              period: 86400,
            },
          ],
        },
      },
    }),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});
const queryClient = new QueryClient();
export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
  );
}
