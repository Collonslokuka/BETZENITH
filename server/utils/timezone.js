// server/utils/timezone.js
// Real timezone support. EAT is the default; any zone works via its IANA name.

const TIMEZONES = {
    EAT: 'Africa/Nairobi',     // UTC+3 — Kenya, Tanzania, Uganda, Ethiopia, Rwanda, Burundi
    CAT: 'Africa/Lusaka',      // UTC+2 — Central Africa
    WAT: 'Africa/Lagos',       // UTC+1 — West Africa
    SAST: 'Africa/Johannesburg',// UTC+2 — South Africa
    UTC: 'UTC',
    GMT: 'Europe/London',      // UTC+0 / +1 with DST
    CET: 'Europe/Paris',       // UTC+1 / +2
    MSK: 'Europe/Moscow',      // UTC+3 (no DST)
    GST: 'Asia/Dubai',         // UTC+4
    IST: 'Asia/Kolkata',       // UTC+5:30 (no DST)
    SGT: 'Asia/Singapore',     // UTC+8
    JST: 'Asia/Tokyo',         // UTC+9
    AEST: 'Australia/Sydney',  // UTC+10 / +11
    EST: 'America/New_York',   // UTC-5 / -4
    CST: 'America/Chicago',    // UTC-6 / -5
    MST: 'America/Denver',     // UTC-7 / -6
    PST: 'America/Los_Angeles',// UTC-8 / -7
  };
  
  const DEFAULT_TZ = 'Africa/Nairobi'; // EAT
  
  function resolveZone(input) {
    if (!input) return DEFAULT_TZ;
    const key = String(input).toUpperCase();
    return TIMEZONES[key] || input; // accept either "EAT" or "Africa/Nairobi"
  }
  
  /**
   * Offset (minutes) of `timezone` at `date`. Handles DST correctly because it
   * asks Intl for the real offset — never hard-code +180 for EAT.
   */
  function getOffsetMinutes(timezone, date = new Date()) {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const p = Object.fromEntries(dtf.formatToParts(date).map(x => [x.type, x.value]));
    const asUTC = Date.UTC(
      +p.year, +p.month - 1, +p.day,
      +(p.hour === '24' ? 0 : p.hour), +p.minute, +p.second,
    );
    return (asUTC - date.getTime()) / 60000;
  }
  
  /**
   * Convert a *naive* local datetime string ("2025-06-01T16:00", no offset)
   * that is meant to be wall-clock time in `timezone`, into the correct UTC Date.
   *
   *   zonedTimeToUtc("2025-06-01T16:00", "Africa/Nairobi") -> 2025-06-01T13:00:00Z
   *
   * Iterates twice so DST transitions settle.
   */
  function zonedTimeToUtc(localISO, timezone = DEFAULT_TZ) {
    const zone = resolveZone(timezone);
    const bare = String(localISO).replace(/[zZ]$/, '');
    let guess = new Date(`${bare}Z`);
    if (isNaN(guess.getTime())) return null;
    for (let i = 0; i < 2; i++) {
      const off = getOffsetMinutes(zone, guess);
      guess = new Date(new Date(`${bare}Z`).getTime() - off * 60000);
    }
    return guess;
  }
  
  /** True if the input already has an explicit offset or Z. */
  function hasOffset(iso) {
    return /[zZ]|[+-]\d{2}:?\d{2}$/.test(String(iso || '').trim());
  }
  
  /**
   * Normalise whatever the admin sent into a UTC Date plus display metadata.
   */
  function resolveStartTime(raw, timezone) {
    const zone = resolveZone(timezone);
    if (!raw) return null;
    const date = hasOffset(raw) ? new Date(raw) : zonedTimeToUtc(raw, zone);
    if (!date || isNaN(date.getTime())) return null;
    return { utc: date, timezone: zone };
  }
  
  function formatInZone(date, timezone = DEFAULT_TZ) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: resolveZone(timezone), hour12: false,
      weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(date));
  }
  
  module.exports = {
    TIMEZONES, DEFAULT_TZ, resolveZone,
    getOffsetMinutes, zonedTimeToUtc, hasOffset, resolveStartTime, formatInZone,
  };