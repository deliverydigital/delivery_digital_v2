import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const SkillBar = ({ title, percentage }: { title: string; percentage: string }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <div className="mb-6" ref={ref}>
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm font-medium text-gray-500">{percentage}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <motion.div 
          className="bg-primary-600 h-2.5 rounded-full" 
          initial={{ width: 0 }}
          animate={{ width: inView ? percentage : 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

const About = () => {
  const { t } = useTranslation();
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const skills = [
    { title: t('about.expertise.1.title'), value: t('about.expertise.1.value') },
    { title: t('about.expertise.2.title'), value: t('about.expertise.2.value') },
    { title: t('about.expertise.3.title'), value: t('about.expertise.3.value') },
    { title: t('about.expertise.4.title'), value: t('about.expertise.4.value') },
  ];

  return (
    <section id="about" className="section bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('about.title')}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('about.subtitle')}</p>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-gray-700 mb-8 leading-relaxed">
              {t('about.description')}
            </p>
            <div className="space-y-4">
              {skills.map((skill, index) => (
                <SkillBar 
                  key={index} 
                  title={skill.title} 
                  percentage={skill.value} 
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-xl overflow-hidden shadow-lg aspect-video">
              <img 
                src="https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                alt="Team collaboration" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
                <div className="p-8">
                  <h3 className="text-white text-2xl font-bold">Notre Équipe</h3>
                  <p className="text-white/80">Experts passionnés et innovants</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;