-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "domain_name" TEXT NOT NULL,
    "rua_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dmarc_reports" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "org_name" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "begin_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dmarc_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dmarc_records" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "source_ip" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "disposition" TEXT NOT NULL,
    "dkim_result" TEXT NOT NULL,
    "spf_result" TEXT NOT NULL,
    "dkim_aligned" BOOLEAN NOT NULL DEFAULT false,
    "spf_aligned" BOOLEAN NOT NULL DEFAULT false,
    "header_from" TEXT NOT NULL,
    "envelope_from" TEXT,

    CONSTRAINT "dmarc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_aggregates" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "pass_aligned" INTEGER NOT NULL DEFAULT 0,
    "fail_aligned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "domains_rua_token_key" ON "domains"("rua_token");

-- CreateIndex
CREATE INDEX "domains_customer_id_idx" ON "domains"("customer_id");

-- CreateIndex
CREATE INDEX "domains_rua_token_idx" ON "domains"("rua_token");

-- CreateIndex
CREATE INDEX "dmarc_reports_domain_id_idx" ON "dmarc_reports"("domain_id");

-- CreateIndex
CREATE INDEX "dmarc_reports_begin_date_end_date_idx" ON "dmarc_reports"("begin_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "dmarc_reports_domain_id_org_name_report_id_begin_date_end__key" ON "dmarc_reports"("domain_id", "org_name", "report_id", "begin_date", "end_date");

-- CreateIndex
CREATE INDEX "dmarc_records_report_id_idx" ON "dmarc_records"("report_id");

-- CreateIndex
CREATE INDEX "dmarc_records_source_ip_idx" ON "dmarc_records"("source_ip");

-- CreateIndex
CREATE INDEX "daily_aggregates_domain_id_date_idx" ON "daily_aggregates"("domain_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_aggregates_domain_id_date_key" ON "daily_aggregates"("domain_id", "date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dmarc_reports" ADD CONSTRAINT "dmarc_reports_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dmarc_records" ADD CONSTRAINT "dmarc_records_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "dmarc_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_aggregates" ADD CONSTRAINT "daily_aggregates_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
