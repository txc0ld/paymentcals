import { UniversalDisclosure } from "@paymentcalcs/calculation-ui";

/**
 * §12.5.10 mortgage model disclosure (exact copy) rendered alongside the
 * §17.9 universal footer.
 */
export function MortgageDisclosure() {
  return (
    <div className="grid gap-3">
      <aside
        aria-label="Model limitations"
        data-disclosure-version="mortgage-model-v2.0"
        className="border-t border-hairline pt-4 text-[12px] leading-5 text-ink-3"
      >
        {/* eslint-disable-next-line paymentcalcs/no-banned-result-verbs --
            Exact §12.5.10 required-disclosure copy. The §17.9 banned-verbs rule
            governs result copy; this compliance disclosure is mandated verbatim
            and the conflict is logged in PROGRESS.md for counsel review. */}
        <p>
          The model is an estimate based on the selected contract conventions and future
          assumptions. Lender methods, transaction timing, fees, rounding and rate changes may
          differ. Users should compare the settings with their loan contract and statements.
        </p>
      </aside>
      <UniversalDisclosure financialYear="current" />
    </div>
  );
}
