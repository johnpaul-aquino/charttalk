-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL DEFAULT 'New Conversation',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "chart_id" TEXT,
    "chart_url" VARCHAR(2000),
    "chart_symbol" VARCHAR(50),
    "chart_interval" VARCHAR(10),
    "tokens_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_user_id_last_message_at_idx" ON "conversations"("user_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_user_id_is_archived_idx" ON "conversations"("user_id", "is_archived");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
