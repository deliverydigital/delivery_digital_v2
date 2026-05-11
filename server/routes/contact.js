import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Detection langue + email de confirmation contact en 23 langues.
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

const CONTACT_CONFIRM = {
  fr: { subject: 'Confirmation de votre message - DELIVERY Digital', headerTitle: '✅ Message bien reçu !', greeting: (n) => `Bonjour <strong>${n}</strong>,`, intro: 'Nous avons bien reçu votre message et nous vous remercions de votre intérêt pour DELIVERY Digital.', responseTimeTitle: '⏱️ Délai de réponse :', responseTimeBody: 'Notre équipe analysera votre demande et vous répondra dans un délai de 24 à 48 heures ouvrées.', summaryTitle: '📋 Résumé de votre demande :', subjectLabel: 'Sujet', budgetLabel: 'Budget', timelineLabel: 'Délai', urgent: 'Si vous avez des questions urgentes, vous pouvez nous contacter directement :', phoneLabel: 'Téléphone', addressLabel: 'Adresse', signoff: 'À très bientôt,<br>L\'équipe DELIVERY Digital Nice' },
  en: { subject: 'Confirmation of your message - DELIVERY Digital', headerTitle: '✅ Message received!', greeting: (n) => `Hello <strong>${n}</strong>,`, intro: 'We have received your message and thank you for your interest in DELIVERY Digital.', responseTimeTitle: '⏱️ Response time:', responseTimeBody: 'Our team will analyze your request and respond within 24 to 48 business hours.', summaryTitle: '📋 Summary of your request:', subjectLabel: 'Subject', budgetLabel: 'Budget', timelineLabel: 'Timeline', urgent: 'For urgent questions, you can reach us directly:', phoneLabel: 'Phone', addressLabel: 'Address', signoff: 'Talk to you soon,<br>The DELIVERY Digital Nice team' },
  es: { subject: 'Confirmación de su mensaje - DELIVERY Digital', headerTitle: '✅ ¡Mensaje recibido!', greeting: (n) => `Hola <strong>${n}</strong>,`, intro: 'Hemos recibido su mensaje y le agradecemos su interés en DELIVERY Digital.', responseTimeTitle: '⏱️ Tiempo de respuesta:', responseTimeBody: 'Nuestro equipo analizará su solicitud y le responderá en un plazo de 24 a 48 horas laborables.', summaryTitle: '📋 Resumen de su solicitud:', subjectLabel: 'Asunto', budgetLabel: 'Presupuesto', timelineLabel: 'Plazo', urgent: 'Si tiene preguntas urgentes, puede contactarnos directamente:', phoneLabel: 'Teléfono', addressLabel: 'Dirección', signoff: 'Hasta pronto,<br>El equipo DELIVERY Digital Nice' },
  de: { subject: 'Bestätigung Ihrer Nachricht - DELIVERY Digital', headerTitle: '✅ Nachricht erhalten!', greeting: (n) => `Hallo <strong>${n}</strong>,`, intro: 'Wir haben Ihre Nachricht erhalten und danken Ihnen für Ihr Interesse an DELIVERY Digital.', responseTimeTitle: '⏱️ Antwortzeit:', responseTimeBody: 'Unser Team prüft Ihre Anfrage und meldet sich innerhalb von 24 bis 48 Werktagen.', summaryTitle: '📋 Zusammenfassung Ihrer Anfrage:', subjectLabel: 'Betreff', budgetLabel: 'Budget', timelineLabel: 'Zeitrahmen', urgent: 'Bei dringenden Fragen erreichen Sie uns direkt:', phoneLabel: 'Telefon', addressLabel: 'Adresse', signoff: 'Bis bald,<br>Das DELIVERY Digital Nice Team' },
  it: { subject: 'Conferma del tuo messaggio - DELIVERY Digital', headerTitle: '✅ Messaggio ricevuto!', greeting: (n) => `Ciao <strong>${n}</strong>,`, intro: 'Abbiamo ricevuto il tuo messaggio e ti ringraziamo per il tuo interesse in DELIVERY Digital.', responseTimeTitle: '⏱️ Tempo di risposta:', responseTimeBody: 'Il nostro team analizzerà la tua richiesta e risponderà entro 24-48 ore lavorative.', summaryTitle: '📋 Riepilogo della tua richiesta:', subjectLabel: 'Oggetto', budgetLabel: 'Budget', timelineLabel: 'Tempi', urgent: 'Per domande urgenti, puoi contattarci direttamente:', phoneLabel: 'Telefono', addressLabel: 'Indirizzo', signoff: 'A presto,<br>Il team DELIVERY Digital Nice' },
  pt: { subject: 'Confirmação da sua mensagem - DELIVERY Digital', headerTitle: '✅ Mensagem recebida!', greeting: (n) => `Olá <strong>${n}</strong>,`, intro: 'Recebemos a sua mensagem e agradecemos o seu interesse na DELIVERY Digital.', responseTimeTitle: '⏱️ Tempo de resposta:', responseTimeBody: 'A nossa equipa analisará o seu pedido e responderá num prazo de 24 a 48 horas úteis.', summaryTitle: '📋 Resumo do seu pedido:', subjectLabel: 'Assunto', budgetLabel: 'Orçamento', timelineLabel: 'Prazo', urgent: 'Em caso de perguntas urgentes, contacte-nos diretamente:', phoneLabel: 'Telefone', addressLabel: 'Morada', signoff: 'Até breve,<br>A equipa DELIVERY Digital Nice' },
  nl: { subject: 'Bevestiging van uw bericht - DELIVERY Digital', headerTitle: '✅ Bericht ontvangen!', greeting: (n) => `Hallo <strong>${n}</strong>,`, intro: 'We hebben uw bericht ontvangen en bedanken u voor uw interesse in DELIVERY Digital.', responseTimeTitle: '⏱️ Reactietijd:', responseTimeBody: 'Ons team analyseert uw verzoek en reageert binnen 24 tot 48 werkuren.', summaryTitle: '📋 Samenvatting van uw verzoek:', subjectLabel: 'Onderwerp', budgetLabel: 'Budget', timelineLabel: 'Termijn', urgent: 'Voor dringende vragen kunt u ons direct bereiken:', phoneLabel: 'Telefoon', addressLabel: 'Adres', signoff: 'Tot snel,<br>Het DELIVERY Digital Nice team' },
  sv: { subject: 'Bekräftelse av ditt meddelande - DELIVERY Digital', headerTitle: '✅ Meddelande mottaget!', greeting: (n) => `Hej <strong>${n}</strong>,`, intro: 'Vi har tagit emot ditt meddelande och tackar för ditt intresse för DELIVERY Digital.', responseTimeTitle: '⏱️ Svarstid:', responseTimeBody: 'Vårt team analyserar din förfrågan och svarar inom 24 till 48 arbetstimmar.', summaryTitle: '📋 Sammanfattning av din förfrågan:', subjectLabel: 'Ämne', budgetLabel: 'Budget', timelineLabel: 'Tidsram', urgent: 'För brådskande frågor, kontakta oss direkt:', phoneLabel: 'Telefon', addressLabel: 'Adress', signoff: 'Vi hörs snart,<br>DELIVERY Digital Nice teamet' },
  da: { subject: 'Bekræftelse af din besked - DELIVERY Digital', headerTitle: '✅ Besked modtaget!', greeting: (n) => `Hej <strong>${n}</strong>,`, intro: 'Vi har modtaget din besked og takker for din interesse for DELIVERY Digital.', responseTimeTitle: '⏱️ Svartid:', responseTimeBody: 'Vores team analyserer din henvendelse og svarer inden for 24 til 48 arbejdstimer.', summaryTitle: '📋 Resumé af din henvendelse:', subjectLabel: 'Emne', budgetLabel: 'Budget', timelineLabel: 'Tidsramme', urgent: 'Ved hastesager kan du kontakte os direkte:', phoneLabel: 'Telefon', addressLabel: 'Adresse', signoff: 'Vi ses snart,<br>DELIVERY Digital Nice teamet' },
  no: { subject: 'Bekreftelse på din melding - DELIVERY Digital', headerTitle: '✅ Melding mottatt!', greeting: (n) => `Hei <strong>${n}</strong>,`, intro: 'Vi har mottatt meldingen din og takker for din interesse for DELIVERY Digital.', responseTimeTitle: '⏱️ Svartid:', responseTimeBody: 'Vårt team analyserer henvendelsen og svarer innen 24 til 48 arbeidstimer.', summaryTitle: '📋 Sammendrag av henvendelsen:', subjectLabel: 'Emne', budgetLabel: 'Budsjett', timelineLabel: 'Tidsramme', urgent: 'For hastesaker, kontakt oss direkte:', phoneLabel: 'Telefon', addressLabel: 'Adresse', signoff: 'Snakkes snart,<br>DELIVERY Digital Nice teamet' },
  fi: { subject: 'Vahvistus viestistäsi - DELIVERY Digital', headerTitle: '✅ Viesti vastaanotettu!', greeting: (n) => `Hei <strong>${n}</strong>,`, intro: 'Olemme vastaanottaneet viestisi ja kiitämme kiinnostuksesta DELIVERY Digitalia kohtaan.', responseTimeTitle: '⏱️ Vastausaika:', responseTimeBody: 'Tiimimme analysoi pyyntösi ja vastaa 24-48 työtunnin kuluessa.', summaryTitle: '📋 Yhteenveto pyynnöstäsi:', subjectLabel: 'Aihe', budgetLabel: 'Budjetti', timelineLabel: 'Aikataulu', urgent: 'Kiireellisissä asioissa voit ottaa meihin yhteyttä suoraan:', phoneLabel: 'Puhelin', addressLabel: 'Osoite', signoff: 'Pian kuullaan,<br>DELIVERY Digital Nice -tiimi' },
  pl: { subject: 'Potwierdzenie Twojej wiadomości - DELIVERY Digital', headerTitle: '✅ Wiadomość otrzymana!', greeting: (n) => `Cześć <strong>${n}</strong>,`, intro: 'Otrzymaliśmy Twoją wiadomość i dziękujemy za zainteresowanie DELIVERY Digital.', responseTimeTitle: '⏱️ Czas odpowiedzi:', responseTimeBody: 'Nasz zespół przeanalizuje Twoje zapytanie i odpowie w ciągu 24-48 godzin roboczych.', summaryTitle: '📋 Podsumowanie zapytania:', subjectLabel: 'Temat', budgetLabel: 'Budżet', timelineLabel: 'Termin', urgent: 'W pilnych sprawach prosimy o bezpośredni kontakt:', phoneLabel: 'Telefon', addressLabel: 'Adres', signoff: 'Do usłyszenia,<br>Zespół DELIVERY Digital Nice' },
  cs: { subject: 'Potvrzení vaší zprávy - DELIVERY Digital', headerTitle: '✅ Zpráva přijata!', greeting: (n) => `Dobrý den <strong>${n}</strong>,`, intro: 'Vaši zprávu jsme obdrželi a děkujeme za zájem o DELIVERY Digital.', responseTimeTitle: '⏱️ Doba odezvy:', responseTimeBody: 'Náš tým analyzuje váš požadavek a odpoví do 24-48 pracovních hodin.', summaryTitle: '📋 Shrnutí vašeho požadavku:', subjectLabel: 'Předmět', budgetLabel: 'Rozpočet', timelineLabel: 'Termín', urgent: 'Pro naléhavé dotazy nás můžete kontaktovat přímo:', phoneLabel: 'Telefon', addressLabel: 'Adresa', signoff: 'Brzy nashledanou,<br>Tým DELIVERY Digital Nice' },
  hu: { subject: 'Üzenete megerősítése - DELIVERY Digital', headerTitle: '✅ Üzenet megérkezett!', greeting: (n) => `Üdvözöljük <strong>${n}</strong>,`, intro: 'Megkaptuk az üzenetét, és köszönjük érdeklődését a DELIVERY Digital iránt.', responseTimeTitle: '⏱️ Válaszidő:', responseTimeBody: 'Csapatunk megvizsgálja kérését és 24-48 munkaórán belül válaszol.', summaryTitle: '📋 A kérés összefoglalása:', subjectLabel: 'Tárgy', budgetLabel: 'Költségvetés', timelineLabel: 'Határidő', urgent: 'Sürgős kérdések esetén forduljon hozzánk közvetlenül:', phoneLabel: 'Telefon', addressLabel: 'Cím', signoff: 'Hamarosan találkozunk,<br>A DELIVERY Digital Nice csapata' },
  el: { subject: 'Επιβεβαίωση του μηνύματός σας - DELIVERY Digital', headerTitle: '✅ Μήνυμα ελήφθη!', greeting: (n) => `Γεια σας <strong>${n}</strong>,`, intro: 'Λάβαμε το μήνυμά σας και σας ευχαριστούμε για το ενδιαφέρον σας για την DELIVERY Digital.', responseTimeTitle: '⏱️ Χρόνος απάντησης:', responseTimeBody: 'Η ομάδα μας θα αναλύσει το αίτημά σας και θα απαντήσει εντός 24-48 εργάσιμων ωρών.', summaryTitle: '📋 Σύνοψη του αιτήματός σας:', subjectLabel: 'Θέμα', budgetLabel: 'Προϋπολογισμός', timelineLabel: 'Χρονοδιάγραμμα', urgent: 'Για επείγουσες ερωτήσεις, επικοινωνήστε απευθείας:', phoneLabel: 'Τηλέφωνο', addressLabel: 'Διεύθυνση', signoff: 'Τα λέμε σύντομα,<br>Η ομάδα DELIVERY Digital Nice' },
  tr: { subject: 'Mesajınızın onayı - DELIVERY Digital', headerTitle: '✅ Mesaj alındı!', greeting: (n) => `Merhaba <strong>${n}</strong>,`, intro: 'Mesajınızı aldık ve DELIVERY Digital\'a olan ilginiz için teşekkür ederiz.', responseTimeTitle: '⏱️ Yanıt süresi:', responseTimeBody: 'Ekibimiz talebinizi inceleyecek ve 24-48 iş saati içinde yanıt verecektir.', summaryTitle: '📋 Talebinizin özeti:', subjectLabel: 'Konu', budgetLabel: 'Bütçe', timelineLabel: 'Süre', urgent: 'Acil sorularınız için bize doğrudan ulaşabilirsiniz:', phoneLabel: 'Telefon', addressLabel: 'Adres', signoff: 'Yakında görüşmek üzere,<br>DELIVERY Digital Nice ekibi' },
  ru: { subject: 'Подтверждение вашего сообщения - DELIVERY Digital', headerTitle: '✅ Сообщение получено!', greeting: (n) => `Здравствуйте, <strong>${n}</strong>,`, intro: 'Мы получили ваше сообщение и благодарим за интерес к DELIVERY Digital.', responseTimeTitle: '⏱️ Время ответа:', responseTimeBody: 'Наша команда рассмотрит ваш запрос и ответит в течение 24-48 рабочих часов.', summaryTitle: '📋 Сводка вашего запроса:', subjectLabel: 'Тема', budgetLabel: 'Бюджет', timelineLabel: 'Срок', urgent: 'По срочным вопросам обращайтесь напрямую:', phoneLabel: 'Телефон', addressLabel: 'Адрес', signoff: 'До скорой связи,<br>Команда DELIVERY Digital Nice' },
  ar: { subject: 'تأكيد رسالتك - DELIVERY Digital', headerTitle: '✅ تم استلام الرسالة!', greeting: (n) => `مرحباً <strong>${n}</strong>،`, intro: 'لقد استلمنا رسالتك ونشكرك على اهتمامك بـ DELIVERY Digital.', responseTimeTitle: '⏱️ وقت الرد:', responseTimeBody: 'سيقوم فريقنا بتحليل طلبك والرد عليه خلال 24 إلى 48 ساعة عمل.', summaryTitle: '📋 ملخص طلبك:', subjectLabel: 'الموضوع', budgetLabel: 'الميزانية', timelineLabel: 'الموعد', urgent: 'للأسئلة العاجلة، يمكنك التواصل معنا مباشرة:', phoneLabel: 'الهاتف', addressLabel: 'العنوان', signoff: 'إلى اللقاء قريباً،<br>فريق DELIVERY Digital Nice' },
  fa: { subject: 'تأیید پیام شما - DELIVERY Digital', headerTitle: '✅ پیام دریافت شد!', greeting: (n) => `سلام <strong>${n}</strong>،`, intro: 'پیام شما را دریافت کردیم و از علاقه شما به DELIVERY Digital سپاسگزاریم.', responseTimeTitle: '⏱️ زمان پاسخگویی:', responseTimeBody: 'تیم ما درخواست شما را بررسی کرده و در ۲۴ تا ۴۸ ساعت کاری پاسخ خواهد داد.', summaryTitle: '📋 خلاصه درخواست شما:', subjectLabel: 'موضوع', budgetLabel: 'بودجه', timelineLabel: 'مهلت', urgent: 'برای سوالات فوری، می‌توانید مستقیماً با ما تماس بگیرید:', phoneLabel: 'تلفن', addressLabel: 'آدرس', signoff: 'به‌زودی،<br>تیم DELIVERY Digital Nice' },
  hi: { subject: 'आपके संदेश की पुष्टि - DELIVERY Digital', headerTitle: '✅ संदेश प्राप्त हुआ!', greeting: (n) => `नमस्ते <strong>${n}</strong>,`, intro: 'हमने आपका संदेश प्राप्त कर लिया है और DELIVERY Digital में आपकी रुचि के लिए धन्यवाद।', responseTimeTitle: '⏱️ प्रतिक्रिया समय:', responseTimeBody: 'हमारी टीम आपके अनुरोध का विश्लेषण करेगी और 24 से 48 कार्यकारी घंटों के भीतर जवाब देगी।', summaryTitle: '📋 आपके अनुरोध का सारांश:', subjectLabel: 'विषय', budgetLabel: 'बजट', timelineLabel: 'समय-सीमा', urgent: 'तत्काल प्रश्नों के लिए, सीधे संपर्क करें:', phoneLabel: 'फोन', addressLabel: 'पता', signoff: 'जल्द ही मिलते हैं,<br>DELIVERY Digital Nice टीम' },
  zh: { subject: '您的消息确认 - DELIVERY Digital', headerTitle: '✅ 消息已收到！', greeting: (n) => `您好 <strong>${n}</strong>，`, intro: '我们已收到您的消息，感谢您对 DELIVERY Digital 的关注。', responseTimeTitle: '⏱️ 响应时间：', responseTimeBody: '我们的团队将分析您的请求并在 24 至 48 个工作小时内回复。', summaryTitle: '📋 您的请求摘要：', subjectLabel: '主题', budgetLabel: '预算', timelineLabel: '时间', urgent: '如有紧急问题，请直接联系我们：', phoneLabel: '电话', addressLabel: '地址', signoff: '稍后联系，<br>DELIVERY Digital Nice 团队' },
  ja: { subject: 'メッセージの確認 - DELIVERY Digital', headerTitle: '✅ メッセージを受信しました！', greeting: (n) => `${n} 様,`, intro: 'メッセージを受信いたしました。DELIVERY Digital にご興味をお持ちいただきありがとうございます。', responseTimeTitle: '⏱️ ご返答までの時間：', responseTimeBody: 'チームがリクエストを分析し、24～48 営業時間以内にご返答いたします。', summaryTitle: '📋 リクエストの概要：', subjectLabel: '件名', budgetLabel: '予算', timelineLabel: '期限', urgent: 'お急ぎのご質問は、直接お問い合わせください：', phoneLabel: '電話', addressLabel: '住所', signoff: 'よろしくお願いいたします。<br>DELIVERY Digital Nice チーム' },
  ko: { subject: '메시지 확인 - DELIVERY Digital', headerTitle: '✅ 메시지가 접수되었습니다!', greeting: (n) => `안녕하세요 <strong>${n}</strong>님,`, intro: '메시지를 받았으며 DELIVERY Digital에 관심을 가져 주셔서 감사합니다.', responseTimeTitle: '⏱️ 응답 시간:', responseTimeBody: '저희 팀이 요청을 검토하고 24~48 영업 시간 이내에 답변드리겠습니다.', summaryTitle: '📋 요청 요약:', subjectLabel: '제목', budgetLabel: '예산', timelineLabel: '일정', urgent: '긴급한 문의는 직접 연락해 주세요:', phoneLabel: '전화', addressLabel: '주소', signoff: '곧 연락드리겠습니다,<br>DELIVERY Digital Nice 팀' },
};

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

router.get('/test-email', async (req, res) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({
        success: false,
        message: 'SMTP credentials not configured',
        details: {
          SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set',
          SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set',
          SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com (default)',
          SMTP_PORT: process.env.SMTP_PORT || '587 (default)'
        }
      });
    }

    const port = parseInt(process.env.SMTP_PORT || '587');
    const transporter = createTransporter();

    const testEmail = req.query.email || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
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
                <li>From: ${process.env.SMTP_FROM || process.env.SMTP_USER}</li>
                <li>To: ${testEmail}</li>
                <li>SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
                <li>SMTP Port: ${process.env.SMTP_PORT || '587'}</li>
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

    res.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        messageId: info.messageId,
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: testEmail,
        smtp: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || '587',
          secure: port === 465
        }
      }
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
      details: {
        errorCode: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      }
    });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      budget,
      timeline,
      message,
      lang: bodyLang
    } = req.body;
    const lang = detectLang(req, bodyLang);
    const C = CONTACT_CONFIRM[lang] || CONTACT_CONFIRM.en;
    const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
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
<html dir="${dir}">
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { background-color: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
    .highlight-box { background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${C.headerTitle}</h1>
    </div>
    <div class="content">
      <p>${C.greeting(name)}</p>

      <p>${C.intro}</p>

      <div class="highlight-box">
        <p style="margin: 0;">
          <strong>${C.responseTimeTitle}</strong><br>
          ${C.responseTimeBody}
        </p>
      </div>

      <p><strong>${C.summaryTitle}</strong></p>
      <ul style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
        ${subject ? `<li><strong>${C.subjectLabel}:</strong> ${subject}</li>` : ''}
        ${budget ? `<li><strong>${C.budgetLabel}:</strong> ${budgetLabels[budget] || budget}</li>` : ''}
        ${timeline ? `<li><strong>${C.timelineLabel}:</strong> ${timelineLabels[timeline] || timeline}</li>` : ''}
      </ul>

      <p>${C.urgent}</p>

      <ul>
        <li>📧 Email: <a href="mailto:contact@deliverydigital.fr" style="color: #2563eb;">contact@deliverydigital.fr</a></li>
        <li>📞 ${C.phoneLabel}: <a href="tel:0749707773" style="color: #2563eb;">07 49 70 77 73</a></li>
        <li>🏢 ${C.addressLabel}: 470 promenade des anglais, 06200 Nice</li>
      </ul>

      <p>${C.signoff}</p>
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
      subject: C.subject,
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
