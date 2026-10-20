const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// "just now", "25 minutes ago", "3 hours ago", "2 days ago"
export function timeAgo(dateString) {
  const age = Math.max(0, Date.now() - new Date(dateString).getTime());
  if (age < MINUTE) return "just now";
  if (age < HOUR) return `${plural(Math.floor(age / MINUTE), "minute")} ago`;
  if (age < DAY) return `${plural(Math.floor(age / HOUR), "hour")} ago`;
  return `${plural(Math.floor(age / DAY), "day")} ago`;
}
