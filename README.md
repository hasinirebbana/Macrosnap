# MacroSnap – AI Nutrition Assistant

MacroSnap is an AI-powered nutrition assistant that helps users analyze meals, estimate nutritional values, and receive personalized nutrition guidance through an interactive web application.

## Features

- 🔐 User authentication and profile management
- 💬 AI-powered nutrition conversation
- 📸 Meal image upload and food analysis
- 🥗 Estimated calories, protein, carbohydrates, and fats
- 📊 Nutrition tracking and analytics
- 📝 Meal diary and nutrition summaries
- 🤖 AI integration using Google Gemini
- 🌙 Dark mode and customizable settings
- 📱 WhatsApp integration using Twilio (in development)

## Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS and Tailwind CSS (where used)

**Backend**
- Node.js
- Express.js

**Database and Authentication**
- Supabase

**AI and Integrations**
- Google Gemini API
- Twilio for WhatsApp integration

## Getting Started

### Prerequisites

- Node.js and npm
- A Supabase project
- A Google Gemini API key

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/hasinirebbana/Macrosnap.git
   cd Macrosnap
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the required environment variables in local `.env` files. Refer to the project's configuration requirements.

4. Start the frontend development server:

   ```bash
   npm run dev
   ```

5. Start the backend using the command configured in `package.json`.

## Security

- Keep API keys and credentials in environment variables.
- Never commit `.env` files or private service-role keys.
- Configure appropriate user-specific database access before allowing multiple users to store personal meal data.

## Project Status

MacroSnap is under active development. Existing features are being refined, and additional functionality and deployment improvements are planned.

## Author

**Hasini Rebbana**
