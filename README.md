# AI VTuber Control Panel

A modern desktop application for managing AI VTuber interactions, built with Electron and Python.

## Features

- 🎮 Live Control Panel for managing YouTube livestream interactions
- 🤖 Multiple AI Provider support (OpenAI GPT-4 and Google Gemini)
- 🗣️ Multiple TTS options (ElevenLabs, Fish, Google Cloud, pyttsx3)
- 💬 Real-time chat monitoring and response generation
- ⚙️ Configurable system prompts and settings
- 🎨 Modern, dark-themed UI

## Prerequisites

- Python 3.11 or higher
- Node.js and npm
- Required API keys:
  - OpenAI API key (for GPT-4)
  - Google Gemini API key
  - ElevenLabs API key (for ElevenLabs TTS)
  - Fish API key (for Fish TTS)
  - YouTube API key (for livestream features)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-vtuber.git
cd ai-vtuber
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Configure your API keys in `config.json`:
```json
{
    "keys": [{
        "EL_key": "your_eleven_labs_key",
        "FISH_key": "your_fish_key",
        "OPENAI_key": "your_openai_key",
        "GEMINI_key": "your_gemini_key",
        "youtube_api_key": "your_youtube_key"
    }]
}
```

## Usage

### Development Mode

Run the application in development mode with hot reloading:
```bash
npm run dev
```

### Production Mode

Run the application in production mode:
```bash
npm start
```

### Building

Build the application for distribution:
```bash
npm run build
```

## Features

### Live Control
- Monitor and respond to YouTube livestream chat
- Switch between different AI and TTS providers
- Real-time console output

### Settings
- Configure API keys
- Adjust voice settings for different TTS providers
- Fine-tune AI model parameters
- Customize system behavior

### System Prompt
- Edit and save custom system prompts
- Define AI personality and behavior
- Set response guidelines

## Configuration

### AI Providers
- **OpenAI GPT-4**
  - Advanced language model for natural conversations
  - Configurable temperature and token limits
  
- **Google Gemini**
  - Alternative AI model with competitive performance
  - Adjustable parameters for response generation

### TTS Options
- **ElevenLabs**
  - High-quality, natural-sounding voices
  - Custom voice ID support
  
- **Fish**
  - Alternative TTS provider
  - Configurable format and bitrate settings
  
- **Google Cloud TTS**
  - Professional-grade text-to-speech
  - Multiple voice options
  
- **pyttsx3**
  - Offline TTS option
  - Low-latency responses

## Development

The application uses:
- Electron for the desktop interface
- Python for backend processing
- Modern ES6+ JavaScript
- Custom theme system for consistent styling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for GPT-4 API
- Google for Gemini API
- ElevenLabs for TTS capabilities
- YouTube API for livestream integration


