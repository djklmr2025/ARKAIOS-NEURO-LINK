import React, { useState, useCallback } from 'react';
import { sendNeuralMessage } from './services/geminiService';
import { Message, MessageRole, NeuralMode } from './types';
import { ChatPanel } from './components/ChatPanel';
import { VisionPanel } from './components/VisionPanel';
import { v4 as uuidv4 } from 'uuid'; // NOTE: Assuming uuid is not available, implementing simple ID gen below

// Simple ID generator since we can't easily add npm packages in this prompt format without package.json
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [mode, setMode] = useState<NeuralMode>(NeuralMode.CHAT);
  const [messages, setMessages] = useState<Message[]>([{
      id: generateId(),
      role: MessageRole.MODEL,
      text: "Arkaios Neural Link initialized. System ready. Share your screen or ask a question.",
      timestamp: Date.now()
  }]);
  const [inputValue, setInputValue] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Screen Capture Logic
  const handleScreenCapture = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false
      });

      const videoTrack = mediaStream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(videoTrack);
      
      // Small delay to ensure stream is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const bitmap = await imageCapture.grabFrame();
      
      // Convert to Base64 via Canvas
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
        const base64Image = canvas.toDataURL('image/png');
        setCapturedImage(base64Image);
        setMode(NeuralMode.VISION);
      }

      // Stop stream immediately (snapshot mode)
      videoTrack.stop();

    } catch (err) {
      console.error("Error capturing screen:", err);
      // Don't alert, just log. User might have cancelled.
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if ((!inputValue.trim() && !capturedImage) || isProcessing) return;

    const newUserMsg: Message = {
      id: generateId(),
      role: MessageRole.USER,
      text: inputValue || (capturedImage ? "Analyze this screen context." : ""),
      timestamp: Date.now(),
      attachments: capturedImage ? [capturedImage] : undefined
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsProcessing(true);
    
    // We keep the image in a temp var to send, then clear the UI preview state
    const imageToSend = capturedImage || undefined;
    setCapturedImage(null); 

    try {
      const responseText = await sendNeuralMessage(messages, newUserMsg.text, imageToSend);
      
      const newModelMsg: Message = {
        id: generateId(),
        role: MessageRole.MODEL,
        text: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, newModelMsg]);
    } catch (error) {
      console.error("Processing error", error);
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, capturedImage, isProcessing, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-arkaios-900 text-slate-200 font-sans overflow-hidden relative">
      {/* Header / Top Bar */}
      <header className="h-14 border-b border-slate-800 bg-black/20 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-arkaios-accent to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
             <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="flex flex-col">
             <h1 className="text-sm font-bold tracking-wider text-slate-100">ARKAIOS <span className="text-arkaios-glow">NEURAL</span></h1>
             <span className="text-[10px] text-slate-500 font-mono uppercase">System Online // Gemini-2.5-Flash</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
           <span className="px-2 py-1 rounded bg-arkaios-800 border border-slate-700 text-[10px] font-mono text-emerald-400">
             SECURE
           </span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-arkaios-800/50 via-arkaios-900 to-arkaios-900">
        {/* Vision Context Panel (Conditional) */}
        <VisionPanel previewImage={capturedImage} onClear={() => setCapturedImage(null)} />

        {/* Chat Area */}
        <ChatPanel messages={messages} isProcessing={isProcessing} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-arkaios-900/90 border-t border-slate-800 backdrop-blur z-20">
        <div className="max-w-4xl mx-auto flex items-end space-x-2">
            {/* Action Button: Screen Capture */}
            <button
              onClick={handleScreenCapture}
              disabled={isProcessing}
              className="h-10 w-10 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-arkaios-glow hover:border-arkaios-glow/50 hover:bg-slate-800/80 transition-all"
              title="Capture Screen Context"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={capturedImage ? "Ask about the screen content..." : "Enter command or query..."}
                    className="w-full bg-black/50 border border-slate-700 rounded-lg py-2 pl-3 pr-10 text-sm text-slate-200 focus:outline-none focus:border-arkaios-accent/50 focus:ring-1 focus:ring-arkaios-accent/20 resize-none h-10 min-h-[2.5rem] max-h-24"
                    style={{ minHeight: '40px' }}
                />
                <div className="absolute right-2 bottom-2 text-[10px] text-slate-600 font-mono pointer-events-none">
                    AI-READY
                </div>
            </div>

            {/* Send Button */}
            <button
                onClick={sendMessage}
                disabled={isProcessing || (!inputValue.trim() && !capturedImage)}
                className={`h-10 px-4 rounded-lg flex items-center justify-center font-medium transition-all duration-200 ${
                    isProcessing || (!inputValue.trim() && !capturedImage)
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                    : 'bg-arkaios-accent/10 text-arkaios-glow border border-arkaios-accent/50 hover:bg-arkaios-accent/20 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                }`}
            >
                {isProcessing ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                ) : (
                    <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                )}
            </button>
        </div>
        <div className="max-w-4xl mx-auto mt-2 text-center">
            <p className="text-[9px] text-slate-600 font-mono">
                ARKAIOS PROTOCOL v2.1.0 • CONNECTED TO PROXY GATEWAY • ENCRYPTED
            </p>
        </div>
      </footer>
    </div>
  );
};

export default App;