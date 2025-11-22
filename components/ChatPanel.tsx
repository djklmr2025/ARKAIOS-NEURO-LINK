import React, { useRef, useEffect } from 'react';
import { Message, MessageRole } from '../types';

interface ChatPanelProps {
  messages: Message[];
  isProcessing: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isProcessing }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-arkaios-700 opacity-50">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <p className="text-sm font-mono">ARKAIOS NEURAL AGENT STANDING BY</p>
        </div>
      )}
      
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex w-full ${
            msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[85%] rounded-lg p-3 text-sm shadow-lg backdrop-blur-sm border ${
              msg.role === MessageRole.USER
                ? 'bg-arkaios-700 border-arkaios-accent/30 text-cyan-50'
                : 'bg-black/40 border-slate-700 text-slate-300'
            }`}
          >
            {msg.role === MessageRole.MODEL && (
                <div className="text-xs text-arkaios-glow font-mono mb-1 uppercase tracking-wider opacity-70">
                    Neural Agent
                </div>
            )}
            
            {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-2 rounded overflow-hidden border border-slate-600/50">
                    <img src={msg.attachments[0]} alt="Screen context" className="max-w-full h-auto max-h-48 object-cover opacity-80 hover:opacity-100 transition-opacity" />
                </div>
            )}

            <div className="whitespace-pre-wrap leading-relaxed font-sans">
              {msg.text}
            </div>
            
            <div className="text-[10px] text-slate-500 mt-2 text-right font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>
      ))}

      {isProcessing && (
        <div className="flex justify-start animate-pulse">
          <div className="bg-black/40 border border-arkaios-accent/20 rounded-lg p-3 flex items-center space-x-2">
            <div className="w-2 h-2 bg-arkaios-glow rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-arkaios-glow rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-arkaios-glow rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};