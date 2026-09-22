-- Enable the pgvector extension (Supabase supports this out of the box).
-- Must run before Prisma creates the DocumentChunk table's vector column.
CREATE EXTENSION IF NOT EXISTS vector;
