type BookingReferencePageProps = {
  params: {
    reference: string;
  };
};

export default function BookingReferencePage({
  params,
}: BookingReferencePageProps) {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-2">
        <h1 className="text-3xl font-semibold">Booking {params.reference}</h1>
        <p className="text-slate-300">Client-facing booking summary will render here.</p>
      </div>
    </main>
  );
}