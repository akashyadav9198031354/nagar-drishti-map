export const CATEGORIES = [
  { id: "waterlogging", hi: "जलभराव", en: "Waterlogging", icon: "💧", color: "#2f6fb3" },
  { id: "garbage", hi: "कूड़ा", en: "Garbage", icon: "🗑️", color: "#6b8e23" },
  { id: "road_damage", hi: "सड़क / गड्ढा", en: "Road damage", icon: "🚧", color: "#c0612b" },
  { id: "streetlight", hi: "स्ट्रीट लाइट", en: "Streetlight", icon: "💡", color: "#d4a017" },
  { id: "drainage", hi: "सीवर / नाली", en: "Drainage / sewage", icon: "🚰", color: "#7a5230" },
  { id: "open_drain", hi: "खुला नाला", en: "Open drain", icon: "⚠️", color: "#b3261e" },
  { id: "other", hi: "अन्य", en: "Other", icon: "📍", color: "#666666" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[6];

export const STATUSES = [
  { id: "reported", hi: "दर्ज", en: "Reported" },
  { id: "under_review", hi: "समीक्षा में", en: "Under Review" },
  { id: "assigned", hi: "सौंपा गया", en: "Assigned" },
  { id: "in_progress", hi: "कार्य जारी", en: "In Progress" },
  { id: "resolved", hi: "हल हुआ", en: "Resolved" },
  { id: "verified", hi: "सत्यापित", en: "Verified" },
] as const;
export const statusOf = (id: string) => STATUSES.find((s) => s.id === id) ?? STATUSES[0];
export const statusIndex = (id: string) => STATUSES.findIndex((s) => s.id === id);

export type Report = {
  id: string;
  reference_id: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  ward: string | null;
  image_path: string | null;
  severity: number;
  status: string;
  ai_category: string | null;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_CENTER: [number, number] = [26.8467, 80.9462]; // Lucknow

export function distanceMeters(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const CLUSTER_RADIUS_M = 150;

export type Cluster = {
  id: string;
  category: string;
  center: [number, number];
  reports: Report[];
  ward: string | null;
  score: number;
  priority: "High" | "Medium" | "Low";
  recent: number;
};

const SEVERITY_WEIGHT: Record<string, number> = {
  open_drain: 3, waterlogging: 2.5, road_damage: 2.5, drainage: 2, garbage: 1.5, streetlight: 1, other: 1,
};

/** Transparent priority-support score: concentration + recency + severity + evidence. */
export function scoreCluster(reports: Report[]) {
  const open = reports.filter((r) => !["resolved","verified"].includes(r.status));
  const now = Date.now();
  const recent = open.filter((r) => now - new Date(r.created_at).getTime() < 48 * 3600e3).length;
  const concentration = Math.min(open.length, 10) * 2;
  const recency = recent * 1.5;
  const severity =
    (open.reduce((s, r) => s + r.severity, 0) / Math.max(open.length, 1)) *
    (SEVERITY_WEIGHT[reports[0]?.category ?? "other"] ?? 1);
  const evidence = open.filter((r) => r.image_path).length * 0.5;
  const score = open.length === 0 ? 0 : Math.round((concentration + recency + severity + evidence) * 10) / 10;
  const priority: Cluster["priority"] = score >= 14 ? "High" : score >= 7 ? "Medium" : "Low";
  return { score, priority, recent };
}

/** Greedy geographic clustering: same category within CLUSTER_RADIUS_M. */
export function buildClusters(reports: Report[]): Cluster[] {
  const clusters: Cluster[] = [];
  const sorted = [...reports].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const r of sorted) {
    const p: [number, number] = [r.latitude, r.longitude];
    const hit = clusters.find(
      (c) => c.category === r.category && distanceMeters(c.center, p) <= CLUSTER_RADIUS_M,
    );
    if (hit) {
      hit.reports.push(r);
      const n = hit.reports.length;
      hit.center = [
        hit.reports.reduce((s, x) => s + x.latitude, 0) / n,
        hit.reports.reduce((s, x) => s + x.longitude, 0) / n,
      ];
    } else {
      clusters.push({ id: r.id, category: r.category, center: p, reports: [r], ward: r.ward, score: 0, priority: "Low", recent: 0 });
    }
  }
  for (const c of clusters) Object.assign(c, scoreCluster(c.reports));
  return clusters.sort((a, b) => b.score - a.score);
}

export function findRelated(reports: Report[], lat: number, lng: number, category: string) {
  return reports.filter(
    (r) =>
      r.category === category &&
      !["resolved","verified"].includes(r.status) &&
      distanceMeters([r.latitude, r.longitude], [lat, lng]) <= CLUSTER_RADIUS_M,
  );
}

export function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m} मिनट पहले`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} घंटे पहले`;
  return `${Math.round(h / 24)} दिन पहले`;
}
