import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard as Edit, Trash2, Eye, Save, X, Upload, Download, FileText, Search, Filter, RefreshCw, CheckCircle, AlertTriangle, Star, Award, Clock, Users, Euro, BookOpen, Target, Globe, Code, Palette, Shield, Briefcase, Heart, Folder, GraduationCap, Settings, ExternalLink, Calendar, MapPin, Phone, Mail, Building2, Tag, BarChart3, TrendingUp, Activity, Zap, PieChart } from 'lucide-react';
import { useTrainingPrograms } from '../hooks/useTrainingPrograms';
import { useTrainingDocuments } from '../hooks/useTrainingDocuments';
import { useCategories } from '../hooks/useCategories';
import React from 'react';

const TrainingProgramsManagement = () => {
  const { 
    programs, 
    loading: programsLoading, 
    createProgram, 
    updateProgram, 
    deleteProgram, 
    refetch: refetchPrograms 
  } = useTrainingPrograms();
  
  const { 
    uploadDocument, 
    deleteDocument, 
    downloadDocument 
  } = useTrainingDocuments();
  
  const { categories } = useCategories();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'documents'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'edit' | 'create' | 'upload'>('view');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    program_id: '',
    title: '',
    description: '',
    category: 'web',
    duration_hours: 0,
    price: 0,
    level: 'beginner',
    max_participants: 12,
    prerequisites: '',
    objectives: [''],
    methods: [''],
    evaluation_methods: [''],
    accessibility_info: 'Formation accessible aux personnes en situation de handicap',
    access_delay: '1 semaine',
    is_active: true,
    is_featured: false,
    opco_eligible: true,
    cpf_eligible: false,
    certification_type: '',
    certification_provider: '',
    modules: []
  });

  const [uploadFormData, setUploadFormData] = useState({
    program_id: '',
    program_name: '',
    title: '',
    description: '',
    category: 'program',
    tags: '',
    version: '1.0',
    files: [] as File[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      program_id: '',
      title: '',
      description: '',
      category: 'web',
      duration_hours: 0,
      price: 0,
      level: 'beginner',
      max_participants: 12,
      prerequisites: '',
      objectives: [''],
      methods: [''],
      evaluation_methods: [''],
      accessibility_info: 'Formation accessible aux personnes en situation de handicap',
      access_delay: '1 semaine',
      is_active: true,
      is_featured: false,
      opco_eligible: true,
      cpf_eligible: false,
      certification_type: '',
      certification_provider: '',
      modules: []
    });
  };

  const resetUploadForm = () => {
    setUploadFormData({
      program_id: '',
      program_name: '',
      title: '',
      description: '',
      category: 'program',
      tags: '',
      version: '1.0',
      files: []
    });
  };

  const openCreateModal = () => {
    resetForm();
    setModalType('create');
    setShowModal(true);
  };

  const openEditModal = (program: any) => {
    setFormData({
      program_id: program.program_id || program.id,
      title: program.title || program.name,
      description: program.description || '',
      category: program.category || 'web',
      duration_hours: program.duration_hours || 0,
      price: program.price || 0,
      level: program.level || 'beginner',
      max_participants: program.max_participants || 12,
      prerequisites: program.prerequisites || '',
      objectives: program.objectives && program.objectives.length > 0 ? program.objectives : [''],
      methods: program.methods && program.methods.length > 0 ? program.methods : [''],
      evaluation_methods: program.evaluation_methods && program.evaluation_methods.length > 0 ? program.evaluation_methods : [''],
      accessibility_info: program.accessibility_info || 'Formation accessible aux personnes en situation de handicap',
      access_delay: program.access_delay || '1 semaine',
      is_active: program.is_active !== undefined ? program.is_active : true,
      is_featured: program.is_featured || false,
      opco_eligible: program.opco_eligible !== undefined ? program.opco_eligible : true,
      cpf_eligible: program.cpf_eligible || false,
      certification_type: program.certification_type || '',
      certification_provider: program.certification_provider || '',
      modules: program.modules || []
    });
    setSelectedProgram(program);
    setModalType('edit');
    setShowModal(true);
  };

  const openUploadModal = (program: any) => {
    setUploadFormData({
      program_id: program.program_id || program.id,
      program_name: program.title || program.name,
      title: '',
      description: '',
      category: 'program',
      tags: '',
      version: '1.0',
      files: []
    });
    setSelectedProgram(program);
    setShowUploadModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProgram(null);
    resetForm();
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedProgram(null);
    resetUploadForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result;
      
      if (modalType === 'create') {
        result = await createProgram(formData);
      } else if (modalType === 'edit' && selectedProgram) {
        result = await updateProgram(selectedProgram.program_id || selectedProgram.id, formData);
      }

      if (result?.success) {
        closeModal();
        refetchPrograms();
      } else {
        alert(`