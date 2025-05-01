// src/app/balance/page.tsx
import BalanceTable from "@/components/custom/BalanceTable";
import { ConnectButton } from "@rainbow-me/rainbowkit"; // Import ConnectButton

const mockBalances = [
  { token: "Ethereum", symbol: "ETH", balance: "1.25", value: "$4,500.00" },
  { token: "Zora Coin", symbol: "ZORA", balance: "500.00", value: "$50.00" },
  { token: "USD Coin", symbol: "USDC", balance: "1,000.00", value: "$1,000.00" },
];

export default function BalancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-12 p-4 bg-gradient-to-br from-sky-400 to-violet-500">
      <h1 className="text-4xl font-bold text-slate-900">Token Balance</h1>
      <p className="mt-4 mb-2 text-lg text-slate-700">Check your token balances here.</p>

      <div className="mb-8">
        <ConnectButton />
      </div>

      <div className="w-full max-w-2xl">
        {/* Use the new BalanceTable component */}
        <BalanceTable balances={mockBalances} title="My Token Holdings" />
        {/* Added wrapper div with margin-top */}
        <div className="mt-4">
          <BalanceTable balances={mockBalances} title="Your zora coin balances" />
        </div>
      </div>
    </main>
  );
}
