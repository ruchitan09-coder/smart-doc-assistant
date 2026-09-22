# Smart Document Assistant

A production-structured SaaS app: upload documents (PDF/DOCX/TXT/images), then chat
with them using a RAG (Retrieval-Augmented Generation) pipeline, with cited sources,
multi-document chat, global search, and full authentication.

**Read this section before anything else:** this README tells you exactly what is
fully implemented vs. lighter/starter-level, so you can accurately describe the
project (in a resume or an interview) without overstating it.

## What's fully implemented

- Email/password auth (sign up, sign in, forgot/reset password, logout) via Supabase Auth
- Protected routes via middleware (dashboard, documents, search, settings all require login)
- Document upload (PDF, DOCX, TXT, PNG/JPG) with file type + size validation
- Real processing pipeline: text extraction → chunking → embeddings → pgvector storage,
  with live status (Uploading → Processing → Ready → Failed)
- RAG chat with source citations (file + page), Markdown-formatted answers, suggested prompts
- Multi-document chat (select additional documents to include in one conversation)
- Global natural-language search across all of a user's documents
- Document management: search, filter by type, sort, rename, delete
- Custom-trained document classification model (10 categories), auto-run after
  processing and re-runnable from `/custom-model`, with confidence scores and
  a swappable local/remote backend — see "Custom-trained AI model" below
- Conversation history page (`/conversations`) — view, delete, and clear past chats
- Settings page: profile info, light/dark/system theme, account deletion
- Landing page with hero, features, how-it-works, security section, FAQ

## Custom-trained AI model (document classification)

Every document is automatically classified into one of 10 categories
(`invoice`, `contract`, `research_paper`, `resume`, `report`, `assignment`,
`policy`, `receipt`, `legal_document`, `business_document`) right after
processing finishes, with results visible on the **`/custom-model`** page
(model version, confidence breakdown, prediction history) and re-runnable
on demand. There are two ways this runs, controlled by one env var:

- **Local (default, no setup required):** `src/lib/classifier/` is a
  from-scratch TF-IDF + multinomial logistic regression classifier written
  in plain TypeScript. It trains itself in-process on server start (on the
  seed dataset in `src/lib/classifier/train-data.ts`) and needs no external
  service, GPU, or Python — it's what runs out of the box.
- **Remote (real trained model):** set `MODEL_API_URL` in `.env` to the URL
  of the FastAPI service in `ml/service/`, and the app will call it instead
  (`src/lib/classifier/remote.ts`), falling back to the local classifier if
  the service is unreachable. `ml/` is a full training pipeline:
  - `ml/data/sample_dataset.csv` — seed labeled dataset (swap in your own)
  - `ml/preprocessing/clean.py` — text cleaning
  - `ml/training/train_tfidf_baseline.py` — TF-IDF + scikit-learn LogisticRegression
  - `ml/training/train_transformer.py` — fine-tunes DistilBERT (or any HF model) via `transformers.Trainer`
  - `ml/evaluation/evaluate.py` — classification report + confusion matrix on held-out data
  - `ml/inference/predict.py` — CLI prediction for quick manual testing
  - `ml/service/main.py` — FastAPI service exposing `POST /predict`; auto-prefers a trained
    transformer, falls back to the TF-IDF baseline, then to a keyword heuristic if nothing
    has been trained yet, so the service always responds
  - `ml/service/Dockerfile` — deploy the service to any container host (Fly.io, Render, Railway, Cloud Run, etc.)

  ```bash
  pip install -r ml/requirements.txt
  python ml/training/train_tfidf_baseline.py          # fast baseline
  # or, for the real transformer model:
  python ml/training/train_transformer.py --epochs 4
  python ml/evaluation/evaluate.py                     # check accuracy before deploying

  pip install -r ml/service/requirements.txt
  uvicorn ml.service.main:app --host 0.0.0.0 --port 8000
  # then set MODEL_API_URL="http://localhost:8000" (or your deployed URL) in .env
  ```

  The bundled `ml/data/sample_dataset.csv` (a few dozen rows) is enough to
  prove the pipeline runs end-to-end — real accuracy on your own documents
  needs a larger labeled dataset (hundreds+ examples per class), especially
  for `train_transformer.py`.

Database: `ModelPrediction` (see `prisma/schema.prisma`) stores every
prediction — class, confidence, full score breakdown, model version/source —
so re-classifying after a model upgrade keeps history instead of overwriting it.

## Conversation history

The **`/conversations`** page lists every conversation (title, linked
documents, message count, last updated), lets you expand one to view the
full transcript with citations inline, delete a single conversation, or
clear all history. "New conversation" routes to `/documents` since a
conversation always starts by opening a document and asking a question.

## What's intentionally lighter (starter-level, not production-hardened)

- **OCR for images:** PNG/JPG uploads are accepted and stored, but text extraction
  from images is stubbed (returns empty text) rather than wired to an OCR engine.
  Adding Tesseract.js (or a cloud OCR API) into `src/lib/extract.ts` is a contained,
  drop-in addition.
- **Background jobs:** document processing runs as a direct internal API call
  triggered right after upload, not a real queue/worker (e.g. BullMQ, Inngest,
  Supabase Edge Functions). Fine for demo/portfolio use; a real production app
  would move this to a queue so large files don't tie up a request.
- **Row-Level Security:** authorization is enforced at the application layer —
  every API route checks that `document.ownerId === session.user.id` before
  reading/writing. Postgres RLS policies are not additionally configured here
  because Prisma connects directly to the database rather than through
  Supabase's PostgREST layer (which is what RLS's `auth.uid()` relies on). This
  is a legitimate documented gap, not an oversight — worth mentioning if asked.
- **Rate limiting:** not implemented. Adding it (e.g. Upstash Ratelimit on the
  `/api/chat` and `/api/documents` routes) is a small, well-scoped addition.
- **Tests:** one real Vitest unit test (`tests/chunk.test.ts`) and one Playwright
  end-to-end skeleton (`e2e/main-flow.spec.ts`, marked `.skip` until you point it
  at a seeded test account) are included as a starting structure, not a full suite.
- **Document viewer:** PDFs and images preview via an iframe using a signed
  Supabase Storage URL. DOCX/TXT don't have an inline preview yet (a download
  link is shown instead) — full in-browser DOCX rendering is a larger addition.

## Architecture

```
Sign up / Sign in (Supabase Auth)
        |
        v
Upload document -> Supabase Storage (private bucket)
        |
        v
POST /api/documents/:id/process
        |
        v
  Extract text (pdf-parse / mammoth / plain read)
        |
        v
  Chunk text (custom sliding-window chunker)
        |
        v
  Embed chunks locally (transformers.js, all-MiniLM-L6-v2, free, no API)
        |
        v
  Store chunks + embeddings in Postgres (pgvector column) via Prisma + raw SQL
        |
        v
User asks a question -> POST /api/chat
        |
        v
  Embed the question -> pgvector cosine similarity search
        |
        v
  Retrieved chunks -> Groq (free LLM API) generates the answer
        |
        v
  Answer + cited sources returned and shown in the chat UI
```

## Tech stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers (API routes), TypeScript
- **Database:** PostgreSQL (via Supabase) + Prisma ORM + pgvector
- **Auth:** Supabase Auth (email/password)
- **Storage:** Supabase Storage (private bucket, signed URLs)
- **Embeddings:** transformers.js running `all-MiniLM-L6-v2` locally — free, no API key
- **LLM:** Groq (free tier, no credit card) running `openai/gpt-oss-120b`
- **Testing:** Vitest (unit), Playwright (e2e skeleton)
- **Deployment target:** Vercel (app) + Supabase (database/auth/storage)

## Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) account
- A free [Groq](https://console.groq.com) API key (no credit card required)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once created, go to **Project Settings → Database → Connection string** and
   copy both the pooled ("Transaction" mode, port 6543) and direct ("Session"
   mode, port 5432) connection strings.
3. Go to **Project Settings → API** and copy the Project URL, `anon` public
   key, and `service_role` secret key.

### 3. Enable pgvector

In the Supabase dashboard, go to **Database → Extensions**, search for
`vector`, and enable it. (The migration in `prisma/migrations/0_enable_pgvector`
also does this automatically the first time you run `prisma migrate dev`, but
enabling it via the dashboard first avoids permission issues on some plans.)

### 4. Create a storage bucket

In the Supabase dashboard, go to **Storage → New bucket**. Name it `documents`
and set it to **private** (not public) — the app accesses files through
signed URLs and the service role key, never a public URL.

### 5. Configure environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GROQ_API_KEY`
from the values you copied above.

### 6. Run database migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 7. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, confirm your
email (check your inbox — Supabase sends a real confirmation email by
default), sign in, and upload a document.

## Running tests

```bash
npm run test        # Vitest unit tests
npm run test:e2e     # Playwright e2e (skipped by default -- see e2e/main-flow.spec.ts)
```

## Production build

```bash
npm run build
npm run start
```

## Deployment (Vercel + Supabase)

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com).
3. Add all variables from `.env.example` as Vercel Environment Variables
   (Project Settings → Environment Variables), using your Supabase project's
   real values.
4. Set `NEXT_PUBLIC_SITE_URL` to your Vercel deployment URL.
5. In Supabase → Authentication → URL Configuration, add your Vercel URL as
   an allowed redirect URL (needed for email confirmation / password reset links).
6. Deploy. Run `npx prisma migrate deploy` (pointed at your production
   `DATABASE_URL`) once to apply migrations to the production database.

## Security considerations

- API keys (Groq, Supabase service role) are only ever read server-side
  (`process.env` in Route Handlers) — never exposed to the browser.
- Uploaded files live in a private Storage bucket; the app only ever hands
  out short-lived signed URLs, never public links.
- Every API route checks `document.ownerId === session.user.id` (or the
  equivalent for conversations) before returning or mutating data.
- User-uploaded document content is treated as untrusted input in the AI
  prompt: the system prompt explicitly instructs the model to ignore any
  instructions embedded in retrieved document text (a prompt-injection guard —
  see `src/lib/groq.ts`).
- Passwords are never handled directly by this app's code — Supabase Auth
  manages hashing, sessions, and password resets.

## Known limitations (see above for full list)

OCR, background job queues, Postgres RLS, rate limiting, and a complete test
suite are the main gaps between this and a fully production-hardened version —
each is called out above with what a real fix would involve.
