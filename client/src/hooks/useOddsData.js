// src/hooks/useOddsData.js
import { useState, useEffect, useCallback } from 'react';
import api from '../services/axios';

const MAX_LIVE = 15;
const MAX_UPCOMING = 30;
const MAX_FINISHED = 20;

export const useOddsData = (initialSport = 'all') => {
  const [liveEvents, setLiveEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [finishedEvents, setFinishedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSport, setSelectedSport] = useState(initialSport);

  const fetchAllEvents = useCallback(async () => {
    try {
      setLoading(true);

      const [liveRes, scheduledRes, finishedRes] = await Promise.all([
        api.get('/ai-matches/live').catch(() => ({ data: { data: [] } })),
        api.get('/ai-matches/scheduled').catch(() => ({ data: { data: [] } })),
        api.get('/ai-matches/finished').catch(() => ({ data: { data: [] } })),
      ]);

      let live = liveRes.data.data || [];
      let scheduled = scheduledRes.data.data || [];
      let finished = finishedRes.data.data || [];

      // Filter by sport if not 'all'
      if (selectedSport && selectedSport !== 'all') {
        const sportKey = selectedSport === 'football' ? 'soccer' : selectedSport;
        live = live.filter((m) => m.sport === sportKey);
        scheduled = scheduled.filter((m) => m.sport === sportKey);
        finished = finished.filter((m) => m.sport === sportKey);
      }

      setLiveEvents(live.slice(0, MAX_LIVE));
      setUpcomingEvents(scheduled.slice(0, MAX_UPCOMING));
      setFinishedEvents(finished.slice(0, MAX_FINISHED));
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [selectedSport]);

  const changeSport = (sport) => {
    setSelectedSport(sport);
  };

  const refreshAll = () => {
    fetchAllEvents();
  };

  useEffect(() => {
    fetchAllEvents();
    const interval = setInterval(fetchAllEvents, 30000);
    return () => clearInterval(interval);
  }, [fetchAllEvents]);

  return {
    liveEvents,
    upcomingEvents,
    finishedEvents,
    loading,
    error,
    selectedSport,
    changeSport,
    refreshAll,
  };
};