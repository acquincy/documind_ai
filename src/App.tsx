import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Trash2, Glasses, Loader2, CheckCircle, AlertCircle, RefreshCw, Menu, Send, Bot, User, MessageSquare } from 'lucide-react';
import { sendWebhook } from './lib/webhook';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Chat and Layout State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setChatInput('');
    
    try {
      await sendWebhook({
        event: 'chat_message',
        userId: 'emekaaaa373@gmail.com', // user ID based on previous requirements
        message: userMessage,
      });
      
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'system', 
        content: "Message sent to webhook." 
      }]);
    } catch (error) {
      console.error("Chat webhook error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'system', 
        content: "Failed to send message to webhook." 
      }]);
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    // Also check extensions as a fallback for some systems
    const allowedExtensions = ['.pdf', '.txt', '.csv', '.xls', '.xlsx'];
    const hasAllowedExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!allowedTypes.includes(file.type) && !hasAllowedExtension) {
       setErrorMessage('Please upload a valid document (PDF, Excel, CSV, or TXT).');
       setUploadStatus('error');
       return;
    }

    setPdfFile(file);
    setUploadStatus('uploading');
    setErrorMessage('');
    
    try {
      await sendWebhook({
        event: 'document_uploaded',
        file: file,
        userId: 'emekaaaa373@gmail.com', // Added the user's hardcoded email
      });
      setUploadStatus('success');
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        role: 'system',
        content: `Document "${file.name}" uploaded and sent to webhook successfully.`
      }]);
    } catch (error) {
      console.error("Webhook error:", error);
      
      let msg = error instanceof Error ? error.message : 'Unknown error occurred while sending webhook.';
      // Explain CORS issues since this is the most common webhook issue
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          msg = "Network Error: Could not reach the webhook. This is usually caused by CORS (Cross-Origin Resource Sharing) restrictions on the webhook receiver, or the URL being incorrect. Ensure your webhook provider (e.g. Zapier/Make) accepts cross-origin POST requests.";
      }
      
      setErrorMessage(msg);
      setUploadStatus('error');
    }
  };

  const resetUpload = () => {
    setPdfFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-[#05070a] font-sans text-slate-50 overflow-hidden">
      {/* Sidebar - Chat History & Document Info */}
      <aside 
        className={`transition-all duration-300 ease-in-out border-r border-white/10 bg-[#0a0c12] flex flex-col shadow-sm z-20 shrink-0 absolute md:relative h-full ${
          sidebarOpen ? 'w-80 translate-x-0' : 'w-80 -translate-x-full md:w-[88px] md:translate-x-0 overflow-x-hidden'
        }`}
      >
        <div className="p-6 flex-1 flex flex-col overflow-hidden w-80">
          <div className="flex items-center justify-between mb-8 w-full pr-1">
            <div className="flex items-center gap-3">
              <div 
                className="bg-blue-500 p-2 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-400 shrink-0 cursor-pointer"
                onClick={() => !sidebarOpen && setSidebarOpen(true)}
                title={!sidebarOpen ? "Expand sidebar" : ""}
              >
                <Glasses className="w-6 h-6 text-white" />
              </div>
              <h1 className={`text-xl font-extrabold tracking-tight transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                UNDERSTAND <span className="text-blue-500">AI</span>
              </h1>
            </div>
            {/* Contextual close button */}
            <button onClick={() => setSidebarOpen(false)} className={`p-2 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto mb-6 flex flex-col gap-4 transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold sticky top-0 bg-[#0a0c12] py-2">Chat History</div>
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No previous chats. Upload a document to start.</p>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition mr-2">
                <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate text-sm text-slate-300">Current Session</div>
              </div>
            )}
          </div>

          {pdfFile && (
            <div className={`mt-auto shrink-0 border-t border-white/10 pt-6 transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">Active Document</div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm mr-2">
                <div className="flex items-start gap-3 w-full">
                  <FileText className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
                  <div className="overflow-hidden min-w-0">
                    <p className="font-medium text-sm truncate text-slate-50" title={pdfFile.name}>
                      {pdfFile.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={resetUpload}
                className="w-[calc(100%-8px)] flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Remove File
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content - Chat & Upload Area */}
      <main className="flex-1 flex flex-col h-full bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#05070a_100%)] relative z-10 min-w-0">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-white/10 bg-[#0a0c12]/80 backdrop-blur-md z-10 relative shrink-0 h-[73px]">
          <button onClick={() => setSidebarOpen(true)} className={`p-2 mr-4 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition-colors md:hidden ${sidebarOpen ? 'opacity-0 pointer-events-none' : ''}`}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 md:hidden">
            <Glasses className="w-5 h-5 text-blue-500" />
            <span className="font-extrabold tracking-tight">UNDERSTAND <span className="text-blue-500">AI</span></span>
          </div>
        </div>

        {/* Scrollable Content or Dropzone */}
        <div className="flex-1 overflow-y-auto w-full relative scroll-smooth flex flex-col">
          {(!pdfFile && messages.length === 0) ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div 
                className={`w-full max-w-xl transition-all duration-300 ${dragActive ? 'scale-105' : ''}`}
              >
                <label 
                  htmlFor="pdf-upload"
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center w-full h-80 rounded-2xl border-2 border-dashed cursor-pointer transition-colors duration-200 ${
                    dragActive ? 'border-blue-500 bg-[rgba(59,130,246,0.1)]' : 'border-white/20 hover:border-white/40 hover:bg-white/5 bg-[#0d1117]/80 backdrop-blur-md'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    {uploadStatus === 'uploading' ? (
                      <Loader2 className="w-12 h-12 text-blue-500 mb-4 animate-spin drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                    ) : (
                      <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${dragActive ? 'text-blue-500 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-slate-400'}`} />
                    )}
                    <p className="mb-2 text-lg font-medium text-slate-50">
                      {uploadStatus === 'uploading' ? 'Sending to Webhook...' : (
                        <><span className="font-semibold">Click to upload</span> or drag and drop</>
                      )}
                    </p>
                    <p className="text-sm text-slate-400">PDF, Excel, CSV, TXT (max 20MB)</p>
                  </div>
                  <input 
                    id="pdf-upload" 
                    type="file" 
                    accept=".pdf,.txt,.csv,.xls,.xlsx,application/pdf,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                    className="hidden" 
                    onChange={handleChange}
                    disabled={uploadStatus === 'uploading'}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto p-4 md:p-6 pb-8 flex flex-col gap-6 mt-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role !== 'user' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                      msg.role === 'system' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                    }`}>
                      {msg.role === 'system' ? <CheckCircle className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-br-sm shadow-sm' 
                      : msg.role === 'system'
                        ? 'bg-white/5 border border-white/10 text-slate-300 rounded-bl-sm text-sm italic'
                        : 'bg-[#1e2330] border border-white/10 text-slate-100 rounded-bl-sm shadow-md'
                  }`}>
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}
              
              {uploadStatus === 'error' && (
                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0 mt-1">
                     <AlertCircle className="w-4 h-4" />
                   </div>
                   <div className="max-w-[85%] rounded-2xl px-5 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-bl-sm text-sm">
                     {errorMessage}
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 bg-[#0a0c12]/90 backdrop-blur-lg border-t border-white/10 w-full shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={pdfFile ? "Ask a question about your document..." : "Upload a document to start chatting..."}
              disabled={!pdfFile || uploadStatus === 'uploading'}
              className="w-full bg-[#1e2330] border border-white/10 rounded-full py-4 pl-6 pr-14 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || !pdfFile || uploadStatus === 'uploading'}
              className="absolute right-2 p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-2">
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">AI can make mistakes. Verify important info.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

