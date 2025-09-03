import { useTranslation } from 'react-i18next';
import { 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram, 
  Github,
  Mail,
  Phone,
  MapPin,
  Clock,
  Shield,
  Book,
  FileText,
  HelpCircle,
  Users,
  Building,
  Briefcase,
  GraduationCap,
  Code,
  Server,
  Cloud,
  Smartphone,
  LogIn,
  Settings
} from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Services Numériques",
      items: [
        { label: "Développement Web", icon: Code, link: "#" },
        { label: "Applications Mobiles", icon: Smartphone, link: "#" },
        { label: "Solutions Entreprise", icon: Building, link: "#" },
        { label: "Services Cloud", icon: Cloud, link: "#" },
        { label: "DevOps & Infrastructure", icon: Server, link: "#" },
        { label: "Conseil IT", icon: Users, link: "#" }
      ]
    },
    {
      title: "Formation",
      items: [
        { label: "Développement Web", icon: Code, link: "#" },
        { label: "DevOps", icon: Server, link: "#" },
        { label: "Cloud Computing", icon: Cloud, link: "#" },
        { label: "Cybersécurité", icon: Shield, link: "#" },
        { label: "Certifications", icon: GraduationCap, link: "#" },
        { label: "Formation sur mesure", icon: Book, link: "#" }
      ]
    },
    {
      title: "Entreprise",
      items: [
        { label: "À propos", icon: Building, link: "#" },
        { label: "Carrières", icon: Briefcase, link: "#" },
        { label: "Blog", icon: FileText, link: "#" },
        { label: "Études de cas", icon: Book, link: "#" },
        { label: "FAQ", icon: HelpCircle, link: "#" },
        { label: "Support", icon: Users, link: "#" }
      ]
    },
    {
      title: "Contact",
      items: [
        { 
          label: "470 promenade des anglais, 06200 Nice", 
          icon: MapPin,
          isInfo: true 
        },
        { 
          label: "07 49 70 77 73",
          icon: Phone,
          link: "tel:0749707773" 
        },
        { 
          label: "contact@deliverydigital.fr",
          icon: Mail,
          link: "mailto:contact@deliverydigital.fr" 
        },
        { 
          label: "Lun - Ven: 9h00 - 18h00",
          icon: Clock,
          isInfo: true 
        },
        {
          label: "Espace Client",
          icon: LogIn,
          link: "https://app.deliverydigital.fr/login",
          isHighlighted: true
        },
        {
          label: "Administration",
          icon: Settings,
          link: "/?admin=true",
          isAdmin: true
        }
      ]
    }
  ];

  const legalLinks = [
    { label: t('footer.links.privacy'), link: "#" },
    { label: t('footer.links.terms'), link: "#" },
    { label: t('footer.links.sitemap'), link: "#" },
    { label: "Mentions légales", link: "#" },
    { label: "RGPD", link: "#" }
  ];

  const socialLinks = [
    { icon: Facebook, label: "Facebook", link: "#" },
    { icon: Twitter, label: "Twitter", link: "#" },
    { icon: Linkedin, label: "LinkedIn", link: "#" },
    { icon: Instagram, label: "Instagram", link: "#" },
    { icon: Github, label: "GitHub", link: "#" }
  ];

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-6">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <Logo className="text-white mb-6" />
            <p className="text-gray-400 mb-6">
              Solutions informatiques innovantes pour votre entreprise, de la conception à la mise en œuvre. 
              Certifié Qualiopi pour la formation professionnelle.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map(({ icon: Icon, label, link }) => (
                <a
                  key={label}
                  href={link}
                  aria-label={label}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-lg font-bold mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item.label}>
                    {item.link ? (
                      <a
                        href={item.link}
                        target={item.link.startsWith('http') ? "_blank" : "_self"}
                        rel={item.link.startsWith('http') ? "noopener noreferrer" : ""}
                        className={`text-gray-400 hover:text-white transition-colors flex items-center group ${
                          item.isHighlighted ? 'bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700' : ''
                        } ${
                          item.isAdmin ? 'bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700' : ''
                        }`}
                      >
                        <item.icon className={`h-4 w-4 mr-2 ${
                          item.isHighlighted ? 'text-white' : 
                          item.isAdmin ? 'text-white' : 
                          'group-hover:text-primary-400'
                        }`} />
                        {item.label}
                      </a>
                    ) : (
                      <div className="text-gray-400 flex items-center">
                        <item.icon className="h-4 w-4 mr-2 text-primary-400" />
                        {item.label}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 mt-8 border-t border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="text-gray-500">
              © {currentYear} DELIVERY Digital Nice. Tous droits réservés.
            </div>
            <div className="flex flex-wrap gap-4 md:justify-end">
              {legalLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    const modalType = link.label === 'Politique de confidentialité' ? 'privacy' :
                                    link.label === 'Conditions d\'utilisation' ? 'terms' :
                                    link.label === 'Plan du site' ? 'sitemap' :
                                    link.label === 'Mentions légales' ? 'legal' : 'privacy';
                    window.dispatchEvent(new CustomEvent('openLegalModal', { detail: modalType }));
                  }}
                  className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="text-sm text-gray-500 border-t border-gray-800 pt-4 mt-4">
            <p>
              DELIVERY Digital Nice - 470 promenade des anglais 06200 Nice
              <br />
              Siret 90294519500029 - NAF 6201Z - RCS 902 945 195
              <br />
              Déclaration d'activité enregistrée sous le numéro 93061064306 auprès du Préfet de la Région de Provence-Alpes-Côte d'Azur
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;