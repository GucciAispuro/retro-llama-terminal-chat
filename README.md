
# Retro Llama Terminal

A retro-styled terminal interface for chatting with the Llama 2 model using Ollama.

## Features

- Classic CRT/terminal aesthetic with scan lines and flicker effects
- ASCII art avatar that changes states based on model activity
- Real-time token streaming from Ollama
- Fully local - no external APIs used
- Responsive terminal-like interface

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Ollama](https://ollama.ai/) installed and running locally

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Pull the Llama 2 model with Ollama:**

```bash
ollama pull llama2
```

3. **Start Ollama service:**

```bash
ollama serve
```

4. **Start the development server in a new terminal:**

```bash
npm run dev
```

5. **Access the application:**

Open your browser and navigate to http://localhost:8080

## Building for Production

### Web version

```bash
npm run build
```

### Executable (Windows)

To create a standalone executable for Windows:

1. Install Electron Packager globally:

```bash
npm install -g electron-packager
```

2. Create a minimal electron wrapper (not included in this repo)

3. Package the application:

```bash
electron-packager . retro-llama --platform=win32 --arch=x64 --out=dist
```

## License

MIT

## About

This terminal interface provides a nostalgic retro computing experience while allowing you to interact with state-of-the-art language models locally.
