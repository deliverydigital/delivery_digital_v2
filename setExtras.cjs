/**
 * Liste "Traçabilité autres tâches" HipeKids (remplace la precedente).
 * Texte ecrit comme on parle : phrases courtes, pas de tournures de rapport automatique.
 * @author Rabah Ziane - 2026-08-31
 */
const mongoose = require('mongoose');
require('dotenv').config();

const EXTRAS = [
  {
    kind: 'extra',
    date: new Date('2026-08-04'),
    title: 'Remise en service de la plateforme',
    area: 'Production',
    detail: "Le 4 août, plus personne n'arrivait à se connecter. Un fichier de logs de 49 Go avait rempli le disque du serveur et fait tomber la base. On a nettoyé, remis la base en route, et mis en place une rotation des logs pour que ça ne recommence pas.",
  },
  {
    kind: 'extra',
    date: new Date('2026-08-26'),
    title: "Créneaux vides à l'inscription",
    area: 'Inscription',
    detail: "Le calendrier proposait des journées déjà pleines : on cliquait dessus, et il n'y avait aucun créneau. On a trouvé pourquoi, les créneaux déjà réservés n'étaient pas retirés des dates proposées.",
  },
  {
    kind: 'extra',
    date: new Date('2026-08-31'),
    title: 'Annulations qui laissaient passer des prélèvements',
    area: 'Abonnements',
    detail: "Quand un parent annulait, une partie de son abonnement restait active et il pouvait être re-prélevé. On a corrigé toute la chaîne.",
  },
  {
    kind: 'extra',
    date: new Date('2026-08-31'),
    title: 'Fenêtres du profil parent',
    area: 'Espace parent',
    detail: "Les fenêtres Contact, Adresse, Carte et Mot de passe n'avaient pas le même look. On les a reprises sur le même modèle, avec des champs plus doux et une croix pour fermer.",
  },
  {
    kind: 'extra',
    date: new Date('2026-08-31'),
    title: 'Écrans de chargement',
    area: 'Espace parent',
    detail: "Pendant le chargement, l'espace parent affichait des cadres vides : ça donnait l'impression d'un écran cassé. On a mis à la place des squelettes qui reprennent la forme de la page.",
  },
  {
    kind: 'extra',
    date: new Date('2026-08-31'),
    title: 'Aide « Comment ça marche » sur la page parcours',
    area: 'Suivi des progrès',
    detail: "Les parents ne savaient pas comment lire la page de progression. On a ajouté une bulle à côté du titre : à quoi correspondent les niveaux, le rythme, et comment le niveau monte au fil des cours.",
  },
  {
    kind: 'extra',
    date: new Date('2026-08-31'),
    title: "Traduction des écrans parents",
    area: 'Espace parent',
    detail: "On a continué la traduction : il restait des textes écrits en dur sur les fiches enfants, l'ajout d'un enfant et les fenêtres du profil.",
  },
  {
    kind: 'maintenance',
    date: new Date('2026-08-31'),
    title: 'Environnement de test',
    area: 'Exploitation',
    detail: "On a monté un environnement de test à part, avec son site, son serveur et sa base. Tout y passe avant d'arriver chez vos clients.",
  },
  {
    kind: 'maintenance',
    date: new Date('2026-08-31'),
    title: 'Mises en ligne',
    area: 'Exploitation',
    detail: "À chaque livraison : mise en ligne, redémarrage des services, et vérification que le site, l'API et la base répondent. Ça couvre aussi les redémarrages après un incident.",
  },
  {
    kind: 'maintenance',
    date: new Date('2026-08-31'),
    title: 'Surveillance du serveur',
    area: 'Exploitation',
    detail: "Depuis la panne du 4 août, on garde un œil sur l'espace disque, les logs et la base, pour voir venir le problème avant qu'il ne coupe le service.",
  },
];

(async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deliverydigital';
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('clientprojects');
  const r = await col.updateOne({ slug: 'hipekids' }, { $set: { extras: EXTRAS } });
  console.log('maj extras:', r.modifiedCount, '->', EXTRAS.length, 'entrees');
  process.exit(0);
})();
