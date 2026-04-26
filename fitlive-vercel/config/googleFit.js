const { google } = require('googleapis');

/**
 * Create a fresh OAuth2 client using credentials from .env
 */
function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate Google OAuth2 authorization URL.
 * Scopes: steps, heart rate, body weight, user email
 */
function getAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',  // get refresh_token
    prompt: 'consent',       // always show consent so refresh_token is returned
    scope: [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  });
}

/**
 * Exchange authorization code for access + refresh tokens
 */
async function exchangeCode(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Build an authenticated OAuth2 client from stored user tokens.
 * Sets up automatic token refresh.
 */
function buildAuthClient(user) {
  const client = getOAuthClient();
  client.setCredentials({
    access_token:  user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date:   user.googleTokenExpiry ? new Date(user.googleTokenExpiry).getTime() : null
  });

  // Auto-save refreshed tokens back to DB
  client.on('tokens', async (tokens) => {
    try {
      const User = require('../models/User');
      const updateData = {};
      if (tokens.access_token)  updateData.googleAccessToken = tokens.access_token;
      if (tokens.refresh_token) updateData.googleRefreshToken = tokens.refresh_token;
      if (tokens.expiry_date)   updateData.googleTokenExpiry  = new Date(tokens.expiry_date);
      if (Object.keys(updateData).length > 0) {
        await User.findByIdAndUpdate(user._id, updateData);
        console.log('🔄 Google tokens auto-refreshed for user:', user._id);
      }
    } catch (e) {
      console.error('Token refresh save error:', e.message);
    }
  });

  return client;
}

module.exports = { getOAuthClient, getAuthUrl, exchangeCode, buildAuthClient };
