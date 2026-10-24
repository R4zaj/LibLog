/**
 * Email Service for LibLog - Calauan Community Campus Library
 * Utilizes Brevo HTTP API (and SendGrid fallback) over HTTPS to bypass Render SMTP port blocks.
 * Falls back to console simulation if no API key is configured.
 * 
 * Templates:
 * 1. Steam Guard-inspired dark theme OTP Email (6-digit electric blue code box)
 * 2. Antislop circulation notice email (high-contrast dark theme, zero em-dashes, purposeful hierarchy)
 */

const senderEmail = process.env.SENDER_EMAIL || 'noreply@liblog.com';
const senderName = 'Calauan Community Campus Library';

async function sendEmail({ to, subject, htmlContent, textContent }) {
  if (process.env.SENDGRID_API_KEY) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: senderEmail, name: senderName },
        subject: subject,
        content: [
          { type: 'text/html', value: htmlContent || textContent },
          ...(textContent ? [{ type: 'text/plain', value: textContent }] : [])
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`SendGrid API error: ${errText}`);
    }
    return { success: true, provider: 'SendGrid' };
  } else if (process.env.BREVO_API_KEY) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Brevo API error: ${errText}`);
    }
    return { success: true, provider: 'Brevo' };
  } else {
    // Development / Offline Fallback - Print preview to console
    console.log('\n================== [EMAIL SIMULATION (No API Key Configured)] ==================');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`From: ${senderName} <${senderEmail}>`);
    console.log('--- Plaintext Preview ---');
    console.log(textContent || '(HTML Content generated)');
    console.log('=================================================================================\n');
    return { success: true, simulated: true };
  }
}

/**
 * Generates Steam Guard-inspired dark theme HTML for OTP verification
 * Reference: Steam Guard code email (deep slate container, black box, massive electric blue code)
 */
function generateOtpEmailHtml({ otp, type = 'verify', studentName = 'Student' }) {
  const isReset = type === 'reset';
  const actionTitle = isReset ? 'Password Reset' : 'Account Verification';
  const actionDescription = isReset 
    ? 'Here is the security code you need to reset your CCC LibLog account password:'
    : 'Here is the security code you need to verify and activate your CCC LibLog account:';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${actionTitle} - Calauan Community Campus Library</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #171a21; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #c6d4df; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #1b2838; border: 1px solid #2a3f5a; border-radius: 8px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.6);" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 32px 18px 32px; border-bottom: 1px solid #223447;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <div style="display: inline-block; vertical-align: middle;">
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="background-color: #38bdf8; width: 28px; height: 28px; border-radius: 6px; text-align: center; vertical-align: middle;">
                            <span style="color: #0f172a; font-weight: 900; font-size: 15px; line-height: 28px; display: block;">L</span>
                          </td>
                          <td style="padding-left: 10px;">
                            <span style="font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; display: block; text-transform: uppercase;">CCC LIBLOG</span>
                            <span style="font-size: 10px; color: #8f98a0; letter-spacing: 0.5px; display: block;">Calauan Community Campus</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #38bdf8; background-color: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${isReset ? 'Security Alert' : 'Verification'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 36px 32px;">
              <!-- Salutation -->
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                Dear ${studentName},
              </h2>

              <!-- Context line -->
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #c6d4df;">
                ${actionDescription}
              </p>

              <!-- STEAM GUARD STYLE CODE CONTAINER -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center" style="background-color: #0d1217; border: 1px solid #1f2937; border-radius: 6px; padding: 26px 16px;">
                    <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 38px; font-weight: 800; color: #38bdf8; letter-spacing: 8px; display: inline-block; line-height: 1;">
                      ${otp}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Explanatory notices below code -->
              <div style="background-color: #141c24; border: 1px solid #223447; border-radius: 6px; padding: 18px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
                  This email was generated because of a ${isReset ? 'password reset' : 'sign-up verification'} request from the LibLog mobile or web portal.
                </p>
                <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #cbd5e1;">
                  The security code is required to complete the login. <strong>This code will expire in 10 minutes.</strong> No one can access your account without also accessing this code.
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #8f98a0;">
                  <strong>If you did not request this:</strong> Please ignore this email or consider updating your account credentials to keep your information secure.
                </p>
              </div>

              <!-- Support Note -->
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                Need help? Contact the Calauan Community Campus Library circulation desk during campus hours.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #141c24; border-top: 1px solid #223447; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">
                Calauan Community Campus Library • Automated Notification System
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                Please do not reply directly to this automated email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Plaintext OTP email generator
 */
function generateOtpEmailText({ otp, type = 'verify', studentName = 'Student' }) {
  const isReset = type === 'reset';
  return `
Dear ${studentName},

Here is your CCC LibLog ${isReset ? 'password reset' : 'verification'} code:

================================
        ${otp}
================================

This code will expire in 10 minutes.
No one can access your account without also accessing this code.

If you did not request this code, please ignore this email.

Calauan Community Campus Library
Automated Notification System
`.trim();
}

/**
 * Generates Antislop dark theme HTML for Overdue Book Penalty Notice
 * Features: High contrast, dark brand styling, focal highlight card for fines, zero em-dashes
 */
function generateOverdueEmailHtml({ user, book, record, daysOverdue, penaltyAmount, dailyRate = 5 }) {
  const studentName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.student_id || 'Student';
  const bookTitle = book?.title || 'Borrowed Literature';
  const bookAuthor = book?.author?.name || book?.author || 'Unknown Author';
  const borrowDateStr = record?.borrow_date
    ? new Date(record.borrow_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';
  const dueDateStr = record?.due_date
    ? new Date(record.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';
  const formattedPenalty = `₱${parseFloat(penaltyAmount || 0).toFixed(2)}`;
  const formattedDailyRate = `₱${parseFloat(dailyRate || 5).toFixed(2)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Overdue Notice - Calauan Community Campus Library</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #171a21; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #c6d4df; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #1b2838; border: 1px solid #3b2a2a; border-radius: 8px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.6);" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 32px 18px 32px; border-bottom: 1px solid #2d2424;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 6px; text-align: center; vertical-align: middle;">
                          <span style="color: #ffffff; font-weight: 900; font-size: 15px; line-height: 28px; display: block;">!</span>
                        </td>
                        <td style="padding-left: 10px;">
                          <span style="font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; display: block; text-transform: uppercase;">CCC LIBLOG</span>
                          <span style="font-size: 10px; color: #8f98a0; letter-spacing: 0.5px; display: block;">Calauan Community Campus</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #f87171; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); padding: 4px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Circulation Notice
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 36px 32px;">
              <!-- Salutation -->
              <h2 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                Dear ${studentName},
              </h2>

              <!-- Context -->
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #c6d4df;">
                Our circulation records indicate that the following borrowed book has exceeded its borrowing duration and is now overdue. Please review the details below:
              </p>

              <!-- FOCAL HIGHLIGHT CARD (PENALTY & TITLE) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="background-color: #0d1217; border: 1px solid #3b2828; border-radius: 6px; padding: 22px 24px;">
                    <span style="font-size: 11px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">
                      Overdue Item
                    </span>
                    <h3 style="margin: 0 0 16px 0; font-size: 17px; font-weight: 700; color: #ffffff; line-height: 1.4;">
                      ${bookTitle}
                    </h3>
                    
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #221c1c; padding-top: 14px;">
                      <tr>
                        <td align="left" valign="middle">
                          <span style="font-size: 11px; color: #94a3b8; display: block;">Accrued Fine</span>
                          <span style="font-size: 26px; font-weight: 800; color: #f87171; line-height: 1.1; display: block;">
                            ${formattedPenalty}
                          </span>
                          <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">
                            ${formattedDailyRate} per calendar day
                          </span>
                        </td>
                        <td align="right" valign="middle">
                          <div style="background-color: #3b1818; border: 1px solid #7f1d1d; border-radius: 4px; padding: 6px 12px; text-align: center; display: inline-block;">
                            <span style="font-size: 13px; font-weight: 800; color: #fca5a5; display: block;">
                              ${daysOverdue} Days
                            </span>
                            <span style="font-size: 9px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 0.5px; display: block;">
                              Past Due
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Itemized Book Details Grid -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #141c24; border: 1px solid #223447; border-radius: 6px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" style="font-size: 12px; color: #94a3b8; font-weight: 500;">Author</td>
                        <td align="right" style="font-size: 12px; color: #e2e8f0; font-weight: 600;">${bookAuthor}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" style="font-size: 12px; color: #94a3b8; font-weight: 500;">Date Borrowed</td>
                        <td align="right" style="font-size: 12px; color: #e2e8f0; font-weight: 600;">${borrowDateStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" style="font-size: 12px; color: #94a3b8; font-weight: 500;">Original Due Date</td>
                        <td align="right" style="font-size: 12px; color: #f87171; font-weight: 700;">${dueDateStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" style="font-size: 12px; color: #94a3b8; font-weight: 500;">Borrowing Status</td>
                        <td align="right" style="font-size: 12px; color: #f87171; font-weight: 700; text-transform: uppercase;">Not Returned</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Return Instructions Box -->
              <div style="background-color: #131d2a; border-left: 3px solid #38bdf8; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #ffffff;">
                  Return Instructions:
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94a3b8;">
                  Please bring this book to the <strong>Calauan Community Campus Library Circulation Desk</strong> during standard operating hours (Monday to Friday, 8:00 AM to 5:00 PM). Returning the item freezes all further overdue fee accumulation immediately.
                </p>
              </div>

              <!-- Polite Notice -->
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #64748b; text-align: center;">
                Promptly returning library materials ensures that essential academic resources remain accessible to all students.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #141c24; border-top: 1px solid #223447; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">
                Calauan Community Campus Library • Automated System Notification
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                Calauan, Laguna • Please do not reply directly to this automated email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Plaintext Overdue Notice email generator
 */
function generateOverdueEmailText({ user, book, record, daysOverdue, penaltyAmount, dailyRate = 5 }) {
  const studentName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.student_id || 'Student';
  const bookTitle = book?.title || 'Borrowed Book';
  const bookAuthor = book?.author?.name || book?.author || 'Unknown Author';
  const borrowDateStr = record?.borrow_date
    ? new Date(record.borrow_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';
  const dueDateStr = record?.due_date
    ? new Date(record.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';
  const formattedPenalty = `PHP ${parseFloat(penaltyAmount || 0).toFixed(2)}`;
  const formattedDailyRate = `PHP ${parseFloat(dailyRate || 5).toFixed(2)}`;

  return `
Dear ${studentName},

This is an overdue notice from the Calauan Community Campus Library (LibLog).

OVERDUE BOOK DETAILS:
- Title: ${bookTitle}
- Author: ${bookAuthor}
- Date Borrowed: ${borrowDateStr}
- Original Due Date: ${dueDateStr}
- Duration Overdue: ${daysOverdue} day(s)
- Accrued Penalty: ${formattedPenalty} (${formattedDailyRate} per calendar day)

RETURN INSTRUCTIONS:
Please bring this book to the Calauan Community Campus Library Circulation Desk during standard operating hours (Monday to Friday, 8:00 AM to 5:00 PM). Returning the item freezes further overdue calculations immediately.

Calauan Community Campus Library
Automated Notification System
`.trim();
}

/**
 * High-level helper to send an OTP email
 */
async function sendOtpEmail({ to, otp, type = 'verify', studentName = 'Student' }) {
  const isReset = type === 'reset';
  const subject = isReset 
    ? `[Security] Password Reset Code: ${otp} - Calauan Community Campus Library`
    : `[Verification] Your Verification Code: ${otp} - Calauan Community Campus Library`;

  const htmlContent = generateOtpEmailHtml({ otp, type, studentName });
  const textContent = generateOtpEmailText({ otp, type, studentName });

  return sendEmail({
    to,
    subject,
    htmlContent,
    textContent
  });
}

/**
 * High-level helper to send an Overdue Notice email
 */
async function sendOverdueNotice({ user, book, record, daysOverdue, penaltyAmount, dailyRate = 5 }) {
  const bookTitle = book?.title || 'Borrowed Book';
  const subject = `[Overdue Notice] Please Return "${bookTitle}" - Calauan Community Campus Library`;

  const htmlContent = generateOverdueEmailHtml({ user, book, record, daysOverdue, penaltyAmount, dailyRate });
  const textContent = generateOverdueEmailText({ user, book, record, daysOverdue, penaltyAmount, dailyRate });

  return sendEmail({
    to: user.email,
    subject,
    htmlContent,
    textContent
  });
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendOverdueNotice,
  generateOtpEmailHtml,
  generateOtpEmailText,
  generateOverdueEmailHtml,
  generateOverdueEmailText
};
