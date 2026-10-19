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

// The tape label on each card: Fresh, its age, or May be gone.
export function freshnessLabel(item) {
  if (item.status === "taken") {
    return { text: `Taken ${timeAgo(item.takenAt)}`, className: "tape-closed" };
  }
  const age = Date.now() - new Date(item.createdAt).getTime();
  if (age < DAY) return { text: "Fresh", className: "tape-fresh" };
  if (age <= 3 * DAY) {
    return { text: timeAgo(item.createdAt), className: "tape-recent" };
  }
  return { text: "May be gone", className: "tape-old" };
}
