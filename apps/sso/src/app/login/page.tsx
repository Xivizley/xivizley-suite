import { Suspense } from "react";
import { LoginForm } from "./LoginForm.js";
import { Spinner } from "@xivizley/aurora-ui";

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" color="cyan" />
            <span className="text-xs text-aurora-text-muted">Yükleniyor...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
