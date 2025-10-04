# Email Testing Guide

This guide explains how to test email functionality for the DELIVERY Digital contact form.

## Prerequisites

Configure your SMTP credentials in `.env` file:

```env
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=your-email@gmail.com
```

### Gmail Setup

If using Gmail, you need to:
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password as `SMTP_PASS`

## Testing Methods

### 1. Command Line Test Script

Run the test script to verify SMTP configuration:

```bash
npm run test:email
```

Or send to a specific email:

```bash
npm run test:email recipient@example.com
```

This will:
- Check your environment variables
- Verify SMTP connection
- Send a test email
- Display detailed results

### 2. API Endpoint Test

Start the server:

```bash
npm run server
```

Test the endpoint with curl:

```bash
# Test with default email (SMTP_USER)
curl http://localhost:3008/api/contact/test-email

# Test with specific email
curl "http://localhost:3008/api/contact/test-email?email=recipient@example.com"
```

Or visit in browser:
```
http://localhost:3008/api/contact/test-email
```

### 3. Testing from Frontend

If the server is running, you can test via the proxy:

```bash
curl http://localhost:5173/api/contact/test-email
```

## Expected Response

### Success Response

```json
{
  "success": true,
  "message": "Test email sent successfully",
  "details": {
    "messageId": "<unique-id@domain>",
    "from": "your-email@gmail.com",
    "to": "recipient@example.com",
    "smtp": {
      "host": "smtp.gmail.com",
      "port": "587",
      "secure": false
    }
  }
}
```

### Error Response (Missing Config)

```json
{
  "success": false,
  "message": "SMTP credentials not configured",
  "details": {
    "SMTP_USER": "Not set",
    "SMTP_PASS": "Not set",
    "SMTP_HOST": "smtp.gmail.com (default)",
    "SMTP_PORT": "587 (default)"
  }
}
```

### Error Response (Connection Failed)

```json
{
  "success": false,
  "message": "Failed to send test email",
  "error": "Error message",
  "details": {
    "errorCode": "EAUTH",
    "command": "AUTH PLAIN",
    "response": "535-5.7.8 Username and Password not accepted"
  }
}
```

## Troubleshooting

### Common Errors

1. **EAUTH - Authentication failed**
   - Check SMTP_USER and SMTP_PASS are correct
   - For Gmail, use App Password instead of regular password
   - Verify 2FA is enabled on Gmail account

2. **ECONNECTION - Connection refused**
   - Check SMTP_HOST and SMTP_PORT
   - Verify firewall/network settings
   - Ensure port 587 is not blocked

3. **ETIMEDOUT - Connection timeout**
   - Check network connectivity
   - Verify SMTP server is accessible
   - Try different port (465 for secure)

4. **Missing credentials**
   - Ensure .env file exists in project root
   - Check environment variables are set correctly
   - Restart server after updating .env

### Testing Different SMTP Providers

For other email providers, update the SMTP settings:

**Outlook/Office365:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

**Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

**Custom SMTP:**
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
```

## Production Notes

In production:
1. Use environment variables from hosting provider
2. Never commit SMTP credentials to git
3. Monitor email delivery rates
4. Consider using dedicated email services (SendGrid, Mailgun, etc.)
5. Implement rate limiting to prevent abuse
