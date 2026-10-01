type PagePlaceholderProps = Readonly<{ title: string; description: string }>;

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
      <p className="text-sm font-medium text-muted-foreground">
        Hospital Admin
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        {description}
      </p>
    </section>
  );
}
