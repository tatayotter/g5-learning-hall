-- Payment webhook handlers must only be callable by the server.
--
-- handle_paymongo_webhook, handle_sec_purchase_webhook and
-- handle_donation_webhook are SECURITY DEFINER functions that mark a purchase
-- as paid. They were executable by PUBLIC/anon/authenticated (Supabase's
-- default grant on new public functions), and the checkout id each one keys
-- on is readable by its owner through RLS (subscriptions/sec_entitlements
-- select-own policies). So a signed-in parent could start a checkout, read
-- their own paymongo_checkout_id, and call e.g.
--   supabase.rpc('handle_paymongo_webhook', { p_checkout_id, p_payment_id: 'x' })
-- to get a year of Premium + 10,000 coins (or an SEC pack) without paying.
-- Found 2026-10-02; a production audit showed no sign it had been used.
--
-- The only legitimate caller is app/api/paymongo-webhook/route.ts, which
-- uses the service-role client after verifying PayMongo's signature, so
-- restricting EXECUTE to service_role changes nothing for real payments.
-- GRANT/REVOKE are naturally idempotent.

revoke execute on function public.handle_paymongo_webhook(text, text) from public, anon, authenticated;
grant execute on function public.handle_paymongo_webhook(text, text) to service_role;

revoke execute on function public.handle_sec_purchase_webhook(text) from public, anon, authenticated;
grant execute on function public.handle_sec_purchase_webhook(text) to service_role;

revoke execute on function public.handle_donation_webhook(text) from public, anon, authenticated;
grant execute on function public.handle_donation_webhook(text) to service_role;
