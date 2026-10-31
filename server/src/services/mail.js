import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

/** Sends an email. Returns false (and logs) when SMTP isn't configured. */
export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`[mail] SMTP not configured, skipped "${subject}" to ${to}`);
    return false;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
  return true;
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function layout({ heading, body, buttonText, buttonUrl, footer = '' }) {
  return `<!doctype html>
<html><body style="margin:0;background:#F6F4FF;font-family:Nunito,Segoe UI,Arial,sans-serif;color:#1E1B4B">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:24px;border:2px solid #ECE8FF;padding:32px">
      <tr><td style="font-size:22px;font-weight:900;color:#6D4AFF;padding-bottom:16px">codelings</td></tr>
      <tr><td style="font-size:24px;font-weight:900;padding-bottom:12px">${heading}</td></tr>
      <tr><td style="font-size:16px;line-height:1.6;color:#475569;padding-bottom:24px">${body}</td></tr>
      <tr><td><a href="${buttonUrl}" style="display:inline-block;background:#6D4AFF;color:#fff;text-decoration:none;font-weight:900;text-transform:uppercase;letter-spacing:.05em;padding:14px 28px;border-radius:16px;border-bottom:4px solid #4626D6">${buttonText}</a></td></tr>
      ${footer && `<tr><td style="font-size:13px;color:#94A3B8;padding-top:24px">${footer}</td></tr>`}
    </table>
  </td></tr></table>
</body></html>`;
}

export function inviteEmail({ to, name, link, courseTitles }) {
  const greeting = name ? `Hi ${escapeHtml(name)}!` : 'Hi there!';
  const courses = courseTitles.length
    ? ` You've got a spot in <b>${courseTitles.map(escapeHtml).join('</b>, <b>')}</b>.`
    : '';
  return {
    to,
    subject: "You're invited to learn to code on Codelings 🐛",
    text: `${greeting} You've been invited to Codelings. Create your account here: ${link}`,
    html: layout({
      heading: `${greeting} Your coding adventure starts now.`,
      body: `You've been invited to join Codelings.${courses} Bite-sized lessons, streaks, XP and leagues. Learning to code just became a game.`,
      buttonText: 'Accept invite',
      buttonUrl: link,
    }),
  };
}

export function streakReminderEmail({ to, name, streak, freezes, courseTitle, lessonTitle, link, settingsLink }) {
  const first = escapeHtml(name.trim().split(/\s+/)[0]);
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
