# Environment Variables Setup for Railway

## 🔒 Backend Environment Variables (Python FastAPI)

Set these in your **Backend service** on Railway:

```bash
# Database Configuration
DATABASE_URL=your_database_url
DATABASE_TYPE=sql  # or nosql

# Other backend variables (API keys, etc.)
GEMINI_API_KEY=your_key
EMAIL_AGENT_AI_API_KEY=your_key
ENCRYPTION_KEY=your_key
# ... other backend vars
```

## 🌐 Frontend Environment Variables (Next.js)

Set these in your **Frontend service** on Railway:

```bash
# Internal Backend URL (DO NOT use NEXT_PUBLIC_ prefix!)
# This is only used by Next.js API routes (server-side), never exposed to browser
# Use your Railway backend service name (check Railway dashboard for exact name)
API_URL=http://your-backend-service-name:5000
# Examples:
#   - API_URL=http://incredible-prosperity:5000
#   - API_URL=http://backend:8000
#   (DO NOT include .railway.internal - just use the service name)

# Optional: Disable proxy for local development
# NEXT_PUBLIC_USE_API_PROXY=false  # Only set this for local dev

# Other frontend variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_key
GEMINI_API_KEY=your_key  # For AI assistant features
# ... other frontend vars
```

## 🚨 Important Notes

### ❌ NEVER Do This:
```bash
# DON'T expose internal URLs to the browser
NEXT_PUBLIC_API_URL=http://incredible-prosperity.railway.internal:5000
```

This causes **mixed content errors** because:
- Your Next.js frontend is served over HTTPS
- Internal `.railway.internal` URLs are HTTP
- Browsers block HTTP requests from HTTPS pages

### ✅ Correct Setup:

1. **Backend Service**:
   - No special env vars needed (except your normal backend config)
   - Service name: `incredible-prosperity` (or your service name)

2. **Frontend Service**:
   - Set `API_URL=http://incredible-prosperity:5000` (without `.railway.internal`, just the service name)
   - **DO NOT** set `NEXT_PUBLIC_API_URL`
   - The frontend uses `/api/proxy/*` routes which call the backend internally

3. **How It Works**:
   ```
   Browser (HTTPS) → Next.js API Route (/api/proxy/products)
                     ↓ (server-side, secure)
                   Internal Backend (http://incredible-prosperity:5000)
   ```

## 🔧 Local Development

For local development, you can still use direct connection:

```bash
# .env.local (for local dev only)
NEXT_PUBLIC_USE_API_PROXY=false
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Or keep proxy enabled and set:
```bash
# .env.local
API_URL=http://localhost:8000
# Proxy will be used automatically
```

## 📝 Railway Service Configuration

1. **Backend Service** (Python FastAPI):
   - Port: `5000` (or your configured port)
   - Internal service name: `incredible-prosperity` (or configure your own)

2. **Frontend Service** (Next.js):
   - Port: `3000` (default)
   - Environment: Set `API_URL=http://incredible-prosperity:5000` (matching your backend service name)

## ✅ Verification

After deploying, check:
1. Browser console - no mixed content errors
2. Network tab - requests go to `/api/proxy/*` (not direct backend URLs)
3. API calls work correctly

