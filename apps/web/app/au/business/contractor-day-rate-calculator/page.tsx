import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { ContractorCalculator } from "../../../../components/breadth/contractor-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-BIZ-006")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "What does a contractor day rate need to cover compared to a salary?",
    answer:
      "A day rate has to cover everything a salary package delivers alongside the salary itself: employer super, paid annual leave, personal leave and public holidays, business overheads, and the days you are not billing. The calculator builds billable capacity from weekdays less leave, holidays and non-billable days, multiplied by your utilisation, then spreads target income, super replacement, overheads and your chosen margin across that smaller number of days. This is why the day rate lands well above a salary divided by working days.",
  },
  {
    question: "How do I convert a salary to a contractor day rate?",
    answer:
      "Enter the annual income you want to end up with as your target, add your annual overheads, super replacement percentage and margin, then set the leave, holidays and utilisation that describe your year. The calculator divides the total amount to be recovered by the billable days that remain, producing the day rate and the equivalent hourly rate. Every input is editable, so the sensitivity table shows how the rate moves as utilisation changes.",
    render: (
      <p>
        Enter the annual income you want to end up with as your target, add your annual overheads,
        super replacement percentage and margin, then set the leave, holidays and utilisation that
        describe your year. The calculator divides the total amount to be recovered by the billable
        days that remain, producing the day rate and the equivalent hourly rate. To see what a
        comparable salary leaves after tax, use the{" "}
        <Link href="/au/pay-tax/take-home-pay-calculator" className={LINK}>
          take-home pay calculator
        </Link>
        .
      </p>
    ),
  },
  {
    question: "What is billable utilisation and why does it matter?",
    answer:
      "Utilisation is the share of your available working days that you actually bill, after allowing for business development, admin, training and gaps between engagements. It matters because it divides the same annual cost base across fewer days: a rate priced at full utilisation leaves nothing to absorb an unbilled week. The calculator makes utilisation an explicit input and shows the day rate at points either side of your figure so the sensitivity is visible.",
  },
  {
    question: "Do contractors get superannuation?",
    answer:
      "Independent contractors generally fund their own retirement saving out of the rate rather than receiving employer contributions, and some contracting arrangements are treated as employment for superannuation guarantee purposes depending on the terms of the contract. The calculator therefore includes an editable super replacement percentage so the rate carries an equivalent amount rather than assuming it away. Whether your arrangement attracts a superannuation guarantee obligation is a question about your contract and the law, not something the calculator determines.",
  },
  {
    question: "Is GST included in a contractor day rate?",
    answer:
      "No — where you are registered, GST is quoted on top of the rate and is never treated as your revenue, because it is collected on behalf of the Australian Taxation Office. Switching the GST registered toggle adds the current rate from the active GST rule pack to the quoted figure while leaving the underlying rate and all income calculations unchanged. Every other figure on the page is GST-exclusive.",
    render: (
      <p>
        No — where you are registered, GST is quoted on top of the rate and is never treated as your
        revenue, because it is collected on behalf of the Australian Taxation Office. Switching the
        GST registered toggle adds the current rate from the active GST rule pack to the quoted
        figure while leaving the underlying rate unchanged. The{" "}
        <Link href="/au/business/gst-calculator" className={LINK}>
          GST calculator
        </Link>{" "}
        shows the registration turnover thresholds and the arithmetic in full.
      </p>
    ),
  },
  {
    question: "What is not included in the day rate calculation?",
    answer:
      "Income tax, business structure choices, professional indemnity and public liability insurance premiums, workers compensation and personal services income rules are outside this calculation, which the limitations panel states. Overheads are whatever annual figure you enter, so anything you leave out of that number is absent from the rate. The result is a pricing calculation, not a tax position.",
  },
  {
    question: "Do contractors pay their own super and tax?",
    answer:
      "Generally yes — both come out of the rate, because there is no employer withholding tax each payday and no employer super guarantee contribution unless the contract is one the guarantee treats as employment. Income tax on business profit is assessed at individual marginal rates and is typically prepaid through PAYG instalments, then settled when the return is lodged. Retirement saving comes from personal contributions paid into a fund, which is why the rate here carries an editable super replacement percentage rather than assuming the amount away.",
    render: (
      <p>
        Generally yes — both come out of the rate, because there is no employer withholding tax each
        payday and no employer super guarantee contribution unless the contract is one the guarantee
        treats as employment. Income tax on business profit is assessed at individual marginal rates
        and is typically prepaid through PAYG instalments, then settled when the return is lodged, and
        retirement saving comes from personal contributions paid into a fund. The{" "}
        <Link href="/au/pay-tax/pay-calculator" className={LINK}>
          pay calculator
        </Link>{" "}
        has a sole-trader mode that shows the annual tax position on business profit.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/business/contractor-day-rate-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-BIZ-006" />
      <ContractorCalculator />
      <FaqSection items={FAQ} />
    </>
  );
}
