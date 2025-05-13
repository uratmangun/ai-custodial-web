import { useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { Copy, ChevronDown, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError, status } = useConnect();
  const { disconnect } = useDisconnect();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch the wallet balance
  const { data: balanceData } = useBalance({
    address: address as `0x${string}` | undefined,
  });
  
  // Format address to be displayed in a shortened form
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) && 
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find the Coinbase Wallet connector
  const coinbaseConnector = connectors.find((c) => c.name === 'Coinbase Wallet');

  if (!isConnected) {
    return (
      <button
        onClick={() => coinbaseConnector && connect({ connector: coinbaseConnector })}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50"
        disabled={status === 'pending'}
      >
        {status === 'pending' ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
          <span className="text-xs text-white font-bold">
            {address ? address.substring(2, 4) : '??'}
          </span>
        </div>
        
        <span>{formatAddress(address || '')}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-72 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
        >
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-500">Connected with Smart Wallet</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{formatAddress(address || '')}</p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(address || '');
                  toast.success("Address copied to clipboard");
                }}
                className="rounded-md p-1 hover:bg-gray-100"
              >
                <Copy size={16} />
              </button>
            </div>
            
            {/* Balance display */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wallet className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500">Balance</span>
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                      {balanceData ? (
                        <>
                          {parseFloat(balanceData.formatted).toFixed(4)} {balanceData.symbol}
                        </>
                      ) : (
                        "Loading..."
                      )}
                    </p>
                  </div>
                </div>
                
                {/* This could be expanded in the future to show token balances */}
                <div className="mt-1 text-xs text-gray-400 text-right">
                  <button 
                    onClick={() => toast.info("Token balances functionality coming soon!")}
                    className="hover:text-blue-500 transition-colors"
                  >
                    View all assets
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-2">
            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="w-full rounded-md px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
      
      {connectError?.message && (
        <div className="absolute right-0 mt-2 w-72 rounded-md bg-red-50 p-4 text-red-700 text-sm">
          {connectError.message}
        </div>
      )}
    </div>
  );
} 