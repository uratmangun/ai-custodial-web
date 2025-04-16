import React from "react";

export const metadata = {
  title: "generate-image",
};

export default function GenerateImagePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Generate Image</h1>
      <div className="p-8 bg-base-200 rounded-xl shadow-lg w-full max-w-md flex flex-col items-center">
        <p className="mb-2 text-base-content">This is the Generate Image page. Add your image generation form or functionality here.</p>
      </div>
    </main>
  );
}
