"use client";
import React, { useState } from "react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/navigation';

const GRID_SIZE = 8; // 8x8 grid like minisweeper

export default function Home() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);

  const openModal = (row: number, col: number) => {
    setSelectedSquare({ row, col });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedSquare(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="fixed left-1/2 top-6 -translate-x-1/2 z-50 flex gap-4">
        <button
          className="btn btn-accent text-xl px-8 py-4 shadow-lg"
          type="button"
        >
          Leaderboard
        </button>
        <button
          className="btn btn-secondary text-xl px-8 py-4 shadow-lg"
          type="button"
        >
          Trade coin
        </button>
      </div>
      <h1 className="text-3xl font-bold mb-6 mt-20">bot attack</h1>
      <div className="mb-6">
        <ConnectButton />
      </div>
      <button className="btn btn-secondary mb-6" type="button">
        How to play?
      </button>
      <div className="grid grid-cols-8 gap-2">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
          const row = Math.floor(idx / GRID_SIZE);
          const col = idx % GRID_SIZE;
          return (
            <button
              key={`${row}-${col}`}
              onClick={() => openModal(row, col)}
              className="w-10 h-10 bg-white border border-base-content/20 rounded hover:bg-base-300 transition-colors cursor-pointer"
            />
          );
        })}
      </div>
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px] z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 pt-4 min-w-[900px] min-h-[700px] text-center relative text-black border-2 border-black/10 flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start w-full mb-4">
              {/* Spacer to help center title/button */}
              <div className="w-8"></div> 
              <div className="flex flex-col items-center flex-grow">
                <h2 className="mb-2 text-3xl font-semibold">Battle</h2>
                <button className="btn btn-accent mb-2 text-lg" onClick={() => router.push('/generate-bot')}>
                  Generate Bot
                </button>
              </div>
              <button
                className="text-2xl font-bold text-black hover:text-gray-700"
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal Body */} 
            <div className="flex-grow flex flex-col items-center justify-center">
              <p className="text-lg">Row: {selectedSquare?.row}, Col: {selectedSquare?.col}</p>
              <p className="mb-2 text-lg">list bot</p>

              <button className="btn btn-primary btn-lg mt-auto" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
