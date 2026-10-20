import { Share } from 'react-native';
import type { WorkPost, WorkPostWithId } from '@campusflow/shared';

import { getHypeCount, getWorkPostCategoryMeta, getWorkProgressMeta } from '@/src/lib/workPosts';
import { toDate } from '@/src/lib/dates';

export const BUILD_PROMPTS = [
  'What did you ship this week?',
  'Building something for SIH? Share your progress!',
  'Stuck on a bug? Post it — someone might help.',
  'Learning a new stack? Show your first commit.',
  'Side project season — what are you cooking?',
  'From idea to demo — where are you at?',
  'Open source contribution? Flex it here.',
  'Hackathon prep update? Your batch wants to know.',
] as const;

export const BUILD_IDEAS = [
  { emoji: '🤖', title: 'ML side project', hint: 'Model training, dataset, or demo app' },
  { emoji: '📱', title: 'Mobile app', hint: 'Expo, Flutter, or native build' },
  { emoji: '🌐', title: 'Open source PR', hint: 'Contribution or your own repo' },
  { emoji: '🔬', title: 'Research work', hint: 'Paper, lab project, or prototype' },
  { emoji: '🎨', title: 'Design + code', hint: 'UI portfolio or Figma-to-code' },
  { emoji: '🏆', title: 'Hackathon build', hint: 'SIH, internal hackathon, or 24h sprint' },
] as const;

export type BuildMilestone = {
  key: string;
  label: string;
  emoji: string;
  color: string;
  bg: string;
};

export function getDailyPrompt(): string {
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % BUILD_PROMPTS.length;
  return BUILD_PROMPTS[dayIndex]!;
}

export function getTrendingScore(post: WorkPost): number {
  const hype = getHypeCount(post);
  const date = toDate(post.updatedAt ?? post.createdAt);
  const hoursSince = date ? (Date.now() - date.getTime()) / 3_600_000 : 999;
  const recencyBonus = Math.max(0, (72 - hoursSince) / 72) * 4;
  const helpBonus = post.lookingForHelp ? 1 : 0;
  const shippedBonus = post.progressStatus === 'SHIPPED' ? 2 : 0;
  const progressBonus =
    post.progressStatus === 'POLISHING' ? 0.5 : post.progressStatus === 'IN_PROGRESS' ? 0.25 : 0;

  return hype * 3 + recencyBonus + helpBonus + shippedBonus + progressBonus;
}

export function sortByTrending(posts: WorkPostWithId[]): WorkPostWithId[] {
  return [...posts].sort((a, b) => getTrendingScore(b) - getTrendingScore(a));
}

export function getLeaderboardPosts(posts: WorkPostWithId[], limit = 3): WorkPostWithId[] {
  return sortByTrending(posts.filter((post) => getHypeCount(post) > 0 || post.progressStatus === 'SHIPPED')).slice(
    0,
    limit
  );
}

export function getDepartmentPulse(
  posts: WorkPostWithId[]
): { departmentName: string; count: number } | null {
  if (posts.length === 0) return null;

  const counts = new Map<string, number>();
  for (const post of posts) {
    counts.set(post.departmentName, (counts.get(post.departmentName) ?? 0) + 1);
  }

  let leader: { departmentName: string; count: number } | null = null;
  for (const [departmentName, count] of counts) {
    if (!leader || count > leader.count) {
      leader = { departmentName, count };
    }
  }

  return leader;
}

export function getBuildMilestones(post: WorkPost, isDark = false): BuildMilestone[] {
  const milestones: BuildMilestone[] = [];
  const hype = getHypeCount(post);
  const chip = {
    color: isDark ? '#FFFFFF' : '#191919',
    bg: isDark ? '#283037' : '#F3F2EF',
  };

  if (post.progressStatus === 'SHIPPED') {
    milestones.push({
      key: 'shipped',
      label: 'Shipped',
      emoji: '🚀',
      ...chip,
    });
  }

  if (hype >= 10) {
    milestones.push({
      key: 'legend',
      label: 'Campus legend',
      emoji: '👑',
      ...chip,
    });
  } else if (hype >= 5) {
    milestones.push({
      key: 'on-fire',
      label: 'On fire',
      emoji: '🔥',
      ...chip,
    });
  } else if (hype >= 3) {
    milestones.push({
      key: 'rising',
      label: 'Rising',
      emoji: '⭐',
      ...chip,
    });
  }

  if (post.lookingForHelp) {
    milestones.push({
      key: 'needs-crew',
      label: 'Needs crew',
      emoji: '🤝',
      ...chip,
    });
  }

  return milestones;
}

export function getHypeCheerMessage(hypeCount: number, isNewHype: boolean): string | null {
  if (!isNewHype) return null;

  if (hypeCount === 1) return 'First hype! Keep building 🌱';
  if (hypeCount === 3) return '3 hyped — you\'re rising ⭐';
  if (hypeCount === 5) return '5 hyped — you\'re on fire 🔥';
  if (hypeCount === 10) return '10 hyped — campus legend 👑';
  if (hypeCount % 5 === 0) return `${hypeCount} hyped! The board loves this 🚀`;
  return 'Hype sent! You made their day 🔥';
}

export function getPersonalHypeMessage(hypeCount: number): string {
  if (hypeCount === 0) return 'Post your build — classmates can hype you up!';
  if (hypeCount === 1) return '1 classmate hyped your build. Keep the momentum going!';
  if (hypeCount < 5) return `${hypeCount} classmates hyped your build. Nice traction!`;
  if (hypeCount < 10) return `${hypeCount} hyped — you're on fire on the Build Board!`;
  return `${hypeCount} hyped — you're a campus legend. Keep shipping!`;
}

export async function shareWorkPost(post: WorkPostWithId): Promise<void> {
  const category = getWorkPostCategoryMeta(post.category);
  const progress = getWorkProgressMeta(post.progressStatus);
  const hype = getHypeCount(post);

  const message = [
    `🔨 ${post.title}`,
    '',
    post.description,
    '',
    `${category.emoji} ${category.label} · ${progress.emoji} ${progress.label}`,
    hype > 0 ? `🔥 ${hype} hyped on Citians Build Board` : 'Check it out on Citians Build Board',
    '',
    `— ${post.studentName} (${post.departmentName})`,
  ].join('\n');

  await Share.share({ message, title: post.title });
}
