import Link from "next/link";
import {
  ADVERTISING_STANDARDS,
  AFFILIATE_COMMISSION_ROWS,
  AFFILIATE_OBLIGATIONS,
  CAMPAIGN_CREATOR_OBLIGATIONS,
  CAMPAIGN_PAYMENT_ROWS,
  COMMUNITY_ENCOURAGED,
  COMMUNITY_PROHIBITED_ROWS,
  CREATOR_DISCLOSURE_ITEMS,
  DATA_COLLECTION_ROWS,
  DATA_SHARING_ROWS,
  DMCA_REQUIRED_FIELDS,
  ELIGIBILITY_ITEMS,
  ENFORCEMENT_ROWS,
  PAYOUT_POLICY_ITEMS,
  PROHIBITED_PRODUCTS,
  REFUND_ROWS,
  SELLER_FEES_ROWS,
  SHOPIFY_COMMERCE_ITEMS,
  UGC_JOIN_ACKNOWLEDGEMENTS,
} from "@/lib/legal/content-data";
import { LEGAL_CONTACT } from "@/lib/legal/catalog";
import {
  LegalDataTable,
  LegalDataTable4,
  LegalHighlight,
  LegalList,
  LegalParagraph,
  LegalSection,
} from "../legal-ui";
import { LegalDocumentShell } from "../LegalDocumentShell";

export function RefundsDocument() {
  return (
    <LegalDocumentShell documentId="refunds-disputes">
      <LegalSection id="buyer-refunds" title="Buyer Refund Policy">
        <LegalDataTable4
          headers={["Product Type", "Refund Window", "Conditions"]}
          rows={REFUND_ROWS}
        />
      </LegalSection>

      <LegalSection id="payouts" title="Seller & Creator Payout Policy">
        <LegalList items={PAYOUT_POLICY_ITEMS} />
      </LegalSection>

      <LegalSection id="chargebacks" title="Chargeback & Dispute Resolution">
        <LegalParagraph>
          In the event of a buyer chargeback, Jimvio will temporarily hold associated seller
          earnings pending resolution. Sellers may submit evidence to dispute chargebacks through
          the dashboard. Excessive chargebacks (above 1% of monthly volume) may result in account
          review.
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function CommunityGuidelinesDocument() {
  return (
    <LegalDocumentShell documentId="community-guidelines">
      <LegalSection id="encouraged" title="What We Encourage">
        <LegalList items={COMMUNITY_ENCOURAGED} variant="check" />
      </LegalSection>

      <LegalSection id="prohibited" title="Strictly Prohibited">
        <LegalDataTable
          headers={["Violation", "Description", "Enforcement"]}
          rows={COMMUNITY_PROHIBITED_ROWS}
        />
      </LegalSection>

      <LegalSection id="enforcement" title="Enforcement Levels">
        <LegalDataTable headers={["Level", "Action", "Trigger"]} rows={ENFORCEMENT_ROWS} />
        <LegalParagraph className="mt-5">
          Use the Report button on any content, profile, or message to flag violations. Our
          moderation team reviews all reports within 48 hours. For urgent safety concerns, contact{" "}
          <span className="font-medium text-[#C2410C]">{LEGAL_CONTACT.safetyEmail}</span>.
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function ProhibitedProductsDocument() {
  return (
    <LegalDocumentShell documentId="prohibited-products">
      <LegalHighlight>
        Listings violating this policy are removed immediately without notice. Repeat violations
        result in permanent account termination and may be reported to relevant authorities.
      </LegalHighlight>

      <div className="mt-8">
        <LegalSection id="illegal" title="Illegal Items">
          <LegalList items={PROHIBITED_PRODUCTS.illegal} variant="cross" />
        </LegalSection>
        <LegalSection id="harmful" title="Harmful & Dangerous Products">
          <LegalList items={PROHIBITED_PRODUCTS.harmful} variant="cross" />
        </LegalSection>
        <LegalSection id="adult" title="Adult & Restricted Content">
          <LegalList items={PROHIBITED_PRODUCTS.adult} variant="cross" />
        </LegalSection>
        <LegalSection id="digital-fraud" title="Digital Fraud & Scams">
          <LegalList items={PROHIBITED_PRODUCTS.digitalFraud} variant="cross" />
        </LegalSection>
        <LegalSection id="ip" title="Intellectual Property Violations">
          <LegalList items={PROHIBITED_PRODUCTS.ip} variant="cross" />
        </LegalSection>
        <LegalSection id="jurisdictional" title="Restricted by Jurisdiction">
          <LegalList items={PROHIBITED_PRODUCTS.jurisdictional} variant="cross" />
        </LegalSection>
      </div>
    </LegalDocumentShell>
  );
}

export function BuyerTermsDocument() {
  return (
    <LegalDocumentShell documentId="buyer-terms">
      <LegalSection id="overview" title="Overview">
        <LegalParagraph>
          These Buyer Terms apply when you purchase products or services on Jimvio. They work
          together with the{" "}
          <Link href="/terms" className="font-medium text-[#C2410C] underline-offset-2 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/refunds-payouts"
            className="font-medium text-[#C2410C] underline-offset-2 hover:underline"
          >
            Refunds & Disputes
          </Link>{" "}
          policy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="orders" title="Orders & Payments">
        <LegalList
          items={[
            "You must provide accurate shipping and billing information for physical orders.",
            "Payment is processed through Jimvio’s supported payment methods at checkout.",
            "Order confirmations and transactional notices are sent to your account email.",
            "Jimvio may cancel orders that appear fraudulent or that violate platform policies.",
          ]}
        />
      </LegalSection>

      <LegalSection id="refunds" title="Refunds">
        <LegalParagraph>
          Buyer refund windows depend on product type. The following windows are published in
          Jimvio’s Refund & Payout Policy:
        </LegalParagraph>
        <LegalDataTable4
          headers={["Product Type", "Refund Window", "Conditions"]}
          rows={REFUND_ROWS}
        />
      </LegalSection>

      <LegalSection id="disputes" title="Disputes & Chargebacks">
        <LegalParagraph>
          In the event of a buyer chargeback, Jimvio will temporarily hold associated seller
          earnings pending resolution. Sellers may submit evidence to dispute chargebacks through
          the dashboard. Excessive chargebacks (above 1% of monthly volume) may result in account
          review.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="related" title="Related Policies">
        <LegalList
          items={[
            "Terms of Service — account eligibility and prohibited conduct.",
            "Prohibited Products & Services — items that may not be purchased or fulfilled.",
            "Privacy Policy — how order and payment-related data is handled.",
          ]}
        />
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function SellerTermsDocument() {
  return (
    <LegalDocumentShell documentId="seller-terms">
      <LegalSection id="eligibility" title="Seller Eligibility">
        <LegalParagraph>
          Sellers must complete identity verification and be legally authorized to sell listed
          products. Sellers must be 18+ and agree to these Seller Terms in addition to the platform
          Terms of Service.
        </LegalParagraph>
        <LegalList items={ELIGIBILITY_ITEMS} />
      </LegalSection>

      <LegalSection id="fees" title="Fees">
        <LegalParagraph>Platform fees apply to all transactions:</LegalParagraph>
        <LegalDataTable headers={["Fee Type", "Amount", "Notes"]} rows={SELLER_FEES_ROWS} />
      </LegalSection>

      <LegalSection id="responsibilities" title="Seller Responsibilities">
        <LegalList
          items={[
            "Provide accurate product descriptions, pricing, and inventory information.",
            "Fulfill orders within stated timeframes and communicate shipping updates.",
            "Comply with applicable local laws for products sold in each destination market.",
            "Honor published refund windows for defective, incorrect, or undelivered goods.",
            "Complete KYC verification before receiving payouts above applicable thresholds.",
          ]}
        />
      </LegalSection>

      <LegalSection id="prohibited" title="Prohibited Listings">
        <LegalParagraph>
          Sellers may not list products or services described in the{" "}
          <Link
            href="/prohibited-products"
            className="font-medium text-[#C2410C] underline-offset-2 hover:underline"
          >
            Prohibited Products & Services
          </Link>{" "}
          policy. Violating listings are removed immediately without notice.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="related" title="Related Policies">
        <LegalList
          items={[
            "Commerce & Integrations — Shopify sync, orders, and fulfillment data.",
            "Earnings Terms — payout timing, holds, and withdrawal methods.",
            "Refunds & Disputes — chargeback handling and buyer refund windows.",
          ]}
        />
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function EarningsDocument() {
  return (
    <LegalDocumentShell documentId="earnings">
      <LegalSection id="payouts" title="Payout Policy">
        <LegalList items={PAYOUT_POLICY_ITEMS} />
      </LegalSection>

      <LegalSection id="affiliates" title="Affiliate Commissions">
        <LegalParagraph>
          Affiliates earn commissions by promoting products via unique tracking links. Commissions
          are tracked in real-time and paid on a NET-30 schedule. Attribution uses a 30-day cookie
          window. Self-referrals are never eligible.
        </LegalParagraph>
        <LegalDataTable4
          headers={["Category", "Commission Rate", "Notes"]}
          rows={AFFILIATE_COMMISSION_ROWS}
        />
      </LegalSection>

      <LegalSection id="campaigns" title="Campaign Earnings">
        <LegalDataTable4
          headers={["Model", "How you earn", "Payout timing"]}
          rows={CAMPAIGN_PAYMENT_ROWS}
        />
        <LegalParagraph className="mt-5">
          Campaign earnings are non-refundable once content is approved and paid, as stated in the
          Refund & Payout Policy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="holds" title="Holds & Reviews">
        <LegalParagraph>
          Earnings on hold pending fraud review are not eligible for payout until cleared. In the
          event of a buyer chargeback, Jimvio will temporarily hold associated seller earnings
          pending resolution.
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function UgcClippingDocument() {
  return (
    <LegalDocumentShell documentId="ugc-clipping">
      <LegalSection id="overview" title="Overview">
        <LegalParagraph>
          These terms apply to creators participating in Jimvio UGC and clipping campaigns. They
          supplement the Terms of Service, Community Guidelines, Copyright & IP Policy, and
          Advertising Disclosure Guidelines.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="payment-models" title="Payment Models">
        <LegalDataTable4
          headers={["Model", "How you earn", "Payout timing"]}
          rows={CAMPAIGN_PAYMENT_ROWS}
        />
      </LegalSection>

      <LegalSection id="creator-obligations" title="Creator Obligations">
        <LegalList items={CAMPAIGN_CREATOR_OBLIGATIONS} />
      </LegalSection>

      <LegalSection id="join-acknowledgements" title="Join Acknowledgements">
        <LegalParagraph>
          When joining a campaign, creators acknowledge the following policy areas used by Jimvio’s
          campaign join flow:
        </LegalParagraph>
        <LegalList items={UGC_JOIN_ACKNOWLEDGEMENTS} />
      </LegalSection>

      <LegalSection id="related" title="Related Policies">
        <LegalList
          items={[
            "Copyright & IP Policy — ownership and takedown process.",
            "Advertising Disclosure Guidelines — #ad / sponsored disclosures.",
            "Earnings Terms — payout timing and holds.",
          ]}
        />
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function DigitalProductsDocument() {
  return (
    <LegalDocumentShell documentId="digital-products">
      <LegalSection id="overview" title="Overview">
        <LegalParagraph>
          These terms apply to digital goods sold on Jimvio, including courses, e-books, templates,
          software downloads, and similar content. They supplement the Buyer Terms and Refunds &
          Disputes policy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="delivery" title="Delivery & Access">
        <LegalList
          items={[
            "Digital products are delivered through Jimvio download or access mechanisms after successful payment.",
            "Buyers are responsible for maintaining access to the account used for purchase.",
            "Sellers must ensure delivered files match the listing description.",
          ]}
        />
      </LegalSection>

      <LegalSection id="refunds" title="Refunds">
        <LegalParagraph>
          Digital product refunds follow the published Refund & Payout Policy:
        </LegalParagraph>
        <LegalDataTable4
          headers={["Product Type", "Refund Window", "Conditions"]}
          rows={REFUND_ROWS.filter((row) => row.col1 === "Digital Products")}
        />
      </LegalSection>

      <LegalSection id="ip" title="Intellectual Property">
        <LegalParagraph>
          Unless a listing expressly grants broader rights, buyers receive a personal license to use
          the purchased digital product. Redistribution, resale, or unauthorized sharing of licensed
          digital goods is prohibited and may result in account enforcement under the Terms of
          Service and Copyright & IP Policy.
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function WalletDocument() {
  return (
    <LegalDocumentShell documentId="wallet">
      <LegalSection id="overview" title="Overview">
        <LegalParagraph>
          The Jimvio Wallet is the platform balance used for eligible payments, earnings, and
          payouts. Wallet use is subject to the Terms of Service, Privacy Policy, and Earnings /
          Refunds & Payouts rules published by Jimvio.
        </LegalParagraph>
        <LegalHighlight>
          Jimvio Wallet is not a bank account or licensed payment institution product description
          beyond what is stated in these platform terms. Available methods vary by country.
        </LegalHighlight>
      </LegalSection>

      <LegalSection id="use" title="Permitted Use">
        <LegalList
          items={[
            "Receive eligible seller, affiliate, and campaign earnings into your wallet balance.",
            "Request withdrawals through supported payout methods when thresholds are met.",
            "Use wallet-related features only for lawful Jimvio platform activity.",
          ]}
        />
      </LegalSection>

      <LegalSection id="payouts" title="Withdrawals & Payouts">
        <LegalList items={PAYOUT_POLICY_ITEMS} />
      </LegalSection>

      <LegalSection id="security" title="Account Security">
        <LegalParagraph>
          You are solely responsible for maintaining the confidentiality of your account
          credentials. Notify Jimvio immediately at{" "}
          <span className="font-medium text-[#C2410C]">{LEGAL_CONTACT.infoEmail}</span> of any
          unauthorized access. KYC verification is required before receiving payouts above
          applicable thresholds.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="limitations" title="Limitations">
        <LegalList
          items={[
            "Earnings on hold pending fraud review are not eligible for payout until cleared.",
            "Failed payouts due to incorrect banking details are the account holder’s responsibility.",
            "Jimvio may freeze or reverse wallet movements connected to chargebacks, fraud, or Terms violations.",
          ]}
        />
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function CommerceIntegrationsDocument() {
  return (
    <LegalDocumentShell documentId="commerce-integrations">
      <LegalSection id="overview" title="Overview">
        <LegalParagraph>
          Jimvio Commerce lets merchants connect stores, sync catalog and inventory data, process
          orders, and optionally route fulfillment through supplier integrations. This page
          summarizes the data practices already stated in the Privacy Policy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="shopify" title="Shopify Connection">
        <LegalParagraph>
          When a merchant connects a Shopify store to Jimvio Commerce OS, Jimvio acts as a processor
          of store data needed to operate Commerce features. Access tokens are stored encrypted
          server-side and are never exposed in the browser.
        </LegalParagraph>
        <LegalList items={SHOPIFY_COMMERCE_ITEMS} />
      </LegalSection>

      <LegalSection id="data" title="Data Processed">
        <LegalDataTable
          headers={["Category", "Examples", "Purpose"]}
          rows={DATA_COLLECTION_ROWS.filter((row) =>
            row.col1.toLowerCase().includes("commerce") || row.col1.toLowerCase().includes("shopify"),
          )}
        />
        <div className="mt-4">
          <LegalDataTable
            headers={["Recipient", "Purpose", "Data Shared"]}
            rows={DATA_SHARING_ROWS.filter((row) =>
              /shopify|fulfillment/i.test(row.col1),
            )}
          />
        </div>
      </LegalSection>

      <LegalSection id="fulfillment" title="Fulfillment Suppliers">
        <LegalParagraph>
          When a merchant enables supplier integration, Jimvio may share order line items, shipping
          destination, and tracking as needed for fulfillment. Merchants remain responsible for
          product legality and destination compliance under the Prohibited Products policy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="disconnect" title="Disconnect & Deletion">
        <LegalList
          items={[
            "Merchants can disconnect a store in Jimvio Commerce.",
            "Uninstalling the Jimvio app from Shopify also clears stored access tokens.",
            "Shopify mandatory compliance webhooks for customer/shop redaction are processed with HMAC verification.",
            `Privacy requests: ${LEGAL_CONTACT.infoEmail} or ${LEGAL_CONTACT.supportEmail}.`,
          ]}
        />
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function DeveloperDocument() {
  return (
    <LegalDocumentShell documentId="developer">
      <LegalSection id="overview" title="Overview">
        <LegalParagraph>
          These Developer Terms cover use of Jimvio APIs, API keys, and programmatic integrations.
          API access is part of the Jimvio platform and is governed by the Terms of Service and
          Privacy Policy. Specific rate limits, endpoint availability, and commercial API plans may
          be documented separately in product docs and can change as features evolve.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="access" title="Access & Credentials">
        <LegalList
          items={[
            "Keep API keys and access credentials confidential.",
            "Do not share keys publicly or embed secrets in client-side code.",
            "Use only credentials issued for your account or authorized workspace.",
            "Notify Jimvio immediately at info@jimvio.com if credentials are compromised.",
          ]}
        />
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable Use">
        <LegalList
          items={[
            "Do not attempt to hack, reverse-engineer, scrape, or disrupt the platform.",
            "Do not use APIs to facilitate money laundering, fraud, or prohibited product sales.",
            "Do not generate fake traffic, artificial clicks, or fraudulent conversions.",
            "Respect privacy obligations when processing personal data retrieved through APIs.",
          ]}
          variant="cross"
        />
      </LegalSection>

      <LegalSection id="termination" title="Suspension & Termination">
        <LegalParagraph>
          Jimvio may suspend or revoke API access for Terms violations, security risk, abuse, or
          unlawful use. Continued platform use remains subject to the Terms of Service even if API
          access is revoked.
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function CopyrightIpDocument() {
  return (
    <LegalDocumentShell documentId="copyright-ip">
      <LegalSection id="ownership" title="Ownership">
        <LegalParagraph>
          All Jimvio platform content, branding, code, and designs are the exclusive intellectual
          property of Jimvio. Users retain ownership of original content they create. By submitting
          content, users grant Jimvio a worldwide, royalty-free, non-exclusive license to use and
          display it in connection with platform operations.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="dmca" title="DMCA Notices">
        <LegalParagraph>
          To file a copyright infringement notice, submit the following to{" "}
          <span className="font-medium text-[#C2410C]">{LEGAL_CONTACT.copyrightEmail}</span>:
        </LegalParagraph>
        <LegalList items={DMCA_REQUIRED_FIELDS} />
      </LegalSection>

      <LegalSection id="repeat" title="Repeat Infringers">
        <LegalParagraph>
          Users with repeated valid copyright violations will have their accounts permanently
          terminated. Jimvio maintains a strike-based system aligned with DMCA safe harbor
          provisions.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="counter" title="Counter-Notices">
        <LegalParagraph>
          If you believe your content was removed in error, you may file a counter-notice and
          content will be restored after the required waiting period.
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function YouthSafetyDocument() {
  return (
    <LegalDocumentShell documentId="youth-safety">
      <LegalSection id="age" title="Age Requirements">
        <LegalParagraph>
          Jimvio is intended for users who are at least 18 years of age, or the age of majority in
          their jurisdiction. Users must have legal capacity to enter into a binding contract.
        </LegalParagraph>
        <LegalList items={ELIGIBILITY_ITEMS.slice(0, 3)} />
      </LegalSection>

      <LegalSection id="content" title="Age-Restricted Content">
        <LegalParagraph>
          Sharing adult content, explicit material, or any content involving minors is prohibited
          under the Terms of Service and Community Guidelines. Ads targeting minors are prohibited
          under Jimvio advertising standards.
        </LegalParagraph>
        <LegalList
          items={[
            "Adult content, pornographic material, or explicit services are prohibited listings.",
            "Alcohol, tobacco, and vaping products require age verification and local compliance where allowed at all.",
            "Community adult-content violations may result in permanent ban.",
          ]}
          variant="cross"
        />
      </LegalSection>

      <LegalSection id="reporting" title="Reporting Concerns">
        <LegalParagraph>
          Use the Report button on any content, profile, or message to flag violations. For urgent
          safety concerns, contact{" "}
          <span className="font-medium text-[#C2410C]">{LEGAL_CONTACT.safetyEmail}</span>. Our
          moderation team reviews reports within 48 hours.
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function AffiliateTermsDocument() {
  return (
    <LegalDocumentShell documentId="affiliate-terms">
      <LegalSection id="overview" title="Overview">
        <LegalParagraph>
          These Affiliate Program Terms apply when you promote Jimvio products with tracking links.
          They supplement the Terms of Service and Advertising Disclosure Guidelines.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="commissions" title="Commissions">
        <LegalParagraph>
          Commissions are tracked in real-time and paid on a NET-30 schedule. Attribution uses a
          30-day cookie window. Self-referrals are never eligible.
        </LegalParagraph>
        <LegalDataTable4
          headers={["Category", "Commission Rate", "Notes"]}
          rows={AFFILIATE_COMMISSION_ROWS}
        />
      </LegalSection>

      <LegalSection id="obligations" title="Affiliate Obligations">
        <LegalList items={AFFILIATE_OBLIGATIONS} />
      </LegalSection>

      <LegalSection id="payouts" title="Payouts">
        <LegalList items={PAYOUT_POLICY_ITEMS} />
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function AdvertisingDisclosureDocument() {
  return (
    <LegalDocumentShell documentId="advertising-disclosure">
      <LegalSection id="standards" title="Advertising Standards">
        <LegalList items={ADVERTISING_STANDARDS} />
      </LegalSection>

      <LegalSection id="disclosures" title="Creator Disclosures">
        <LegalList items={CREATOR_DISCLOSURE_ITEMS} variant="check" />
      </LegalSection>
    </LegalDocumentShell>
  );
}
