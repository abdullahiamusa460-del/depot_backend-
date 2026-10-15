import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import User from './models/User.js';
import env from './config/env.js';

const RECIPIENTS = [
  'dazumiglobalventuresadmin@gmail.com',
  'dazumiglobalventuresstaff@gmail.com',
];

const ORGANISATION = 'Dazumi Global Ventures';

const roleLabel = (role) => (role === 'admin' ? 'Administrator' : 'Staff');

function subjectFor(user) {
  return `${ORGANISATION}: Your account role is ${roleLabel(user.role)}`;
}

function textFor(user) {
  return [
    `Hello ${user.name},`,
    '',
    `Your account on the ${ORGANISATION} POS & Inventory system has been created.`,
    '',
    `Role: ${roleLabel(user.role)} (${user.role})`,
    `Login email: ${user.email}`,
    `Status: ${user.active ? 'Active' : 'Inactive'}`,
    `System: ${env.appUrl}`,
    '',
    'Sign in with the email above and your password. If you did not expect this account, contact the shop administrator immediately.',
    '',
    `— ${ORGANISATION}`,
  ].join('\n');
}

function htmlFor(user) {
  const badge = user.role === 'admin' ? '#1d4ed8' : '#047857';
  return `<!doctype html>
<html>
  <body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;padding:24px;color:#111827">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
      <p style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;margin:0 0 16px">${ORGANISATION}</p>
      <h1 style="font-size:20px;margin:0 0 8px">Your account has been created</h1>
      <p style="margin:0 0 24px;color:#374151">Hello ${user.name}, your access to the ${ORGANISATION} POS &amp; Inventory system is ready.</p>
      <p style="margin:0 0 16px">
        <span style="display:inline-block;background:${badge};color:#ffffff;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:bold">Role: ${roleLabel(user.role)}</span>
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#6b7280">Login email</td><td style="padding:8px 0;text-align:right;font-weight:bold">${user.email}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Role</td><td style="padding:8px 0;text-align:right;font-weight:bold">${roleLabel(user.role)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Status</td><td style="padding:8px 0;text-align:right;font-weight:bold">${user.active ? 'Active' : 'Inactive'}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">System</td><td style="padding:8px 0;text-align:right;font-weight:bold">${env.appUrl}</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280">Sign in with the email above and your password. If you did not expect this account, contact the shop administrator immediately.</p>
    </div>
  </body>
</html>`;
}

async function main() {
  if (!env.smtp.user || !env.smtp.pass) {
    throw new Error('SMTP_USER and SMTP_PASS are not set in .env');
  }

  await mongoose.connect(env.mongoUri);
  const users = await User.find({ email: { $in: RECIPIENTS } }).sort('email');
  if (users.length === 0) throw new Error('No matching users found in the database');

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });

  await transporter.verify();

  for (const user of users) {
    const info = await transporter.sendMail({
      from: `"${ORGANISATION}" <${env.smtp.from}>`,
      to: user.email,
      subject: subjectFor(user),
      text: textFor(user),
      html: htmlFor(user),
    });
    console.log(`sent to ${user.email} [${user.role}] -> ${info.messageId}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(`Failed: ${err.message || err}`);
  process.exit(1);
});
