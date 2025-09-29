// Central export file for all MongoDB models
import User from './User.js';
import Project from './Project.js';
import Message from './Message.js';
import Task from './Task.js';
import Quote from './Quote.js';
import Invoice from './Invoice.js';
import TrainingDocument from './TrainingDocument.js';
import TrainingProgram from './TrainingProgram.js';
import Category from './Category.js';

export {
  User,
  Project,
  Message,
  Task,
  Quote,
  Invoice,
  TrainingDocument,
  TrainingProgram,
  Category
};

// Export default object with all models
export default {
  User,
  Project,
  Message,
  Task,
  Quote,
  Invoice,
  TrainingDocument,
  TrainingProgram,
  Category
};