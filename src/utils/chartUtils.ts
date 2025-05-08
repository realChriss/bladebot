import { Canvas, createCanvas } from '@napi-rs/canvas';
import { ChartConfiguration } from 'chart.js';
import { createCanvas as createJSCanvas } from 'canvas';

const width = 800;
const height = 400;

export async function generateChart(config: ChartConfiguration): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (config.type === 'pie') {
    await drawPieChart(ctx, config);
  } else if (config.type === 'bar') {
    await drawBarChart(ctx, config);
  }

  return canvas.toBuffer('image/png');
}

async function drawPieChart(ctx: any, config: ChartConfiguration) {
  const data = config.data.datasets[0].data as number[];
  const colors = config.data.datasets[0].backgroundColor as string[];
  const total = data.reduce((a, b) => a + b, 0);
  let startAngle = 0;

  ctx.save();
  ctx.translate(width/2, height/2);

  for (let i = 0; i < data.length; i++) {
    const sliceAngle = (2 * Math.PI * data[i]) / total;
    
    ctx.beginPath();
    ctx.fillStyle = colors[i];
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, Math.min(width, height)/3, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();
    
    startAngle += sliceAngle;
  }

  ctx.restore();
}

async function drawBarChart(ctx: any, config: ChartConfiguration) {
  const data = config.data.datasets[0].data as number[];
  const color = config.data.datasets[0].backgroundColor as string;
  const labels = config.data.labels as string[];
  const maxValue = Math.max(...data);
  
  const barWidth = (width - 100) / data.length;
  const scale = (height - 100) / maxValue;

  ctx.fillStyle = color;
  data.forEach((value, i) => {
    const barHeight = value * scale;
    ctx.fillRect(
      50 + i * barWidth, 
      height - 50 - barHeight, 
      barWidth - 10, 
      barHeight
    );
  });

  // Draw labels
  ctx.fillStyle = '#000000';
  ctx.font = '20px Arial';
  labels.forEach((label, i) => {
    ctx.fillText(
      label, 
      50 + i * barWidth, 
      height - 30
    );
  });
}

export function createTimeRanges(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

export function calculateAgeDistribution(ages: number[]): Record<string, number> {
  const distribution: Record<string, number> = {
    '< 14': 0,
    '14': 0,
    '15': 0,
    '16': 0,
    '17': 0,
    '18': 0,
    '19': 0,
    '20+': 0
  };

  ages.forEach(age => {
    if (age < 14) distribution['-14']++;
    else if (age == 14) distribution['14']++;
    else if (age == 15) distribution['15']++;
    else if (age == 16) distribution['16']++;
    else if (age == 17) distribution['17']++;
    else if (age == 18) distribution['18']++;
    else if (age == 19) distribution['19']++;
    else distribution['20+']++;
  });

  return distribution;
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
    max: sorted[sorted.length - 1]
  };
}