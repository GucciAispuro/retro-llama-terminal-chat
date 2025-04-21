
import axios from 'axios';

// API interface based on Ollama's API
interface OllamaRequestBody {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    seed?: number;
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

const OLLAMA_API_BASE_URL = 'http://localhost:11434/api';

// Service for interacting with Ollama
export const ollamaService = {
  // Send a message and get a response
  async sendMessage(
    message: string,
    model: string = 'llama2',
    onToken?: (token: string) => void
  ): Promise<string> {
    try {
      const requestBody: OllamaRequestBody = {
        model,
        prompt: message,
        stream: !!onToken
      };

      if (onToken) {
        // Stream response token by token
        const response = await axios.post(`${OLLAMA_API_BASE_URL}/generate`, requestBody, {
          responseType: 'stream'
        });

        let fullResponse = '';
        
        // Set up response parsing and streaming
        return new Promise<string>((resolve, reject) => {
          response.data.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            try {
              // Ollama sends JSON objects line by line
              const lines = text.split('\n').filter(line => line.trim() !== '');
              
              for (const line of lines) {
                const parsed = JSON.parse(line) as OllamaResponse;
                const token = parsed.response;
                fullResponse += token;
                onToken(token);
                
                if (parsed.done) {
                  resolve(fullResponse);
                }
              }
            } catch (e) {
              // Handle parsing errors
              console.error('Error parsing streaming response:', e);
            }
          });
          
          response.data.on('error', (err: Error) => {
            reject(err);
          });
        });
      } else {
        // Non-streaming response
        const response = await axios.post(`${OLLAMA_API_BASE_URL}/generate`, requestBody);
        return response.data.response;
      }
    } catch (error) {
      console.error('Error sending message to Ollama:', error);
      return 'Error: Could not connect to Ollama. Make sure it is running at http://localhost:11434.';
    }
  },

  // Check if Ollama is running
  async checkStatus(): Promise<boolean> {
    try {
      await axios.get(`${OLLAMA_API_BASE_URL}/version`);
      return true;
    } catch (error) {
      return false;
    }
  }
};
