import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, Map, Scale, Mail, Phone, MapPin, Building2, HelpCircle, ChevronDown, ChevronUp, Search, GraduationCap, Award, Clock, Users, Euro, CheckCircle, Book, Target, Briefcase, CreditCard, Globe, Laptop, PenTool, Languages, Car, Apple, Leaf, ShoppingCart, BarChart3 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms' | 'sitemap' | 'legal' | 'faq';
}

const LegalModal = ({ isOpen, onClose, type }: LegalModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  if (!isOpen) return null;

  const getModalContent = () => {
    switch (type) {
      case 'privacy':
        return {
          title: 'Politique de Confidentialité',
          icon: <Shield className="h-6 w-6" />,
          content: (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Collecte des données personnelles</h3>
                <p className="text-gray-700 mb-3">
                  DELIVERY Digital Nice collecte vos données personnelles dans le cadre de la fourniture de ses services de développement informatique et de formation professionnelle.
                </p>
                <p className="text-gray-700">
                  Les données collectées incluent : nom, prénom, adresse e-mail, numéro de téléphone, nom de l'entreprise, et toute information que vous nous transmettez volontairement.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Finalités du traitement</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Gestion de la relation client et des projets</li>
                  <li>Fourniture des services de développement informatique</li>
                  <li>Organisation et suivi des formations professionnelles</li>
                  <li>Communication commerciale (avec votre consentement)</li>
                  <li>Respect des obligations légales et réglementaires</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Base légale du traitement</h3>
                <p className="text-gray-700">
                  Le traitement de vos données personnelles est fondé sur l'exécution du contrat de prestation de services, 
                  le respect d'obligations légales, et votre consentement pour les communications commerciales.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Conservation des données</h3>
                <p className="text-gray-700">
                  Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées, 
                  et conformément aux obligations légales de conservation.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Vos droits</h3>
                <p className="text-gray-700 mb-3">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Droit d'accès à vos données personnelles</li>
                  <li>Droit de rectification</li>
                  <li>Droit à l'effacement</li>
                  <li>Droit à la limitation du traitement</li>
                  <li>Droit à la portabilité des données</li>
                  <li>Droit d'opposition</li>
                </ul>
                <p className="text-gray-700 mt-3">
                  Pour exercer ces droits, contactez-nous à : contact@deliverydigital.fr
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Sécurité des données</h3>
                <p className="text-gray-700">
                  Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données 
                  contre la perte, l'utilisation abusive, l'accès non autorisé, la divulgation, l'altération ou la destruction.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Contact</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 font-medium mb-2">Responsable du traitement :</p>
                  <p className="text-gray-700">DELIVERY Digital Nice</p>
                  <p className="text-gray-700">470 promenade des anglais, 06200 Nice</p>
                  <p className="text-gray-700">Email : contact@deliverydigital.fr</p>
                  <p className="text-gray-700">Téléphone : 07 49 70 77 73</p>
                </div>
              </section>
            </div>
          )
        };

      case 'terms':
        return {
          title: 'Conditions d\'Utilisation',
          icon: <FileText className="h-6 w-6" />,
          content: (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Objet</h3>
                <p className="text-gray-700">
                  Les présentes conditions générales d'utilisation régissent l'utilisation du site web et des services 
                  proposés par DELIVERY Digital Nice, société immatriculée sous le SIRET 90294519500029.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Services proposés</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Développement d'applications web et mobiles</li>
                  <li>Solutions informatiques sur mesure</li>
                  <li>Services cloud et infrastructure</li>
                  <li>Formation professionnelle certifiée Qualiopi</li>
                  <li>Conseil en transformation digitale</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Conditions d'accès</h3>
                <p className="text-gray-700">
                  L'accès au site est gratuit. Certains services peuvent nécessiter une inscription préalable. 
                  L'utilisateur s'engage à fournir des informations exactes et à jour.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Propriété intellectuelle</h3>
                <p className="text-gray-700">
                  Tous les éléments du site (textes, images, logos, etc.) sont protégés par le droit d'auteur. 
                  Toute reproduction sans autorisation est interdite.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Responsabilité</h3>
                <p className="text-gray-700">
                  DELIVERY Digital Nice s'efforce de maintenir la disponibilité du site mais ne peut garantir 
                  un accès permanent. La société ne saurait être tenue responsable des dommages directs ou indirects 
                  résultant de l'utilisation du site.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Modification des conditions</h3>
                <p className="text-gray-700">
                  DELIVERY Digital Nice se réserve le droit de modifier les présentes conditions à tout moment. 
                  Les modifications prennent effet dès leur publication sur le site.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Droit applicable</h3>
                <p className="text-gray-700">
                  Les présentes conditions sont soumises au droit français. Tout litige sera de la compétence 
                  exclusive des tribunaux de Nice.
                </p>
              </section>
            </div>
          )
        };

      case 'sitemap':
        return {
          title: 'Plan du Site',
          icon: <Map className="h-6 w-6" />,
          content: (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Pages principales</h3>
                <ul className="space-y-2">
                  <li><a href="#home" className="text-blue-600 hover:text-blue-800">Accueil</a></li>
                  <li><a href="#services" className="text-blue-600 hover:text-blue-800">Nos Services</a></li>
                  <li><a href="#training" className="text-blue-600 hover:text-blue-800">Formation Professionnelle</a></li>
                  <li><a href="#contact" className="text-blue-600 hover:text-blue-800">Contact</a></li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Services Numériques</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Développement Web</li>
                  <li>• Applications Mobiles</li>
                  <li>• Solutions Entreprise</li>
                  <li>• Services Cloud</li>
                  <li>• DevOps & Infrastructure</li>
                  <li>• Conseil IT</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Formation</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• WordPress</li>
                  <li>• Photoshop</li>
                  <li>• Canva</li>
                  <li>• Excel</li>
                  <li>• Développeur Web et Web Mobile</li>
                  <li>• Langues (Anglais, Espagnol)</li>
                  <li>• Hygiène, Sécurité et Développement Durable</li>
                  <li>• AutoCAD, SketchUp, et Revit</li>
                  <li>• Management</li>
                  <li>• Techniques de Vente Omnicanal</li>
                  <li>• Nutrition</li>
                  <li>• Conduite Sécuritaire</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Espaces Clients</h3>
                <ul className="space-y-2">
                  <li><a href="https://app.deliverydigital.fr/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Espace Formation</a></li>
                  <li><a href="/?admin=true" className="text-blue-600 hover:text-blue-800">Administration</a></li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations légales</h3>
                <ul className="space-y-2">
                  <li><button onClick={() => window.dispatchEvent(new CustomEvent('openLegalModal', { detail: 'privacy' }))} className="text-blue-600 hover:text-blue-800">Politique de confidentialité</button></li>
                  <li><button onClick={() => window.dispatchEvent(new CustomEvent('openLegalModal', { detail: 'terms' }))} className="text-blue-600 hover:text-blue-800">Conditions d'utilisation</button></li>
                  <li><button onClick={() => window.dispatchEvent(new CustomEvent('openLegalModal', { detail: 'legal' }))} className="text-blue-600 hover:text-blue-800">Mentions légales</button></li>
                </ul>
              </section>
            </div>
          )
        };

      case 'legal':
        return {
          title: 'Mentions Légales',
          icon: <Scale className="h-6 w-6" />,
          content: (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Éditeur du site</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="text-gray-700"><strong>Raison sociale :</strong> DELIVERY Digital Nice</p>
                  <p className="text-gray-700"><strong>Forme juridique :</strong> SASU au capital de 1000€</p>
                  <p className="text-gray-700"><strong>SIRET :</strong> 90294519500029</p>
                  <p className="text-gray-700"><strong>NAF :</strong> 6201Z</p>
                  <p className="text-gray-700"><strong>RCS :</strong> 902 945 195</p>
                  <p className="text-gray-700"><strong>Adresse :</strong> 470 promenade des anglais, 06200 Nice</p>
                  <p className="text-gray-700"><strong>Téléphone :</strong> 07 49 70 77 73</p>
                  <p className="text-gray-700"><strong>Email :</strong> contact@deliverydigital.fr</p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Organisme de formation</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-700 mb-2">
                    <strong>Déclaration d'activité :</strong> Enregistrée sous le numéro 93061064306 auprès du Préfet de la Région de Provence-Alpes-Côte d'Azur
                  </p>
                  <p className="text-gray-700">
                    <strong>Certification Qualiopi :</strong> Certifié pour les actions de formation (N° 902945195)
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Directeur de publication</h3>
                <p className="text-gray-700">
                  Le directeur de publication est le représentant légal de DELIVERY Digital Nice.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Hébergement</h3>
                <p className="text-gray-700">
                  Ce site est hébergé par des services cloud sécurisés respectant les normes européennes de protection des données.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Propriété intellectuelle</h3>
                <p className="text-gray-700">
                  L'ensemble des contenus présents sur ce site (textes, images, logos, etc.) sont protégés par le droit d'auteur 
                  et appartiennent à DELIVERY Digital Nice ou à ses partenaires. Toute reproduction, même partielle, 
                  est interdite sans autorisation préalable.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cookies</h3>
                <p className="text-gray-700">
                  Ce site utilise des cookies techniques nécessaires à son bon fonctionnement. 
                  Aucun cookie de tracking ou publicitaire n'est utilisé sans votre consentement.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Droit applicable</h3>
                <p className="text-gray-700">
                  Le présent site et les présentes mentions légales sont soumis au droit français. 
                  Tout litige sera de la compétence exclusive des tribunaux de Nice.
                </p>
              </section>
            </div>
          )
        };

      case 'faq':
        const faqCategories = [
          {
            title: "Certification Qualiopi",
            icon: <Award className="h-5 w-5 text-yellow-500" />,
            questions: [
              {
                id: "qualiopi-1",
                question: "Qu'est-ce que la certification Qualiopi ?",
                answer: "Qualiopi est la marque de certification qualité des prestataires d'actions concourant au développement des compétences. Elle atteste de la qualité du processus mis en œuvre par les organismes de formation. DELIVERY Digital Nice est certifié Qualiopi sous le numéro 902945195."
              },
              {
                id: "qualiopi-2",
                question: "Quels sont les avantages de la certification Qualiopi ?",
                answer: "La certification Qualiopi garantit la qualité de nos formations et permet la prise en charge par les OPCO, Pôle Emploi, et autres financeurs publics. Elle assure également le respect de critères qualité stricts dans nos processus de formation."
              },
              {
                id: "qualiopi-3",
                question: "Comment vérifier votre certification Qualiopi ?",
                answer: "Vous pouvez vérifier notre certification sur le site officiel : https://certifopac.fr/qualiopi/certification/verification/?siren=902945195. Notre numéro de certification est 902945195."
              }
            ]
          },
          {
            title: "Financement et Prise en Charge",
            icon: <Euro className="h-5 w-5 text-green-500" />,
            questions: [
              {
                id: "finance-1",
                question: "Mes formations peuvent-elles être prises en charge ?",
                answer: "Oui, toutes nos formations sont éligibles aux financements OPCO, CPF, Pôle Emploi, et autres dispositifs de financement de la formation professionnelle grâce à notre certification Qualiopi."
              },
              {
                id: "finance-2",
                question: "Comment faire une demande de prise en charge OPCO ?",
                answer: "Nous vous accompagnons dans vos démarches. Contactez-nous avec vos informations d'entreprise et nous préparerons le dossier de demande de prise en charge auprès de votre OPCO."
              },
              {
                id: "finance-3",
                question: "Qu'est-ce que le CPF et puis-je l'utiliser ?",
                answer: "Le Compte Personnel de Formation (CPF) permet de financer des formations certifiantes. Certaines de nos formations sont éligibles au CPF. Vérifiez votre solde sur moncompteformation.gouv.fr."
              },
              {
                id: "finance-4",
                question: "Quels sont les délais de prise en charge ?",
                answer: "Les délais varient selon l'organisme financeur : OPCO (2-4 semaines), Pôle Emploi (1-3 semaines), CPF (immédiat). Nous vous conseillons de faire votre demande au moins 1 mois avant le début de formation."
              }
            ]
          },
          {
            title: "Formations Disponibles",
            icon: <Book className="h-5 w-5 text-blue-500" />,
            questions: [
              {
                id: "formations-1",
                question: "Quelles formations proposez-vous ?",
                answer: "Nous proposons des formations en développement web (WordPress, développement full-stack), design (Photoshop, Canva, AutoCAD, SketchUp, Revit), bureautique (Excel), langues (Anglais, Espagnol), management, vente, nutrition, hygiène-sécurité, et conduite sécuritaire."
              },
              {
                id: "formations-2",
                question: "Proposez-vous des formations sur mesure ?",
                answer: "Oui, nous concevons des programmes de formation personnalisés selon vos besoins spécifiques d'entreprise. Contactez-nous pour étudier votre projet de formation sur mesure."
              },
              {
                id: "formations-3",
                question: "Vos formations sont-elles certifiantes ?",
                answer: "Oui, nos formations délivrent des attestations de fin de formation et certains programmes permettent d'obtenir des certifications reconnues (TOEIC pour l'anglais, certifications professionnelles, etc.)."
              },
              {
                id: "formations-4",
                question: "Quelle est la durée de vos formations ?",
                answer: "La durée varie selon le programme : de 14h (Hygiène et Développement Durable) à 400h (Développeur Web et Web Mobile). Chaque formation est adaptée aux objectifs pédagogiques et aux compétences à acquérir."
              }
            ]
          },
          {
            title: "Modalités Pratiques",
            icon: <Clock className="h-5 w-5 text-purple-500" />,
            questions: [
              {
                id: "pratique-1",
                question: "Où se déroulent les formations ?",
                answer: "Nos formations se déroulent principalement dans nos locaux au 470 promenade des anglais à Nice. Nous proposons aussi des formations à distance et des formations en entreprise selon les besoins."
              },
              {
                id: "pratique-2",
                question: "Quels sont vos horaires de formation ?",
                answer: "Nos formations se déroulent généralement de 9h00 à 17h00 du lundi au vendredi. Les horaires peuvent être adaptés selon les contraintes des participants et le type de formation."
              },
              {
                id: "pratique-3",
                question: "Combien de participants maximum par session ?",
                answer: "Nous limitons nos groupes à 12 participants maximum pour garantir un suivi personnalisé et une qualité pédagogique optimale."
              },
              {
                id: "pratique-4",
                question: "Proposez-vous des formations à distance ?",
                answer: "Oui, nous proposons des formations en visioconférence avec accès à notre plateforme pédagogique 24h/24 et 7j/7. L'accompagnement formateur reste identique à nos formations présentiel."
              },
              {
                id: "pratique-5",
                question: "Quel est le délai d'accès aux formations ?",
                answer: "Le délai d'accès est généralement d'1 semaine après inscription. Pour les formations financées, le délai peut être plus long selon les démarches administratives nécessaires."
              }
            ]
          },
          {
            title: "Méthodes Pédagogiques",
            icon: <Target className="h-5 w-5 text-red-500" />,
            questions: [
              {
                id: "methodes-1",
                question: "Quelles méthodes pédagogiques utilisez-vous ?",
                answer: "Nous utilisons une approche mixte : séances en visioconférence avec formateur, accès permanent à notre plateforme pédagogique, exercices pratiques, projets concrets, et suivi personnalisé. Certaines formations utilisent l'AFEST (Action de Formation en Situation de Travail)."
              },
              {
                id: "methodes-2",
                question: "Qu'est-ce que l'AFEST ?",
                answer: "L'AFEST (Action de Formation en Situation de Travail) est une modalité de formation qui se déroule directement sur le lieu de travail. Le formateur accompagne l'apprenant en visioconférence pendant qu'il réalise ses tâches professionnelles."
              },
              {
                id: "methodes-3",
                question: "Comment évaluez-vous les acquis ?",
                answer: "Nous réalisons une évaluation en début et fin de formation pour mesurer la progression. Des QCM, exercices pratiques et projets permettent d'évaluer les compétences acquises tout au long du parcours."
              },
              {
                id: "methodes-4",
                question: "Fournissez-vous des supports de formation ?",
                answer: "Oui, tous nos supports sont accessibles sur notre plateforme pédagogique : cours, exercices, ressources complémentaires, et outils pratiques. Vous gardez l'accès même après la formation."
              }
            ]
          },
          {
            title: "Accessibilité et Handicap",
            icon: <Users className="h-5 w-5 text-indigo-500" />,
            questions: [
              {
                id: "accessibilite-1",
                question: "Vos formations sont-elles accessibles aux personnes handicapées ?",
                answer: "Oui, nous nous engageons à rendre nos formations accessibles. Contactez-nous pour étudier ensemble les adaptations nécessaires selon votre situation. Email : contact@deliverydigital.fr - Tél : 07 49 70 77 73"
              },
              {
                id: "accessibilite-2",
                question: "Quelles adaptations pouvez-vous proposer ?",
                answer: "Nous pouvons adapter nos méthodes pédagogiques, supports de formation, rythme d'apprentissage, et modalités d'évaluation selon les besoins spécifiques. Nos locaux sont accessibles aux personnes à mobilité réduite."
              },
              {
                id: "accessibilite-3",
                question: "Avez-vous un référent handicap ?",
                answer: "Oui, nous avons un référent handicap formé pour vous accompagner dans l'adaptation de votre parcours de formation. Contactez-nous pour un entretien personnalisé."
              }
            ]
          },
          {
            title: "Inscription et Suivi",
            icon: <Briefcase className="h-5 w-5 text-cyan-500" />,
            questions: [
              {
                id: "inscription-1",
                question: "Comment s'inscrire à une formation ?",
                answer: "Vous pouvez vous inscrire directement sur notre plateforme https://app.deliverydigital.fr/student/signup ou nous contacter par email/téléphone. Nous vous accompagnons dans toutes les démarches."
              },
              {
                id: "inscription-2",
                question: "Quels documents fournir pour l'inscription ?",
                answer: "Pour une inscription, nous avons besoin de : pièce d'identité, justificatifs de financement (si applicable), et parfois un test de positionnement selon la formation choisie."
              },
              {
                id: "inscription-3",
                question: "Proposez-vous un suivi post-formation ?",
                answer: "Oui, nous proposons un suivi à 3 et 6 mois après la formation pour évaluer la mise en pratique des compétences acquises et vous accompagner si nécessaire."
              },
              {
                id: "inscription-4",
                question: "Peut-on annuler ou reporter une formation ?",
                answer: "Oui, selon nos conditions générales de vente. L'annulation est possible jusqu'à 15 jours avant le début de formation. Le report est possible selon les places disponibles sur les sessions suivantes."
              }
            ]
          },
          {
            title: "Qualité et Certification",
            icon: <Award className="h-5 w-5 text-orange-500" />,
            questions: [
              {
                id: "qualite-1",
                question: "Comment garantissez-vous la qualité de vos formations ?",
                answer: "Notre certification Qualiopi garantit le respect de 7 critères qualité : information du public, identification des objectifs, adaptation aux publics, adéquation des moyens, qualification des formateurs, investissement du prestataire, et prise en compte des appréciations."
              },
              {
                id: "qualite-2",
                question: "Qui sont vos formateurs ?",
                answer: "Nos formateurs sont des professionnels expérimentés dans leur domaine, avec une double compétence technique et pédagogique. Ils sont régulièrement formés aux nouvelles technologies et méthodes pédagogiques."
              },
              {
                id: "qualite-3",
                question: "Comment évaluez-vous la satisfaction des stagiaires ?",
                answer: "Nous réalisons des évaluations de satisfaction à chaud (fin de formation) et à froid (3 mois après). Les résultats sont analysés pour améliorer continuellement nos formations."
              },
              {
                id: "qualite-4",
                question: "Délivrez-vous des attestations ?",
                answer: "Oui, nous délivrons systématiquement une attestation de fin de formation mentionnant les objectifs, la durée, et les résultats de l'évaluation des acquis."
              }
            ]
          },
          {
            title: "Formations Spécifiques",
            icon: <Laptop className="h-5 w-5 text-pink-500" />,
            questions: [
              {
                id: "specifique-1",
                question: "La formation 'Développeur Web et Web Mobile' mène-t-elle à un emploi ?",
                answer: "Cette formation de 400h vous donne toutes les compétences pour devenir développeur. Nous proposons un accompagnement à la recherche d'emploi et avons un réseau d'entreprises partenaires."
              },
              {
                id: "specifique-2",
                question: "Les formations en langues préparent-elles aux certifications ?",
                answer: "Oui, nos formations Reflex English préparent au TOEIC. Nos formations Reflex Español peuvent préparer au DELE. Les tests de certification ne sont pas inclus dans le prix de formation."
              },
              {
                id: "specifique-3",
                question: "La formation AutoCAD, SketchUp, Revit est-elle adaptée aux débutants ?",
                answer: "Cette formation de 100h est conçue pour tous niveaux. Nous commençons par les bases de chaque logiciel avant d'aborder les fonctionnalités avancées et projets concrets."
              },
              {
                id: "specifique-4",
                question: "La formation Hygiène et Sécurité est-elle obligatoire en restauration ?",
                answer: "La formation en hygiène alimentaire est obligatoire pour au moins une personne par établissement de restauration commerciale (décret n°2011-731). Notre formation répond à cette obligation."
              }
            ]
          },
          {
            title: "Plateforme et Outils",
            icon: <Globe className="h-5 w-5 text-teal-500" />,
            questions: [
              {
                id: "plateforme-1",
                question: "Comment accéder à la plateforme de formation ?",
                answer: "Après inscription, vous recevez vos identifiants pour accéder à https://app.deliverydigital.fr. La plateforme est accessible 24h/24 et 7j/7 depuis tout appareil connecté."
              },
              {
                id: "plateforme-2",
                question: "Que trouve-t-on sur la plateforme ?",
                answer: "La plateforme contient tous vos cours, exercices, QCM, ressources téléchargeables, suivi de progression, planning des visioconférences, et espace d'échange avec le formateur."
              },
              {
                id: "plateforme-3",
                question: "Combien de temps garde-t-on l'accès à la plateforme ?",
                answer: "Vous conservez l'accès à vos contenus de formation pendant 1 an après la fin de votre formation, vous permettant de réviser et approfondir vos connaissances."
              },
              {
                id: "plateforme-4",
                question: "La plateforme fonctionne-t-elle sur mobile ?",
                answer: "Oui, notre plateforme est responsive et fonctionne parfaitement sur smartphone et tablette. Vous pouvez suivre vos formations en mobilité."
              }
            ]
          },
          {
            title: "Évaluation et Certification",
            icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
            questions: [
              {
                id: "evaluation-1",
                question: "Comment se déroulent les évaluations ?",
                answer: "Nous réalisons une évaluation de positionnement en début, des évaluations formatives pendant la formation (QCM, exercices), et une évaluation finale pour valider les acquis."
              },
              {
                id: "evaluation-2",
                question: "Que se passe-t-il si je ne valide pas la formation ?",
                answer: "En cas de difficultés, nous proposons un accompagnement renforcé et des sessions de rattrapage. L'objectif est votre réussite, nous adaptons notre pédagogie à vos besoins."
              },
              {
                id: "evaluation-3",
                question: "Les certificats sont-ils reconnus ?",
                answer: "Nos attestations de formation sont reconnues par les entreprises et organismes publics. Pour certaines formations, nous préparons à des certifications officielles reconnues au niveau national ou international."
              }
            ]
          },
          {
            title: "Support et Accompagnement",
            icon: <Users className="h-5 w-5 text-violet-500" />,
            questions: [
              {
                id: "support-1",
                question: "Quel accompagnement proposez-vous pendant la formation ?",
                answer: "Chaque stagiaire bénéficie d'un suivi personnalisé : formateur dédié, tutorat individuel, support technique, et accompagnement pédagogique adapté au rythme d'apprentissage."
              },
              {
                id: "support-2",
                question: "Comment contacter le support technique ?",
                answer: "Notre support est disponible par email (contact@deliverydigital.fr), téléphone (07 49 70 77 73), ou directement via la messagerie de la plateforme. Temps de réponse : moins de 24h."
              },
              {
                id: "support-3",
                question: "Proposez-vous un accompagnement après la formation ?",
                answer: "Oui, nous proposons un suivi post-formation gratuit pendant 3 mois pour répondre à vos questions et vous accompagner dans la mise en pratique de vos nouvelles compétences."
              }
            ]
          }
        ];

        const allQuestions = faqCategories.flatMap(category => 
          category.questions.map(q => ({ ...q, category: category.title, categoryIcon: category.icon }))
        );

        const filteredQuestions = searchQuery 
          ? allQuestions.filter(q => 
              q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
              q.category.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : allQuestions;

        return {
          title: 'Questions Fréquentes - Centre de Formation Qualiopi',
          icon: <HelpCircle className="h-6 w-6" />,
          content: (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Award className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">Centre de Formation Certifié Qualiopi</h3>
                    <p className="text-blue-700">Organisme de formation enregistré sous le numéro 93061064306</p>
                  </div>
                </div>
                <p className="text-blue-800">
                  Retrouvez toutes les réponses aux questions les plus fréquentes concernant nos formations professionnelles, 
                  nos modalités de financement, et notre certification Qualiopi.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans la FAQ..."
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>

              {searchQuery ? (
                /* Search Results */
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Résultats de recherche ({filteredQuestions.length})
                  </h3>
                  {filteredQuestions.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">Aucun résultat trouvé pour "{searchQuery}"</p>
                  ) : (
                    filteredQuestions.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => toggleFAQ(item.id)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            {item.categoryIcon}
                            <div className="ml-3">
                              <span className="font-medium text-gray-900">{item.question}</span>
                              <div className="text-sm text-gray-500">{item.category}</div>
                            </div>
                          </div>
                          {expandedFAQ === item.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <AnimatePresence>
                          {expandedFAQ === item.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0 text-gray-700 border-t border-gray-200">
                                {item.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Categories */
                faqCategories.map((category) => (
                  <div key={category.title} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center">
                        {category.icon}
                        <h3 className="text-lg font-semibold text-gray-900 ml-3">{category.title}</h3>
                        <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {category.questions.length} questions
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {category.questions.map((item) => (
                        <div key={item.id}>
                          <button
                            onClick={() => toggleFAQ(item.id)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-medium text-gray-900">{item.question}</span>
                            {expandedFAQ === item.id ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                          <AnimatePresence>
                            {expandedFAQ === item.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 pt-0 text-gray-700 bg-blue-50 border-t border-gray-200">
                                  {item.answer}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {/* Contact Section */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6 mt-8">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Une question non résolue ?</h3>
                  <p className="text-gray-700 mb-4">
                    Notre équipe est à votre disposition pour répondre à toutes vos questions
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                      href="mailto:contact@deliverydigital.fr"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      contact@deliverydigital.fr
                    </a>
                    <a
                      href="tel:0749707773"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      07 49 70 77 73
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        };

      default:
        return {
          title: 'Information',
          icon: <FileText className="h-6 w-6" />,
          content: <p>Contenu non disponible</p>
        };
    }
  };

  const { title, icon, content } = getModalContent();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              {icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {content}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </div>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const LegalModals = () => {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'sitemap' | 'legal' | 'faq' | null>(null);

  useState(() => {
    const handleOpenLegalModal = (event: CustomEvent) => {
      setActiveModal(event.detail);
    };

    const handleOpenFAQModal = () => {
      setActiveModal('faq');
    };

    window.addEventListener('openLegalModal', handleOpenLegalModal as EventListener);
    window.addEventListener('openFAQModal', handleOpenFAQModal as EventListener);
    
    return () => {
      window.removeEventListener('openLegalModal', handleOpenLegalModal as EventListener);
      window.removeEventListener('openFAQModal', handleOpenFAQModal as EventListener);
    };
  });

  return (
    <AnimatePresence>
      {activeModal && (
        <LegalModal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          type={activeModal}
        />
      )}
    </AnimatePresence>
  );
};

export default LegalModals;