
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, X, Send, Loader2, Bot, User, Sparkles, ChevronDown, Minimize2 } from 'lucide-react';
import { KnowledgeEntry, ChurchEvent } from '../types';
import { format, startOfDay, addDays } from 'date-fns';
import { expandEvents } from '../utils/eventUtils';

interface ChatbotProps {
  knowledge: KnowledgeEntry[];
  events: ChurchEvent[];
}

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const Chatbot: React.FC<ChatbotProps> = ({ knowledge, events }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Expand events for the next 30 days for the chatbot's context
  const upcomingEventsContext = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysLater = addDays(today, 30);
    const instances = expandEvents(events, today, thirtyDaysLater);
    
    // Sort and format into a readable list for the AI
    return instances
      .sort((a, b) => a.instanceStart.getTime() - b.instanceStart.getTime())
      .map(inst => {
        const dateStr = format(inst.instanceStart, 'EEEE, MMMM d');
        const timeStr = format(inst.instanceStart, 'h:mm a');
        return `- ${inst.title} at ${inst.location} (${inst.tag} Parish) on ${dateStr} at ${timeStr}. Details: ${inst.description}`;
      })
      .join('\n');
  }, [events]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Construct Knowledge Context
      const knowledgeContext = knowledge.map(k => `TOPIC: ${k.title}\nCONTENT: ${k.content}`).join('\n\n');
      
      const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');
      
      const systemInstruction = `You are the East Hillfoots Parish AI Assistant. Your goal is to help visitors and parishioners with information about Dollar and Muckhart churches.
      
      Today's date is ${currentDate}.
      
      Use the following information to answer questions:
      
      ### PARISH KNOWLEDGE BASE ###
      ${knowledgeContext}
      
      ### UPCOMING EVENTS (NEXT 30 DAYS) ###
      ${upcomingEventsContext || "No upcoming events scheduled."}
      
      If the answer is not in the knowledge base or calendar, politely inform them you don't have that specific information yet and suggest they contact the parish secretary. 
      Keep your tone warm, welcoming, and professional. 
      If asked for spiritual advice, provide a compassionate response and suggest speaking with the Minister for deeper guidance.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const botMessage: ChatMessage = {
        role: 'bot',
        text: response.text || "I'm sorry, I couldn't process that request right now.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot Error:", error);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: "I'm having a little trouble connecting to my knowledge base. Please try again in a moment.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[60] bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 group"
      >
        <div className="relative">
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-indigo-600 animate-pulse" />
        </div>
        <div className="absolute right-full mr-4 bg-white text-indigo-900 px-4 py-2 rounded-xl text-sm font-bold shadow-xl border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          How can I help?
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[70] w-[90vw] max-w-[400px] bg-white rounded-[2.5rem] shadow-2xl border flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 h-[600px] max-h-[80vh]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 p-6 text-white shrink-0">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                 <Bot className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="font-bold text-lg leading-tight">Parish Assistant</h3>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    Powered by AI
                 </div>
              </div>
           </div>
           <div className="flex items-center gap-1">
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Minimize2 className="w-5 h-5" /></button>
           </div>
        </div>
        <p className="text-xs text-indigo-100/80 italic leading-relaxed">"Serving Dollar and Muckhart parishes with automated guidance."</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto border-2 border-indigo-100 border-dashed">
               <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
               <h4 className="font-bold text-slate-800">Welcome to East Hillfoots</h4>
               <p className="text-slate-500 text-xs px-8 leading-relaxed">I'm here to answer questions about events, church history, and groups in our parish.</p>
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border text-slate-700 rounded-bl-none'
            }`}>
               <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
               <div className={`text-[9px] mt-2 opacity-60 font-medium ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {format(msg.timestamp, 'h:mm a')}
               </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-white border p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                <div className="flex space-x-1">
                   <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                   <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                   <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Parish AI Thinking</span>
             </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t shrink-0">
        <form onSubmit={handleSend} className="relative">
          <input 
            type="text" 
            placeholder="Ask about upcoming events..."
            className="w-full pl-6 pr-14 py-4 bg-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
             {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
