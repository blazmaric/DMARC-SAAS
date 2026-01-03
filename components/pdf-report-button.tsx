'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PdfReportButtonProps {
  domainId: string;
  domainName: string;
}

export function PdfReportButton({
  domainId,
  domainName,
}: PdfReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const downloadReport = async (days: number, locale: 'sl' | 'en') => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/domains/${domainId}/report?days=${days}&locale=${locale}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dmarc-report-${domainName}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Download Report
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select Period</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => downloadReport(7, 'sl')}>
          Last 7 days (Slovenian)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadReport(30, 'sl')}>
          Last 30 days (Slovenian)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadReport(90, 'sl')}>
          Last 90 days (Slovenian)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => downloadReport(7, 'en')}>
          Last 7 days (English)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadReport(30, 'en')}>
          Last 30 days (English)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadReport(90, 'en')}>
          Last 90 days (English)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
