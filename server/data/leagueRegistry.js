// server/data/leagueRegistry.js
// Real leagues with real team names, grouped by sport.
// Used by aiMatchService to generate realistic fixtures.

const LEAGUES = {
    soccer: [
      {
        id: 'epl', name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', priority: 1,
        teams: ['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Chelsea','Crystal Palace','Everton','Fulham','Ipswich','Leicester','Liverpool','Man City','Man United','Newcastle','Nottingham Forest','Southampton','Tottenham','West Ham','Wolves'],
      },
      {
        id: 'laliga', name: 'La Liga', country: 'Spain', flag: '🇪🇸', priority: 1,
        teams: ['Real Madrid','Barcelona','Atletico Madrid','Athletic Club','Real Sociedad','Villarreal','Real Betis','Girona','Sevilla','Valencia','Osasuna','Celta Vigo','Rayo Vallecano','Mallorca','Getafe','Alaves','Las Palmas','Espanyol','Leganes','Valladolid'],
      },
      {
        id: 'seriea', name: 'Serie A', country: 'Italy', flag: '🇮🇹', priority: 1,
        teams: ['Inter','AC Milan','Juventus','Napoli','Atalanta','Roma','Lazio','Fiorentina','Bologna','Torino','Udinese','Genoa','Empoli','Verona','Cagliari','Parma','Como','Lecce','Monza','Venezia'],
      },
      {
        id: 'bundesliga', name: 'Bundesliga', country: 'Germany', flag: '🇩🇪', priority: 1,
        teams: ['Bayern Munich','Bayer Leverkusen','RB Leipzig','Borussia Dortmund','Eintracht Frankfurt','Stuttgart','Freiburg','Hoffenheim','Wolfsburg','Werder Bremen','Mainz','Augsburg','Union Berlin','Bochum','Heidenheim','St Pauli','Holstein Kiel','Borussia Monchengladbach'],
      },
      {
        id: 'ligue1', name: 'Ligue 1', country: 'France', flag: '🇫🇷', priority: 2,
        teams: ['PSG','Marseille','Monaco','Lille','Lyon','Nice','Lens','Rennes','Reims','Toulouse','Nantes','Strasbourg','Brest','Le Havre','Auxerre','Angers','Saint-Etienne','Montpellier'],
      },
      {
        id: 'ucl', name: 'UEFA Champions League', country: 'Europe', flag: '🇪🇺', priority: 1,
        teams: ['Real Madrid','Man City','Bayern Munich','PSG','Barcelona','Liverpool','Inter','Arsenal','Atletico Madrid','Borussia Dortmund','Juventus','AC Milan','Benfica','Porto','Ajax','PSV'],
      },
      {
        id: 'uel', name: 'UEFA Europa League', country: 'Europe', flag: '🇪🇺', priority: 2,
        teams: ['Man United','Tottenham','Roma','Lazio','Real Sociedad','Nice','Fenerbahce','Galatasaray','Rangers','Celtic','Anderlecht','Braga','PAOK','Twente','Midtjylland','Hoffenheim'],
      },
      {
        id: 'eredivisie', name: 'Eredivisie', country: 'Netherlands', flag: '🇳🇱', priority: 3,
        teams: ['Ajax','PSV','Feyenoord','AZ Alkmaar','Twente','Utrecht','Sparta Rotterdam','Go Ahead Eagles','NEC','Heerenveen','Fortuna Sittard','Groningen','Heracles','PEC Zwolle','Willem II','RKC Waalwijk','Almere City','NAC Breda'],
      },
      {
        id: 'primeira', name: 'Primeira Liga', country: 'Portugal', flag: '🇵🇹', priority: 3,
        teams: ['Benfica','Porto','Sporting CP','Braga','Vitoria Guimaraes','Famalicao','Moreirense','Santa Clara','Estoril','Rio Ave','Arouca','Gil Vicente','Casa Pia','Boavista','Estrela Amadora','Nacional','Farense','AVS'],
      },
      {
        id: 'championship', name: 'EFL Championship', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', priority: 3,
        teams: ['Leeds','Burnley','Sheffield United','Sunderland','Middlesbrough','West Brom','Norwich','Watford','Coventry','Blackburn','Millwall','Bristol City','Swansea','Cardiff','Preston','Hull','Stoke','QPR','Plymouth','Derby','Portsmouth','Oxford','Luton'],
      },
      {
        id: 'mls', name: 'MLS', country: 'USA', flag: '🇺🇸', priority: 3,
        teams: ['Inter Miami','LAFC','LA Galaxy','Seattle Sounders','Atlanta United','NY Red Bulls','NYCFC','Philadelphia Union','Columbus Crew','FC Cincinnati','Austin FC','Portland Timbers','Nashville SC','Charlotte FC','Orlando City','Chicago Fire'],
      },
      {
        id: 'brasileirao', name: 'Brasileirão Série A', country: 'Brazil', flag: '🇧🇷', priority: 3,
        teams: ['Flamengo','Palmeiras','Corinthians','São Paulo','Fluminense','Botafogo','Vasco da Gama','Grêmio','Internacional','Atlético Mineiro','Cruzeiro','Bahia','Fortaleza','Athletico Paranaense','Bragantino','Cuiabá'],
      },
    ],
    basketball: [
      {
        id: 'nba', name: 'NBA', country: 'USA', flag: '🇺🇸', priority: 1,
        teams: ['Lakers','Celtics','Warriors','Bucks','Nuggets','Suns','Heat','76ers','Knicks','Nets','Mavericks','Timberwolves','Thunder','Cavaliers','Pacers','Magic','Kings','Clippers','Pelicans','Grizzlies'],
      },
      {
        id: 'euroleague', name: 'EuroLeague', country: 'Europe', flag: '🇪🇺', priority: 2,
        teams: ['Real Madrid','Barcelona','Olympiacos','Panathinaikos','Fenerbahce','Anadolu Efes','Monaco','Baskonia','Maccabi Tel Aviv','Žalgiris','Bayern Munich','Virtus Bologna','Partizan','Crvena Zvezda','ASVEL','Alba Berlin','Paris Basketball','Olimpia Milano'],
      },
      {
        id: 'ncaab', name: 'NCAA Basketball', country: 'USA', flag: '🇺🇸', priority: 3,
        teams: ['Duke','Kentucky','Kansas','North Carolina','UCLA','Gonzaga','Michigan State','Villanova','Arizona','Purdue','Houston','Baylor','Alabama','Tennessee','Marquette','UConn'],
      },
    ],
    'american-football': [
      {
        id: 'nfl', name: 'NFL', country: 'USA', flag: '🇺🇸', priority: 1,
        teams: ['Chiefs','49ers','Bills','Eagles','Cowboys','Ravens','Bengals','Lions','Dolphins','Jets','Packers','Vikings','Chargers','Broncos','Steelers','Browns','Jaguars','Texans','Colts','Titans'],
      },
    ],
    baseball: [
      {
        id: 'mlb', name: 'MLB', country: 'USA', flag: '🇺🇸', priority: 2,
        teams: ['Yankees','Dodgers','Red Sox','Astros','Braves','Mets','Phillies','Padres','Cubs','Cardinals','Giants','Rangers','Mariners','Rays','Blue Jays','Orioles','Guardians','Twins','Angels','Athletics'],
      },
    ],
    'ice-hockey': [
      {
        id: 'nhl', name: 'NHL', country: 'USA/Canada', flag: '🇺🇸', priority: 2,
        teams: ['Maple Leafs','Canadiens','Bruins','Avalanche','Oilers','Rangers','Penguins','Capitals','Lightning','Panthers','Stars','Golden Knights','Kings','Sharks','Blackhawks','Red Wings','Flyers','Islanders','Devils','Sabres'],
      },
    ],
    tennis: [
      {
        id: 'atp', name: 'ATP Tour', country: 'International', flag: '🎾', priority: 2,
        teams: ['Djokovic','Alcaraz','Sinner','Medvedev','Zverev','Rune','Tsitsipas','Ruud','Fritz','De Minaur','Rublev','Hurkacz','Paul','Dimitrov','Shelton','Tiafoe'],
      },
      {
        id: 'wta', name: 'WTA Tour', country: 'International', flag: '🎾', priority: 3,
        teams: ['Swiatek','Sabalenka','Gauff','Rybakina','Pegula','Zheng','Vondrousova','Jabeur','Krejcikova','Kvitova','Badosa','Keys','Ostapenko','Kasatkina','Samsonova','Haddad Maia'],
      },
    ],
    cricket: [
      {
        id: 'ipl', name: 'Indian Premier League', country: 'India', flag: '🇮🇳', priority: 2,
        teams: ['Mumbai Indians','Chennai Super Kings','Royal Challengers Bangalore','Kolkata Knight Riders','Delhi Capitals','Rajasthan Royals','Sunrisers Hyderabad','Punjab Kings','Gujarat Titans','Lucknow Super Giants'],
      },
      {
        id: 'bbl', name: 'Big Bash League', country: 'Australia', flag: '🇦🇺', priority: 3,
        teams: ['Sydney Sixers','Sydney Thunder','Melbourne Stars','Melbourne Renegades','Perth Scorchers','Adelaide Strikers','Brisbane Heat','Hobart Hurricanes'],
      },
    ],
    mma: [
      {
        id: 'ufc', name: 'UFC', country: 'International', flag: '🥊', priority: 2,
        teams: ['Jones','Makhachev','Pereira','Volkanovski','Adesanya','Du Plessis','Topuria','O\'Malley','Edwards','Aspinall','Gane','Blaydes','Poirier','Gaethje','Oliveira','Tsarukyan'],
      },
    ],
  };
  
  // Per-sport match duration in minutes (for live tick simulation)
  const SPORT_DURATIONS = {
    soccer: { regular: 90, halftime: 45, periods: ['FIRST_HALF','HALFTIME','SECOND_HALF'] },
    basketball: { regular: 48, halftime: 24, periods: ['Q1','Q2','HALFTIME','Q3','Q4'] },
    'american-football': { regular: 60, halftime: 30, periods: ['Q1','Q2','HALFTIME','Q3','Q4'] },
    baseball: { regular: 180, halftime: 90, periods: ['INNINGS'] },
    'ice-hockey': { regular: 60, halftime: 20, periods: ['P1','P2','P3'] },
    tennis: { regular: 120, halftime: 60, periods: ['SET1','SET2','SET3'] },
    cricket: { regular: 180, halftime: 90, periods: ['INNINGS1','INNINGS2'] },
    mma: { regular: 25, halftime: 12, periods: ['ROUND1','ROUND2','ROUND3'] },
  };
  
  // Per-sport average goals/points per match (used for realistic score generation)
  const SPORT_SCORE_WEIGHTS = {
    soccer: { homeGoalRate: 0.35, awayGoalRate: 0.28, maxScore: 6 },
    basketball: { homeGoalRate: 2.3, awayGoalRate: 2.1, maxScore: 130 },
    'american-football': { homeGoalRate: 1.5, awayGoalRate: 1.3, maxScore: 45 },
    baseball: { homeGoalRate: 0.4, awayGoalRate: 0.35, maxScore: 12 },
    'ice-hockey': { homeGoalRate: 0.5, awayGoalRate: 0.45, maxScore: 8 },
    tennis: { homeGoalRate: 0.15, awayGoalRate: 0.13, maxScore: 3 },
    cricket: { homeGoalRate: 0.5, awayGoalRate: 0.45, maxScore: 250 },
    mma: { homeGoalRate: 0.05, awayGoalRate: 0.05, maxScore: 1 },
  };
  
  // Helpers
  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  
  function pickDistinct(arr, n) {
    const copy = [...arr];
    const out = [];
    for (let i = 0; i < n && copy.length; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }
  
  function abbreviation(name) {
    if (!name) return 'TBA';
    const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const words = cleaned.split(/\s+/);
    if (words.length === 1) return cleaned.substring(0, 3).toUpperCase();
    return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  }
  
  module.exports = {
    LEAGUES,
    SPORT_DURATIONS,
    SPORT_SCORE_WEIGHTS,
    pickRandom,
    pickDistinct,
    abbreviation,
  };