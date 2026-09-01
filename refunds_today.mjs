// Vérité complète du jour : TOUS les débits carte + TOUS les remboursements (tous comptes).
// Lecture seule. @Rabah 2026-07-17
import Stripe from 'stripe';
import mongoose from 'mongoose';

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_digital';
await mongoose.connect(MONGO);
const accts = await mongoose.connection.db.collection('stripeaccounts').find({}).toArray();

// Début de journée (heure de Paris) en timestamp Unix.
const now = new Date();
const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
const startLocal = new Date(paris); startLocal.setHours(0, 0, 0, 0);
const offsetMs = now.getTime() - paris.getTime();
const startUnix = Math.floor((startLocal.getTime() + offsetMs) / 1000);
const hhmm = (u) => new Date(u * 1000).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

async function pageAll(fn) {
  let out = [], sa, g = 0;
  do { const p = await fn(sa); out.push(...p.data); sa = p.has_more ? p.data[p.data.length - 1].id : null; g += 1; } while (sa && g < 60);
  return out;
}

for (const a of accts) {
  const stripe = new Stripe(a.secret_key);

  // 1) TOUS les débits (charges) créés aujourd'hui, tous statuts.
  const charges = await pageAll((sa) => stripe.charges.list({ limit: 100, created: { gte: startUnix }, expand: ['data.customer'], ...(sa ? { starting_after: sa } : {}) }));
  const succ = charges.filter(c => c.status === 'succeeded');
  const failed = charges.filter(c => c.status === 'failed');
  const other = charges.filter(c => c.status !== 'succeeded' && c.status !== 'failed');
  const sumSucc = succ.reduce((s, c) => s + c.amount, 0) / 100;
  const sumRefundedOnSucc = succ.reduce((s, c) => s + (c.amount_refunded || 0), 0) / 100;

  // 2) TOUS les remboursements créés aujourd'hui.
  const refunds = await pageAll((sa) => stripe.refunds.list({ limit: 100, created: { gte: startUnix }, expand: ['data.charge.customer'], ...(sa ? { starting_after: sa } : {}) }));
  const sumRef = refunds.reduce((s, r) => s + r.amount, 0) / 100;

  console.log(`\n========== COMPTE "${a.label}" (${a._id}) ==========`);
  console.log(`DEBITS aujourd'hui : ${charges.length} total  |  ${succ.length} réussis (${sumSucc.toLocaleString('fr-FR')} €)  |  ${failed.length} échoués  |  ${other.length} autres`);
  console.log(`REMBOURSEMENTS aujourd'hui : ${refunds.length}  (${sumRef.toLocaleString('fr-FR')} €)`);
  console.log(`Déjà remboursé sur les débits réussis du jour : ${sumRefundedOnSucc.toLocaleString('fr-FR')} €`);

  console.log(`\n--- DEBITS REUSSIS (${succ.length}) ---`);
  succ.sort((x, y) => x.created - y.created);
  for (const c of succ) {
    const cust = typeof c.customer === 'object' ? c.customer : null;
    const who = c.billing_details?.name || cust?.name || c.billing_details?.email || cust?.email || c.receipt_email || c.id;
    const card = c.payment_method_details?.card ? `${c.payment_method_details.card.brand} ••${c.payment_method_details.card.last4}` : '';
    const ref = (c.amount_refunded || 0) > 0 ? `  ↩remb.${((c.amount_refunded || 0) / 100).toFixed(2)}${c.refunded ? '(total)' : '(partiel)'}` : '';
    console.log(`  ${hhmm(c.created)}  ${(c.amount / 100).toFixed(2)} ${(c.currency || 'eur').toUpperCase()}  ${who}  ${card}${ref}`);
  }

  if (failed.length) {
    console.log(`\n--- DEBITS ECHOUES (${failed.length}) ---`);
    failed.sort((x, y) => x.created - y.created);
    for (const c of failed) {
      const cust = typeof c.customer === 'object' ? c.customer : null;
      const who = c.billing_details?.name || cust?.name || c.billing_details?.email || cust?.email || c.receipt_email || c.id;
      console.log(`  ${hhmm(c.created)}  ${(c.amount / 100).toFixed(2)} ${(c.currency || 'eur').toUpperCase()}  ${who}  [${c.failure_message || c.outcome?.seller_message || 'échec'}]`);
    }
  }

  console.log(`\n--- REMBOURSEMENTS (${refunds.length}) ---`);
  const byCharge = new Map();
  for (const r of refunds) { const cid = typeof r.charge === 'object' ? r.charge?.id : r.charge; byCharge.set(cid, (byCharge.get(cid) || 0) + 1); }
  refunds.sort((x, y) => x.created - y.created);
  for (const r of refunds) {
    const ch = typeof r.charge === 'object' ? r.charge : null;
    const cust = ch && typeof ch.customer === 'object' ? ch.customer : null;
    const who = ch?.billing_details?.name || cust?.name || ch?.billing_details?.email || cust?.email || ch?.receipt_email || r.charge;
    const cid = ch?.id || r.charge;
    const dup = byCharge.get(cid) > 1 ? '  ⚠️DOUBLON' : '';
    const motif = r.metadata?.motif ? ` · motif="${r.metadata.motif}"` : '';
    console.log(`  ${hhmm(r.created)}  ${(r.amount / 100).toFixed(2)} ${(r.currency || 'eur').toUpperCase()}  ${who}  [${r.status}]${motif}${dup}`);
  }
  const dups = [...byCharge.entries()].filter(([, n]) => n > 1);
  if (dups.length) console.log(`  ⚠️ ${dups.length} charge(s) remboursée(s) plusieurs fois !`);
}
await mongoose.disconnect();
process.exit(0);
