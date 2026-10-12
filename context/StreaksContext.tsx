import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  addStreakChallenge,
  deleteStreakChallenge,
  getStreakChallenges,
  setCheckIn,
  StreakChallenge,
  StreakChallengeInput,
  updateStreakChallenge,
} from '@/services/streaksService';
import { calculateChallengeStreak, StreakSummary, toDayKey } from '@/utils/streakChallenge';

export interface ChallengeWithSummary extends StreakChallenge {
  summary: StreakSummary;
}

interface StreaksContextType {
  challenges: ChallengeWithSummary[];
  loading: boolean;
  error: string | null;
  addChallenge: (input: StreakChallengeInput) => Promise<void>;
  updateChallenge: (id: string, input: Partial<StreakChallengeInput>) => Promise<void>;
  deleteChallenge: (id: string) => Promise<void>;
  /** Checks in for today, or undoes today's check-in. */
  toggleToday: (id: string) => Promise<void>;
}

const StreaksContext = createContext<StreaksContextType>({
  challenges: [],
  loading: false,
  error: null,
  addChallenge: async () => {},
  updateChallenge: async () => {},
  deleteChallenge: async () => {},
  toggleToday: async () => {},
});

/**
 * Shares streak challenges between the sidebar (where you check in) and the month view
 * (where the streak bands are drawn), so a check-in shows up on the calendar straight away.
 */
export function StreaksProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [challenges, setChallenges] = useState<StreakChallenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setChallenges(await getStreakChallenges());
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load streaks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      Promise.resolve().then(() => setChallenges([]));
      return;
    }
    Promise.resolve().then(reload);
  }, [authLoading, user, reload]);

  const addChallenge = useCallback(
    async (input: StreakChallengeInput) => {
      await addStreakChallenge(input);
      await reload();
    },
    [reload],
  );

  const updateChallenge = useCallback(async (id: string, input: Partial<StreakChallengeInput>) => {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
    await updateStreakChallenge(id, input);
  }, []);

  const deleteChallenge = useCallback(async (id: string) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
    await deleteStreakChallenge(id);
  }, []);

  const toggleToday = useCallback(
    async (id: string) => {
      const today = toDayKey(new Date());
      const challenge = challenges.find((c) => c.id === id);
      if (!challenge) return;
      const checkedIn = !challenge.checkIns.includes(today);
      // Update the screen first so the tap feels instant, then save
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, checkIns: checkedIn ? [...c.checkIns, today] : c.checkIns.filter((d) => d !== today) }
            : c,
        ),
      );
      try {
        await setCheckIn(id, today, checkedIn);
      } catch (e: any) {
        setError(e.message || 'Failed to save check-in');
        await reload();
      }
    },
    [challenges, reload],
  );

  const withSummaries = useMemo(
    () => challenges.map((c) => ({ ...c, summary: calculateChallengeStreak(c.checkIns, c.startDate) })),
    [challenges],
  );

  return (
    <StreaksContext.Provider
      value={{ challenges: withSummaries, loading, error, addChallenge, updateChallenge, deleteChallenge, toggleToday }}
    >
      {children}
    </StreaksContext.Provider>
  );
}

export function useStreaks() {
  return useContext(StreaksContext);
}
