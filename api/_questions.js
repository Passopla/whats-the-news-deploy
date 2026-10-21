import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

// Files starting with "_" inside /api are not exposed as Vercel endpoints.
// This module asks Claude to pick the blank and the wrong options for each headline.

const DISTRACTOR_COUNT = 9;

const SYSTEM_PROMPT = `You write questions for "What's The News?", a fill-in-the-blank game built on real Guardian headlines.

For each numbered headline:
1. Pick ONE word to blank out. It must appear in the headline exactly as a single word, be at least 4 letters, and be a meaningful content word (noun, verb or adjective) that carries the story. Never pick people's names or other proper nouns, and never pick articles, prepositions, conjunctions, pronouns or auxiliary verbs (e.g. "with", "from", "that", "have", "says").
2. Write ${DISTRACTOR_COUNT} wrong options. Every option must:
   - be a single word (no spaces), lowercase
   - match the blanked word's part of speech and grammatical form (same tense, same plural/singular, same possessive form)
   - make the headline a grammatical, believable news headline that reports something different from the real story, so the player has to know or reason out what actually happened
   - not be a synonym or near-synonym that keeps the headline true: a reader who knows the story must be able to rule out every wrong option
   - be different from each other and from the answer
   Write them as a neutral news editor would: plausible and varied. Do not aim for jokes or absurdity.

Return one entry per headline, using the headline's number as "index".`;

const QuestionSetSchema = z.object(
    {
        questions: z.array(z.object(
            {
                index: z.number().int(),
                answer: z.string(),
                options: z.array(z.string())
            }))
    });

// Must match analyzeWord() in src/main.js so the client can find the answer in the headline.
const normalize = (rawWord) => (rawWord || '').toLowerCase().replace(/[.,'":;()]/g, '');

const client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ timeout: 25000, maxRetries: 1 })
    : null;

// Returns { [articleId]: { answer, options } }, or null when the AI is unavailable
// (no key, credits ran out, rate limited, timeout...). Callers fall back to the word-pool method.
export async function generateQuestions(articles)
    {
        if (!client || articles.length === 0) return null;

        const headlineList = articles.map((a, i) => `${i}. ${a.webTitle}`).join('\n');

        try
            {
                const response = await client.messages.parse(
                    {
                        model: 'claude-haiku-5-5',
                        max_tokens: 8000,
                        thinking: { type: 'disabled' },
                        output_config: { effort: 'low', format: zodOutputFormat(QuestionSetSchema) },
                        system: SYSTEM_PROMPT,
                        messages: [{ role: 'user', content: headlineList }]
                    });

                if (!response.parsed_output) return null;

                const questions = {};
                response.parsed_output.questions.forEach(q =>
                    {
                        const article = articles[q.index];
                        if (!article) return;

                        const answer = normalize(q.answer);
                        const headlineWords = article.webTitle.split(' ').map(normalize);
                        if (answer.length < 4 || !headlineWords.includes(answer)) return;

                        const options = [...new Set(q.options.map(normalize))]
                            .filter(w => w && !w.includes(' ') && w !== answer)
                            .slice(0, DISTRACTOR_COUNT);
                        if (options.length < DISTRACTOR_COUNT) return;

                        questions[article.id] = { answer, options };
                    });

                return questions;
            } catch (error)
                {
                    if (error instanceof Anthropic.APIError)
                        {
                            // billing_error (402) / "credit balance is too low" lands here too.
                            console.error(`AI questions unavailable (${error.status} ${error.type}): ${error.message}`);
                        } else
                            {
                                console.error('AI questions failed:', error);
                            }
                    return null;
                }
    }
