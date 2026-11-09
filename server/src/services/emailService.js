/**
 * Email Service for LibLog - Calauan Community Campus Library
 * Utilizes Brevo HTTP API (and SendGrid fallback) over HTTPS to bypass Render SMTP port blocks.
 * Falls back to console simulation if no API key is configured.
 * 
 * Templates (Campus Official / Collegiate Academic):
 * 1. Official Penalty Payment Receipt Email (Clearance slip, receipt number, itemized fee breakdown)
 * 2. Overdue Book Circulation Notice Email (Academic notice, itemized overdue fine, return desk guidelines)
 * 3. Security Code / OTP Email (Clean academic security notice, bold monospace verification box)
 * 
 * Antislop Compliance:
 * - Zero em dashes across all HTML, copy, and plaintext fallbacks.
 * - Purposeful collegiate color palette (#6C48C5 violet, #0f172a slate, #059669 emerald, #dc2626 crimson).
 * - Bulletproof table-based layouts with inline styles tested for Outlook, Gmail, Apple Mail, and mobile clients.
 */

const senderEmail = process.env.SENDER_EMAIL || 'noreply@liblog.com';
const senderName = 'Calauan Community Campus Library';
const BACKEND_URL = process.env.BACKEND_URL || 'https://liblog-backend.onrender.com';
const LOGO_URL = process.env.LOGO_URL || `${BACKEND_URL}/public/logo.png`;

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
 * Generates an official deterministic receipt number if one is not provided.
 * Format: CCC-OR-YYYY-XXXXX (e.g. CCC-OR-2026-00042)
 */
function formatReceiptNumber(penaltyId, date = new Date()) {
  const year = date instanceof Date && !isNaN(date.getTime()) ? date.getFullYear() : new Date().getFullYear();
  const idStr = String(penaltyId || '1').padStart(5, '0');
  return `CCC-OR-${year}-${idStr}`;
}

/**
 * Official Penalty Payment Receipt HTML
 * Design: Direction A - Campus Official / Collegiate Academic
 */
function generateReceiptEmailHtml({ user, penalty, book, record, collector, receiptNumber }) {
  const studentName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.student_id || 'Student';
  const studentId = user?.student_id || 'N/A';
  const userEmail = user?.email || '';
  const finalReceiptNo = receiptNumber || formatReceiptNumber(penalty?.id, penalty?.paid_at ? new Date(penalty.paid_at) : new Date());

  const paidDate = penalty?.paid_at ? new Date(penalty.paid_at) : new Date();
  const dateStr = paidDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = paidDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const paidTimestampStr = `${dateStr} at ${timeStr}`;

  const bookTitle = book?.title || penalty?.borrow?.book?.title || 'Library Literature';
  const bookAuthor = book?.author?.name || book?.author || penalty?.borrow?.book?.author?.name || penalty?.borrow?.book?.author || 'Unknown Author';
  const isbnOrLccn = book?.isbn || book?.lccn || penalty?.borrow?.book?.isbn || penalty?.borrow?.book?.lccn || 'N/A';

  const amountNumber = parseFloat(penalty?.amount || 0);
  const formattedAmount = `₱${amountNumber.toFixed(2)}`;

  const penaltyType = String(penalty?.type || 'OVERDUE').toUpperCase();
  let penaltyTypeLabel = 'Overdue Book Fine';
  let penaltyDetailDesc = `${penalty?.days_overdue || 1} day(s) overdue`;
  if (penaltyType === 'DAMAGE' || penaltyType === 'DAMAGED') {
    penaltyTypeLabel = 'Book Damage Fee';
    penaltyDetailDesc = 'Condition assessed as Damaged/Poor upon return';
  } else if (penaltyType === 'LOST') {
    penaltyTypeLabel = 'Lost Book Replacement Fee';
    penaltyDetailDesc = 'Item reported lost, replacement fee assessed';
  }

  const collectorName = collector
    ? `${collector.first_name || ''} ${collector.last_name || ''}`.trim() || collector.student_id || 'Circulation Desk Staff'
    : 'Circulation Desk Staff';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt: ${finalReceiptNo}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Institutional Header Bar -->
          <tr>
            <td style="padding: 24px 28px; background-color: #ffffff; border-bottom: 2px solid #f1f5f9;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 36px; height: 36px; vertical-align: middle; text-align: center;">
                          <img src="${LOGO_URL}" width="36" height="36" alt="CCC Logo" style="display: block; width: 36px; height: 36px; border: 0; outline: none; text-decoration: none;" />
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 14px; font-weight: 800; letter-spacing: 1px; color: #0f172a; display: block; text-transform: uppercase;">Calauan Community Campus</span>
                          <span style="font-size: 11px; color: #64748b; font-weight: 500; display: block;">LibLog Library Services • Circulation Office</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #047857; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 5px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Official Receipt
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Receipt Slip Body -->
          <tr>
            <td style="padding: 28px 28px 32px 28px;">
              
              <!-- Greeting & Status -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                      Payment Confirmation
                    </h1>
                    <p style="margin: 0; font-size: 13.5px; line-height: 1.5; color: #475569;">
                      Dear ${studentName}, this email confirms that your library penalty has been successfully settled at the circulation desk.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Main Amount Paid Slip -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" valign="middle">
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 4px;">
                            Total Amount Paid
                          </span>
                          <span style="font-size: 28px; font-weight: 900; color: #047857; line-height: 1.1; display: block;">
                            ${formattedAmount}
                          </span>
                          <span style="font-size: 11px; color: #059669; font-weight: 600; display: block; margin-top: 4px;">
                            Status: Paid in Full
                          </span>
                        </td>
                        <td align="right" valign="middle">
                          <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; text-align: right; display: inline-block;">
                            <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block;">Receipt No.</span>
                            <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 12.5px; font-weight: 700; color: #0f172a; display: block; margin-top: 2px;">
                              ${finalReceiptNo}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Transaction Line Items Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <tr>
                  <td colspan="2" style="background-color: #f1f5f9; padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.6px;">
                      Transaction Details
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; font-weight: 500; width: 38%;">
                    Student Name
                  </td>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #0f172a; font-weight: 600; text-align: right;">
                    ${studentName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; font-weight: 500;">
                    Student ID
                  </td>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #0f172a; font-weight: 600; text-align: right;">
                    ${studentId}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; font-weight: 500;">
                    Book Title
                  </td>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #0f172a; font-weight: 600; text-align: right;">
                    ${bookTitle}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; font-weight: 500;">
                    Author
                  </td>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #334155; font-weight: 500; text-align: right;">
                    ${bookAuthor}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; font-weight: 500;">
                    ISBN / Call Number
                  </td>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #334155; font-weight: 500; text-align: right;">
                    ${isbnOrLccn}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; font-weight: 500;">
                    Fee Classification
                  </td>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #0f172a; font-weight: 600; text-align: right;">
                    ${penaltyTypeLabel}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; font-weight: 500;">
                    Assessment Notes
                  </td>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #475569; font-weight: 500; text-align: right;">
                    ${penaltyDetailDesc}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; font-weight: 500;">
                    Payment Timestamp
                  </td>
                  <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #0f172a; font-weight: 600; text-align: right;">
                    ${paidTimestampStr}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 500;">
                    Processed By
                  </td>
                  <td style="padding: 10px 16px; font-size: 12.5px; color: #0f172a; font-weight: 600; text-align: right;">
                    ${collectorName}
                  </td>
                </tr>
              </table>

              <!-- Clearance Note Box -->
              <div style="background-color: #f8fafc; border-left: 3px solid #6C48C5; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 12.5px; font-weight: 700; color: #0f172a;">
                  Circulation Clearance Notice
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #475569;">
                  Your library account balance has been updated and this penalty is fully cleared. You may present this electronic receipt or reference number ${finalReceiptNo} at the circulation desk if any verification is requested.
                </p>
              </div>

              <!-- Archival guidance -->
              <p style="margin: 0; font-size: 11.5px; line-height: 1.5; color: #64748b; text-align: center;">
                Please keep this receipt for your records. For questions regarding your borrowing history, visit the Calauan Community Campus Library circulation desk during campus operating hours.
              </p>
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="padding: 18px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #475569;">
                Calauan Community Campus Library • Automated Circulation Management
              </p>
              <p style="margin: 0; font-size: 10px; color: #64748b;">
                Calauan, Laguna, Philippines • This is an automated receipt, please do not reply directly to this email.
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
 * Official Penalty Payment Receipt Plaintext version
 */
function generateReceiptEmailText({ user, penalty, book, record, collector, receiptNumber }) {
  const studentName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.student_id || 'Student';
  const studentId = user?.student_id || 'N/A';
  const finalReceiptNo = receiptNumber || formatReceiptNumber(penalty?.id, penalty?.paid_at ? new Date(penalty.paid_at) : new Date());

  const paidDate = penalty?.paid_at ? new Date(penalty.paid_at) : new Date();
  const dateStr = paidDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = paidDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const bookTitle = book?.title || penalty?.borrow?.book?.title || 'Library Literature';
  const bookAuthor = book?.author?.name || book?.author || penalty?.borrow?.book?.author?.name || penalty?.borrow?.book?.author || 'Unknown Author';

  const amountNumber = parseFloat(penalty?.amount || 0);
  const formattedAmount = `PHP ${amountNumber.toFixed(2)}`;

  const penaltyType = String(penalty?.type || 'OVERDUE').toUpperCase();
  let penaltyTypeLabel = 'Overdue Book Fine';
  if (penaltyType === 'DAMAGE' || penaltyType === 'DAMAGED') penaltyTypeLabel = 'Book Damage Fee';
  if (penaltyType === 'LOST') penaltyTypeLabel = 'Lost Book Replacement Fee';

  const collectorName = collector
    ? `${collector.first_name || ''} ${collector.last_name || ''}`.trim() || collector.student_id || 'Circulation Desk Staff'
    : 'Circulation Desk Staff';

  return `
CALAUAN COMMUNITY CAMPUS LIBRARY
OFFICIAL PENALTY PAYMENT RECEIPT
Receipt Number: ${finalReceiptNo}

Dear ${studentName},

This confirms that your library penalty payment has been successfully recorded and your account has been cleared.

RECEIPT SUMMARY:
- Official Receipt No.: ${finalReceiptNo}
- Student Name: ${studentName}
- Student ID: ${studentId}
- Book Title: ${bookTitle}
- Author: ${bookAuthor}
- Fee Classification: ${penaltyTypeLabel}
- Amount Paid: ${formattedAmount}
- Status: PAID IN FULL
- Payment Timestamp: ${dateStr} at ${timeStr}
- Processed By: ${collectorName}

Your library account balance is now in good standing. Please retain this email confirmation for your records.

Calauan Community Campus Library
Circulation Management System
Calauan, Laguna, Philippines
`.trim();
}

/**
 * Redesigned Overdue Circulation Notice HTML
 * Design: Direction A - Campus Official / Collegiate Academic
 * Supports both consolidated multi-book digests and single-book notices.
 */
function generateOverdueEmailHtml({ user, items = [], book, record, daysOverdue, penaltyAmount, dailyRate = 5 }) {
  const studentName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.student_id || 'Student';
  const studentId = user?.student_id || 'N/A';

  const overdueItems = (items && items.length > 0)
    ? items
    : (book ? [{
        book,
        record,
        daysOverdue: daysOverdue || 0,
        penaltyAmount: penaltyAmount || 0,
        borrowDate: record?.borrow_date,
        dueDate: record?.due_date
      }] : []);

  const itemCount = overdueItems.length;
  const isMultiple = itemCount > 1;
  const totalPenalty = overdueItems.reduce((sum, item) => sum + parseFloat(item.penaltyAmount || 0), 0);
  const maxDaysOverdue = overdueItems.reduce((max, item) => Math.max(max, parseInt(item.daysOverdue || 0, 10)), 0);

  const formattedTotalPenalty = `₱${totalPenalty.toFixed(2)}`;
  const formattedDailyRate = `₱${parseFloat(dailyRate || 5).toFixed(2)}`;

  const itemRowsHtml = overdueItems.map((item, index) => {
    const bTitle = item.book?.title || 'Borrowed Literature';
    const bAuthor = item.book?.author?.name || item.book?.author || 'Unknown Author';
    const rawDue = item.dueDate || item.record?.due_date;
    const dStr = rawDue
      ? new Date(rawDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';
    const rawBorrow = item.borrowDate || item.record?.borrow_date;
    const bStr = rawBorrow
      ? new Date(rawBorrow).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const days = parseInt(item.daysOverdue || 0, 10);
    const itemFine = `₱${parseFloat(item.penaltyAmount || 0).toFixed(2)}`;
    const isLast = index === overdueItems.length - 1;
    const borderStyle = isLast ? '' : 'border-bottom: 1px solid #f1f5f9;';

    return `
      <tr>
        <td style="padding: 12px 14px; ${borderStyle} vertical-align: top;">
          <span style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; line-height: 1.35;">
            ${index + 1}. ${bTitle}
          </span>
          <span style="font-size: 11px; color: #64748b; display: block; margin-top: 3px;">
            By ${bAuthor}${bStr ? ` • Borrowed: ${bStr}` : ''}
          </span>
        </td>
        <td style="padding: 12px 14px; ${borderStyle} font-size: 12px; color: #b91c1c; font-weight: 600; vertical-align: top; white-space: nowrap;">
          ${dStr}
        </td>
        <td style="padding: 12px 14px; ${borderStyle} font-size: 12px; color: #334155; font-weight: 600; text-align: center; vertical-align: top; white-space: nowrap;">
          ${days}d
        </td>
        <td style="padding: 12px 14px; ${borderStyle} font-size: 13px; color: #b91c1c; font-weight: 800; text-align: right; vertical-align: top; white-space: nowrap;">
          ${itemFine}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Overdue Book Circulation Notice</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 24px 28px; background-color: #ffffff; border-bottom: 2px solid #f1f5f9;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 36px; height: 36px; vertical-align: middle; text-align: center;">
                          <img src="${LOGO_URL}" width="36" height="36" alt="CCC Logo" style="display: block; width: 36px; height: 36px; border: 0; outline: none; text-decoration: none;" />
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 14px; font-weight: 800; letter-spacing: 1px; color: #0f172a; display: block; text-transform: uppercase;">Calauan Community Campus</span>
                          <span style="font-size: 11px; color: #64748b; font-weight: 500; display: block;">LibLog Library Services • Circulation Office</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #b91c1c; background-color: #fef2f2; border: 1px solid #fecaca; padding: 5px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Circulation Notice
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 28px 32px 28px;">
              <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                ${isMultiple ? 'Overdue Books Reminder' : 'Overdue Book Reminder'}
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.5; color: #475569;">
                Dear ${studentName} (ID: ${studentId}), library records indicate that ${isMultiple ? `the following ${itemCount} borrowed books have exceeded their loan period` : 'the following borrowed book has exceeded its loan period'} and ${isMultiple ? 'have' : 'has'} not yet been checked in at the circulation desk.
              </p>

              <!-- Highlight Fine Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 22px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" valign="middle">
                          <span style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 4px;">
                            ${isMultiple ? 'Total Accrued Overdue Fines' : 'Accrued Overdue Fine'}
                          </span>
                          <span style="font-size: 28px; font-weight: 900; color: #b91c1c; line-height: 1.1; display: block;">
                            ${formattedTotalPenalty}
                          </span>
                          <span style="font-size: 11px; color: #991b1b; font-weight: 500; display: block; margin-top: 4px;">
                            ${isMultiple ? `${itemCount} items overdue • Rate: ${formattedDailyRate} per calendar day per item` : `Rate: ${formattedDailyRate} per calendar day`}
                          </span>
                        </td>
                        <td align="right" valign="middle">
                          <div style="background-color: #ffffff; border: 1px solid #fca5a5; border-radius: 8px; padding: 8px 14px; text-align: center; display: inline-block;">
                            <span style="font-size: 14px; font-weight: 800; color: #b91c1c; display: block;">
                              ${isMultiple ? `${itemCount} Books` : `${maxDaysOverdue} Days`}
                            </span>
                            <span style="font-size: 10px; font-weight: 600; color: #7f1d1d; text-transform: uppercase; display: block; margin-top: 2px;">
                              Past Due
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Itemized Overdue Books Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px; border-collapse: separate;">
                <thead>
                  <tr style="background-color: #f1f5f9;">
                    <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.6px; text-align: left; border-bottom: 1px solid #e2e8f0;">
                      Overdue Item / Title
                    </th>
                    <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.6px; text-align: left; border-bottom: 1px solid #e2e8f0;">
                      Expected Due
                    </th>
                    <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.6px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                      Days
                    </th>
                    <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.6px; text-align: right; border-bottom: 1px solid #e2e8f0;">
                      Fine
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRowsHtml}
                </tbody>
              </table>

              <!-- Instructions Box -->
              <div style="background-color: #f8fafc; border-left: 3px solid #6C48C5; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 12.5px; font-weight: 700; color: #0f172a;">
                  How to Return:
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #475569;">
                  Please return ${isMultiple ? 'all borrowed books' : 'this book'} to the Calauan Community Campus Library circulation desk during standard operating hours (Monday to Friday, 8:00 AM to 5:00 PM). Handing in the ${isMultiple ? 'books halts' : 'book halts'} further daily penalty calculations immediately.
                </p>
              </div>

              <!-- Polite Note -->
              <p style="margin: 0; font-size: 11.5px; line-height: 1.5; color: #64748b; text-align: center;">
                Promptly returning library materials ensures that essential academic resources remain accessible to your fellow students.
              </p>
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="padding: 18px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #475569;">
                Calauan Community Campus Library • Automated Notification System
              </p>
              <p style="margin: 0; font-size: 10px; color: #64748b;">
                Calauan, Laguna, Philippines • Please do not reply directly to this automated email.
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
 * Redesigned Overdue Circulation Notice Plaintext
 * Supports both consolidated multi-book digests and single-book notices.
 */
function generateOverdueEmailText({ user, items = [], book, record, daysOverdue, penaltyAmount, dailyRate = 5 }) {
  const studentName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.student_id || 'Student';
  const studentId = user?.student_id || 'N/A';

  const overdueItems = (items && items.length > 0)
    ? items
    : (book ? [{
        book,
        record,
        daysOverdue: daysOverdue || 0,
        penaltyAmount: penaltyAmount || 0,
        borrowDate: record?.borrow_date,
        dueDate: record?.due_date
      }] : []);

  const totalPenalty = overdueItems.reduce((sum, item) => sum + parseFloat(item.penaltyAmount || 0), 0);
  const formattedTotalPenalty = `PHP ${totalPenalty.toFixed(2)}`;
  const formattedDailyRate = `PHP ${parseFloat(dailyRate || 5).toFixed(2)}`;
  const isMultiple = overdueItems.length > 1;

  const itemsListText = overdueItems.map((item, index) => {
    const bTitle = item.book?.title || 'Borrowed Literature';
    const bAuthor = item.book?.author?.name || item.book?.author || 'Unknown Author';
    const rawBorrow = item.borrowDate || item.record?.borrow_date;
    const bStr = rawBorrow
      ? new Date(rawBorrow).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';
    const rawDue = item.dueDate || item.record?.due_date;
    const dStr = rawDue
      ? new Date(rawDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';
    const days = parseInt(item.daysOverdue || 0, 10);
    const penalty = `PHP ${parseFloat(item.penaltyAmount || 0).toFixed(2)}`;

    return `${index + 1}. "${bTitle}" by ${bAuthor}\n   - Date Borrowed: ${bStr}\n   - Expected Due Date: ${dStr}\n   - Days Overdue: ${days} day(s)\n   - Accrued Penalty: ${penalty}`;
  }).join('\n\n');

  return `
CALAUAN COMMUNITY CAMPUS LIBRARY
OVERDUE BOOK CIRCULATION NOTICE

Dear ${studentName} (ID: ${studentId}),

This is a reminder from the Calauan Community Campus Library that ${isMultiple ? `you have ${overdueItems.length} borrowed books that have exceeded their loan duration` : 'the following borrowed book has exceeded its loan duration'}:

OVERDUE ITEMS:
${itemsListText}

TOTAL ACCRUED OVERDUE FINES: ${formattedTotalPenalty} (${formattedDailyRate} per calendar day per item)

RETURN GUIDELINES:
Please return ${isMultiple ? 'all borrowed items' : 'this book'} directly to the Calauan Community Campus Library circulation desk during campus hours (Monday to Friday, 8:00 AM to 5:00 PM). Returning items freezes further overdue calculations immediately.

Calauan Community Campus Library
Automated Notification System
Calauan, Laguna, Philippines
`.trim();
}

/**
 * Redesigned OTP Verification & Password Reset HTML
 * Design: Direction A - Campus Official / Collegiate Academic
 */
function generateOtpEmailHtml({ otp, type = 'verify', studentName = 'Student' }) {
  const isReset = type === 'reset';
  const actionTitle = isReset ? 'Password Reset' : 'Account Verification';
  const actionDescription = isReset 
    ? 'Here is the one-time security code required to reset your LibLog account password:'
    : 'Here is the one-time security code required to verify and activate your LibLog account:';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${actionTitle} - Calauan Community Campus Library</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 24px 28px; background-color: #ffffff; border-bottom: 2px solid #f1f5f9;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 36px; height: 36px; vertical-align: middle; text-align: center;">
                          <img src="${LOGO_URL}" width="36" height="36" alt="CCC Logo" style="display: block; width: 36px; height: 36px; border: 0; outline: none; text-decoration: none;" />
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 14px; font-weight: 800; letter-spacing: 1px; color: #0f172a; display: block; text-transform: uppercase;">Calauan Community Campus</span>
                          <span style="font-size: 11px; color: #64748b; font-weight: 500; display: block;">LibLog Library Services • Account Security</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #6C48C5; background-color: #f5f3ff; border: 1px solid #ddd6fe; padding: 5px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${isReset ? 'Security Alert' : 'Verification'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 28px 32px 28px;">
              <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                Dear ${studentName},
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.5; color: #475569;">
                ${actionDescription}
              </p>

              <!-- MONOSPACE CODE BOX -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                <tr>
                  <td align="center" style="background-color: #f5f3ff; border: 2px dashed #c4b5fd; border-radius: 10px; padding: 22px 16px;">
                    <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; color: #581c87; letter-spacing: 8px; display: inline-block; line-height: 1;">
                      ${otp}
                    </span>
                    <span style="display: block; font-size: 11.5px; font-weight: 600; color: #6b21a8; margin-top: 10px;">
                      Valid for 10 minutes
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Security Information Note -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #334155;">
                  This verification code was generated from a ${isReset ? 'password reset' : 'sign-up'} request on the LibLog library portal.
                </p>
                <p style="margin: 0; font-size: 11.5px; line-height: 1.5; color: #64748b;">
                  <strong>Security Note:</strong> Never share this code with anyone. Library personnel will never ask for your verification code or password. If you did not make this request, you may safely ignore this message.
                </p>
              </div>

              <!-- Support Note -->
              <p style="margin: 0; font-size: 11.5px; line-height: 1.5; color: #64748b; text-align: center;">
                Need assistance? Visit the Calauan Community Campus Library circulation desk during campus operating hours.
              </p>
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="padding: 18px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #475569;">
                Calauan Community Campus Library • Automated Notification System
              </p>
              <p style="margin: 0; font-size: 10px; color: #64748b;">
                Calauan, Laguna, Philippines • Please do not reply directly to this automated email.
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
 * Redesigned OTP Verification & Password Reset Plaintext
 */
function generateOtpEmailText({ otp, type = 'verify', studentName = 'Student' }) {
  const isReset = type === 'reset';
  return `
CALAUAN COMMUNITY CAMPUS LIBRARY
${isReset ? 'PASSWORD RESET' : 'ACCOUNT VERIFICATION'} CODE

Dear ${studentName},

Here is your one-time security code for your LibLog account:

================================
        ${otp}
================================

This code will expire in 10 minutes.
Never share this security code with anyone.

If you did not request this code, you may safely ignore this message.

Calauan Community Campus Library
Automated Notification System
Calauan, Laguna, Philippines
`.trim();
}

/**
 * High-level helper to send an OTP email
 */
async function sendOtpEmail({ to, otp, type = 'verify', studentName = 'Student' }) {
  const isReset = type === 'reset';
  const subject = isReset 
    ? `[Security] Password Reset Code: ${otp} (Calauan Community Campus Library)`
    : `[Verification] Your Verification Code: ${otp} (Calauan Community Campus Library)`;

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
 * Supports both consolidated multi-book digests and single-book notices.
 */
async function sendOverdueNotice({ user, items = [], book, record, daysOverdue, penaltyAmount, dailyRate = 5 }) {
  const overdueItems = (items && items.length > 0)
    ? items
    : (book ? [{
        book,
        record,
        daysOverdue: daysOverdue || 0,
        penaltyAmount: penaltyAmount || 0,
        borrowDate: record?.borrow_date,
        dueDate: record?.due_date
      }] : []);

  const count = overdueItems.length;
  const subject = count === 1
    ? `[Circulation Notice] Overdue Book Reminder: "${overdueItems[0]?.book?.title || 'Borrowed Book'}" (Calauan Community Campus Library)`
    : `[Circulation Notice] Overdue Books Reminder: ${count} Books Overdue (Calauan Community Campus Library)`;

  const htmlContent = generateOverdueEmailHtml({ user, items: overdueItems, dailyRate });
  const textContent = generateOverdueEmailText({ user, items: overdueItems, dailyRate });

  return sendEmail({
    to: user.email,
    subject,
    htmlContent,
    textContent
  });
}

/**
 * High-level helper to send a Penalty Payment Receipt email
 */
async function sendPenaltyReceiptEmail({ user, penalty, book, record, collector, receiptNumber }) {
  if (!user?.email) {
    throw new Error('User has no registered email address.');
  }

  const finalReceiptNo = receiptNumber || formatReceiptNumber(penalty?.id, penalty?.paid_at ? new Date(penalty.paid_at) : new Date());
  const subject = `[Official Receipt] Library Penalty Payment: ${finalReceiptNo} (Calauan Community Campus Library)`;

  const htmlContent = generateReceiptEmailHtml({ user, penalty, book, record, collector, receiptNumber: finalReceiptNo });
  const textContent = generateReceiptEmailText({ user, penalty, book, record, collector, receiptNumber: finalReceiptNo });

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
  sendPenaltyReceiptEmail,
  formatReceiptNumber,
  generateReceiptEmailHtml,
  generateReceiptEmailText,
  generateOtpEmailHtml,
  generateOtpEmailText,
  generateOverdueEmailHtml,
  generateOverdueEmailText
};
