import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const { id: domainId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    if (user.role === 'customer' && user.customerId !== domain.customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyStats = await prisma.dailyAggregate.findMany({
      where: {
        domainId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const reports = await prisma.dmarcReport.findMany({
      where: {
        domainId,
        beginDate: { gte: startDate },
      },
      include: { records: true },
      orderBy: { beginDate: 'desc' },
    });

    const topSources = new Map<string, { count: number; aligned: boolean }>();

    reports?.forEach((report: any) => {
      report.records?.forEach((record: any) => {
        const existing = topSources.get(record.sourceIp) || {
          count: 0,
          aligned: false,
        };
        existing.count += record.count;
        existing.aligned =
          existing.aligned || (record.dkimAligned && record.spfAligned);
        topSources.set(record.sourceIp, existing);
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
      dailyStats?.reduce((sum, day) => sum + day.passAligned, 0) || 0;
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
