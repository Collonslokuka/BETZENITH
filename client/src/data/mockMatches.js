// Minimal mock data so the build resolves. Replace with real mock logic if needed.

export const generateMockMatches = () => [
    {
      id: 'mock-1',
      sport: 'soccer',
      league: 'Premier League',
      homeTeam: { name: 'Arsenal', abbreviation: 'ARS' },
      awayTeam: { name: 'Chelsea', abbreviation: 'CHE' },
      status: 'scheduled',
      startTime: new Date(Date.now() + 3600_000).toISOString(),
      odds: { home: 2.1, draw: 3.3, away: 3.4 },
    },
  ];
  
  export const generateMockLiveMatches = () => [
    {
      id: 'mock-live-1',
      sport: 'soccer',
      league: 'La Liga',
      homeTeam: { name: 'Real Madrid', abbreviation: 'RMA' },
      awayTeam: { name: 'Barcelona', abbreviation: 'BAR' },
      status: 'live',
      minute: 34,
      score: { home: 1, away: 0 },
      odds: { home: 1.8, draw: 3.5, away: 4.2 },
    },
  ];
  
  export const generateMockUpcomingMatches = (days = 7) => {
    const now = Date.now();
    return Array.from({ length: 5 }, (_, i) => ({
      id: `mock-upcoming-${i}`,
      sport: 'soccer',
      league: 'Serie A',
      homeTeam: { name: `Home ${i}`, abbreviation: `H${i}` },
      awayTeam: { name: `Away ${i}`, abbreviation: `A${i}` },
      status: 'scheduled',
      startTime: new Date(now + (i + 1) * 86400_000).toISOString(),
      odds: { home: 1.9, draw: 3.2, away: 3.8 },
    }));
  };