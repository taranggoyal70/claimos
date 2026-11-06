import { randomUUID } from 'node:crypto';

const API_BASE = process.env.VETTA_API_BASE_URL || 'https://api.vetta.sh';
const ALLOWED_VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']);

export async function POST(request) {
  const apiKey = process.env.VETTA_API_KEY;
  if (!apiKey) return Response.json({ error: 'naive_not_configured' }, { status: 503 });

  try {
    const body = await request.json();
    const text = String(body.text || '').trim();
    const voice = ALLOWED_VOICES.has(body.voice) ? body.voice : 'coral';
    const speed = Math.max(0.5, Math.min(2, Number(body.speed || 1)));
    if (!text || text.length > 4096) return Response.json({ error: 'invalid_text' }, { status: 400 });

    const generated = await fetch(`${API_BASE}/v1/media/audio/speech`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      body: JSON.stringify({ text, model: 'tts/auto', voice, speed, format: 'wav' }),
    });
    if (!generated.ok) {
      console.error('Naive speech generation failed', generated.status);
      return Response.json({ error: 'naive_speech_failed' }, { status: generated.status });
    }

    const speech = await generated.json();
    const fileId = speech?.file?.id;
    if (!fileId) return Response.json({ error: 'naive_speech_missing_file' }, { status: 502 });

    const downloaded = await fetch(`${API_BASE}/v1/files/${encodeURIComponent(fileId)}?download=true`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!downloaded.ok) {
      console.error('Naive audio download failed', downloaded.status);
      return Response.json({ error: 'naive_audio_download_failed' }, { status: downloaded.status });
    }

    return new Response(await downloaded.arrayBuffer(), {
      headers: {
        'content-type': downloaded.headers.get('content-type') || 'audio/wav',
        'cache-control': 'private, max-age=3600',
        'x-naive-model': speech.model || 'unknown',
      },
    });
  } catch (error) {
    console.error('Claim OS voice proxy error', error);
    return Response.json({ error: 'voice_proxy_error' }, { status: 502 });
  }
}
