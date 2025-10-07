import { useState } from "react";
import type { Intent } from "../lib/types";

interface ChatPanelProps {
  onCommand: (text: string) => Promise<void> | void;
  logs: Intent[];
}

const PRESETS = [
  { label: "Raise Right", command: "raise right arm" },
  { label: "Raise Left", command: "raise left arm" },
  { label: "Wave Right", command: "wave right arm" },
  { label: "Reset", command: "reset" },
];

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
    <div className="flex flex-col h-full bg-gray-900 text-white p-4 gap-4">
      <div className="flex-1 overflow-auto space-y-2">
        <h3 className="text-lg font-bold mb-2">Command Log</h3>
        {logs.length === 0 && (
          <p className="text-gray-500 text-sm">No commands yet...</p>
        )}
        {logs.map((log, idx) => (
          <div
            key={idx}
            className="bg-gray-800 rounded px-3 py-2 text-sm border-l-2 border-blue-500"
          >
            <div className="font-mono text-xs text-gray-400 mb-1">
              {log.type}
              {log.side && ` · ${log.side}`}
              {log.joint && ` · ${log.joint}`}
              {log.angle !== undefined && ` · ${log.angle}°`}
            </div>
            <div>{log.text}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.command}
              onClick={() => onCommand(preset.command)}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm font-medium transition"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command (e.g., 'raise right arm')"
            className="flex-1 bg-gray-800 px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
