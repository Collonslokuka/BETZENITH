// server/data/leagueRegistry.js

const LEAGUES = {
  soccer: [
    // NEW: Club Friendly — a normal league entry with a cross-club pool
    {
      id: 'club-friendly', name: 'Club Friendly', country: 'International', priority: 2,
      teams: ['Arsenal','Chelsea','Liverpool','Man City','Man United','Tottenham','Newcastle','Aston Villa','Real Madrid','Barcelona','Atletico Madrid','Sevilla','Real Betis','Valencia','Inter','AC Milan','Juventus','Napoli','Roma','Lazio','Bayern Munich','Borussia Dortmund','RB Leipzig','Bayer Leverkusen','PSG','Marseille','Monaco','Lyon','Benfica','Porto','Sporting CP','Ajax','PSV','Feyenoord','Galatasaray','Fenerbahce','Besiktas','Celtic','Rangers','Al Hilal','Al Nassr','Inter Miami','LAFC','Flamengo','Palmeiras','Boca Juniors','River Plate'],
    },
    {
      id: 'epl', name: 'Premier League', country: 'England', priority: 1,
      teams: ['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Chelsea','Crystal Palace','Everton','Fulham','Ipswich','Leicester','Liverpool','Man City','Man United','Newcastle','Nottingham Forest','Southampton','Tottenham','West Ham','Wolves'],
    },
    {
      id: 'laliga', name: 'La Liga', country: 'Spain', priority: 1,
      teams: ['Real Madrid','Barcelona','Atletico Madrid','Athletic Club','Real Sociedad','Villarreal','Real Betis','Girona','Sevilla','Valencia','Osasuna','Celta Vigo','Rayo Vallecano','Mallorca','Getafe','Alaves','Las Palmas','Espanyol','Leganes','Valladolid'],
    },
    {
      id: 'seriea', name: 'Serie A', country: 'Italy', priority: 1,
      teams: ['Inter','AC Milan','Juventus','Napoli','Atalanta','Roma','Lazio','Fiorentina','Bologna','Torino','Udinese','Genoa','Empoli','Verona','Cagliari','Parma','Como','Lecce','Monza','Venezia'],
    },
    {
      id: 'bundesliga', name: 'Bundesliga', country: 'Germany', priority: 1,
      teams: ['Bayern Munich','Bayer Leverkusen','RB Leipzig','Borussia Dortmund','Eintracht Frankfurt','Stuttgart','Freiburg','Hoffenheim','Wolfsburg','Werder Bremen','Mainz','Augsburg','Union Berlin','Bochum','Heidenheim','St Pauli','Holstein Kiel','Borussia Monchengladbach'],
    },
    {
      id: 'ligue1', name: 'Ligue 1', country: 'France', priority: 1,
      teams: ['PSG','Marseille','Monaco','Lille','Lyon','Nice','Lens','Rennes','Reims','Toulouse','Nantes','Strasbourg','Brest','Le Havre','Auxerre','Angers','Saint-Etienne','Montpellier'],
    },
    {
      id: 'ucl', name: 'UEFA Champions League', country: 'Europe', priority: 1,
      teams: ['Real Madrid','Man City','Bayern Munich','PSG','Barcelona','Liverpool','Inter','Arsenal','Atletico Madrid','Borussia Dortmund','Juventus','AC Milan','Benfica','Porto','Ajax','PSV'],
    },
    {
      id: 'uel', name: 'UEFA Europa League', country: 'Europe', priority: 2,
      teams: ['Man United','Tottenham','Roma','Lazio','Real Sociedad','Nice','Fenerbahce','Galatasaray','Rangers','Celtic','Anderlecht','Braga','PAOK','Twente','Midtjylland','Hoffenheim'],
    },
    {
      id: 'uecl', name: 'UEFA Conference League', country: 'Europe', priority: 2,
      teams: ['Chelsea','Fiorentina','Real Betis','Djurgarden','Legia Warsaw','Rapid Vienna','Cercle Brugge','Vitória SC','Astana','TSC Backa Topola','Shamrock Rovers','The New Saints'],
    },
    {
      id: 'eredivisie', name: 'Eredivisie', country: 'Netherlands', priority: 2,
      teams: ['Ajax','PSV','Feyenoord','AZ Alkmaar','Twente','Utrecht','Sparta Rotterdam','Go Ahead Eagles','NEC','Heerenveen','Fortuna Sittard','Groningen','Heracles','PEC Zwolle','Willem II','RKC Waalwijk','Almere City','NAC Breda'],
    },
    {
      id: 'primeira', name: 'Primeira Liga', country: 'Portugal', priority: 2,
      teams: ['Benfica','Porto','Sporting CP','Braga','Vitoria Guimaraes','Famalicao','Moreirense','Santa Clara','Estoril','Rio Ave','Arouca','Gil Vicente','Casa Pia','Boavista','Estrela Amadora','Nacional','Farense','AVS'],
    },
    {
      id: 'championship', name: 'EFL Championship', country: 'England', priority: 2,
      teams: ['Leeds','Burnley','Sheffield United','Sunderland','Middlesbrough','West Brom','Norwich','Watford','Coventry','Blackburn','Millwall','Bristol City','Swansea','Cardiff','Preston','Hull','Stoke','QPR','Plymouth','Derby','Portsmouth','Oxford','Luton'],
    },
    {
      id: 'scotland', name: 'Scottish Premiership', country: 'Scotland', priority: 2,
      teams: ['Celtic','Rangers','Hearts','Aberdeen','Hibernian','Dundee United','Motherwell','St Mirren','Kilmarnock','Dundee','Ross County','St Johnstone'],
    },
    {
      id: 'turkey', name: 'Turkish Super Lig', country: 'Turkey', priority: 2,
      teams: ['Galatasaray','Fenerbahce','Besiktas','Trabzonspor','Istanbul Basaksehir','Adana Demirspor','Konyaspor','Kayserispor','Alanyaspor','Antalyaspor','Sivasspor','Kasimpasa','Rizespor','Samsunspor','Gaziantep','Hatayspor','Pendikspor','Istanbulspor'],
    },
    {
      id: 'belgium', name: 'Belgian Pro League', country: 'Belgium', priority: 2,
      teams: ['Club Brugge','Union SG','Anderlecht','Genk','Gent','Antwerp','Cercle Brugge','Standard Liege','Mechelen','Charleroi','Westerlo','OH Leuven','Sint-Truiden','Kortrijk','Eupen','RWDM'],
    },
    {
      id: 'greece', name: 'Greek Super League', country: 'Greece', priority: 3,
      teams: ['Olympiacos','Panathinaikos','AEK Athens','PAOK','Aris','Panserraikos','OFI Crete','Asteras Tripolis','Volos','Atromitos','Panetolikos','Kifisia','Lamia','PAS Giannina'],
    },
    {
      id: 'austria', name: 'Austrian Bundesliga', country: 'Austria', priority: 3,
      teams: ['Red Bull Salzburg','Sturm Graz','LASK','Rapid Vienna','Austria Vienna','Wolfsberger AC','Hartberg','Austria Klagenfurt','Blau-Weiss Linz','Rheindorf Altach','Tirol','Austria Lustenau'],
    },
    {
      id: 'swiss', name: 'Swiss Super League', country: 'Switzerland', priority: 3,
      teams: ['Young Boys','Basel','Servette','Lugano','St Gallen','Luzern','Zurich','Grasshopper','Yverdon','Lausanne','Winterthur','Stade-Lausanne'],
    },
    {
      id: 'saudi', name: 'Saudi Pro League', country: 'Saudi Arabia', priority: 2,
      teams: ['Al Hilal','Al Nassr','Al Ittihad','Al Ahli','Al Shabab','Al Ettifaq','Al Taawoun','Al Fateh','Al Fayha','Al Khaleej','Al Wehda','Al Riyadh','Al Raed','Damac','Al Hazem','Al Okhdood','Al Tai','Abha'],
    },
    {
      id: 'mls', name: 'MLS', country: 'USA', priority: 2,
      teams: ['Inter Miami','LAFC','LA Galaxy','Seattle Sounders','Atlanta United','NY Red Bulls','NYCFC','Philadelphia Union','Columbus Crew','FC Cincinnati','Austin FC','Portland Timbers','Nashville SC','Charlotte FC','Orlando City','Chicago Fire'],
    },
    {
      id: 'ligamx', name: 'Liga MX', country: 'Mexico', priority: 2,
      teams: ['Club America','Monterrey','Tigres UANL','Guadalajara','Cruz Azul','Pumas UNAM','Toluca','Leon','Santos Laguna','Pachuca','Atlas','Necaxa','Puebla','Queretaro','Mazatlan','Atletico San Luis','Juarez','Tijuana'],
    },
    {
      id: 'brasileirao', name: 'Brasileirão Série A', country: 'Brazil', priority: 2,
      teams: ['Flamengo','Palmeiras','Corinthians','São Paulo','Fluminense','Botafogo','Vasco da Gama','Grêmio','Internacional','Atlético Mineiro','Cruzeiro','Bahia','Fortaleza','Athletico Paranaense','Bragantino','Cuiabá'],
    },
    {
      id: 'argentina', name: 'Liga Profesional', country: 'Argentina', priority: 2,
      teams: ['River Plate','Boca Juniors','Racing Club','Independiente','San Lorenzo','Velez Sarsfield','Estudiantes','Talleres','Rosario Central','Newells Old Boys','Huracan','Lanus','Argentinos Juniors','Godoy Cruz','Defensa y Justicia'],
    },
    {
      id: 'jleague', name: 'J1 League', country: 'Japan', priority: 3,
      teams: ['Vissel Kobe','Yokohama F Marinos','Sanfrecce Hiroshima','Urawa Red Diamonds','Kawasaki Frontale','Cerezo Osaka','Kashima Antlers','Nagoya Grampus','FC Tokyo','Gamba Osaka','Avispa Fukuoka','Consadole Sapporo'],
    },
    {
      id: 'kleague', name: 'K League 1', country: 'South Korea', priority: 3,
      teams: ['Ulsan HD','Jeonbuk Hyundai','Pohang Steelers','Gwangju FC','FC Seoul','Jeju United','Daegu FC','Gangwon FC','Suwon FC','Daejeon Hana','Incheon United','Gimcheon Sangmu'],
    },
  ],

  basketball: [
    {
      id: 'nba', name: 'NBA', country: 'USA', priority: 1,
      teams: ['Lakers','Celtics','Warriors','Bucks','Nuggets','Suns','Heat','76ers','Knicks','Nets','Mavericks','Timberwolves','Thunder','Cavaliers','Pacers','Magic','Kings','Clippers','Pelicans','Grizzlies','Hawks','Bulls','Hornets','Pistons','Raptors','Wizards','Blazers','Jazz','Rockets','Spurs'],
    },
    {
      id: 'euroleague', name: 'EuroLeague', country: 'Europe', priority: 2,
      teams: ['Real Madrid','Barcelona','Olympiacos','Panathinaikos','Fenerbahce','Anadolu Efes','Monaco','Baskonia','Maccabi Tel Aviv','Žalgiris','Bayern Munich','Virtus Bologna','Partizan','Crvena Zvezda','ASVEL','Alba Berlin','Paris Basketball','Olimpia Milano'],
    },
    {
      id: 'wnba', name: 'WNBA', country: 'USA', priority: 3,
      teams: ['Aces','Liberty','Sun','Wings','Storm','Sky','Mercury','Fever','Sparks','Mystics','Dream','Lynx'],
    },
    {
      id: 'ncaab', name: 'NCAA Basketball', country: 'USA', priority: 3,
      teams: ['Duke','Kentucky','Kansas','North Carolina','UCLA','Gonzaga','Michigan State','Villanova','Arizona','Purdue','Houston','Baylor','Alabama','Tennessee','Marquette','UConn'],
    },
  ],

  'american-football': [
    {
      id: 'nfl', name: 'NFL', country: 'USA', priority: 1,
      teams: ['Chiefs','49ers','Bills','Eagles','Cowboys','Ravens','Bengals','Lions','Dolphins','Jets','Packers','Vikings','Chargers','Broncos','Steelers','Browns','Jaguars','Texans','Colts','Titans','Commanders','Giants','Bears','Falcons','Saints','Panthers','Buccaneers','Rams','Seahawks','Cardinals','Patriots'],
    },
    {
      id: 'ncaaf', name: 'NCAA Football', country: 'USA', priority: 3,
      teams: ['Georgia','Ohio State','Michigan','Alabama','Texas','Oregon','Penn State','Notre Dame','USC','Clemson','LSU','Florida','Oklahoma','Tennessee','Auburn','Washington'],
    },
  ],

  baseball: [
    {
      id: 'mlb', name: 'MLB', country: 'USA', priority: 2,
      teams: ['Yankees','Dodgers','Red Sox','Astros','Braves','Mets','Phillies','Padres','Cubs','Cardinals','Giants','Rangers','Mariners','Rays','Blue Jays','Orioles','Guardians','Twins','Angels','Athletics','White Sox','Tigers','Royals','Brewers','Reds','Pirates','Rockies','Diamondbacks','Marlins','Nationals'],
    },
  ],

  'ice-hockey': [
    {
      id: 'nhl', name: 'NHL', country: 'USA/Canada', priority: 2,
      teams: ['Maple Leafs','Canadiens','Bruins','Avalanche','Oilers','Rangers','Penguins','Capitals','Lightning','Panthers','Stars','Golden Knights','Kings','Sharks','Blackhawks','Red Wings','Flyers','Islanders','Devils','Sabres','Senators','Jets','Flames','Canucks','Wild','Coyotes','Predators','Blues','Ducks','Kraken','Blue Jackets','Hurricanes'],
    },
  ],

  tennis: [
    {
      id: 'atp', name: 'ATP Tour', country: 'International', priority: 1,
      teams: ['Djokovic','Alcaraz','Sinner','Medvedev','Zverev','Rune','Tsitsipas','Ruud','Fritz','De Minaur','Rublev','Hurkacz','Paul','Dimitrov','Shelton','Tiafoe','Khachanov','Cerundolo','Musetti','Baez'],
    },
    {
      id: 'wta', name: 'WTA Tour', country: 'International', priority: 2,
      teams: ['Swiatek','Sabalenka','Gauff','Rybakina','Pegula','Zheng','Vondrousova','Jabeur','Krejcikova','Kvitova','Badosa','Keys','Ostapenko','Kasatkina','Samsonova','Haddad Maia','Garcia','Azarenka','Fernandez','Navarro'],
    },
  ],

  cricket: [
    {
      id: 'ipl', name: 'Indian Premier League', country: 'India', priority: 1,
      teams: ['Mumbai Indians','Chennai Super Kings','Royal Challengers Bangalore','Kolkata Knight Riders','Delhi Capitals','Rajasthan Royals','Sunrisers Hyderabad','Punjab Kings','Gujarat Titans','Lucknow Super Giants'],
    },
    {
      id: 'bbl', name: 'Big Bash League', country: 'Australia', priority: 3,
      teams: ['Sydney Sixers','Sydney Thunder','Melbourne Stars','Melbourne Renegades','Perth Scorchers','Adelaide Strikers','Brisbane Heat','Hobart Hurricanes'],
    },
    {
      id: 'psl', name: 'Pakistan Super League', country: 'Pakistan', priority: 3,
      teams: ['Karachi Kings','Lahore Qalandars','Islamabad United','Peshawar Zalmi','Quetta Gladiators','Multan Sultans'],
    },
  ],

  mma: [
    {
      id: 'ufc', name: 'UFC', country: 'International', priority: 1,
      teams: ['Jones','Makhachev','Pereira','Volkanovski','Adesanya','Du Plessis','Topuria','O\'Malley','Edwards','Aspinall','Gane','Blaydes','Poirier','Gaethje','Oliveira','Tsarukyan'],
    },
    {
      id: 'pfl', name: 'PFL', country: 'International', priority: 3,
      teams: ['Ngannou','Ferreira','Goltz','Schulte','Kasanganay','Abdouraguimov','Jackson','Musaev'],
    },
  ],
};

const SPORT_DURATIONS = {
  soccer: { regular: 90, halftime: 45 },
  basketball: { regular: 48, halftime: 24 },
  'american-football': { regular: 60, halftime: 30 },
  baseball: { regular: 180, halftime: 90 },
  'ice-hockey': { regular: 60, halftime: 20 },
  tennis: { regular: 120, halftime: 60 },
  cricket: { regular: 180, halftime: 90 },
  mma: { regular: 25, halftime: 12 },
};

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