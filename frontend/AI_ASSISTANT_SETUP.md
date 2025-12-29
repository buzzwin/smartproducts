# AI Assistant Setup Guide

The AI Assistant uses Google's Gemini API to help fill out forms throughout the application.

## Setup Instructions

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variable

Add the Gemini API key to your environment variables:

**For local development:**

Create or update `.env.local` in the `frontend` directory:

```bash
GEMINI_API_KEY=your_api_key_here
```

**For production:**

Add the `GEMINI_API_KEY` environment variable to your hosting platform (Vercel, Netlify, etc.)

### 3. Restart Development Server

After adding the environment variable, restart your Next.js development server:

```bash
npm run dev
```

## Usage

The AI Assistant button appears in all form modals throughout the application:

- **Product Form** - Helps create product descriptions
- **Feature Form** - Assists with feature creation including RICE scoring
- **Task Form** - Helps create tasks with estimates and priorities
- **Strategy Form** - Assists with vision, strategy, and OKR creation
- **Problem Form** - Helps define problems and customer segments
- **Interview Form** - Assists with interview notes and insights
- **Capability Form** - Helps define product capabilities
- **Resource Form** - Assists with resource creation
- **Cost Item Form** - Helps create cost items

## How It Works

1. Click the "AI Assist" button in any form
2. Describe what you want to create in natural language
3. The AI will analyze your request and fill in the form fields
4. Review and adjust the filled fields as needed
5. Submit the form

## Example Prompts

**Product:**
- "Create a product for an e-commerce platform with modern microservices architecture"
- "A mobile app for iOS and Android with real-time sync"

**Feature:**
- "Create a feature for OAuth 2.0 login, high priority, high impact"
- "User authentication with social login, medium priority"

**Task:**
- "Create a task to implement payment processing, due in 2 weeks, high priority"
- "Design the checkout UI, assign to design team"

**Strategy:**
- "Create a vision document for becoming the leading e-commerce platform"
- "Q1 OKR: Increase user engagement by 20%, reduce checkout abandonment by 15%"

## Troubleshooting

### "Gemini API key not configured" error

- Make sure you've added `GEMINI_API_KEY` to your `.env.local` file
- Restart your development server after adding the environment variable
- Check that the API key is correct and has not expired

### AI responses not filling fields correctly

- Be more specific in your prompts
- Include relevant context (e.g., product name, priority level, time estimates)
- The AI works best with clear, descriptive requests

### API rate limits

- Gemini API has rate limits on free tier
- If you hit limits, wait a few minutes and try again
- Consider upgrading to a paid plan for higher limits

## Security Notes

- The API key is stored server-side in environment variables
- API calls are made from the Next.js API route, not directly from the client
- Never commit your API key to version control

