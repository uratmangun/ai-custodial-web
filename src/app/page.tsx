"use client";
import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
 

 

  return (
    <main className="flex h-screen w-full flex-col justify-start bg-background">
      <section className="relative flex-grow w-full overflow-hidden py-20 lg:py-36 bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative z-10 px-6 mx-auto max-w-7xl text-center"
        >
          <p className="text-sm uppercase text-gray-700 opacity-75 mb-3">Welcome to</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900">
            AI Custodial Wallet 
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-3xl mx-auto mt-4">
            Experience the future of blockchain trading with our AI-powered platform. Simulate trades, manage assets, and explore the Zora coin ecosystem with ease.
          </p>
          <div className="flex flex-col gap-4 mt-8 items-center">
            <div className="flex flex-row gap-4">
              <Button variant="default" size="lg" asChild>
                <Link href="/chat">Chat </Link>
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
