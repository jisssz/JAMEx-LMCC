import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Scale,
  FileText,
  WifiOff,
} from 'lucide-react';
import { askComplianceCopilot, CopilotResponse, GroundedCitation } from '../../services/api';

interface ComplianceCopilotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  verdict?: string;
  extractedFields?: Record<string, any>;
  flaggedRules?: string[];
  commodity?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  citations?: GroundedCitation[];
  suggestedFollowups?: string[];
  isOffline?: boolean;
  provider?: string;
}

export const ComplianceCopilotSheet: React.FC<ComplianceCopilotSheetProps> = ({
  isOpen,
  onClose,
  verdict,
  extractedFields,
  flaggedRules = [],
  commodity,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting & context-aware starter when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialText =
        verdict === 'REVIEW'
          ? `Hello! I am your Legal Metrology Compliance Copilot. This package screening resulted in a REVIEW verdict with ${
              flaggedRules.length
            } flagged statutory declaration(s). You can ask me why a specific rule was flagged, what physical tests are required, or how to address discrepancies under the Legal Metrology (Packaged Commodities) Rules, 2011.`
          : `Hello! I am your Legal Metrology Compliance Copilot. This package screening completed successfully. Ask me any questions regarding Rule 6(1) declarations, Gazette amendments (G.S.R. 779(E)), or physical verification protocols.`;

      setMessages([
        {
          id: 'welcome',
          sender: 'copilot',
          text: initialText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedFollowups:
            flaggedRules.length > 0
              ? [
                  'Why was this package flagged for REVIEW?',
                  'What physical checks should the inspector perform?',
                  'How do I correct an OCR error via Human Review?',
                ]
              : [
                  'Explain Rule 6(1)(da) unit sale price rules',
                  'What are the permissible error tolerances for net weight?',
                  'Can you override this verdict?',
                ],
        },
      ]);
    }
  }, [isOpen, verdict, flaggedRules]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response: CopilotResponse = await askComplianceCopilot({
        query: textToSend,
        verdict,
        extracted_fields: extractedFields,
        flagged_rules: flaggedRules,
        commodity,
      });

      const copilotMsg: ChatMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.citations,
        suggestedFollowups: response.suggested_followups,
        isOffline: response.is_offline_fallback,
        provider: response.provider_used,
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'copilot',
        text: `Unable to complete query: ${err?.message || 'Server connection error'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-[#0d121c] border-l border-white/10 z-50 flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-[#121927] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-base">Compliance Copilot</h3>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Grounded AI
                    </span>
                  </div>
                  <p className="text-xs text-white/50">Rule 6(1) Legal Metrology Knowledge Base</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close copilot"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Context Strip */}
            {verdict && (
              <div className="px-4 py-2 bg-black/30 border-b border-white/5 flex items-center justify-between text-xs">
                <span className="text-white/60 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-teal-400" />
                  Active Inspection Context:
                </span>
                <span
                  className={`font-mono font-medium px-2 py-0.5 rounded ${
                    verdict === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {verdict}
                </span>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 text-sm ${
                      msg.sender === 'user'
                        ? 'bg-teal-600 text-white font-normal rounded-tr-none'
                        : 'bg-white/[0.04] border border-white/10 text-white/90 rounded-tl-none space-y-2'
                    }`}
                  >
                    {/* Message Header for Copilot */}
                    {msg.sender === 'copilot' && (
                      <div className="flex items-center justify-between text-[11px] text-white/40 pb-1 border-b border-white/5">
                        <span className="flex items-center gap-1 font-mono">
                          <Bot className="w-3 h-3 text-teal-400" />
                          {msg.provider || 'Statutory AI'}
                        </span>
                        {msg.isOffline && (
                          <span className="flex items-center gap-1 text-amber-400/80">
                            <WifiOff className="w-3 h-3" />
                            Offline Mode
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message Body */}
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                    {/* Citations Card */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2 border-t border-white/10 space-y-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Statutory Citations ({msg.citations.length})
                        </div>
                        <div className="space-y-1.5">
                          {msg.citations.map((cite, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded bg-black/40 border border-white/5 text-xs text-white/80"
                            >
                              <div className="flex items-center justify-between font-mono font-medium text-teal-300 text-[11px]">
                                <span>{cite.clause}</span>
                                <span className="text-[10px] text-white/40">{cite.rule_id}</span>
                              </div>
                              <div className="text-white/60 text-[11px] mt-0.5">{cite.gazette_reference}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Follow-ups */}
                    {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                      <div className="pt-2 space-y-1">
                        <div className="text-[10px] text-white/40 uppercase font-mono">Suggested Questions:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedFollowups.map((suggestion, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleSendMessage(suggestion)}
                              className="text-xs text-left px-2.5 py-1 rounded-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-white/30 text-right">{msg.timestamp}</div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-white/50 text-xs p-3 rounded-xl bg-white/[0.02] border border-white/5 w-fit">
                  <Sparkles className="w-4 h-4 animate-spin text-teal-400" />
                  <span>Consulting statutory rule corpus and gazettes...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-white/10 bg-[#121927]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask about Rule 6, MRP, G.S.R. notifications..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-teal-500 transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputQuery.trim()}
                  className="p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send query"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[10px] text-white/40 text-center mt-2">
                Advisory screening assistance only. Official verdicts are deterministic code per PCR 2011.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
