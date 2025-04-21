
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ollamaService } from '../services/ollamaService';
import AsciiAvatar from './AsciiAvatar';

// Types for messages
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const TerminalChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{running: boolean, modelAvailable: boolean} | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama2');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Fetch available models
  const fetchModels = async () => {
    const models = await ollamaService.getModels();
    setAvailableModels(models.map(m => m.name));
    return models;
  };

  // Check Ollama status on mount
  useEffect(() => {
    const checkOllama = async () => {
      const status = await ollamaService.checkStatus(selectedModel);
      setOllamaStatus(status);
      
      if (status.running) {
        // Fetch models
        const models = await fetchModels();
        
        if (status.modelAvailable) {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `Terminal ready. Ollama connected. Type your message and press Enter.`
            }
          ]);
        } else {
          const modelsList = models.length > 0 
            ? `Available models: ${models.map(m => m.name).join(', ')}.` 
            : 'No models found.';
            
          setMessages(prev => [
            ...prev,
            {
              role: 'system',
              content: `Ollama is running, but model "${selectedModel}" is not available. ${modelsList} Please run "ollama pull ${selectedModel}" in your terminal to download it.`
            }
          ]);
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'system',
            content: 'Error: Could not connect to Ollama. Make sure it is running with "ollama serve" at http://localhost:11434.'
          }
        ]);
      }
    };
    
    checkOllama();

    // Set up periodic checking
    const intervalId = setInterval(checkOllama, 10000);
    return () => clearInterval(intervalId);
  }, [selectedModel]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim() || isGenerating) return;
    
    // Check if it's a command
    if (input.startsWith('/')) {
      handleCommand(input);
      return;
    }
    
    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input field
    setInput('');
    
    // Set generating state
    setIsGenerating(true);
    
    try {
      // Create an empty assistant message
      const assistantIndex = messages.length;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      // Stream the response
      await ollamaService.sendMessage(input, selectedModel, (token) => {
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[assistantIndex]) {
            newMessages[assistantIndex] = {
              ...newMessages[assistantIndex],
              content: newMessages[assistantIndex].content + token
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
          role: 'system',
          content: 'Error communicating with Ollama. Please try again.'
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle commands
  const handleCommand = async (cmd: string) => {
    const command = cmd.trim().toLowerCase();
    
    if (command === '/help') {
      setMessages(prev => [...prev, 
        { role: 'system', content: '--- HELP ---' },
        { role: 'system', content: '/models - List available models' },
        { role: 'system', content: '/use [model] - Switch to a different model' },
        { role: 'system', content: '/clear - Clear chat history' },
        { role: 'system', content: '/status - Check Ollama connection status' },
        { role: 'system', content: '/help - Show this help message' }
      ]);
    } 
    else if (command === '/clear') {
      setMessages([]);
    }
    else if (command === '/models') {
      const models = await fetchModels();
      if (models.length > 0) {
        setMessages(prev => [...prev, 
          { role: 'system', content: '--- AVAILABLE MODELS ---' },
          { role: 'system', content: models.map(m => m.name).join(', ') }
        ]);
      } else {
        setMessages(prev => [...prev, 
          { role: 'system', content: 'No models available. Use "ollama pull [model]" to download models.' }
        ]);
      }
    }
    else if (command.startsWith('/use ')) {
      const model = command.split(' ')[1];
      if (model) {
        setSelectedModel(model);
        setMessages(prev => [...prev, 
          { role: 'system', content: `Switching to model: ${model}` }
        ]);
        
        // Check if the model is available
        const status = await ollamaService.checkStatus(model);
        if (!status.modelAvailable) {
          setMessages(prev => [...prev, 
            { role: 'system', content: `Model "${model}" is not available. Please run "ollama pull ${model}" in your terminal.` }
          ]);
        }
      }
    }
    else if (command === '/status') {
      const status = await ollamaService.checkStatus(selectedModel);
      setOllamaStatus(status);
      
      setMessages(prev => [...prev, 
        { role: 'system', content: `--- STATUS ---` },
        { role: 'system', content: `Ollama server: ${status.running ? 'Running' : 'Not running'}` },
        { role: 'system', content: `Model "${selectedModel}": ${status.modelAvailable ? 'Available' : 'Not available'}` }
      ]);
    }
    else {
      setMessages(prev => [...prev, 
        { role: 'system', content: `Unknown command: ${command}. Type /help for available commands.` }
      ]);
    }
    
    // Clear input
    setInput('');
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
                        : message.role === 'system'
                        ? 'border border-terminal-amber text-terminal-amber'
                        : 'border border-terminal-green'
                    }`}
                  >
                    <div className="font-mono">
                      {message.role === 'user' ? '> ' : message.role === 'system' ? '! ' : '$ '}
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
            {selectedModel && (
              <div className="text-xs text-terminal-amber mt-2 text-center">
                {selectedModel}
              </div>
            )}
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
              disabled={isGenerating || (ollamaStatus && (!ollamaStatus.running || !ollamaStatus.modelAvailable))}
              className="terminal-input flex-1"
              placeholder={
                isGenerating
                  ? "Waiting for response..."
                  : ollamaStatus && !ollamaStatus.running
                  ? "Ollama not connected"
                  : ollamaStatus && !ollamaStatus.modelAvailable
                  ? `Model ${selectedModel} not available, type /models`
                  : "Type your message here or /help for commands..."
              }
            />
            {isGenerating && <div className="blinking-cursor"></div>}
          </div>
        </form>
        
        {/* Connection Status */}
        <div className="p-1 border-t border-terminal-green flex justify-between text-xs">
          <div>
            OLLAMA: {ollamaStatus === null 
              ? "CHECKING" 
              : ollamaStatus.running 
                ? ollamaStatus.modelAvailable 
                  ? `CONNECTED (${selectedModel})` 
                  : `CONNECTED (NO ${selectedModel})` 
                : "DISCONNECTED"
            }
          </div>
          <div className="text-terminal-amber">Type /help for commands</div>
        </div>
      </div>
    </div>
  );
};

export default TerminalChat;
