// Badge rules. `stats` = { xp, lessonsCompleted, coursesCompleted, longestStreak, highestTier }
const BADGES = [
  { key: 'first_lesson', title: 'First steps', description: 'Complete your first lesson', earned: (s) => s.lessonsCompleted >= 1 },
  { key: 'ten_lessons', title: 'On a roll', description: 'Complete 10 lessons', earned: (s) => s.lessonsCompleted >= 10 },
  { key: 'fifty_lessons', title: 'Code machine', description: 'Complete 50 lessons', earned: (s) => s.lessonsCompleted >= 50 },
  { key: 'streak_7', title: 'Week warrior', description: 'Reach a 7-day streak', earned: (s) => s.longestStreak >= 7 },
  { key: 'streak_30', title: 'Unstoppable', description: 'Reach a 30-day streak', earned: (s) => s.longestStreak >= 30 },
  { key: 'xp_500', title: 'XP hunter', description: 'Earn 500 XP', earned: (s) => s.xp >= 500 },
  { key: 'graduate', title: 'Graduate', description: 'Finish a whole course', earned: (s) => s.coursesCompleted >= 1 },
  { key: 'promoted', title: 'Moving up', description: 'Get promoted to a new league', earned: (s) => s.highestTier >= 1 },
];

export function badgesFor(stats) {
  return BADGES.map(({ key, title, description, earned }) => ({ key, title, description, earned: earned(stats) }));
}
