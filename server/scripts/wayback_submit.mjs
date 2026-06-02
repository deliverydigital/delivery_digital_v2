import mongoose from "mongoose";
import SeoContent from "./server/models/SeoContent.js";

await mongoose.connect(process.env.MONGO_URI);
const pages = await SeoContent.find({ status: "published" }, { slug: 1, type: 1 }).lean();
console.log(`Found ${pages.length} pages to archive`);

let ok = 0, err = 0;
const SITE = "https://deliverydigital.fr";
for (let i = 0; i < pages.length; i++) {
  const p = pages[i];
  const path = p.type === "article" ? `/blog/${p.slug}` : `/services/${p.slug}`;
  const url = `${SITE}${path}`;
  const waybackUrl = `https://web.archive.org/save/${url}`;
  try {
    const r = await fetch(waybackUrl, { method: "GET", headers: { "User-Agent": "DELIVERY-Digital-Archiver/1.0" }, signal: AbortSignal.timeout(30000) });
    if (r.status === 200 || r.status === 302) ok++; else err++;
    if (i % 50 === 0) console.log(`  ${i}/${pages.length} (ok=${ok}, err=${err})`);
  } catch (e) {
    err++;
  }
  await new Promise((res) => setTimeout(res, 1500)); // 1.5s entre chaque pour pas spammer
}

// Aussi homepage + hubs
for (const u of [SITE+"/", SITE+"/services", SITE+"/discutons", SITE+"/formation"]) {
  try { await fetch(`https://web.archive.org/save/${u}`, { signal: AbortSignal.timeout(30000) }); ok++; } catch {}
  await new Promise((res) => setTimeout(res, 1500));
}

console.log(`\nWayback archived: ${ok} OK, ${err} err`);
await mongoose.disconnect();
