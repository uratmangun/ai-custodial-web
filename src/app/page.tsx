"use client";
import React, { useState } from "react";

const GRID_SIZE = 8; // 8x8 grid like minisweeper

export default function Home() {
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
      <div className="grid grid-cols-8 gap-2">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
          const row = Math.floor(idx / GRID_SIZE);
          const col = idx % GRID_SIZE;
          return (
            <button
              key={`${row}-${col}`}
              onClick={() => openModal(row, col)}
              className="w-10 h-10 bg-base-200 border border-base-content/20 rounded hover:bg-base-300 transition-colors cursor-pointer"
            />
          );
        })}
      </div>
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px] z-50">
          <div className="bg-white rounded-xl shadow-lg p-16 min-w-[400px] min-h-[300px] text-center relative text-black border-2 border-black/10">
            <button
              className="absolute top-4 right-4 text-2xl font-bold text-black hover:text-gray-700"
              onClick={closeModal}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="mb-4 text-2xl font-semibold">Square Selected</h2>
            <p className="mb-8 text-lg">Row: {selectedSquare?.row}, Col: {selectedSquare?.col}</p>
            <button className="btn btn-primary btn-lg" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
