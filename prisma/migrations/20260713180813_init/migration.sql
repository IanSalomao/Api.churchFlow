-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateTable
CREATE TABLE "church" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "cnpj" TEXT,
    "denomination" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "church_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "church_members" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" DATE,
    "baptism_date" DATE,
    "email" TEXT,
    "phone" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "church_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "church_ministries" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "responsible_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "church_ministries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "church_transaction_categories" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TransactionType" NOT NULL,
    "color" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "church_transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "member_id" UUID,
    "ministry_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "church_reports" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "file_path" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "church_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "church_members_church_id_idx" ON "church_members"("church_id");

-- CreateIndex
CREATE INDEX "church_ministries_church_id_idx" ON "church_ministries"("church_id");

-- CreateIndex
CREATE INDEX "church_transaction_categories_church_id_idx" ON "church_transaction_categories"("church_id");

-- CreateIndex
CREATE INDEX "transaction_church_id_date_idx" ON "transaction"("church_id", "date");

-- CreateIndex
CREATE INDEX "church_reports_church_id_idx" ON "church_reports"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_key" ON "password_reset_token"("token");

-- CreateIndex
CREATE INDEX "password_reset_token_church_id_idx" ON "password_reset_token"("church_id");

-- AddForeignKey
ALTER TABLE "church_members" ADD CONSTRAINT "church_members_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_ministries" ADD CONSTRAINT "church_ministries_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_ministries" ADD CONSTRAINT "church_ministries_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "church_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_transaction_categories" ADD CONSTRAINT "church_transaction_categories_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "church_transaction_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "church_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "church_ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_reports" ADD CONSTRAINT "church_reports_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (manual): email único apenas entre igrejas ativas — após a
-- exclusão (soft delete) da conta, o mesmo e-mail pode criar uma conta nova.
CREATE UNIQUE INDEX "church_email_active_key" ON "church"("email") WHERE "deleted_at" IS NULL;
