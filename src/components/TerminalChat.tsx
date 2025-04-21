
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ollamaService } from '../services/ollamaService';
import AsciiAvatar from './AsciiAvatar';

// Types for messages
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const TerminalChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Check Ollama status on mount
  useEffect(() => {
    const checkOllama = async () => {
      const status = await ollamaService.checkStatus();
      setOllamaStatus(status);
      
      if (status) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Terminal ready. Ollama connected. Type your message and press Enter.'
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Error: Could not connect to Ollama. Make sure it is running at http://localhost:11434.'
          }
        ]);
      }
    };
    
    checkOllama();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim() || isGenerating) return;
    
    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input field
    setInput('');
    
    // Set generating state
    setIsGenerating(true);
    
    try {
      // Create an empty assistant message
      const assistantMessageIndex = messages.length;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      // Stream the response
      await ollamaService.sendMessage(input, 'llama2', (token) => {
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[assistantMessageIndex]) {
            newMessages[assistantMessageIndex] = {
              ...newMessages[assistantMessageIndex],
              content: newMessages[assistantMessageIndex].content + token
            };
          }
          return newMessages;
        });
      });
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error communicating with Ollama. Please try again.'
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-4 bg-terminal-black overflow-hidden">
      <div className="w-full max-w-4xl h-[90vh] crt-effect flex flex-col border-2 border-terminal-green rounded-lg p-1">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-1 border-b border-terminal-green">
          <div className="text-terminal-green font-mono">RETRO-LLAMA-TERMINAL v1.0</div>
          <div className="flex space-x-2">
            <div className="h-3 w-3 rounded-full bg-terminal-green"></div>
            <div className="h-3 w-3 rounded-full bg-terminal-amber"></div>
            <div className="h-3 w-3 rounded-full bg-terminal-gray"></div>
          </div>
        </div>
        
        {/* Main Terminal Content */}
        <div className="flex-1 flex">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="flex flex-col space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] terminal-text p-2 rounded ${
                      message.role === 'user' 
                        ? 'bg-terminal-darkGreen text-terminal-white' 
                        : 'border border-terminal-green'
                    }`}
                  >
                    <div className="font-mono">
                      {message.role === 'user' ? '> ' : '$ '}
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Avatar Section */}
          <div className="w-24 p-2 flex flex-col items-center justify-start">
            <AsciiAvatar 
              state={isGenerating ? (messages.length % 2 === 0 ? "talking" : "thinking") : "idle"} 
            />
            <div className="text-xs text-terminal-green mt-2 text-center">
              {isGenerating ? "PROCESSING" : "READY"}
            </div>
          </div>
        </div>
        
        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-2 border-t border-terminal-green">
          <div className="flex items-center">
            <span className="text-terminal-green mr-2">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating || ollamaStatus === false}
              className="terminal-input flex-1"
              placeholder={
                isGenerating
                  ? "Waiting for response..."
                  : ollamaStatus === false
                  ? "Ollama not connected"
                  : "Type your message here..."
              }
            />
            {isGenerating && <div className="blinking-cursor"></div>}
          </div>
        </form>
        
        {/* Connection Status */}
        <div className="p-1 border-t border-terminal-green flex justify-between text-xs">
          <div>OLLAMA STATUS: {ollamaStatus === null ? "CHECKING" : ollamaStatus ? "CONNECTED" : "DISCONNECTED"}</div>
          <div>PRESS CTRL+C TO EXIT</div>
        </div>
      </div>
    </div>
  );
};

export default TerminalChat;
