import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'react-i18next';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  AlertTriangle,
  Mail,
  Phone,
  FileText,
  Send,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  Building2,
  Shield
} from 'lucide-react';

const Reclamation = () => {
  const { t } = useTranslation();
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    description: '',
    orderNumber: '',
    category: 'service'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate CAPTCHA
    if (!captchaToken) {
      setError(t('reclamation.form.captchaRequired') || 'Please complete the CAPTCHA verification');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/reclamation/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          captchaToken
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitted(true);
      } else {
        throw new Error(data.message || 'Failed to submit reclamation');
      }
    } catch (err) {
      console.error('Error submitting reclamation:', err);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      // Reset captcha on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setCaptchaToken(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    setError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (submitted) {
    return (
      <section className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {t('reclamation.success.title')}
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                {t('reclamation.success.message')}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <Clock className="inline h-4 w-4 mr-2" />
                  {t('reclamation.success.responseTime')}
                </p>
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="btn btn-primary"
              >
                {t('reclamation.success.backHome')}
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white py-20">
      <div ref={ref} className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-orange-100 text-orange-800 text-sm font-medium mb-4">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {t('reclamation.badge')}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('reclamation.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('reclamation.subtitle')}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border-l-4 border-primary-500"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('reclamation.qualityCommitment.title')}</h2>
            <div className="prose prose-gray max-w-none text-gray-700">
              <p className="mb-4">
                {t('reclamation.qualityCommitment.intro')}
              </p>
              <p className="mb-4">
                {t('reclamation.qualityCommitment.contact')}
              </p>
              <p className="mb-4">
                {t('reclamation.qualityCommitment.formOption')}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  {t('reclamation.qualityCommitment.processTitle')}
                </h3>
                <ol className="space-y-2 text-sm">
                  <li>1. {t('reclamation.qualityCommitment.steps.1')}</li>
                  <li>2. {t('reclamation.qualityCommitment.steps.2')}</li>
                  <li>3. {t('reclamation.qualityCommitment.steps.3')}</li>
                  <li>4. {t('reclamation.qualityCommitment.steps.4')}</li>
                  <li>5. {t('reclamation.qualityCommitment.steps.5')}</li>
                  <li>6. {t('reclamation.qualityCommitment.steps.6')}</li>
                </ol>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-medium text-gray-900 mb-2">
                  {t('reclamation.qualityCommitment.directContact')}
                </p>
                <a
                  href="mailto:contact@deliverydigital.fr"
                  className="text-primary-600 hover:text-primary-700 font-medium flex items-center"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  contact@deliverydigital.fr
                </a>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-primary-500"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                  <Mail className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('reclamation.contactCards.email')}</h3>
                  <a href="mailto:contact@deliverydigital.fr" className="text-sm text-primary-600 hover:text-primary-700">
                    contact@deliverydigital.fr
                  </a>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('reclamation.contactCards.phone')}</h3>
                  <a href="tel:0749707773" className="text-sm text-green-600 hover:text-green-700">
                    07 49 70 77 73
                  </a>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('reclamation.contactCards.hours')}</h3>
                  <p className="text-sm text-gray-600">Lun - Ven: 9h - 18h</p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    {t('reclamation.form.firstName')} *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={t('reclamation.form.firstName')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    {t('reclamation.form.lastName')} *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={t('reclamation.form.lastName')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    {t('reclamation.form.phone')}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="inline h-4 w-4 mr-1" />
                    {t('reclamation.form.company')}
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nom de votre entreprise"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="inline h-4 w-4 mr-1" />
                    {t('reclamation.form.orderNumber')}
                  </label>
                  <input
                    type="text"
                    name="orderNumber"
                    value={formData.orderNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ex: DD-2024-001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="inline h-4 w-4 mr-1" />
                  {t('reclamation.form.category')} *
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="service">{t('reclamation.form.categoryOptions.service')}</option>
                  <option value="product">{t('reclamation.form.categoryOptions.product')}</option>
                  <option value="billing">{t('reclamation.form.categoryOptions.billing')}</option>
                  <option value="support">{t('reclamation.form.categoryOptions.support')}</option>
                  <option value="training">{t('reclamation.form.categoryOptions.training')}</option>
                  <option value="other">{t('reclamation.form.categoryOptions.other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reclamation.form.subject')} *
                </label>
                <input
                  type="text"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('reclamation.form.subjectPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reclamation.form.description')} *
                </label>
                <textarea
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('reclamation.form.descriptionPlaceholder')}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <CheckCircle className="inline h-4 w-4 mr-2" />
                  {t('reclamation.form.gdpr')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Shield className="inline h-4 w-4 mr-1" />
                  {t('reclamation.form.captcha') || 'Security Verification'} *
                </label>
                <div className="flex justify-center">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                    onChange={handleCaptchaChange}
                    theme="light"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <AlertTriangle className="inline h-4 w-4 mr-2" />
                    {error}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                      {t('reclamation.form.submitting')}
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      {t('reclamation.form.submit')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              {t('reclamation.procedure.title')}
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>1. {t('reclamation.procedure.steps.1')}</p>
              <p>2. {t('reclamation.procedure.steps.2')}</p>
              <p>3. {t('reclamation.procedure.steps.3')}</p>
              <p>4. {t('reclamation.procedure.steps.4')}</p>
              <p className="text-xs text-gray-600 mt-4">
                {t('reclamation.procedure.mediator')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Reclamation;
