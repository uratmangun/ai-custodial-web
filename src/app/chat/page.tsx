"use client";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/navigation';
import { useAccount,useChainId, useConfig, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem'
import { getPublicClient } from 'wagmi/actions'
import { getCoinsTopGainers,getProfileBalances,getCoin,getCoinComments } from "@zoralabs/coins-sdk";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [messageRoles, setMessageRoles] = useState<('user'|'assistant'|'tool')[]>([]);
  const [messageToolCallIds, setMessageToolCallIds] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isUserMessage, setIsUserMessage] = useState<boolean[]>([]);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<any[][]>([]);
  const [respondedToolCalls, setRespondedToolCalls] = useState<boolean[][]>([]);
  const [loadingToolCalls, setLoadingToolCalls] = useState<boolean[][]>([]);
  const [toastError, setToastError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId()
  const chatEndRef = useRef<HTMLDivElement>(null);
  const config = useConfig()
  const chain = config.chains.find((c) => c.id === chainId)
  const publicClient = getPublicClient(config, { chainId })
  const { switchChain } = useSwitchChain()
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [comboboxValue, setComboboxValue] = useState("");
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const truncateMiddle = (str: string, start = 6, end = 4) => {
    if (str.length <= start + end) return str;
    return `${str.slice(0, start)}...${str.slice(str.length - end)}`;
  };
  async function getBalance(address: `0x${string}`) {
    if (!publicClient) return null;
    const balance = await publicClient.getBalance({ address })
    return formatEther(balance)
  }
  const formatDate = (date: Date): string => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    // add user message
    setMessages(prev => [...prev, userMsg]);
    setMessageRoles(prev => [...prev, 'user']);
    setMessageToolCallIds(prev => [...prev, '']);
    setIsUserMessage(prev => [...prev, true]);
    setUsernames(prev => [...prev, address ? truncateMiddle(address) : 'Anonymous']);
    setDates(prev => [...prev, formatDate(new Date())]);
    setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
    // placeholder for tool-call suggestions
    setToolCalls(prev => [...prev, []]);
    setRespondedToolCalls(prev => [...prev, []]);
    setLoadingToolCalls(prev => [...prev, []]);
    setLoading(true);
    try {
      // send full conversation history
      // build payload using tracked messageRoles and toolCallIds
      const payloadMessages = messages
        .map((m, i) => {
          if (messageRoles[i] === 'tool') {
            return { role: 'tool', tool_call_id: messageToolCallIds[i], content: m };
          }
          return { role: messageRoles[i], content: m };
        })
        .filter(msg => msg.content != null);
      // add current user message
      payloadMessages.push({ role: 'user', content: userMsg });
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages,modelName:comboboxValue }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        setToastError(errJson.error || 'Server error');
        return;
      }
      const { content: aiContent, tool_calls } = await res.json();
      // add AI response
      setMessages(prev => [...prev, aiContent]);
      setMessageRoles(prev => [...prev, 'assistant']);
      setMessageToolCallIds(prev => [...prev, '']);
      setIsUserMessage(prev => [...prev, false]);
      setUsernames(prev => [...prev, 'ai assistant']);
      setDates(prev => [...prev, formatDate(new Date())]);
      setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
      // add tool calls for AI message
      setToolCalls(prev => [...prev, tool_calls || []]);
      setRespondedToolCalls(prev => [...prev, (tool_calls || []).map(() => false)]);
      setLoadingToolCalls(prev => [...prev, (tool_calls || []).map(() => false)]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      setToastError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (msgIdx: number, callIdx: number) => {
    // set loading for this tool call
    setLoadingToolCalls(prev => {
      const arr = prev.map(inner => [...inner]);
      if (arr[msgIdx]) arr[msgIdx][callIdx] = true;
      return arr;
    });
    const tc = toolCalls[msgIdx]?.[callIdx];
    if (!tc) {
      setLoadingToolCalls(prev => {
        const arr = prev.map(inner => [...inner]);
        if (arr[msgIdx]) arr[msgIdx][callIdx] = false;
        return arr;
      });
      return;
    }
    try {
      const toolName = tc.function?.name || tc.name;
      if (toolName === 'switch_chain') {
        const chainName = tc.function?.arguments
          ? JSON.parse(tc.function.arguments).chain
          : tc.arguments?.chain;
        if (!isConnected) {
          setToastError('Please connect to a wallet first');
          return;
        }
        switchChain({ chainId: chainName === 'base' ? 8453 : 84532 })
        const aiMsg = `Switched to ${chainName}.`;
        setMessages(prev => [...prev, aiMsg]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'ai assistant']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
      } else if (toolName === 'current_chain') {
  
        const aiMsg = `Current chain is ${chain?.name} (Chain ID: ${chain?.id})`;
        setMessages(prev => [...prev, aiMsg]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'ai assistant']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
      } else if (toolName === 'check_address') {
        if (!isConnected) {
          setToastError('Please connect to a wallet first');
          return;
        }
        const aiMsg = address ? `Connected address: ${address}` : 'No address available';
        setMessages(prev => [...prev, aiMsg]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'ai assistant']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setLoadingToolCalls(prev => [...prev, []]);
      } else if (toolName === 'check_balance') {
        if (!isConnected) {
          setToastError('Please connect to a wallet first');
          return;
        }
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const addressParam = args.address || address;
        const nextPage = args.next_page;
        const balance = await getBalance(addressParam);
        const response = await getProfileBalances({
          identifier: addressParam, // Can also be zora user profile handle
          count: 20,        // Optional: number of balances per page
          after: nextPage, // Optional: for pagination
        });
       
        const profile: any = response.data?.profile;
        
        const coinBalances = profile.coinBalances?.edges || [];
        const pageInfo = profile.coinBalances?.pageInfo;
        const lines: string[] = [];
        lines.push(addressParam
          ? `Balance for ${addressParam === address ? 'your wallet' : addressParam}: ${balance} ETH`
          : 'No address available');
        if (chainId !== 8453) {
          lines.push('Please switch to base chain to see full list of zora coin balances');
        } else {
          lines.push(`Found ${coinBalances.length} coin balances:`);
          coinBalances.forEach((item: any, idx: number) => {
            const bal = item.node;
            lines.push(`${idx + 1}. ${bal.coin?.name || 'Unknown'} (${bal.coin?.symbol || 'N/A'})`);
            lines.push(`   Balance: ${Number(bal.balance) / 1e18} ${bal.coin?.symbol || 'N/A'}`);
            lines.push(`   Token address: ${bal.coin?.address || 'N/A'}`);
            lines.push('-----------------------------------');
          });
          if (pageInfo?.endCursor) {
            lines.push(`Next page cursor: ${pageInfo.endCursor}`);
          }
        }
        const display = lines.join('\n');
        setMessages(prev => [...prev, display]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'ai assistant']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setLoadingToolCalls(prev => [...prev, []]);
      } else if (toolName === 'get_coin_top_gainers') {
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const nextPage = args.next_page;
        if (chainId!==8453) {
          setToastError('Please switch to base first');
          return;
        }
        let response;
        try {
          response = await getCoinsTopGainers({  count: 10,        // Optional: number of coins per page
            after: nextPage,  });
        } catch (error) {
          setToastError(error instanceof Error ? error.message : 'Error fetching top gainers');
          return;
        }
        const coins = response.data?.exploreList?.edges?.map((edge: any) => edge.node) || [];
        const aiMsgLines: string[] = [];
        aiMsgLines.push(`Top Gainers (${coins.length} coins):`);
        coins.forEach((coin: any, index: number) => {
          const percentChange = coin.priceChange
            ? `${parseFloat(coin.priceChange).toFixed(2)}%`
            : "N/A";
          aiMsgLines.push(`${index + 1}. ${coin.name} (${coin.symbol})`);
          aiMsgLines.push(`   24h Change: ${percentChange}`);
          aiMsgLines.push(`   Market Cap: ${coin.marketCap ?? 'N/A'}`);
          aiMsgLines.push(`   Volume 24h: ${coin.volume24h ?? 'N/A'}`);
          aiMsgLines.push(`   Token address: ${coin.address}`);
          aiMsgLines.push(`   Owner address: ${coin.creatorAddress}`);
          aiMsgLines.push('-----------------------------------');
        });
        const nextPageCursor = response.data?.exploreList?.pageInfo?.endCursor;
        if (nextPageCursor) {
          aiMsgLines.push(`Next page cursor: ${nextPageCursor}`);
        }
        const aiMsg = aiMsgLines.join(`\n`);
        setMessages(prev => [...prev, aiMsg]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'ai assistant']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
      } else if (toolName === 'check_coin') {
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const coinAddress = args.address;
        const chain = args.chainId || 'base';
        const chainIdDisplay = chain === 'base' ? 8453 : 84532;
        let response;
        try {
          response = await getCoin({
            address: coinAddress,
            chain: chainIdDisplay,
          });
        } catch (err) {
          setToastError('Failed to fetch coin details');
          setLoadingToolCalls(prev => {
            const arr = prev.map(inner => [...inner]);
            if (arr[msgIdx]) arr[msgIdx][callIdx] = false;
            return arr;
          });
          return;
        }
        
       
        const coin = response.data?.zora20Token;
       
        if (!coin) {
          setMessages(prev => [...prev, `Coin not found for address: ${coinAddress}`]);
        } else {
          const lines: string[] = [];
          lines.push(`Coin: ${coin.name} (${coin.symbol})`);
          lines.push(`Address: ${coin.address}`);
          lines.push(`Chain: ${chainIdDisplay}`);
          if (coin.description) lines.push(`Description: ${coin.description}`);
          lines.push(`Total Supply: ${coin.totalSupply ?? 'N/A'}`);
          lines.push(`Market Cap: ${coin.marketCap ?? 'N/A'}`);
          lines.push(`24h Volume: ${coin.volume24h ?? 'N/A'}`);
          lines.push(`Owner: ${coin.creatorAddress ?? 'N/A'}`);
          lines.push(`Created At: ${coin.createdAt ?? 'N/A'}`);
          lines.push(`Unique Holders: ${coin.uniqueHolders ?? 'N/A'}`);
          if (coin.mediaContent?.previewImage) {
            lines.push(`![Preview Image](${coin.mediaContent.previewImage.small})`);
          }
          setMessages(prev => [...prev, lines.join('\n')]);
        }
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'ai assistant']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setLoadingToolCalls(prev => [...prev, []]);
        return;
      } else if (toolName === 'get_coin_comment') {
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const coinAddress = args.address;
        const chain = args.chain || 'base';
        const nextPage = args.next_page;
        let response;
        try {
          response = await getCoinComments({
            address: coinAddress,
            chain: chain === 'base' ? 8453 : 84532,
            after: nextPage,
          });
        } catch (err) {
          setToastError('Failed to fetch coin comments');
          setLoadingToolCalls(prev => {
            const arr = prev.map(inner => [...inner]);
            if (arr[msgIdx]) arr[msgIdx][callIdx] = false;
            return arr;
          });
          return;
        }
        const comments = response.data?.zora20Token?.zoraComments?.edges || [];
        const pageInfo = response.data?.zora20Token?.zoraComments?.pageInfo;
        const lines: string[] = [];
        lines.push(`Comments for coin ${coinAddress} (${chain}):`);
        comments.forEach((item: any, idx: number) => {
          const comment = item.node;
          // Assume comment.timestamp is either seconds or ISO string
          let readableDate = '';
          if (typeof comment.timestamp === 'number') {
            readableDate = new Date(comment.timestamp * 1000).toLocaleString();
          } else if (typeof comment.timestamp === 'string') {
            readableDate = new Date(comment.timestamp).toLocaleString();
          }
          lines.push(`${idx + 1}. ${comment.comment}`);
          lines.push(`   User: ${comment.userAddress}`);
          lines.push(`   Handle: ${comment.userProfile?.handle ?? 'N/A'}`);
          lines.push(`   At: ${readableDate}`);
          lines.push('-----------------------------------');
        });
        if (pageInfo?.endCursor) {
          lines.push(`Next page cursor: ${pageInfo.endCursor}`);
        }
        setMessages(prev => [...prev, lines.join('\n')]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'ai assistant']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setLoadingToolCalls(prev => [...prev, []]);
        return;
      }
    } catch (err) {
      console.error(err);
    } finally {
      // clear loading for this call
      setLoadingToolCalls(prev => {
        const arr = prev.map(inner => [...inner]);
        if (arr[msgIdx]) arr[msgIdx][callIdx] = false;
        return arr;
      });
      // mark responded to hide buttons
      setRespondedToolCalls(prev => {
        const arr = prev.map(inner => [...inner]);
        if (arr[msgIdx]) arr[msgIdx][callIdx] = true;
        return arr;
      });
    }
  };

  const handleReject = (msgIdx: number, callIdx: number) => {
    setRespondedToolCalls(prev => {
      const arr = prev.map(inner => [...inner]);
      if (arr[msgIdx]) arr[msgIdx][callIdx] = true;
      return arr;
    });
    const tc = toolCalls[msgIdx]?.[callIdx]; if (!tc) return;
    const aiMsg = `Tool call ${tc.function?.name || tc.name} was rejected.`;
    setMessages(prev => [...prev, aiMsg]);
    setMessageRoles(prev => [...prev, 'assistant']);
    setMessageToolCallIds(prev => [...prev, '']);
    setIsUserMessage(prev => [...prev, false]);
    setUsernames(prev => [...prev, 'ai assistant']);
    setDates(prev => [...prev, formatDate(new Date())]);
    setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
    // keep arrays aligned
    setToolCalls(prev => [...prev, []]);
    setRespondedToolCalls(prev => [...prev, []]);
  };

  // Define options for the combobox
  const menuOptions = [
    {
      value: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      label: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      badge: "together.xyz",
    },
    {
      value: "mistralai/mistral-small-3.1-24b-instruct:free",
      label: "mistralai/mistral-small-3.1-24b-instruct:free",
      badge: "openrouter.ai",
    },
    {
      value: "learnlm-2.0-flash-experimental",
      label: "learnlm-2.0-flash-experimental",
      badge: "gemini",
    },
    {
      value: "learnlm-1.5-pro-experimental",
      label: "learnlm-1.5-pro-experimental",
      badge: "gemini",
    },
    {
      value: "gemini-1.5-flash-8b",
      label: "gemini-1.5-flash-8b",
      badge: "gemini",
    },
    {
      value: "gemini-1.5-flash",
      label: "gemini-1.5-flash",
      badge: "gemini",
    },
    {
      value: "gemini-1.5-pro",
      label: "gemini-1.5-pro",
      badge: "gemini",
    },
    {
      value: "gemini-2.0-flash-lite",
      label: "gemini-2.0-flash-lite",
      badge: "gemini",
    },
    {
      value: "gemini-2.0-flash",
      label: "gemini-2.0-flash",
      badge: "gemini",
    },
    {
      value: "gemini-2.5-flash-preview-04-17",
      label: "gemini-2.5-flash-preview-04-17",
      badge: "gemini",
    },
    {
      value: "gemini-2.5-pro-preview-03-25",
      label: "gemini-2.5-pro-preview-03-25",
      badge: "gemini",
    }
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted">
       {toastError && (
         <div className="fixed top-4 right-4 z-50 max-w-md">
           <div className="bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg flex items-center">
             <span className="flex-1">{toastError}</span>
             <button className="ml-4 text-destructive-foreground" onClick={() => setToastError(null)}>×</button>
           </div>
         </div>
       )}
      <Card className="w-full max-w-3xl h-[80vh] flex flex-col mx-auto my-auto">
        <CardHeader className="flex flex-col p-4 border-b">
          <div className="flex flex-row items-center justify-between w-full">
            <CardTitle>AI Custodial Chat</CardTitle>
            <ConnectButton />
          </div>
          <div className="flex justify-end w-full mt-2">
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-[350px] justify-between"
                >
                  {comboboxValue
                    ? menuOptions.find((option) => option.value === comboboxValue)?.label
                    : "Select AI model"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput placeholder="Search option..." />
                  <CommandList>
                    <CommandEmpty>No option found.</CommandEmpty>
                    <CommandGroup>
                      {menuOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={(currentValue) => {
                            setComboboxValue(currentValue === comboboxValue ? "" : currentValue);
                            setComboboxOpen(false);
                            // Add any side effect on select here, e.g., navigation
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              comboboxValue === option.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate flex-1">{option.label}</span>
                          {option.badge && (
                            <Badge variant="outline" className="ml-2">{option.badge}</Badge>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-0 overflow-hidden">
          <ScrollArea className="h-full w-full p-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Start chatting...
              </div>
            ) : (
              messages.map((msg, idx) => {
                const role = messageRoles[idx];
                const isUser = role === 'user';
                const isTool = role === 'tool';
                const isAssistant = role === 'assistant';
                const calls = toolCalls[idx] || [];

                if (isAssistant) {
                  // Render Assistant message with potential tool calls
                  return (
                    <div key={idx} className={`mb-4 flex items-start gap-3 justify-start`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                       <div className={`flex flex-col max-w-[75%] items-start`}>
                         <span className="text-xs text-muted-foreground mb-1">Assistant</span>
                         {/* Only render the message bubble if msg exists */}
                         {msg && (
                           <div className={`rounded-lg px-3 py-2 bg-muted relative`}>
                             <div className="prose prose-sm max-w-none text-sm dark:prose-invert"><ReactMarkdown>{msg}</ReactMarkdown></div>
                             <div className="mt-2">
                               <span className="text-xs text-muted-foreground block text-right">{dates[idx]} {timestamps[idx]}</span>
                             </div>
                           </div>
                         )}
                         {calls.length > 0 && (
                           <div className="mt-2 space-y-2 w-full">
                             {calls.map((call: any, callIdx: number) => (
                               <Card key={callIdx} className={`bg-background border rounded-md p-3 ${respondedToolCalls[idx]?.[callIdx] ? 'opacity-50' : ''}`}>
                                 <p className="text-xs font-semibold mb-1">Tool Call: <code className="text-xs bg-secondary px-1 rounded">{call.function.name}</code></p>
                                 <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                   {JSON.stringify(JSON.parse(call.function.arguments), null, 2)}
                                 </pre>
                                 {!respondedToolCalls[idx]?.[callIdx] && (
                                   <div className="mt-2 flex gap-2 justify-end">
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => handleReject(idx, callIdx)}
                                       disabled={loadingToolCalls[idx]?.[callIdx]}
                                     >
                                       Reject
                                     </Button>
                                     <Button
                                       size="sm"
                                       onClick={() => handleAccept(idx, callIdx)}
                                       disabled={loadingToolCalls[idx]?.[callIdx]}
                                     >
                                       {loadingToolCalls[idx]?.[callIdx] ? 'Processing...' : 'Accept'}
                                     </Button>
                                   </div>
                                 )}
                               </Card>
                             ))}
                           </div>
                         )}
                       </div>
                     </div>
                   );
                } else if (isTool) {
                  // Render Tool Result message
                  return (
                    <div key={idx} className={`mb-4 flex items-start gap-3 justify-start`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div className={`flex flex-col max-w-[75%] items-start`}>
                        <span className="text-xs text-muted-foreground mb-1">Tool Result</span>
                        <div className="rounded-lg px-3 py-2 bg-secondary text-secondary-foreground shadow-sm">
                          <p className="text-xs font-semibold mb-1">({messageToolCallIds[idx]?.substring(0, 8) || 'N/A'})</p>
                          <pre className="whitespace-pre-wrap break-all text-xs">{msg}</pre>
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground block text-right">{dates[idx]} {timestamps[idx]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (isUser) {
                   // Render User message
                  return (
                    <div key={idx} className={`mb-4 flex items-start gap-3 justify-end`}>
                      <div className={`flex flex-col max-w-[75%] items-end`}>
                        <span className="text-xs text-muted-foreground mb-1">{usernames[idx]}</span>
                        <div className={`rounded-lg px-3 py-2 bg-primary text-primary-foreground`}>
                          <p className="text-sm">{msg}</p>
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground block text-right">{dates[idx]} {timestamps[idx]}</span>
                          </div>
                        </div>
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{usernames[idx]?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                    </div>
                  );
                } else {
                  // Fallback or handle other roles if any
                  return null;
                }
              })
            )}
            <div ref={chatEndRef} />
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t">
          <div className="flex w-full items-center space-x-2">
            <Input
              id="message"
              placeholder="Type your message..."
              className="flex-1"
              autoComplete="off"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={loading || !chatInput.trim()}>
              {loading ? (
                <svg
                  className="animate-spin h-4 w-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : null}
              Send
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
