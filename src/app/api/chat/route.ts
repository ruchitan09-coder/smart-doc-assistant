import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { embedQuery } from "@/lib/embeddings";
import { findRelevantChunks } from "@/lib/vector";
import { generateAnswerStream } from "@/lib/groq";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { enforceRateLimit, RateLimitExceededError } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Delimiter separating the streamed answer text from the trailing sources
// JSON payload. Chosen to be effectively impossible for the LLM to produce
// in normal Markdown output. Keep this in sync with the frontend parser in
// src/components/chat-panel.tsx.
const SOURCES_DELIMITER = "\u0000__SOURCES__\u0000";

function jsonError(message: string, status: number, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

// POST /api/chat
// body: { question: string, documentIds: string[], conversationId?: string }
// Streams the answer as plain text chunks (so the UI can render it
// incrementally), followed by SOURCES_DELIMITER + a JSON payload of
// { conversationId, sources, messageId } once generation finishes. The
// conversationId is also returned early via the X-Conversation-Id response
// header, in case the client wants it before the stream completes.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);
  await getOrCreateUser(user);

  // 20 questions per minute per user -- generous for real use, cheap
  // insurance against a script looping requests against the (paid-at-scale)
  // Groq API.
  try {
    await enforceRateLimit(`chat:${user.id}`, 20, 60);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return jsonError(
        "You're sending messages too quickly. Please wait a moment and try again.",
        429,
        { "Retry-After": String(err.result.retryAfterSeconds) }
      );
    }
    throw err;
  }

  const { question, documentIds, conversationId } = await request.json();

  if (!question || typeof question !== "string") {
    return jsonError("question is required", 400);
  }
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return jsonError("documentIds must be a non-empty array", 400);
  }

  // Enforce ownership: only search within documents this user actually owns.
  const ownedDocs = await prisma.document.findMany({
    where: { id: { in: documentIds }, ownerId: user.id },
    select: { id: true },
  });
  const ownedIds = ownedDocs.map((d) => d.id);
  if (ownedIds.length === 0) {
    return jsonError("No accessible documents found", 403);
  }

  let conversation = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, ownerId: user.id } })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        ownerId: user.id,
        title: question.slice(0, 60),
        conversationDocs: { create: ownedIds.map((documentId) => ({ documentId })) },
      },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "USER", content: question },
  });

  const queryEmbedding = await embedQuery(question);
  const retrieved = await findRelevantChunks(queryEmbedding, ownedIds, 6);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (retrieved.length === 0) {
          const noInfoAnswer =
            "I couldn't find any relevant information in the selected document(s) to answer that.";
          controller.enqueue(encoder.encode(noInfoAnswer));

          const assistantMessage = await prisma.message.create({
            data: { conversationId: conversation!.id, role: "ASSISTANT", content: noInfoAnswer },
          });

          controller.enqueue(
            encoder.encode(
              `${SOURCES_DELIMITER}${JSON.stringify({
                conversationId: conversation!.id,
                sources: [],
                messageId: assistantMessage.id,
              })}`
            )
          );
          controller.close();
          return;
        }

        const context = retrieved
          .map((r) => `[${r.fileName}${r.pageNumber ? `, page ${r.pageNumber}` : ""}]\n${r.content}`)
          .join("\n\n---\n\n");

        let fullAnswer = "";
        for await (const delta of generateAnswerStream(question, context)) {
          fullAnswer += delta;
          controller.enqueue(encoder.encode(delta));
        }

        if (!fullAnswer) fullAnswer = "No response generated.";

        const assistantMessage = await prisma.message.create({
          data: { conversationId: conversation!.id, role: "ASSISTANT", content: fullAnswer },
        });

        await prisma.sourceReference.createMany({
          data: retrieved.map((r) => ({
            messageId: assistantMessage.id,
            documentId: r.documentId,
            chunkId: r.id,
            pageNumber: r.pageNumber,
            excerpt: r.content.slice(0, 300),
          })),
        });

        controller.enqueue(
          encoder.encode(
            `${SOURCES_DELIMITER}${JSON.stringify({
              conversationId: conversation!.id,
              sources: retrieved.map((r) => ({
                documentId: r.documentId,
                fileName: r.fileName,
                pageNumber: r.pageNumber,
                excerpt: r.content.slice(0, 300),
              })),
              messageId: assistantMessage.id,
            })}`
          )
        );
        controller.close();
      } catch (err) {
        // Persist what we can even on a mid-stream failure, so the
        // conversation history isn't left silently inconsistent.
        const message = "\n\n⚠️ Something went wrong while generating this answer.";
        controller.enqueue(encoder.encode(message));
        await prisma.message
          .create({
            data: {
              conversationId: conversation!.id,
              role: "ASSISTANT",
              content: `[Generation failed: ${err instanceof Error ? err.message : "unknown error"}]`,
            },
          })
          .catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversation-Id": conversation.id,
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
