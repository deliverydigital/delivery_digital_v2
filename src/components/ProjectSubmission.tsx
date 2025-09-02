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
          <button
            onClick={() => setIsDigitalSpaceOpen(true)}
            className="btn btn-primary shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Solutions Digitales
          </button>
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