// server/data/enhancedMatches.js
const mongoose = require('mongoose');

// ============ COMPLETE LEAGUE DATA WITH ALL SPORTS ============
const LEAGUES = {
  // ========== SOCCER LEAGUES ==========
  'Premier League': {
    country: 'England',
    sport: 'soccer',
    icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    matchDuration: 90,
    timezone: 'Europe/London',
    typicalTimes: ['12:30', '15:00', '17:30', '19:45'],
  },
  'La Liga': {
    country: 'Spain',
    sport: 'soccer',
    icon: '🇪🇸',
    matchDuration: 90,
    timezone: 'Europe/Madrid',
    typicalTimes: ['14:00', '16:15', '18:30', '21:00'],
  },
  'Bundesliga': {
    country: 'Germany',
    sport: 'soccer',
    icon: '🇩🇪',
    matchDuration: 90,
    timezone: 'Europe/Berlin',
    typicalTimes: ['15:30', '18:30', '20:30'],
  },
  'Serie A': {
    country: 'Italy',
    sport: 'soccer',
    icon: '🇮🇹',
    matchDuration: 90,
    timezone: 'Europe/Rome',
    typicalTimes: ['15:00', '18:00', '20:45'],
  },
  'Ligue 1': {
    country: 'France',
    sport: 'soccer',
    icon: '🇫🇷',
    matchDuration: 90,
    timezone: 'Europe/Paris',
    typicalTimes: ['17:00', '19:00', '21:00'],
  },
  'Champions League': {
    country: 'Europe',
    sport: 'soccer',
    icon: '🏆',
    matchDuration: 90,
    timezone: 'Europe/Paris',
    typicalTimes: ['18:45', '21:00'],
  },
  'Europa League': {
    country: 'Europe',
    sport: 'soccer',
    icon: '🏆',
    matchDuration: 90,
    timezone: 'Europe/Paris',
    typicalTimes: ['18:45', '21:00'],
  },
  'World Cup': {
    country: 'International',
    sport: 'soccer',
    icon: '🌍',
    matchDuration: 90,
    timezone: 'UTC',
    typicalTimes: ['11:00', '14:00', '17:00', '20:00'],
  },
  'MLS': {
    country: 'USA',
    sport: 'soccer',
    icon: '🇺🇸',
    matchDuration: 90,
    timezone: 'America/New_York',
    typicalTimes: ['19:30', '20:00', '22:00'],
  },
  'Brazil Serie A': {
    country: 'Brazil',
    sport: 'soccer',
    icon: '🇧🇷',
    matchDuration: 90,
    timezone: 'America/Sao_Paulo',
    typicalTimes: ['16:00', '18:30', '21:00'],
  },
  'Eredivisie': {
    country: 'Netherlands',
    sport: 'soccer',
    icon: '🇳🇱',
    matchDuration: 90,
    timezone: 'Europe/Amsterdam',
    typicalTimes: ['18:45', '20:00', '21:00'],
  },
  'Primeira Liga': {
    country: 'Portugal',
    sport: 'soccer',
    icon: '🇵🇹',
    matchDuration: 90,
    timezone: 'Europe/Lisbon',
    typicalTimes: ['16:30', '19:00', '21:15'],
  },
  'Turkish Super Lig': {
    country: 'Turkey',
    sport: 'soccer',
    icon: '🇹🇷',
    matchDuration: 90,
    timezone: 'Europe/Istanbul',
    typicalTimes: ['17:00', '19:00', '20:30'],
  },

  // ========== BASKETBALL LEAGUES ==========
  'NBA': {
    country: 'USA',
    sport: 'basketball',
    icon: '🏀',
    matchDuration: 48,
    timezone: 'America/New_York',
    typicalTimes: ['19:30', '20:00', '22:30'],
  },
  'EuroLeague': {
    country: 'Europe',
    sport: 'basketball',
    icon: '🏀',
    matchDuration: 40,
    timezone: 'Europe/Paris',
    typicalTimes: ['18:30', '20:00', '21:05'],
  },
  'WNBA': {
    country: 'USA',
    sport: 'basketball',
    icon: '🏀',
    matchDuration: 40,
    timezone: 'America/New_York',
    typicalTimes: ['19:00', '20:00'],
  },
  'NCAA Basketball': {
    country: 'USA',
    sport: 'basketball',
    icon: '🏀',
    matchDuration: 40,
    timezone: 'America/New_York',
    typicalTimes: ['19:00', '21:00'],
  },
  'ACB': {
    country: 'Spain',
    sport: 'basketball',
    icon: '🏀',
    matchDuration: 40,
    timezone: 'Europe/Madrid',
    typicalTimes: ['18:00', '20:00'],
  },

  // ========== AMERICAN FOOTBALL ==========
  'NFL': {
    country: 'USA',
    sport: 'football',
    icon: '🏈',
    matchDuration: 60,
    timezone: 'America/New_York',
    typicalTimes: ['13:00', '16:25', '20:20'],
  },
  'NCAAF': {
    country: 'USA',
    sport: 'football',
    icon: '🏈',
    matchDuration: 60,
    timezone: 'America/New_York',
    typicalTimes: ['12:00', '15:30', '19:00'],
  },
  'Super Bowl': {
    country: 'USA',
    sport: 'football',
    icon: '🏆',
    matchDuration: 60,
    timezone: 'America/New_York',
    typicalTimes: ['18:30'],
  },

  // ========== TENNIS ==========
  'Wimbledon': {
    country: 'UK',
    sport: 'tennis',
    icon: '🎾',
    matchDuration: 5,
    timezone: 'Europe/London',
    typicalTimes: ['11:00', '13:30', '16:00'],
  },
  'US Open': {
    country: 'USA',
    sport: 'tennis',
    icon: '🎾',
    matchDuration: 5,
    timezone: 'America/New_York',
    typicalTimes: ['11:00', '19:00'],
  },
  'French Open': {
    country: 'France',
    sport: 'tennis',
    icon: '🎾',
    matchDuration: 5,
    timezone: 'Europe/Paris',
    typicalTimes: ['11:00', '14:00'],
  },
  'Australian Open': {
    country: 'Australia',
    sport: 'tennis',
    icon: '🎾',
    matchDuration: 5,
    timezone: 'Australia/Melbourne',
    typicalTimes: ['11:00', '19:30'],
  },

  // ========== BASEBALL ==========
  'MLB': {
    country: 'USA',
    sport: 'baseball',
    icon: '⚾',
    matchDuration: 9,
    timezone: 'America/New_York',
    typicalTimes: ['13:10', '19:10', '20:05'],
  },
  'MLB Preseason': {
    country: 'USA',
    sport: 'baseball',
    icon: '⚾',
    matchDuration: 9,
    timezone: 'America/New_York',
    typicalTimes: ['13:05', '19:05'],
  },
  'NPB': {
    country: 'Japan',
    sport: 'baseball',
    icon: '⚾',
    matchDuration: 9,
    timezone: 'Asia/Tokyo',
    typicalTimes: ['12:00', '18:00'],
  },
  'KBO': {
    country: 'Korea',
    sport: 'baseball',
    icon: '⚾',
    matchDuration: 9,
    timezone: 'Asia/Seoul',
    typicalTimes: ['14:00', '18:30'],
  },

  // ========== HOCKEY ==========
  'NHL': {
    country: 'USA/Canada',
    sport: 'hockey',
    icon: '🏒',
    matchDuration: 60,
    timezone: 'America/New_York',
    typicalTimes: ['19:00', '20:00', '22:00'],
  },
  'KHL': {
    country: 'Russia',
    sport: 'hockey',
    icon: '🏒',
    matchDuration: 60,
    timezone: 'Europe/Moscow',
    typicalTimes: ['17:00', '19:30'],
  },
  'SHL': {
    country: 'Sweden',
    sport: 'hockey',
    icon: '🏒',
    matchDuration: 60,
    timezone: 'Europe/Stockholm',
    typicalTimes: ['19:00', '20:00'],
  },

  // ========== MMA ==========
  'UFC': {
    country: 'USA',
    sport: 'mma',
    icon: '🥊',
    matchDuration: 5,
    timezone: 'America/Las_Vegas',
    typicalTimes: ['19:00', '22:00'],
  },
  'Bellator': {
    country: 'USA',
    sport: 'mma',
    icon: '🥊',
    matchDuration: 5,
    timezone: 'America/New_York',
    typicalTimes: ['20:00'],
  },
  'ONE Championship': {
    country: 'Singapore',
    sport: 'mma',
    icon: '🥊',
    matchDuration: 5,
    timezone: 'Asia/Singapore',
    typicalTimes: ['20:00'],
  },

  // ========== BOXING ==========
  'Heavyweight Boxing': {
    country: 'Global',
    sport: 'boxing',
    icon: '🥊',
    matchDuration: 12,
    timezone: 'UTC',
    typicalTimes: ['22:00', '23:00'],
  },
  'Lightweight Boxing': {
    country: 'Global',
    sport: 'boxing',
    icon: '🥊',
    matchDuration: 12,
    timezone: 'UTC',
    typicalTimes: ['21:00', '22:00'],
  },

  // ========== GOLF ==========
  'PGA Tour': {
    country: 'USA',
    sport: 'golf',
    icon: '⛳',
    matchDuration: 4,
    timezone: 'America/New_York',
    typicalTimes: ['08:00', '13:00'],
  },
  'The Masters': {
    country: 'USA',
    sport: 'golf',
    icon: '⛳',
    matchDuration: 4,
    timezone: 'America/New_York',
    typicalTimes: ['10:00', '15:00'],
  },

  // ========== CRICKET ==========
  'IPL': {
    country: 'India',
    sport: 'cricket',
    icon: '🏏',
    matchDuration: 20,
    timezone: 'Asia/Kolkata',
    typicalTimes: ['15:30', '19:30'],
  },
  'The Ashes': {
    country: 'England/Australia',
    sport: 'cricket',
    icon: '🏏',
    matchDuration: 5,
    timezone: 'UTC',
    typicalTimes: ['11:00'],
  },
  'Big Bash': {
    country: 'Australia',
    sport: 'cricket',
    icon: '🏏',
    matchDuration: 20,
    timezone: 'Australia/Sydney',
    typicalTimes: ['19:15'],
  },

  // ========== RUGBY ==========
  'Six Nations': {
    country: 'Europe',
    sport: 'rugby',
    icon: '🏉',
    matchDuration: 80,
    timezone: 'Europe/London',
    typicalTimes: ['14:15', '16:45'],
  },
  'Rugby World Cup': {
    country: 'International',
    sport: 'rugby',
    icon: '🏆',
    matchDuration: 80,
    timezone: 'UTC',
    typicalTimes: ['09:00', '11:00', '13:00', '15:00'],
  },

  // ========== FORMULA 1 ==========
  'Formula 1': {
    country: 'Global',
    sport: 'f1',
    icon: '🏎️',
    matchDuration: 58,
    timezone: 'UTC',
    typicalTimes: ['14:00', '15:00'],
  },

  // ========== ESPORTS ==========
  'League of Legends World Championship': {
    country: 'International',
    sport: 'esports',
    icon: '🎮',
    matchDuration: 5,
    timezone: 'UTC',
    typicalTimes: ['12:00', '15:00', '18:00', '21:00'],
  },
  'Dota 2 International': {
    country: 'International',
    sport: 'esports',
    icon: '🎮',
    matchDuration: 5,
    timezone: 'UTC',
    typicalTimes: ['11:00', '14:00', '17:00', '20:00'],
  },
  'CS:GO Major': {
    country: 'International',
    sport: 'esports',
    icon: '🎮',
    matchDuration: 5,
    timezone: 'UTC',
    typicalTimes: ['13:00', '16:00', '19:00', '22:00'],
  },
};

// ============ LEAGUE-SPECIFIC TEAMS ============
const LEAGUE_TEAMS = {
  'Premier League': [
    { name: 'Arsenal', abbr: 'ARS' },
    { name: 'Aston Villa', abbr: 'AVL' },
    { name: 'Bournemouth', abbr: 'BOU' },
    { name: 'Brentford', abbr: 'BRE' },
    { name: 'Brighton', abbr: 'BHA' },
    { name: 'Burnley', abbr: 'BUR' },
    { name: 'Chelsea', abbr: 'CHE' },
    { name: 'Crystal Palace', abbr: 'CRY' },
    { name: 'Everton', abbr: 'EVE' },
    { name: 'Fulham', abbr: 'FUL' },
    { name: 'Liverpool', abbr: 'LIV' },
    { name: 'Luton Town', abbr: 'LUT' },
    { name: 'Manchester City', abbr: 'MCI' },
    { name: 'Manchester United', abbr: 'MUN' },
    { name: 'Newcastle United', abbr: 'NEW' },
    { name: 'Nottingham Forest', abbr: 'NFO' },
    { name: 'Sheffield United', abbr: 'SHU' },
    { name: 'Tottenham Hotspur', abbr: 'TOT' },
    { name: 'West Ham United', abbr: 'WHU' },
    { name: 'Wolverhampton Wanderers', abbr: 'WOL' },
  ],
  'La Liga': [
    { name: 'Alaves', abbr: 'ALA' },
    { name: 'Almeria', abbr: 'ALM' },
    { name: 'Athletic Bilbao', abbr: 'ATH' },
    { name: 'Atletico Madrid', abbr: 'ATM' },
    { name: 'Barcelona', abbr: 'BAR' },
    { name: 'Cadiz', abbr: 'CAD' },
    { name: 'Celta Vigo', abbr: 'CEL' },
    { name: 'Getafe', abbr: 'GET' },
    { name: 'Girona', abbr: 'GIR' },
    { name: 'Granada', abbr: 'GRA' },
    { name: 'Las Palmas', abbr: 'LPA' },
    { name: 'Mallorca', abbr: 'MLL' },
    { name: 'Osasuna', abbr: 'OSA' },
    { name: 'Rayo Vallecano', abbr: 'RAY' },
    { name: 'Real Betis', abbr: 'BET' },
    { name: 'Real Madrid', abbr: 'RMA' },
    { name: 'Real Sociedad', abbr: 'RSO' },
    { name: 'Sevilla', abbr: 'SEV' },
    { name: 'Valencia', abbr: 'VAL' },
    { name: 'Villarreal', abbr: 'VIL' },
  ],
  'Bundesliga': [
    { name: 'FC Augsburg', abbr: 'AUG' },
    { name: 'Bayer Leverkusen', abbr: 'LEV' },
    { name: 'Bayern Munich', abbr: 'BAY' },
    { name: 'VfL Bochum', abbr: 'BOC' },
    { name: 'Borussia Dortmund', abbr: 'DOR' },
    { name: 'Borussia Monchengladbach', abbr: 'BMG' },
    { name: 'Darmstadt 98', abbr: 'DAR' },
    { name: 'Eintracht Frankfurt', abbr: 'SGE' },
    { name: 'SC Freiburg', abbr: 'FRE' },
    { name: 'FC Heidenheim', abbr: 'HEI' },
    { name: 'TSG Hoffenheim', abbr: 'HOF' },
    { name: '1.FC Köln', abbr: 'KOL' },
    { name: 'RB Leipzig', abbr: 'RBL' },
    { name: 'Mainz 05', abbr: 'MAI' },
    { name: 'VfB Stuttgart', abbr: 'STU' },
    { name: 'Union Berlin', abbr: 'UNB' },
    { name: 'Werder Bremen', abbr: 'BRE' },
    { name: 'Wolfsburg', abbr: 'WOL' },
  ],
  'Serie A': [
    { name: 'Atalanta', abbr: 'ATA' },
    { name: 'Bologna', abbr: 'BOL' },
    { name: 'Cagliari', abbr: 'CAG' },
    { name: 'Como', abbr: 'COM' },
    { name: 'Empoli', abbr: 'EMP' },
    { name: 'Fiorentina', abbr: 'FIO' },
    { name: 'Genoa', abbr: 'GEN' },
    { name: 'Inter Milan', abbr: 'INT' },
    { name: 'Juventus', abbr: 'JUV' },
    { name: 'Lazio', abbr: 'LAZ' },
    { name: 'Lecce', abbr: 'LEC' },
    { name: 'AC Milan', abbr: 'MIL' },
    { name: 'Monza', abbr: 'MNZ' },
    { name: 'Napoli', abbr: 'NAP' },
    { name: 'Parma', abbr: 'PAR' },
    { name: 'Roma', abbr: 'ROM' },
    { name: 'Salernitana', abbr: 'SAL' },
    { name: 'Sassuolo', abbr: 'SAS' },
    { name: 'Torino', abbr: 'TOR' },
    { name: 'Udinese', abbr: 'UDI' },
  ],
  'Ligue 1': [
    { name: 'Angers', abbr: 'ANG' },
    { name: 'Auxerre', abbr: 'AUX' },
    { name: 'Brest', abbr: 'BRE' },
    { name: 'Le Havre', abbr: 'HAC' },
    { name: 'Lens', abbr: 'LEN' },
    { name: 'Lille', abbr: 'LIL' },
    { name: 'Lorient', abbr: 'LOR' },
    { name: 'Lyon', abbr: 'LYO' },
    { name: 'Marseille', abbr: 'MAR' },
    { name: 'Metz', abbr: 'MET' },
    { name: 'Monaco', abbr: 'MON' },
    { name: 'Montpellier', abbr: 'MPL' },
    { name: 'Nantes', abbr: 'NAN' },
    { name: 'Nice', abbr: 'NIC' },
    { name: 'Paris Saint-Germain', abbr: 'PSG' },
    { name: 'Reims', abbr: 'REI' },
    { name: 'Rennes', abbr: 'REN' },
    { name: 'Strasbourg', abbr: 'STR' },
    { name: 'Toulouse', abbr: 'TLS' },
  ],
  'Champions League': [
    { name: 'Real Madrid', abbr: 'RMA' },
    { name: 'Manchester City', abbr: 'MCI' },
    { name: 'Bayern Munich', abbr: 'BAY' },
    { name: 'Paris Saint-Germain', abbr: 'PSG' },
    { name: 'Liverpool', abbr: 'LIV' },
    { name: 'Inter Milan', abbr: 'INT' },
    { name: 'Borussia Dortmund', abbr: 'DOR' },
    { name: 'Barcelona', abbr: 'BAR' },
    { name: 'Arsenal', abbr: 'ARS' },
    { name: 'Atletico Madrid', abbr: 'ATM' },
    { name: 'RB Leipzig', abbr: 'RBL' },
    { name: 'Porto', abbr: 'POR' },
    { name: 'Napoli', abbr: 'NAP' },
    { name: 'Benfica', abbr: 'BEN' },
    { name: 'Shakhtar Donetsk', abbr: 'SHA' },
    { name: 'AC Milan', abbr: 'MIL' },
    { name: 'Celtic', abbr: 'CEL' },
    { name: 'Galatasaray', abbr: 'GAL' },
    { name: 'Lazio', abbr: 'LAZ' },
    { name: 'PSV Eindhoven', abbr: 'PSV' },
  ],
  'Europa League': [
    { name: 'Roma', abbr: 'ROM' },
    { name: 'Bayer Leverkusen', abbr: 'LEV' },
    { name: 'Sporting CP', abbr: 'SPO' },
    { name: 'Marseille', abbr: 'MAR' },
    { name: 'West Ham United', abbr: 'WHU' },
    { name: 'Brighton', abbr: 'BHA' },
    { name: 'Rangers', abbr: 'RAN' },
    { name: 'Ajax', abbr: 'AJA' },
    { name: 'Real Betis', abbr: 'BET' },
    { name: 'Villarreal', abbr: 'VIL' },
  ],
  'NBA': [
    { name: 'Atlanta Hawks', abbr: 'ATL' },
    { name: 'Boston Celtics', abbr: 'BOS' },
    { name: 'Brooklyn Nets', abbr: 'BKN' },
    { name: 'Charlotte Hornets', abbr: 'CHA' },
    { name: 'Chicago Bulls', abbr: 'CHI' },
    { name: 'Cleveland Cavaliers', abbr: 'CLE' },
    { name: 'Dallas Mavericks', abbr: 'DAL' },
    { name: 'Denver Nuggets', abbr: 'DEN' },
    { name: 'Detroit Pistons', abbr: 'DET' },
    { name: 'Golden State Warriors', abbr: 'GSW' },
    { name: 'Houston Rockets', abbr: 'HOU' },
    { name: 'Indiana Pacers', abbr: 'IND' },
    { name: 'LA Clippers', abbr: 'LAC' },
    { name: 'Los Angeles Lakers', abbr: 'LAL' },
    { name: 'Memphis Grizzlies', abbr: 'MEM' },
    { name: 'Miami Heat', abbr: 'MIA' },
    { name: 'Milwaukee Bucks', abbr: 'MIL' },
    { name: 'Minnesota Timberwolves', abbr: 'MIN' },
    { name: 'New Orleans Pelicans', abbr: 'NOP' },
    { name: 'New York Knicks', abbr: 'NYK' },
    { name: 'Oklahoma City Thunder', abbr: 'OKC' },
    { name: 'Orlando Magic', abbr: 'ORL' },
    { name: 'Philadelphia 76ers', abbr: 'PHI' },
    { name: 'Phoenix Suns', abbr: 'PHX' },
    { name: 'Portland Trail Blazers', abbr: 'POR' },
    { name: 'Sacramento Kings', abbr: 'SAC' },
    { name: 'San Antonio Spurs', abbr: 'SAS' },
    { name: 'Toronto Raptors', abbr: 'TOR' },
    { name: 'Utah Jazz', abbr: 'UTA' },
    { name: 'Washington Wizards', abbr: 'WAS' },
  ],
  'EuroLeague': [
    { name: 'Real Madrid', abbr: 'RMA' },
    { name: 'Barcelona', abbr: 'BAR' },
    { name: 'Olympiacos', abbr: 'OLY' },
    { name: 'Fenerbahce', abbr: 'FEN' },
    { name: 'Panathinaikos', abbr: 'PAO' },
    { name: 'Maccabi Tel Aviv', abbr: 'MTA' },
    { name: 'Monaco', abbr: 'MON' },
    { name: 'ASVEL', abbr: 'ASV' },
    { name: 'Bayern Munich', abbr: 'BAY' },
    { name: 'Alba Berlin', abbr: 'BER' },
    { name: 'Virtus Bologna', abbr: 'VIR' },
    { name: 'Olimpia Milano', abbr: 'MIL' },
    { name: 'Zalgiris', abbr: 'ZAL' },
    { name: 'Partizan', abbr: 'PAR' },
    { name: 'Crvena Zvezda', abbr: 'CZV' },
    { name: 'Anadolu Efes', abbr: 'EFE' },
    { name: 'Valencia', abbr: 'VAL' },
    { name: 'Baskonia', abbr: 'BAS' },
  ],
  'WNBA': [
    { name: 'Las Vegas Aces', abbr: 'LVA' },
    { name: 'New York Liberty', abbr: 'NYL' },
    { name: 'Connecticut Sun', abbr: 'CON' },
    { name: 'Chicago Sky', abbr: 'CHI' },
    { name: 'Seattle Storm', abbr: 'SEA' },
    { name: 'Phoenix Mercury', abbr: 'PHX' },
    { name: 'Dallas Wings', abbr: 'DAL' },
    { name: 'Atlanta Dream', abbr: 'ATL' },
    { name: 'Washington Mystics', abbr: 'WAS' },
    { name: 'Los Angeles Sparks', abbr: 'LAS' },
    { name: 'Indiana Fever', abbr: 'IND' },
    { name: 'Minnesota Lynx', abbr: 'MIN' },
  ],
  'NFL': [
    { name: 'Arizona Cardinals', abbr: 'ARI' },
    { name: 'Atlanta Falcons', abbr: 'ATL' },
    { name: 'Baltimore Ravens', abbr: 'BAL' },
    { name: 'Buffalo Bills', abbr: 'BUF' },
    { name: 'Carolina Panthers', abbr: 'CAR' },
    { name: 'Chicago Bears', abbr: 'CHI' },
    { name: 'Cincinnati Bengals', abbr: 'CIN' },
    { name: 'Cleveland Browns', abbr: 'CLE' },
    { name: 'Dallas Cowboys', abbr: 'DAL' },
    { name: 'Denver Broncos', abbr: 'DEN' },
    { name: 'Detroit Lions', abbr: 'DET' },
    { name: 'Green Bay Packers', abbr: 'GB' },
    { name: 'Houston Texans', abbr: 'HOU' },
    { name: 'Indianapolis Colts', abbr: 'IND' },
    { name: 'Jacksonville Jaguars', abbr: 'JAX' },
    { name: 'Kansas City Chiefs', abbr: 'KC' },
    { name: 'Las Vegas Raiders', abbr: 'LV' },
    { name: 'Los Angeles Chargers', abbr: 'LAC' },
    { name: 'Los Angeles Rams', abbr: 'LAR' },
    { name: 'Miami Dolphins', abbr: 'MIA' },
    { name: 'Minnesota Vikings', abbr: 'MIN' },
    { name: 'New England Patriots', abbr: 'NE' },
    { name: 'New Orleans Saints', abbr: 'NO' },
    { name: 'New York Giants', abbr: 'NYG' },
    { name: 'New York Jets', abbr: 'NYJ' },
    { name: 'Philadelphia Eagles', abbr: 'PHI' },
    { name: 'Pittsburgh Steelers', abbr: 'PIT' },
    { name: 'San Francisco 49ers', abbr: 'SF' },
    { name: 'Seattle Seahawks', abbr: 'SEA' },
    { name: 'Tampa Bay Buccaneers', abbr: 'TB' },
    { name: 'Tennessee Titans', abbr: 'TEN' },
    { name: 'Washington Commanders', abbr: 'WAS' },
  ],
  'MLB': [
    { name: 'New York Yankees', abbr: 'NYY' },
    { name: 'Boston Red Sox', abbr: 'BOS' },
    { name: 'LA Dodgers', abbr: 'LAD' },
    { name: 'San Diego Padres', abbr: 'SD' },
    { name: 'Atlanta Braves', abbr: 'ATL' },
    { name: 'Philadelphia Phillies', abbr: 'PHI' },
    { name: 'Houston Astros', abbr: 'HOU' },
    { name: 'Texas Rangers', abbr: 'TEX' },
    { name: 'Chicago Cubs', abbr: 'CHC' },
    { name: 'St. Louis Cardinals', abbr: 'STL' },
    { name: 'New York Mets', abbr: 'NYM' },
    { name: 'San Francisco Giants', abbr: 'SF' },
    { name: 'Seattle Mariners', abbr: 'SEA' },
    { name: 'Toronto Blue Jays', abbr: 'TOR' },
    { name: 'Tampa Bay Rays', abbr: 'TB' },
    { name: 'Baltimore Orioles', abbr: 'BAL' },
    { name: 'Minnesota Twins', abbr: 'MIN' },
    { name: 'Cleveland Guardians', abbr: 'CLE' },
    { name: 'Chicago White Sox', abbr: 'CHW' },
    { name: 'Detroit Tigers', abbr: 'DET' },
  ],
  'NHL': [
    { name: 'Toronto Maple Leafs', abbr: 'TOR' },
    { name: 'Montreal Canadiens', abbr: 'MTL' },
    { name: 'Boston Bruins', abbr: 'BOS' },
    { name: 'New York Rangers', abbr: 'NYR' },
    { name: 'Pittsburgh Penguins', abbr: 'PIT' },
    { name: 'Chicago Blackhawks', abbr: 'CHI' },
    { name: 'Edmonton Oilers', abbr: 'EDM' },
    { name: 'Vancouver Canucks', abbr: 'VAN' },
    { name: 'Calgary Flames', abbr: 'CGY' },
    { name: 'Colorado Avalanche', abbr: 'COL' },
    { name: 'Vegas Golden Knights', abbr: 'VGK' },
    { name: 'Tampa Bay Lightning', abbr: 'TB' },
    { name: 'Florida Panthers', abbr: 'FLA' },
    { name: 'Carolina Hurricanes', abbr: 'CAR' },
    { name: 'Dallas Stars', abbr: 'DAL' },
    { name: 'Minnesota Wild', abbr: 'MIN' },
    { name: 'Winnipeg Jets', abbr: 'WPG' },
    { name: 'St. Louis Blues', abbr: 'STL' },
    { name: 'Nashville Predators', abbr: 'NSH' },
    { name: 'Los Angeles Kings', abbr: 'LAK' },
  ],
  'UFC': [
    { name: 'Jon Jones', abbr: 'JON' },
    { name: 'Stipe Miocic', abbr: 'STI' },
    { name: 'Islam Makhachev', abbr: 'MAK' },
    { name: 'Alexander Volkanovski', abbr: 'VOL' },
    { name: 'Sean O\'Malley', abbr: 'OMA' },
    { name: 'Aljamain Sterling', abbr: 'STE' },
    { name: 'Leon Edwards', abbr: 'EDW' },
    { name: 'Kamaru Usman', abbr: 'USM' },
    { name: 'Israel Adesanya', abbr: 'ADE' },
    { name: 'Alex Pereira', abbr: 'PER' },
    { name: 'Charles Oliveira', abbr: 'OLI' },
    { name: 'Justin Gaethje', abbr: 'GAE' },
    { name: 'Max Holloway', abbr: 'HOL' },
    { name: 'Ilia Topuria', abbr: 'TOP' },
    { name: 'Tom Aspinall', abbr: 'ASP' },
    { name: 'Jiri Prochazka', abbr: 'PRO' },
  ],
  'Heavyweight Boxing': [
    { name: 'Tyson Fury', abbr: 'FURY' },
    { name: 'Oleksandr Usyk', abbr: 'USYK' },
    { name: 'Anthony Joshua', abbr: 'AJ' },
    { name: 'Deontay Wilder', abbr: 'WIL' },
    { name: 'Andy Ruiz Jr', abbr: 'RUIZ' },
    { name: 'Joe Joyce', abbr: 'JOY' },
    { name: 'Joseph Parker', abbr: 'PAR' },
    { name: 'Dillian Whyte', abbr: 'WHY' },
    { name: 'Luis Ortiz', abbr: 'ORT' },
    { name: 'Michael Hunter', abbr: 'HUN' },
  ],
  'PGA Tour': [
    { name: 'Scottie Scheffler', abbr: 'SCH' },
    { name: 'Rory McIlroy', abbr: 'McI' },
    { name: 'Jon Rahm', abbr: 'RAH' },
    { name: 'Brooks Koepka', abbr: 'KOE' },
    { name: 'Cameron Smith', abbr: 'SMI' },
    { name: 'Patrick Cantlay', abbr: 'CAN' },
    { name: 'Xander Schauffele', abbr: 'XAN' },
    { name: 'Viktor Hovland', abbr: 'HOV' },
    { name: 'Max Homa', abbr: 'HOM' },
    { name: 'Jordan Spieth', abbr: 'SPI' },
    { name: 'Justin Thomas', abbr: 'THO' },
    { name: 'Collin Morikawa', abbr: 'MOR' },
  ],
  'IPL': [
    { name: 'Mumbai Indians', abbr: 'MI' },
    { name: 'Chennai Super Kings', abbr: 'CSK' },
    { name: 'Royal Challengers', abbr: 'RCB' },
    { name: 'Kolkata Knight Riders', abbr: 'KKR' },
    { name: 'Delhi Capitals', abbr: 'DC' },
    { name: 'Punjab Kings', abbr: 'PBKS' },
    { name: 'Rajasthan Royals', abbr: 'RR' },
    { name: 'Sunrisers Hyderabad', abbr: 'SRH' },
    { name: 'Lucknow Super Giants', abbr: 'LSG' },
    { name: 'Gujarat Titans', abbr: 'GT' },
  ],
  'The Ashes': [
    { name: 'Australia', abbr: 'AUS' },
    { name: 'England', abbr: 'ENG' },
  ],
  'Big Bash': [
    { name: 'Sydney Sixers', abbr: 'SYS' },
    { name: 'Perth Scorchers', abbr: 'PER' },
    { name: 'Brisbane Heat', abbr: 'BRI' },
    { name: 'Melbourne Stars', abbr: 'MLS' },
  ],
  'Six Nations': [
    { name: 'Ireland', abbr: 'IRE' },
    { name: 'France', abbr: 'FRA' },
    { name: 'England', abbr: 'ENG' },
    { name: 'Wales', abbr: 'WAL' },
    { name: 'Scotland', abbr: 'SCO' },
    { name: 'Italy', abbr: 'ITA' },
  ],
  'Formula 1': [
    { name: 'Max Verstappen', abbr: 'VER' },
    { name: 'Lewis Hamilton', abbr: 'HAM' },
    { name: 'Charles Leclerc', abbr: 'LEC' },
    { name: 'Lando Norris', abbr: 'NOR' },
    { name: 'Carlos Sainz', abbr: 'SAI' },
    { name: 'Sergio Perez', abbr: 'PER' },
    { name: 'George Russell', abbr: 'RUS' },
    { name: 'Oscar Piastri', abbr: 'PIA' },
    { name: 'Fernando Alonso', abbr: 'ALO' },
    { name: 'Lance Stroll', abbr: 'STR' },
  ],
  'League of Legends World Championship': [
    { name: 'T1', abbr: 'T1' },
    { name: 'Gen.G', abbr: 'GEN' },
    { name: 'JD Gaming', abbr: 'JDG' },
    { name: 'Bilibili Gaming', abbr: 'BLG' },
    { name: 'G2 Esports', abbr: 'G2' },
    { name: 'Fnatic', abbr: 'FNC' },
    { name: 'Team Liquid', abbr: 'TL' },
    { name: 'Cloud9', abbr: 'C9' },
  ],
  'Dota 2 International': [
    { name: 'Team Spirit', abbr: 'TS' },
    { name: 'Gaimin Gladiators', abbr: 'GG' },
    { name: 'LGD Gaming', abbr: 'LGD' },
    { name: 'Tundra Esports', abbr: 'TUN' },
    { name: 'OG', abbr: 'OG' },
    { name: 'Team Liquid', abbr: 'TL' },
    { name: 'BetBoom Team', abbr: 'BB' },
    { name: 'Evil Geniuses', abbr: 'EG' },
  ],
  'CS:GO Major': [
    { name: 'FaZe Clan', abbr: 'FAZE' },
    { name: 'NaVi', abbr: 'NAVI' },
    { name: 'Team Vitality', abbr: 'VIT' },
    { name: 'G2 Esports', abbr: 'G2' },
    { name: 'ENCE', abbr: 'ENCE' },
    { name: 'Heroic', abbr: 'HER' },
    { name: 'Cloud9', abbr: 'C9' },
    { name: 'Team Liquid', abbr: 'TL' },
  ],
};

// Helper functions
const randomItem = (array) => array[Math.floor(Math.random() * array.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate match date based on league and status
const generateMatchDate = (league, status) => {
  const now = new Date();
  const leagueInfo = LEAGUES[league];
  let matchDate = new Date(now);

  switch (status) {
    case 'LIVE':
    case 'FIRST_HALF':
    case 'HALFTIME':
    case 'SECOND_HALF':
      matchDate.setHours(now.getHours() - randomInt(0, 2));
      matchDate.setMinutes(randomInt(0, 59));
      break;

    case 'SCHEDULED':
      matchDate.setDate(now.getDate() + randomInt(1, 7));
      if (leagueInfo && leagueInfo.typicalTimes) {
        const typicalTime = randomItem(leagueInfo.typicalTimes);
        const [hours, minutes] = typicalTime.split(':');
        matchDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        matchDate.setHours(randomInt(12, 22), randomInt(0, 59), 0, 0);
      }
      break;

    case 'FINISHED':
      matchDate.setDate(now.getDate() - randomInt(1, 3));
      if (leagueInfo && leagueInfo.typicalTimes) {
        const typicalTime = randomItem(leagueInfo.typicalTimes);
        const [hours, minutes] = typicalTime.split(':');
        matchDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        matchDate.setHours(randomInt(12, 22), randomInt(0, 59), 0, 0);
      }
      break;
  }

  return matchDate;
};

const generateScore = (sport, winner = null) => {
  if (sport === 'soccer') {
    if (winner === 'HOME') return { home: randomInt(1, 4), away: randomInt(0, 2) };
    if (winner === 'AWAY') return { home: randomInt(0, 2), away: randomInt(1, 4) };
    return { home: randomInt(0, 3), away: randomInt(0, 3) };
  }
  if (sport === 'basketball') return { home: randomInt(85, 115), away: randomInt(85, 115) };
  if (sport === 'football') return { home: randomInt(7, 35), away: randomInt(7, 35) };
  if (sport === 'baseball') return { home: randomInt(1, 8), away: randomInt(1, 8) };
  if (sport === 'hockey') return { home: randomInt(1, 5), away: randomInt(1, 5) };
  if (sport === 'tennis') return { home: randomInt(0, 3), away: randomInt(0, 3) };
  return { home: randomInt(0, 2), away: randomInt(0, 2) };
};

const calculateWinner = (sport) => {
  const rand = Math.random();
  if (sport === 'soccer') {
    if (rand < 0.45) return 'HOME';
    if (rand < 0.75) return 'AWAY';
    return 'DRAW';
  }
  if (rand < 0.55) return 'HOME';
  if (rand < 0.9) return 'AWAY';
  return 'DRAW';
};

const generateOdds = (sport) => {
  if (sport === 'soccer') {
    return {
      home: parseFloat((1.5 + Math.random() * 3).toFixed(2)),
      draw: parseFloat((2.8 + Math.random() * 1.5).toFixed(2)),
      away: parseFloat((1.5 + Math.random() * 3).toFixed(2)),
    };
  }
  return {
    home: parseFloat((1.2 + Math.random() * 2.5).toFixed(2)),
    draw: null,
    away: parseFloat((1.2 + Math.random() * 2.5).toFixed(2)),
  };
};

const generateMarkets = (sport, odds) => {
  const markets = [
    { name: '1', odds: odds.home, isActive: true, minBet: 10, maxBet: 1000000, volume: 0, betsCount: 0 },
    ...(odds.draw ? [{ name: 'X', odds: odds.draw, isActive: true, minBet: 10, maxBet: 1000000, volume: 0, betsCount: 0 }] : []),
    { name: '2', odds: odds.away, isActive: true, minBet: 10, maxBet: 1000000, volume: 0, betsCount: 0 },
  ];

  if (sport === 'soccer') {
    markets.push(
      { name: 'Over 2.5', odds: 1.95, isActive: true, minBet: 10, maxBet: 1000000, volume: 0, betsCount: 0 },
      { name: 'Under 2.5', odds: 1.95, isActive: true, minBet: 10, maxBet: 1000000, volume: 0, betsCount: 0 },
      { name: 'BTTS', odds: 1.90, isActive: true, minBet: 10, maxBet: 1000000, volume: 0, betsCount: 0 }
    );
  } else if (sport === 'basketball') {
    markets.push(
      { name: 'Over 220.5', odds: 1.90, isActive: true, minBet: 10, maxBet: 1000000, volume: 0, betsCount: 0 },
      { name: 'Under 220.5', odds: 1.90, isActive: true, minBet: 10, maxBet: 1000000, volume: 0, betsCount: 0 }
    );
  }

  return markets;
};

// Generate all matches (live + scheduled + finished)
const generateAllMatches = () => {
  const allMatches = [];
  let matchCounter = 0;

  Object.keys(LEAGUES).forEach((leagueName) => {
    const league = LEAGUES[leagueName];
    const leagueTeams = LEAGUE_TEAMS[leagueName] || [];

    if (leagueTeams.length < 2) return;

    const numMatches = randomInt(8, 15);

    for (let i = 0; i < numMatches; i++) {
      matchCounter++;

      const homeTeam = randomItem(leagueTeams);
      let awayTeam = randomItem(leagueTeams);
      while (awayTeam.name === homeTeam.name) {
        awayTeam = randomItem(leagueTeams);
      }

      // 20% live, 40% scheduled, 40% finished
      const rand = Math.random();
      let status, minute, isFinished, result;

      if (rand < 0.2) {
        status = randomItem(['LIVE', 'FIRST_HALF', 'HALFTIME', 'SECOND_HALF']);
        minute = randomInt(5, league.matchDuration - 5);
        isFinished = false;
        result = null;
      } else if (rand < 0.6) {
        status = 'SCHEDULED';
        minute = 0;
        isFinished = false;
        result = null;
      } else {
        status = 'FINISHED';
        minute = league.matchDuration;
        isFinished = true;
        result = calculateWinner(league.sport);
      }

      const matchDate = generateMatchDate(leagueName, status);
      const winner = isFinished ? result : calculateWinner(league.sport);
      const score = isFinished
        ? generateScore(league.sport, winner)
        : status !== 'SCHEDULED'
        ? generateScore(league.sport, winner)
        : { home: 0, away: 0 };

      const odds = generateOdds(league.sport);
      const markets = generateMarkets(league.sport, odds);

      allMatches.push({
        _id: new mongoose.Types.ObjectId(),
        id: `match-${matchCounter}`,
        sport: league.sport,
        league: leagueName,
        country: league.country,
        matchDuration: league.matchDuration,
        homeTeam: {
          name: homeTeam.name,
          abbreviation: homeTeam.abbr,
          logo: `/teams/${homeTeam.abbr.toLowerCase()}.png`,
        },
        awayTeam: {
          name: awayTeam.name,
          abbreviation: awayTeam.abbr,
          logo: `/teams/${awayTeam.abbr.toLowerCase()}.png`,
        },
        score,
        status,
        minute,
        date: matchDate,
        time: matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        venue: `${homeTeam.name} Stadium`,
        startsAt: matchDate.toISOString(),
        odds,
        markets,
        winner,
        isFinished,
        result: isFinished ? winner : null,
        liveBettingEnabled: true,
      });
    }
  });

  console.log(`Generated ${allMatches.length} matches across ${Object.keys(LEAGUES).length} leagues`);
  return allMatches;
};

// ============================================================
//  NEW: GENERATE SCHEDULED (PRE-MATCH) FIXTURES ONLY
//  Users can bet on these and wait for results
// ============================================================
const generateScheduledMatchesOnly = (countPerLeague = 15) => {
  const scheduledMatches = [];
  let matchCounter = 0;
  const now = new Date();

  Object.keys(LEAGUES).forEach((leagueName) => {
    const league = LEAGUES[leagueName];
    const leagueTeams = LEAGUE_TEAMS[leagueName] || [];

    if (leagueTeams.length < 2) return;

    for (let i = 0; i < countPerLeague; i++) {
      matchCounter++;

      const homeTeam = randomItem(leagueTeams);
      let awayTeam = randomItem(leagueTeams);
      while (awayTeam.name === homeTeam.name) {
        awayTeam = randomItem(leagueTeams);
      }

      // Schedule 1 hour to 14 days from now
      const matchDate = new Date(now);
      const daysAhead = randomInt(0, 14);
      matchDate.setDate(now.getDate() + daysAhead);

      if (league.typicalTimes && league.typicalTimes.length > 0) {
        const typicalTime = randomItem(league.typicalTimes);
        const [hours, minutes] = typicalTime.split(':');
        matchDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        matchDate.setHours(randomInt(12, 22), randomInt(0, 59), 0, 0);
      }

      // Ensure the match is in the future
      if (matchDate <= now) {
        matchDate.setDate(matchDate.getDate() + 1);
      }

      const odds = generateOdds(league.sport);
      const markets = generateMarkets(league.sport, odds);

      scheduledMatches.push({
        _id: new mongoose.Types.ObjectId(),
        id: `scheduled-${matchCounter}`,
        sport: league.sport,
        league: leagueName,
        country: league.country,
        matchDuration: league.matchDuration,
        homeTeam: {
          name: homeTeam.name,
          abbreviation: homeTeam.abbr,
          logo: `/teams/${homeTeam.abbr.toLowerCase()}.png`,
          form: Array(5).fill().map(() => randomItem(['W', 'D', 'L'])),
        },
        awayTeam: {
          name: awayTeam.name,
          abbreviation: awayTeam.abbr,
          logo: `/teams/${awayTeam.abbr.toLowerCase()}.png`,
          form: Array(5).fill().map(() => randomItem(['W', 'D', 'L'])),
        },
        score: { home: 0, away: 0 },
        status: 'SCHEDULED',
        minute: 0,
        date: matchDate,
        startsAt: matchDate.toISOString(),
        time: matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        venue: `${homeTeam.name} Stadium`,
        odds,
        markets,
        isFinished: false,
        result: null,
        liveBettingEnabled: true,
        aiPrediction: {
          predictedWinner:
            odds.home < odds.away ? 'HOME' : odds.away < odds.home ? 'AWAY' : 'DRAW',
          confidence: randomInt(55, 85),
          probability: {
            home: ((1 / odds.home) * 100).toFixed(1),
            draw: odds.draw ? ((1 / odds.draw) * 100).toFixed(1) : '0',
            away: ((1 / odds.away) * 100).toFixed(1),
          },
          insight: `${homeTeam.name} host ${awayTeam.name} in an upcoming fixture.`,
        },
      });
    }
  });

  console.log(`📅 Generated ${scheduledMatches.length} scheduled (pre-match) fixtures`);
  return scheduledMatches;
};

module.exports = {
  LEAGUES,
  LEAGUE_TEAMS,
  generateAllMatches,
  generateScheduledMatchesOnly,
};