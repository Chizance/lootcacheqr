// Supabase Edge Function: extract-items
//
// Runs server-side only. Receives a base64 photo of an open box, asks Claude
// to draft a list of visible items, and returns that list plus a rough cost
// estimate. The Anthropic API key lives in this function's environment
// (set via `supabase secrets set`) and is never sent to or readable from the
// browser — see docs/CLAUDE_API_KEY.md for the full walkthrough.
//
// Deploy with: supabase functions deploy extract-items
// This function requires a logged-in Supabase session (the default —
// do NOT deploy with --no-verify-jwt), so only your two accounts can call it.

import Anthropic from 'npm:@anthropic-ai/sdk'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

// Claude Sonnet 5 standard pricing, per million tokens. Used only to show a
// rough cost estimate in the UI — not billed through this app in any way.
const INPUT_COST_PER_MTOK = 3.0
const OUTPUT_COST_PER_MTOK = 15.0

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set on this Edge Function.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const { image, mediaType } = await req.json()
    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "image" (base64 string) in request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: 'This is a photo of an open storage box or bin. List only the distinct items you can actually see inside it. For each item, write a short 3-8 word description (include distinguishing details like color or size when visible). Do not guess at items you cannot see.',
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['items'],
            additionalProperties: false,
          },
        },
      },
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    const parsed = textBlock && 'text' in textBlock ? JSON.parse(textBlock.text) : { items: [] }

    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const estimatedCost =
      (inputTokens / 1_000_000) * INPUT_COST_PER_MTOK + (outputTokens / 1_000_000) * OUTPUT_COST_PER_MTOK

    return new Response(
      JSON.stringify({
        items: parsed.items ?? [],
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
        estimated_cost_usd: Number(estimatedCost.toFixed(4)),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('extract-items error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
