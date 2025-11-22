export default function Settings() {
  return (
    <div className="flex min-h-screen flex-col px-6 pt-8 pb-24">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-secondary p-6">
          <p className="font-semibold mb-1">Account</p>
          <p className="text-sm text-muted-foreground">Connect your wallet</p>
        </div>
        <div className="rounded-2xl bg-secondary p-6">
          <p className="font-semibold mb-1">Notifications</p>
          <p className="text-sm text-muted-foreground">Manage alerts and updates</p>
        </div>
        <div className="rounded-2xl bg-secondary p-6">
          <p className="font-semibold mb-1">About</p>
          <p className="text-sm text-muted-foreground">Version 0.1.0</p>
        </div>
      </div>
    </div>
  );
}

