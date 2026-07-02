"use client";

export type NormalizedLineChartRow<T extends Record<string, unknown>> = T & {
  __x: unknown;
  __y: number;
};

export function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function formatDateShort(input: unknown) {
  const source = typeof input === "string" ? input : "";
  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return source || "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1;
  }

  const exp = Math.floor(Math.log10(raw));
  const fraction = raw / Math.pow(10, exp);

  let normalizedFraction = 1;
  if (fraction <= 1) {
    normalizedFraction = 1;
  } else if (fraction <= 2) {
    normalizedFraction = 2;
  } else if (fraction <= 5) {
    normalizedFraction = 5;
  } else {
    normalizedFraction = 10;
  }

  return normalizedFraction * Math.pow(10, exp);
}

function genTicks(min: number, max: number, step: number) {
  const ticks: number[] = [];
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    !Number.isFinite(step) ||
    step <= 0
  ) {
    return ticks;
  }

  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const maxTicks = 12_000;
  let count = 0;

  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(Number(value.toFixed(12)));
    count += 1;
    if (count > maxTicks) {
      break;
    }
  }

  return Array.from(new Set(ticks)).sort((a, b) => a - b);
}

function hasDuplicateLabels(values: number[], formatValue: (value: number) => string) {
  const labels = values.map((value) => formatValue(value));
  return new Set(labels).size !== labels.length;
}

export function normalizeLineChartData<T extends Record<string, unknown>>(
  data: T[],
  xKey: keyof T,
  yKey: keyof T,
) {
  return (data || [])
    .map((row) => ({
      ...row,
      __x: row[xKey],
      __y: toNumber(row[yKey]),
    }))
    .sort((a, b) => {
      const firstDate = new Date(String(a.__x)).getTime();
      const secondDate = new Date(String(b.__x)).getTime();

      if (Number.isNaN(firstDate) || Number.isNaN(secondDate)) {
        return 0;
      }

      return firstDate - secondDate;
    }) as NormalizedLineChartRow<T>[];
}

export function getLineChartYAxis(
  normalized: Array<{ __y: number }>,
  formatValue: (value: number) => string,
) {
  if (normalized.length === 0) {
    return {
      domain: [0, 1] as [number, number],
      ticks: [0, 1] as number[],
      allowDecimals: false,
    };
  }

  const yValues = normalized.map((row) => toNumber(row.__y));
  const yMinData = yValues.length ? Math.min(...yValues) : 0;
  const yMaxData = yValues.length ? Math.max(...yValues) : 0;

  const min = Math.min(0, yMinData);
  const max = Math.max(0, yMaxData);
  const domainMax = max === 0 ? 1 : max;
  const isIntegerSeries = yValues.every((value) => Number.isInteger(value));

  let step: number;
  if (isIntegerSeries) {
    step = domainMax <= 12 ? 1 : Math.max(1, niceStep((domainMax - min) / 5));
  } else {
    step = niceStep((domainMax - min) / 5);
  }

  let ticks = genTicks(min, domainMax, step);
  let attempts = 0;

  while (ticks.length > 2 && hasDuplicateLabels(ticks, formatValue) && attempts < 8) {
    step *= 2;
    ticks = genTicks(min, domainMax, step);
    attempts += 1;
  }

  const maxTicksShown = 12;
  if (ticks.length > maxTicksShown) {
    const stride = Math.ceil(ticks.length / maxTicksShown);
    ticks = ticks.filter((_, index) => index % stride === 0);
    if (ticks[ticks.length - 1] !== domainMax) {
      ticks.push(domainMax);
    }
  }

  return {
    domain: [min, domainMax] as [number, number],
    ticks,
    allowDecimals: !isIntegerSeries,
  };
}
