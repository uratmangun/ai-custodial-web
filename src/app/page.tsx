"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/navigation';
import { useAccount,useChainId, useConfig, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem'
import { getPublicClient } from 'wagmi/actions'
import { getCoinsTopGainers,getProfileBalances,getCoin,getCoinComments } from "@zoralabs/coins-sdk";
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
 


 

  return (
    <main className="flex min-h-screen flex-col justify-start bg-background">
      {toastError && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg flex items-center">
            <span className="flex-1">{toastError}</span>
            <button className="ml-4 text-destructive-foreground" onClick={() => setToastError(null)}>×</button>
          </div>
        </div>
      )}
      <section className="relative w-full overflow-hidden py-20 lg:py-36 bg-gradient-to-r from-primary to-primary/70">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative z-10 px-6 mx-auto max-w-7xl text-center text-white"
        >
          <p className="text-sm uppercase opacity-75 mb-3">Welcome to</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
            AI Custodial Wallet & AI Zora Coin Trade Simulator
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto mt-4">
            Experience the future of blockchain trading with our AI-powered platform. Simulate trades, manage assets, and explore the Zora coin ecosystem with ease.
          </p>
          <div className="flex flex-col gap-4 mt-8 items-center">
            <div className="flex flex-row gap-4">
              <Button variant="default" size="lg" asChild>
                <Link href="/chat/base-sepolia">Chat (only on base sepolia for now)</Link>
              </Button>
              <Button variant="default" size="lg" asChild>
                <Link href="/simulation">Simulate with AI</Link>
              </Button>
              <Button variant="default" size="lg" asChild>
                <Link href="/balance">Token Balance</Link>
              </Button>
            </div>
            <div className="mt-4 flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent" />
      </section>
    </main>
  );
}
