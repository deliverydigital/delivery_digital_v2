import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle, Building2, Clock, Shield, ArrowRight, Download, Map, Loader, X } from 'lucide-react';
import { contactApi } from '../services/contactApi';

const generateConfidentialityAgreement = (formData) => {
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

const Contact = () => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(1);
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfidentialityModal, setShowConfidentialityModal] = useState(false);
  const [agreement, setAgreement] = useState('');
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    budget: 'medium',
    timeline: 'flexible',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (activeStep < 3) {
      setActiveStep(prev => prev + 1);
    }
  };

  const prevStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (activeStep > 1) {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep === 3) {
      const agreement = generateConfidentialityAgreement(formState);
      setAgreement(agreement);
      setShowConfidentialityModal(true);
    }
  };

  const downloadAccessPlan = () => {
    const link = document.createElement('a');
    link.href = "/Plan d'accès DELIVERY Digital_ copie.png";
    link.download = "Plan_acces_DELIVERY_Digital_Nice.png";
    link.click();
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === activeStep
              ? 'bg-primary-600 text-white'
              : step < activeStep
              ? 'bg-primary-100 text-primary-600'
              : 'bg-gray-100 text-gray-400'
          }`}>
            {step}
          </div>
          {step < 3 && (
            <div className={`w-12 h-0.5 ${
              step < activeStep ? 'bg-primary-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <section id="contact" className="relative bg-gradient-to-b from-white to-primary-50">
      <div className="container">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('contact.title')}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('contact.subtitle')}</p>
          </motion.div>
        </div>

        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold mb-6">Nos Bureaux</h3>
              
              <div className="space-y-6">
                <div className="flex items-start group">
                  <div className="bg-primary-50 p-3 rounded-lg group-hover:bg-primary-100 transition-colors">
                    <Building2 className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Nice</p>
                    <p className="text-gray-600">470 promenade des anglais, 06200</p>
                  </div>
                </div>
                
                <div className="flex items-start group">
                  <div className="bg-primary-50 p-3 rounded-lg group-hover:bg-primary-100 transition-colors">
                    <Mail className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Email</p>
                    <a href="mailto:contact@deliverydigital.fr" 
                       className="text-gray-600 hover:text-primary-600 transition-colors">
                      contact@deliverydigital.fr
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start group">
                  <div className="bg-primary-50 p-3 rounded-lg group-hover:bg-primary-100 transition-colors">
                    <Phone className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Téléphone</p>
                    <a href="tel:0749707773" 
                       className="text-gray-600 hover:text-primary-600 transition-colors">
                      07 49 70 77 73
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start group">
                  <div className="bg-primary-50 p-3 rounded-lg group-hover:bg-primary-100 transition-colors">
                    <Clock className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Horaires</p>
                    <p className="text-gray-600">Lun - Ven: 9h00 - 18h00</p>
                  </div>
                </div>

                <div className="flex items-start group">
                  <div className="bg-primary-50 p-3 rounded-lg group-hover:bg-primary-100 transition-colors">
                    <Map className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Plan d'accès</p>
                    <button
                      onClick={downloadAccessPlan}
                      className="text-primary-600 hover:text-primary-700 transition-colors flex items-center mt-1"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Télécharger le plan d'accès
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2884.8876148832847!2d7.214492776927496!3d43.66758905060871!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12cdd0106a852d31%3A0x40819a5fd979a70!2s470%20Promenade%20des%20Anglais%2C%2006200%20Nice!5e0!3m2!1sfr!2sfr!4v1709913327044!5m2!1sfr!2sfr"
                  className="w-full h-[250px] rounded-lg"
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Map"
                ></iframe>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
              {renderStepIndicator()}

              <AnimatePresence mode="wait">
                {formStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-green-50 text-green-800 rounded-lg flex items-center"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {t('contact.success')}
                  </motion.div>
                )}
                
                {formStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg flex items-center"
                  >
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {t('contact.error')}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="name\" className="block mb-2 text-sm font-medium text-gray-700">
                          {t('contact.name')} *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formState.name}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">
                          {t('contact.email')} *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formState.email}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block mb-2 text-sm font-medium text-gray-700">
                          {t('contact.phone')}
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formState.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="subject" className="block mb-2 text-sm font-medium text-gray-700">
                          {t('contact.subject')} *
                        </label>
                        <select
                          id="subject"
                          name="subject"
                          value={formState.subject}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        >
                          <option value="">Sélectionner</option>
                          <option value="web">Développement Web</option>
                          <option value="mobile">Application Mobile</option>
                          <option value="enterprise">Solution Entreprise</option>
                          <option value="cloud">Services Cloud</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="budget" className="block mb-2 text-sm font-medium text-gray-700">
                          Budget Estimé
                        </label>
                        <select
                          id="budget"
                          name="budget"
                          value={formState.budget}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="small">{"< 10k €"}</option>
                          <option value="medium">10k € - 50k €</option>
                          <option value="large">50k € - 100k €</option>
                          <option value="enterprise">{"> 100k €"}</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="timeline" className="block mb-2 text-sm font-medium text-gray-700">
                          Délai Souhaité
                        </label>
                        <select
                          id="timeline"
                          name="timeline"
                          value={formState.timeline}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="urgent">{"< 1 mois"}</option>
                          <option value="normal">1 - 3 mois</option>
                          <option value="flexible">3 - 6 mois</option>
                          <option value="longterm">{"> 6 mois"}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="message" className="block mb-2 text-sm font-medium text-gray-700">
                          {t('contact.message')} *
                        </label>
                        <div className="relative">
                          <textarea
                            id="message"
                            name="message"
                            value={formState.message}
                            onChange={handleChange}
                            rows={5}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            required
                          ></textarea>
                          <div className="absolute bottom-3 right-3">
                            <Shield className="h-5 w-5 text-primary-400" />
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          Vos informations sont protégées par un accord de confidentialité
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-8 flex justify-between items-center">
                {activeStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    ← Précédent
                  </button>
                ) : (
                  <div></div>
                )}
                {activeStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn btn-primary ml-auto flex items-center"
                  >
                    Suivant
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-primary ml-auto flex items-center"
                  >
                    {t('contact.submit')}
                    <Send className="ml-2 h-5 w-5" />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {showConfidentialityModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                Accord de Confidentialité
              </h3>
              <button
                onClick={() => setShowConfidentialityModal(false)}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-grow">
              <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-3 rounded-lg">
                {agreement}
              </pre>
              {errorMessage && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-800">
                    <AlertCircle className="inline h-4 w-4 mr-2" />
                    {errorMessage}
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setShowConfidentialityModal(false)}
                disabled={isSubmitting}
                className="btn btn-secondary"
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
                        message: ''
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
                className="btn btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="animate-spin mr-2 h-5 w-5" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Télécharger et envoyer
                    <ArrowRight className="ml-2 h-5 w-5" />
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

export default Contact;