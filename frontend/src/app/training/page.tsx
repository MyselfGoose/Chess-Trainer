import { TrainingRepertoireList } from "@/components/training/TrainingRepertoireList";

export default function TrainingPage() {
  return (
    <div className="min-h-full overflow-y-auto bg-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Training</h1>
          <p className="mt-1 text-zinc-600">
            Drill your repertoires line by line in random order.
          </p>
        </header>
        <TrainingRepertoireList />
      </div>
    </div>
  );
}
