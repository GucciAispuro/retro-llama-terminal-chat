
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

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

const OLLAMA_API_BASE_URL = 'http://localhost:11434/api';

// Service for interacting with Ollama
export const ollamaService = {
  // Get available models
  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get(`${OLLAMA_API_BASE_URL}/tags`);
      return response.data.models || [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  },

  // Send a message and get a response
  async sendMessage(
    message: string,
    model: string = 'llama2',
    onToken?: (token: string) => void
  ): Promise<string> {
    try {
      // Check if the model exists first
      const models = await this.getModels();
      const modelExists = models.some(m => m.name === model);
      
      if (!modelExists) {
        return `Error: Model "${model}" not found. Available models: ${models.map(m => m.name).join(', ') || 'None'}. Use "ollama pull ${model}" to download it.`;
      }

      const requestBody: OllamaRequestBody = {
        model,
        prompt: message,
        stream: !!onToken,
        options: {
          temperature: 0.7
        }
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
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        return 'Error: Could not connect to Ollama. Make sure it is running with "ollama serve" at http://localhost:11434.';
      }
      return `Error communicating with Ollama: ${error.message}. Make sure you have pulled the model with "ollama pull ${model}".`;
    }
  },

  // Check if Ollama is running and verify model availability
  async checkStatus(model: string = 'llama2'): Promise<{running: boolean, modelAvailable: boolean}> {
    try {
      const response = await axios.get(`${OLLAMA_API_BASE_URL}/version`);
      
      // Check if the specific model is available
      const models = await this.getModels();
      const modelAvailable = models.some(m => m.name === model);
      
      return { 
        running: true, 
        modelAvailable 
      };
    } catch (error) {
      return { 
        running: false, 
        modelAvailable: false 
      };
    }
  }
};
