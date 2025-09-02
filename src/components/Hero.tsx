import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  ChevronRight, Code, Search, GraduationCap, Sparkles, 
  Shield, Leaf, HardHat, Clock, Users, CheckCircle2,
  Laptop, BookOpen, Zap, Trophy, ExternalLink, Award,
  X, PiggyBank, Lightbulb, Percent, Euro
} from 'lucide-react';
import WhatsAppWidget from 'react-whatsapp-chat-widget';
import 'react-whatsapp-chat-widget/index.css';

const CIIModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"></div>
        
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <Award className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-bold text-gray-900">
              Crédit Impôt Innovation (CII)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 font-medium">
              Le CII vous permet de récupérer 30% de vos dépenses d'innovation :
              <br />
              • Si vous payez des impôts : déduction directe de 30%
              <br />
              • Si vous ne payez pas d'impôts : remboursement de 30% par l'État
            </p>
          </div>

          <div className="grid gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Euro className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Exemple concret</h4>
                <p className="text-gray-600">
                  Pour un projet de 20 000€ :
                  <br />
                  • Vous récupérez 6 000€ (30% de 20 000€)
                  <br />
                  • Coût final : 14 000€
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Lightbulb className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Projets éligibles</h4>
                <p className="text-gray-600">
                  • Applications web et mobiles
                  <br />
                  • Logiciels sur mesure
                  <br />
                  • Intelligence artificielle
                  <br />
                  • Solutions innovantes pour votre entreprise
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Comment en bénéficier ?</h4>
                <p className="text-gray-600">
                  1. Vous investissez dans votre projet avec nous
                  <br />
                  2. Nous fournissons tous les justificatifs nécessaires
                  <br />
                  3. Vous recevez votre crédit d'impôt ou remboursement
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ServiceCard = ({ icon: Icon, title, description, cta, link, color, certification = null, cii = false, onCIIClick }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:border-white/20 transition-all"
  >
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${color}`}>
      <Icon className="h-8 w-8 text-white" />
    </div>
    <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
    <p className="text-gray-300 mb-6">{description}</p>
    {certification && (
      <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-start gap-4">
          <img 
            src="/LogoQualiopi-300dpi-Avec Marianne (1).png" 
            alt="Certification Qualiopi" 
            className="w-16 h-16 object-contain"
          />
          <div>
            <h4 className="text-white font-medium mb-2">Certification Qualiopi</h4>
            <p className="text-sm text-gray-300 mb-2">
              Certifié pour les actions de formation
              <br />
              N° 902945195
            </p>
            <a
              href="https://certifopac.fr/qualiopi/certification/verification/?siren=902945195#webApp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary-400 hover:text-primary-300 text-sm"
            >
              Vérifier la certification
              <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </div>
        </div>
      </div>
    )}
    {cii && (
      <button
        onClick={onCIIClick}
        className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20 w-full text-left hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-start gap-4">
          <div className="bg-blue-500/20 p-3 rounded-lg">
            <Award className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Certifié CII</h4>
            <p className="text-sm text-gray-300">
              Crédit Impôt Innovation
              <br />
              Réduisez jusqu'à 30% de vos dépenses R&D
            </p>
          </div>
        </div>
      </button>
    )}
    <button
      onClick={() => {
        if (link === '#digital-client') {
          const event = new CustomEvent('openDigitalClientSpace');
          window.dispatchEvent(event);
        } else {
          window.location.href = link;
        }
      }}
      className="inline-flex items-center text-white font-medium group"
    >
      {cta}
      <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
    </button>
  </motion.div>
);

const Hero = () => {
  const { t } = useTranslation();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCIIModalOpen, setIsCIIModalOpen] = useState(false);
  const containerRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const services = [
    {
      icon: Laptop,
      title: "Solutions Digitales",
      description: "Développement web, mobile et solutions entreprise sur mesure pour digitaliser votre activité.",
      cta: "Démarrer un projet",
      link: "#digital-client",
      color: "bg-gradient-to-br from-blue-600 to-cyan-600",
      cii: true
    },
    {
      icon: BookOpen,
      title: "Formation Professionnelle",
      description: "Formation certifiante Qualiopi en développement, DevOps et nouvelles technologies.",
      cta: "Découvrir nos formations",
      link: "https://app.deliverydigital.fr",
      color: "bg-gradient-to-br from-green-600 to-emerald-600",
      certification: true
    }
  ];

  const features = [
    { icon: Zap, text: "Technologies modernes" },
    { icon: Shield, text: "Sécurité renforcée" },
    { icon: Trophy, text: "Certification Qualiopi" },
    { icon: Award, text: "Certifié CII" }
  ];

  return (
    <section 
      ref={containerRef}
      id="home" 
      className="relative min-h-screen flex items-center pt-20 pb-20 overflow-hidden bg-[#020617]"
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10"></div>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.1), transparent 50%)' }}></div>
        <div className="tech-grid"></div>
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white/10 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.5,
              opacity: Math.random() * 0.5 + 0.3,
            }}
            animate={{
              y: [null, Math.random() * 800 - 400],
              x: [null, Math.random() * 800 - 400],
              opacity: [null, Math.random() * 0.5 + 0.3],
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              width: Math.random() * 4 + 1 + 'px',
              height: Math.random() * 4 + 1 + 'px',
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400">
              {t('hero.title')}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-300 mb-12"
          >
            {t('hero.subtitle')}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.2 }}
            >
              <ServiceCard {...service} onCIIClick={() => setIsCIIModalOpen(true)} />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-wrap justify-center gap-8 items-center"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center text-gray-300"
            >
              <feature.icon className="h-5 w-5 mr-2 text-primary-400" />
              <span>{feature.text}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        <CIIModal isOpen={isCIIModalOpen} onClose={() => setIsCIIModalOpen(false)} />
      </AnimatePresence>

      <WhatsAppWidget
        phoneNo="33749707773"
        position="right"
        widgetWidth="300px"
        widgetWidthMobile="260px"
        autoOpen={false}
        autoOpenTimer={5000}
        messageBox={true}
        messageBoxTxt="Bonjour! Comment puis-je vous aider aujourd'hui?"
        iconSize="40"
        iconColor="white"
        iconBgColor="#25D366"
        headerIcon={<Sparkles />}
        headerIconColor="white"
        headerTxtColor="white"
        headerBgColor="#128C7E"
        headerTitle="DELIVERY Digital Support"
        headerCaption="En ligne"
        bodyBgColor="#bbb"
        chatPersonName="Support"
        chatMessage={<>Bonjour 👋 <br /><br /> Comment pouvons-nous vous aider?</>}
        footerBgColor="#999"
        placeholder="Tapez votre message"
        btnBgColor="#25D366"
        btnTxt="Démarrer la discussion"
      />

      <div className="absolute bottom-0 left-0 w-full overflow-hidden">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path
            fill="#ffffff"
            fillOpacity="1"
            d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,128C672,107,768,85,864,90.7C960,96,1056,128,1152,133.3C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
    </section>
  );
};

export default Hero;