// Liste les remboursements erronés du jour (montant != 6,99) avec ID + statut, et teste
// l'annulation d'UN remboursement pending si TEST_CANCEL est fourni. Lecture seule sauf test.
// @Rabah 2026-07-17
import Stripe from 'stripe';
import mongoose from 'mongoose';

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_digital';
await mongoose.connect(MONGO);
const acc = await mongoose.connection.db.collection('stripeaccounts').findOne({ label: 'Delivery Eat' });
const stripe = new Stripe(acc.secret_key);

const now = new Date();
const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
const startLocal = new Date(paris); startLocal.setHours(0, 0, 0, 0);
const offsetMs = now.getTime() - paris.getTime();
const startUnix = Math.floor((startLocal.getTime() + offsetMs) / 1000);
const hhmm = (u) => new Date(u * 1000).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

let list = [], sa, g = 0;
do { const p = await stripe.refunds.list({ limit: 100, created: { gte: startUnix }, expand: ['data.charge.customer'], ...(sa ? { starting_after: sa } : {}) }); list.push(...p.data); sa = p.has_more ? p.data[p.data.length - 1].id : null; g += 1; } while (sa && g < 20);

const erro = list.filter(r => Math.round(r.amount) !== 699); // != 6,99 €
erro.sort((a, b) => b.amount - a.amount);
console.log(`Remboursements erronés du jour (montant != 6,99) : ${erro.length}  ·  total ${(erro.reduce((s, r) => s + r.amount, 0) / 100).toLocaleString('fr-FR')} €`);
let nbPending = 0;
for (const r of erro) {
  const ch = typeof r.charge === 'object' ? r.charge : null;
  const cust = ch && typeof ch.customer === 'object' ? ch.customer : null;
  const name = ch?.billing_details?.name || cust?.name || '';
  const email = ch?.billing_details?.email || cust?.email || ch?.receipt_email || '';
  const chId = ch?.id || (typeof r.charge === 'string' ? r.charge : '');
  const pi = ch?.payment_intent || '';
  const custId = cust?.id || (ch && typeof ch.customer === 'string' ? ch.customer : '');
  if (r.status === 'pending') nbPending++;
  console.log(`${(r.amount / 100).toFixed(2).padStart(7)} €  ${(name || '(sans nom)').padEnd(26).slice(0, 26)}  ${email.padEnd(34).slice(0, 34)}  charge=${chId}  pi=${pi}  cust=${custId}  refund=${r.id}`);
}
console.log(`\nPending (théoriquement annulables) : ${nbPending}`);

if (process.env.TEST_CANCEL) {
  const id = process.env.TEST_CANCEL;
  console.log(`\n>>> TEST annulation de ${id} ...`);
  try { const c = await stripe.refunds.cancel(id); console.log(`   OK -> statut=${c.status}`); }
  catch (e) { console.log(`   ECHEC -> ${e.message}`); }
}
await mongoose.disconnect();
process.exit(0);
