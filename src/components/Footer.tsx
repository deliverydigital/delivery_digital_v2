import { useTranslation } from 'react-i18next';
import {
  Facebook, Twitter, Linkedin, Instagram, Github,
  Mail, Phone, MapPin, Download, Map as MapIcon,
} from 'lucide-react';

const downloadAccessPlan = () => {
  const link = document.createElement('a');
  link.href = '/plan-acces-delivery-digital.png';
  link.download = 'Plan_acces_DELIVERY_Digital_Nice.png';
  link.click();
};

/**
 * Apple-style footer:
 * - Light gray bg #F5F5F7
 * - Compact text (12px)
 * - 5 columns of plain text links (no row icons)
 * - Disclaimer paragraph + horizontal legal links at bottom
 */
const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Services Numériques',
      items: [
        { label: 'Développement Web', link: '#' },
        { label: 'Applications Mobiles', link: '#' },
        { label: 'Solutions Entreprise', link: '#' },
        { label: 'Services Cloud', link: '#' },
        { label: 'DevOps & Infrastructure', link: '#' },
        { label: 'Conseil IT', link: '#' },
      ],
    },
    {
      title: 'Formation',
      items: [
        { label: 'Développement Web', link: '#' },
        { label: 'DevOps', link: '#' },
        { label: 'Cloud Computing', link: '#' },
        { label: 'Cybersécurité', link: '#' },
        { label: 'Certifications', link: '#' },
        { label: 'Formation sur mesure', link: '#' },
      ],
    },
    {
      title: 'Entreprise',
      items: [
        { label: 'À propos', link: '#' },
        { label: 'Carrières', link: '#' },
        { label: 'Blog', link: '#' },
        { label: 'Études de cas', link: '#' },
        { label: 'FAQ', link: '#' },
        { label: 'Support', link: '#' },
      ],
    },
    {
      title: 'Contact',
      items: [
        { label: '470 promenade des Anglais, 06200 Nice', icon: MapPin, isInfo: true },
        { label: 'contact@deliverydigital.fr', icon: Mail, link: 'mailto:contact@deliverydigital.fr' },
        { label: 'Lun - Ven · 9h - 18h', isInfo: true },
        { label: "Télécharger le plan d'accès", icon: Download, action: 'download-plan' as const },
      ],
    },
  ];

  const legalLinks = [
    { label: t('footer.links.privacy'), modal: 'privacy' },
    { label: t('footer.links.terms'), modal: 'terms' },
    { label: t('footer.links.sitemap'), modal: 'sitemap' },
    { label: 'Mentions légales', modal: 'legal' },
    { label: 'RGPD', modal: 'privacy' },
    { label: 'Réclamation', href: '/reclamation' },
  ];

  const socialLinks = [
    { icon: Facebook, label: 'Facebook', link: '#' },
    { icon: Twitter, label: 'Twitter', link: '#' },
    { icon: Linkedin, label: 'LinkedIn', link: '#' },
    { icon: Instagram, label: 'Instagram', link: '#' },
    { icon: Github, label: 'GitHub', link: '#' },
  ];

  return (
    <footer
      className="relative text-white/70 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 60% 100% at 50% -10%, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #161618 0%, #0A0A0C 40%, #000 100%)',
      }}
    >
      {/* Top reflection line */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)' }}
      />
      {/* Soft top glow */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-32 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.05), transparent 70%)' }}
      />

      <div className="container-wide py-10 sm:py-12 relative">
        {/* Disclaimer paragraph */}
        <p className="text-[12px] leading-relaxed text-white/45 max-w-3xl mb-8 pb-8 border-b border-white/10">
          DELIVERY Digital Nice · 470 promenade des Anglais, 06200 Nice · Siret 90294519500029 · NAF 6201Z · RCS 902 945 195.
          Déclaration d'activité enregistrée sous le numéro 93061064306 auprès du Préfet de la Région de Provence-Alpes-Côte d'Azur. Cet enregistrement ne vaut pas agrément de l'État.
        </p>

        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 mb-10">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-[12px] font-semibold tracking-tight text-white mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item: any) => (
                  <li key={item.label}>
                    {item.action === 'download-plan' ? (
                      <button
                        onClick={downloadAccessPlan}
                        className="text-[12px] text-white/55 hover:text-white hover:underline transition-colors inline-flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" strokeWidth={1.6} />
                        {item.label}
                      </button>
                    ) : item.link ? (
                      <a
                        href={item.link}
                        target={item.link.startsWith('http') ? '_blank' : '_self'}
                        rel={item.link.startsWith('http') ? 'noopener noreferrer' : ''}
                        className="text-[12px] text-white/55 hover:text-white hover:underline transition-colors"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span className="text-[12px] text-white/55">{item.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom: copyright + legal + socials */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            <span className="text-white/45">© {currentYear} DELIVERY Digital Nice. Tous droits réservés.</span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            {legalLinks.map((link) =>
              link.href ? (
                <a key={link.label} href={link.href} className="text-white/55 hover:text-white hover:underline">
                  {link.label}
                </a>
              ) : (
                <button
                  key={link.label}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openLegalModal', { detail: link.modal }));
                  }}
                  className="text-white/55 hover:text-white hover:underline"
                >
                  {link.label}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-3">
            {socialLinks.map(({ icon: Icon, label, link }) => (
              <a
                key={label}
                href={link}
                aria-label={label}
                className="text-white/55 hover:text-white transition-colors"
              >
                <Icon size={16} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom reflection: subtle horizontal sheen toward bottom */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
      />
    </footer>
  );
};

export default Footer;
