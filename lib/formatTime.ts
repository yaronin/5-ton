export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centi = Math.floor((ms % 1000) / 10);
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centi)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}.${pad(centi)}`;
}
