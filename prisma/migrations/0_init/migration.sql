-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER ADMIN', 'ADMIN', 'MANAGER', 'USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED', 'PENDING', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL', 'PHONE', 'ADVERTISEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('NEW_OPPORTUNITY', 'DISCOVERY_SCHEDULED', 'DISCOVERY_COMPLETED', 'PROPOSAL_PREP', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONTRACT_SENT', 'CONTRACT_SIGNED', 'PROJECT_KICKOFF', 'ON_HOLD', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'TASK', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "FinanceType" AS ENUM ('CASH_IN', 'CASH_OUT', 'RECEIVABLE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PROPOSAL', 'CONTRACT', 'INVOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('STANDARD', 'CUSTOM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('CAPABILITY', 'MODULE', 'SECURITY');

-- CreateEnum
CREATE TYPE "FeatureStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LimitType" AS ENUM ('COUNT', 'STORAGE', 'USERS', 'API_CALLS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'CANCELED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionItemType" AS ENUM ('BASE_PLAN', 'ADDON', 'FEATURE', 'USAGE');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('STRIPE', 'RAZORPAY', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "BillingCustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'BANK_TRANSFER', 'UPI', 'WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('CREATED', 'ACTIVATED', 'TRIAL_STARTED', 'TRIAL_ENDED', 'PLAN_CHANGED', 'RENEWED', 'PAST_DUE', 'GRACE_PERIOD_STARTED', 'CANCELED', 'EXPIRED', 'SUSPENDED', 'REACTIVATED', 'UPDATED');

-- CreateEnum
CREATE TYPE "SubscriptionActorType" AS ENUM ('SYSTEM', 'USER', 'ADMIN', 'PROVIDER');

-- CreateEnum
CREATE TYPE "SubscriptionEventSource" AS ENUM ('SYSTEM', 'USER', 'ADMIN', 'STRIPE', 'RAZORPAY', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('CONSUMPTION', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "BillingWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "company" TEXT,
    "company_id" UUID,
    "phone" TEXT,
    "department" TEXT,
    "category" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "modules" JSONB,
    "created_by" TEXT,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource",
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "value" DECIMAL(14,2),
    "notes" TEXT,
    "user_id" UUID NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "lead_id" UUID,
    "name" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'NEW_OPPORTUNITY',
    "probability" INTEGER,
    "expected_close_date" TIMESTAMP(3),
    "notes" TEXT,
    "user_id" UUID NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "lead_id" UUID,
    "deal_id" UUID,
    "user_id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "subject" TEXT,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_status_histories" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "user_id" UUID,
    "activity_id" UUID,
    "from_status" "LeadStatus",
    "to_status" "LeadStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_payments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finances" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "deal_id" UUID,
    "type" "FinanceType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB,
    "status" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "deal_id" UUID,
    "uploaded_by" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mime_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eod_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "report_date" TIMESTAMP(3) NOT NULL,
    "content" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eod_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" UUID,
    "company_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_sessions" (
    "user_id" UUID NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "active_sessions_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "plan_type" "PlanType" NOT NULL DEFAULT 'STANDARD',
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "billing_interval" "BillingInterval" NOT NULL DEFAULT 'MONTH',
    "billing_interval_count" INTEGER NOT NULL DEFAULT 1,
    "currency" CHAR(3) NOT NULL,
    "base_price" DECIMAL(14,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "feature_type" "FeatureType" NOT NULL,
    "status" "FeatureStatus" NOT NULL DEFAULT 'ACTIVE',
    "module" TEXT,
    "resource" TEXT,
    "action" TEXT,
    "is_metered" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "configuration_schema" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "limit_value" BIGINT,
    "limit_type" "LimitType",
    "configuration" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "started_at" TIMESTAMP(3),
    "trial_starts_at" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_plan_id" UUID,
    "scheduled_change_at" TIMESTAMP(3),
    "currency" CHAR(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "provider" "BillingProvider",
    "provider_subscription_id" TEXT,
    "version" BIGINT NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "feature_id" UUID,
    "billing_price_id" UUID,
    "item_type" "SubscriptionItemType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(14,2),
    "currency" CHAR(3),
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "event_type" "SubscriptionEventType" NOT NULL,
    "previous_plan_id" UUID,
    "new_plan_id" UUID,
    "previous_status" "SubscriptionStatus",
    "new_status" "SubscriptionStatus",
    "effective_at" TIMESTAMP(3) NOT NULL,
    "actor_type" "SubscriptionActorType" NOT NULL,
    "actor_id" UUID,
    "source" "SubscriptionEventSource" NOT NULL,
    "provider_event_id" TEXT,
    "request_id" TEXT,
    "reason" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_entitlement_overrides" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "enabled" BOOLEAN,
    "limit_value" BIGINT,
    "configuration" JSONB,
    "reason" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_entitlement_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "provider_customer_id" TEXT NOT NULL,
    "email" TEXT,
    "currency" CHAR(3),
    "status" "BillingCustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_prices" (
    "id" UUID NOT NULL,
    "plan_id" UUID,
    "feature_id" UUID,
    "provider" "BillingProvider" NOT NULL,
    "provider_product_id" TEXT,
    "provider_price_id" TEXT,
    "currency" CHAR(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "billing_interval" "BillingInterval" NOT NULL,
    "billing_interval_count" INTEGER NOT NULL DEFAULT 1,
    "pricing_model" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "billing_customer_id" UUID NOT NULL,
    "billing_price_id" UUID NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "provider_subscription_id" TEXT NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL,
    "provider_current_period_start" TIMESTAMP(3),
    "provider_current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "subscription_id" UUID,
    "billing_customer_id" UUID NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "provider_invoice_id" TEXT NOT NULL,
    "invoice_number" TEXT,
    "status" "InvoiceStatus" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "amount_paid" DECIMAL(14,2) NOT NULL,
    "amount_due" DECIMAL(14,2) NOT NULL,
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "invoice_id" UUID,
    "subscription_id" UUID,
    "provider" "BillingProvider" NOT NULL,
    "provider_payment_id" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "payment_method_id" UUID,
    "failure_code" TEXT,
    "failure_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL,
    "billing_customer_id" UUID NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "provider_payment_method_id" TEXT NOT NULL,
    "method_type" "PaymentMethodType" NOT NULL,
    "card_brand" TEXT,
    "card_last4" TEXT,
    "card_exp_month" INTEGER,
    "card_exp_year" INTEGER,
    "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_webhook_events" (
    "id" UUID NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" "BillingWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "signature_verified" BOOLEAN NOT NULL DEFAULT false,
    "payload_hash" TEXT,
    "payload" JSONB NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "subscription_id" UUID,
    "feature_id" UUID NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "usage_value" BIGINT NOT NULL DEFAULT 0,
    "limit_value" BIGINT,
    "version" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "subscription_id" UUID,
    "feature_id" UUID NOT NULL,
    "user_id" UUID,
    "quantity" BIGINT NOT NULL DEFAULT 1,
    "event_type" "UsageEventType" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_company_id_status_idx" ON "users"("company_id", "status");

-- CreateIndex
CREATE INDEX "leads_company_id_idx" ON "leads"("company_id");

-- CreateIndex
CREATE INDEX "leads_company_id_status_idx" ON "leads"("company_id", "status");

-- CreateIndex
CREATE INDEX "leads_user_id_idx" ON "leads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_company_id_email_key" ON "leads"("company_id", "email");

-- CreateIndex
CREATE INDEX "deals_company_id_idx" ON "deals"("company_id");

-- CreateIndex
CREATE INDEX "deals_company_id_stage_idx" ON "deals"("company_id", "stage");

-- CreateIndex
CREATE INDEX "deals_lead_id_idx" ON "deals"("lead_id");

-- CreateIndex
CREATE INDEX "deals_user_id_idx" ON "deals"("user_id");

-- CreateIndex
CREATE INDEX "activities_company_id_idx" ON "activities"("company_id");

-- CreateIndex
CREATE INDEX "activities_company_id_type_idx" ON "activities"("company_id", "type");

-- CreateIndex
CREATE INDEX "activities_deal_id_idx" ON "activities"("deal_id");

-- CreateIndex
CREATE INDEX "activities_lead_id_idx" ON "activities"("lead_id");

-- CreateIndex
CREATE INDEX "activities_user_id_idx" ON "activities"("user_id");

-- CreateIndex
CREATE INDEX "lead_status_histories_company_id_idx" ON "lead_status_histories"("company_id");

-- CreateIndex
CREATE INDEX "lead_status_histories_lead_id_idx" ON "lead_status_histories"("lead_id");

-- CreateIndex
CREATE INDEX "lead_status_histories_user_id_idx" ON "lead_status_histories"("user_id");

-- CreateIndex
CREATE INDEX "lead_payments_lead_id_idx" ON "lead_payments"("lead_id");

-- CreateIndex
CREATE INDEX "lead_payments_company_id_idx" ON "lead_payments"("company_id");

-- CreateIndex
CREATE INDEX "finances_deal_id_idx" ON "finances"("deal_id");

-- CreateIndex
CREATE INDEX "finances_company_id_idx" ON "finances"("company_id");

-- CreateIndex
CREATE INDEX "finances_company_id_type_idx" ON "finances"("company_id", "type");

-- CreateIndex
CREATE INDEX "documents_deal_id_idx" ON "documents"("deal_id");

-- CreateIndex
CREATE INDEX "documents_company_id_idx" ON "documents"("company_id");

-- CreateIndex
CREATE INDEX "documents_uploaded_by_idx" ON "documents"("uploaded_by");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "system_configs_key_idx" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "invitation_tokens_company_id_idx" ON "invitation_tokens"("company_id");

-- CreateIndex
CREATE INDEX "invitation_tokens_expires_at_idx" ON "invitation_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "invitation_tokens_email_idx" ON "invitation_tokens"("email");

-- CreateIndex
CREATE INDEX "invitation_tokens_user_id_idx" ON "invitation_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "plans_status_display_order_idx" ON "plans"("status", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "features_code_key" ON "features"("code");

-- CreateIndex
CREATE INDEX "features_status_idx" ON "features"("status");

-- CreateIndex
CREATE INDEX "features_module_idx" ON "features"("module");

-- CreateIndex
CREATE INDEX "plan_features_feature_id_idx" ON "plan_features"("feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_plan_id_feature_id_key" ON "plan_features"("plan_id", "feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_company_id_key" ON "subscriptions"("company_id");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_provider_provider_subscription_id_key" ON "subscriptions"("provider", "provider_subscription_id");

-- CreateIndex
CREATE INDEX "subscription_items_subscription_id_idx" ON "subscription_items"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_items_feature_id_idx" ON "subscription_items"("feature_id");

-- CreateIndex
CREATE INDEX "subscription_items_billing_price_id_idx" ON "subscription_items"("billing_price_id");

-- CreateIndex
CREATE INDEX "subscription_events_company_id_created_at_idx" ON "subscription_events"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "subscription_events_subscription_id_effective_at_idx" ON "subscription_events"("subscription_id", "effective_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_events_source_provider_event_id_key" ON "subscription_events"("source", "provider_event_id");

-- CreateIndex
CREATE INDEX "subscription_entitlement_overrides_feature_id_idx" ON "subscription_entitlement_overrides"("feature_id");

-- CreateIndex
CREATE INDEX "subscription_entitlement_overrides_starts_at_ends_at_idx" ON "subscription_entitlement_overrides"("starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_entitlement_overrides_subscription_id_feature_id_k" ON "subscription_entitlement_overrides"("subscription_id", "feature_id");

-- CreateIndex
CREATE INDEX "billing_customers_company_id_idx" ON "billing_customers"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_provider_provider_customer_id_key" ON "billing_customers"("provider", "provider_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_company_id_provider_key" ON "billing_customers"("company_id", "provider");

-- CreateIndex
CREATE INDEX "billing_prices_plan_id_idx" ON "billing_prices"("plan_id");

-- CreateIndex
CREATE INDEX "billing_prices_feature_id_idx" ON "billing_prices"("feature_id");

-- CreateIndex
CREATE INDEX "billing_prices_provider_is_active_idx" ON "billing_prices"("provider", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "billing_prices_provider_provider_price_id_key" ON "billing_prices"("provider", "provider_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_subscription_id_key" ON "billing_subscriptions"("subscription_id");

-- CreateIndex
CREATE INDEX "billing_subscriptions_billing_customer_id_idx" ON "billing_subscriptions"("billing_customer_id");

-- CreateIndex
CREATE INDEX "billing_subscriptions_billing_price_id_idx" ON "billing_subscriptions"("billing_price_id");

-- CreateIndex
CREATE INDEX "billing_subscriptions_status_idx" ON "billing_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_provider_provider_subscription_id_key" ON "billing_subscriptions"("provider", "provider_subscription_id");

-- CreateIndex
CREATE INDEX "invoices_subscription_id_idx" ON "invoices"("subscription_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_billing_customer_id_idx" ON "invoices"("billing_customer_id");

-- CreateIndex
CREATE INDEX "invoices_company_id_idx" ON "invoices"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_provider_provider_invoice_id_key" ON "invoices"("provider", "provider_invoice_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE INDEX "payments_company_id_idx" ON "payments"("company_id");

-- CreateIndex
CREATE INDEX "payments_payment_method_id_idx" ON "payments"("payment_method_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE INDEX "payment_methods_billing_customer_id_idx" ON "payment_methods"("billing_customer_id");

-- CreateIndex
CREATE INDEX "payment_methods_status_idx" ON "payment_methods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_provider_provider_payment_method_id_key" ON "payment_methods"("provider", "provider_payment_method_id");

-- CreateIndex
CREATE INDEX "billing_webhook_events_received_at_idx" ON "billing_webhook_events"("received_at");

-- CreateIndex
CREATE INDEX "billing_webhook_events_status_idx" ON "billing_webhook_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_provider_provider_event_id_key" ON "billing_webhook_events"("provider", "provider_event_id");

-- CreateIndex
CREATE INDEX "usage_counters_subscription_id_idx" ON "usage_counters"("subscription_id");

-- CreateIndex
CREATE INDEX "usage_counters_feature_id_idx" ON "usage_counters"("feature_id");

-- CreateIndex
CREATE INDEX "usage_counters_period_start_period_end_idx" ON "usage_counters"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_company_id_feature_id_period_start_period_end_ke" ON "usage_counters"("company_id", "feature_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "usage_events_user_id_idx" ON "usage_events"("user_id");

-- CreateIndex
CREATE INDEX "usage_events_feature_id_idx" ON "usage_events"("feature_id");

-- CreateIndex
CREATE INDEX "usage_events_occurred_at_idx" ON "usage_events"("occurred_at");

-- CreateIndex
CREATE INDEX "usage_events_subscription_id_idx" ON "usage_events"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_events_company_id_idempotency_key_key" ON "usage_events"("company_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "follow_ups_company_id_idx" ON "follow_ups"("company_id");

-- CreateIndex
CREATE INDEX "follow_ups_lead_id_idx" ON "follow_ups"("lead_id");

-- CreateIndex
CREATE INDEX "follow_ups_status_scheduled_at_idx" ON "follow_ups"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "follow_ups_user_id_idx" ON "follow_ups"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_status_histories" ADD CONSTRAINT "lead_status_histories_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_status_histories" ADD CONSTRAINT "lead_status_histories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_status_histories" ADD CONSTRAINT "lead_status_histories_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_status_histories" ADD CONSTRAINT "lead_status_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_payments" ADD CONSTRAINT "lead_payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_payments" ADD CONSTRAINT "lead_payments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances" ADD CONSTRAINT "finances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances" ADD CONSTRAINT "finances_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_scheduled_plan_id_fkey" FOREIGN KEY ("scheduled_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_billing_price_id_fkey" FOREIGN KEY ("billing_price_id") REFERENCES "billing_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_new_plan_id_fkey" FOREIGN KEY ("new_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_previous_plan_id_fkey" FOREIGN KEY ("previous_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_entitlement_overrides" ADD CONSTRAINT "subscription_entitlement_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_entitlement_overrides" ADD CONSTRAINT "subscription_entitlement_overrides_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_entitlement_overrides" ADD CONSTRAINT "subscription_entitlement_overrides_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_prices" ADD CONSTRAINT "billing_prices_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_prices" ADD CONSTRAINT "billing_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billing_price_id_fkey" FOREIGN KEY ("billing_price_id") REFERENCES "billing_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "billing_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

