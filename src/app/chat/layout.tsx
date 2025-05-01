import { type Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Chat',
}

export default function BaseSepoliaChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  );
}
