"use client";
import React, { useState } from "react";
import ky from 'ky';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export default function MarketplacePage() {
  const [prompt, setPrompt] = useState<string>("a coin with robot inside of the coin");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [symbol, setSymbol] = useState<string>("");
  const { isConnected } = useAccount();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { images } = await ky.post('/api/generate-bot', { json: { prompt } }).json<{ images: string[] }>();
      setImages(images);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-10">
      <h1 className="text-3xl font-bold mb-8">Generate bot and make a coin</h1>
      <div className="p-8 bg-base-200 rounded-xl shadow-lg w-full max-w-md flex flex-col items-center">
      
        <ConnectButton />
        {isConnected && (
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
                <div className="w-full flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    className="input input-bordered w-full mb-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    className="input input-bordered w-full mb-2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Symbol"
                    className="input input-bordered w-full mb-4"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-secondary w-full mt-4 mb-4"
                  type="button"
                >
                  Create Coin
                </button>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
