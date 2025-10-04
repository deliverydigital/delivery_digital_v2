import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const testEmail = async () => {
  console.log('\n=== Email Configuration Test ===\n');

  console.log('Checking environment variables...');
  const config = {
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: process.env.SMTP_PORT || '587',
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER
  };

  console.log('\nConfiguration:');
  console.log(`- SMTP Host: ${config.SMTP_HOST}`);
  console.log(`- SMTP Port: ${config.SMTP_PORT}`);
  console.log(`- SMTP User: ${config.SMTP_USER ? '✓ Set' : '✗ Not set'}`);
  console.log(`- SMTP Pass: ${config.SMTP_PASS ? '✓ Set' : '✗ Not set'}`);
  console.log(`- SMTP From: ${config.SMTP_FROM}`);

  if (!config.SMTP_USER || !config.SMTP_PASS) {
    console.error('\n❌ Error: SMTP credentials not configured');
    console.log('\nPlease add these to your .env file:');
    console.log('SMTP_USER=your-email@gmail.com');
    console.log('SMTP_PASS=your-app-password');
    console.log('SMTP_HOST=smtp.gmail.com (optional)');
    console.log('SMTP_PORT=587 (optional)');
    console.log('SMTP_FROM=your-email@gmail.com (optional)');
    process.exit(1);
  }

  try {
    console.log('\nCreating transporter...');
    const port = parseInt(config.SMTP_PORT);
    const transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: port,
      secure: port === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS
      }
    });

    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✓ Connection verified');

    const testEmail = process.argv[2] || config.SMTP_USER;
    console.log(`\nSending test email to: ${testEmail}`);

    const info = await transporter.sendMail({
      from: config.SMTP_FROM,
      to: testEmail,
      subject: 'Test Email - DELIVERY Digital',
      html: `
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
            .success {
              background-color: #d1fae5;
              border-left: 4px solid #10b981;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              color: #065f46;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Email Configuration Test</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>Success!</strong> Your email configuration is working correctly.
              </div>
              <p>This is a test email from DELIVERY Digital contact form system.</p>
              <p><strong>Test Details:</strong></p>
              <ul>
                <li>Timestamp: ${new Date().toLocaleString('fr-FR')}</li>
                <li>From: ${config.SMTP_FROM}</li>
                <li>To: ${testEmail}</li>
                <li>SMTP Host: ${config.SMTP_HOST}</li>
                <li>SMTP Port: ${config.SMTP_PORT}</li>
              </ul>
              <p>If you received this email, your SMTP configuration is correct and the contact form can send emails.</p>
            </div>
            <div class="footer">
              DELIVERY Digital Nice<br>
              470 promenade des anglais, 06200 Nice
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log('\n✅ Test email sent successfully!');
    console.log(`\nDetails:`);
    console.log(`- Message ID: ${info.messageId}`);
    console.log(`- From: ${config.SMTP_FROM}`);
    console.log(`- To: ${testEmail}`);
    console.log(`- Response: ${info.response}`);
    console.log('\nCheck your inbox to confirm the email was received.');

  } catch (error) {
    console.error('\n❌ Error sending test email:');
    console.error(`\nError: ${error.message}`);

    if (error.code) {
      console.error(`Code: ${error.code}`);
    }
    if (error.command) {
      console.error(`Command: ${error.command}`);
    }
    if (error.response) {
      console.error(`Response: ${error.response}`);
    }

    console.log('\nCommon issues:');
    console.log('1. For Gmail: Enable "Less secure app access" or use App Password');
    console.log('2. Check SMTP credentials are correct');
    console.log('3. Verify SMTP host and port');
    console.log('4. Check firewall/network settings');

    process.exit(1);
  }
};

testEmail();
