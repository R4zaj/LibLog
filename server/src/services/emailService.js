/**
 * Email Service for LibLog
 * Utilizes Brevo HTTP API (and SendGrid fallback) over HTTPS to bypass Render SMTP port blocks.
 * Falls back to detailed console simulation if no API key is configured.
 */

async function sendEmail({ to, subject, htmlContent, textContent }) {
  const senderEmail = process.env.SENDER_EMAIL || 'noreply@liblog.com';
  const senderName = 'CCC LibLog Library';

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
    console.log('--- Content Summary ---');
    console.log(textContent || '(HTML Content rendered)');
    console.log('=================================================================================\n');
    return { success: true, simulated: true };
  }
}

/**
 * Sends a rich HTML overdue book notice to the student
 */
async function sendOverdueNotice({ user, book, record, daysOverdue, penaltyAmount }) {
  const studentName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.student_id;
  const bookTitle = book?.title || 'Borrowed Book';
  const bookAuthor = book?.author?.name || book?.author || 'Unknown Author';
  const borrowDateStr = record?.borrow_date
    ? new Date(record.borrow_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';
  const dueDateStr = record?.due_date
    ? new Date(record.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';
  const formattedPenalty = `₱${parseFloat(penaltyAmount || 0).toFixed(2)}`;

  const subject = `[Overdue Notice] Please Return "${bookTitle}" - CCC LibLog Library`;

  const textContent = `
Dear ${studentName},

This is an urgent reminder from the City College of Calamba Library (LibLog).
The book "${bookTitle}" borrowed by you on ${borrowDateStr} was due on ${dueDateStr}.
It is currently ${daysOverdue} day(s) overdue.

Accrued Penalty: ${formattedPenalty}

Please return the book immediately to the library circulation counter to prevent additional overdue fees and possible suspension of borrowing privileges.

Library Hours: Monday - Friday, 8:00 AM - 5:00 PM
City College of Calamba Library
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .alert-banner { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 24px 24px 0; border-radius: 8px; }
    .alert-title { color: #991b1b; font-weight: 700; font-size: 15px; margin: 0 0 4px; display: flex; align-items: center; }
    .alert-desc { color: #b91c1c; font-size: 13px; margin: 0; line-height: 1.5; }
    .content { padding: 24px; }
    .greeting { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 16px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { font-weight: 600; color: #0f172a; text-align: right; }
    .penalty-row .value { color: #dc2626; font-size: 15px; font-weight: 800; }
    .instructions { background: #eff6ff; border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #1e40af; line-height: 1.5; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CCC LibLog Library</h1>
      <p>Automated Circulation Notification System</p>
    </div>

    <div class="alert-banner">
      <div class="alert-title">⚠️ OVERDUE BOOK NOTICE</div>
      <div class="alert-desc">The borrowing period for this book has elapsed. Please return it as soon as possible.</div>
    </div>

    <div class="content">
      <div class="greeting">Dear ${studentName},</div>
      <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
        Our circulation records indicate that the book listed below is currently overdue. Please review the details:
      </p>

      <div class="card">
        <div class="row">
          <span class="label">Book Title</span>
          <span class="value" style="max-width: 280px;">${bookTitle}</span>
        </div>
        <div class="row">
          <span class="label">Author</span>
          <span class="value">${bookAuthor}</span>
        </div>
        <div class="row">
          <span class="label">Date Borrowed</span>
          <span class="value">${borrowDateStr}</span>
        </div>
        <div class="row">
          <span class="label">Original Due Date</span>
          <span class="value" style="color: #ea580c;">${dueDateStr}</span>
        </div>
        <div class="row">
          <span class="label">Days Overdue</span>
          <span class="value" style="color: #dc2626;">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</span>
        </div>
        <div class="row penalty-row">
          <span class="label" style="color: #991b1b; font-weight: 700;">Accrued Penalty</span>
          <span class="value">${formattedPenalty}</span>
        </div>
      </div>

      <div class="instructions">
        <strong>Return Instructions:</strong><br>
        Please bring this book to the <strong>City College of Calamba Library Circulation Desk</strong> during standard operating hours (Monday to Friday, 8:00 AM – 5:00 PM). Settling overdue items promptly keeps library resources available to all students.
      </div>
    </div>

    <div class="footer">
      This is an automated notification sent from the CCC LibLog Library System.<br>
      City College of Calamba • Old Municipal Site, Burgos St., Calamba City, Laguna
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: user.email,
    subject: subject,
    htmlContent: htmlContent,
    textContent: textContent
  });
}

module.exports = {
  sendEmail,
  sendOverdueNotice
};
