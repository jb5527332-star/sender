# SMTP Configuration Setup Guide

This guide will help you fix the email sending error by configuring proper SMTP credentials.

## The Problem

You're getting this error because the application was configured with invalid SMTP credentials:
```
Error: Can't send mail - all recipients were rejected: 450 4.1.8 <no-reply@usptotrademarkfiler.com>: Sender address rejected: Domain not found
```

The domain `usptotrademarkfiler.com` doesn't exist, which is why the SMTP server rejects the sender address.

## Solution

### Step 1: Configure Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values with your actual SMTP credentials

### Step 2: Choose Your SMTP Provider

#### Option A: Gmail (Recommended for testing)
 
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Update .env.local**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_REJECT_UNAUTHORIZED=false
   ```

#### Option B: Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
SMTP_REJECT_UNAUTHORIZED=false
```

#### Option C: Yahoo Mail

1. **Enable App Passwords** in Yahoo Account Security
2. **Update .env.local**:
   ```env
   SMTP_HOST=smtp.mail.yahoo.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@yahoo.com
   SMTP_PASS=your-app-password
   SMTP_FROM_EMAIL=your-email@yahoo.com
   SMTP_REJECT_UNAUTHORIZED=false
   ```

#### Option D: Custom SMTP Provider

If you have a custom SMTP provider (like Hostinger, GoDaddy, etc.):

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
SMTP_FROM_EMAIL=your-email@yourdomain.com
SMTP_REJECT_UNAUTHORIZED=false
```

### Step 3: Restart Your Development Server

After updating the `.env.local` file:

1. Stop your development server (Ctrl+C)
2. Restart it with `npm run dev`
3. The new environment variables will be loaded

### Step 4: Test Email Sending

1. Fill out the email form in your application
2. Try sending a test email
3. Check the console for any error messages

## Troubleshooting

### Common Issues:

1. **"Invalid login" error**:
   - Double-check your email and password
   - For Gmail: Make sure you're using an App Password, not your regular password
   - For Yahoo: Make sure App Passwords are enabled

2. **"Connection timeout" error**:
   - Check if your firewall/antivirus is blocking the connection
   - Try a different SMTP port (465 for secure connections)

3. **"Self signed certificate" error**:
   - Set `SMTP_REJECT_UNAUTHORIZED=false` in your .env.local

4. **Still getting domain errors**:
   - Make sure you restarted your development server
   - Check that your .env.local file is in the project root
   - Verify the environment variables are being loaded correctly

### Testing with Different Providers:

If one provider doesn't work, try another. Gmail is usually the most reliable for testing purposes.

## Security Notes

- Never commit your `.env.local` file to version control
- Use App Passwords instead of regular passwords when available
- Consider using a dedicated email account for testing
- The `.env.local` file is already in `.gitignore` to prevent accidental commits

## Example Working Configuration (Gmail)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=testaccount@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM_EMAIL=testaccount@gmail.com
SMTP_REJECT_UNAUTHORIZED=false
```

Replace `testaccount@gmail.com` with your actual Gmail address and `abcd efgh ijkl mnop` with your actual 16-character App Password (spaces included).