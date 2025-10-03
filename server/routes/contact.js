import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

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

router.post('/submit', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      budget,
      timeline,
      message
    } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    const budgetLabels = {
      small: 'Petit budget (< 5K€) / Small budget (< 5K€)',
      medium: 'Budget moyen (5-20K€) / Medium budget (5-20K€)',
      large: 'Grand budget (> 20K€) / Large budget (> 20K€)'
    };

    const timelineLabels = {
      urgent: 'Urgent (< 1 mois) / Urgent (< 1 month)',
      normal: 'Normal (1-3 mois) / Normal (1-3 months)',
      flexible: 'Flexible (> 3 mois) / Flexible (> 3 months)'
    };

    const companyEmailContent = `
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
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
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
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 5px;
    }
    .badge-blue {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .badge-green {
      background-color: #d1fae5;
      color: #065f46;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 Nouveau Message de Contact</h1>
      <p style="margin: 0; opacity: 0.9;">New Contact Form Submission</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">👤 Nom complet / Full Name:</div>
        <div class="value">${name}</div>
      </div>

      <div class="field">
        <div class="label">📧 Email:</div>
        <div class="value"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></div>
      </div>

      ${phone ? `
      <div class="field">
        <div class="label">📞 Téléphone / Phone:</div>
        <div class="value">${phone}</div>
      </div>
      ` : ''}

      ${subject ? `
      <div class="field">
        <div class="label">📋 Sujet / Subject:</div>
        <div class="value">${subject}</div>
      </div>
      ` : ''}

      ${budget ? `
      <div class="field">
        <div class="label">💰 Budget:</div>
        <div class="value">
          <span class="badge badge-blue">${budgetLabels[budget] || budget}</span>
        </div>
      </div>
      ` : ''}

      ${timeline ? `
      <div class="field">
        <div class="label">⏱️ Délai / Timeline:</div>
        <div class="value">
          <span class="badge badge-green">${timelineLabels[timeline] || timeline}</span>
        </div>
      </div>
      ` : ''}

      <div class="field">
        <div class="label">💬 Message:</div>
        <div class="value" style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">${message}</div>
      </div>

      <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">

      <p style="font-size: 12px; color: #6b7280;">
        📅 Date de réception / Date received: ${new Date().toLocaleString('fr-FR', {
          dateStyle: 'full',
          timeStyle: 'short'
        })}
      </p>
    </div>
    <div class="footer">
      DELIVERY Digital Nice - Formulaire de contact<br>
      470 promenade des anglais, 06200 Nice
    </div>
  </div>
</body>
</html>
    `;

    const customerConfirmationEmail = `
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
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
    .highlight-box {
      background-color: #dbeafe;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Message bien reçu !</h1>
      <p style="margin: 0; opacity: 0.9;">Message Received!</p>
    </div>
    <div class="content">
      <p>Bonjour <strong>${name}</strong>,</p>
      <p>Hello <strong>${name}</strong>,</p>

      <p>
        Nous avons bien reçu votre message et nous vous remercions de votre intérêt pour DELIVERY Digital.<br>
        We have received your message and thank you for your interest in DELIVERY Digital.
      </p>

      <div class="highlight-box">
        <p style="margin: 0;">
          <strong>⏱️ Délai de réponse / Response time:</strong><br>
          Notre équipe analysera votre demande et vous répondra dans un délai de 24 à 48 heures ouvrées.<br>
          Our team will analyze your request and respond to you within 24 to 48 business hours.
        </p>
      </div>

      <p>
        <strong>📋 Résumé de votre demande / Summary of your request:</strong>
      </p>
      <ul style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
        ${subject ? `<li><strong>Sujet:</strong> ${subject}</li>` : ''}
        ${budget ? `<li><strong>Budget:</strong> ${budgetLabels[budget] || budget}</li>` : ''}
        ${timeline ? `<li><strong>Délai:</strong> ${timelineLabels[timeline] || timeline}</li>` : ''}
      </ul>

      <p>
        Si vous avez des questions urgentes, vous pouvez nous contacter directement:<br>
        If you have urgent questions, you can contact us directly:
      </p>

      <ul>
        <li>📧 Email: <a href="mailto:contact@deliverydigital.fr" style="color: #2563eb;">contact@deliverydigital.fr</a></li>
        <li>📞 Téléphone / Phone: <a href="tel:0749707773" style="color: #2563eb;">07 49 70 77 73</a></li>
        <li>🏢 Adresse: 470 promenade des anglais, 06200 Nice</li>
      </ul>

      <p>
        À très bientôt,<br>
        L'équipe DELIVERY Digital Nice
      </p>
    </div>
    <div class="footer">
      DELIVERY Digital Nice<br>
      470 promenade des anglais, 06200 Nice<br>
      <a href="mailto:contact@deliverydigital.fr" style="color: #9ca3af;">contact@deliverydigital.fr</a> |
      <a href="tel:0749707773" style="color: #9ca3af;">07 49 70 77 73</a>
    </div>
  </div>
</body>
</html>
    `;

    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'contact@deliverydigital.fr',
      replyTo: email,
      subject: subject ? `[CONTACT] ${subject}` : `[CONTACT] Message de ${name}`,
      html: companyEmailContent
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Confirmation de votre message / Message Confirmation - DELIVERY Digital',
      html: customerConfirmationEmail
    });

    res.json({
      success: true,
      message: 'Contact form submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form',
      error: error.message
    });
  }
});

export default router;
