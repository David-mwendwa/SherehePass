-- Invariants the application also enforces, restated as constraints so that a
-- future migration, an admin script, or a hand-written UPDATE cannot violate
-- them. The application check gives a good error message; these make the bad
-- state unrepresentable.

-- A tier can never have sold more than it has to sell. This is the constraint
-- the purchase transaction's conditional UPDATE is protecting, held a second
-- time by the database itself.
ALTER TABLE "TicketType"
  ADD CONSTRAINT "TicketType_sold_within_quantity" CHECK ("sold" <= "quantity"),
  ADD CONSTRAINT "TicketType_sold_non_negative" CHECK ("sold" >= 0),
  ADD CONSTRAINT "TicketType_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "TicketType_price_non_negative" CHECK ("priceCents" >= 0);

-- Free events are allowed; negative prices and zero-quantity orders are not.
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "OrderItem_price_non_negative" CHECK ("unitPriceCents" >= 0);

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_total_non_negative" CHECK ("totalCents" >= 0);

-- An event that ends before it starts is a data-entry mistake, not a schedule.
ALTER TABLE "Event"
  ADD CONSTRAINT "Event_ends_after_start" CHECK ("endsAt" >= "startsAt");
