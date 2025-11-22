import React, { useState, useCallback, useRef } from 'react';
import { sendNeuralMessage } from './services/geminiService';
import { Message, MessageRole, NeuralMode, FileSystemState } from './types';
import { ChatPanel } from './components/ChatPanel';
import { VisionPanel } from './components/VisionPanel';
import { GenerateContentResponse } from '@google/genai';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [mode, setMode] = useState<NeuralMode>(NeuralMode.CHAT);
  const [messages, setMessages] = useState<Message[]>([{
      id: generateId(),
      role: MessageRole.MODEL,
      text: "Arkaios Neural Link initialized. \n\nTo enable file system access, click [CONNECT WORKSPACE] below. \nTo enable vision, capture your screen.",
      timestamp: Date.now()
  }]);
  const [inputValue, setInputValue] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // File System State
  const [fsState, setFsState] = useState<FileSystemState>({
    handle: null,
    path: null,
    permission: 'prompt'
  });

  // --- FILE SYSTEM HANDLERS ---

  const handleMountWorkspace = async () => {
    try {
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      
      // Request Permission explicitly if needed (though showDirectoryPicker usually grants it)
      if ((await dirHandle.queryPermission({ mode: 'readwrite' })) === 'granted') {
          setFsState({
            handle: dirHandle,
            path: dirHandle.name,
            permission: 'granted'
          });
          
          setMessages(prev => [...prev, {
              id: generateId(),
              role: MessageRole.SYSTEM,
              text: `>> LOCAL WORKSPACE MOUNTED: ./${dirHandle.name}\n>> ACCESS: READ/WRITE\n>> AGENT AUTHORIZED`,
              timestamp: Date.now()
          }]);
          setMode(NeuralMode.WORKSPACE);
      }
    } catch (err) {
      console.error("Mount cancelled or failed", err);
    }
  };

  // Tool Execution Logic
  const executeTools = async (functionCalls: any[]): Promise<any[]> => {
    const responses = [];
    
    for (const call of functionCalls) {
        const { name, args } = call;
        let result = "";

        try {
            if (!fsState.handle) throw new Error("No workspace mounted. Ask user to mount a folder.");

            if (name === 'list_files') {
                const files = [];
                // @ts-ignore
                for await (const entry of fsState.handle.values()) {
                    files.push(`${entry.kind === 'directory' ? '[DIR]' : '[FILE]'} ${entry.name}`);
                }
                result = files.length > 0 ? files.join('\n') : "(Empty Directory)";
            } 
            else if (name === 'read_file') {
                // @ts-ignore
                const fileHandle = await fsState.handle.getFileHandle(args.fileName);
                const file = await fileHandle.getFile();
                result = await file.text();
            } 
            else if (name === 'write_file') {
                // @ts-ignore
                const fileHandle = await fsState.handle.getFileHandle(args.fileName, { create: true });
                // @ts-ignore
                const writable = await fileHandle.createWritable();
                await writable.write(args.content);
                await writable.close();
                result = `Successfully wrote to ${args.fileName}`;
            } else {
                result = "Unknown tool.";
            }

        } catch (err: any) {
            result = `Error executing ${name}: ${err.message}`;
        }

        responses.push({
            functionResponse: {
                name: name,
                response: { result: result }
            }
        });
    }
    return responses;
  };

  // --- MAIN MESSAGE HANDLER ---

  const processResponse = async (response: GenerateContentResponse, currentHistory: Message[]) => {
      // 1. Check for Tool Calls (Function Calls)
      const candidates = response.candidates;
      const functionCalls = candidates?.[0]?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);
      const textResponse = response.text; // Helper to get text if exists

      // If there is text, add it to chat
      if (textResponse) {
          const modelMsg: Message = {
              id: generateId(),
              role: MessageRole.MODEL,
              text: textResponse,
              timestamp: Date.now()
          };
          setMessages(prev => [...prev, modelMsg]);
          currentHistory.push(modelMsg);
      }

      // 2. If there are function calls, execute them
      if (functionCalls && functionCalls.length > 0) {
          const toolMsg: Message = {
             id: generateId(),
             role: MessageRole.SYSTEM,
             text: `>> EXECUTING: ${functionCalls.map((fc: any) => fc.name).join(', ')}...`,
             timestamp: Date.now()
          };
          setMessages(prev => [...prev, toolMsg]);

          // Execute
          const toolResponses = await executeTools(functionCalls);
          
          // Send results back to Gemini
          const followUpResponse = await sendNeuralMessage(
              currentHistory, 
              null, 
              undefined, 
              toolResponses
          );
          
          // Recursive call to handle the AI's reaction to the tool result
          await processResponse(followUpResponse, currentHistory);
      }
  };

  // Screen Capture Logic
  const handleScreenCapture = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false
      });

      const videoTrack = mediaStream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(videoTrack);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const bitmap = await imageCapture.grabFrame();
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
      videoTrack.stop();
    } catch (err) {
      console.error("Error capturing screen:", err);
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
    
    const imageToSend = capturedImage || undefined;
    setCapturedImage(null); 

    try {
      // Initial Call
      const response = await sendNeuralMessage(messages, newUserMsg.text, imageToSend);
      await processResponse(response, [...messages, newUserMsg]);

    } catch (error) {
      console.error("Processing error", error);
      setMessages(prev => [...prev, {
          id: generateId(),
          role: MessageRole.SYSTEM,
          text: "CRITICAL ERROR: Connection lost or API failure.",
          timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, capturedImage, isProcessing, messages, fsState.handle]); // Added handle dependency

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-arkaios-900 text-slate-200 font-sans overflow-hidden relative">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 bg-black/20 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-arkaios-accent to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
             <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="flex flex-col">
             <h1 className="text-sm font-bold tracking-wider text-slate-100">ARKAIOS <span className="text-arkaios-glow">NEURAL</span></h1>
             <div className="flex items-center space-x-2">
                 <span className="text-[10px] text-slate-500 font-mono uppercase">Gemini-2.5-Flash</span>
                 {fsState.path && (
                     <span className="text-[9px] bg-arkaios-700 px-1 rounded text-arkaios-glow truncate max-w-[120px]">
                         MNT: {fsState.path}
                     </span>
                 )}
             </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
           {!fsState.handle ? (
               <button 
                onClick={handleMountWorkspace}
                className="px-3 py-1 rounded bg-arkaios-800 border border-slate-700 text-[10px] font-mono text-slate-300 hover:border-arkaios-glow hover:text-arkaios-glow transition-all flex items-center gap-1"
               >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                 CONNECT WORKSPACE
               </button>
           ) : (
               <span className="px-2 py-1 rounded bg-emerald-900/30 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  CONNECTED
               </span>
           )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-arkaios-800/50 via-arkaios-900 to-arkaios-900">
        <VisionPanel previewImage={capturedImage} onClear={() => setCapturedImage(null)} />
        <ChatPanel messages={messages} isProcessing={isProcessing} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-arkaios-900/90 border-t border-slate-800 backdrop-blur z-20">
        <div className="max-w-4xl mx-auto flex items-end space-x-2">
            {/* Screen Capture */}
            <button
              onClick={handleScreenCapture}
              disabled={isProcessing}
              className="h-10 w-10 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-arkaios-glow hover:border-arkaios-glow/50 hover:bg-slate-800/80 transition-all"
              title="Analyze Screen"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={fsState.handle ? "Command the OS (e.g., 'Create a new index.html file')" : "Enter command or query..."}
                    className="w-full bg-black/50 border border-slate-700 rounded-lg py-2 pl-3 pr-10 text-sm text-slate-200 focus:outline-none focus:border-arkaios-accent/50 focus:ring-1 focus:ring-arkaios-accent/20 resize-none h-10 min-h-[2.5rem] max-h-24"
                    style={{ minHeight: '40px' }}
                />
                <div className="absolute right-2 bottom-2 text-[10px] text-slate-600 font-mono pointer-events-none">
                    {fsState.handle ? 'RW-ACCESS' : 'READ-ONLY'}
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
      </footer>
    </div>
  );
};

export default App;