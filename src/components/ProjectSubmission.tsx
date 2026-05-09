import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageCircle } from 'lucide-react';
import DigitalClientSpace from './DigitalClientSpace';

const ProjectSubmission = () => {
  const [isDigitalSpaceOpen, setIsDigitalSpaceOpen] = useState(false);

  useEffect(() => {
    const handleOpenDigitalClientSpace = () => {
      setIsDigitalSpaceOpen(true);
    };

    window.addEventListener('openDigitalClientSpace', handleOpenDigitalClientSpace);
    
    return () => {
      window.removeEventListener('openDigitalClientSpace', handleOpenDigitalClientSpace);
    };
  }, []);

  return (
    <>
      <section className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <a
            href="/discutons"
            className="btn btn-primary shadow-lg inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Démarrer un projet
          </a>
        </motion.div>
      </section>

      <DigitalClientSpace
        isOpen={isDigitalSpaceOpen}
        onClose={() => setIsDigitalSpaceOpen(false)}
      />
    </>
  );
};

export default ProjectSubmission;