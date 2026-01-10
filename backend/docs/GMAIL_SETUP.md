# Gmail API Setup Guide

This guide explains how to set up Gmail API access for reading emails in the SmartProducts Platform.

## Prerequisites

1. A Google Cloud Project
2. Gmail API enabled
3. OAuth2 credentials configured

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Gmail API

1. In Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Gmail API"
3. Click on it and click **Enable**

## Step 3: Create OAuth2 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add scopes: `https://www.googleapis.com/auth/gmail.readonly`
   - Add test users (your email address)
   - Save and continue
4. For Application type, select **Desktop app**
5. Give it a name (e.g., "SmartProducts Gmail Client")
6. Click **Create**
7. Download the JSON file and save it as `gmail_credentials.json` in the `backend/` directory

## Step 4: Configure Environment Variables (Optional)

You can set custom paths for credentials and token files:

```env
GMAIL_CREDENTIALS_PATH=/path/to/gmail_credentials.json
GMAIL_TOKEN_PATH=/path/to/gmail_token.json
```

By default, the service looks for:

- `backend/gmail_credentials.json` (OAuth2 credentials)
- `backend/gmail_token.json` (stored token, auto-generated)

## Step 5: First-Time Authentication

When you first use the Gmail API, you'll need to authenticate:

1. Start the backend server
2. Make a request to any Gmail endpoint (e.g., `GET /api/gmail/messages`)
3. A browser window will open asking you to sign in with Google
4. Grant permissions to read Gmail
5. The token will be saved to `gmail_token.json` for future use

## API Endpoints

### Get Messages

```
GET /api/gmail/messages?query=from:example@gmail.com&max_results=10
```

Query parameters:

- `query` (optional): Gmail search query
- `max_results` (optional, default: 10): Number of messages to return
- `page_token` (optional): Token for pagination

### Get Specific Message

```
GET /api/gmail/messages/{message_id}
```

### Search Messages

```
GET /api/gmail/search?q=subject:test&max_results=20
```

### Get Attachment

```
GET /api/gmail/messages/{message_id}/attachments/{attachment_id}
```

### Check Auth Status

```
GET /api/gmail/auth/status
```

## Gmail Query Examples

- `from:example@gmail.com` - Messages from specific sender
- `subject:test` - Messages with "test" in subject
- `is:unread` - Unread messages
- `is:read` - Read messages
- `has:attachment` - Messages with attachments
- `after:2024/1/1` - Messages after date
- `before:2024/12/31` - Messages before date
- `label:important` - Messages with specific label
- `in:inbox` - Messages in inbox
- `in:sent` - Sent messages

You can combine queries: `from:example@gmail.com is:unread has:attachment`

## Security Notes

1. **Never commit credentials or tokens to version control**
   - Add `gmail_credentials.json` and `gmail_token.json` to `.gitignore`
2. **Token expiration**

   - Tokens may expire and need refresh
   - The service automatically refreshes tokens when possible
   - If refresh fails, you'll need to re-authenticate

3. **Scopes**

   - Currently using `gmail.readonly` scope (read-only access)
   - To send emails, you'd need `gmail.send` scope

4. **Production deployment**
   - For production, consider using service accounts
   - Or implement proper OAuth2 flow with redirect URIs
   - Store tokens securely (encrypted, in database, etc.)

## Troubleshooting

### "Credentials file not found"

- Ensure `gmail_credentials.json` is in the `backend/` directory
- Or set `GMAIL_CREDENTIALS_PATH` environment variable

### "Invalid credentials"

- Re-download credentials from Google Cloud Console
- Ensure OAuth consent screen is properly configured

### "Token expired"

- Delete `gmail_token.json` and re-authenticate
- Or the service will attempt automatic refresh

### "Access denied"

- Check that Gmail API is enabled in Google Cloud Console
- Verify OAuth consent screen has correct scopes
- Ensure you're using a test user email if in testing mode
