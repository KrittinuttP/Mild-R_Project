# Context
We are building a backend data pipeline using **Supabase Edge Functions (Deno/TypeScript)**. The goal is to fetch social media posts (X/Twitter) via a third-party API or RSS-to-JSON service, parse the data, and store it in a Supabase PostgreSQL database.

# Objective
Write a Supabase Edge Function that executes the following 3 phases: Fetch, Parse & Filter, and Transform & Store.

# Workflow & Logic Requirements

## Phase 1: Fetch & Trigger (Polling)
- This function will be triggered periodically via Supabase `pg_cron`.
- Use standard `fetch()` to call an external API endpoint (from `Deno.env.get('X_API_URL')`).
- Include necessary authentication headers (e.g., API Key).
- The expected response is an array of the latest post objects.

## Phase 2: Parse & Filter
- **Deduplication:** Extract all `tweet_id`s from the fetched array. Query the Supabase `x_posts` table to check which IDs already exist. Filter out the existing ones to process only *new* posts.
- **Classification:** Loop through the new posts and classify them:
  - **Condition A (Normal Tweet):** Has text/media but no quoted status.
  - **Condition B (Quote Tweet):** Has the author's text AND a `quoted_status` object (or `is_quote: true`).
  - **Condition C (Retweet):** No original text from the author, only a retweet object. (Filter these out / do not save them).

## Phase 3: Transform & Store
- Transform the filtered new posts into an array of objects matching this database schema:
  - `tweet_id` (string, unique)
  - `post_type` (string: 'tweet' or 'quote')
  - `content` (string: main text)
  - `is_quote` (boolean)
  - `quoted_tweet_id` (string, nullable)
  - `quoted_content` (string, nullable)
  - `quoted_author_username` (string, nullable)
  - `posted_at` (timestamp/string from the original post)
- Use `@supabase/supabase-js` to perform a batch `insert()` into the `x_posts` table.
- Implement proper `try-catch` error handling and return a JSON response summarizing the result (e.g., number of new posts added).

# Output Expectations
- Provide the complete `index.ts` file for the Supabase Edge Function.
- Use modular helper functions if necessary (e.g., for parsing logic).
- Add concise comments explaining the deduplication and classification logic.