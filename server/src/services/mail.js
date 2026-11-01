import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const SEND_TIMEOUT_MS = 15000;

// Brevo's HTTP API is used when its key is set, because some hosts (e.g. Render's free plan)
// block outgoing SMTP connections. Otherwise SMTP (Gmail in production, Mailpit in development).
const transporter =
  !env.BREVO_API_KEY && env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        // Fail fast instead of hanging when the port is blocked
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: SEND_TIMEOUT_MS,
      })
    : null;

/** Splits `Name <email@x.com>` (or a bare address) into its parts, ignoring stray quotes. */
export function parseAddress(address) {
  const cleaned = address.trim().replace(/^['"]|['"]$/g, '').trim();
  const match = cleaned.match(/^"?([^"<]*?)"?\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim() || undefined, email: match[2].trim() };
  // Also accept "Name email@x.com" without the angle brackets
  const loose = cleaned.match(/^(.*?)\s*(\S+@\S+)$/);
  return loose ? { name: loose[1].trim() || undefined, email: loose[2] } : { email: cleaned };
}

async function sendWithBrevo({ to, subject, html, text }) {
  const sender = parseAddress(env.MAIL_FROM);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const senderHint = /sender/i.test(body.message ?? '')
      ? ` Sender used: "${sender.email}". Check MAIL_FROM is like Codelings <you@gmail.com> and that address is verified in Brevo.`
      : '';
    throw new Error(`Brevo rejected the email (${res.status}): ${body.message ?? res.statusText}.${senderHint}`);
  }
}

/** Sends an email. Returns false (and logs) when no email service is configured. */
export async function sendMail(message) {
  if (env.BREVO_API_KEY) {
    await sendWithBrevo(message);
    return true;
  }
  if (!transporter) {
    console.log(`[mail] Email not configured, skipped "${message.subject}" to ${message.to}`);
    return false;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, ...message });
  return true;
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function layout({ heading, body, buttonText, buttonUrl, footer = '' }) {
  return `<!doctype html>
<html><body style="margin:0;background:#EEF3FF;font-family:Nunito,Segoe UI,Arial,sans-serif;color:#1E1B4B">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:24px;border:2px solid #DCE6FF;padding:32px">
      <tr><td style="font-size:22px;font-weight:900;color:#2F6BFF;padding-bottom:16px">codelings</td></tr>
      <tr><td style="font-size:24px;font-weight:900;padding-bottom:12px">${heading}</td></tr>
      <tr><td style="font-size:16px;line-height:1.6;color:#475569;padding-bottom:24px">${body}</td></tr>
      <tr><td><a href="${buttonUrl}" style="display:inline-block;background:#2F6BFF;color:#fff;text-decoration:none;font-weight:900;text-transform:uppercase;letter-spacing:.05em;padding:14px 28px;border-radius:16px;border-bottom:4px solid #1A43C4">${buttonText}</a></td></tr>
      ${footer && `<tr><td style="font-size:13px;color:#94A3B8;padding-top:24px">${footer}</td></tr>`}
    </table>
  </td></tr></table>
</body></html>`;
}

const firstName = (name) => escapeHtml(name.trim().split(/\s+/)[0]);

function layoutNoButton({ heading, body }) {
  return layout({ heading, body, buttonText: '', buttonUrl: '' }).replace(/<tr><td><a href=""[^]*?<\/a><\/td><\/tr>/, '');
}

export function applicationReceivedEmail({ to, name }) {
  return {
    to,
    subject: 'We got your Codelings application 🐛',
    text: `Hi ${name}! Thanks for applying to Codelings. We'll review your application and email you as soon as it's approved.`,
    html: layoutNoButton({
      heading: `Thanks for applying, ${firstName(name)}!`,
      body: "We've received your application to join Codelings. Your tutor will review it soon, and you'll get an email with your login details as soon as it's approved.",
    }),
  };
}

export function newApplicationEmail({ to, applicant, reviewLink }) {
  const referral = applicant.referrerName ? ` Referred by <b>${escapeHtml(applicant.referrerName)}</b>.` : '';
  return {
    to,
    subject: `New Codelings application: ${applicant.name}`,
    text: `${applicant.name} (${applicant.email}, ${applicant.phone}) applied to Codelings. Review it: ${reviewLink}`,
    html: layout({
      heading: 'New application to review',
      body: `<b>${escapeHtml(applicant.name)}</b> (${escapeHtml(applicant.email)}, ${escapeHtml(applicant.phone)}) wants to join.${referral}`,
      buttonText: 'Review application',
      buttonUrl: reviewLink,
    }),
  };
}

export function approvedEmail({ to, name, tempPassword, loginLink, courseTitles }) {
  const courses = courseTitles.length ? ` You're enrolled in <b>${courseTitles.map(escapeHtml).join('</b>, <b>')}</b>.` : '';
  return {
    to,
    subject: "You're in! Your Codelings login 🎉",
    text: `Hi ${name}! Your Codelings application was approved. Sign in at ${loginLink} with email ${to} and temporary password ${tempPassword}. You'll be asked to choose your own password.`,
    html: layout({
      heading: `Welcome to Codelings, ${firstName(name)}! 🎉`,
      body: `Your application was approved.${courses}<br><br>
        Sign in with:<br>
        Email: <b>${escapeHtml(to)}</b><br>
        Temporary password: <b style="font-family:monospace;font-size:18px;letter-spacing:1px">${escapeHtml(tempPassword)}</b><br><br>
        You'll choose your own password the first time you sign in.`,
      buttonText: 'Sign in',
      buttonUrl: loginLink,
    }),
  };
}

export function rejectedEmail({ to, name, note }) {
  const noteHtml = note ? `<br><br><i>"${escapeHtml(note)}"</i>` : '';
  return {
    to,
    subject: 'About your Codelings application',
    text: `Hi ${name}, thank you for applying to Codelings. Unfortunately we can't offer you a place right now.${note ? ` Note from your tutor: ${note}` : ''}`,
    html: layoutNoButton({
      heading: `Hi ${firstName(name)},`,
      body: `Thank you for applying to Codelings. Unfortunately we can't offer you a place right now.${noteHtml}`,
    }),
  };
}

export function streakReminderEmail({ to, name, streak, freezes, courseTitle, lessonTitle, link, settingsLink }) {
  const first = firstName(name);
  const freezeNote = freezes > 0 ? ' You have a streak freeze saved, but why spend it?' : '';
  return {
    to,
    subject: `🔥 Your ${streak}-day streak ends at midnight!`,
    text: `Hi ${first}! You haven't practised today. Finish "${lessonTitle}" in ${courseTitle} to keep your ${streak}-day streak alive: ${link}`,
    html: layout({
      heading: `Hi ${first}, your ${streak}-day streak is on the line! 🔥`,
      body: `You haven't practised today. Finish <b>${escapeHtml(lessonTitle)}</b> in <b>${escapeHtml(courseTitle)}</b> to keep it alive. It only takes a few minutes.${freezeNote}`,
      buttonText: 'Keep my streak',
      buttonUrl: link,
      footer: `Don't want these reminders? <a href="${settingsLink}" style="color:#94A3B8">Turn them off in your profile</a>.`,
    }),
  };
}
