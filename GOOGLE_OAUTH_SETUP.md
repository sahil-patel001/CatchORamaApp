# Google OAuth Setup Guide

## Overview

This guide will help you set up Google OAuth authentication for the Product Ecosystem application.

## Current Status

✅ **Fixed Issues:**
- Google OAuth configuration now handles missing credentials gracefully
- Frontend provides clear error messages when OAuth is not configured
- Backend returns proper error codes instead of crashing
- Environment validation includes Google OAuth settings

## Quick Setup

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen
6. Set up the OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5001/api/v1/auth/google/callback`

### 2. Configure Environment Variables

Create a `.env` file in the project root with:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/v1/auth/google/callback

# Frontend Configuration
FRONTEND_URL=http://localhost:5173

# Required for the app to work
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/product-ecosystem
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-long
```

### 3. Test the Setup

1. Start the backend: `npm run dev` (in backend directory)
2. Start the frontend: `npm run dev` (in project root)
3. Go to the login page
4. Click "Continue with Google"

## What Happens Without Google OAuth

If you don't set up Google OAuth credentials:

- ✅ The app will still work perfectly with email/password authentication
- ✅ Users will see a helpful error message when clicking "Continue with Google"
- ✅ No crashes or broken functionality
- ✅ Clear instructions to use email/password login instead

## Error Messages

The system now provides clear feedback:

- **"Google OAuth Unavailable"**: When OAuth is not configured
- **"Google authentication failed"**: When the OAuth process fails
- **"Authentication error occurred"**: For other OAuth-related issues

## Production Setup

For production deployment:

1. Update the authorized redirect URIs in Google Cloud Console
2. Set the production callback URL:
   ```bash
   GOOGLE_CALLBACK_URL=https://yourdomain.com/api/v1/auth/google/callback
   FRONTEND_URL=https://yourdomain.com
   ```

## Troubleshooting

### Common Issues

1. **"OAuth not configured" error**
   - Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
   - Verify the values are correct (no extra spaces)

2. **"Redirect URI mismatch" error**
   - Ensure the callback URL in Google Cloud Console matches your `GOOGLE_CALLBACK_URL`
   - Check for `http` vs `https` mismatches

3. **"Access blocked" error**
   - Make sure the OAuth consent screen is configured
   - Add test users if the app is in testing mode

### Verification

You can verify your setup by checking the server logs:
- ✅ "Google OAuth configured successfully" - OAuth is working
- ⚠️  "Google OAuth not configured" - Missing credentials (app still works)
