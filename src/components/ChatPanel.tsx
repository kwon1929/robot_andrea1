import { useState } from "react";
import type { Intent } from "../lib/types";

interface ChatPanelProps {
  onCommand: (text: string) => Promise<void> | void;
  logs: Intent[];
}

export default function ChatPanel({ onCommand, logs }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      setIsLoading(true);
      try {
        await onCommand(input.trim());
        setInput("");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 p-6 gap-6 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Clean top bar */}
      <div className="relative z-10 flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <div className="w-3 h-3 rounded-full bg-gray-400" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-gray-900">
          Command Interface
        </h3>
      </div>

      {/* Command Log - clean design */}
      <div className="flex-1 overflow-auto space-y-2 relative z-10 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {logs.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block px-6 py-3 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-400 text-sm">
                System ready. Enter a command to begin.
              </p>
            </div>
          </div>
        )}
        {logs.map((log, idx) => (
          <div
            key={idx}
            className="group relative bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-3 border border-gray-200 transition-all duration-200"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-600 uppercase tracking-wider font-medium">
                  {log.type}
                  {log.side && ` · ${log.side}`}
                  {log.joint && ` · ${log.joint}`}
                  {log.angle !== undefined && ` · ${log.angle}°`}
                </span>
              </div>
              <div className="text-gray-900 text-sm">{log.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Command Input - Clean Tesla Design */}
      <form onSubmit={handleSubmit} className="relative z-10 space-y-3">
        <div className="relative group">
          <div className="relative flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter command..."
                className="w-full bg-white px-4 py-3 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none text-gray-900 placeholder-gray-400 text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative px-6 py-3 bg-gray-900 hover:bg-gray-800 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </span>
              ) : (
                "Send"
              )}
            </button>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span>{isLoading ? 'Processing...' : 'Ready'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>v2.0</span>
            <span className="text-gray-700 font-medium">Optimus Lab</span>
          </div>
        </div>
      </form>
    </div>
  );
}
