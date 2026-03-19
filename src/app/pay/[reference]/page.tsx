type PayReferencePageProps = {
  params: {
    reference: string;
  };
};

export default function PayReferencePage({ params }: PayReferencePageProps) {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-2">
        <h1 className="text-3xl font-semibold">Pay deposit for {params.reference}</h1>
        <p className="text-slate-300">Stripe checkout and payment capture will live here.</p>
      </div>
    </main>
  );
}