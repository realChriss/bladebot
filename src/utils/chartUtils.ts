import { Canvas, createCanvas } from "@napi-rs/canvas";
import { ChartConfiguration } from "chart.js";

export async function generateChart(
  config: ChartConfiguration,
): Promise<Buffer> {
  const canvas = createCanvas(400, 200);
  const ctx = canvas.getContext("2d");

  if (config.type === "bar") {
    await drawBarChart(ctx, config);
  }

  return canvas.toBuffer("image/png");
}

async function drawBarChart(ctx: any, config: ChartConfiguration) {
  const data = config.data.datasets[0].data as number[];
  const color = "#ffffff";
  const labels = config.data.labels as string[];

  const maxValue = Math.max(...data);

  const barGap = 5;
  const barWidth = 30;
  const totalWidth = data.length * (barWidth + barGap);
  const width = totalWidth + 100;
  const height = 300;

  const scale = (height - 100) / maxValue;

  ctx.canvas.width = width;
  ctx.canvas.height = height;

  // Set black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Draw bars
  ctx.fillStyle = color;
  data.forEach((value, i) => {
    const barHeight = value * scale;
    ctx.fillRect(
      50 + i * (barWidth + barGap),
      height - 50 - barHeight,
      barWidth,
      barHeight
    );
  });

  // Draw labels
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";
  labels.forEach((label, i) => {
    ctx.fillText(
      label,
      50 + i * (barWidth + barGap),
      height - 20
    );
  });
}

export function createTimeRanges(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

export function calculateAgeDistribution(
  ages: number[],
) {
  const keys = ["-15", "16", "17", "18", "19", "20+"] as const;
  
  const distribution: Record<typeof keys[number], number> = {
    "-15": 0,
    "16": 0,
    "17": 0,
    "18": 0,
    "19": 0,
    "20+": 0,
  };

  ages.forEach((age) => {
    if (age <= 15) distribution["-15"]++;
    else if (age === 16) distribution["16"]++;
    else if (age === 17) distribution["17"]++;
    else if (age === 18) distribution["18"]++;
    else if (age === 19) distribution["19"]++;
    else distribution["20+"]++;
  });

  const values = keys.map((key) => distribution[key]);

  return {
    keys,
    values,
  };
}

export function calculateTimeStats(times: number[]): {
  average: number;
  median: number;
  min: number;
  max: number;
} {
  if (times.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    average: Math.round(sum / times.length),
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}
