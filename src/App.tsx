import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Trash2, Glasses, Loader2, CheckCircle, AlertCircle, RefreshCw, Menu, Send, Bot, User, MessageSquare, LogOut, Paperclip, PanelLeftClose, PanelRightClose, Plus, Search, MessageCircle } from 'lucide-react';
import { sendWebhook } from './lib/webhook';
import { motion, AnimatePresence } from 'motion/react';
import Login from './components/Login';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function App() {
  const [user, setUser] = useState<{username: string, email: string, name?: string} | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Chat and Layout State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
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
        userId: user?.email || 'emekaaaa373@gmail.com', // user ID based on previous requirements and new auth
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
        userId: user?.email || 'emekaaaa373@gmail.com', // Added the user's email
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

  const handleLogin = (username: string, email: string) => {
    setUser({ username, email });
  };

  const handleLogout = () => {
    setUser(null);
    resetUpload(); // clean session
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#0a0c12] font-sans text-slate-50 overflow-hidden">
      {/* Sidebar - Chat History & Document Info */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 320 : 88 }}
        className="border-r border-white/5 bg-[#0a0c12] flex flex-col z-20 shrink-0 absolute md:relative h-full overflow-x-hidden"
      >
        <div className="p-6 flex-1 flex flex-col w-full">
          <div className="flex items-center justify-between mb-8 w-full pr-1">
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ rotate: 15, scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-tr from-blue-600 to-purple-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/25 border border-white/10 shrink-0 cursor-pointer"
                onClick={() => !sidebarOpen && setSidebarOpen(true)}
                title={!sidebarOpen ? "Expand sidebar" : ""}
              >
                <Glasses className="w-6 h-6 text-white" />
              </motion.div>
              <motion.h1 
                animate={{ opacity: sidebarOpen ? 1 : 0 }}
                className={`text-xl font-extrabold tracking-tight whitespace-nowrap overflow-hidden ${!sidebarOpen ? 'w-0' : 'w-auto'}`}
              >
                UNDERSTAND <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI</span>
              </motion.h1>
            </div>
            {/* Contextual close button */}
            <motion.button 
              animate={{ opacity: sidebarOpen ? 1 : 0 }}
              onClick={() => setSidebarOpen(false)} 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-1.5 text-slate-500 hover:text-purple-400 hover:bg-gradient-to-r hover:from-blue-600/10 hover:to-purple-500/10 rounded-lg transition-all border border-transparent hover:border-purple-500/20 shadow-none hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] ${!sidebarOpen && 'pointer-events-none hidden'}`}
            >
              <PanelLeftClose className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="flex-1 flex flex-col gap-1 overflow-y-auto mb-6 mt-4">
            {/* Main Options */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors ${sidebarOpen ? 'p-3 mx-1 mr-3 mb-2' : 'w-10 h-10 justify-center mx-auto mb-2'}`}
              title={!sidebarOpen ? "New Chat" : undefined}
            >
              <Plus className={`shrink-0 ${sidebarOpen ? 'w-4 h-4 text-slate-300' : 'w-5 h-5 text-slate-300'}`} />
              <motion.span animate={{ opacity: sidebarOpen ? 1 : 0 }} className={`${!sidebarOpen && 'hidden'} font-semibold text-sm text-slate-200`}>New Chat</motion.span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 rounded-xl hover:bg-white/5 transition-colors ${sidebarOpen ? 'p-3 mx-1 mr-3' : 'w-10 h-10 justify-center mx-auto'}`}
              title={!sidebarOpen ? "Search" : undefined}
            >
              <Search className={`shrink-0 ${sidebarOpen ? 'w-4 h-4 text-slate-400' : 'w-5 h-5 text-slate-400'}`} />
              <motion.span animate={{ opacity: sidebarOpen ? 1 : 0 }} className={`${!sidebarOpen && 'hidden'} font-medium text-sm text-slate-400`}>Search</motion.span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 rounded-xl hover:bg-white/5 transition-colors ${sidebarOpen ? 'p-3 mx-1 mr-3' : 'w-10 h-10 justify-center mx-auto'}`}
              title={!sidebarOpen ? "Chats" : undefined}
            >
              <MessageCircle className={`shrink-0 ${sidebarOpen ? 'w-4 h-4 text-slate-400' : 'w-5 h-5 text-slate-400'}`} />
              <motion.span animate={{ opacity: sidebarOpen ? 1 : 0 }} className={`${!sidebarOpen && 'hidden'} font-medium text-sm text-slate-400 flex-1 text-left`}>Chats</motion.span>
              {sidebarOpen && messages.length > 0 && (
                 <span className="text-xs bg-white/10 text-slate-300 py-0.5 px-2 rounded-full">{messages.length > 0 ? 1 : 0}</span>
              )}
            </motion.button>

            {/* Chats List */}
            <motion.div animate={{ opacity: sidebarOpen ? 1 : 0 }} className={`${!sidebarOpen && 'hidden'} mt-4`}>
              {messages.length === 0 ? (
                <p className="text-sm text-slate-500 italic px-4">No previous chats.</p>
              ) : (
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition mx-1 mr-3 relative group"
                >
                  <div className="absolute inset-x-0 -bottom-[1px] h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="truncate text-sm font-medium text-slate-200">
                    {pdfFile ? pdfFile.name : 'Current Session'}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>

          <AnimatePresence>
            {pdfFile && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: sidebarOpen ? 1 : 0, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={`mt-auto shrink-0 border-t border-white/5 pt-6 mb-4 ${!sidebarOpen && 'pointer-events-none'}`}
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3">Active Document</div>
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-4 backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-start gap-3 w-full relative z-10">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                    </div>
                    <div className="overflow-hidden min-w-0 pt-0.5">
                      <p className="font-semibold text-sm truncate text-slate-100" title={pdfFile.name}>
                        {pdfFile.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetUpload}
                  className="w-[calc(100%-8px)] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-sm font-semibold mb-3 mr-2"
                >
                  <Trash2 className="w-4 h-4 text-slate-400" />
                  Remove File
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {!pdfFile && <div className="mt-auto" />}

          <div className="shrink-0 border-t border-white/5 pt-4 flex flex-col gap-2">
            <div className={`flex items-center gap-3 transition-colors ${sidebarOpen ? 'p-3 rounded-2xl bg-white/[0.03] border border-white/5 mr-2' : ''}`}>
              <div 
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-lg"
                title={user?.email}
              >
                <User className="w-5 h-5" />
              </div>
              <motion.div animate={{ opacity: sidebarOpen ? 1 : 0 }} className={`${!sidebarOpen && 'hidden'} overflow-hidden`}>
                <p className="font-semibold text-sm text-slate-50 truncate">{user?.username}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </motion.div>
            </div>

            <motion.button
               whileHover={{ scale: sidebarOpen ? 1.02 : 1.1 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setShowLogoutDialog(true)}
               className={`flex items-center gap-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-semibold mt-1 ${
                 sidebarOpen ? 'w-[calc(100%-8px)] py-2.5 px-4 justify-center mr-2' : 'w-10 h-10 justify-center p-0'
               }`}
               title={!sidebarOpen ? "Sign Out" : undefined}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>Sign Out</span>}
            </motion.button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content - Chat & Upload Area */}
      <main className="flex-1 flex flex-col h-full bg-[#0a0c12] relative z-10 min-w-0">
        {/* Header */}
        <div className="flex items-center p-4 bg-transparent z-10 relative shrink-0 h-[73px]">
          <button onClick={() => setSidebarOpen(true)} className={`p-1.5 mr-4 text-slate-500 hover:text-purple-400 rounded-lg hover:bg-gradient-to-r hover:from-blue-600/10 hover:to-purple-500/10 transition-all md:hidden border border-transparent hover:border-purple-500/20 shadow-none hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] ${sidebarOpen ? 'opacity-0 pointer-events-none' : ''}`}>
            <PanelRightClose className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 md:hidden">
            <div className="bg-gradient-to-tr from-blue-600 to-purple-500 p-1.5 rounded-lg shadow-lg shadow-purple-500/25 border border-white/10">
              <Glasses className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold tracking-tight">UNDERSTAND <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI</span></span>
          </div>
        </div>

        {/* Scrollable Content or Dropzone */}
        <div className="flex-1 overflow-y-auto w-full relative scroll-smooth flex flex-col">
          {(!pdfFile && messages.length === 0) ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex items-center justify-center p-6"
            >
              <div 
                className={`w-full max-w-xl transition-all duration-300 ${dragActive ? 'scale-105' : ''}`}
              >
                <label 
                  htmlFor="pdf-upload"
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center w-full h-80 rounded-[2rem] border-2 border-dashed cursor-pointer transition-all duration-300 relative overflow-hidden ${
                    dragActive ? 'border-blue-500 bg-blue-500/10 backdrop-blur-3xl drop-shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'border-white/10 hover:border-blue-500/50 hover:bg-white/[0.04] bg-white/[0.02] backdrop-blur-3xl shadow-2xl'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                  
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 relative z-10">
                    {uploadStatus === 'uploading' ? (
                      <Loader2 className="w-14 h-14 text-blue-500 mb-6 animate-spin filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    ) : (
                      <UploadCloud className={`w-14 h-14 mb-6 transition-all duration-300 ${dragActive ? 'text-blue-500 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' : 'text-slate-500 group-hover:text-slate-400'}`} />
                    )}
                    <h3 className="mb-3 text-2xl font-bold text-slate-100 tracking-tight">
                      {uploadStatus === 'uploading' ? 'Sending to Webhook...' : (
                        <>Click or drag file to start</>
                      )}
                    </h3>
                    <p className="text-sm text-slate-400 font-medium">Supports PDF, Excel, CSV, TXT (max 20MB)</p>
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
            </motion.div>
          ) : (
            <div className="w-full max-w-3xl mx-auto p-4 md:p-8 flex flex-col gap-6 mt-2">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    key={msg.id} 
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role !== 'user' && (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-lg ${
                        msg.role === 'system' ? 'bg-slate-800/80 text-emerald-400 border border-emerald-500/20' : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-500/20'
                      }`}>
                        {msg.role === 'system' ? <CheckCircle className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 leading-relaxed border ${
                      msg.role === 'user' 
                        ? 'bg-blue-600/10 border-blue-500/20 text-blue-100 rounded-br-sm shadow-sm' 
                        : msg.role === 'system'
                          ? 'bg-transparent border-transparent text-slate-400 rounded-bl-sm text-sm italic font-medium'
                          : 'bg-white/[0.03] border-white/5 text-slate-100 rounded-bl-sm shadow-md'
                    }`}>
                      {msg.content}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-purple-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-lg">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <AnimatePresence>
                {uploadStatus === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex gap-4"
                  >
                     <div className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-lg">
                       <AlertCircle className="w-5 h-5" />
                     </div>
                     <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-red-500/5 border border-red-500/20 text-red-200 rounded-bl-sm text-sm leading-relaxed backdrop-blur-sm">
                       {errorMessage}
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 md:p-6 bg-transparent w-full shrink-0 relative z-20">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
            
            {!pdfFile && (
              <label 
                title="Upload document"
                className={`absolute left-2 z-10 p-3 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors cursor-pointer ${uploadStatus === 'uploading' ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Paperclip className="w-5 h-5" />
                <input 
                  type="file" 
                  accept=".pdf,.txt,.csv,.xls,.xlsx,application/pdf,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                  className="hidden" 
                  onChange={handleChange}
                  disabled={uploadStatus === 'uploading'}
                />
              </label>
            )}

            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={pdfFile ? "Ask a question about your document..." : "Type a message or attach a document..."}
              disabled={uploadStatus === 'uploading'}
              className={`relative w-full bg-[#0a0c12] border border-white/10 rounded-full py-4 ${!pdfFile ? 'pl-14' : 'pl-6'} pr-16 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-all focus:bg-white/[0.02] shadow-inner disabled:opacity-50 disabled:cursor-not-allowed font-medium text-[15px]`}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!chatInput.trim() || uploadStatus === 'uploading'}
              className="absolute right-2 p-3 bg-gradient-to-r from-blue-600 to-purple-500 text-white rounded-full disabled:opacity-50 disabled:from-slate-700 disabled:to-slate-700 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </form>
          <div className="text-center mt-3">
             <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">AI can make mistakes. Verify important info.</p>
          </div>
        </div>
      </main>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-8 max-w-sm w-full shadow-2xl shadow-black/50 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
              
              <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2 relative z-10">
                Sign Out
              </h2>
              <p className="text-sm text-slate-400 mb-8 relative z-10 font-medium">
                Are you sure you want to sign out of Understand <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-bold">AI</span>?
              </p>
              
              <div className="flex gap-3 relative z-10">
                <button
                  onClick={() => setShowLogoutDialog(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutDialog(false);
                    handleLogout();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all text-sm font-bold"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

