const Imap = require("node-imap");
const inspect = require("util").inspect;
const fs = require("fs");
const base64 = require("base64-stream");
const { simpleParser } = require("mailparser");

const bcrypt = require('bcrypt');

/**
 * Function to search and fetch emails from IMAP server with improved error handling
 * @param {Object} searchCriteria - Search criteria with optional sender, subject, and content
 * @param {Object} imapUser - User credentials for IMAP
 * @returns {Promise<Array>} - Array of email objects
 */
async function searchEmails(searchCriteria = {}, imapUser = {}) {
  const { sender, subject, content, all, _id} = searchCriteria;


  const MAX_EMAILS = 10; // Limit number of emails to process

  // Email array to store fetched emails
  let email_array = [];

  // Check if required credentials are provided
  if (!imapUser.email || !imapUser.pwd) {
    console.error(`[${_id}] Missing IMAP credentials`);
    return Promise.resolve([]);
  }

  // Create IMAP connection with proper security settings
  const imap = new Imap({
    user: imapUser.email,
    password: imapUser.pwd,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: true }, // Proper security - validate certificates
    connTimeout: 15000, // Increased timeout
    authTimeout: 15000,
  });

  return new Promise((resolve, reject) => {
    // Set a timeout to prevent hanging indefinitely
    const connectionTimeout = setTimeout(() => {
      console.log(`[${_id}] Connection attempt timed out`);
      try { imap.end(); } catch (e) {}
      resolve([]);
    }, 30000);

    // Handle connection errors
    imap.once("error", function (err) {
      console.error(`[${_id}] IMAP connection error:`, err);
      clearTimeout(connectionTimeout);
      resolve([]);
    });

    // Handle connection close
    imap.once("close", function () {
      console.log(`[${_id}] IMAP connection closed`);
      clearTimeout(connectionTimeout);
      resolve(email_array);
    });

    // Main connection handling
    imap.once("ready", function () {
      console.log(`[${_id}] IMAP connection ready for ${imapUser.email}`);
      clearTimeout(connectionTimeout);

      // Open inbox with proper error handling
      imap.openBox("INBOX", false, function (err, box) {
        if (err) {
          console.error(`[${_id}] Error opening inbox:`, err);
          imap.end();
          resolve([]);
          return;
        }

        // Build search criteria array
        let searchParams = [];

        if(!all){
          searchParams = ['UNSEEN']
        }

        // Add date filter - use different time ranges for different purposes
        const dateFilter = all ;
        
        searchParams.push(["SINCE", dateFilter]);

        // Add sender filter if provided
        if (sender) {
          searchParams.push(["FROM", sender]);
        }

        // Add subject filter if provided
        if (subject) {
          searchParams.push(["HEADER", "SUBJECT", subject]);
        }

        console.log(`[${_id}] Searching with criteria:`, searchParams);

        // Search for emails
        imap.search(searchParams, function (err, results) {
          if (err) {
            console.error(`[${_id}] Error searching emails:`, err);
            imap.end();
            resolve([]);
            return;
          }

          if (!results || !results.length) {
            console.log(`[${_id}] No emails found matching criteria`);
            imap.end();
            resolve([]);
            return;
          }

          // Limit the number of results to process
          const limitedResults = results.reverse().slice(-MAX_EMAILS);
          console.log(`[${_id}] Found ${results.length} emails, processing ${limitedResults.length}`);

          // Fetch emails
          const f = imap.fetch(limitedResults, {
            bodies: "",
            struct: true,
          });

          // Set a processing timeout
          const processingTimeout = setTimeout(() => {
            console.log(`[${_id}] Email processing timed out`);
            try { imap.end(); } catch (e) {}
            resolve(email_array); // Return what we have so far
          }, 25000);

          // Track how many messages we've completely processed
          let processedCount = 0;

          // Handle message events
          f.on("message", function (msg, seqno) {
            console.log(`[${_id}] Processing message #${seqno}`);
            const prefix = `(#${seqno})`;

            msg.on("body", function (stream, info) {
              let buffer = "";

              stream.on("data", function (chunk) {
                buffer += chunk.toString("utf8");
              });

              stream.once("end", async function () {
                try {
                  // Parse the email
                  const parsedEmail = await simpleParser(buffer);
                  
                  // Extract useful information
                  const emailData = {
                    date: parsedEmail.date.toLocaleString('en-GB' , { timeZone : "Asia/Bangkok"}),
                    subject: parsedEmail.subject || "",
                    from: parsedEmail.from?.text || "",
                    to: parsedEmail.to?.text || "",
                    content: parsedEmail.text || parsedEmail.textAsHtml || "",
                    attachment: parsedEmail.attachments?.length > 0 ? 
                      `[${parsedEmail.attachments.length} attachment(s)]` : "No attachment",
                  };

                  // Check content filter if provided
                  if (!content || 
                     (emailData.content && 
                      emailData.content.toLowerCase().includes(content.toLowerCase()))) {
                    email_array.push(emailData);
                  }

                  console.log(`[${_id}] ${prefix} Email processed`);
                } catch (err) {
                  console.error(`[${_id}] ${prefix} Error parsing email:`, err);
                }
              });
            });

            // Track when each message is fully processed
            msg.once("end", function () {
              console.log(`[${_id}] ${prefix} Finished processing message`);
              processedCount++;
              
              // If we've processed all expected messages, we can end early
              if (processedCount === limitedResults.length) {
                clearTimeout(processingTimeout);
                imap.end();
              }
            });

            //mark attributes email as read
            if(!all){
              msg.once('attributes', function(attrs) {
                let uid = attrs.uid;
                imap.addFlags(uid, ['\\Seen'], function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Done, marked email as read!")
                    }
                });
              });
            }
            
            
          });

          // Handle fetch errors
          f.once("error", function (err) {
            console.error(`[${_id}] Fetch error:`, err);
            clearTimeout(processingTimeout);
            imap.end(); // End the connection, which will resolve the promise
          });

          

          // Handle fetch completion
          f.once("end", function () {
            console.log(`[${_id}] Done fetching all messages`);
            clearTimeout(processingTimeout);
            imap.end(); // Explicitly end the connection
          });
        });
      });
    });

    // Connect with error handling
    try {
      imap.connect();
    } catch (err) {
      console.error(`[${_id}] Error initiating IMAP connection:`, err);
      clearTimeout(connectionTimeout);
      resolve([]);
    }
  });
}

module.exports = { searchEmails };