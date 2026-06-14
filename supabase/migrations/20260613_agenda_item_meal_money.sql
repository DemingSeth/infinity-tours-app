-- ════════════════════════════════════════════════════════════════════════════
-- Itinerary items: multi-select meal money entries.
--
-- Previously a meal carried a single meal_pay_type (group | stipend |
-- disney_dining) and a single stipend_amount (only ever shown for "stipend").
-- Disney Dining had no amount field, and a meal could not combine options.
--
-- This generalizes into one JSONB list: each entry is { "type": <t>, "amount": <n> }
-- where type ∈ ('group','stipend','disney_dining','cash'). "group" carries no
-- amount; the other three each carry their own dollar amount. A meal may hold
-- several entries at once (e.g. Group Meal + Cash).
--
-- The legacy columns (meal_pay_type, stipend_amount) are KEPT and stay
-- backfilled/synced by the app as dormant rollback insurance only — no live
-- display or calculation reads them once this migration is applied.
-- ════════════════════════════════════════════════════════════════════════════

alter table agenda_items
  add column if not exists meal_money jsonb not null default '[]'::jsonb;

-- Backfill the list from the existing single meal_pay_type / stipend_amount.
update agenda_items
  set meal_money = case meal_pay_type
    when 'stipend'       then jsonb_build_array(jsonb_build_object('type', 'stipend', 'amount', stipend_amount))
    when 'disney_dining' then jsonb_build_array(jsonb_build_object('type', 'disney_dining', 'amount', null))
    when 'group'         then jsonb_build_array(jsonb_build_object('type', 'group'))
    else meal_money
  end
  where meal_money = '[]'::jsonb
    and meal_pay_type in ('stipend', 'disney_dining', 'group');
