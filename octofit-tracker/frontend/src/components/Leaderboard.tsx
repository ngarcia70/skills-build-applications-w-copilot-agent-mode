import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName?: string;
  totalPoints?: number;
  rank?: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then((data) => {
        if (!isMounted) return;
        setEntries(data.leaderboard ?? []);
      })
      .catch((fetchError: unknown) => {
        if (!isMounted) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Unavailable');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      isLoading={isLoading}
      error={error}
      empty={entries.length === 0 && !isLoading && !error}
      emptyMessage="No leaderboard available."
    >
      {entries.length > 0 && (
        <ul className="list-group list-group-flush">
          {entries.map((entry, index) => (
            <li key={`${entry.teamName ?? 'team'}-${entry.rank ?? index}`} className="list-group-item">
              #{entry.rank ?? index + 1} {entry.teamName ?? 'Team'} · {entry.totalPoints ?? 0} pts
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
