"use client";
import React, { useState } from "react";
import ky from 'ky';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { createCoinCall } from "@zoralabs/coins-sdk";
import { Address } from "viem";
import { useWriteContract, useAccount } from "wagmi";
export default function MarketplacePage() {
  const [prompt, setPrompt] = useState<string>("a coin with robot inside of the coin");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [symbol, setSymbol] = useState<string>("");
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract(); // make writeContractAsync available via hook at top-level
  const [coinCreated, setCoinCreated] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { images } = await ky.post('/api/generate-bot', { json: { prompt }, timeout: 100000 }).json<{ images: string[] }>();
      setImages(images);
      if (images.length === 1) {
        try {
          // parse JSON response, strip ```json fences if present
          const raw = await ky.post('/api/describe-image', { json: { base64Image: images[0] }, timeout: 100000 }).json();
          let parsedObj: any;
          if (typeof raw === 'string') {
            const stripped = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            parsedObj = JSON.parse(stripped);
          } else {
            parsedObj = raw;
          }
          // ensure fields are always strings to keep inputs controlled
          const generatedName = parsedObj.name ?? "";
          const generatedDescription = parsedObj.description ?? "";
          const generatedSymbol = parsedObj.symbol ?? "";
          setName(generatedName);
          setDescription(generatedDescription);
          setSymbol(generatedSymbol);
        } catch (error) {
          console.error("Error describing image:", error);
        }
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleCreateCoin = async () => {
    const { success, result } = await ky.post('/api/create-data', {
      json: { collection: 'metadata', data: { name, description, image: `data:image/png;base64,${images[0]}`, address } }
    }).json<{ success: boolean; result: { $loki: number } }>();
    // result has LOKI metadata: { ... , $loki: id }
    const id = result.$loki;
    const uri = `${process.env.NEXT_PUBLIC_DOMAIN}/api/metadata/${id}`;
    const coinParams = {
      name,
      symbol,
      uri,
      payoutRecipient: address as Address
    };
    const contractCallParams = await createCoinCall(coinParams);
    
    try {
      // Add gas parameters to fix "intrinsic gas too low" error
      const tx = await writeContractAsync({
        ...contractCallParams,
        gas: 30000000n, // Significantly higher gas limit
        // Removed gasPrice to avoid type mismatch with EIP-1559 vs EIP-2930
      });
      setTxHash(tx);
      // record transaction in 'transactions' collection
      await ky.post('/api/create-data', {
        json: {
          collection: 'transactions',
          data: {
            txHash: tx,
            address,
            metadata_id: id
          }
        }
      }).json<{ success: boolean; result: { $loki: number } }>();
      setCoinCreated(true);
    } catch (error) {
      console.error('Error creating coin:', error);
    }
  };

  const handleGenerateAgain = () => {
    setCoinCreated(false);
    setImages([]);
    setName("");
    setDescription("");
    setSymbol("");
    setTxHash(undefined);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-10">
      <h1 className="text-3xl font-bold mb-8">Generate bot and make a coin</h1>
      <div className="p-8 bg-base-200 rounded-xl shadow-lg w-full max-w-md flex flex-col items-center">
      
        <ConnectButton />
        {isConnected && !coinCreated && (
          <>
            <button
              className="btn btn-primary w-full mt-4 mb-4"
              type="button"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
            <div className="mt-6 w-full">
              {images.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {images.map((image, index) => (
                    <img 
                      key={index}
                      src={`data:image/png;base64,${image}`}
                      alt={`Generated bot ${index + 1}`}
                      className="w-full rounded-lg shadow-md"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-base-content/50">Bot preview will appear here</p>
              )}
            </div>
            {images.length > 0 && (
              <>
                <div className="w-full flex flex-col gap-2 mt-2">
                  <label className="text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="Name"
                    className="input input-bordered w-full mb-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                  <label className="text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Description"
                    className="input input-bordered w-full mb-2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                  />
                  <label className="text-sm font-medium mb-1">Symbol</label>
                  <input
                    type="text"
                    placeholder="Symbol"
                    className="input input-bordered w-full mb-4"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <button
                  className="btn btn-secondary w-full mt-4 mb-4"
                  type="button"
                  onClick={handleCreateCoin}
                  disabled={loading}
                >
                  Create Coin
                </button>
              </>
            )}
          </>
        )}
        {isConnected && coinCreated && (
          <div className="w-full">
            <p className="text-lg font-medium mb-2 text-center mt-4">🎉 Congratulations! Your coin is created! 🎉</p>
            {/* Display coin preview and metadata */}
            <div className="flex flex-col items-center gap-2 mt-4">
              <img
                src={`data:image/png;base64,${images[0]}`}
                alt="Created Coin"
                className="w-48 h-48 object-contain"
              />
              <p><strong>Name:</strong> {name}</p>
              <p><strong>Description:</strong> {description}</p>
              <p><strong>Symbol:</strong> {symbol}</p>
              {txHash && (
                <p><strong>Transaction Hash:</strong> {txHash}</p>
              )}
            </div>
            <button
              className="btn btn-primary w-full mt-4 mb-4"
              type="button"
              onClick={handleGenerateAgain}
            >
              Generate Again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
