export default function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col px-6 pt-8 pb-24">
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-secondary p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Balance</p>
            <p className="text-4xl font-bold">$0.00</p>
          </div>
          <div className="rounded-2xl bg-secondary p-6">
            <p className="text-sm text-muted-foreground mb-2">Current APY</p>
            <p className="text-2xl font-bold text-accent">0.00%</p>
          </div>
          <div className="rounded-2xl bg-secondary p-6">
            <p className="text-sm text-muted-foreground mb-2">Lifetime Earnings</p>
            <p className="text-2xl font-bold">$0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}

