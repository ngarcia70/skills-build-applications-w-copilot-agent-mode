import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title?: string;
  focus?: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const email = 'mona@example.com';

    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(email)}`)
      .then((data) => {
        if (!isMounted) return;
        setSuggestions(data.suggestions ?? []);
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
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      isLoading={isLoading}
      error={error}
      empty={suggestions.length === 0 && !isLoading && !error}
      emptyMessage="No workout suggestions available."
    >
      {suggestions.length > 0 && (
        <ul className="list-group list-group-flush">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.title ?? 'workout'}-${index}`} className="list-group-item">
              <strong>{suggestion.title ?? 'Workout'}</strong>
              {suggestion.focus ? ` · ${suggestion.focus}` : ''}
              {suggestion.reason ? ` · ${suggestion.reason}` : ''}
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
