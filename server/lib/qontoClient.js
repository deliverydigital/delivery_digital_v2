/**
 * Client Qonto - API thirdparty v2 (https://api-doc.qonto.com).
 * Récupère les transactions d'un compte pour alimenter la compta.
 *
 * Auth : clé API "login" = header `Authorization: {org_slug}:{secret_key}`.
 * (Qonto propose aussi OAuth ; on démarre avec la clé API, plus simple pour
 *  un usage interne multi-entreprises.)
 *
 * @author Rabah Ziane · 2026-07-07
 */

const QONTO_BASE = process.env.QONTO_BASE || 'https://thirdparty.qonto.com/v2';

function authHeader({ org_slug, secret_key }) {
  if (!org_slug || !secret_key) throw new Error('qonto_credentials_manquantes');
  return `${org_slug}:${secret_key}`;
}

/**
 * Vérifie les identifiants en listant les comptes bancaires de l'organisation.
 * Renvoie { ok, ibans:[...], raw } ou { ok:false, error }.
 */
export async function qontoVerify({ org_slug, secret_key }) {
  try {
    const res = await fetch(`${QONTO_BASE}/organization`, {
      headers: { Authorization: authHeader({ org_slug, secret_key }), 'Content-Type': 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `qonto_http_${res.status}` };
    const data = await res.json();
    const accounts = data?.organization?.bank_accounts || [];
    return { ok: true, ibans: accounts.map(a => ({ iban: a.iban, name: a.name, balance: a.balance })), raw: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Récupère les transactions d'un IBAN entre deux dates (pagination gérée).
 * @returns {Array} transactions Qonto brutes.
 */
export async function qontoFetchTransactions({ org_slug, secret_key, iban, from, to }) {
  const auth = authHeader({ org_slug, secret_key });
  const all = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      iban: iban || '',
      status: 'completed',
      per_page: '100',
      current_page: String(page),
      sort_by: 'settled_at:asc',
    });
    if (from) params.set('settled_at_from', new Date(from).toISOString());
    if (to)   params.set('settled_at_to', new Date(to).toISOString());

    const res = await fetch(`${QONTO_BASE}/transactions?${params.toString()}`, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`qonto_http_${res.status}`);
    const data = await res.json();
    all.push(...(data.transactions || []));
    totalPages = data?.meta?.total_pages || 1;
    page += 1;
  } while (page <= totalPages);

  return all;
}

/**
 * Normalise une transaction Qonto vers le format ComptaEntry (champs bruts,
 * hors catégorisation qui est faite par le moteur/utilisateur).
 */
export function normalizeQontoTx(tx) {
  const cents = typeof tx.amount_cents === 'number' ? tx.amount_cents : Math.round((tx.amount || 0) * 100);
  const signed = (tx.side === 'debit' ? -1 : 1) * (cents / 100);
  return {
    source: 'qonto',
    external_id: tx.transaction_id || tx.id,
    date: tx.settled_at || tx.emitted_at,
    label: tx.label || tx.reference || tx.note || '(sans libellé)',
    counterparty: tx.clean_counterparty_name || tx.counterparty_name || tx.label || '',
    amount: Number(signed.toFixed(2)),
    currency: tx.currency || 'EUR',
    side: tx.side === 'debit' ? 'debit' : 'credit',
    // Données Qonto pour la catégorisation auto (voir categorizeQontoTx).
    qonto_category: tx.category || null,
    operation_type: tx.operation_type || null,
    qonto_vat_amount: (tx.vat_amount != null ? tx.vat_amount : null),
    qonto_vat_rate: (tx.vat_rate != null ? tx.vat_rate : null),
    attachment_ids: Array.isArray(tx.attachment_ids) ? tx.attachment_ids : [],
    // Opération étrangère (hors EU / devise ≠ EUR) : pas de TVA française récupérable.
    local_currency: tx.local_currency || tx.currency || 'EUR',
    is_external: tx.is_external_transaction === true || (tx.local_currency && tx.local_currency !== 'EUR'),
  };
}

/**
 * Trésorerie totale (tous comptes) à une date : somme des soldes (settled_balance)
 * de la dernière transaction de chaque compte avant la date. Sert au bilan (dispo).
 */
export async function qontoTotalBalanceAt({ org_slug, secret_key }, isoDate) {
  const org = await qontoVerify({ org_slug, secret_key });
  if (!org.ok) return 0;
  let total = 0;
  for (const acc of (org.ibans || [])) {
    const params = new URLSearchParams({ iban: acc.iban, status: 'completed', per_page: '1', current_page: '1', sort_by: 'settled_at:desc' });
    if (isoDate) params.set('settled_at_to', isoDate);
    try {
      const res = await fetch(`${QONTO_BASE}/transactions?${params.toString()}`, { headers: { Authorization: authHeader({ org_slug, secret_key }) } });
      if (!res.ok) continue;
      const j = await res.json();
      const t = (j.transactions || [])[0];
      if (t && t.settled_balance != null) total += t.settled_balance;
    } catch { /* ignore */ }
  }
  return Math.round(total * 100) / 100;
}

/**
 * Récupère l'URL téléchargeable d'un justificatif (facture) attaché à une
 * transaction Qonto. L'URL est signée et temporaire.
 */
export async function qontoAttachmentUrl({ org_slug, secret_key }, attachmentId) {
  try {
    const res = await fetch(`${QONTO_BASE}/attachments/${attachmentId}`, {
      headers: { Authorization: authHeader({ org_slug, secret_key }) },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.attachment?.url || null;
  } catch { return null; }
}
