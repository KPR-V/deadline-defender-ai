import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getTasks } from '../lib/firebase/firestore';
import { Task } from '../types/task';

// Simple module-level cache so data survives across navigations
let taskCache: { uid: string; tasks: Task[]; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds stale-while-revalidate window

export function useUserTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Hydrate from cache immediately if available for this user
    if (taskCache && user && taskCache.uid === user.uid) {
      return taskCache.tasks;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    // If we have fresh cached data, skip the loading state entirely
    if (taskCache && user && taskCache.uid === user.uid) {
      return false;
    }
    return true;
  });
  const [error, setError] = useState<Error | null>(null);
  const fetchInFlight = useRef(false);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    // Prevent duplicate concurrent fetches
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;

    try {
      // Only show loading spinner if we have NO cached data to display
      if (!taskCache || taskCache.uid !== user.uid) {
        setLoading(true);
      }

      const userTasks = await getTasks(user.uid);
      setTasks(userTasks);

      // Update cache
      taskCache = { uid: user.uid, tasks: userTasks, timestamp: Date.now() };
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      fetchInFlight.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      taskCache = null;
      return;
    }

    // If cache is fresh, show cached data immediately and revalidate in background
    if (taskCache && taskCache.uid === user.uid) {
      setTasks(taskCache.tasks);
      setLoading(false);

      // Background revalidate if stale
      if (Date.now() - taskCache.timestamp > CACHE_TTL) {
        fetchTasks();
      }
    } else {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { tasks, loading, error, refetch: fetchTasks };
}
