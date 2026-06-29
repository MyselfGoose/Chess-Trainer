import { PrepPageContent } from "@/components/prep/PrepPageContent";

export default function PrepPage() {
  return (
    <div className="min-h-full overflow-y-auto bg-surface-muted">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Tournament prep</h1>
          <p className="mt-1 text-muted-foreground">
            Build opponent profiles and drill only the lines you need before a
            match.
          </p>
        </header>
        <PrepPageContent />
      </div>
    </div>
  );
}
