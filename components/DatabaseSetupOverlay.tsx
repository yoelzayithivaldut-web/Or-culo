'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Copy, Check, Database, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const DatabaseSetupOverlay = () => {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sql, setSql] = useState('');

  useEffect(() => {
    const handleError = (e: any) => {
      setShow(true);
    };

    window.addEventListener('supabase-schema-error', handleError);
    
    // Also check if we should show it based on a flag in session storage
    if (sessionStorage.getItem('SHOW_DB_SETUP') === 'true') {
      setShow(true);
    }

    // Fetch the SQL content
    fetch('/supabase_migration.sql')
      .then(res => res.text())
      .then(text => setSql(text))
      .catch(() => setSql('-- Erro ao carregar SQL. Por favor, verifique o arquivo supabase_migration.sql no repositório.'));

    return () => window.removeEventListener('supabase-schema-error', handleError);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    toast.success('SQL copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
      >
        <div className="max-w-4xl w-full bg-[#0A0A0A] border border-[#D4AF37]/30 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_100px_rgba(212,175,55,0.1)] relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full -mr-32 -mt-32" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-3xl flex items-center justify-center mb-8 border border-[#D4AF37]/20">
              <Database className="w-10 h-10 text-[#D4AF37]" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Configuração do Banco de Dados Necessária
            </h2>
            
            <p className="text-gray-400 text-lg mb-8 max-w-2xl">
              Detectamos que as tabelas do Oráculo ainda não foram criadas no seu projeto Supabase. 
              Siga os passos abaixo para ativar o seu centro de comando literário.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10">
              {[
                { step: '01', title: 'Acesse o Supabase', desc: 'Vá para o painel do seu projeto no Supabase.' },
                { step: '02', title: 'SQL Editor', desc: 'Clique em "SQL Editor" no menu lateral esquerdo.' },
                { step: '03', title: 'Execute o Script', desc: 'Cole o código abaixo e clique em "Run".' }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl text-left">
                  <span className="text-[#D4AF37] font-mono text-sm mb-2 block">{item.step}</span>
                  <h4 className="text-white font-bold mb-1">{item.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="w-full bg-black border border-white/10 rounded-3xl overflow-hidden mb-8 group">
              <div className="flex items-center justify-between px-6 py-4 border-bottom border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <span className="ml-2 text-xs font-mono text-gray-500 uppercase tracking-widest">supabase_migration.sql</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-xs font-bold text-[#D4AF37] hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'COPIADO' : 'COPIAR SQL'}
                </button>
              </div>
              <div className="p-6 max-h-64 overflow-y-auto text-left font-mono text-sm text-gray-400 custom-scrollbar bg-[#050505]">
                <pre>{sql}</pre>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#D4AF37] text-black px-8 py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)] w-full sm:w-auto"
              >
                Abrir Supabase Dashboard
                <ExternalLink className="w-5 h-5" />
              </a>
              <button
                onClick={() => {
                  setShow(false);
                  sessionStorage.removeItem('SHOW_DB_SETUP');
                  window.location.reload();
                }}
                className="px-8 py-4 rounded-2xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all w-full sm:w-auto"
              >
                Já executei o script
              </button>
            </div>

            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-yellow-500/60 text-xs uppercase tracking-widest font-bold">
                <AlertTriangle className="w-4 h-4" />
                Atenção: O Oráculo não funcionará corretamente sem as tabelas.
              </div>
              
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left w-full max-w-md">
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">Dados de Conexão (Debug)</p>
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-gray-400 font-mono break-all">
                    <span className="text-[#D4AF37]">URL do Projeto:</span> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Não configurada'}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-2 leading-tight">
                    Certifique-se de que o SQL Editor que você abriu pertence a este projeto acima.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
