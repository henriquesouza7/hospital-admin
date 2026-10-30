export function getResponsiveMetricPresentation(value: string) {
  const isLong = value.length > 14;

  return {
    value,
    title: value,
    isLong,
    style: isLong
      ? {
          fontSize: `clamp(1rem, calc(100cqi / ${value.length} / 0.6), 2.25rem)`,
        }
      : undefined,
  };
}
