import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureValidObjectId(value: unknown, label: string) {
  const id = normalizeString(value);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(`${label} is invalid`, 400);
  }
  return new mongoose.Types.ObjectId(id);
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  const payload = (input as Record<string, unknown>) ?? {};
  const userId = ensureValidObjectId(payload.userId, 'User ID');
  const teamId = ensureValidObjectId(payload.teamId, 'Team ID');
  const type = normalizeString(payload.type);
  const minutes = Number(payload.minutes);

  if (!type) throw new HttpError('Activity type is required', 400);
  if (!Number.isFinite(minutes) || minutes <= 0) throw new HttpError('Activity minutes must be a positive number', 400);

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user) throw new HttpError('User not found', 404);
  if (!team) throw new HttpError('Team not found', 404);

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: Math.max(1, Math.round(minutes)),
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  const payload = (input as Record<string, unknown>) ?? {};
  const name = normalizeString(payload.name);
  const mascot = normalizeString(payload.mascot);

  if (!name) throw new HttpError('Team name is required', 400);
  if (!mascot) throw new HttpError('Team mascot is required', 400);

  const membersInput = Array.isArray(payload.members) ? payload.members : [];
  for (const member of membersInput) {
    if (member !== undefined && member !== null && !mongoose.Types.ObjectId.isValid(String(member))) {
      throw new HttpError('Team members must be valid user IDs', 400);
    }
  }

  const team = await Team.create({
    name,
    mascot,
    members: membersInput
      .filter((member) => member !== undefined && member !== null)
      .map((member) => new mongoose.Types.ObjectId(String(member))),
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const summaries = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  if (summaries.length === 0) return [];

  const teams = await Team.find({ _id: { $in: summaries.map((summary) => summary._id) } }).lean();
  const teamMap = new Map<string, string>(teams.map((team) => [team._id.toString(), team.name]));

  return summaries.map((summary, index) => ({
    teamName: teamMap.get(summary._id.toString()) ?? 'Unknown team',
    totalPoints: Number(summary.totalPoints),
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = normalizeString(userEmail).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) throw new HttpError('User not found', 404);

  const recentActivity = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(1).lean();
  const recentType = normalizeString(recentActivity[0]?.type).toLowerCase();
  const goal = normalizeString(user.fitnessGoal).toLowerCase();
  const workouts = await Workout.find().lean();

  const suggestions = workouts
    .map((workout) => {
      const focus = normalizeString(workout.focus).toLowerCase();
      let score = 0;
      if (focus === goal) score += 3;
      if (focus === recentType) score += 2;
      return { ...workout, score };
    })
    .sort((left, right) => right.score - left.score || String(left.title ?? '').localeCompare(String(right.title ?? '')))
    .slice(0, 3)
    .map((workout) => {
      const focus = normalizeString(workout.focus).toLowerCase();
      const reasonParts: string[] = [];
      if (focus === goal && goal) reasonParts.push(`matches your ${String(user.fitnessGoal)} goal`);
      if (focus === recentType && recentType) reasonParts.push(`fits your recent ${recentActivity[0]?.type ?? 'activity'} activity`);
      if (reasonParts.length === 0) reasonParts.push('supports steady progress');
      const { score, _id, __v, ...suggestion } = workout as Record<string, unknown> & { score: number };
      return {
        ...suggestion,
        reason: reasonParts.join(' and '),
      };
    });

  return suggestions;
}

export { User };
