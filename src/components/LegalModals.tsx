import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, Map, Scale, Mail, Phone, MapPin, Building2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms' | 'sitemap' | 'legal';
}

const LegalModal = ({ isOpen, onClose, type }: LegalModalProps) => {
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
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'sitemap' | 'legal' | null>(null);

  useState(() => {
    const handleOpenLegalModal = (event: CustomEvent) => {
      setActiveModal(event.detail);
    };

    window.addEventListener('openLegalModal', handleOpenLegalModal as EventListener);
    
    return () => {
      window.removeEventListener('openLegalModal', handleOpenLegalModal as EventListener);
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