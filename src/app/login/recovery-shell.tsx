import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { getEnvironmentLabel } from "@/lib/environment-label";
import "./login.css";
import styles from "./recovery.module.css";

export function RecoveryShell({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: ReactNode;
}>) {
  return (
    <main className="login-screen flex min-h-screen items-center justify-center p-4 sm:p-8">
      <section className={`login-layout ${styles.card}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Building2 size={26} strokeWidth={1.5} />
          </span>
          <div>
            <p className={styles.brandName}>Hospital Admin</p>
            <p className={styles.environment}>{getEnvironmentLabel()}</p>
          </div>
        </div>
        <p className="login-restricted-label text-link">
          Recuperação de acesso
        </p>
        <h1 className="login-title">{title}</h1>
        <p className={`login-subtitle ${styles.description}`}>{description}</p>
        {children}
      </section>
    </main>
  );
}
