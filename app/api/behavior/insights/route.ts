import { NextRequest, NextResponse } from 'next/server';
import { generateProcrastinationInsights } from '../../../../lib/ai/behaviorInsights';
import { ProcrastinationStats } from '../../../../lib/behavior/statsEngine';

export async function POST(req: NextRequest) {
  try {
    const stats: ProcrastinationStats = await req.json();
    const insights = await generateProcrastinationInsights(stats);
    return NextResponse.json({ insights });
  } catch (error: any) {
    console.error('Insights API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
