import nodemailer from 'nodemailer';
import { APP_NAME, APP_NAME_PARTS } from './branding';

// Create transporter (you can configure this for your email provider)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
};

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const resetUrl = `${process.env.BASE_URL}/auth/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              <!-- Header/Branding -->
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.05em; line-height: 1;">
                    <span style="color: #fafafa;">${APP_NAME_PARTS.primary}</span>
                    <span style="color: #fafafa;"> </span>
                    <span style="background: linear-gradient(to right, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent;">${APP_NAME_PARTS.accent}</span>
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 20px 40px 40px 40px;">
                  <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #fafafa; letter-spacing: -0.025em; text-align: center;">
                    Password Reset Request
                  </h2>
                  <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #a1a1aa; text-align: center;">
                    We received a request to reset the password for your ${APP_NAME} account. Click the button below to choose a new one.
                  </p>
                  
                  <!-- CTA Button -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 20px 0 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #fafafa; color: #09090b; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 10px 15px -3px rgba(255, 255, 255, 0.1);">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <div style="border-top: 1px solid #27272a; padding-top: 24px; margin-top: 10px;">
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #52525b; text-align: center;">
                      If the button doesn't work, copy and paste this link:
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #fbbf24; word-break: break-all; text-align: center; text-decoration: underline;">
                      ${resetUrl}
                    </p>
                  </div>
                  
                  <p style="margin: 32px 0 0 0; font-size: 13px; line-height: 20px; color: #52525b; text-align: center;">
                    This link will expire in 1 hour. If you didn't request this change, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px; background-color: #18181b; border-top: 1px solid #27272a; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #52525b;">
                    &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html,
  });
};

export const sendVerificationEmail = async (email: string, token: string, name: string) => {
  const verifyUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Account</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #09090b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(251, 191, 36, 0.1);">
              <!-- Branding Header -->
              <tr>
                <td style="padding: 40px 40px 10px 40px; text-align: center;">
                  <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.05em; line-height: 1;">
                    <span style="color: #fafafa;">${APP_NAME_PARTS.primary}</span>
                    <span style="color: #fafafa;"> </span>
                    <span style="background: linear-gradient(to right, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent;">${APP_NAME_PARTS.accent}</span>
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px 40px 40px 40px;">
                  <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #fafafa; letter-spacing: -0.025em; text-align: center;">
                    Welcome to the family, ${name}!
                  </h2>
                  <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 26px; color: #a1a1aa; text-align: center;">
                    We're so excited to have you on board! Before you start pasting and organizing your projects, we just need to verify your email address.
                  </p>
                  
                  <!-- Verify Button -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 20px 0 30px 0;">
                        <a href="${verifyUrl}" 
                           style="background: linear-gradient(to right, #fbbf24, #f59e0b); color: #09090b; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 700; display: inline-block; box-shadow: 0 10px 20px rgba(251, 191, 36, 0.2);">
                          Verify Email Address
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-top: 10px;">
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #52525b; text-align: center; font-weight: 500;">
                      Or copy this link to your browser:
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #fbbf24; word-break: break-all; text-align: center; opacity: 0.8;">
                      ${verifyUrl}
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px; background-color: #18181b; border-top: 1px solid #27272a; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #52525b; font-weight: 500;">
                    &copy; ${new Date().getFullYear()} ${APP_NAME}. Built for speed and security.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Verify your ${APP_NAME} account, ${name}!`,
    html,
  });
};
