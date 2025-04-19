"use client";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';

const GRID_SIZE = 8; // 8x8 grid like minisweeper

export default function Home() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isUserMessage, setIsUserMessage] = useState<boolean[]>([]);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<any[][]>([]);
  const [respondedToolCalls, setRespondedToolCalls] = useState<boolean[][]>([]);
  const [toastError, setToastError] = useState<string | null>(null);
  const { address } = useAccount();
  const truncateMiddle = (str: string, start = 6, end = 4) => {
    if (str.length <= start + end) return str;
    return `${str.slice(0, start)}...${str.slice(str.length - end)}`;
  };

  const formatDate = (date: Date): string => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const openModal = (row: number, col: number) => {
    setSelectedSquare({ row, col });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedSquare(null);
  };

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    // add user message
    setMessages(prev => [...prev, userMsg]);
    setIsUserMessage(prev => [...prev, true]);
    setUsernames(prev => [...prev, address ? truncateMiddle(address) : 'Anonymous']);
    setDates(prev => [...prev, formatDate(new Date())]);
    setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
    // placeholder for tool calls
    setToolCalls(prev => [...prev, []]);
    setRespondedToolCalls(prev => [...prev, []]);
    setLoading(true);
    try {
      // send full conversation history
      // Build payload: flatten messages, converting tool call assistant messages into tool roles
      const payloadMessages = messages.flatMap((m, i) => {
        if (!isUserMessage[i] && toolCalls[i]?.length > 0) {
          // emit a tool message for each call, showing function name and arguments
          return toolCalls[i].map(tc => ({
            role: 'tool',
            tool_call_id: tc.id,
            content: `${tc.function?.name || tc.name} ${tc.function?.arguments ?? JSON.stringify(tc.arguments)}`
          }));
        }
        return [{ role: isUserMessage[i] ? 'user' : 'assistant', content: m }];
      });
      // add current user message
      payloadMessages.push({ role: 'user', content: userMsg });
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        setToastError(errJson.error || 'Server error');
        return;
      }
      const { content: aiContent, tool_calls } = await res.json();
      // add AI response
      setMessages(prev => [...prev, aiContent]);
      setIsUserMessage(prev => [...prev, false]);
      setUsernames(prev => [...prev, 'ai assistant']);
      setDates(prev => [...prev, formatDate(new Date())]);
      setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
      // add tool calls for AI message
      setToolCalls(prev => [...prev, tool_calls || []]);
      setRespondedToolCalls(prev => [...prev, (tool_calls || []).map(() => false)]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      setToastError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (msgIdx: number, callIdx: number) => {
    setRespondedToolCalls(prev => {
      const arr = prev.map(inner => [...inner]);
      if (arr[msgIdx]) arr[msgIdx][callIdx] = true;
      return arr;
    });
    const tc = toolCalls[msgIdx]?.[callIdx]; if (!tc) return;
    if ((tc.function?.name || tc.name) === 'get_weather') {
      const location = tc.function?.arguments ? JSON.parse(tc.function.arguments).location : tc.arguments?.location;
      try {
        const resp = await fetch('/api/get_weather', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location }),
        });
        const data = await resp.json();
        const aiMsg = `Current temperature in ${data.location} is ${data.temperature}°C.`;
        setMessages(prev => [...prev, aiMsg]);
        setIsUserMessage(prev => [...prev, false]);
        setUsernames(prev => [...prev, 'ai assistant']);
        setDates(prev => [...prev, formatDate(new Date())]);
        setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
        // keep arrays aligned
        setToolCalls(prev => [...prev, []]);
        setRespondedToolCalls(prev => [...prev, []]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleReject = (msgIdx: number, callIdx: number) => {
    setRespondedToolCalls(prev => {
      const arr = prev.map(inner => [...inner]);
      if (arr[msgIdx]) arr[msgIdx][callIdx] = true;
      return arr;
    });
    const tc = toolCalls[msgIdx]?.[callIdx]; if (!tc) return;
    const aiMsg = `Tool call ${tc.function?.name || tc.name} was rejected.`;
    setMessages(prev => [...prev, aiMsg]);
    setIsUserMessage(prev => [...prev, false]);
    setUsernames(prev => [...prev, 'ai assistant']);
    setDates(prev => [...prev, formatDate(new Date())]);
    setTimestamps(prev => [...prev, new Date().toLocaleTimeString()]);
    // keep arrays aligned
    setToolCalls(prev => [...prev, []]);
    setRespondedToolCalls(prev => [...prev, []]);
  };

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4">
      {toastError && (
        <div className="toast toast-top toast-end fixed z-50">
          <div className="alert alert-error">
            <span>{toastError}</span>
            <button className="btn btn-sm btn-circle ml-2" onClick={() => setToastError(null)}>×</button>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-6">AI custodial wallet</h1>
      <div className="mb-6">
        <ConnectButton />
      </div>
      <div className="w-full max-w-full mb-6">
        <div className="border border-base-content/20 rounded p-4 h-[80vh] overflow-y-auto bg-white w-full">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm">No messages yet.</p>
          ) : (
            messages.map((msg, idx) => {
              // Only render tool call UI for assistant messages (left/ai bubble)
              if (!isUserMessage[idx] && toolCalls[idx] && toolCalls[idx].length > 0) {
                return (
                  <div key={idx} className="mb-4 flex justify-start">
                    <div className="relative rounded-lg px-4 py-2 bg-yellow-100 text-black max-w-[80%]">
                      <span className="absolute -top-4 right-0 text-xs text-black">{usernames[idx]}</span>
                      <p className="text-sm font-semibold">Tool calls:</p>
                      {toolCalls[idx].map((tc, tcIdx) => (
                        <div key={tc.id || tcIdx} className="mb-2">
                          <div className="font-mono text-xs font-bold">{tc.function?.name || tc.name}</div>
                          <pre className="text-xs bg-yellow-50 p-1 rounded whitespace-pre-wrap">
                            {(() => {
                              if (tc.function?.arguments) {
                                try { return JSON.stringify(JSON.parse(tc.function.arguments), null, 2); } catch { return tc.function.arguments; }
                              }
                              if (tc.arguments) return JSON.stringify(tc.arguments, null, 2);
                              return 'No arguments';
                            })()}
                          </pre>
                          {!(respondedToolCalls[idx]?.[tcIdx]) && (
                            <div className="mt-1 flex space-x-2">
                              <button onClick={() => handleAccept(idx, tcIdx)} className="btn btn-sm btn-success">Accept</button>
                              <button onClick={() => handleReject(idx, tcIdx)} className="btn btn-sm btn-error">Reject</button>
                            </div>
                          )}
                        </div>
                      ))}
                      <span className="absolute -bottom-4 right-0 text-xs text-gray-500">{dates[idx]} {timestamps[idx]}</span>
                    </div>
                  </div>
                );
              }
              // Otherwise, render normal chat bubble
              return (
                <div key={idx} className={`mb-4 flex ${isUserMessage[idx] ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col items-end max-w-[80%]`}>
                    <span className="text-xs mb-1 text-black text-right self-end">{usernames[idx]}</span>
                    <div className={`rounded-lg px-4 py-2 ${isUserMessage[idx] ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}>
                      {isUserMessage[idx] ? (
                        <p className="text-sm">{msg}</p>
                      ) : (
                        <div className="prose text-sm"><ReactMarkdown>{msg}</ReactMarkdown></div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{dates[idx]} {timestamps[idx]}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="flex mt-2">
          <input
            type="text"
            className="flex-grow input input-bordered"
            placeholder="Type a message..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
            disabled={loading}
          />
          <button className="btn btn-primary ml-2" onClick={handleSend} disabled={loading}>
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              'Send'
            )}
          </button>
        </div>
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
