"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ConnectButton } from "@/components/custom/ConnectButton";
import { useAccount } from "wagmi";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChainSelector } from "@/components/custom/ChainSelector";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isConnected } = useAccount();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
    // Add search functionality here
  };

  return (
    <main className="flex h-screen w-full flex-col justify-start bg-white">
      <section
        className="relative flex-grow w-full overflow-hidden py-20 lg:py-36">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative z-10 px-6 mx-auto max-w-7xl text-center"
        >
          <p className="text-sm uppercase text-gray-700 opacity-75 mb-3">Welcome to</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900">
            Coin chat
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-3xl mx-auto mt-4">
            Buy and sell xmtp group as zora coin
          </p>
          <div className="flex flex-col gap-4 mt-8 items-center">
            <div className="flex flex-row gap-4 items-center">
              <ChainSelector />
              <ConnectButton />
            </div>
            <form onSubmit={handleSearch} className="flex flex-row gap-2 w-full max-w-md">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search for xmtp groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button type="submit" variant="default" className="cursor-pointer">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
            <div className="flex flex-row gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        variant="outline" 
                        className={`cursor-${isConnected ? "pointer" : "not-allowed"}`}
                        disabled={!isConnected}
                      >
                        Create Group
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!isConnected && (
                    <TooltipContent>
                      <p>Please connect wallet to create group</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </motion.div>

      </section>
    </main>
  );
}
