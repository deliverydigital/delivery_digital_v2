import express from 'express';
import nodemailer from 'nodemailer';
import axios from 'axios';

const router = express.Router();

// Create nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Verify reCAPTCHA token
const verifyCaptcha = async (token) => {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    // Skip verification in development if no secret key is set
    if (!secretKey && process.env.NODE_ENV === 'development') {
      console.warn('Warning: RECAPTCHA_SECRET_KEY not set. Skipping verification in development mode.');
      return true;
    }

    if (!secretKey) {
      throw new Error('RECAPTCHA_SECRET_KEY is not configured');
    }

    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: token
        }
      }
    );

    return response.data.success;
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error);
    return false;
  }
};

// Submit reclamation
router.post('/submit', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      orderNumber,
      category,
      subject,
      description,
      captchaToken
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !category || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    // Verify CAPTCHA
    if (!captchaToken) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification is required'
      });
    }

    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification failed. Please try again.'
      });
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP credentials not configured');
      return res.status(500).json({
        success: false,
        message: 'Email service not configured. Please contact the administrator.'
      });
    }

    // Create email content
    const categoryLabels = {
      service: 'Qualité du service / Service Quality',
      product: 'Produit/Livrable / Product/Deliverable',
      billing: 'Facturation / Billing',
      support: 'Support technique / Technical Support',
      training: 'Formation / Training',
      other: 'Autre / Other'
    };

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
    }
    .field {
      margin-bottom: 15px;
    }
    .label {
      font-weight: bold;
      color: #1f2937;
    }
    .value {
      color: #4b5563;
      margin-top: 5px;
    }
    .footer {
      background-color: #1f2937;
      color: #9ca3af;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      border-radius: 0 0 8px 8px;
    }
    .alert {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Nouvelle Réclamation / New Complaint</h1>
    </div>
    <div class="content">
      <div class="alert">
        <strong>⚠️ Attention:</strong> Cette réclamation nécessite une réponse sous 48h ouvrées.<br>
        <strong>⚠️ Attention:</strong> This complaint requires a response within 48 business hours.
      </div>

      <div class="field">
        <div class="label">Nom complet / Full Name:</div>
        <div class="value">${firstName} ${lastName}</div>
      </div>

      <div class="field">
        <div class="label">Email:</div>
        <div class="value">${email}</div>
      </div>

      ${phone ? `
      <div class="field">
        <div class="label">Téléphone / Phone:</div>
        <div class="value">${phone}</div>
      </div>
      ` : ''}

      ${company ? `
      <div class="field">
        <div class="label">Entreprise / Company:</div>
        <div class="value">${company}</div>
      </div>
      ` : ''}

      ${orderNumber ? `
      <div class="field">
        <div class="label">Numéro de commande / Order Number:</div>
        <div class="value">${orderNumber}</div>
      </div>
      ` : ''}

      <div class="field">
        <div class="label">Catégorie / Category:</div>
        <div class="value">${categoryLabels[category] || category}</div>
      </div>

      <div class="field">
        <div class="label">Objet / Subject:</div>
        <div class="value">${subject}</div>
      </div>

      <div class="field">
        <div class="label">Description:</div>
        <div class="value" style="white-space: pre-wrap;">${description}</div>
      </div>

      <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">

      <p style="font-size: 12px; color: #6b7280;">
        Date de soumission / Submission date: ${new Date().toLocaleString('fr-FR', {
          dateStyle: 'full',
          timeStyle: 'short'
        })}
      </p>
    </div>
    <div class="footer">
      DELIVERY Digital Nice - Système de gestion des réclamations<br>
      470 promenade des anglais, 06200 Nice
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'contact@deliverydigital.fr',
      replyTo: email,
      subject: `[RÉCLAMATION] ${subject}`,
      html: emailContent
    });

    // Send confirmation email to customer
    const confirmationEmail = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #10b981;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
    }
    .footer {
      background-color: #1f2937;
      color: #9ca3af;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      border-radius: 0 0 8px 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Réclamation bien reçue / Complaint Received</h1>
    </div>
    <div class="content">
      <p>Bonjour ${firstName} ${lastName},</p>
      <p>Hello ${firstName} ${lastName},</p>

      <p>
        Nous avons bien reçu votre réclamation concernant: <strong>${subject}</strong><br>
        We have received your complaint regarding: <strong>${subject}</strong>
      </p>

      <p>
        Notre équipe analysera votre demande et vous répondra dans un délai de 24 à 48 heures ouvrées.<br>
        Our team will analyze your request and respond to you within 24 to 48 business hours.
      </p>

      <p>
        Si vous avez des questions urgentes, vous pouvez nous contacter directement à:<br>
        If you have urgent questions, you can contact us directly at:
      </p>

      <ul>
        <li>Email: contact@deliverydigital.fr</li>
        <li>Téléphone / Phone: 07 49 70 77 73</li>
      </ul>

      <p>
        Cordialement,<br>
        L'équipe DELIVERY Digital Nice
      </p>
    </div>
    <div class="footer">
      DELIVERY Digital Nice<br>
      470 promenade des anglais, 06200 Nice
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Confirmation de votre réclamation / Complaint Confirmation',
      html: confirmationEmail
    });

    res.json({
      success: true,
      message: 'Reclamation submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting reclamation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit reclamation',
      error: error.message
    });
  }
});

export default router;
