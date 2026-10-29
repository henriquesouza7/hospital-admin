import type { ReactNode } from "react";
import "./page-header.css";

type PageHeaderProps = Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}>;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header-copy">
        {eyebrow ? (
          <p className="admin-page-header-eyebrow">{eyebrow}</p>
        ) : null}
        <h1 className="admin-page-header-title">{title}</h1>
        {description ? (
          <p className="admin-page-header-description">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="admin-page-header-actions">{actions}</div>
      ) : null}
    </header>
  );
}
