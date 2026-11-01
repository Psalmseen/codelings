/** The timezone if it's a valid IANA name (e.g. Africa/Lagos), otherwise undefined. */
export function validTimezone(timezone) {
  if (!timezone) return undefined;
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return timezone;
  } catch {
    return undefined;
  }
}
