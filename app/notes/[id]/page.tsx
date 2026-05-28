import { SiteHeader } from "@/components/site-header";
import { NotesView } from "@/components/notes-view";

export default async function NotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <NotesView videoId={id} />
      </main>
    </div>
  );
}
