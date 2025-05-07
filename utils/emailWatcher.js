const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');
const { google } = require('googleapis');
const { promisify } = require('util');

/**
 * Function to check emails using IMAP with OAuth2 authentication
 * @param {string} email - The email address to check
 * @param {object} tokens - OAuth2 tokens object with access_token and refresh_token
 * @param {object} oauthConfig - OAuth2 configuration (clientId, clientSecret, redirectUri)
 * @param {string} searchQuery - Optional search term for email content
 * @returns {Promise<Array>} - Promise resolving to array of matching emails
 */
async function checkEmailsWithOAuth2(email, tokens, oauthConfig, searchQuery = null) {
  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri
  );
  
  // Set credentials
  oauth2Client.setCredentials(tokens);
  
  // Check if token is expired and refresh if necessary
  if (oauth2Client.isTokenExpiring()) {
    console.log("Token is expiring, refreshing...");
    const { credentials } = await oauth2Client.refreshAccessToken();
    tokens = credentials;
    
    // Return both emails and new tokens so caller can update DB
    return await checkWithTokens(email, tokens, searchQuery);
  } else {
    return await checkWithTokens(email, tokens, searchQuery);
  }
}

/**
 * Internal function to check emails with valid tokens
 */
async function checkWithTokens(email, tokens, searchQuery) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Attempting to connect to email: ${email} with OAuth2`);
      
      // Generate OAuth2 string
      const accessToken = tokens.access_token;
      
      // Configure IMAP connection with OAuth2
      const config = {
        imap: {
          user: email,
          host: 'imap.gmail.com',
          port: 993,
          tls: true,
          authTimeout: 20000,
          tlsOptions: { rejectUnauthorized: true },
          auth: {
            type: 'oauth2',
            user: email,
            accessToken: accessToken
          }
        }
      };

      // Connect to IMAP server
      const connection = await Imap.connect(config);
      console.log("Successfully connected to IMAP server with OAuth2");
      
      // Open inbox
      await connection.openBox('INBOX');
      
      // Build search criteria
      let searchCriteria = ['UNSEEN', ['SINCE', new Date()]];
      if (searchQuery) {
        searchCriteria.push(['BODY', searchQuery]);
      }
      
      // Search for emails
      const results = await connection.search(searchCriteria, { bodies: ['HEADER', 'TEXT'], markSeen: true });
      
      if (!results.length) {
        console.log("No matching emails found");
        await connection.end();
        resolve({ emails: [], tokens });
        return;
      }
      
      console.log(`Found ${results.length} matching emails`);
      
      // Process emails
      const emails = [];
      
      for (const item of results) {
        const all = Imap.parseHeader(item.parts.find(p => p.which === 'HEADER').body);
        const text = item.parts.find(p => p.which === 'TEXT').body;
        
        try {
          const parsed = await simpleParser(text);
          
          const email_data = {
            date: all.date ? new Date(all.date[0]) : new Date(),
            subject: all.subject ? all.subject[0] : '(No subject)',
            from: all.from ? all.from[0] : '',
            to: all.to ? all.to[0] : '',
            content: parsed.text || parsed.textAsHtml || '',
            attachment: parsed.attachments && parsed.attachments.length > 0 ? 
                      parsed.attachments[0].content : null
          };
          
          console.log(`Found email: ${email_data.subject}`);
          emails.push(email_data);
        } catch (parseErr) {
          console.error("Error parsing email:", parseErr);
        }
      }
      
      // Mark emails as seen (already done in search with markSeen: true)
      await connection.end();
      console.log('IMAP connection closed');
      
      // Return both emails and tokens
      resolve({ emails, tokens });
      
    } catch (err) {
      console.error("Error in OAuth2 IMAP process:", err);
      reject(err);
    }
  });
}

/**
 * Function to generate OAuth2 authentication URL
 * @param {object} oauthConfig - OAuth2 configuration
 * @returns {string} - Authentication URL
 */
function getAuthUrl(oauthConfig) {
  const oauth2Client = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri
  );
  
  const scopes = [
    'https://mail.google.com/'  // Full access to Gmail
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',     // Need refresh token
    prompt: 'consent',          // Force consent screen to ensure refresh token
    scope: scopes
  });
}

/**
 * Function to exchange authorization code for tokens
 * @param {string} code - Authorization code from redirect
 * @param {object} oauthConfig - OAuth2 configuration
 * @returns {object} - Tokens object with access_token and refresh_token
 */
async function getTokensFromCode(code, oauthConfig) {
  const oauth2Client = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri
  );
  
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

module.exports = {
  checkEmailsWithOAuth2,
  getAuthUrl,
  getTokensFromCode
};