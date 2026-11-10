import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = {
  _id?: string;
  type?: string;
  minutes?: number;
  points?: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getJson<{ activities: ActivityRecord[] }>('/api/activities')
      .then((data) => {
        if (!isMounted) return;
        setActivities(data.activities ?? []);
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
      title="Activities"
      description="Track student activity minutes and points."
      isLoading={isLoading}
      error={error}
      empty={activities.length === 0 && !isLoading && !error}
      emptyMessage="No activities available."
    >
      {activities.length > 0 && (
        <ul className="list-group list-group-flush">
          {activities.map((activity, index) => (
            <li key={activity._id ?? `${activity.type ?? 'activity'}-${index}`} className="list-group-item">
              {activity.type ?? 'Activity'} · {activity.minutes ?? 0} min · {activity.points ?? 0} pts
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
