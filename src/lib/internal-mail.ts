/**
 * src/lib/internal-mail.ts
 *
 * Internal messaging system for GaexPay — replaces external services (Twilio, SendGrid).
 * Uses LWS built-in email service (SMTP) for sending confirmation emails.
 *
 * Configuration (from SystemSetting / .env):
 *   - smtp_host: LWS mail server (e.g., mail.gaexpay.com)
 *   - smtp_port: 465 (SSL) or 587 (TLS)
 *   - smtp_user: email account (e.g., noreply@gaexpay.com)
 *   - smtp_pass: email password
 *   - smtp_from: sender display name
 *
 * If SMTP is not configured, emails are logged to console (dev mode).
 */

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Template HTML wrapper
function emailTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0f0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0d;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981,#14b8a6);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">GaexPay</h1>
              <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:5px 0 0;">Borderless Digital Wallet</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#0a0f0d;font-size:20px;margin:0 0 16px;">${title}</h2>
              <div style="color:#374151;font-size:15px;line-height:1.6;">
                ${content}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 30px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
                © 2025 GaexPay. All rights reserved.<br>
                This is an automated message — please do not reply.<br>
                <a href="https://gaexpay.com" style="color:#10b981;">gaexpay.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Send an email via LWS SMTP or log to console */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST || process.env.GAEXPAY_SMTP_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.GAEXPAY_SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GAEXPAY_SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || "GaexPay <noreply@gaexpay.com>";

  if (!smtpHost || !smtpUser || !smtpPass) {
    // Dev mode: log to console
    console.log(`[internal-mail] To: ${params.to} | Subject: ${params.subject}`);
    console.log(`[internal-mail] Body: ${params.text || params.subject}`);
    return true;
  }

  try {
    // Use Node's built-in net to do a minimal SMTP send
    // In production, use nodemailer or the LWS API
    const nodemailer = await import("nodemailer").catch(() => null);

    if (nodemailer) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 465,
        secure: true,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      console.log(`[internal-mail] Sent to ${params.to}: ${params.subject}`);
      return true;
    }

    // Fallback: log
    console.log(`[internal-mail] (no nodemailer) To: ${params.to} | Subject: ${params.subject}`);
    return true;
  } catch (e) {
    console.error(`[internal-mail] Failed to send to ${params.to}:`, e);
    return false;
  }
}

/** Send welcome email after signup */
export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Welcome to GaexPay! 🎉",
    html: emailTemplate(
      "Welcome to GaexPay!",
      `<p>Hi <strong>${firstName}</strong>,</p>
      <p>Welcome to GaexPay — your borderless digital wallet for Africa and the world.</p>
      <p>Your account has been created successfully. You can now:</p>
      <ul style="padding-left:20px;color:#374151;">
        <li>Send and receive money instantly</li>
        <li>Trade cryptocurrencies at live rates</li>
        <li>Pay bills and buy airtime</li>
        <li>Exchange between 18+ currencies</li>
        <li>And much more!</li>
      </ul>
      <p style="margin-top:20px;">
        <a href="https://gaexpay.com" style="display:inline-block;background:#10b981;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Open GaexPay</a>
      </p>
      <p style="margin-top:16px;font-size:13px;color:#6b7280;">If you didn't create this account, please contact support immediately.</p>`
    ),
    text: `Welcome to GaexPay, ${firstName}! Your account is ready. Visit https://gaexpay.com to get started.`,
  });
}

/** Send account confirmation email */
export async function sendConfirmationEmail(email: string, firstName: string): Promise<void> {
  const confirmUrl = `https://gaexpay.com/api/auth/confirm?email=${encodeURIComponent(email)}`;
  await sendEmail({
    to: email,
    subject: "Confirm Your GaexPay Account ✅",
    html: emailTemplate(
      "Confirm Your Account",
      `<p>Hi <strong>${firstName}</strong>,</p>
      <p>Please confirm your email address to complete your account setup.</p>
      <p style="margin-top:20px;">
        <a href="${confirmUrl}" style="display:inline-block;background:#10b981;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm Email</a>
      </p>
      <p style="margin-top:16px;font-size:13px;color:#6b7280;">Or copy this link: ${confirmUrl}</p>
      <p style="margin-top:12px;font-size:13px;color:#6b7280;">This link expires in 24 hours.</p>`
    ),
    text: `Confirm your GaexPay account. Visit: ${confirmUrl}`,
  });
}

/** Send transfer notification email */
export async function sendTransferEmail(
  email: string,
  firstName: string,
  amount: number,
  currency: string,
  recipientName: string,
  reference: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Transfer Successful — ${currency} ${amount.toLocaleString()}`,
    html: emailTemplate(
      "Transfer Successful",
      `<p>Hi <strong>${firstName}</strong>,</p>
      <p>Your transfer has been completed successfully.</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6b7280;">Amount:</td><td style="padding:8px 0;font-weight:600;text-align:right;">${currency} ${amount.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Recipient:</td><td style="padding:8px 0;font-weight:600;text-align:right;">${recipientName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Reference:</td><td style="padding:8px 0;font-weight:600;text-align:right;font-family:monospace;">${reference}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Status:</td><td style="padding:8px 0;font-weight:600;text-align:right;color:#10b981;">Completed ✅</td></tr>
      </table>
      <p style="margin-top:16px;">
        <a href="https://gaexpay.com" style="display:inline-block;background:#10b981;color:#ffffff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Transaction</a>
      </p>`
    ),
    text: `Transfer of ${currency} ${amount} to ${recipientName} completed. Reference: ${reference}`,
  });
}

/** Send payment received email */
export async function sendReceivedEmail(
  email: string,
  firstName: string,
  amount: number,
  currency: string,
  senderName: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Payment Received — ${currency} ${amount.toLocaleString()} 💰`,
    html: emailTemplate(
      "Payment Received",
      `<p>Hi <strong>${firstName}</strong>,</p>
      <p>You've received a payment!</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6b7280;">Amount:</td><td style="padding:8px 0;font-weight:600;text-align:right;color:#10b981;">+${currency} ${amount.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">From:</td><td style="padding:8px 0;font-weight:600;text-align:right;">${senderName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Status:</td><td style="padding:8px 0;font-weight:600;text-align:right;color:#10b981;">Completed ✅</td></tr>
      </table>
      <p style="margin-top:16px;">
        <a href="https://gaexpay.com" style="display:inline-block;background:#10b981;color:#ffffff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Details</a>
      </p>`
    ),
    text: `You received ${currency} ${amount} from ${senderName}.`,
  });
}
