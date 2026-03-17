# Email Setup for Forgot Password Feature

## Required Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Email Configuration (Required for forgot password functionality)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

## Gmail Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Navigate to Security > 2-Step Verification
   - Scroll down to "App passwords"
   - Generate a new app password for "Mail"
   - Use this app password as your `SMTP_PASS` value

## Alternative Email Providers

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo Mail
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Custom SMTP Server
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Testing the Feature

1. Add the email environment variables to your `.env.local` file
2. Restart your development server
3. Go to `/auth/signin`
4. Click "Forgot your password?"
5. Enter your email address
6. Check your email for the reset link

## Important Notes

- The reset token expires after 1 hour
- For security, the system doesn't reveal whether an email exists in the database
- Make sure your `BASE_URL` environment variable is set correctly for production