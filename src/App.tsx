import { useState } from 'react';
import { UploadCloud, FileText, Trash2, Database, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { sendWebhook } from './lib/webhook';

export default function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
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
       setErrorMessage('Please upload a valid PDF file.');
       setUploadStatus('error');
       return;
    }

    setPdfFile(file);
    setUploadStatus('uploading');
    setErrorMessage('');
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      
      try {
        await sendWebhook({
          event: 'document_uploaded',
          fileName: file.name,
          fileSize: file.size,
          timestamp: new Date().toISOString(),
          documentContent: base64
        });
        setUploadStatus('success');
      } catch (error) {
        console.error("Webhook error:", error);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred while sending webhook.');
        setUploadStatus('error');
      }
    };
    reader.onerror = () => {
      setErrorMessage('Error reading file. Please try again.');
      setUploadStatus('error');
    };
  };

  const resetUpload = () => {
    setPdfFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="flex h-screen bg-[#05070a] font-sans text-slate-50 overflow-hidden">
      {/* Sidebar - PDF Info & Controls */}
      <aside className="w-80 border-r border-white/10 bg-[#0a0c12] flex flex-col p-6 shadow-sm z-10 shrink-0 hidden md:flex relative z-20">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-500 p-2 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-400">
            <Database className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">PDF <span className="text-blue-500">READER</span></h1>
        </div>

        {!pdfFile ? (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-sm uppercase tracking-widest text-slate-400 font-semibold mb-2">Upload Document</h2>
            <p className="text-sm text-slate-400">
              Upload a PDF to deliver its content directly to your external webhook endpoint for processing.
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
              onClick={resetUpload}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Remove PDF
            </button>
          </div>
        )}
      </aside>

      {/* Main Content - Upload Area */}
      <main className="flex-1 flex flex-col h-full bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#05070a_100%)] relative z-10">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#0a0c12] to-[#05070a] z-20 relative">
           <div className="flex items-center gap-2">
             <Database className="w-5 h-5 text-blue-500" />
             <span className="font-extrabold tracking-tight">PDF <span className="text-blue-500">READER</span></span>
           </div>
           {pdfFile && (
             <button onClick={resetUpload} className="p-2 text-slate-400 rounded-md hover:bg-white/5">
               <Trash2 className="w-4 h-4" />
             </button>
           )}
        </div>

        <div className="flex-1 flex items-center justify-center p-6 bg-transparent">
          {uploadStatus === 'idle' || uploadStatus === 'uploading' ? (
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
                  {uploadStatus === 'uploading' ? (
                    <Loader2 className="w-12 h-12 text-blue-500 mb-4 animate-spin drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                  ) : (
                    <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${dragActive ? 'text-blue-500 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-slate-400'}`} />
                  )}
                  <p className="mb-2 text-lg font-medium text-slate-50">
                    {uploadStatus === 'uploading' ? 'Sending to Webhook...' : (
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
                  disabled={uploadStatus === 'uploading'}
                />
              </label>
            </div>
          ) : uploadStatus === 'success' ? (
            <div className="w-full max-w-xl bg-[#0d1117]/80 backdrop-blur-md border border-white/10 rounded-2xl p-10 flex flex-col items-center text-center shadow-2xl">
              <div className="w-16 h-16 bg-green-500/20 border border-green-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-50 mb-2">Delivery Successful</h2>
              <p className="text-slate-400 mb-8 max-w-md">
                The document <span className="text-blue-400">"{pdfFile?.name}"</span> has been successfully sent to the configured webhook endpoint.
              </p>
              <button
                onClick={resetUpload}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-400"
              >
                <RefreshCw className="w-4 h-4" />
                Upload Another Document
              </button>
            </div>
          ) : (
            <div className="w-full max-w-xl bg-[#0d1117]/80 backdrop-blur-md border border-red-500/30 rounded-2xl p-10 flex flex-col items-center text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-500/20 border border-red-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-50 mb-2">Delivery Failed</h2>
              <p className="text-slate-400 mb-8 max-w-md">
                {errorMessage}
              </p>
              <button
                onClick={resetUpload}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

