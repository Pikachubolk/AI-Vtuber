import pytchat
import json
import time
import requests
from pydub import AudioSegment
from pydub.playback import play
import io
import pyttsx3
import sys
import argparse
import os
import google.generativeai as genai
from google.cloud import texttospeech
import openai
from openai import OpenAI
import twitchio
from twitchio.ext import commands
from datetime import datetime
import asyncio
import websockets
import ormsgpack
import subprocess
import shutil
from fish_audio_sdk import AsyncWebSocketSession, TTSRequest

# Set stdout to use UTF-8 encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--platform', type=str, choices=['youtube', 'twitch'], required=True,
                      help='Platform to use (youtube or twitch)')
    parser.add_argument('--stream_id', type=str, required=True,
                      help='YouTube video ID or Twitch channel name')
    parser.add_argument('--tts_type', default='pyttsx3', 
                      choices=['pyttsx3', 'EL', 'Fish', 'Google'],
                      help='Type of TTS to use')
    parser.add_argument('--ai_provider', type=str, default='openai',
                      choices=['openai', 'gemini'],
                      help='AI provider to use')
    
    return parser.parse_args()

def initTTS():
    global engine
    engine = pyttsx3.init()
    engine.setProperty('rate', 180)
    engine.setProperty('volume', 1)
    voice = engine.getProperty('voices')
    engine.setProperty('voice', voice[1].id)

def initVar(ai_provider):
    global data, OPENAI_key, GEMINI_key, EL_key, FISH_key, youtube_api_key, system_prompt, chat_history, model, tts_type
    
    # Load config
    with open('config.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get API keys
    OPENAI_key = data["keys"][0]["OPENAI_key"]
    GEMINI_key = data["keys"][0]["GEMINI_key"]
    EL_key = data["keys"][0]["EL_key"]
    FISH_key = data["keys"][0]["FISH_key"]
    youtube_api_key = data["keys"][0]["youtube_api_key"]
    
    # Initialize chat history
    chat_history = []
    
    # Load system prompt from prompt.txt
    try:
        with open('instructions/prompt.txt', 'r', encoding='utf-8') as f:
            system_prompt = f.read().strip()
    except FileNotFoundError:
        print("Warning: prompt.txt not found, using default prompt")
        system_prompt = "You are a friendly VTuber AI assistant. Keep responses concise and engaging."

    # Initialize AI model based on selected provider
    if ai_provider.lower() == "openai":
        client = OpenAI(api_key=OPENAI_key)
        model = client
    else:  # Gemini
        genai.configure(api_key=GEMINI_key)
        model = genai.GenerativeModel(
            model_name=data["model_settings"]["GEMINI"]["model"],
            generation_config={
                "temperature": data["model_settings"]["GEMINI"]["temperature"],
                "top_p": data["model_settings"]["GEMINI"]["top_p"],
                "top_k": data["model_settings"]["GEMINI"]["top_k"],
                "max_output_tokens": data["model_settings"]["GEMINI"]["max_output_tokens"]
            }
        )
    
    print(f"Initialized {ai_provider} model")
    return model

def main():
    # Parse arguments first
    args = parse_args()
    
    # Initialize variables and load config with the AI provider from args
    initVar(args.ai_provider)
    
    # Set global TTS type
    global tts_type
    tts_type = args.tts_type
    
    # Initialize TTS based on selected provider
    if tts_type == 'pyttsx3':
        initTTS()
    
    print(f"\nStarting chat monitoring for {args.platform}...")
    print(f"Stream ID: {args.stream_id}")
    print(f"TTS: {tts_type}")
    print(f"AI: {args.ai_provider}\n")
    
    try:
        if args.platform == 'youtube':
            read_youtube_chat(args.stream_id)
        else:
            read_twitch_chat(args.stream_id)
    except KeyboardInterrupt:
        print("\nStopping chat monitoring...")
    except Exception as e:
        print(f"\nError: {str(e)}")
        raise

def read_youtube_chat(video_id):
    chat = pytchat.create(video_id=video_id)
    while chat.is_alive():
        # Existing YouTube chat handling...
        pass

def read_twitch_chat(channel):
    try:
        # Get credentials from config.json first
        with open('config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Try multiple possible electron-store locations
        possible_paths = [
            os.path.join(os.path.expanduser('~'), '.config', 'ai-vtuber', 'config.json'),
            os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'ai-vtuber', 'config.json'),
            'electron-store.json'  # Local fallback
        ]
        
        token = None
        # Try to find the electron-store config file
        for path in possible_paths:
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    store_data = json.load(f)
                    twitch_creds = store_data.get('twitch_credentials', {})
                    token = twitch_creds.get('access_token')
                    if token:
                        print(f"Found Twitch credentials in: {path}")
                        break
            except FileNotFoundError:
                continue
        
        if not token:
            raise ValueError("Twitch access token not found. Please connect your Twitch account.")
        
        print(f"Connecting to Twitch channel: {channel}")
        bot = TwitchBot(token=token, channel=channel)
        bot.run()
    except Exception as e:
        print(f"Failed to connect to Twitch: {str(e)}")
        raise

def save_history():
    try:
        with open(history_file, "w") as file:
            json.dump(chat_history, file, indent=4)
    except Exception as e:
        print(f"Error saving chat history: {e}")

def Controller_TTS(message):
    global tts_type
    
    try:
        if tts_type == "EL":
            EL_TTS(message)
        elif tts_type == "pyttsx3":
            pyttsx3_TTS(message)
        elif tts_type == "Google":
            google_TTS(message)
        elif tts_type == "Fish":
            fish_TTS(message)
        else:
            print(f"Unknown TTS type: {tts_type}")
    except Exception as e:
        print(f"TTS Error: {str(e)}")

def pyttsx3_TTS(message):
    """TTS using pyttsx3"""
    global engine
    try:
        engine.say(message)
        engine.runAndWait()
    except Exception as e:
        print(f"pyttsx3 TTS Error: {str(e)}")

def EL_TTS(message):
    url = f'https://api.elevenlabs.io/v1/text-to-speech/{EL.voice}'
    headers = {
        'accept': 'audio/mpeg',
        'xi-api-key': EL.key,
        'Content-Type': 'application/json'
    }
    data = {
        'text': message,
        'voice_settings': {
            'stability': 0.75,
            'similarity_boost': 0.75
        }
    }

    response = requests.post(url, headers=headers, json=data, stream=True)
    if response.status_code == 200:
        audio_content = AudioSegment.from_file(io.BytesIO(response.content), format="mp3")
        play(audio_content)
    else:
        print(f"EL_TTS error: {response.status_code} - {response.text}")

def google_TTS(message):
    synthesis_input = texttospeech.SynthesisInput(text=message)
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US", 
        name="en-US-Wavenet-D"
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    try:
        response = google_client.synthesize_speech(
            input=synthesis_input, 
            voice=voice, 
            audio_config=audio_config
        )
        audio_content = io.BytesIO(response.audio_content)
        audio_segment = AudioSegment.from_file(audio_content, format="mp3")
        play(audio_segment)
    except Exception as e:
        print(f"Google_TTS error: {e}")

def read_chat():
    chat = pytchat.create(video_id=video_id)
    processed_messages = set()  # To track processed messages

    while chat.is_alive():
        items = list(chat.get().sync_items())
        for c in items:
            # Create a unique identifier for the message
            message_id = f"{c.datetime}-{c.author.name}-{c.message}"

            if message_id in processed_messages:
                continue  # Skip if the message has already been processed

            print(f"\n{c.datetime} [{c.author.name}]- {c.message}\n")
            message = f"USERNAME: {c.author.name}, MESSAGE: {c.message}"

            # Check if the message is a command from the channel owner
            if c.author.name == channel_owner and c.message.startswith('/'):
                command = c.message[1:].strip().lower()
                if command == "history_reset":
                    global chat_history
                    chat_history = []
                    save_history()
                    print("Chat history has been reset.")
                    continue  # Skip processing this message as it's a command

            response = llm(c.message)
            print(response)
            Controller_TTS(response)

            # Add message and response to history
            chat_history.append({
                "datetime": c.datetime,
                "author": c.author.name,
                "message": c.message,
                "response": response
            })

            # Save the updated history
            save_history()

            # Mark this message as processed
            processed_messages.add(message_id)

            time.sleep(1)

def llm(message):
    global system_prompt, chat_history, model
    
    try:
        # Build the history without the "system" role
        chat_history_for_api = []
        if system_prompt:
            chat_history_for_api.append({"role": "model", "parts": [system_prompt]})

        chat_history_for_api.extend([
            {"role": "user", "parts": [item["message"]]} if item["author"] != "model" else {"role": "model", "parts": [item["response"]]}
            for item in chat_history
        ])

        chat_history_for_api.append({"role": "user", "parts": [message]})

        # Start the chat session
        chat_session = model.start_chat(
            history=chat_history_for_api
        )

        # Send the message and get the response
        response = chat_session.send_message(message)
        
        # Add to chat history
        chat_history.append({
            "author": "user",
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        chat_history.append({
            "author": "model",
            "message": response.text,
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep chat history manageable
        if len(chat_history) > 100:
            chat_history = chat_history[-100:]
        
        return response.text
    except Exception as e:
        print(f"Error in LLM processing: {str(e)}")
        return "I apologize, but I encountered an error processing your message."

def reload_system_prompt():
    global system_prompt
    try:
        with open('instructions/prompt.txt', 'r', encoding='utf-8') as f:
            system_prompt = f.read().strip()
        print("System prompt reloaded")
    except FileNotFoundError:
        print("Warning: prompt.txt not found")
        system_prompt = "You are a friendly VTuber AI assistant. Keep responses concise and engaging."

class AIProvider:
    def __init__(self, config):
        self.config = config
        self.setup()
    
    def setup(self):
        pass
    
    async def generate_response(self, message, history):
        pass

class OpenAIProvider(AIProvider):
    def setup(self):
        self.client = OpenAI(api_key=self.config['keys'][0]['OPENAI_key'])
        self.model = self.config['OPENAI_data'][0]['model']
        self.temperature = self.config['OPENAI_data'][0]['temperature']
        self.max_tokens = self.config['OPENAI_data'][0]['max_tokens']
    
    async def generate_response(self, message, history):
        messages = [{"role": "system", "content": system_prompt}]
        for item in history:
            messages.append({"role": "user", "content": item["message"]})
            messages.append({"role": "assistant", "content": item["response"]})
        messages.append({"role": "user", "content": message})
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens
        )
        return response.choices[0].message.content

class GeminiProvider(AIProvider):
    def setup(self):
        genai.configure(api_key=self.config['keys'][0]['GEMINI_key'])
        self.model = genai.GenerativeModel(
            model_name=self.config['GEMINI_data'][0]['model_name'],
            generation_config={
                "temperature": self.config['GEMINI_data'][0]['temperature'],
                "top_p": self.config['GEMINI_data'][0]['top_p'],
                "top_k": self.config['GEMINI_data'][0]['top_k'],
                "max_output_tokens": self.config['GEMINI_data'][0]['max_output_tokens']
            }
        )
    
    async def generate_response(self, message, history):
        chat = self.model.start_chat(history=[
            {"role": "model", "parts": [system_prompt]},
            *[{"role": "user" if item["author"] != "model" else "model", 
               "parts": [item["message"] if item["author"] != "model" else item["response"]]} 
              for item in history]
        ])
        response = chat.send_message(message)
        return response.text

class TTSProvider:
    def __init__(self, config):
        self.config = config
        self.setup()
    
    def setup(self):
        pass
    
    def speak(self, text):
        pass

class FishTTSProvider(TTSProvider):
    def setup(self):
        self.api_key = self.config['keys'][0]['FISH_key']
        self.voice_id = self.config['FISH_data'][0]['voice_id']
        
    def speak(self, text):
        url = "https://api.fish.audio/v1/tts"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "text": text,
            "reference_id": self.voice_id,
            "format": "mp3",
            "mp3_bitrate": 192
        }
        
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
            audio_content = AudioSegment.from_file(io.BytesIO(response.content), format="mp3")
            play(audio_content)
        else:
            print(f"Fish TTS error: {response.status_code} - {response.text}")

class TwitchBot(commands.Bot):
    def __init__(self, token, channel):
        super().__init__(token=token, prefix='!', initial_channels=[channel])
        self.channel = channel
        self.tts_lock = asyncio.Lock()
        self.message_history = []

    async def event_ready(self):
        print(f'Connected to Twitch | {self.nick}')
        print(f'Joined channel: {self.channel}')

    async def event_message(self, message):
        if message.echo:
            return

        if message.author.is_broadcaster and message.content.lower() == '!reload_prompt':
            reload_system_prompt()
            return

        print(f"{message.timestamp} [{message.author.name}] {message.content}")
        
        # Add message to history
        self.message_history.append({
            "timestamp": message.timestamp,
            "author": message.author.name,
            "message": message.content
        })
        
        # Process message with AI
        response = llm(message.content)
        
        # Add response to history
        self.message_history.append({
            "timestamp": datetime.now(),
            "author": "bot",
            "message": response
        })
        
        # Keep history manageable
        if len(self.message_history) > 100:
            self.message_history = self.message_history[-100:]
        
        # Handle TTS
        await self.handle_tts(response)

    async def handle_tts(self, message):
        async with self.tts_lock:
            try:
                if tts_type == "Fish":
                    await fish_tts_stream(message)
                elif tts_type == "EL":
                    await asyncio.get_event_loop().run_in_executor(None, EL_TTS, message)
                elif tts_type == "pyttsx3":
                    await asyncio.get_event_loop().run_in_executor(None, pyttsx3_TTS, message)
                elif tts_type == "Google":
                    await asyncio.get_event_loop().run_in_executor(None, google_TTS, message)
            except Exception as e:
                print(f"TTS Error: {str(e)}")
                # Don't fallback to pyttsx3 automatically

async def fish_tts_stream(text):
    """Stream text to speech using Fish Audio SDK"""
    try:
        async_websocket = AsyncWebSocketSession(FISH_key)
        voice_id = data["FISH_data"][0]["voice_id"]
        
        tts_request = TTSRequest(
            text=text,
            reference_id=voice_id,
            format=data["FISH_data"][0]["settings"]["format"],
            latency=data["FISH_data"][0]["settings"]["latency"]
        )
        
        temp_file = "temp_audio.mp3"
        
        try:
            async with async_websocket as ws:
                with open(temp_file, "wb") as f:  # Open in write mode first
                    async for chunk in ws.tts(tts_request):
                        f.write(chunk)
            
            if is_installed("mpv"):
                subprocess.run(["mpv", "--no-terminal", temp_file], 
                             stdout=subprocess.DEVNULL, 
                             stderr=subprocess.DEVNULL)
            else:
                print("Warning: mpv not found. Install from https://mpv.io/installation/")
        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
    except Exception as e:
        print(f"Fish TTS Error: {str(e)}")
        raise  # Let the caller handle fallback

async def run_fish_tts(message):
    """Async wrapper for Fish TTS"""
    try:
        await fish_tts_stream(message)
    except Exception as e:
        print(f"Fish TTS Error: {str(e)}")
        print("Falling back to pyttsx3...")
        pyttsx3_TTS(message)

def fish_TTS(message):
    """Fish TTS handler"""
    try:
        # Use asyncio.run instead of manually managing event loop
        asyncio.run(run_fish_tts(message))
    except RuntimeError as e:
        if "Event loop is closed" in str(e):
            # If event loop is closed, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(run_fish_tts(message))
            loop.close()
        else:
            raise

if __name__ == "__main__":
    print("\n\nRunning!\n\n")
    main()