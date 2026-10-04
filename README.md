# MacroSnap

An AI-powered nutrition assistant that analyzes meals using text and images, estimates calories and macronutrients, and provides nutrition guidance using Google Gemini.

## Features

- AI-powered nutrition chat
- Upload meal images for food identification
- Estimate calories and macronutrients
- Estimate protein, carbohydrates, and fat
- Multimodal AI using Google Gemini
- WhatsApp integration using Twilio
- Interactive Streamlit interface
- Secure API key management using Streamlit Secrets

## Tech Stack

- Python
- Streamlit
- Google Gemini API
- Google GenAI SDK
- Twilio
- WhatsApp

## Project Structure

```text
Macrosnap/
│
├── .streamlit/
│   └── secrets.toml.example
│
├── app.py
├── prompts.py
├── requirements.txt
├── test_twilio.py
└── .gitignore
