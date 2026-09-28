-- Applied to production 2026-09-28 right after 20260928_amy_round3.sql.
-- The old item checkbox was labeled "Cost paid / confirmed" and wrote
-- cost_paid. 102 of the 114 checked items had no cost, so it was being used
-- to mean "confirmed". Carry every check over to the new confirmed column,
-- and clear cost_paid (now "Paid in Full") where there is no cost to pay.
-- Result: 114 confirmed, 12 still Paid in Full. Do not re-run after users
-- start using the new checkboxes.
update public.agenda_items
   set confirmed = true,
       cost_paid = case when coalesce(cost, 0) = 0 then false else cost_paid end
 where cost_paid = true;
