import mongoose from 'mongoose';
import { env } from '../config/env.js';
import LeagueMembership from '../models/LeagueMembership.js';
import User from '../models/User.js';
import { addDays, localDate } from './streak.js';

export const TIER_COUNT = 8; // names live in the client (Hello World … Legend)
const GROUP_SIZE = 20;
const MAX_MOVES = 5;

/** Monday (YYYY-MM-DD) of the league week containing `date`. */
export function currentWeek(date = new Date()) {
  const today = localDate(env.LEAGUE_TIMEZONE, date);
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(today, -weekday);
}

function timezoneOffsetMs(date) {
  const inZone = new Date(date.toLocaleString('en-US', { timeZone: env.LEAGUE_TIMEZONE }));
  const inUtc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return inZone - inUtc;
}

/** The instant the week ends (next Monday 00:00 in the league timezone). */
export function weekEndsAt(week) {
  const nextMonday = new Date(`${addDays(week, 7)}T00:00:00Z`);
  return new Date(nextMonday.getTime() - timezoneOffsetMs(nextMonday));
}

/** How many move up (and down) in a group: 5 for 20 people, fewer for small groups. */
const movesFor = (size) => Math.min(MAX_MOVES, Math.max(1, Math.round(size / 4)));

/** 'promote' | 'demote' | null for the member at `index` in a group sorted by XP. */
export function zoneFor(index, size, member) {
  const moves = movesFor(size);
  if (index < moves && member.xp > 0 && member.tier < TIER_COUNT - 1) return 'promote';
  if (index >= size - moves && index >= moves && member.tier > 0) return 'demote';
  return null;
}

async function openGroupId(week, tier) {
  const [group] = await LeagueMembership.aggregate([
    { $match: { week, tier } },
    { $group: { _id: '$groupId', size: { $sum: 1 } } },
    { $match: { size: { $lt: GROUP_SIZE } } },
    { $sort: { size: -1 } },
    { $limit: 1 },
  ]);
  return group?._id ?? new mongoose.Types.ObjectId();
}

/** Adds XP to this week's league, joining a group on the first XP of the week. */
export async function addLeagueXp(user, xp) {
  if (xp <= 0 || user.role !== 'student') return;
  const week = currentWeek();
  const existing = await LeagueMembership.findOneAndUpdate({ user: user._id, week }, { $inc: { xp } });
  if (existing) return;

  const tier = user.league?.tier ?? 0;
  try {
    await LeagueMembership.create({ user: user._id, week, tier, groupId: await openGroupId(week, tier), xp });
  } catch (err) {
    if (err.code !== 11000) throw err;
    await LeagueMembership.updateOne({ user: user._id, week }, { $inc: { xp } }); // joined concurrently
  }
}

export function sortedGroup(week, groupId) {
  return LeagueMembership.find({ week, groupId }).sort({ xp: -1, updatedAt: 1 });
}

async function closeGroup(week, groupId) {
  const members = await sortedGroup(week, groupId);
  const outcomes = members.map((member, index) => {
    const zone = zoneFor(index, members.length, member);
    const toTier = member.tier + (zone === 'promote' ? 1 : zone === 'demote' ? -1 : 0);
    const result = zone === 'promote' ? 'promoted' : zone === 'demote' ? 'demoted' : 'stayed';
    return { member, rank: index + 1, toTier, result };
  });

  // Mark the group closed first so a crash can't apply moves twice
  await LeagueMembership.bulkWrite(
    outcomes.map(({ member, rank, result }) => ({ updateOne: { filter: { _id: member._id }, update: { result, rank } } }))
  );
  await User.bulkWrite(
    outcomes.map(({ member, rank, toTier, result }) => ({
      updateOne: {
        filter: { _id: member.user },
        update: {
          $set: { 'league.tier': toTier },
          $max: { 'league.highestTier': toTier },
          $push: { notices: { type: 'league_result', data: { result, fromTier: member.tier, toTier, rank, week }, at: new Date() } },
        },
      },
    }))
  );
}

/** Settles every finished week that hasn't been closed yet. Safe to call repeatedly. */
export async function closeFinishedWeeks() {
  const weeks = await LeagueMembership.distinct('week', { result: null, week: { $lt: currentWeek() } });
  for (const week of weeks.sort()) {
    const groupIds = await LeagueMembership.distinct('groupId', { week, result: null });
    for (const groupId of groupIds) await closeGroup(week, groupId);
  }
}
