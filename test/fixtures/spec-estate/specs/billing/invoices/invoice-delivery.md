---
id: billing-invoices-invoice-delivery
area: Billing / Invoices
status: partial
---

# Invoice Delivery

Customers receive an invoice through their chosen delivery channel and can recover from a failed address. [Case routing](../../support/cases/case-routing.md) handles any follow-up.

## Behaviours

### B1 — Send by email 🟢 implemented

The customer receives the invoice at the verified billing address.

### B2a — Retry an invalid address 🟡 partial

> Retry works for a corrected address.
> Automatic expiry is still missing.

The customer can correct the address and try delivery again.

## Rules (Invariants)

- One delivery attempt targets one invoice version.
- A failed address never marks the invoice as delivered.

## Decision Tables

### Delivery outcome

| Address | Provider  | Result              |
| ------- | --------- | ------------------- |
| Valid   | Available | Delivered           |
| Invalid | Any       | Correction required |

## User Flows

- **F1 — Invoice Delivery:** [contract](./invoice-delivery.flow.yaml) · [diagram](./invoice-delivery.flow.mmd) — covers B1, B2a

## Open Questions

- **Blocks B2a:** How long should a corrected address remain retryable?
- **Settled:** Customers can retry without creating another invoice.

## Future Considerations

- Postal delivery.

## Out of Scope

- Editing invoice line items.
