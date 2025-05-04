"use client";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/navigation';
import { useAccount,useChainId, useConfig, useSwitchChain,useWriteContract } from 'wagmi';
import { formatEther, parseEther, zeroAddress, parseUnits, formatUnits, keccak256, encodePacked, toHex, maxUint256 } from 'viem'
import type { Address } from 'viem';
import { getPublicClient } from 'wagmi/actions'
import { getCoinsTopGainers,getProfileBalances,getCoin,getCoinComments,simulateBuy,tradeCoinCall } from "@zoralabs/coins-sdk";
import { coinABI } from "@zoralabs/coins";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback} from "@/components/ui/avatar";
import { Check, ChevronsUpDown, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, RefreshCcw } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { createCoinCall,getCoinCreateFromLogs } from "@zoralabs/coins-sdk";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getTransactionReceipt } from '@wagmi/core';
export default function Home() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [messageRoles, setMessageRoles] = useState<('user'|'assistant'|'tool')[]>([]);
  const [messageToolCallIds, setMessageToolCallIds] = useState<string[]>([]);
  const [messageStructuredData, setMessageStructuredData] = useState<(any | null)[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isUserMessage, setIsUserMessage] = useState<boolean[]>([]);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<boolean[]>([]);
  const [createCancelled, setCreateCancelled] = useState<boolean[]>([]);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<number,string>>({});
  const [descValues, setDescValues] = useState<Record<number,string>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [toolCalls, setToolCalls] = useState<any[][]>([]);
  const [respondedToolCalls, setRespondedToolCalls] = useState<boolean[][]>([]);
  const [loadingToolCalls, setLoadingToolCalls] = useState<boolean[][]>([]);
  const [paginationLoadingIdx, setPaginationLoadingIdx] = useState<number | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [comboboxValue, setComboboxValue] = useState("");
  const [tokens, setTokens] = useState([
    { name: 'Token A', address: '0xabc123...', amount: 100 },
    { name: 'Token B', address: '0xdef456...', amount: 250 },
    { name: 'Token C', address: '0xghi789...', amount: 50 },
  ]);
  const [sortAsc, setSortAsc] = useState(true);
  const sortedTokens = [...tokens].sort((a, b) => sortAsc ? a.amount - b.amount : b.amount - a.amount);
  const [selectedChain, setSelectedChain] = useState<string>("8453");
  const [transactions, setTransactions] = useState<{ txHash: string; address: string; chainId: string; date: string; }[]>([]);
  const [createCoinTxs, setCreateCoinTxs] = useState<{ txHash: string; address: string; metadataId: string; date: string; }[]>([]);
  const { address, isConnected } = useAccount();
  const chainId = useChainId()
  const chatEndRef = useRef<HTMLDivElement>(null);
  const config = useConfig()
  const chain = config.chains.find((c) => c.id === chainId)
  const publicClient = getPublicClient(config, { chainId })
  const { switchChain } = useSwitchChain()
  const { writeContractAsync } = useWriteContract(); 

 
 

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

  interface StructuredMessageData {
    type: string;
    data: any[];
    pageCursors: (string | null | undefined)[];
    currentPage: number;
    startIndex: number;
  }

  const handlePageChange = async (messageIndex: number, direction: 'next' | 'prev') => {
    const sd = messageStructuredData[messageIndex];
    if (!sd) return;
    if (sd.type === 'get_coin_top_gainers') {
      const perPage = 10;
      let targetCursor: string | null | undefined;
      let newPage = sd.currentPage;
      if (direction === 'next') {
        targetCursor = sd.pageCursors[sd.currentPage];
        if (!targetCursor) return;
        newPage++;
      } else {
        if (sd.currentPage <= 1) return;
        targetCursor = sd.pageCursors[sd.currentPage - 2];
        newPage--;
      }
      setPaginationLoadingIdx(messageIndex);
      const toastId = toast.loading(`Loading page ${newPage}...`);
      try {
        const response = await getCoinsTopGainers({ 
          count: 10,        // Number of coins per page
          after: targetCursor ?? undefined 
        });
        const newCoins = response.data?.exploreList?.edges.map((edge: any) => edge.node) || [];
        const newCursor = response.data?.exploreList?.pageInfo?.endCursor;
        setMessageStructuredData(prev => {
          const arr = [...prev];
          const entry = arr[messageIndex];
          if (entry && entry.type === 'get_coin_top_gainers') {
            if (direction === 'next') entry.pageCursors = [...entry.pageCursors, newCursor];
            entry.data = newCoins;
            entry.currentPage = newPage;
            entry.startIndex = (newPage - 1) * perPage;
          }
          arr[messageIndex] = entry;
          return arr;
        });
        toast.success(`Page ${newPage} loaded.`, { id: toastId });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error fetching page', { id: toastId });
      } finally {
        setPaginationLoadingIdx(null);
      }
    } else if (sd.type === 'get_coin_comment') {
      let targetCursor: string | null | undefined;
      let newPage = sd.currentPage;
      if (direction === 'next') {
        targetCursor = sd.pageCursors[sd.currentPage]; if (!targetCursor) return; newPage++;
      } else {
        if (sd.currentPage <= 1) return; targetCursor = sd.pageCursors[sd.currentPage - 2]; newPage--;
      }
      setPaginationLoadingIdx(messageIndex);
      const toastId = toast.loading(`Loading comments page ${newPage}...`);
      try {
        const response = await getCoinComments({ address: sd.coinAddress, chain: sd.chain, after: targetCursor ?? undefined });
        const comments = response.data?.zora20Token?.zoraComments?.edges.map((edge: any) => edge.node) || [];
        const pageInfo2 = response.data?.zora20Token?.zoraComments?.pageInfo;
        const commentData2 = comments.map((c: any) => {
          let readableDate = '';
          if (typeof c.timestamp === 'number') readableDate = new Date(c.timestamp * 1000).toLocaleString();
          else if (typeof c.timestamp === 'string') readableDate = new Date(c.timestamp).toLocaleString();
          return { comment: c.comment, userAddress: c.userAddress, handle: c.userProfile?.handle ?? 'N/A', readableDate };
        });
        setMessageStructuredData(prev => {
          const arr = [...prev]; const entry = arr[messageIndex];
          if (entry && entry.type === 'get_coin_comment') {
            if (direction === 'next') entry.pageCursors = [...entry.pageCursors, pageInfo2?.endCursor];
            entry.data = commentData2; entry.currentPage = newPage; entry.startIndex = (newPage - 1) * 10;
          }
          arr[messageIndex] = entry; return arr;
        });
        toast.success(`Comments page ${newPage} loaded.`, { id: toastId });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error fetching comments', { id: toastId });
      } finally {
        setPaginationLoadingIdx(null);
      }
    } else { return; }
  };

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, userMsg]);
    setMessageRoles(prev => [...prev, 'user']);
    setMessageToolCallIds(prev => [...prev, '']);
    setIsUserMessage(prev => [...prev, true]);
    setUsernames(prev => [...prev, address ? truncateMiddle(address) : 'Anonymous']);
    setDates(prev => [...prev, formatDate(new Date())]);
    setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
    setToolCalls(prev => [...prev, []]);
    setRespondedToolCalls(prev => [...prev, []]);
    setMessageStructuredData(prev => [...prev, null]); 
    setLoading(true);
    try {
      const payloadMessages = messages
        .map((m, i) => {
          if (messageRoles[i] === 'tool') {
            return { role: 'tool', tool_call_id: messageToolCallIds[i], content: m };
          }
          return { role: messageRoles[i], content: m };
        })
        .filter(msg => msg.content != null);
      payloadMessages.push({ role: 'user', content: userMsg });
      const selectedModel = comboboxValue || menuOptions[0].value;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages, modelName: selectedModel }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        toast.error(errJson.error || 'Server error');
        return;
      }
      const { content: aiContent, tool_calls } = await res.json();
      setMessages(prev => [...prev, aiContent]);
      setMessageRoles(prev => [...prev, 'assistant']);
      setMessageToolCallIds(prev => [...prev, tool_calls?.[0]?.id || '']);
      setIsUserMessage(prev => [...prev, false]);
      setUsernames(prev => [...prev, 'AI']);
      setDates(prev => [...prev, formatDate(new Date())]);
      setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
      setToolCalls(prev => [...prev, tool_calls || []]);
      setRespondedToolCalls(prev => [...prev, (tool_calls || []).map(() => false)]);
      setLoadingToolCalls(prev => [...prev, (tool_calls || []).map(() => false)]);
      setMessageStructuredData(prev => [...prev, null]); 
    } catch (error) {
      console.error('Error fetching AI response:', error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (msgIdx: number, callIdx: number) => {
    setLoadingToolCalls(prev => {
      const copy = [...prev];
      if (!copy[msgIdx]) copy[msgIdx] = [];
      while (copy[msgIdx].length <= callIdx) {
        copy[msgIdx].push(false);
      }
      copy[msgIdx][callIdx] = true;
      return copy;
    });

    const tc = toolCalls[msgIdx]?.[callIdx];
    if (!tc) {
      setLoadingToolCalls(prev => {
        const copy = [...prev];
        if (copy[msgIdx]) copy[msgIdx][callIdx] = false;
        return copy;
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
          toast.error('Please connect to a wallet first');
          return;
        }
        switchChain({ chainId: chainName === 'base' ? 8453 : 84532 })
        const aiMsg = `Switched to ${chainName}.`;
        setMessages(prev => [...prev, aiMsg]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'AI']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setMessageStructuredData(prev => [...prev, null]); 
      } else if (toolName === 'current_chain') {
  
        const aiMsg = `Current chain is ${chain?.name} (Chain ID: ${chain?.id})`;
        setMessages(prev => [...prev, aiMsg]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'AI']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setMessageStructuredData(prev => [...prev, null]); 
      } else if (toolName === 'check_address') {
        if (!isConnected) {
          toast.error('Please connect to a wallet first');
          return;
        }
        const aiMsg = address ? `Connected address: ${address}` : 'No address available';
        setMessages(prev => [...prev, aiMsg]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'AI']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setMessageStructuredData(prev => [...prev, null]); 
        setLoadingToolCalls(prev => [...prev, []]);
      } else if (toolName === 'check_balance') {
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const addressParam = args.address || address;
        const nextPage = args.next_page;
        const balance = await getBalance(addressParam);
        const response = await getProfileBalances({
          identifier: addressParam, 
          count: 20,        
          after: nextPage, 
          chainIds: [chainId]
        });
       
        const profile: any = response.data?.profile;
        const pageInfo = profile.coinBalances?.pageInfo;
        const lines: string[] = [];
        let balanceData: any[] = [];
        balanceData=response.data?.profile?.coinBalances?.edges.map((edge: any) => edge.node) || [];
        const display = lines.join('\n');
        setMessages(prev => [...prev, display]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'AI']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setMessageStructuredData(prev => [...prev, {
          type: 'check_balance',
          data: balanceData,
          nextCursor: pageInfo?.endCursor,
          walletAddress: addressParam,
          ethBalance: balance,
        }]);
      } else if (toolName === 'get_coin_top_gainers') {
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const nextPage = args.next_page;
        if (chainId!==8453) {
          toast.error('Please switch to base first');
          return;
        }
        let response;
        try {
          response = await getCoinsTopGainers({ 
            count: 10,        // Number of coins per page
            after: nextPage ?? undefined 
          });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Error fetching top gainers');
          return;
        }
        const coins = response.data?.exploreList?.edges.map((edge: any) => edge.node) || [];
        const nextPageCursor = response.data?.exploreList?.pageInfo?.endCursor;

        setMessageStructuredData(prev => [
          ...prev,
          {
            type: 'get_coin_top_gainers',
            data: coins,
            pageCursors: [undefined, nextPageCursor],
            currentPage: 1,
            startIndex: 0
          }
        ]);

        setMessages(prev => [...prev, '']);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id || '']);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'AI']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, [tc]]);
        setRespondedToolCalls(prev => [...prev, [false]]);
        setLoadingToolCalls(prev => [...prev, [false]]);
      } else if (toolName === 'check_coin') {
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const coinAddress = args.address;
        const chain = args.chainId || 'base';
        const nextPage = args.next_page;
        let response;
        try {
          response = await getCoin({
            address: coinAddress,
            chain: chainId,
          });
        } catch (err) {
          toast.error('Failed to fetch coin details');
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
          setMessageRoles(prev => [...prev, 'assistant']);
          setMessageToolCallIds(prev => [...prev, '']);
          setIsUserMessage(prev => [...prev, false]);
          setUsernames(prev => [...prev, 'AI']);
          setDates(prev => [...prev, formatDate(new Date())]);
          setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
          setToolCalls(prev => [...prev, []]);
          setRespondedToolCalls(prev => [...prev, []]);
          setMessageStructuredData(prev => [...prev, null]); 
        } else {
          const lines: string[] = [];
          lines.push(`- **Coin:** ${coin.name} (${coin.symbol})`);
          lines.push(`- **Address:** ${coin.address}`);
          lines.push(`- **Chain:** ${coin.chainId===84532?'Base Sepolia':'Base'}`);
          if (coin.description) lines.push(`- **Description:** ${coin.description}`);
          lines.push(`- **Total Supply:** ${coin.totalSupply ?? 'N/A'}`);
          lines.push(`- **Market Cap:** ${coin.marketCap ?? 'N/A'}`);
          lines.push(`- **24h Volume:** ${coin.volume24h ?? 'N/A'}`);
          lines.push(`- **Owner:** ${coin.creatorAddress ?? 'N/A'}`);
          lines.push(`- **Created At:** ${coin.createdAt ?? 'N/A'}`);
          lines.push(`- **Unique Holders:** ${coin.uniqueHolders ?? 'N/A'}`);
          if (coin.mediaContent?.previewImage) {
            lines.push(`![Preview Image](${coin.mediaContent.previewImage.small})`);
          }
          setMessages(prev => [...prev, lines.join('\n')]);
          setMessageRoles(prev => [...prev, 'assistant']);
          setMessageToolCallIds(prev => [...prev, '']);
          setIsUserMessage(prev => [...prev, false]);
          setUsernames(prev => [...prev, 'AI']);
          setDates(prev => [...prev, formatDate(new Date())]);
          setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
          setToolCalls(prev => [...prev, []]);
          setRespondedToolCalls(prev => [...prev, []]);
          setMessageStructuredData(prev => [...prev, null]); 
        }
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
          toast.error('Failed to fetch coin comments');
          setLoadingToolCalls(prev => {
            const arr = prev.map(inner => [...inner]);
            if (arr[msgIdx]) arr[msgIdx][callIdx] = false;
            return arr;
          });
          return;
        }
        const comments = response.data?.zora20Token?.zoraComments?.edges || [];
        const pageInfo = response.data?.zora20Token?.zoraComments?.pageInfo;
        const commentData = comments.map((item: any) => {
          const c = item.node;
          let readableDate = '';
          if (typeof c.timestamp === 'number') readableDate = new Date(c.timestamp * 1000).toLocaleString();
          else if (typeof c.timestamp === 'string') readableDate = new Date(c.timestamp).toLocaleString();
          return {
            comment: c.comment,
            userAddress: c.userAddress,
            handle: c.userProfile?.handle ?? 'N/A',
            readableDate,
          };
        });
        setMessageStructuredData(prev => [...prev, {
          type: 'get_coin_comment',
          coinAddress,
          chain: chain === 'base' ? 8453 : 84532,
          data: commentData,
          pageCursors: [undefined, pageInfo?.endCursor],
          currentPage: 1,
          startIndex: 0,
        }]);
        setMessages(prev => [...prev, '']);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'AI']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setLoadingToolCalls(prev => [...prev, []]);
        return;
      } else if (toolName === 'create_coin') {
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const { name, symbol,description,imageUrl } = args;
        setMessages(prev => [...prev, `Coin created: ${name} (${symbol})`]);
        setMessageRoles(prev => [...prev, 'tool']);
        setMessageToolCallIds(prev => [...prev, tc.id]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'AI']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
        setMessageStructuredData(prev => [...prev, { type: 'create_coin', data: { name, symbol,description,imageUrl } }]);
        setLoadingToolCalls(prev => [...prev, []]);
        return;
      } else if (toolName === 'check_coin_address') {
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const { transaction } = args;
        try {
          const receipt = await getTransactionReceipt(config, { hash: transaction });
          const coinDeployment = getCoinCreateFromLogs(receipt);
          const coinAddress = coinDeployment?.coin;
          const msg = `Transaction: ${transaction}\nCoin Address: ${coinAddress}`;
          setMessages(prev => [...prev, msg]);
          setMessageRoles(prev => [...prev, 'tool']);
          setMessageToolCallIds(prev => [...prev, tc.id]);
          setIsUserMessage(prev => [...prev, false]);
          setUsernames(prev => [...prev, 'AI']);
          setDates(prev => [...prev, formatDate(new Date())]);
          setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
          setToolCalls(prev => [...prev, []]);
          setRespondedToolCalls(prev => [...prev, []]);
          setMessageStructuredData(prev => [...prev, { type: 'check_coin_address', data: { transaction, coinAddress } }]);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to check coin address');
        }
        setLoadingToolCalls(prev => [...prev, []]);
        return;
      }  else if (toolName === 'trade') {
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const direction = args.direction;
        const coinAddress = args.address;
        const amount = args.amount;

        try {
          let contractCallParams;
          let tx: string | undefined;
          let aiMsg: string;

          if (direction === 'buy') {
            const tradeParams = {
              direction,
              target: coinAddress as Address,
              args: {
                recipient: address as Address,
                orderSize: parseEther(String(amount)), // Buy is with ETH, so parseEther is fine
                minAmountOut: 0n,
              }
            };
            contractCallParams = tradeCoinCall(tradeParams);
            tx = await writeContractAsync({
              ...contractCallParams,
              gas: 23000n // Hardcoded gas limit based on error
            });
            aiMsg = `Executed buy: ${amount} ETH of ${coinAddress}. TX: ${tx}`;

          } else if (direction === 'sell') {
           

            const tradeParams = {
              direction,
              target: coinAddress as Address,
              args: {
                recipient: address as Address,
                orderSize: parseEther(String(amount)), // Use fetched decimals
                minAmountOut: parseEther('0.1'),
              }
            };
            contractCallParams = tradeCoinCall(tradeParams);
            tx = await writeContractAsync({
              ...contractCallParams,
              gas: 23000n // Hardcoded gas limit based on error
            });
            aiMsg = `Executed sell: ${amount} of ${coinAddress}. TX: ${tx}`;
          } else {
            toast.error("Invalid trade direction.");
            setLoadingToolCalls(prev => {
              const copy = [...prev];
              if (copy[msgIdx]) copy[msgIdx][callIdx] = false;
              return copy;
            });
            return;
          }

          setMessages(prev => [...prev, aiMsg]);
          setMessageRoles(prev => [...prev, 'tool']);
          setMessageToolCallIds(prev => [...prev, tc.id || '']);
          setIsUserMessage(prev => [...prev, false]);
          setUsernames(prev => [...prev, 'AI']);
          setDates(prev => [...prev, formatDate(new Date())]);
          setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
          setToolCalls(prev => [...prev, []]);
          setRespondedToolCalls(prev => [...prev, []]);
          setMessageStructuredData(prev => [...prev, null]);
        } catch (err) {
          toast.error(`Error executing trade: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error("Error handling tool call:", error);
    } finally {
      setLoadingToolCalls(prev => {
        const copy = [...prev];
        if (copy[msgIdx]) copy[msgIdx][callIdx] = false;
        return copy;
      });
      
      setRespondedToolCalls(prev => {
        const arr = prev.map(inner => [...inner]);
        if (arr[msgIdx]) arr[msgIdx][callIdx] = true;
        return arr;
      });
    }
  };

  const handleReject = (msgIdx: number, callIdx: number) => {
    setLoadingToolCalls(prev => {
      const copy = [...prev];
      if (!copy[msgIdx]) copy[msgIdx] = [];
      while (copy[msgIdx].length <= callIdx) {
        copy[msgIdx].push(false);
      }
      copy[msgIdx][callIdx] = true;
      return copy;
    });
    
    const tc = toolCalls[msgIdx]?.[callIdx]; 
    if (!tc) {
      setLoadingToolCalls(prev => {
        const copy = [...prev];
        if (copy[msgIdx]) copy[msgIdx][callIdx] = false;
        return copy;
      });
      return;
    }
    
    setTimeout(() => {
      const aiMsg = `Tool call ${tc.function?.name || tc.name} was rejected.`;
      setMessages(prev => [...prev, aiMsg]);
      setMessageRoles(prev => [...prev, 'assistant']);
      setMessageToolCallIds(prev => [...prev, '']);
      setIsUserMessage(prev => [...prev, false]);
      setUsernames(prev => [...prev, 'AI']);
      setDates(prev => [...prev, formatDate(new Date())]);
      setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
      setToolCalls(prev => [...prev, []]);
      setRespondedToolCalls(prev => [...prev, []]);
      setMessageStructuredData(prev => [...prev, null]); 
      
      setLoadingToolCalls(prev => {
        const copy = [...prev];
        if (copy[msgIdx]) copy[msgIdx][callIdx] = false;
        return copy;
      });
      
      setRespondedToolCalls(prev => {
        const arr = prev.map(inner => [...inner]);
        if (arr[msgIdx]) arr[msgIdx][callIdx] = true;
        return arr;
      });
    }, 300); 
  };

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
    <main className="flex min-h-screen items-start justify-center gap-8 p-6 bg-muted">
      <div className="flex flex-col gap-6 h-[80vh]">
        {/* <Card className="w-full max-w-md flex flex-col flex-1 overflow-hidden">
          <CardHeader className="flex flex-col p-4 border-b">
            <CardTitle>transaction history</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto">
            <div className="mb-4 flex items-center gap-2">
              <label htmlFor="chain-select" className="block text-sm font-medium mb-2">
                Chain
              </label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8453">Base</SelectItem>
                  <SelectItem value="84532">Base Sepolia</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" title="reload data" onClick={async () => {
                try {
                  const res = await fetch(`/api/read-data?collection=transactions&chainId=${selectedChain}&address=${address}`);
                  const json = await res.json();
                  if (json.success) setTransactions(json.results);
                  else toast.error(json.error || 'Failed to load');
                } catch (err) { toast.error('Error fetching'); }
              }}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>txHash</TableHead>
                  <TableHead>address</TableHead>
                  <TableHead>date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="cursor-pointer" onClick={() => { navigator.clipboard.writeText(tx.txHash); toast.success('Transaction hash copied to clipboard'); }}>{`${tx.txHash.substring(0, 6)}...${tx.txHash.substring(tx.txHash.length - 4)}`}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => { navigator.clipboard.writeText(tx.address); toast.success('Address copied to clipboard'); }}>{`${tx.address.substring(0, 6)}...${tx.address.substring(tx.address.length - 4)}`}</TableCell>
                    <TableCell>{new Date(tx.date).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card> */}
        <Card className="w-full max-w-md flex flex-col flex-1 overflow-hidden">
          <CardHeader className="flex flex-col p-4 border-b">
            <CardTitle>list of token you created</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto">
            <div className="mb-4 flex items-center gap-2">
              <label htmlFor="chain-select" className="block text-sm font-medium mb-2">
                Chain
              </label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8453">Base</SelectItem>
                  <SelectItem value="84532">Base Sepolia</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" title="reload data" onClick={async () => {
                try {
                  const res = await fetch(`/api/read-data?collection=create_coins_transactions&chainId=${selectedChain}&address=${address}`);
                  const json = await res.json();
                  if (json.success) setCreateCoinTxs(json.results);
                  else toast.error(json.error || 'Failed to load');
                } catch (err) { toast.error('Error fetching'); }
              }}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>txHash</TableHead>
                  <TableHead>address</TableHead>
                  <TableHead>metadataId</TableHead>
                  <TableHead>date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {createCoinTxs.map((tx, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="cursor-pointer" onClick={() => { navigator.clipboard.writeText(tx.txHash); toast.success('Transaction hash copied to clipboard'); }}>{`${tx.txHash.substring(0, 6)}...${tx.txHash.substring(tx.txHash.length - 4)}`}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => { navigator.clipboard.writeText(tx.address); toast.success('Address copied to clipboard'); }}>{`${tx.address.substring(0, 6)}...${tx.address.substring(tx.address.length - 4)}`}</TableCell>
                    <TableCell>{tx.metadataId}</TableCell>
                    <TableCell>{new Date(tx.date).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card className="w-full max-w-3xl h-[80vh] flex flex-col">
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
                    ? menuOptions.find(o => o.value === comboboxValue)?.label
                    : menuOptions[0]?.label}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput placeholder="Search option..." />
                  <CommandList>
                    <CommandEmpty>No option found.</CommandEmpty>
                    <CommandGroup>
                      {menuOptions.map(option => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={currentValue => {
                            setComboboxValue(currentValue === comboboxValue ? "" : currentValue);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", comboboxValue === option.value ? "opacity-100" : "opacity-0")} />
                          <span className="truncate flex-1">{option.label}</span>
                          {option.badge && <Badge variant="outline" className="ml-2">{option.badge}</Badge>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 overflow-hidden">
          <ScrollArea className="h-full pr-4">
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
                const sd = messageStructuredData[idx];

                if (isAssistant) {
                  return (
                    <div key={idx} className={`mb-4 flex items-start gap-3 justify-start`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                       <div className={`flex flex-col max-w-[60%] items-start`}>
                         <span className="text-xs text-muted-foreground mb-1">Assistant</span>
                         {msg && (
                           <div className={`rounded-lg px-3 py-2 bg-muted relative max-w-full`}>
                             <div className="prose prose-sm max-w-none text-sm dark:prose-invert break-words whitespace-pre-wrap overflow-wrap-anywhere"><ReactMarkdown>{msg}</ReactMarkdown></div>
                             <div className="mt-2">
                               <span className="text-xs text-muted-foreground block text-right">{dates[idx]} {timestamps[idx]}</span>
                             </div>
                           </div>
                         )}
                         {calls.length > 0 && (
                           <div className="mt-2 space-y-2 w-full">
                             {calls.map((call: any, callIdx: number) => (
                               <Card key={callIdx} className={`bg-background border rounded-md p-3 ${respondedToolCalls[idx]?.[callIdx] ? 'opacity-50' : ''}`}>
                                 <p className="text-xs font-semibold mb-1">
                                   {call.function.name || call.name} ({messageToolCallIds[idx]?.substring(0, 8) || 'N/A'})
                                   {sd?.type === 'check_balance' && <span className="ml-2 text-green-500">✓</span>}
                                 </p>
                                 <div className="max-w-[300px] overflow-x-auto">
                                   <pre className="text-xs bg-muted p-2 rounded whitespace-pre overflow-x-auto">
                                     {JSON.stringify(call.function.arguments ? JSON.parse(call.function.arguments) : {}, null, 2)}
                                   </pre>
                                 </div>
                                 {!respondedToolCalls[idx]?.[callIdx] && (
                                   <div className="mt-2 flex gap-2 justify-end">
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => handleReject(idx, callIdx)}
                                       disabled={loadingToolCalls[idx]?.[callIdx]}
                                     >
                                       {loadingToolCalls[idx]?.[callIdx] ? (
                                         <Loader2 className="h-4 w-4 animate-spin" />
                                       ) : 'Reject'}
                                     </Button>
                                     <Button
                                       size="sm"
                                       onClick={() => handleAccept(idx, callIdx)}
                                       disabled={loadingToolCalls[idx]?.[callIdx]}
                                     >
                                       {loadingToolCalls[idx]?.[callIdx] ? (
                                         <>
                                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                           Processing...
                                         </>
                                       ) : 'Accept'}
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
                  let toolName = '';
                  if (messageToolCallIds[idx]) {
                    for (let i = 0; i < idx; i++) {
                      if (messageRoles[i] === 'assistant') {
                        const calls = toolCalls[i] || [];
                        for (const call of calls) {
                          if (call.id === messageToolCallIds[idx]) {
                            toolName = call.function?.name || '';
                            break;
                          }
                        }
                      }
                    }
                  }
                  const structuredData = messageStructuredData[idx];

                  return (
                    <div key={idx} className={`mb-4 flex items-start gap-3 justify-start`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div className={`flex flex-col max-w-[60%] items-start`}>
                        <span className="text-xs text-muted-foreground mb-1">Tool Result</span>
                        <div className="rounded-lg px-3 py-2 bg-secondary text-secondary-foreground shadow-sm w-full max-w-full overflow-hidden">
                          <p className="text-xs font-semibold mb-1">
                            {toolName || 'Tool'} ({messageToolCallIds[idx]?.substring(0, 8) || 'N/A'})
                          </p>
                          {sd?.type === 'get_coin_comment' ? (
                            <>
                              <div className="mb-3 p-2 bg-muted rounded-md">
                                <p className="text-sm font-medium">Comments for {sd.coinAddress}</p>
                              </div>
                              <div className="w-full overflow-x-auto">
                                <Table className="w-full table-fixed">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[5%] text-center">#</TableHead>
                                      <TableHead className="w-[40%]">Comment</TableHead>
                                      <TableHead className="w-[35%] text-center">User</TableHead>
                                      <TableHead className="w-[20%] text-center">Date</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sd.data.length > 0 ? (
                                      sd.data.map((c: any, i: number) => (
                                        <TableRow key={i}>
                                          <TableCell className="text-center py-1">{sd.startIndex + i + 1}</TableCell>
                                          <TableCell className="truncate py-1 text-xs">{c.comment}</TableCell>
                                          <TableCell className="py-1">
                                            <div className="flex items-center">
                                              <span className="truncate font-mono text-xs mr-1">{c.userAddress}</span>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => {navigator.clipboard.writeText(c.userAddress); toast.success('Address copied');}}>
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            {c.handle !== 'N/A' && <div className="text-xs text-muted-foreground">@{c.handle}</div>}
                                          </TableCell>
                                          <TableCell className="text-center py-1 text-xs">{c.readableDate}</TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-center py-2">No comments.</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="mt-2 flex gap-2 justify-center">
                                {sd.currentPage > 1 && (
                                  <Button size="sm" onClick={() => handlePageChange(idx, 'prev')} disabled={paginationLoadingIdx===idx || sd.currentPage <= 1}>
                                    {paginationLoadingIdx===idx ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading</> : 'Previous'}
                                  </Button>
                                )}
                                {sd.pageCursors[sd.currentPage] && (
                                  <Button size="sm" onClick={() => handlePageChange(idx, 'next')} disabled={paginationLoadingIdx===idx || !sd.pageCursors[sd.currentPage]}>
                                    {paginationLoadingIdx===idx ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading</> : 'Next'}
                                  </Button>
                                )}
                              </div>
                            </>
                          ) : sd?.type === 'get_coin_top_gainers' ? (
                            <>
                              <div className="w-full overflow-x-auto">
                                <Table className="w-full table-fixed">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-center w-[5%]">#</TableHead>
                                      <TableHead className="text-center w-[15%]">Name</TableHead>
                                      <TableHead className="text-center w-[10%]">Holders</TableHead>
                                      <TableHead className="text-center w-[15%]">Market Cap</TableHead>
                                      <TableHead className="text-center w-[10%]">Volume</TableHead>
                                      <TableHead className="text-center w-[45%]">Addresses</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sd.data.length > 0 ? (
                                      sd.data.map((coin: any, coinIndex: number) => (
                                        <TableRow key={coin.address}>
                                          <TableCell className="text-center py-1">{sd.startIndex + coinIndex + 1}</TableCell>
                                          <TableCell className="text-center py-1 truncate text-xs">{coin.name} ({coin.symbol})</TableCell>
                                          <TableCell className="text-center py-1">{coin.uniqueHolders}</TableCell>
                                          <TableCell className="text-center py-1 truncate text-xs">{coin.marketCap}</TableCell>
                                          <TableCell className="text-center py-1 truncate text-xs">{coin.volume24h}</TableCell>
                                          <TableCell className="py-1">
                                            <div className="flex flex-col space-y-2">
                                              <div className="flex items-center">
                                                <span className="text-xs font-medium mr-1">Token:</span>
                                                <span className="truncate font-mono text-xs mr-1">{coin.address}</span>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => {navigator.clipboard.writeText(coin.address);toast.success('Token address copied');}}>
                                                  <Copy className="h-3 w-3" />
                                                </Button>
                                              </div>
                                              <div className="flex items-center">
                                                <span className="text-xs font-medium mr-1">Creator:</span>
                                                <span className="truncate font-mono text-xs mr-1">{coin.creatorAddress}</span>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => {navigator.clipboard.writeText(coin.creatorAddress);toast.success('Creator address copied');}}><Copy className="h-3 w-3"/></Button>
                                              </div>
                                            </div>
                                           </TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={6} className="text-center py-1">No results found.</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="mt-2 flex gap-2 justify-center">
                                {sd.currentPage > 1 && (
                                  <Button size="sm" onClick={() => handlePageChange(idx, 'prev')} disabled={paginationLoadingIdx===idx || sd.currentPage <= 1}>
                                    {paginationLoadingIdx===idx ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading</> : 'Previous'}
                                  </Button>
                                )}
                                {sd.pageCursors[sd.currentPage] && (
                                  <Button size="sm" onClick={() => handlePageChange(idx, 'next')} disabled={paginationLoadingIdx===idx || !sd.pageCursors[sd.currentPage]}>
                                    {paginationLoadingIdx===idx ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading</> : 'Next'}
                                  </Button>
                                )}
                              </div>
                            </>
                          ) : sd?.type === 'check_balance' ? (
                            <>
                              <div className="mb-3 p-2 bg-muted rounded-md">
                                <p className="text-sm font-medium">Wallet: <span className="font-mono">{sd.walletAddress}</span></p>
                                <p className="text-sm">ETH Balance: {sd.ethBalance} ETH</p>
                              </div>
                              <div className="w-full overflow-x-auto" style={{ maxWidth: '100%' }}>
                                <div className="grid grid-cols-3 gap-2 text-sm items-center bg-muted p-2 rounded-t-md">
                                  <div className="text-center font-medium">Name (Symbol)</div>
                                  <div className="text-center font-medium">Balance</div>
                                  <div className="text-center font-medium">Token Address</div>
                                </div>
                                {sd.data && sd.data.length > 0 ? (
                                  sd.data.map((bal:any, i:number)=>(
                                    <div key={i} className="grid grid-cols-3 gap-2 text-sm items-center border-b border-muted py-1">
                                      <div className="text-center py-2 truncate">{bal.coin.name} ({bal.coin.symbol})</div>
                                      <div className="text-center py-2">{parseFloat(formatUnits(BigInt(bal.balance), bal.coin.decimals)).toFixed(4)} {bal.coin.symbol}</div>
                                      <div className="text-center py-2 flex items-center justify-center">
                                        <span className="truncate font-mono text-xs mr-1">{bal.coin.address}</span>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1" onClick={()=>{navigator.clipboard.writeText(bal.coin.address);toast.success('Address copied');}}>
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                ): <div className="text-center py-2">No balances.</div>}
                              </div>
                            </>
                          ) : sd?.type === 'create_coin' ? (
                            createSuccess[idx] ? (
                              <div className="p-2 bg-muted rounded-md text-green-600 font-medium">
                                Congrats, your coin is created
                                {txHashes[idx] && <div className="mt-1 text-sm break-all">Tx: {txHashes[idx]}</div>}
                              </div>
                            ) : createCancelled[idx] ? (
                              <div className="p-2 bg-muted rounded-md text-red-600 font-medium">create coin cancelled</div>
                            ) : (
                                <form
                                  className="space-y-2 p-2 bg-muted rounded-md"
                                  onSubmit={async e => {
                                    e.preventDefault();
                                    setCreateSuccess(prev => { const arr = [...prev]; arr[idx] = false; return arr; });
                                    setCreateLoading(true);
                                    const formData = new FormData(e.currentTarget);
                                    const payload = {
                                      collection: 'metadata',
                                      data: {
                                        name: formData.get('name')?.toString() || '',
                                        symbol: formData.get('symbol')?.toString() || '',
                                        description: formData.get('description')?.toString() || '',
                                        payoutAddress: formData.get('payoutAddress')?.toString() as Address,
                                        platformAddress: formData.get('platformAddress')?.toString() as Address,
                                      },
                                    };
                                    try {
                                      const res = await fetch('/api/create-data', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(payload),
                                      });
                                      const created = await res.json();
                                      if (!res.ok || !created.success) {
                                        toast.error(created.error || 'Failed to create metadata');
                                        throw new Error('Failed to create metadata');
                                      }

                                      // Save the image using the metadata ID as the name
                                      const imageUrl = formData.get('imageUrl')?.toString() || '';
                                      if (imageUrl.startsWith('data:image')) {
                                        try {
                                          const matches = imageUrl.match(/^data:(image\/\w+);base64,(.*)$/);
                                          const base64Data = matches ? matches[2] : '';
                                          if (base64Data) {
                                            const saveImageRes = await fetch('/api/save-image', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ name: created.result.$loki, base64: base64Data }),
                                            });
                                            if (!saveImageRes.ok) {
                                              const saveErr = await saveImageRes.json();
                                              toast.error(`Failed to save image: ${saveErr.error || 'Unknown error'}`);
                                              // Decide if you want to throw error here or just warn
                                              console.error('Failed to save image:', saveErr);
                                            }
                                          }
                                        } catch (imgSaveError) {
                                          toast.error('Error saving image');
                                          console.error('Error saving image:', imgSaveError);
                                        }
                                      }

                                      // console.log(created)
                                      const coinParams = {
                                            name: formData.get('name')?.toString() || '',
                                            symbol: formData.get('symbol')?.toString() || '',
                                            uri: `${process.env.NEXT_PUBLIC_DOMAIN}/api/metadata/${created.result.$loki}`,
                                            payoutRecipient: formData.get('payoutAddress')?.toString() as Address,
                                            platformReferrer: formData.get('platformAddress')?.toString() as Address,
                                          };
                                          const contractCallParams = await createCoinCall(coinParams);
                                                                 
                                          
                                          const tx = await writeContractAsync({
                                            ...contractCallParams,
                                     
                                          });
                                          const res2 = await fetch('/api/create-data', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              collection: 'create_coins_transactions',
                                              data: {
                                                txHash: tx,
                                                address,
                                                chainId,
                                                metadataId: created.result.$loki,
                                                date: new Date().toISOString(),
                                              },
                                            }),
                                          });
                                          const res3 = await fetch('/api/create-data', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              collection: 'transactions',
                                              data: {
                                                txHash: tx,
                                                address,
                                                chainId,
                                                date: new Date().toISOString(),
                                              },
                                            }),
                                          });
                                          if(!res2.ok || !res3.ok){
                                            toast.error('Network error saving create coin transaction');
                                          
                                          }
                                          setTxHashes(prev => { const arr = [...prev]; arr[idx] = tx; return arr; });
                                          setCreateSuccess(prev => { const arr = [...prev]; arr[idx] = true; return arr; });
                                  } catch(e) {
                                    console.error(e);
                                    toast.error('Network error saving coin');
                                  } finally {
                                    setCreateLoading(false);
                                  }
                                }}
                              >
                                <div className="flex flex-col">
                                  <label className="text-xs mb-1">Name</label>
                                  <Input name="name" placeholder="Name" defaultValue={sd.data.name} />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-xs mb-1">Symbol</label>
                                  <Input name="symbol" placeholder="Symbol" defaultValue={sd.data.symbol} />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-xs mb-1">Image Preview</label>
                                  <img src={previewUrls[idx] ?? sd.data.imageUrl} alt="Image Preview" className="h-24 w-auto object-contain mb-2 rounded" />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-xs mb-1">Image URL</label>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      name="imageUrl"
                                      placeholder="Image URL"
                                      value={previewUrls[idx] ?? sd.data.imageUrl}
                                      onChange={e => {
                                        const url = e.currentTarget.value;
                                        setPreviewUrls(prev => ({ ...prev, [idx]: url }));
                                      }}
                                    />
                                    <div className="relative inline-block group">
                                      <Button type="button" onClick={async e => {
                                        e.preventDefault();
                                        const prompt = (descValues[idx] ?? sd.data.description ?? '').trim();
                                        if (!prompt) {
                                          toast.error('Description is required');
                                          return;
                                        }
                                        setImageLoading(prev => ({ ...prev, [idx]: true }));
                                        try {
                                          const res = await fetch('/api/generate-image', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ prompt }),
                                          });
                                          if (!res.ok) {
                                            toast.error('Error generating image');
                                            return;
                                          }
                                          const json = await res.json();
                                          if (json.images?.length) {
                                            const b64 = json.images[0];
                                            setPreviewUrls(prev => ({ ...prev, [idx]: `data:image/png;base64,${b64}` }));
                                          }
                                        } catch {
                                          toast.error('Error generating image');
                                        } finally {
                                          setImageLoading(prev => ({ ...prev, [idx]: false }));
                                        }
                                      }}>
                                        {imageLoading[idx] ? <Loader2 className="animate-spin h-4 w-4" /> : '✨'}
                                      </Button>
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                        generate image with ai from description
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-xs mb-1">Description</label>
                                  <Input
                                    name="description"
                                    placeholder="Description"
                                    value={descValues[idx] ?? sd.data.description}
                                    onChange={e => setDescValues(prev => ({ ...prev, [idx]: e.currentTarget.value }))}
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-xs mb-1">Payout Address</label>
                                  <Input name="payoutAddress" placeholder="Payout Address" defaultValue={address} />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-xs mb-1">Platform Address</label>
                                  <Input name="platformAddress" placeholder="Platform Address" defaultValue={address} />
                                </div>
                                <div className="flex space-x-2">
                                  <Button type="submit" disabled={createLoading}>
                                    {createLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create'}
                                  </Button>
                                  <Button
                                    type="button"
                                    disabled={createLoading}
                                    onClick={() => setCreateCancelled(prev => { const arr = [...prev]; arr[idx] = true; return arr; })}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            )
                          ) : (
                            <pre className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-xs">{msg}</pre>
                          )}
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground block text-right">{dates[idx]} {timestamps[idx]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (isUser) {
                  return (
                    <div key={idx} className={`mb-4 flex items-start gap-3 justify-end`}>
                      <div className={`flex flex-col max-w-[60%] items-end`}>
                        <span className="text-xs text-muted-foreground mb-1">{usernames[idx]}</span>
                        <div className={`rounded-lg px-3 py-2 bg-primary text-primary-foreground max-w-full`}>
                          <p className="text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere">{msg}</p>
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
