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

# Set stdout to use UTF-8 encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Initialize parser at module level
parser = argparse.ArgumentParser()
parser.add_argument('--video_id', type=str, required=True, help='YouTube video ID')
parser.add_argument('--tts_type', default='pyttsx3', choices=['pyttsx3', 'EL', 'Fish', 'Google'], help='Type of TTS to use')
parser.add_argument('--ai_provider', type=str, default='openai', choices=['openai', 'gemini'], help='AI provider to use')

# Parse arguments at module level
args = parser.parse_args()

# Initialize the chat history file and system prompt file
history_file = "history.json"
system_prompt_file = "instructions/prompt.txt"

def initTTS():
    global engine
    engine = pyttsx3.init()
    engine.setProperty('rate', 180)
    engine.setProperty('volume', 1)
    voice = engine.getProperty('voices')
    engine.setProperty('voice', voice[1].id)

def initVar():
    global data, OPENAI_key, GEMINI_key, EL_key, FISH_key, youtube_api_key
    
    # Load config
    with open('config.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get API keys
    OPENAI_key = data["keys"][0]["OPENAI_key"]
    GEMINI_key = data["keys"][0]["GEMINI_key"]
    EL_key = data["keys"][0]["EL_key"]
    FISH_key = data["keys"][0]["FISH_key"]
    youtube_api_key = data["keys"][0]["youtube_api_key"]
    
    # Initialize AI models based on selected provider
    if args.ai_provider.lower() == "openai":
        class OPENAI:
            model = data["model_settings"]["OPENAI"]["model"]
            temperature = data["model_settings"]["OPENAI"]["temperature"]
            max_tokens = data["model_settings"]["OPENAI"]["max_tokens"]
            top_p = data["model_settings"]["OPENAI"]["top_p"]
            frequency_penalty = data["model_settings"]["OPENAI"]["frequency_penalty"]
            presence_penalty = data["model_settings"]["OPENAI"]["presence_penalty"]
        return OPENAI
    else:  # Gemini
        class GEMINI:
            model = data["model_settings"]["GEMINI"]["model"]
            temperature = data["model_settings"]["GEMINI"]["temperature"]
            top_p = data["model_settings"]["GEMINI"]["top_p"]
            top_k = data["model_settings"]["GEMINI"]["top_k"]
            max_output_tokens = data["model_settings"]["GEMINI"]["max_output_tokens"]
        return GEMINI

def main():
    # Initialize variables and get AI model class
    AI_Model = initVar()
    
    # Load system prompt
    try:
        with open(system_prompt_file, "r", encoding='utf-8') as file:
            system_prompt = file.read().strip()
    except Exception as e:
        print(f"Unable to load system prompt: {e}")
        system_prompt = ""
    
    # Initialize TTS based on selection
    if args.tts_type == "pyttsx3":
        initTTS()
    elif args.tts_type == "Google":
        google_client = texttospeech.TextToSpeechClient()
    
    # Initialize AI provider
    if args.ai_provider.lower() == "openai":
        client = OpenAI(api_key=OPENAI_key)
    else:
        genai.configure(api_key=GEMINI_key)
        model = genai.GenerativeModel(
            model_name=AI_Model.model,
            generation_config={
                "temperature": AI_Model.temperature,
                "top_p": AI_Model.top_p,
                "top_k": AI_Model.top_k if hasattr(AI_Model, 'top_k') else None,
                "max_output_tokens": AI_Model.max_output_tokens if hasattr(AI_Model, 'max_output_tokens') else None
            }
        )
    
    # Start chat loop
    try:
        while True:
            read_chat()
            print("\n\nReset!\n\n")
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nProcess interrupted and stopped.")
    except Exception as e:
        print(f"Error: {e}")

def save_history():
    try:
        with open(history_file, "w") as file:
            json.dump(chat_history, file, indent=4)
    except Exception as e:
        print(f"Error saving chat history: {e}")

def Controller_TTS(message):
    if tts_type == "EL":
        EL_TTS(message)
    elif tts_type == "pyttsx3":
        pyttsx3_TTS(message)
    elif tts_type == "Google":
        google_TTS(message)

def pyttsx3_TTS(message):
    engine.say(message)
    engine.runAndWait()

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
    
    # Extract text from the response (ensure single response)
    return response.text

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

if __name__ == "__main__":
    print("\n\nRunning!\n\n")
    main()