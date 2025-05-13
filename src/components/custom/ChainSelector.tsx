import { useState, useRef, useEffect } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export function ChainSelector() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Chain configuration
  const chains = [
    { id: 8453, name: 'Base', icon: 'B', backgroundColor: '#0052FF', textColor: 'white' },
    { id: 84532, name: 'Base Sepolia', icon: 'BS', backgroundColor: '#F6F6F6', textColor: '#666666' },
  ];
  
  // Find current chain
  const currentChain = chains.find(chain => chain.id === chainId) || chains[0];
  
  // Handle chain switch
  const handleSwitchChain = (id: number) => {
    if (id === chainId) {
      setIsOpen(false);
      return;
    }
    
    try {
      switchChain({ chainId: id });
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to switch network');
      console.error('Failed to switch network:', error);
    }
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
  
  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        style={{ 
          backgroundColor: currentChain.backgroundColor,
          color: currentChain.textColor
        }}
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
          <span className="text-xs text-white font-bold">
            {currentChain.icon}
          </span>
        </div>
        <span>{isPending ? 'Switching...' : currentChain.name}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute mt-2 w-full rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
        >
          <div className="p-2">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => handleSwitchChain(chain.id)}
                className="w-full rounded-md px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center"
              >
                <div 
                  className="h-6 w-6 rounded-full flex items-center justify-center mr-2"
                  style={{ 
                    backgroundColor: chain.backgroundColor,
                    color: chain.textColor 
                  }}
                >
                  <span className="text-xs font-bold">{chain.icon}</span>
                </div>
                <span className={chain.id === chainId ? 'font-semibold' : ''}>
                  {chain.name}
                </span>
                {chain.id === chainId && (
                  <span className="ml-auto text-green-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 