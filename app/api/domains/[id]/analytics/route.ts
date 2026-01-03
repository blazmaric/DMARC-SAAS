import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const supabase = await createClient();

    const { data: domain } = await supabase
      .from('domains')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    if (user.role === 'customer' && user.customer_id !== domain.customer_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: dailyStats } = await supabase
      .from('daily_aggregates')
      .select('*')
      .eq('domain_id', id)
      .gte('date', startDateStr)
      .order('date', { ascending: true });

    const { data: reports } = await supabase
      .from('dmarc_reports')
      .select('*, records:dmarc_records(*)')
      .eq('domain_id', id)
      .gte('begin_date', startDate.toISOString())
      .order('begin_date', { ascending: false });

    const topSources = new Map<string, { count: number; aligned: boolean }>();

    reports?.forEach((report: any) => {
      report.records?.forEach((record: any) => {
        const existing = topSources.get(record.source_ip) || {
          count: 0,
          aligned: false,
        };
        existing.count += record.count;
        existing.aligned =
          existing.aligned || (record.dkim_aligned && record.spf_aligned);
        topSources.set(record.source_ip, existing);
      });
    });

    const topSourcesArray = Array.from(topSources.entries())
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        aligned: data.aligned,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalVolume = dailyStats?.reduce((sum, day) => sum + day.total, 0) || 0;
    const totalAligned =
      dailyStats?.reduce((sum, day) => sum + day.pass_aligned, 0) || 0;
    const alignmentRate =
      totalVolume > 0 ? Math.round((totalAligned / totalVolume) * 100) : 0;

    return NextResponse.json({
      dailyStats: dailyStats || [],
      topSources: topSourcesArray,
      summary: {
        totalVolume,
        totalAligned,
        alignmentRate,
        reportCount: reports?.length || 0,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
