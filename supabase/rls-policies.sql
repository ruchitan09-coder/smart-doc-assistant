-- Row-Level Security policies for Smart Document Assistant.
--
-- IMPORTANT -- read this before running it:
-- This app's API routes use Prisma, connected via DATABASE_URL/DIRECT_URL,
-- which authenticates as a privileged Postgres role (not the per-request,
-- JWT-scoped "authenticated" role Supabase's own client/PostgREST uses).
-- RLS policies do not apply to a privileged role's queries by default, so
-- enabling RLS here will NOT add protection to the existing Prisma-based
-- API routes -- those are already protected by the explicit
-- `ownerId === session.user.id` checks in every route handler, and that
-- remains the real access-control layer for this app today.
--
-- What this migration IS for: defense-in-depth for any *other* way this
-- database might get queried in the future -- e.g. if you ever add
-- Supabase Realtime subscriptions, call the Supabase JS client directly
-- from a client component with the anon key, or expose PostgREST. In any
-- of those cases, these policies make sure a user can only ever see their
-- own rows, even if an app-layer check is missed. It's cheap insurance,
-- not a replacement for the existing ownerId checks.
--
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- It's plain SQL, not a Prisma migration, because Prisma doesn't model RLS
-- policies -- keep it here rather than in prisma/migrations so `prisma
-- migrate dev` doesn't try to manage or revert it.

alter table "User" enable row level security;
alter table "Document" enable row level security;
alter table "DocumentChunk" enable row level security;
alter table "Conversation" enable row level security;
alter table "ConversationDocument" enable row level security;
alter table "Message" enable row level security;
alter table "SourceReference" enable row level security;
alter table "ModelPrediction" enable row level security;
alter table "ProcessingJob" enable row level security;

-- User: a user can only see/update their own row.
drop policy if exists "user_is_self" on "User";
create policy "user_is_self" on "User"
  for all using (auth.uid()::text = id) with check (auth.uid()::text = id);

-- Document: owner only.
drop policy if exists "document_owner_only" on "Document";
create policy "document_owner_only" on "Document"
  for all using (auth.uid()::text = "ownerId") with check (auth.uid()::text = "ownerId");

-- DocumentChunk: via the parent document's owner.
drop policy if exists "chunk_owner_only" on "DocumentChunk";
create policy "chunk_owner_only" on "DocumentChunk"
  for all using (
    exists (
      select 1 from "Document" d
      where d.id = "DocumentChunk"."documentId" and d."ownerId" = auth.uid()::text
    )
  );

-- Conversation: owner only.
drop policy if exists "conversation_owner_only" on "Conversation";
create policy "conversation_owner_only" on "Conversation"
  for all using (auth.uid()::text = "ownerId") with check (auth.uid()::text = "ownerId");

-- ConversationDocument: via the parent conversation's owner.
drop policy if exists "conversation_document_owner_only" on "ConversationDocument";
create policy "conversation_document_owner_only" on "ConversationDocument"
  for all using (
    exists (
      select 1 from "Conversation" c
      where c.id = "ConversationDocument"."conversationId" and c."ownerId" = auth.uid()::text
    )
  );

-- Message: via the parent conversation's owner.
drop policy if exists "message_owner_only" on "Message";
create policy "message_owner_only" on "Message"
  for all using (
    exists (
      select 1 from "Conversation" c
      where c.id = "Message"."conversationId" and c."ownerId" = auth.uid()::text
    )
  );

-- SourceReference: via the parent message's conversation's owner.
drop policy if exists "source_reference_owner_only" on "SourceReference";
create policy "source_reference_owner_only" on "SourceReference"
  for all using (
    exists (
      select 1 from "Message" m
      join "Conversation" c on c.id = m."conversationId"
      where m.id = "SourceReference"."messageId" and c."ownerId" = auth.uid()::text
    )
  );

-- ModelPrediction: via the parent document's owner.
drop policy if exists "model_prediction_owner_only" on "ModelPrediction";
create policy "model_prediction_owner_only" on "ModelPrediction"
  for all using (
    exists (
      select 1 from "Document" d
      where d.id = "ModelPrediction"."documentId" and d."ownerId" = auth.uid()::text
    )
  );

-- ProcessingJob: via the parent document's owner.
drop policy if exists "processing_job_owner_only" on "ProcessingJob";
create policy "processing_job_owner_only" on "ProcessingJob"
  for all using (
    exists (
      select 1 from "Document" d
      where d.id = "ProcessingJob"."documentId" and d."ownerId" = auth.uid()::text
    )
  );

-- RateLimitBucket intentionally has no policy / RLS enabled: it holds no
-- user-readable data (just a key and a count) and is never queried through
-- anything but the trusted Prisma connection.
