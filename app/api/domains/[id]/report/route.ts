import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateReportBuffer } from '@/lib/pdf-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get('locale') || 'sl') as 'sl' | 'en';
    const days = parseInt(searchParams.get('days') || '30', 10);

    const domain = await prisma.domain.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    if (user.role === 'customer' && domain.customerId !== user.customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const aggregates = await prisma.dailyAggregate.findMany({
      where: {
        domainId: id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const totalEmails = aggregates.reduce((sum, agg) => sum + agg.total, 0);
    const alignedEmails = aggregates.reduce(
      (sum, agg) => sum + agg.passAligned,
      0
    );
    const failedEmails = aggregates.reduce(
      (sum, agg) => sum + agg.failAligned,
      0
    );
    const alignmentRate =
      totalEmails > 0 ? (alignedEmails / totalEmails) * 100 : 0;

    const reports = await prisma.dmarcReport.findMany({
      where: {
        domainId: id,
        beginDate: {
          gte: startDate,
        },
      },
      include: {
        records: true,
      },
    });

    const sourceMap = new Map<
      string,
      { count: number; aligned: number; failed: number }
    >();

    reports.forEach((report) => {
      report.records.forEach((record) => {
        const existing = sourceMap.get(record.sourceIp) || {
          count: 0,
          aligned: 0,
          failed: 0,
        };
        existing.count += record.count;
        if (record.dkimAligned && record.spfAligned) {
          existing.aligned += record.count;
        } else {
          existing.failed += record.count;
        }
        sourceMap.set(record.sourceIp, existing);
      });
    });

    const topSources = Array.from(sourceMap.entries())
      .map(([ip, stats]) => ({
        ip,
        count: stats.count,
        aligned: stats.aligned,
        failed: stats.failed,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const reportData = {
      domain: domain.domainName,
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalEmails,
        alignedEmails,
        failedEmails,
        alignmentRate,
      },
      topSources,
      reportsReceived: reports.length,
    };

    const pdfBuffer = generateReportBuffer(reportData, locale);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dmarc-report-${domain.domainName}-${startDate.toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
