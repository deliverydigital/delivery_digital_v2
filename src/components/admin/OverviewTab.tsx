import {motion} from 'framer-motion';
import { useState } from 'react';
import {
    Users, FolderOpen, MessageCircle, ClipboardList, TrendingUp,
    Calendar, CheckCircle, AlertTriangle, Clock, Star, Euro,
    BarChart3, PieChart, Activity, Zap, Target, Award, FileText, Building,
    ChevronDown, ChevronUp
} from 'lucide-react';
import {useStatistics, useProjects, useClients, useLegalTasks, useFinancialSummary} from '../../hooks/useApi';

const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'N/A';
  return dateObj.toLocaleDateString('fr-FR');
};

const OverviewTab = () => {
    const {stats, loading: statsLoading} = useStatistics();
    const {projects} = useProjects();
    const {clients} = useClients();
    const {legalTasks, loading: loadingLegal} = useLegalTasks();
    const {financialSummary, loading: loadingFinancial} = useFinancialSummary();
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
            } else {
                newSet.add(projectId);
            }
            return newSet;
        });
    };

    const quickStats = [
        {
            title: 'Clients Totaux',
            value: stats.totalClients,
            icon: <Users className="h-8 w-8 text-blue-400"/>,
            color: 'blue',
            change: '+12%'
        },
        {
            title: 'Projets Actifs',
            value: stats.activeProjects,
            icon: <FolderOpen className="h-8 w-8 text-green-400"/>,
            color: 'green',
            change: '+8%'
        },
        {
            title: 'Messages Non Lus',
            value: stats.unreadMessages,
            icon: <MessageCircle className="h-8 w-8 text-yellow-400"/>,
            color: 'yellow',
            change: '-5%'
        },
        {
            title: 'Tâches En Cours',
            value: stats.pendingReviews,
            icon: <ClipboardList className="h-8 w-8 text-purple-400"/>,
            color: 'purple',
            change: '+15%'
        }
    ];

    const recentProjects = projects.slice(0, 5);
    const recentClients = clients.slice(0, 5);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
                    <p className="text-gray-400">Tableau de bord administrateur DELIVERY Digital</p>
                </div>
                <div className="text-sm text-gray-400">
                    Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
                </div>
            </div>

            {/* Legal Tasks Priority Section */}
            {!loadingLegal && legalTasks.length > 0 && (
                <motion.div
                    initial={{opacity: 0, y: -20}}
                    animate={{opacity: 1, y: 0}}
                    className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-lg p-6"
                >
                    <div className="flex items-center mb-4">
                        <FileText className="h-6 w-6 text-yellow-400 mr-3"/>
                        <h3 className="text-xl font-bold text-white">Tâches Légales Prioritaires</h3>
                        <span className="ml-auto bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold">
              {legalTasks.length}
            </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {legalTasks.map((task: any) => (
                            <motion.div
                                key={task.id}
                                whileHover={{scale: 1.02}}
                                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-yellow-500/50 transition-all"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center">
                                        <Building className="h-4 w-4 text-yellow-400 mr-2"/>
                                        <h4 className="font-semibold text-white text-sm">{task.projectTitle}</h4>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                            task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                    }`}>
                    {task.priority}
                  </span>
                                </div>
                                <p className="text-gray-400 text-xs mb-2">{task.clientName}</p>
                                <div className="space-y-1 text-xs">
                                    {task.legalInfo?.company_name && (
                                        <p className="text-gray-300">
                                            <span
                                                className="text-gray-500">Entreprise:</span> {task.legalInfo.company_name}
                                        </p>
                                    )}
                                    {task.legalInfo?.contract_number && (
                                        <p className="text-gray-300">
                                            <span
                                                className="text-gray-500">Contrat:</span> {task.legalInfo.contract_number}
                                        </p>
                                    )}
                                    {task.legalInfo?.contract_date && (
                                        <p className="text-gray-300">
                                            <span className="text-gray-500">Date:</span>{' '}
                                            {new Date(task.legalInfo.contract_date).toLocaleDateString('fr-FR')}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Financial Summary Section */}
            {!loadingFinancial && financialSummary && (
                <motion.div
                    initial={{opacity: 0, y: -20}}
                    animate={{opacity: 1, y: 0}}
                    className="bg-gradient-to-r from-blue-900/20 to-green-900/20 border border-blue-700/50 rounded-lg p-6"
                >
                    <div className="flex items-center mb-4">
                        <Euro className="h-6 w-6 text-blue-400 mr-3"/>
                        <h3 className="text-xl font-bold text-white">Résumé Financier</h3>
                    </div>

                    {/* Financial Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-1">Revenus Totaux</p>
                            <p className="text-2xl font-bold text-green-400">
                                {financialSummary.summary.totalRevenue.toLocaleString('fr-FR')} €
                            </p>
                        </div>

                        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-1">Dépenses Totales</p>
                            <p className="text-2xl font-bold text-red-400">
                                {financialSummary.summary.totalExpenses.toLocaleString('fr-FR')} €
                            </p>
                        </div>

                        <div className={`${
                            financialSummary.summary.totalProfit >= 0
                                ? 'bg-blue-900/30 border-blue-700'
                                : 'bg-orange-900/30 border-orange-700'
                        } border rounded-lg p-4`}>
                            <p className="text-sm text-gray-400 mb-1">Balance Totale</p>
                            <p className={`text-2xl font-bold ${
                                financialSummary.summary.totalProfit >= 0 ? 'text-blue-400' : 'text-orange-400'
                            }`}>
                                {financialSummary.summary.totalProfit.toLocaleString('fr-FR')} €
                            </p>
                        </div>

                        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-1">Projets Rentables</p>
                            <p className="text-2xl font-bold text-purple-400">
                                {financialSummary.summary.profitableProjects} / {financialSummary.summary.projectCount}
                            </p>
                        </div>
                    </div>

                    {/* Projects Financial Details with Expenses & Payments */}
                    {financialSummary.projects && financialSummary.projects.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-lg font-semibold text-white mb-3 flex items-center justify-between">
                                <span>Détails Financiers par Projet</span>
                                <span className="text-sm text-gray-400 font-normal">
                                    {financialSummary.projects.length} projet{financialSummary.projects.length > 1 ? 's' : ''}
                                </span>
                            </h4>
                            <div className="space-y-3">
                                {financialSummary.projects.map((project: any) => {
                                    const profitMargin = project.revenue > 0
                                        ? ((project.profit / project.revenue) * 100).toFixed(1)
                                        : 0;
                                    const isExpanded = expandedProjects.has(project.id);

                                    const projectExpenses = financialSummary.recentExpenses?.filter((e: any) => e.projectId === project.id) || [];
                                    const projectPayments = financialSummary.recentPayments?.filter((p: any) => p.projectId === project.id) || [];

                                    return (
                                        <div
                                            key={project.id}
                                            className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all"
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h5 className="font-semibold text-white text-base mb-1">{project.title}</h5>
                                                        <p className="text-xs text-gray-400">{project.clientName}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            project.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                                                            project.status === 'in_progress' ? 'bg-blue-900/50 text-blue-400' :
                                                            project.status === 'reviewing' ? 'bg-yellow-900/50 text-yellow-400' :
                                                            'bg-gray-900/50 text-gray-400'
                                                        }`}>
                                                            {project.status === 'completed' ? 'Terminé' :
                                                             project.status === 'in_progress' ? 'En cours' :
                                                             project.status === 'reviewing' ? 'Révision' :
                                                             project.status === 'submitted' ? 'Soumis' :
                                                             project.status}
                                                        </span>
                                                        <button
                                                            onClick={() => toggleProject(project.id)}
                                                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-5 w-5 text-gray-400" />
                                                            ) : (
                                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4 mb-3">
                                                    <div className="bg-green-900/20 border border-green-700/50 rounded p-2">
                                                        <p className="text-xs text-gray-400 mb-1">Revenus</p>
                                                        <p className="text-sm font-bold text-green-400">
                                                            {project.revenue.toLocaleString('fr-FR')} €
                                                        </p>
                                                    </div>
                                                    <div className="bg-red-900/20 border border-red-700/50 rounded p-2">
                                                        <p className="text-xs text-gray-400 mb-1">Dépenses</p>
                                                        <p className="text-sm font-bold text-red-400">
                                                            {project.expenses.toLocaleString('fr-FR')} €
                                                        </p>
                                                    </div>
                                                    <div className={`${
                                                        project.profit >= 0 ? 'bg-blue-900/20 border-blue-700/50' : 'bg-orange-900/20 border-orange-700/50'
                                                    } border rounded p-2`}>
                                                        <p className="text-xs text-gray-400 mb-1">Bénéfice</p>
                                                        <p className={`text-sm font-bold ${
                                                            project.profit >= 0 ? 'text-blue-400' : 'text-orange-400'
                                                        }`}>
                                                            {project.profit >= 0 ? '+' : ''}{project.profit.toLocaleString('fr-FR')} €
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                                                    <span className="text-xs text-gray-400">Marge Bénéficiaire</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-32 bg-gray-700 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-full ${
                                                                    Number(profitMargin) >= 0 ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${Math.min(Math.abs(Number(profitMargin)), 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-sm font-semibold ${
                                                            Number(profitMargin) >= 0 ? 'text-blue-400' : 'text-orange-400'
                                                        }`}>
                                                            {profitMargin}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expandable section with transactions */}
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-gray-700 bg-gray-900/50"
                                                >
                                                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                        {/* Project Expenses */}
                                                        <div>
                                                            <h5 className="text-sm font-semibold text-white mb-2 flex items-center justify-between">
                                                                <span>Dépenses ({projectExpenses.length})</span>
                                                            </h5>
                                                            {projectExpenses.length > 0 ? (
                                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                                    {projectExpenses.map((expense: any, idx: number) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="bg-red-900/10 border border-red-700/30 rounded p-2"
                                                                        >
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <p className="text-xs font-medium text-white">{expense.description}</p>
                                                                                <span className="text-xs font-bold text-red-400">
                                                                                    -{expense.amount?.toLocaleString('fr-FR')} €
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-xs text-gray-500">
                                                                                <span>{formatDate(expense.date)}</span>
                                                                                <span>{expense.category}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-500 italic">Aucune dépense enregistrée</p>
                                                            )}
                                                        </div>

                                                        {/* Project Payments */}
                                                        <div>
                                                            <h5 className="text-sm font-semibold text-white mb-2 flex items-center justify-between">
                                                                <span>Paiements ({projectPayments.length})</span>
                                                            </h5>
                                                            {projectPayments.length > 0 ? (
                                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                                    {projectPayments.map((payment: any, idx: number) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="bg-green-900/10 border border-green-700/30 rounded p-2"
                                                                        >
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <p className="text-xs font-medium text-white">{payment.description}</p>
                                                                                <span className="text-xs font-bold text-green-400">
                                                                                    +{payment.amount?.toLocaleString('fr-FR')} €
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-xs text-gray-500">
                                                                                <span>{formatDate(payment.date)}</span>
                                                                                <span className={`px-1 py-0.5 rounded ${
                                                                                    payment.status === 'paid' ? 'bg-green-900/50 text-green-400' :
                                                                                    payment.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                                                                                    'bg-red-900/50 text-red-400'
                                                                                }`}>
                                                                                    {payment.status === 'paid' ? 'Payé' :
                                                                                     payment.status === 'pending' ? 'En attente' : 'En retard'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-500 italic">Aucun paiement enregistré</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recent Financial Transactions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Expenses */}
                        {financialSummary.recentExpenses && financialSummary.recentExpenses.length > 0 && (
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-3">Dépenses Récentes</h4>
                                <div className="space-y-2">
                                    {financialSummary.recentExpenses.map((expense: any, index: number) => {
                                        const exp = expense.__parentArray[0] || {};
                                        console.log(index, exp);
                                        return (
                                            <div
                                                key={index}
                                                className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 hover:border-red-500/50 transition-all"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-white">{exp.description}</p>
                                                        <p className="text-xs text-gray-400">{expense.projectTitle}</p>
                                                    </div>
                                                    <span className="text-sm font-bold text-red-400">
                          -{exp?.amount?.toLocaleString('fr-FR')} €
                        </span>
                                                </div>
                                                <div
                                                    className="flex justify-between items-center text-xs text-gray-500">
                                                    <span>{new Date(exp.date).toLocaleDateString('fr-FR')}</span>
                                                    <span>{exp.category}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Recent Payments */}
                        {financialSummary.recentPayments && financialSummary.recentPayments.length > 0 && (
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-3">Paiements Récents</h4>
                                <div className="space-y-2">
                                    {financialSummary.recentPayments.map((payment: any, index: number) => {
                                        const exp = payment.__parentArray[0] || {};
                                        console.log(index, payment, exp);

                                        return (
                                            <div
                                                key={index}
                                                className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 hover:border-green-500/50 transition-all"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-white">{exp.description}</p>
                                                        <p className="text-xs text-gray-400">{payment.projectTitle}</p>
                                                    </div>
                                                    <span className="text-sm font-bold text-green-400">
                          +{exp.amount?.toLocaleString('fr-FR')} €
                        </span>
                                                </div>
                                                <div
                                                    className="flex justify-between items-center text-xs text-gray-500">
                                                    <span>{new Date(exp.date).toLocaleDateString('fr-FR')}</span>
                                                    <span className={`px-2 py-0.5 rounded ${
                                                        exp.status === 'paid' ? 'bg-green-900/50 text-green-400' :
                                                            exp.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                                                                'bg-red-900/50 text-red-400'
                                                    }`}>
                          {exp.status === 'paid' ? 'Payé' :
                              exp.status === 'pending' ? 'En attente' : 'En retard'}
                        </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickStats.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.5, delay: index * 0.1}}
                        className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">{stat.title}</p>
                                <p className="text-2xl font-bold text-white">
                                    {statsLoading ? (
                                        <div className="animate-pulse bg-gray-600 h-8 w-16 rounded"></div>
                                    ) : (
                                        stat.value
                                    )}
                                </p>
                                <p className={`text-sm ${
                                    stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                                }`}>
                                    {stat.change} ce mois
                                </p>
                            </div>
                            {stat.icon}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Évolution des Projets</h3>
                    <div className="h-64 flex items-center justify-center">
                        <div className="text-center">
                            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4"/>
                            <p className="text-gray-400">Graphique des projets par mois</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Répartition par Type</h3>
                    <div className="h-64 flex items-center justify-center">
                        <div className="text-center">
                            <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4"/>
                            <p className="text-gray-400">Répartition des projets par type</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Projets Récents</h3>
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                            Voir tout
                        </button>
                    </div>
                    <div className="space-y-4">
                        {recentProjects.map((project) => (
                            <div key={project.id}
                                 className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                                <FolderOpen className="h-5 w-5 text-blue-400 mr-3"/>
                                <div className="flex-1">
                                    <p className="text-white text-sm font-medium">{project.title}</p>
                                    <p className="text-gray-400 text-xs">
                                        {project.clientName} • {new Date(project.lastUpdate).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs ${
                                    project.status === 'in_progress' ? 'bg-green-900/50 text-green-400' :
                                        project.status === 'reviewing' ? 'bg-yellow-900/50 text-yellow-400' :
                                            'bg-gray-900/50 text-gray-400'
                                }`}>
                  {project.status === 'in_progress' ? 'En cours' :
                      project.status === 'reviewing' ? 'En révision' :
                          project.status === 'completed' ? 'Terminé' : 'En attente'}
                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Nouveaux Clients</h3>
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                            Voir tout
                        </button>
                    </div>
                    <div className="space-y-4">
                        {recentClients.map((client) => (
                            <div key={client.id}
                                 className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                                <div
                                    className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                                    {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white text-sm font-medium">{client.name}</p>
                                    <p className="text-gray-400 text-xs">
                                        {client.company} • {new Date(client.joinDate).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs ${
                                    client.status === 'active' ? 'bg-green-900/50 text-green-400' :
                                        'bg-gray-900/50 text-gray-400'
                                }`}>
                  {client.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-6">Indicateurs de Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">94%</div>
                        <p className="text-gray-400">Satisfaction Client</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400 mb-2">87%</div>
                        <p className="text-gray-400">Projets Livrés à Temps</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-400 mb-2">92%</div>
                        <p className="text-gray-400">Taux de Rétention</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;