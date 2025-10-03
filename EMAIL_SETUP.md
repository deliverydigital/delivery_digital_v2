# Email & CAPTCHA Configuration

This document explains how to configure email functionality for both the Contact form and Reclamation form.

## Forms Overview

1. **Contact Form** (`/contact`):
   - Sends emails to `contact@deliverydigital.fr` and confirmation to customer
   - Multi-step form with project details (budget, timeline)
   - Downloads confidentiality agreement

2. **Reclamation Form** (`/reclamation`):
   - Sends complaint emails to `contact@deliverydigital.fr` and confirmation to customer
   - Includes reCAPTCHA v2 spam protection
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

# Google reCAPTCHA Configuration
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
```

### 2. Google reCAPTCHA Setup

To prevent spam submissions, the form uses Google reCAPTCHA v2:

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **Create** or **+** button
3. Fill in the form:
   - **Label**: "DELIVERY Digital - Reclamation Form"
   - **reCAPTCHA type**: Select "reCAPTCHA v2" → "I'm not a robot" checkbox
   - **Domains**: Add your domain(s):
     - `localhost` (for development)
     - `deliverydigital.fr` (for production)
     - Any other domains where you'll deploy the form
4. Accept the terms and click **Submit**
5. Copy the **Site Key** and use it as `VITE_RECAPTCHA_SITE_KEY`
6. Copy the **Secret Key** and use it as `RECAPTCHA_SECRET_KEY`

**Note**: The Site Key is public and used in the frontend, while the Secret Key must remain private and is used for backend verification.

### 3. Gmail Setup (Recommended)

If using Gmail, you'll need to create an **App Password**:

1. Go to your Google Account settings
2. Select **Security**
3. Enable **2-Step Verification** (if not already enabled)
4. Click on **App passwords**
5. Select **Mail** and **Other (Custom name)**
6. Generate the password
7. Copy the 16-character password and use it as `SMTP_PASS`

### 4. Alternative SMTP Providers

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

1. **CAPTCHA Verification**: The form validates the reCAPTCHA token to prevent spam
   - Frontend validates that CAPTCHA was completed
   - Backend verifies the token with Google's API
   - Submission is rejected if verification fails

2. **Email to Company**: A detailed complaint notification is sent to `contact@deliverydigital.fr` with:
   - Customer information (name, email, phone, company)
   - Order number (if provided)
   - Complaint category and subject
   - Full description
   - Submission timestamp
   - Alert about 48-hour response requirement

3. **Confirmation Email to Customer**: Automatic confirmation with:
   - Acknowledgment of receipt
   - Subject of their complaint
   - Expected response time (24-48 business hours)
   - Contact information for urgent matters

## Testing

### For Development/Testing

For testing purposes, you can use Google's test keys that always pass:

```env
# Test keys - CAPTCHA always passes (for development only)
VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

**Warning**: These test keys should NEVER be used in production!

### Testing the Forms

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
1. Make sure your `.env` file has valid SMTP credentials and reCAPTCHA keys
2. Navigate to: `http://localhost:5173/reclamation`
3. Fill out the form
4. Complete the CAPTCHA verification
5. Submit the form
6. Check both emails (`contact@deliverydigital.fr` and customer email)

## Troubleshooting

### "Please complete the security verification" Error

- Make sure you've checked the "I'm not a robot" checkbox
- Ensure your reCAPTCHA keys are correctly configured
- Check browser console for any JavaScript errors

### "CAPTCHA verification failed" Error

- Verify both `VITE_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` are correct
- Ensure the domain is registered in your reCAPTCHA admin console
- Check that the Secret Key matches the Site Key
- For development, you can use the test keys provided above

### "Failed to submit reclamation" Error

- Verify SMTP credentials are correct
- Check that the SMTP host and port are accessible
- For Gmail, ensure you're using an App Password, not your regular password
- Check server logs for detailed error messages

### Emails Not Received

- Check spam/junk folders
- Verify `SMTP_FROM` is a valid email address
- Ensure your SMTP provider allows sending from the specified domain
- Check SMTP provider's sending limits

### CAPTCHA Not Displaying

- Check that `VITE_RECAPTCHA_SITE_KEY` is set in your `.env` file
- Ensure the environment variable starts with `VITE_` (required for Vite)
- Restart your development server after changing environment variables
- Check browser console for loading errors

## Security Notes

- **Never commit** your `.env` file with real credentials to version control
- Use App Passwords or API keys instead of regular passwords
- Keep SMTP credentials and reCAPTCHA Secret Key secure
- Rotate credentials periodically
- The reCAPTCHA Site Key (starting with `VITE_`) is public and safe to expose in frontend code
- The reCAPTCHA Secret Key must NEVER be exposed in frontend code or committed to repositories
- Consider using environment-specific credentials (development vs production)

## Production Deployment

For production, ensure:

1. SMTP credentials are set as environment variables on your hosting platform
2. Use a professional email service (SendGrid, Mailgun, etc.) for reliability
3. Register your production domain in the reCAPTCHA admin console
4. Use production reCAPTCHA keys (not the test keys)
5. Set both frontend (`VITE_RECAPTCHA_SITE_KEY`) and backend (`RECAPTCHA_SECRET_KEY`) environment variables
6. Monitor email delivery and bounce rates
7. Set up SPF, DKIM, and DMARC records for your domain to improve deliverability
8. Monitor reCAPTCHA analytics in the admin console for spam detection insights
