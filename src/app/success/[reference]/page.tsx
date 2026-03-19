type SuccessReferencePageProps = {
  params: {
    reference: string;
  };
};

export default function SuccessReferencePage({
  params,
}: SuccessReferencePageProps) {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-2">
        <h1 className="text-3xl font-semibold">Payment received for {params.reference}</h1>
        <p className="text-slate-300">Confirmation details and the release PIN will appear here.</p>
      </div>
    </main>
  );
}