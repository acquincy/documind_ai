import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { UploadCloud, FileText, Send, Trash2, Bot, User, Loader2 } from 'lucide-react';
import { askQuestionStream, ChatMessage } from './lib/gemini';
import { sendWebhook } from './lib/webhook';

export default function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

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

  const processFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setPdfBase64(base64);
      setPdfFile(file);
      setIsUploading(false);
      
      // Fire webhook for upload
      sendWebhook({
        event: 'document_uploaded',
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date().toISOString(),
        documentContent: base64
      });
      
      // Auto-start summarizing
      startSummary(base64, file);
    };
    reader.onerror = () => {
      alert('Error reading file. Please try again.');
      setIsUploading(false);
    };
  };

  const startSummary = async (base64: string, file: File) => {
    const initialPrompt = "Here is a PDF document. Please provide a detailed summary of its contents.";
    
    const newMessages: ChatMessage[] = [
      {
        id: Date.now().toString(),
        role: "user",
        text: initialPrompt
      },
      {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: ""
      }
    ];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      const stream = askQuestionStream(base64, [newMessages[0]]);
      let currentText = "";
      for await (const chunk of stream) {
        currentText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = currentText;
          return updated;
        });
      }

      // Fire webhook after summary is generated
      sendWebhook({
        event: 'document_summarized',
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date().toISOString(),
        summaryData: currentText
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].text = "Error generating summary. Please try asking a question.";
        return updated;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !pdfBase64 || isGenerating) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue.trim()
    };
    
    const modelMsg: ChatMessage = {
       id: (Date.now() + 1).toString(),
       role: 'model',
       text: ''
    };

    const updatedHistory = [...messages, userMsg];
    setMessages([...updatedHistory, modelMsg]);
    setInputValue('');
    setIsGenerating(true);

    try {
      const stream = askQuestionStream(pdfBase64, updatedHistory);
      let currentText = "";
      for await (const chunk of stream) {
        currentText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          // Update the last message (which is the model's response)
          updated[updated.length - 1].text = currentText;
          return updated;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].text = "An error occurred while generating the response.";
        return updated;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setPdfFile(null);
    setPdfBase64(null);
    setInputValue('');
  };

  return (
    <div className="flex h-screen bg-[#05070a] font-sans text-slate-50 overflow-hidden">
      {/* Sidebar - PDF Info & Controls */}
      <aside className="w-80 border-r border-white/10 bg-[#0a0c12] flex flex-col p-6 shadow-sm z-10 shrink-0 hidden md:flex relative z-20">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-500 p-2 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-400">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">DOCU<span className="text-blue-500">MIND</span> AI</h1>
        </div>

        {!pdfFile ? (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-sm uppercase tracking-widest text-slate-400 font-semibold mb-2">Upload Document</h2>
            <p className="text-sm text-slate-400">
              Upload a PDF to extract insights and ask questions about it.
            </p>
          </div>
        ) : (
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">Active Document</div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm">
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
              onClick={clearChat}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Remove PDF
            </button>
          </div>
        )}

        <div className="mt-auto text-xs text-center text-slate-500">
          Powered by Gemini 3.1 Pro
          {import.meta.env.VITE_WEBHOOK_URL && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-widest font-semibold border-t border-white/5 pt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              Webhook Enabled
            </div>
          )}
        </div>
      </aside>

      {/* Main Content - Upload Area or Chat */}
      <main className="flex-1 flex flex-col h-full bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#05070a_100%)] relative z-10">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#0a0c12] to-[#05070a] z-20 relative">
           <div className="flex items-center gap-2">
             <Bot className="w-5 h-5 text-blue-500" />
             <span className="font-extrabold tracking-tight">DOCU<span className="text-blue-500">MIND</span> AI</span>
           </div>
           {pdfFile && (
             <button onClick={clearChat} className="p-2 text-slate-400 rounded-md hover:bg-white/5">
               <Trash2 className="w-4 h-4" />
             </button>
           )}
        </div>

        {!pdfFile ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-transparent">
           <div 
              className={`w-full max-w-xl transition-all duration-300 ${
                dragActive ? 'scale-105' : ''
              }`}
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
                  {isUploading ? (
                    <Loader2 className="w-12 h-12 text-blue-500 mb-4 animate-spin drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                  ) : (
                    <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${dragActive ? 'text-blue-500 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-slate-400'}`} />
                  )}
                  <p className="mb-2 text-lg font-medium text-slate-50">
                    {isUploading ? 'Processing document in secure enclave...' : (
                      <>
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </>
                    )}
                  </p>
                  <p className="text-sm text-slate-400">PDF files only (max 20MB)</p>
                </div>
                <input 
                  id="pdf-upload" 
                  type="file" 
                  accept="application/pdf" 
                  className="hidden" 
                  onChange={handleChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
              <div className="mx-auto max-w-3xl flex flex-col gap-6">
                {messages.map((message) => {
                  const isUser = message.role === 'user';
                  const isInitialPrompt = isUser && message.text === "Here is a PDF document. Please provide a detailed summary of its contents.";
                  
                  return (
                    <div key={message.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mt-1">
                          <Bot className="w-4 h-4 text-blue-400" />
                        </div>
                      )}
                      
                      <div className={`max-w-[100%] md:max-w-[85%] rounded-2xl p-4 ${
                        isUser 
                          ? 'bg-white/5 border border-white/10 text-slate-50 rounded-tr-none self-end' 
                          : 'bg-[#0d1117]/80 backdrop-blur-md border border-white/10 text-slate-50 rounded-tl-none self-start shadow-xl'
                      }`}>
                        {isUser && isInitialPrompt ? (
                          <div className="flex items-center gap-2 opacity-80 text-sm">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span>Uploaded <strong className="text-slate-200">{pdfFile.name}</strong> and requested analysis.</span>
                          </div>
                        ) : isUser ? (
                          <p className="whitespace-pre-wrap">{message.text}</p>
                        ) : (
                          <div className="w-full">
                            {message.text ? (
                               <div className="markdown-body">
                                 <ReactMarkdown>
                                   {message.text}
                                 </ReactMarkdown>
                               </div>
                            ) : (
                              <div className="flex items-center h-5">
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s] mr-1"></span>
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s] mr-1"></span>
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {isUser && (
                         <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center mt-1">
                          <User className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#05070a] via-[#05070a] to-transparent pt-12 pb-6 px-4 md:px-6">
              <div className="mx-auto max-w-3xl relative">
                <form 
                  onSubmit={handleSendMessage}
                  className="relative flex items-center bg-[#0d1117]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask anything about this document..."
                    disabled={isGenerating || !pdfFile}
                    className="flex-1 py-4 pl-5 pr-14 bg-transparent outline-none rounded-xl text-slate-50 placeholder-slate-500 disabled:opacity-50 text-[15px]"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isGenerating}
                    className="absolute right-2 p-2.5 bg-blue-500 text-white rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-400 hover:bg-blue-600 hover:border-blue-500 disabled:opacity-50 disabled:hover:bg-blue-500 disabled:shadow-none disabled:border-transparent transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="text-center mt-3">
                  <span className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">AI analysis may display inaccurate info. Always verify source material.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

