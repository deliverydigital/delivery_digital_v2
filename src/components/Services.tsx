import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Globe, Smartphone, Database, Cloud, Cpu, Code, Server, Network, GraduationCap, Award } from 'lucide-react';
import { useState, useEffect } from 'react';

const CodeSnippet = ({ code, language }: { code: string[], language: string }) => {
  const [currentLine, setCurrentLine] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine((prev) => (prev + 1) % code.length);
    }, 150);
    return () => clearInterval(interval);
  }, [code.length]);

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 font-mono text-sm overflow-hidden border border-white/10 h-48">
      <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
        <div className="w-2 h-2 rounded-full bg-red-500"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-xs text-gray-400 ml-2">{language}</span>
      </div>
      <div className="space-y-1">
        {code.map((line, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ 
              opacity: index <= currentLine ? 1 : 0,
              x: index <= currentLine ? 0 : -20
            }}
            className="text-gray-300"
          >
            {line.startsWith('//') ? (
              <span className="text-gray-500">{line}</span>
            ) : line.match(/"([^"]+)"/) ? (
              <span dangerouslySetInnerHTML={{
                __html: line.replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
              }} />
            ) : (
              <span dangerouslySetInnerHTML={{
                __html: line
                  .replace(/const|class|function|return|import|export|from/g, '<span class="text-purple-400">$&</span>')
                  .replace(/true|false|null|undefined/g, '<span class="text-yellow-400">$&</span>')
                  .replace(/[[\]{}]/g, '<span class="text-blue-400">$&</span>')
                  .replace(/\.(get|post|put|delete)/g, '<span class="text-cyan-400">$&</span>')
              }} />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Services = () => {
  const { t } = useTranslation();
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  const webCode = [
    "// Modern React Component",
    "import { useState } from 'react';",
    "",
    "function WebApp() {",
    "  const [data, setData] = useState([]);",
    "",
    "  async function fetchData() {",
    "    const response = await api.get('/data');",
    "    setData(response.data);",
    "  }",
    "",
    "  return (",
    "    <div className='app'>",
    "      <h1>Web Application</h1>",
    "      {data.map(item => (",
    "        <Card key={item.id} {...item} />",
    "      ))}",
    "    </div>",
    "  );",
    "}"
  ];

  const mobileCode = [
    "// React Native App",
    "import { View, Text } from 'react-native';",
    "",
    "function MobileApp() {",
    "  return (",
    "    <View style={styles.container}>",
    "      <Text style={styles.title}>",
    "        Mobile Application",
    "      </Text>",
    "      <TouchableOpacity>",
    "        <Text>Click Me</Text>",
    "      </TouchableOpacity>",
    "    </View>",
    "  );",
    "}"
  ];

  const backendCode = [
    "// Express.js API",
    "import express from 'express';",
    "",
    "const app = express();",
    "",
    "app.post('/api/data', async (req, res) => {",
    "  try {",
    "    const result = await db.create(req.body);",
    "    res.json({ success: true, data: result });",
    "  } catch (error) {",
    "    res.status(500).json({ error: error.message });",
    "  }",
    "});"
  ];

  const cloudCode = [
    "// AWS Lambda Function",
    "exports.handler = async (event) => {",
    "  const { Records } = event;",
    "",
    "  for (const record of Records) {",
    "    await processMessage(record);",
    "    await updateDatabase(record);",
    "  }",
    "",
    "  return {",
    "    statusCode: 200,",
    "    body: JSON.stringify({ success: true })",
    "  };",
    "}"
  ];

  const trainingCode = [
    "// Formation React.js",
    "import { useState, useEffect } from 'react';",
    "",
    "function TrainingModule() {",
    "  const [progress, setProgress] = useState(0);",
    "",
    "  function completeModule() {",
    "    setProgress(100);",
    "    generateCertificate();",
    "  }",
    "",
    "  return (",
    "    <div className='training'>",
    "      <h1>Module Formation React</h1>",
    "      <ProgressBar value={progress} />",
    "      <button onClick={completeModule}>",
    "        Valider le module",
    "      </button>",
    "    </div>",
    "  );",
    "}"
  ];

  const serviceItems = [
    {
      icon: <Globe className="h-10 w-10 text-blue-400" />,
      title: t('services.web.title'),
      description: t('services.web.description'),
      bgIcon: <Code className="absolute -right-8 -bottom-8 h-32 w-32 text-white/5 transform rotate-12" />,
      code: webCode,
      language: "React.js",
      badge: {
        icon: <Award className="h-4 w-4 text-blue-400" />,
        text: "Certifié CII - Crédit Impôt Innovation"
      }
    },
    {
      icon: <Smartphone className="h-10 w-10 text-purple-400" />,
      title: t('services.mobile.title'),
      description: t('services.mobile.description'),
      bgIcon: <Cpu className="absolute -right-8 -bottom-8 h-32 w-32 text-white/5 transform rotate-12" />,
      code: mobileCode,
      language: "React Native"
    },
    {
      icon: <Database className="h-10 w-10 text-cyan-400" />,
      title: t('services.enterprise.title'),
      description: t('services.enterprise.description'),
      bgIcon: <Server className="absolute -right-8 -bottom-8 h-32 w-32 text-white/5 transform rotate-12" />,
      code: backendCode,
      language: "Node.js"
    },
    {
      icon: <Cloud className="h-10 w-10 text-pink-400" />,
      title: t('services.cloud.title'),
      description: t('services.cloud.description'),
      bgIcon: <Network className="absolute -right-8 -bottom-8 h-32 w-32 text-white/5 transform rotate-12" />,
      code: cloudCode,
      language: "AWS Lambda"
    },
    {
      icon: <GraduationCap className="h-10 w-10 text-green-400" />,
      title: t('services.training.title'),
      description: t('services.training.description'),
      bgIcon: <Code className="absolute -right-8 -bottom-8 h-32 w-32 text-white/5 transform rotate-12" />,
      code: trainingCode,
      language: "Formation React.js"
    }
  ];

  return (
    <section id="services" className="section">
      <div className="tech-grid"></div>
      <div className="animated-bg"></div>
      
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-900/20 border border-blue-500/20">
              <Award className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-blue-400">Entreprise certifiée CII</span>
            </div>
          </motion.div>
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4 gradient-text"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            {t('services.title')}
          </motion.h2>
          <motion.p 
            className="text-lg text-gray-300 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {t('services.subtitle')}
          </motion.p>
        </div>

        <motion.div 
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {serviceItems.map((service, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="card p-6 hover:-translate-y-2 relative overflow-hidden glow"
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative z-10">
                  <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{service.title}</h3>
                  <p className="text-gray-300">{service.description}</p>
                  {service.badge && (
                    <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-blue-900/20 border border-blue-500/20">
                      {service.badge.icon}
                      <span className="ml-2 text-sm text-blue-400">{service.badge.text}</span>
                    </div>
                  )}
                </div>
                <div className="relative z-10">
                  <CodeSnippet code={service.code} language={service.language} />
                </div>
              </div>
              {service.bgIcon}
              
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;