import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  _id?: string;
  name?: string;
  mascot?: string;
  members?: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getJson<{ teams: TeamRecord[] }>('/api/teams')
      .then((data) => {
        if (!isMounted) return;
        setTeams(data.teams ?? []);
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
      title="Teams"
      description="Manage teams and members."
      isLoading={isLoading}
      error={error}
      empty={teams.length === 0 && !isLoading && !error}
      emptyMessage="No teams available."
    >
      {teams.length > 0 && (
        <ul className="list-group list-group-flush">
          {teams.map((team, index) => (
            <li key={team._id ?? `${team.name ?? 'team'}-${index}`} className="list-group-item">
              <strong>{team.name ?? 'Team'}</strong> · {team.mascot ?? 'Mascot'} · {team.members?.length ?? 0} members
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
