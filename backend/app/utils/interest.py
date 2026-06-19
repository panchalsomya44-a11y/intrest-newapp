"""
Interest Calculation Engine — Running Balance Method
=====================================================

Logic:
  - A loan has multiple tranches (money given out) and payments (money received).
  - All events (tranches + payments) are sorted by date.
  - Between any two events, interest accrues on the outstanding principal balance.
  - When a payment comes in:
      1. First it clears all accrued interest up to that point.
      2. Any remaining payment amount reduces the principal.
  - This means: agar aapne ₹100 diya, phir ₹30 jama hua, to aage sirf ₹70 pe interest lagega.
  - Interest amount can also be negotiated — a payment can be marked as
    "interest_only" or can carry a custom interest_override so the lender
    can waive/reduce interest for that payment.

Formula (simple interest between two dates):
  interest = principal_balance × (rate/100) × (days/30)
"""

from datetime import datetime, timezone
from typing import List


def _make_aware(dt: datetime) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def calc_running_balance(tranches, payments, interest_rate: float, upto: datetime = None):
    """
    Compute the full running ledger for a loan.

    Returns a dict:
      {
        "total_principal":    float,   # sum of all tranches disbursed
        "total_interest":     float,   # total interest accrued so far
        "total_paid":         float,   # sum of all payments recorded
        "interest_paid":      float,   # how much of total_paid went to interest
        "principal_paid":     float,   # how much of total_paid reduced principal
        "principal_balance":  float,   # remaining principal (not yet repaid)
        "interest_balance":   float,   # accrued interest not yet paid
        "outstanding":        float,   # principal_balance + interest_balance
        "ledger":             list,    # line-by-line breakdown
      }
    """
    upto = _make_aware(upto)

    # Build unified event list
    events = []
    for t in tranches:
        events.append({
            "type": "disbursal",
            "date": _make_aware(t.disbursal_date),
            "amount": t.amount,
            "id": t.id,
            "notes": t.notes or "",
        })
    for p in payments:
        events.append({
            "type": "payment",
            "date": _make_aware(p.payment_date),
            "amount": p.amount,
            "id": p.id,
            "notes": p.notes or "",
            # optional fields stored in notes as JSON-like prefix, ignored here
            "interest_override": getattr(p, "interest_override", None),
        })

    # Sort all events by date
    events.sort(key=lambda e: e["date"])

    principal_balance = 0.0
    interest_balance  = 0.0
    last_date         = None

    total_principal   = 0.0
    total_interest    = 0.0
    interest_paid     = 0.0
    principal_paid    = 0.0
    total_paid        = 0.0

    ledger = []

    def accrue_interest(from_dt, to_dt):
        """Add accrued interest for the period."""
        nonlocal interest_balance, total_interest
        if principal_balance <= 0:
            return 0.0
        days = max((to_dt - from_dt).days, 0)
        months = days / 30.0
        accrued = round(principal_balance * (interest_rate / 100) * months, 2)
        interest_balance = round(interest_balance + accrued, 2)
        total_interest   = round(total_interest + accrued, 2)
        return accrued

    for ev in events:
        ev_date = ev["date"]

        # Accrue interest from last event (or first disbursal) up to this event
        if last_date is not None and ev_date > last_date:
            accrued = accrue_interest(last_date, ev_date)
            if accrued > 0:
                ledger.append({
                    "type": "interest_accrual",
                    "date": ev_date.isoformat(),
                    "description": f"Interest accrued ({(ev_date - last_date).days} days @ {interest_rate}%/mo)",
                    "interest": accrued,
                    "principal_balance": round(principal_balance, 2),
                    "interest_balance": round(interest_balance, 2),
                })

        if ev["type"] == "disbursal":
            principal_balance = round(principal_balance + ev["amount"], 2)
            total_principal   = round(total_principal + ev["amount"], 2)
            ledger.append({
                "type": "disbursal",
                "date": ev_date.isoformat(),
                "description": f"Loan disbursed ₹{ev['amount']:,.2f}" + (f" — {ev['notes']}" if ev['notes'] else ""),
                "amount": ev["amount"],
                "principal_balance": round(principal_balance, 2),
                "interest_balance": round(interest_balance, 2),
            })

        elif ev["type"] == "payment":
            paid = ev["amount"]
            total_paid = round(total_paid + paid, 2)

            interest_override = ev.get("interest_override")
            is_negotiated     = interest_override is not None  # True = custom/waive mode

            if not is_negotiated:
                # Auto: clear all accrued interest first
                interest_to_clear = interest_balance
            else:
                # Negotiated: only charge agreed amount (rest is WAIVED — gone)
                interest_to_clear = min(float(interest_override), interest_balance)
                interest_to_clear = max(round(interest_to_clear, 2), 0)

            # How much of this payment covers interest
            interest_cleared = min(paid, interest_to_clear)
            interest_cleared = round(max(interest_cleared, 0), 2)
            paid_remaining   = round(paid - interest_cleared, 2)

            # --- KEY FIX: if negotiated, zero out ALL remaining accrued interest (waived) ---
            if is_negotiated:
                interest_waived  = round(max(interest_balance - interest_cleared, 0), 2)
                interest_balance = 0.0  # waived portion is gone — never carries forward
            else:
                interest_waived  = 0.0
                interest_balance = round(interest_balance - interest_cleared, 2)

            interest_paid = round(interest_paid + interest_cleared, 2)

            # Rest of payment goes to principal
            principal_cleared = min(paid_remaining, principal_balance)
            principal_cleared = round(max(principal_cleared, 0), 2)
            principal_balance = round(principal_balance - principal_cleared, 2)
            principal_paid    = round(principal_paid + principal_cleared, 2)

            # Any excess (overpayment beyond principal)
            excess = round(paid_remaining - principal_cleared, 2)

            desc = f"Payment received ₹{ev['amount']:,.2f}"
            if ev['notes']:
                desc += f" — {ev['notes']}"
            if interest_waived > 0:
                desc += f" (₹{interest_waived:,.2f} interest waived)"

            ledger.append({
                "type": "payment",
                "date": ev_date.isoformat(),
                "description": desc,
                "amount": ev["amount"],
                "interest_cleared": interest_cleared,
                "interest_waived": interest_waived,
                "principal_cleared": principal_cleared,
                "excess": excess,
                "principal_balance": round(principal_balance, 2),
                "interest_balance": round(interest_balance, 2),
            })

        last_date = ev_date

    # Accrue interest from last event up to 'upto' (today)
    if last_date is not None and upto > last_date:
        accrued = accrue_interest(last_date, upto)
        if accrued > 0:
            ledger.append({
                "type": "interest_accrual",
                "date": upto.isoformat(),
                "description": f"Interest accrued till today ({(upto - last_date).days} days @ {interest_rate}%/mo)",
                "interest": accrued,
                "principal_balance": round(principal_balance, 2),
                "interest_balance": round(interest_balance, 2),
            })

    outstanding = round(principal_balance + interest_balance, 2)

    return {
        "total_principal":   round(total_principal, 2),
        "total_interest":    round(total_interest, 2),
        "total_paid":        round(total_paid, 2),
        "interest_paid":     round(interest_paid, 2),
        "principal_paid":    round(principal_paid, 2),
        "principal_balance": round(principal_balance, 2),
        "interest_balance":  round(interest_balance, 2),
        "outstanding":       outstanding,
        "ledger":            ledger,
    }


# Keep old name as alias for backward compat
def calc_loan_summary(tranches, payments, interest_rate: float, upto: datetime = None):
    result = calc_running_balance(tranches, payments, interest_rate, upto)
    return result
