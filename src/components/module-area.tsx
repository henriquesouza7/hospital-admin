import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import styles from "./module-area.module.css";

export function ModuleAreaGrid({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <section className={styles.grid} aria-label={label}>
      {children}
    </section>
  );
}

export function ModuleAreaCard({
  href,
  title,
  description,
  icon: Icon,
}: Readonly<{
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}>) {
  return (
    <Link className={styles.card} href={href}>
      <span className={styles.icon}>
        <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
      </span>
      <span className={styles.copy}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </span>
      <ArrowUpRight className={styles.arrow} aria-hidden="true" size={20} />
    </Link>
  );
}
