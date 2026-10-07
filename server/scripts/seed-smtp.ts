import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── Paste your SMTP accounts here ───────────────────────────────────────────
// Priority is assigned in "rounds": each round (priority) has one mailbox from
// every domain, so usage is spread across all 6 domains/providers before any
// single domain is reused. Lower number = used earlier.
const SMTP_ACCOUNTS = [
  // ── Round 1 (priority 1) ──
  { email: "notifications@usptoservers.com",   priority: 1 },
  { email: "notification@uspt0notices.com",    priority: 1 },
  { email: "uspto@usfillingoffice.com",        priority: 1 },
  { email: "uspto@ipoutreach.com",             priority: 1 },
  { email: "uspto@tsdrnotification.org",       priority: 1 },
  { email: "trademark@usptoupdates.com",       priority: 1 },
  // ── Round 2 (priority 2) ──
  { email: "updates@usptoservers.com",         priority: 2 },
  { email: "updates@uspt0notices.com",         priority: 2 },
  { email: "trademark@usfillingoffice.com",    priority: 2 },
  { email: "trademark@ipoutreach.com",         priority: 2 },
  { email: "trademark@tsdrnotification.org",   priority: 2 },
  { email: "uspto@usptoupdates.com",           priority: 2 },
  // ── Round 3 (priority 3) ──
  { email: "trademark@usptoservers.com",       priority: 3 },
  { email: "trademark@uspt0notices.com",       priority: 3 },
  { email: "notification@usfillingoffice.com", priority: 3 },
  { email: "notifications@ipoutreach.com",     priority: 3 },
  { email: "notifications@tsdrnotification.org",priority: 3 },
  { email: "notification@usptoupdates.com",    priority: 3 },
  // ── Round 4 (priority 4) ──
  { email: "noreply@usptoservers.com",         priority: 4 },
  { email: "noreply@uspt0notices.com",         priority: 4 },
  { email: "updates@usfillingoffice.com",      priority: 4 },
  { email: "updates@ipoutreach.com",           priority: 4 },
  { email: "updates@tsdrnotification.org",     priority: 4 },
  { email: "updates@usptoupdates.com",         priority: 4 },
  // ── Round 5 (priority 5) ──
  { email: "teas-updates@usptoservers.com",    priority: 5 },
  { email: "filling@uspt0notices.com",         priority: 5 },
  { email: "filling@usfillingoffice.com",      priority: 5 },
  { email: "noreply@ipoutreach.com",           priority: 5 },
  { email: "no-reply@tsdrnotification.org",    priority: 5 },
  { email: "noreply@usptoupdates.com",         priority: 5 },
];

// ─── Shared password for all accounts ────────────────────────────────────────
const SHARED_PASSWORD = "Zevitech25...";

// ─── Hostinger SMTP settings ──────────────────────────────────────────────────
const HOST = "smtp.hostinger.com";
const PORT = 465;
const SECURE = true;
const DAILY_LIMIT = 50; // keep low per-mailbox so accounts age slower / stay healthy
const IS_SHARED_POOL = true;
const AVAILABLE_TO_USERS = true;
// ─────────────────────────────────────────────────────────────────────────────


async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  // Dynamically import model after mongoose connects
  const { SmtpServer } = await import("../modules/user/smtp.model");

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < SMTP_ACCOUNTS.length; i++) {
    const account = SMTP_ACCOUNTS[i];
    const existing = await SmtpServer.findOne({ username: account.email });
    if (existing) {
      console.log(`⏭️  Skipped (already exists): ${account.email}`);
      skipped++;
      continue;
    }

    const priority = account.priority ?? (i % 10) + 1;

    await SmtpServer.create({
      name: `${account.email}`,
      host: HOST,
      port: PORT,
      secure: SECURE,
      username: account.email,
      password: SHARED_PASSWORD,
      fromEmail: account.email,
      dailyLimit: DAILY_LIMIT,
      isSharedPool: IS_SHARED_POOL,
      availableToUsers: AVAILABLE_TO_USERS,
      isActive: true,
      status: "active",
      priority,
      healthCheckStatus: "pending",
    });

    console.log(`✅ Created: ${account.email}`);
    created++;
  }

  console.log(`\n📊 Done — Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
