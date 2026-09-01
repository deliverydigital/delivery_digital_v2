import { useId, useState } from 'react';

/**
 * Tâches collaboratives sur le suivi d'un dossier OPCO. Composant partagé entre l'espace
 * agence (thème sombre) et l'admin DDN (thème clair). Chaque tâche est attribuée à l'agence
 * ou à DDN, à une étape, peut être commentée et cochée "fait" par n'importe quel côté.
 * @author Rabah Ziane - 2026-07-02
 * MAJ 2026-07-10 : possibilité de taguer un INTERVENANT (email + nom) sur la tâche et de le
 * notifier automatiquement par email à l'enregistrement. @author Rabah Ziane
 */
export type DossierTask = {
  _id: string;
  step?: string;
  label?: string;
  assignedTo?: 'agence' | 'ddn';
  comment?: string;
  done?: boolean;
  doneBy?: string;
  doneAt?: string;
  createdBy?: string;
  intervenantName?: string;   // intervenant tagué sur la tâche
  intervenantEmail?: string;  // email de l'intervenant (notifié si demandé)
};

export const DOSSIER_STEPS: { key: string; label: string }[] = [
  { key: 'transmis', label: 'Transmis' },
  { key: 'acces', label: 'Accès OPCO' },
  { key: 'montage', label: 'Montage OPCO' },
  { key: 'instruction', label: 'En instruction' },
  { key: 'accepted', label: 'Financement accepté' },
  { key: 'scheduled', label: 'Programmé' },
  { key: 'completed', label: 'Terminé' },
  { key: 'invoiced', label: 'Facturé' },
  { key: 'paid', label: 'Payé' },
];

export default function DossierTasks({
  tasks, dark, onAdd, onToggle, onEditComment, onDelete, emailSuggestions,
}: {
  tasks: DossierTask[];
  dark?: boolean;
  onAdd: (t: { step: string; assignedTo: 'agence' | 'ddn'; label: string; intervenantName?: string; intervenantEmail?: string; notify?: boolean }) => Promise<void> | void;
  onToggle: (taskId: string, done: boolean) => Promise<void> | void;
  onEditComment: (taskId: string, comment: string) => Promise<void> | void;
  onDelete: (taskId: string) => Promise<void> | void;
  emailSuggestions?: string[];  // emails proposés en autocomplétion (agence + Delivery Digital)
}) {
  const listId = useId();
  const suggestions = [...new Set((emailSuggestions || []).map((e) => (e || '').trim()).filter(Boolean))];
  const [step, setStep] = useState('transmis');
  const [assignedTo, setAssignedTo] = useState<'agence' | 'ddn'>('agence');
  const [label, setLabel] = useState('');
  const [intEmail, setIntEmail] = useState('');
  const [intName, setIntName] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const stepLabel = (k?: string) => DOSSIER_STEPS.find((s) => s.key === k)?.label || k || '—';
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intEmail.trim());
  const t = dark
    ? { card: 'bg-white/5 border-white/10', sub: 'text-white/50', input: 'bg-white/5 border-white/10 text-white placeholder-white/30', chipA: 'bg-[#0066CC]/15 text-[#4da3ff] border-[#0066CC]/30', chipD: 'bg-white/10 text-white/70 border-white/15', chipI: 'bg-[#3DD68C]/15 text-[#3DD68C] border-[#3DD68C]/30', doneTxt: 'text-white/40 line-through', txt: 'text-white/85', stepChip: 'border-white/15 text-white/55', box: 'border-white/25', del: 'text-white/40 hover:text-[#FF6B6B]', btn: 'bg-[#0066CC] hover:bg-[#0077ED] text-white' }
    : { card: 'bg-black/[0.02] border-black/10', sub: 'text-[#86868B]', input: 'bg-white border-black/15 text-[#1D1D1F] placeholder-[#86868B]', chipA: 'bg-[#0066CC]/10 text-[#0066CC] border-[#0066CC]/25', chipD: 'bg-black/[0.06] text-[#6b6b70] border-black/10', chipI: 'bg-[#3DD68C]/12 text-[#1a9d63] border-[#3DD68C]/30', doneTxt: 'text-[#86868B] line-through', txt: 'text-[#1D1D1F]', stepChip: 'border-black/10 text-[#86868B]', box: 'border-black/25', del: 'text-[#86868B] hover:text-[#FF3B30]', btn: 'bg-[#0066CC] hover:bg-[#0052a3] text-white' };

  const add = async () => {
    if (!label.trim() || busy) return;
    setBusy(true);
    const iEmail = intEmail.trim().toLowerCase();
    try {
      await onAdd({
        step, assignedTo, label: label.trim(),
        intervenantName: intName.trim() || undefined,
        intervenantEmail: iEmail || undefined,
        notify: notify && !!iEmail,
      });
      setLabel(''); setIntEmail(''); setIntName('');
    } finally { setBusy(false); }
  };
  const saveComment = async (id: string) => { await onEditComment(id, commentDraft.trim()); setEditingComment(null); setCommentDraft(''); };

  return (
    <div className="mt-3">
      <p className={`text-[10px] uppercase tracking-wider font-bold ${t.sub} mb-1.5`}>Tâches ({tasks.length})</p>
      <div className="space-y-1.5">
        {tasks.length === 0 && <p className={`text-[11.5px] ${t.sub}`}>Aucune tâche. Ajoutez-en une ci-dessous et attribuez-la à l'agence ou à DDN.</p>}
        {tasks.map((task) => (
          <div key={task._id} className={`flex items-start gap-2 rounded-lg border p-2 ${t.card}`}>
            <button onClick={() => onToggle(task._id, !task.done)} title={task.done ? 'Marquer non fait' : 'Marquer fait'} className={`mt-0.5 h-4 w-4 rounded-[5px] border-2 grid place-items-center flex-shrink-0 ${task.done ? 'bg-[#3DD68C] border-[#3DD68C] text-black' : t.box}`}>{task.done && <span className="text-[9px] leading-none">✓</span>}</button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] border ${t.stepChip}`}>{stepLabel(task.step)}</span>
                <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] border font-semibold ${task.assignedTo === 'ddn' ? t.chipD : t.chipA}`}>{task.assignedTo === 'ddn' ? 'DDN' : 'Agence'}</span>
                {(task.intervenantName || task.intervenantEmail) && <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] border font-semibold ${t.chipI}`} title={task.intervenantEmail || ''}>👤 {task.intervenantName || task.intervenantEmail}</span>}
                <span className={`text-[12px] ${task.done ? t.doneTxt : t.txt}`}>{task.label}</span>
              </div>
              {editingComment === task._id ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <input value={commentDraft} autoFocus onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveComment(task._id); if (e.key === 'Escape') { setEditingComment(null); setCommentDraft(''); } }} placeholder="Commentaire…" className={`flex-1 px-2 py-1 rounded border text-[11px] focus:outline-none ${t.input}`} />
                  <button onClick={() => saveComment(task._id)} className={`px-2 py-1 rounded text-[10px] font-semibold ${t.btn}`}>OK</button>
                </div>
              ) : (
                <>
                  {task.comment && <p className={`text-[11px] ${t.sub} mt-0.5`}>💬 {task.comment}</p>}
                  <button onClick={() => { setEditingComment(task._id); setCommentDraft(task.comment || ''); }} className={`text-[10px] ${t.sub} hover:underline mt-0.5`}>{task.comment ? 'Modifier le commentaire' : '+ Commenter'}</button>
                </>
              )}
              {task.done && <p className="text-[10px] text-[#3DD68C] mt-0.5">✓ Fait{task.doneBy ? ' par ' + (task.doneBy === 'ddn' ? 'DDN' : 'Agence') : ''}{task.doneAt ? ' · ' + new Date(task.doneAt).toLocaleDateString('fr-FR') : ''}</p>}
            </div>
            <button onClick={() => onDelete(task._id)} title="Supprimer la tâche" className={`flex-shrink-0 text-[13px] leading-none ${t.del}`}>✕</button>
          </div>
        ))}
      </div>
      {/* Ajout d'une tâche : étape + responsable (Agence/DDN) + intitulé */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <select value={step} onChange={(e) => setStep(e.target.value)} className={`px-2 py-1.5 rounded-lg border text-[11.5px] focus:outline-none ${t.input}`}>
          {DOSSIER_STEPS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value as 'agence' | 'ddn')} className={`px-2 py-1.5 rounded-lg border text-[11.5px] focus:outline-none ${t.input}`}>
          <option value="agence">Agence</option>
          <option value="ddn">DDN</option>
        </select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="Décrire la tâche…" className={`flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg border text-[12px] focus:outline-none ${t.input}`} />
        <button onClick={add} disabled={busy || !label.trim()} className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold disabled:opacity-40 ${t.btn}`}>+ Ajouter</button>
      </div>
      {/* Taguer un intervenant à notifier par email (formateur, prestataire…). @Rabah 2026-07-10 */}
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className={`text-[11px] ${t.sub}`}>👤 Intervenant :</span>
        <input value={intEmail} list={suggestions.length ? listId : undefined} onChange={(e) => setIntEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="email de l'intervenant" className={`min-w-[170px] px-2.5 py-1.5 rounded-lg border text-[11.5px] focus:outline-none ${t.input}`} />
        {suggestions.length > 0 && <datalist id={listId}>{suggestions.map((e) => <option key={e} value={e} />)}</datalist>}
        <input value={intName} onChange={(e) => setIntName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="nom (optionnel)" className={`min-w-[110px] px-2.5 py-1.5 rounded-lg border text-[11.5px] focus:outline-none ${t.input}`} />
        <label className={`inline-flex items-center gap-1.5 text-[11px] ${emailOk ? t.txt : t.sub} cursor-pointer select-none`}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[#0066CC]" /> Notifier par email
        </label>
      </div>
    </div>
  );
}
