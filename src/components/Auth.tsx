import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Building2, Eye, EyeOff, X, CheckCircle2, User } from 'lucide-react';
import { useAuth } from '../hooks/useApi';

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const Auth = ({ isOpen, onClose, onSuccess }: AuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, register, forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        console.log('🔄 Requesting password reset for:', formData.email);
        const result = await forgotPassword(formData.email);

        if (!result.success) {
          console.error('❌ Password reset request failed:', result.error);
          throw new Error(result.error || 'Password reset request failed');
        }

        console.log('✅ Password reset email sent');
        setSuccess(true);
        setError('');
        setTimeout(() => {
          setSuccess(false);
          setIsForgotPassword(false);
          setFormData({ name: '', company: '', email: '', password: '' });
        }, 3000);
      } else if (isLogin) {
        console.log('🔄 Attempting login with:', formData.email);
        const result = await login(formData.email, formData.password);
        
        if (!result.success) {
          console.error('❌ Login failed:', result.error);
          throw new Error(result.error || 'Login failed');
        }
        
        console.log('✅ Login successful');
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          setSuccess(false);
          setFormData({ name: '', company: '', email: '', password: '' });
          // Dispatch custom event to notify components of login
          window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: result.user }));
          onClose();
        }, 1500);
      } else {
        console.log('🔄 Attempting registration with:', formData.email);
        
        // Validate form data before sending
        if (!formData.name.trim()) {
          throw new Error('Le nom est requis');
        }
        if (!formData.email.trim()) {
          throw new Error('L\'email est requis');
        }
        if (!formData.company.trim()) {
          throw new Error('Le nom de l\'entreprise est requis');
        }
        if (formData.password.length < 8) {
          throw new Error('Le mot de passe doit contenir au moins 8 caractères');
        }
        
        const result = await register({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          company: formData.company.trim(),
          password: formData.password
        });
        
        if (!result.success) {
          console.error('❌ Registration failed:', result.error);
          throw new Error(result.error || 'Registration failed');
        }
        
        console.log('✅ Registration successful');
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          setSuccess(false);
          setFormData({ name: '', company: '', email: '', password: '' });
          // Dispatch custom event to notify components of login
          window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: result.user }));
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Auth error:', err);
      let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
      
      if (err.message) {
        if (err.message.includes('User with this email already exists')) {
          errorMessage = 'Un compte avec cet email existe déjà. Essayez de vous connecter.';
        } else if (err.message.includes('Invalid email or password')) {
          errorMessage = 'Email ou mot de passe incorrect.';
        } else if (err.message.includes('Database service unavailable')) {
          errorMessage = 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.';
        } else if (err.message.includes('Validation failed')) {
          errorMessage = 'Données invalides. Vérifiez vos informations.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"></div>
        
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">
            {isForgotPassword ? 'Réinitialiser le mot de passe' : isLogin ? 'Connexion' : 'Créer un compte'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isForgotPassword ? (
            <>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="votre@email.com"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </>
          ) : (
            <>
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Votre nom"
                        required
                      />
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'entreprise
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Votre entreprise"
                        required
                      />
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="votre@email.com"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {!isLogin && (
                  <p className="mt-1 text-sm text-gray-500">
                    Minimum 8 caractères
                  </p>
                )}
              </div>

              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}
            </>
          )}


          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && isForgotPassword && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Un email de réinitialisation a été envoyé à votre adresse.
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            disabled={success || loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : success ? (
              <span className="flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {isForgotPassword ? 'Email envoyé !' : isLogin ? 'Connecté !' : 'Compte créé !'}
              </span>
            ) : (
              isForgotPassword ? 'Envoyer le lien' : isLogin ? 'Se connecter' : 'Créer le compte'
            )}
          </button>

          <div className="text-center">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Retour à la connexion
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Auth;