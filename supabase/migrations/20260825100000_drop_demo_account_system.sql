-- Drop the demo account system.
-- Demo accounts are no longer used — child self-registration covers the
-- same onboarding use case, and a real account is used for store/QA testing.

DROP FUNCTION IF EXISTS create_demo_account(text);
DROP FUNCTION IF EXISTS cleanup_expired_demo_accounts();
DROP FUNCTION IF EXISTS get_demo_stats(timestamptz, timestamptz);

DROP TABLE IF EXISTS demo_rate_limit;
DROP TABLE IF EXISTS demo_account_stats;
