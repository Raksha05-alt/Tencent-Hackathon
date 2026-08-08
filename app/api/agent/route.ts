import { runLiveAgent } from '../../../lib/agent/loop';

export const dynamic = 'force-dynamic';

/** SSE endpoint for live agent runs. The demo defaults to client-side replay;
 *  this route only activates when ANTHROPIC_API_KEY is configured. */
export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'live mode unavailable: no ANTHROPIC_API_KEY configured; use replay' },
      { status: 503 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runLiveAgent()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
