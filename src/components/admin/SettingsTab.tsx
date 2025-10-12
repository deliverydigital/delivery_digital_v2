import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, Save, RefreshCw, Shield, Bell, Mail, 
  Database, Cloud, Key, Lock, Globe, Monitor,
  CheckCircle, AlertTriangle, Info, User, Building2,
  Phone, MapPin, Clock, Euro, FileText, Award
} from 'lucide-react';

const SettingsTab = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      companyName: 'DELIVERY Digital Technology',
      companyEmail: 'contact@deliverydigital.fr',
      companyPhone: '07 49 70 77 73',
      companyAddress: '470 promenade des anglais, 06200 Nice',
      timezone: 'Europe/Paris',
      language: 'fr',
      currency: 'EUR'
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      projectUpdates: true,
      newClients: true,
      systemAlerts: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordPolicy: 'strong',
      ipWhitelist: '',
      auditLog: true
    },
    integrations: {
      emailProvider: 'smtp',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      backupEnabled: true,
      backupFrequency: 'daily'
    }
  });

  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    // TODO: Implement API call to save settings
    console.log('Saving settings:', settings);
    setHasChanges(false);
    // Show success message
  };

  const sections = [
    { id: 'general', label: 'Général', icon: <Settings className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'security', label: 'Sécurité', icon: <Shield className="h-4 w-4" /> },
    { id: 'integrations', label: 'Intégrations', icon: <Cloud className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Paramètres Système</h2>
          <p className="text-gray-400">Configuration de l'application</p>
        </div>
        <div className="flex items-center space-x-4">
          {hasChanges && (
            <span className="text-yellow-400 text-sm">Modifications non sauvegardées</span>
          )}
          <button
            onClick={saveSettings}
            disabled={!hasChanges}
            className={`btn ${hasChanges ? 'btn-primary' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-4">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {section.icon}
                  <span className="ml-2">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-lg p-6">
            {activeSection === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white mb-4">Paramètres Généraux</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nom de l'entreprise
                    </label>
                    <input
                      type="text"
                      value={settings.general.companyName}
                      onChange={(e) => updateSetting('general', 'companyName', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email de contact
                    </label>
                    <input
                      type="email"
                      value={settings.general.companyEmail}
                      onChange={(e) => updateSetting('general', 'companyEmail', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={settings.general.companyPhone}
                      onChange={(e) => updateSetting('general', 'companyPhone', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Fuseau horaire
                    </label>
                    <select
                      value={settings.general.timezone}
                      onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="America/New_York">America/New_York</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Adresse
                  </label>
                  <textarea
                    value={settings.general.companyAddress}
                    onChange={(e) => updateSetting('general', 'companyAddress', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white mb-4">Paramètres de Notifications</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Notifications par email</h4>
                      <p className="text-gray-400 text-sm">Recevoir les notifications par email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailNotifications}
                        onChange={(e) => updateSetting('notifications', 'emailNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Notifications SMS</h4>
                      <p className="text-gray-400 text-sm">Recevoir les notifications par SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.smsNotifications}
                        onChange={(e) => updateSetting('notifications', 'smsNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Nouveaux clients</h4>
                      <p className="text-gray-400 text-sm">Notification lors de l'inscription d'un nouveau client</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.newClients}
                        onChange={(e) => updateSetting('notifications', 'newClients', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Mises à jour de projets</h4>
                      <p className="text-gray-400 text-sm">Notification lors des changements de statut</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.projectUpdates}
                        onChange={(e) => updateSetting('notifications', 'projectUpdates', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white mb-4">Paramètres de Sécurité</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Authentification à deux facteurs</h4>
                      <p className="text-gray-400 text-sm">Sécurité renforcée pour les comptes admin</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.security.twoFactorAuth}
                        onChange={(e) => updateSetting('security', 'twoFactorAuth', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Timeout de session</h4>
                      <span className="text-gray-400 text-sm">{settings.security.sessionTimeout} minutes</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="120"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-white font-medium mb-3">Politique de mot de passe</h4>
                    <select
                      value={settings.security.passwordPolicy}
                      onChange={(e) => updateSetting('security', 'passwordPolicy', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                    >
                      <option value="basic">Basique (8 caractères minimum)</option>
                      <option value="strong">Fort (8 caractères, majuscules, chiffres)</option>
                      <option value="very_strong">Très fort (12 caractères, caractères spéciaux)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Journal d'audit</h4>
                      <p className="text-gray-400 text-sm">Enregistrer toutes les actions administratives</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.security.auditLog}
                        onChange={(e) => updateSetting('security', 'auditLog', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'integrations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white mb-4">Intégrations</h3>
                
                <div className="space-y-6">
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-white font-medium mb-4">Configuration Email (SMTP)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Serveur SMTP</label>
                        <input
                          type="text"
                          value={settings.integrations.smtpHost}
                          onChange={(e) => updateSetting('integrations', 'smtpHost', e.target.value)}
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Port</label>
                        <input
                          type="number"
                          value={settings.integrations.smtpPort}
                          onChange={(e) => updateSetting('integrations', 'smtpPort', parseInt(e.target.value))}
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Utilisateur</label>
                        <input
                          type="text"
                          value={settings.integrations.smtpUser}
                          onChange={(e) => updateSetting('integrations', 'smtpUser', e.target.value)}
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Mot de passe</label>
                        <input
                          type="password"
                          value={settings.integrations.smtpPassword}
                          onChange={(e) => updateSetting('integrations', 'smtpPassword', e.target.value)}
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-white font-medium mb-4">Sauvegarde</h4>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="text-white">Sauvegarde automatique</h5>
                        <p className="text-gray-400 text-sm">Sauvegarde automatique de la base de données</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.integrations.backupEnabled}
                          onChange={(e) => updateSetting('integrations', 'backupEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Fréquence</label>
                      <select
                        value={settings.integrations.backupFrequency}
                        onChange={(e) => updateSetting('integrations', 'backupFrequency', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                        disabled={!settings.integrations.backupEnabled}
                      >
                        <option value="hourly">Toutes les heures</option>
                        <option value="daily">Quotidienne</option>
                        <option value="weekly">Hebdomadaire</option>
                        <option value="monthly">Mensuelle</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Company Information Card */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Informations Légales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center text-gray-300">
              <Building2 className="h-4 w-4 mr-2 text-blue-400" />
              <span className="text-sm">DELIVERY Digital Nice</span>
            </div>
            <div className="flex items-center text-gray-300">
              <FileText className="h-4 w-4 mr-2 text-green-400" />
              <span className="text-sm">SIRET: 90294519500029</span>
            </div>
            <div className="flex items-center text-gray-300">
              <Award className="h-4 w-4 mr-2 text-yellow-400" />
              <span className="text-sm">Certifié Qualiopi: 902945195</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center text-gray-300">
              <MapPin className="h-4 w-4 mr-2 text-purple-400" />
              <span className="text-sm">470 promenade des anglais, 06200 Nice</span>
            </div>
            <div className="flex items-center text-gray-300">
              <Phone className="h-4 w-4 mr-2 text-orange-400" />
              <span className="text-sm">07 49 70 77 73</span>
            </div>
            <div className="flex items-center text-gray-300">
              <Mail className="h-4 w-4 mr-2 text-cyan-400" />
              <span className="text-sm">contact@deliverydigital.fr</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center text-gray-300">
              <Clock className="h-4 w-4 mr-2 text-pink-400" />
              <span className="text-sm">Lun - Ven: 9h00 - 18h00</span>
            </div>
            <div className="flex items-center text-gray-300">
              <Globe className="h-4 w-4 mr-2 text-indigo-400" />
              <span className="text-sm">deliverydigital.fr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;