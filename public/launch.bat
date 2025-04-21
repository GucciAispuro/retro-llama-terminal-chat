
@echo off
echo Starting Retro Llama Terminal...
echo.
echo IMPORTANT: Make sure Ollama is running with:
echo ollama serve
echo.
echo Press any key to launch the application...
pause > nul

start "" http://localhost:8080
echo Application launched in your default browser.
echo Close this window when you're done.
