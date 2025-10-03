# Email Configuration

This document explains how to configure email functionality for both the Contact form and Reclamation form.

## Forms Overview

1. **Contact Form** (`/contact`):
   - Sends emails to `contact@deliverydigital.fr` and confirmation to customer
   - Multi-step form with project details (budget, timeline)
   - Downloads confidentiality agreement

2. **Reclamation Form** (`/reclamation`):
   - Sends complaint emails to `contact@deliverydigital.fr` and confirmation to customer
   - Priority handling for customer complaints

## Configuration

### 1. Update Environment Variables

Edit your `.env` file and add the following configuration:

```env
# SMTP Configuration for Email Sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=contact@deliverydigital.fr
```

### 2. Gmail Setup (Recommended)

If using Gmail, you'll need to create an **App Password**:

1. Go to your Google Account settings
2. Select **Security**
3. Enable **2-Step Verification** (if not already enabled)
4. Click on **App passwords**
5. Select **Mail** and **Other (Custom name)**
6. Generate the password
7. Copy the 16-character password and use it as `SMTP_PASS`

### 3. Alternative SMTP Providers

You can use other SMTP providers by updating the configuration:

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=contact@deliverydigital.fr
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
SMTP_FROM=contact@deliverydigital.fr
```

#### Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=contact@deliverydigital.fr
```

## How It Works

### Contact Form Flow

When a customer submits the contact form:

1. **Multi-Step Form**: Collects customer information, project details (budget, timeline)
2. **Confidentiality Agreement**: Generates and displays a confidentiality agreement
3. **Download Agreement**: Customer downloads the agreement
4. **Email to Company**: A detailed message is sent to `contact@deliverydigital.fr` with:
   - Customer information (name, email, phone)
   - Project subject
   - Budget and timeline preferences
   - Full message
   - Submission timestamp
5. **Confirmation Email to Customer**: Automatic confirmation with:
   - Acknowledgment of receipt
   - Summary of their request
   - Expected response time (24-48 business hours)
   - Contact information

### Reclamation Form Flow

When a customer submits a complaint:

1. **Email to Company**: A detailed complaint notification is sent to `contact@deliverydigital.fr` with:
   - Customer information (name, email, phone, company)
   - Order number (if provided)
   - Complaint category and subject
   - Full description
   - Submission timestamp
   - Alert about 48-hour response requirement

2. **Confirmation Email to Customer**: Automatic confirmation with:
   - Acknowledgment of receipt
   - Subject of their complaint
   - Expected response time (24-48 business hours)
   - Contact information for urgent matters

## Testing

To test the complete functionality:

**Contact Form:**
1. Make sure your `.env` file has valid SMTP credentials
2. Start the server: `npm run server`
3. Start the frontend: `npm run dev`
4. Navigate to: `http://localhost:5173/#contact`
5. Fill out the 3-step form
6. Review and download the confidentiality agreement
7. Click "Télécharger et envoyer"
8. Check both emails (`contact@deliverydigital.fr` and customer email)

**Reclamation Form:**
1. Make sure your `.env` file has valid SMTP credentials
2. Navigate to: `http://localhost:5173/reclamation`
3. Fill out the form
4. Submit the form
5. Check both emails (`contact@deliverydigital.fr` and customer email)

## Troubleshooting

### "Failed to submit form" Error

- Verify SMTP credentials are correct
- Check that the SMTP host and port are accessible
- For Gmail, ensure you're using an App Password, not your regular password
- Check server logs for detailed error messages

### Emails Not Received

- Check spam/junk folders
- Verify `SMTP_FROM` is a valid email address
- Ensure your SMTP provider allows sending from the specified domain
- Check SMTP provider's sending limits

## Security Notes

- **Never commit** your `.env` file with real credentials to version control
- Use App Passwords or API keys instead of regular passwords
- Keep SMTP credentials secure
- Rotate credentials periodically
- Consider using environment-specific credentials (development vs production)
- Consider implementing rate limiting to prevent spam submissions

## Production Deployment

For production, ensure:

1. SMTP credentials are set as environment variables on your hosting platform
2. Use a professional email service (SendGrid, Mailgun, etc.) for reliability
3. Monitor email delivery and bounce rates
4. Set up SPF, DKIM, and DMARC records for your domain to improve deliverability
5. Consider implementing rate limiting or alternative spam protection if needed
