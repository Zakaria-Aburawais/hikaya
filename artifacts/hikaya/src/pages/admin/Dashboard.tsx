import { useAdminStats, useAdminListStories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, Layers, Headphones } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = useAdminStats();
  const { data: stories } = useAdminListStories();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-white/55">Manage stories, voices, and audio.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/upload">
            <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90" data-testid="button-new-story">
              <Plus className="me-1.5 h-4 w-4" /> New story
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total stories" value={stats?.totalStories ?? 0} Icon={BookOpen} />
        <Stat label="Total chapters" value={stats?.totalChapters ?? 0} Icon={Layers} />
        <Stat label="Audio segments" value={stats?.audioSegments ?? 0} Icon={Headphones} />
        <Stat label="Total users" value={stats?.totalUsers ?? 0} Icon={Users} />
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold">All stories</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-white/50">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Lang</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Chapters</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(stories ?? []).map((s) => (
              <tr key={s.id} data-testid={`row-admin-story-${s.slug}`}>
                <td className="px-4 py-3 font-medium">{s.title}</td>
                <td className="px-4 py-3 uppercase">{s.language}</td>
                <td className="px-4 py-3">{s.type}</td>
                <td className="px-4 py-3">{(s as any).chapterCount ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    s.status === "published" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-white/60"
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/admin/stories/${s.id}`}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </Link>
                </td>
              </tr>
            ))}
            {(stories ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/55">
                  No stories yet. Click <em>New story</em> to upload one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, Icon }: { label: string; value: number; Icon: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
          {label}
        </span>
        <Icon className="h-4 w-4 text-[hsl(var(--gold))]" />
      </div>
      <div className="mt-1 font-display text-3xl font-bold gold-text">{value}</div>
    </div>
  );
}
