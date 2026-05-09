import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Mail, Phone, Send, CheckCircle, AlertCircle, Building2, Clock, Shield, ArrowRight, Download, Map, Loader, X } from 'lucide-react';
import { contactApi } from '../services/contactApi';

const generateConfidentialityAgreement = (formData: any) => {
  const date = new Date().toLocaleDateString('fr-FR');
  return `
ACCORD DE CONFIDENTIALITÉ

Date : ${date}

ENTRE :
DELIVERY Digital Technology
470 promenade des anglais, 06200 Nice
Ci-après dénommée "la Société"

ET :
${formData.name}
${formData.email}
Ci-après dénommé "le Client"

1. OBJET
Le présent accord a pour objet de définir les conditions de confidentialité applicables aux informations échangées dans le cadre du projet suivant :

${formData.message}

2. INFORMATIONS CONFIDENTIELLES
Les parties s'engagent à :
- Maintenir la confidentialité des informations échangées
- Ne pas utiliser ces informations à d'autres fins que l'évaluation et la réalisation du projet
- Ne pas divulguer ces informations à des tiers sans accord préalable

3. DURÉE
Cet accord est valable pour une durée de 5 ans à compter de sa date de signature.

4. PROTECTION DES DONNÉES
Les données personnelles sont traitées conformément au RGPD et à notre politique de confidentialité.

Pour DELIVERY Digital Technology                    Pour le Client
_______________________                            _______________________
`;
};

/**
 * Apple.fr-style Contact section.
 * - Light background
 * - Two-card layout: contact info + 3-step form
 * - Inputs: clean white, ring on focus, no heavy shadows
 */
const Contact = () => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(1);
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfidentialityModal, setShowConfidentialityModal] = useState(false);
  const [agreement, setAgreement] = useState('');
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    budget: 'medium',
    timeline: 'flexible',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const nextStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (activeStep < 3) setActiveStep((prev) => prev + 1);
  };

  const prevStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (activeStep > 1) setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep === 3) {
      const agr = generateConfidentialityAgreement(formState);
      setAgreement(agr);
      setShowConfidentialityModal(true);
    }
  };

  const downloadAccessPlan = () => {
    const link = document.createElement('a');
    link.href = "/Plan d'accès DELIVERY Digital_ copie.png";
    link.download = 'Plan_acces_DELIVERY_Digital_Nice.png';
    link.click();
  };

  const inputClass =
    'w-full px-4 py-3 text-[15px] rounded-2xl bg-white border border-[var(--ink-100)] focus:outline-none focus:border-[var(--link)] focus:ring-2 focus:ring-[var(--link)]/20 transition placeholder:text-[var(--ink-300)] text-[var(--ink-900)]';

  return (
    <section id="contact" className="tile tile-light py-20 sm:py-24">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="display-2 text-[36px] sm:text-[48px] lg:text-[56px] text-[var(--ink-900)] mb-3">
            {t('contact.title')}
          </h2>
          <p className="text-[18px] sm:text-[20px] text-[var(--ink-700)] max-w-2xl mx-auto tracking-tight">
            {t('contact.subtitle')}
          </p>
        </motion.div>

        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left: contact info */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-[22px] ring-1 ring-[var(--ink-100)] p-7 sm:p-8"
          >
            <h3 className="display-3 text-[22px] text-[var(--ink-900)] mb-6">Nos Bureaux</h3>

            <div className="space-y-4">
              <InfoRow icon={Building2} label="Nice">
                470 promenade des Anglais, 06200
              </InfoRow>
              <InfoRow icon={Mail} label="Email">
                <a href="mailto:contact@deliverydigital.fr" className="text-[var(--link)] hover:underline">
                  contact@deliverydigital.fr
                </a>
              </InfoRow>
              <InfoRow icon={Phone} label="Téléphone">
                <a href="tel:0749707773" className="text-[var(--link)] hover:underline">
                  07 49 70 77 73
                </a>
              </InfoRow>
              <InfoRow icon={Clock} label="Horaires">
                Lun - Ven · 9h00 - 18h00
              </InfoRow>
              <InfoRow icon={Map} label="Plan d'accès">
                <button onClick={downloadAccessPlan} className="text-[var(--link)] hover:underline inline-flex items-center">
                  <Download className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                  Télécharger le plan d'accès
                </button>
              </InfoRow>
            </div>

            <div className="mt-7 rounded-2xl overflow-hidden ring-1 ring-[var(--ink-100)]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2884.8876148832847!2d7.214492776927496!3d43.66758905060871!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12cdd0106a852d31%3A0x40819a5fd979a70!2s470%20Promenade%20des%20Anglais%2C%2006200%20Nice!5e0!3m2!1sfr!2sfr!4v1709913327044!5m2!1sfr!2sfr"
                className="w-full h-[260px] block"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Map"
              ></iframe>
            </div>
          </motion.div>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-[22px] ring-1 ring-[var(--ink-100)] p-7 sm:p-8">
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-3 mb-7">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                        step === activeStep
                          ? 'bg-[var(--ink-900)] text-white'
                          : step < activeStep
                          ? 'bg-[var(--link)] text-white'
                          : 'bg-[var(--ink-50)] text-[var(--ink-300)]'
                      }`}
                    >
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={`w-8 h-[1.5px] mx-1 ${step < activeStep ? 'bg-[var(--link)]' : 'bg-[var(--ink-100)]'}`} />
                    )}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {formStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-5 px-4 py-3 bg-[#E8F8EF] text-[#0A7C3A] rounded-2xl flex items-center text-[14px]"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" strokeWidth={2} />
                    {t('contact.success')}
                  </motion.div>
                )}
                {formStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-5 px-4 py-3 bg-[#FFE9EA] text-[#C8102E] rounded-2xl flex items-center text-[14px]"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" strokeWidth={2} />
                    {t('contact.error')}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  {activeStep === 1 && (
                    <div className="space-y-4">
                      <Field label={`${t('contact.name')} *`} htmlFor="name">
                        <input type="text" id="name" name="name" value={formState.name} onChange={handleChange} className={inputClass} required />
                      </Field>
                      <Field label={`${t('contact.email')} *`} htmlFor="email">
                        <input type="email" id="email" name="email" value={formState.email} onChange={handleChange} className={inputClass} required />
                      </Field>
                      <Field label={t('contact.phone')} htmlFor="phone">
                        <input type="tel" id="phone" name="phone" value={formState.phone} onChange={handleChange} className={inputClass} />
                      </Field>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="space-y-4">
                      <Field label={`${t('contact.subject')} *`} htmlFor="subject">
                        <select id="subject" name="subject" value={formState.subject} onChange={handleChange} className={inputClass} required>
                          <option value="">Sélectionner</option>
                          <option value="web">Développement Web</option>
                          <option value="mobile">Application Mobile</option>
                          <option value="enterprise">Solution Entreprise</option>
                          <option value="cloud">Services Cloud</option>
                          <option value="other">Autre</option>
                        </select>
                      </Field>
                      <Field label="Budget Estimé" htmlFor="budget">
                        <select id="budget" name="budget" value={formState.budget} onChange={handleChange} className={inputClass}>
                          <option value="small">{'< 10 000 €'}</option>
                          <option value="medium">10 000 € - 50 000 €</option>
                          <option value="large">50 000 € - 100 000 €</option>
                          <option value="enterprise">{'> 100 000 €'}</option>
                        </select>
                      </Field>
                      <Field label="Délai Souhaité" htmlFor="timeline">
                        <select id="timeline" name="timeline" value={formState.timeline} onChange={handleChange} className={inputClass}>
                          <option value="urgent">{'< 1 mois'}</option>
                          <option value="normal">1 - 3 mois</option>
                          <option value="flexible">3 - 6 mois</option>
                          <option value="longterm">{'> 6 mois'}</option>
                        </select>
                      </Field>
                    </div>
                  )}

                  {activeStep === 3 && (
                    <div className="space-y-4">
                      <Field label={`${t('contact.message')} *`} htmlFor="message">
                        <div className="relative">
                          <textarea
                            id="message"
                            name="message"
                            value={formState.message}
                            onChange={handleChange}
                            rows={5}
                            className={inputClass}
                            required
                          ></textarea>
                          <div className="absolute bottom-3 right-3 text-[var(--ink-300)]">
                            <Shield className="h-4 w-4" strokeWidth={1.5} />
                          </div>
                        </div>
                      </Field>
                      <p className="text-[12.5px] text-[var(--ink-500)]">
                        Vos informations sont protégées par un accord de confidentialité.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-7 flex justify-between items-center">
                {activeStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="text-[14px] text-[var(--ink-700)] hover:text-[var(--ink-900)] font-medium"
                  >
                    ← Précédent
                  </button>
                ) : (
                  <div />
                )}
                {activeStep < 3 ? (
                  <button type="button" onClick={nextStep} className="btn-pill ml-auto inline-flex items-center">
                    Suivant
                    <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
                  </button>
                ) : (
                  <button type="submit" className="btn-pill ml-auto inline-flex items-center">
                    {t('contact.submit')}
                    <Send className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Confidentiality Modal */}
      {showConfidentialityModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--ink-100)] flex items-center justify-between flex-shrink-0">
              <h3 className="display-3 text-[18px] text-[var(--ink-900)]">Accord de Confidentialité</h3>
              <button
                onClick={() => setShowConfidentialityModal(false)}
                disabled={isSubmitting}
                className="text-[var(--ink-500)] hover:text-[var(--ink-900)]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-grow">
              <pre className="whitespace-pre-wrap font-mono text-[11.5px] bg-[var(--ink-50)] p-4 rounded-2xl text-[var(--ink-900)]">
                {agreement}
              </pre>
              {errorMessage && (
                <div className="mt-3 bg-[#FFE9EA] rounded-2xl p-3">
                  <p className="text-[12px] text-[#C8102E]">
                    <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                    {errorMessage}
                  </p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-[var(--ink-100)] flex justify-end gap-3 flex-shrink-0 bg-[var(--ink-50)]">
              <button
                onClick={() => setShowConfidentialityModal(false)}
                disabled={isSubmitting}
                className="btn-pill-ghost"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setIsSubmitting(true);
                  setErrorMessage('');
                  try {
                    const blob = new Blob([agreement], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'accord-confidentialite.txt';
                    a.click();
                    window.URL.revokeObjectURL(url);

                    const result = await contactApi.submitContact(formState);
                    if (result.success) {
                      setFormStatus('success');
                      setShowConfidentialityModal(false);
                      setFormState({
                        name: '',
                        email: '',
                        phone: '',
                        subject: '',
                        budget: 'medium',
                        timeline: 'flexible',
                        message: '',
                      });
                      setActiveStep(1);
                    } else {
                      throw new Error(result.error || 'Failed to submit form');
                    }
                  } catch (error) {
                    console.error('Error submitting contact form:', error);
                    setErrorMessage(error instanceof Error ? error.message : 'An error occurred. Please try again.');
                    setFormStatus('error');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="btn-pill inline-flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="animate-spin mr-1.5 h-4 w-4" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Télécharger et envoyer
                    <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const InfoRow = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="bg-[var(--ink-50)] p-2.5 rounded-2xl flex-shrink-0">
      <Icon className="h-4 w-4 text-[var(--ink-900)]" strokeWidth={1.5} />
    </div>
    <div className="min-w-0">
      <p className="text-[13px] font-semibold text-[var(--ink-900)]">{label}</p>
      <div className="text-[14px] text-[var(--ink-700)] mt-0.5">{children}</div>
    </div>
  </div>
);

const Field = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) => (
  <div>
    <label htmlFor={htmlFor} className="block mb-1.5 text-[13px] font-semibold text-[var(--ink-900)]">
      {label}
    </label>
    {children}
  </div>
);

export default Contact;
