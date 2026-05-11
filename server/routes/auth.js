import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authRateLimit } from '../middleware/auth.js';
import { validateUserRegistration, validateUserLogin } from '../middleware/validation.js';
import { User } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import nodemailer from "nodemailer";

// Email reset password en 23 langues. lang priorite : req.body.lang > Accept-Language > 'en'.
// @author Rabah Ziane - 2026-05-11
const SUPPORTED_LANGS = ['fr','en','es','de','it','pt','nl','sv','da','no','fi','pl','cs','hu','el','tr','ru','ar','fa','hi','zh','ja','ko'];
const RTL_LANGS = new Set(['ar', 'fa']);
function detectLang(req, bodyLang) {
  const candidate = (bodyLang || '').toLowerCase().split('-')[0];
  if (SUPPORTED_LANGS.includes(candidate)) return candidate;
  const header = String(req.headers['accept-language'] || '').toLowerCase();
  for (const part of header.split(',')) {
    const code = part.trim().split(';')[0].split('-')[0];
    if (SUPPORTED_LANGS.includes(code)) return code;
  }
  return 'en';
}

const RESET_PASSWORD_EMAIL = {
  fr: { subject: 'Réinitialisation de votre mot de passe - Delivery Digital', title: 'Réinitialisation de mot de passe', greeting: 'Bonjour,', intro: 'Vous avez demandé à réinitialiser votre mot de passe sur Delivery Digital.', click: 'Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :', button: 'Réinitialiser mon mot de passe', orCopy: 'Ou copiez ce lien dans votre navigateur :', validity: 'Ce lien est valable pendant 1 heure.', ignore: "Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.", support: 'Support' },
  en: { subject: 'Reset your password - Delivery Digital', title: 'Reset your password', greeting: 'Hello,', intro: 'You requested to reset your password on Delivery Digital.', click: 'Click the button below to set a new password:', button: 'Reset my password', orCopy: 'Or copy this link into your browser:', validity: 'This link is valid for 1 hour.', ignore: "If you didn't request this, simply ignore this email.", support: 'Support' },
  es: { subject: 'Restablecer su contraseña - Delivery Digital', title: 'Restablecer la contraseña', greeting: 'Hola,', intro: 'Ha solicitado restablecer su contraseña en Delivery Digital.', click: 'Haga clic en el botón siguiente para crear una nueva contraseña:', button: 'Restablecer mi contraseña', orCopy: 'O copie este enlace en su navegador:', validity: 'Este enlace es válido durante 1 hora.', ignore: 'Si no ha solicitado este restablecimiento, ignore este correo.', support: 'Soporte' },
  de: { subject: 'Passwort zurücksetzen - Delivery Digital', title: 'Passwort zurücksetzen', greeting: 'Hallo,', intro: 'Sie haben das Zurücksetzen Ihres Passworts bei Delivery Digital angefordert.', click: 'Klicken Sie auf die Schaltfläche unten, um ein neues Passwort zu erstellen:', button: 'Mein Passwort zurücksetzen', orCopy: 'Oder kopieren Sie diesen Link in Ihren Browser:', validity: 'Dieser Link ist 1 Stunde lang gültig.', ignore: 'Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.', support: 'Support' },
  it: { subject: 'Reimposta la tua password - Delivery Digital', title: 'Reimposta la password', greeting: 'Ciao,', intro: 'Hai richiesto la reimpostazione della password su Delivery Digital.', click: 'Clicca sul pulsante qui sotto per creare una nuova password:', button: 'Reimposta password', orCopy: 'Oppure copia questo link nel tuo browser:', validity: 'Questo link è valido per 1 ora.', ignore: 'Se non hai richiesto questa reimpostazione, ignora questa email.', support: 'Supporto' },
  pt: { subject: 'Redefinir sua senha - Delivery Digital', title: 'Redefinir a senha', greeting: 'Olá,', intro: 'Você solicitou a redefinição da sua senha em Delivery Digital.', click: 'Clique no botão abaixo para criar uma nova senha:', button: 'Redefinir minha senha', orCopy: 'Ou copie este link no seu navegador:', validity: 'Este link é válido por 1 hora.', ignore: 'Se você não solicitou esta redefinição, ignore este email.', support: 'Suporte' },
  nl: { subject: 'Wachtwoord opnieuw instellen - Delivery Digital', title: 'Wachtwoord opnieuw instellen', greeting: 'Hallo,', intro: 'U heeft een wachtwoordreset aangevraagd op Delivery Digital.', click: 'Klik op onderstaande knop om een nieuw wachtwoord aan te maken:', button: 'Wachtwoord resetten', orCopy: 'Of kopieer deze link in uw browser:', validity: 'Deze link is 1 uur geldig.', ignore: 'Heeft u dit niet aangevraagd? Negeer deze e-mail.', support: 'Support' },
  sv: { subject: 'Återställ ditt lösenord - Delivery Digital', title: 'Återställ lösenord', greeting: 'Hej,', intro: 'Du har begärt att återställa ditt lösenord på Delivery Digital.', click: 'Klicka på knappen nedan för att skapa ett nytt lösenord:', button: 'Återställ lösenord', orCopy: 'Eller kopiera denna länk i din webbläsare:', validity: 'Den här länken är giltig i 1 timme.', ignore: 'Om du inte begärt detta, ignorera detta meddelande.', support: 'Support' },
  da: { subject: 'Nulstil din adgangskode - Delivery Digital', title: 'Nulstil adgangskode', greeting: 'Hej,', intro: 'Du har anmodet om at nulstille din adgangskode på Delivery Digital.', click: 'Klik på knappen herunder for at oprette en ny adgangskode:', button: 'Nulstil adgangskode', orCopy: 'Eller kopier dette link til din browser:', validity: 'Dette link er gyldigt i 1 time.', ignore: 'Hvis du ikke har anmodet om dette, ignorer denne mail.', support: 'Support' },
  no: { subject: 'Tilbakestill passordet ditt - Delivery Digital', title: 'Tilbakestill passord', greeting: 'Hei,', intro: 'Du har bedt om å tilbakestille passordet ditt på Delivery Digital.', click: 'Klikk på knappen nedenfor for å opprette et nytt passord:', button: 'Tilbakestill passord', orCopy: 'Eller kopier denne lenken til nettleseren:', validity: 'Denne lenken er gyldig i 1 time.', ignore: 'Hvis du ikke har bedt om dette, ignorer denne e-posten.', support: 'Support' },
  fi: { subject: 'Nollaa salasanasi - Delivery Digital', title: 'Salasanan nollaus', greeting: 'Hei,', intro: 'Olet pyytänyt salasanan nollausta Delivery Digitalissa.', click: 'Luo uusi salasana napsauttamalla alla olevaa painiketta:', button: 'Nollaa salasana', orCopy: 'Tai kopioi tämä linkki selaimeesi:', validity: 'Tämä linkki on voimassa 1 tunnin.', ignore: 'Jos et pyytänyt tätä, ohita tämä viesti.', support: 'Tuki' },
  pl: { subject: 'Zresetuj swoje hasło - Delivery Digital', title: 'Resetowanie hasła', greeting: 'Cześć,', intro: 'Zażądałeś zresetowania hasła w Delivery Digital.', click: 'Kliknij przycisk poniżej, aby utworzyć nowe hasło:', button: 'Zresetuj hasło', orCopy: 'Lub skopiuj ten link do przeglądarki:', validity: 'Ten link jest ważny przez 1 godzinę.', ignore: 'Jeśli nie wnioskowałeś o reset, zignoruj tę wiadomość.', support: 'Wsparcie' },
  cs: { subject: 'Obnovte své heslo - Delivery Digital', title: 'Obnovení hesla', greeting: 'Dobrý den,', intro: 'Požádali jste o obnovení hesla v Delivery Digital.', click: 'Klikněte na tlačítko níže pro vytvoření nového hesla:', button: 'Obnovit heslo', orCopy: 'Nebo zkopírujte tento odkaz do prohlížeče:', validity: 'Tento odkaz platí 1 hodinu.', ignore: 'Pokud jste o to nepožádali, ignorujte tento e-mail.', support: 'Podpora' },
  hu: { subject: 'Jelszó visszaállítása - Delivery Digital', title: 'Jelszó visszaállítása', greeting: 'Üdvözöljük,', intro: 'Jelszó visszaállítást kért a Delivery Digital oldalon.', click: 'Új jelszó létrehozásához kattintson az alábbi gombra:', button: 'Jelszó visszaállítása', orCopy: 'Vagy másolja ezt a linket a böngészőjébe:', validity: 'Ez a link 1 óráig érvényes.', ignore: 'Ha nem kérte ezt, hagyja figyelmen kívül az e-mailt.', support: 'Támogatás' },
  el: { subject: 'Επαναφορά κωδικού πρόσβασης - Delivery Digital', title: 'Επαναφορά κωδικού πρόσβασης', greeting: 'Γεια σας,', intro: 'Ζητήσατε την επαναφορά του κωδικού πρόσβασης στο Delivery Digital.', click: 'Κάντε κλικ στο κουμπί παρακάτω για να ορίσετε νέο κωδικό:', button: 'Επαναφορά κωδικού', orCopy: 'Ή αντιγράψτε αυτόν τον σύνδεσμο στο πρόγραμμα περιήγησης:', validity: 'Αυτός ο σύνδεσμος ισχύει για 1 ώρα.', ignore: 'Αν δεν ζητήσατε αυτή την επαναφορά, αγνοήστε αυτό το email.', support: 'Υποστήριξη' },
  tr: { subject: 'Şifrenizi sıfırlayın - Delivery Digital', title: 'Şifre sıfırlama', greeting: 'Merhaba,', intro: 'Delivery Digital üzerinde şifrenizi sıfırlamayı talep ettiniz.', click: 'Yeni şifre oluşturmak için aşağıdaki düğmeye tıklayın:', button: 'Şifremi sıfırla', orCopy: 'Veya bu bağlantıyı tarayıcınıza kopyalayın:', validity: 'Bu bağlantı 1 saat geçerlidir.', ignore: 'Bu talebi siz yapmadıysanız bu e-postayı yok sayın.', support: 'Destek' },
  ru: { subject: 'Сброс пароля - Delivery Digital', title: 'Сброс пароля', greeting: 'Здравствуйте,', intro: 'Вы запросили сброс пароля в Delivery Digital.', click: 'Нажмите кнопку ниже, чтобы создать новый пароль:', button: 'Сбросить пароль', orCopy: 'Или скопируйте эту ссылку в браузер:', validity: 'Ссылка действительна 1 час.', ignore: 'Если вы не запрашивали сброс, проигнорируйте это письмо.', support: 'Поддержка' },
  ar: { subject: 'إعادة تعيين كلمة المرور - Delivery Digital', title: 'إعادة تعيين كلمة المرور', greeting: 'مرحباً،', intro: 'لقد طلبت إعادة تعيين كلمة المرور في Delivery Digital.', click: 'انقر على الزر أدناه لإنشاء كلمة مرور جديدة:', button: 'إعادة تعيين كلمة المرور', orCopy: 'أو انسخ هذا الرابط في متصفحك:', validity: 'هذا الرابط صالح لمدة ساعة واحدة.', ignore: 'إذا لم تطلب إعادة التعيين، تجاهل هذا البريد.', support: 'الدعم' },
  fa: { subject: 'بازنشانی رمز عبور - Delivery Digital', title: 'بازنشانی رمز عبور', greeting: 'سلام،', intro: 'شما درخواست بازنشانی رمز عبور در Delivery Digital داده‌اید.', click: 'برای ایجاد رمز عبور جدید روی دکمه زیر کلیک کنید:', button: 'بازنشانی رمز عبور', orCopy: 'یا این لینک را در مرورگر خود کپی کنید:', validity: 'این لینک به مدت ۱ ساعت معتبر است.', ignore: 'اگر این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.', support: 'پشتیبانی' },
  hi: { subject: 'अपना पासवर्ड रीसेट करें - Delivery Digital', title: 'पासवर्ड रीसेट करें', greeting: 'नमस्ते,', intro: 'आपने Delivery Digital पर अपना पासवर्ड रीसेट करने का अनुरोध किया है।', click: 'नया पासवर्ड बनाने के लिए नीचे दिए गए बटन पर क्लिक करें:', button: 'पासवर्ड रीसेट करें', orCopy: 'या इस लिंक को अपने ब्राउज़र में कॉपी करें:', validity: 'यह लिंक 1 घंटे के लिए वैध है।', ignore: 'यदि आपने यह अनुरोध नहीं किया है, तो इस ईमेल को अनदेखा करें।', support: 'सहायता' },
  zh: { subject: '重置您的密码 - Delivery Digital', title: '重置密码', greeting: '您好，', intro: '您已在 Delivery Digital 上请求重置密码。', click: '点击下方按钮设置新密码：', button: '重置密码', orCopy: '或将此链接复制到您的浏览器中：', validity: '此链接有效期为 1 小时。', ignore: '如果您没有请求此操作，请忽略此邮件。', support: '支持' },
  ja: { subject: 'パスワードのリセット - Delivery Digital', title: 'パスワードリセット', greeting: 'こんにちは、', intro: 'Delivery Digital でパスワードのリセットをリクエストされました。', click: '下のボタンをクリックして新しいパスワードを設定してください：', button: 'パスワードをリセット', orCopy: 'またはこのリンクをブラウザにコピーしてください：', validity: 'このリンクは 1 時間有効です。', ignore: 'リクエストされていない場合はこのメールを無視してください。', support: 'サポート' },
  ko: { subject: '비밀번호 재설정 - Delivery Digital', title: '비밀번호 재설정', greeting: '안녕하세요,', intro: 'Delivery Digital에서 비밀번호 재설정을 요청하셨습니다.', click: '아래 버튼을 클릭하여 새 비밀번호를 설정하세요:', button: '비밀번호 재설정', orCopy: '또는 이 링크를 브라우저에 복사하세요:', validity: '이 링크는 1시간 동안 유효합니다.', ignore: '본인이 요청하지 않았다면 이 이메일을 무시하세요.', support: '지원' },
};

// Create nodemailer transporter
const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || '587');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const router = express.Router();

// Apply rate limiting to auth routes
router.use(authRateLimit);

// Register new user
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    console.log('🔄 Registration attempt for:', req.body.email);
    console.log('📊 Request body:', { ...req.body, password: '[HIDDEN]' });
    
    const { email, password, name, company, phone, role } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      console.log('❌ MongoDB not available for registration');
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Check if user already exists
    console.log('🔍 Checking if user exists:', email);
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Validate role if provided
    const validRoles = ['client', 'admin', 'project_manager', 'trainer', 'developer'];
    const userRole = role && validRoles.includes(role) ? role : 'client';

    // Create user (password will be hashed by pre-save middleware)
    console.log('👤 Creating user:', email, 'with role:', userRole);
    const userData = {
      email,
      password_hash: password,
      name,
      company,
      phone,
      role: userRole,
      status: 'active',
      email_verified: false
    };

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString());

    console.log('✅ Registration successful for:', email);
    console.log('📊 Sending response with user:', { id: user._id, email: user.email, name: user.name });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        phone: user.phone,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.error('❌ Validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      console.error('❌ Duplicate key error:', error);
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    console.error('❌ Unexpected registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    console.log('🔄 Login attempt for:', req.body.email);
    
    const { email, password } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      console.log('❌ MongoDB not available for login');
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find user by email
    console.log('🔍 Looking for user:', email);
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.log('❌ User not active:', email, 'Status:', user.status);
      return res.status(401).json({
        success: false,
        error: 'Account is not active'
      });
    }

    // Verify password
    console.log('🔐 Verifying password for:', email);
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString());

    console.log('✅ Login successful for:', email);
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, lang: bodyLang } = req.body;
    const lang = detectLang(req, bodyLang);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user || user.status !== 'active') {
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    try {
      const nodemailer = await import('nodemailer');

      // Create transporter
      const transporter = createTransporter()

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

      // Send email i18n (23 langues, RTL pour ar/fa)
      const M = RESET_PASSWORD_EMAIL[lang] || RESET_PASSWORD_EMAIL.en;
      const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: M.subject,
        html: `
          <div dir="${dir}" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${M.title}</h2>
            <p>${M.greeting}</p>
            <p>${M.intro}</p>
            <p>${M.click}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                ${M.button}
              </a>
            </div>
            <p>${M.orCopy}</p>
            <p style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all;">
              ${resetUrl}
            </p>
            <p><strong>${M.validity}</strong></p>
            <p>${M.ignore}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              Delivery Digital<br>
              ${M.support}: contact@deliverydigital.fr
            </p>
          </div>
        `
      });

      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Still return success to prevent email enumeration
    }

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset request failed'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      password_reset_token: token,
      password_reset_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Update user password and clear reset token (password will be hashed by pre-save middleware)
    user.password_hash = newPassword;
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed'
    });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find user with verification token
    const user = await User.findOne({
      email_verification_token: token
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }

    // Mark email as verified
    user.email_verified = true;
    user.email_verification_token = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email verification failed'
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token and get user
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const user = await User.findById(decoded.userId).select('-password_hash -password_reset_token -email_verification_token');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        phone: user.phone,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        last_login: user.last_login,
        created_at: user.createdAt,
        client_info: user.client_info
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

export default router;