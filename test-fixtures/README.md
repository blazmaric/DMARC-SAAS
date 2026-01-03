# Test Fixtures

This directory contains sample files for testing and demonstrating the DMARC monitoring platform functionality.

## Files

### sample-dmarc-email.eml
**Purpose**: Sample DMARC report email message in RFC822 format

This file contains a complete DMARC aggregate report as it would be received via email from an email service provider (e.g., Google, Microsoft). It includes:
- Email headers (From, To, Subject, Date)
- MIME multipart structure
- Gzip-compressed XML attachment containing the DMARC report

**Usage**:
```bash
# Test the email ingestion endpoint
curl -X POST https://dmarc.m-host.si/api/ingest/email \
  -H "X-Ingest-Token: your-ingest-secret" \
  -H "Content-Type: message/rfc822" \
  --data-binary @sample-dmarc-email.eml
```

**Note**: Update the recipient address in the file to match your domain's RUA token before testing.

---

### sample-dmarc-report.xml
**Purpose**: Sample DMARC aggregate report in XML format

This is the raw XML structure of a DMARC aggregate report that would be extracted from the compressed attachment in the email. It demonstrates:
- Report metadata (organization, email, date range)
- Policy information (domain, DMARC policy settings)
- Authentication results (SPF and DKIM alignment)
- Individual record details (source IP, count, authentication results)

**Usage**: Can be used to test XML parsing logic independently of email ingestion.

---

### sample-dmarc-report.pdf
**Purpose**: Sample generated PDF report (preview of output)

This is an example of the PDF reports that the platform generates for customers. It demonstrates:
- Professional report layout and branding
- Domain and period information
- Summary statistics (total emails, aligned, failed, alignment rate)
- Top sending sources table with detailed breakdown
- Slovenian localization (default language)

**Features shown**:
- Domain: `primer.si`
- Period: 1-7 January 2026
- Total emails: 15,847
- Alignment rate: 94.2%
- 5 top sending sources with IP addresses

**Generated using**: `lib/pdf-generator.ts` with jsPDF and autoTable

**Languages supported**: Slovenian (sl) and English (en)

---

## Testing Workflow

1. **Email Ingestion**: Use `sample-dmarc-email.eml` to test the complete email → parsing → database flow
2. **XML Parsing**: Use `sample-dmarc-report.xml` to verify XML parsing logic
3. **PDF Generation**: Reference `sample-dmarc-report.pdf` to see expected PDF output format

## Data Privacy

All sample data uses:
- Example domains (e.g., `primer.si`)
- Reserved IP addresses from RFC 5737 (TEST-NET-1, TEST-NET-2, TEST-NET-3)
- Fictional email addresses and organization names

No real customer data is included in these fixtures.
