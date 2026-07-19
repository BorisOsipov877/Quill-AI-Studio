import Anthropic from "@anthropic-ai/sdk";
import { GeneratorError, type GeneratedContent, type GenerationInput } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

// ---------------------------------------------------------------------------
// REAL generator — calls the Anthropic Messages API (claude-sonnet-5).
//
// This is NOT wired up by default; the app uses `mockGenerate`. To go live,
// set ANTHROPIC_API_KEY in .env.local and switch the export in `index.ts` to
// `anthropicGenerate` — that single change flips the whole app to the real API.
//
// Note on temperature: the task asked for a "moderate temperature", but
// claude-sonnet-5 no longer accepts `temperature` / `top_p` / `top_k` — sending
// them returns HTTP 400. Creativity is steered through the prompt instead. If
// you later target a model that supports sampling params, add `temperature` here.
// ---------------------------------------------------------------------------

const MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new GeneratorError(
      "The Anthropic API key is not configured. Add ANTHROPIC_API_KEY to your environment."
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

// JSON Schema the model is constrained to (structured outputs). Keep it flat —
// structured outputs reject constraints like minLength/maxItems.
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    seoDescription: { type: "string" },
    socialPosts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          text: { type: "string" },
        },
        required: ["label", "text"],
      },
    },
  },
  required: ["seoDescription", "socialPosts"],
} as const;

export async function anthropicGenerate(input: GenerationInput): Promise<GeneratedContent> {
  const anthropic = getClient();

  // Build the user turn: an optional product-photo image block, then the text
  // prompt. Claude reads the photo and grounds the copy in what it sees.
  const userContent: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.image.mediaType,
        data: input.image.base64,
      },
    });
  }
  userContent.push({ type: "text", text: buildUserPrompt(input) });

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      output_config: {
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
    });
  } catch (err) {
    throw mapAnthropicError(err);
  }

  // With output_config.format the first text block is guaranteed valid JSON
  // matching OUTPUT_SCHEMA.
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new GeneratorError("The model returned an unexpected response. Please try again.");
  }

  let parsed: GeneratedContent;
  try {
    parsed = JSON.parse(textBlock.text) as GeneratedContent;
  } catch {
    throw new GeneratorError("Could not parse the generated content. Please try again.");
  }

  if (!parsed.seoDescription || !Array.isArray(parsed.socialPosts)) {
    throw new GeneratorError("The generated content was incomplete. Please try again.");
  }

  return parsed;
}

// Turn SDK/API errors into friendly, user-facing GeneratorError messages.
function mapAnthropicError(err: unknown): GeneratorError {
  if (err instanceof GeneratorError) return err;

  if (err instanceof Anthropic.AuthenticationError) {
    return new GeneratorError(
      "The Anthropic API key is invalid. Check ANTHROPIC_API_KEY and try again."
    );
  }

  if (err instanceof Anthropic.APIError) {
    // `type` distinguishes billing from generic permission errors (both 403).
    const type = (err as { type?: string }).type;
    if (type === "billing_error" || /credit|balance|quota/i.test(err.message)) {
      return new GeneratorError(
        "Your Anthropic account is out of credit. Add balance to your plan and try again."
      );
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      return new GeneratorError("This API key doesn't have access to the requested model.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      return new GeneratorError("Too many requests right now. Please wait a moment and try again.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return new GeneratorError("Couldn't reach Anthropic. Check your connection and try again.");
    }
    return new GeneratorError(`Anthropic API error: ${err.message}`);
  }

  return new GeneratorError("Something went wrong while generating content. Please try again.");
}
