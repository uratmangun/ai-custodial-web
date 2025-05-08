// src/app/balance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from '@/components/ui/button';
import { BalanceTable } from '@/components/custom/BalanceTable';
import { sdk } from '@farcaster/frame-sdk'
interface RawBalanceItem {
  block_num: number;
  datetime: string;
  contract: string;
  amount: string;
  value: number;
  decimals: number;
  symbol: string;
  network_id: string;
}

interface PaginationInfo {
  previous_page: number;
  current_page: number;
  next_page: number;
  total_pages: number;
}

interface ApiResponse {
  data: RawBalanceItem[];
  statistics?: any; 
  pagination: PaginationInfo;
  results?: number;
  total_results?: number;
  request_time?: string;
  duration_ms?: number;
  error?: string; 
}

const NETWORKS_TO_FETCH = [
  'mainnet',
  'bsc',
  'base',
  'arbitrum-one',
  'optimism',
  'matic',
  'unichain'
];

export default function BalancePage() {
  const { address, isConnected } = useAccount();
  const [networkBalances, setNetworkBalances] = useState<Record<string, RawBalanceItem[] | null>>({});
  const [paginationInfo, setPaginationInfo] = useState<Record<string, PaginationInfo | null>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, string | null>>({});
  useEffect(() => {
    sdk.actions.ready();
    
  }, []);
  const handleFetchBalances = async (networkId: string, page: number = 1) => { 
    if (!isConnected || !address) {
      setErrorStates(prev => ({ ...prev, [networkId]: 'Please connect your wallet first.' }));
      return;
    }

    setLoadingStates(prev => ({ ...prev, [networkId]: true }));
    setErrorStates(prev => ({ ...prev, [networkId]: null }));
    if (page === 1) {
        setPaginationInfo(prev => ({ ...prev, [networkId]: null }));
        setNetworkBalances(prev => ({ ...prev, [networkId]: null })); 
    }

    try {
      const response = await fetch(`/api/balance?address=${address}&network_id=${networkId}&page=${page}`);
      const data: ApiResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP error on ${networkId}! Status: ${response.status}`);
      }

      const rawBalances = data.data;
      const rawPagination = data.pagination;

      setNetworkBalances(prev => ({ ...prev, [networkId]: rawBalances }));
      setPaginationInfo(prev => ({ ...prev, [networkId]: rawPagination }));
      setErrorStates(prev => ({ ...prev, [networkId]: null }));

    } catch (err: any) {
      setErrorStates(prev => ({ ...prev, [networkId]: err.message || `Failed to fetch balances for ${networkId}.` }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [networkId]: false }));
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-12 p-4 bg-gradient-to-br from-sky-400 to-violet-500">
      <h1 className="text-4xl font-bold text-slate-900">Token Balance</h1>
      <p className="mt-4 mb-6 text-lg text-slate-700">Check your token balances across different networks.</p>

      <div className="mb-8 flex flex-col items-center gap-4">
        <ConnectButton />
      </div>

      <div className="w-full max-w-4xl flex flex-col items-center gap-6">
        {errorStates.general && <p className="text-center text-red-500">Error: {errorStates.general}</p>}

        {NETWORKS_TO_FETCH.map((networkId) => (
          <div key={networkId} className="w-full p-4 bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3 text-slate-800 capitalize">{networkId.replace('-one', '')} Balances</h2>

            <div className="mb-4">
              <Button
                onClick={() => handleFetchBalances(networkId, 1)} 
                disabled={!isConnected || loadingStates[networkId]}
              >
                {loadingStates[networkId] ? `Fetching ${networkId.replace('-one', '')}...` : `Fetch ${networkId.replace('-one', '')} Balances`}
              </Button>
            </div>

            {loadingStates[networkId] && <p className="text-center text-slate-600">Loading {networkId} balances...</p>}
            {errorStates[networkId] && <p className="text-center text-red-500">Error: {errorStates[networkId]}</p>}
            {
              networkBalances[networkId] && Array.isArray(networkBalances[networkId])
                ? <BalanceTable balances={networkBalances[networkId]} /> 
                : null
            }

            {networkBalances[networkId]?.length === 0 && !loadingStates[networkId] && !errorStates[networkId] && (
                 <p className="text-center text-slate-500 py-4">No token balances found on {networkId}.</p>
            )}
             {paginationInfo[networkId] && networkBalances[networkId] && networkBalances[networkId]!.length > 0 && (
                <div className="mt-4 flex justify-center items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFetchBalances(networkId, paginationInfo[networkId]!.current_page - 1)}
                    disabled={loadingStates[networkId] || paginationInfo[networkId]!.current_page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-700">
                    Page {paginationInfo[networkId]!.current_page} of {paginationInfo[networkId]!.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFetchBalances(networkId, paginationInfo[networkId]!.current_page + 1)}
                    disabled={loadingStates[networkId] || paginationInfo[networkId]!.current_page >= paginationInfo[networkId]!.total_pages}
                  >
                    Next
                  </Button>
                </div>
             )}
          </div>
        ))}
      </div>
    </main>
  );
}
