import Link from "next/link";
import {
  ADVERTISING_STANDARDS,
  AFFILIATE_COMMISSION_ROWS,
  AFFILIATE_OBLIGATIONS,
  COOKIE_CARDS,
  CREATOR_DISCLOSURE_ITEMS,
  DATA_COLLECTION_ROWS,
  DATA_SHARING_ROWS,
  DMCA_REQUIRED_FIELDS,
  ELIGIBILITY_ITEMS,
  PRIVACY_RIGHTS,
  PRIVACY_USE_ITEMS,
  PROHIBITED_CONDUCT_ITEMS,
  SECURITY_ITEMS,
  SELLER_FEES_ROWS,
  SHOPIFY_COMMERCE_ITEMS,
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

export function TermsDocument() {
  return (
    <LegalDocumentShell documentId="terms">
      <LegalParagraph className="mb-10">
        These Terms of Service (“Terms”) govern your access to and use of the Jimvio platform,
        including marketplace, communities, commerce, affiliates, UGC & clipping, wallet, and related
        services. By accessing or using Jimvio, you agree to these Terms. If you do not agree, you
        must not use the platform.
      </LegalParagraph>

      <LegalSection id="agreement" index="01" title="Agreement">
        <LegalParagraph>
          By accessing or using the Jimvio platform, you agree to be bound by these Terms of
          Service. This is a legally binding agreement between you and Jimvio. If you do not agree,
          you must not use the platform. We may update these Terms at any time; continued use
          constitutes acceptance.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="eligibility" index="02" title="Eligibility">
        <LegalList items={ELIGIBILITY_ITEMS} />
      </LegalSection>

      <LegalSection id="account-security" index="03" title="Account Security">
        <LegalParagraph>
          You are solely responsible for maintaining the confidentiality of your account
          credentials. Notify Jimvio immediately at{" "}
          <span className="font-medium text-[#C2410C]">{LEGAL_CONTACT.infoEmail}</span> of any
          unauthorized access. You may not create multiple accounts, use bots to register, or
          transfer your account without express written permission.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="prohibited-conduct" index="04" title="Prohibited Conduct">
        <LegalList items={PROHIBITED_CONDUCT_ITEMS} variant="cross" />
      </LegalSection>

      <LegalSection id="intellectual-property" index="05" title="Intellectual Property">
        <LegalParagraph>
          All Jimvio platform content, branding, code, and designs are the exclusive intellectual
          property of Jimvio. Users retain ownership of original content they create. By submitting
          content, users grant Jimvio a worldwide, royalty-free, non-exclusive license to use and
          display it in connection with platform operations.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="limitation-of-liability" index="06" title="Limitation of Liability">
        <LegalParagraph>
          To the maximum extent permitted by law, Jimvio shall not be liable for indirect,
          incidental, special, consequential, or punitive damages arising from your use of the
          platform. Jimvio&apos;s total aggregate liability shall not exceed amounts paid by you to
          Jimvio in the twelve months preceding the claim.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="governing-law" index="07" title="Governing Law & Disputes">
        <LegalParagraph>
          These Terms shall be governed by applicable international commercial law. Disputes shall
          first be subject to good faith negotiation. Unresolved disputes are submitted to binding
          arbitration. Nothing prevents either party from seeking urgent injunctive relief from a
          court of competent jurisdiction.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="seller-creator" index="08" title="Seller & Creator Rules">
        <LegalParagraph>
          Sellers must complete identity verification and be legally authorized to sell listed
          products. Sellers must be 18+ and agree to the Seller Terms. Platform fees apply to all
          transactions:
        </LegalParagraph>
        <LegalDataTable headers={["Fee Type", "Amount", "Notes"]} rows={SELLER_FEES_ROWS} />
        <LegalParagraph className="mt-6">
          Creators may monetize through campaigns, affiliate commissions, direct product sales, and
          community memberships. KYC (Know Your Customer) verification is required before receiving
          payouts above applicable thresholds.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="affiliate-program" index="09" title="Affiliate Program">
        <LegalParagraph>
          Affiliates earn commissions by promoting products via unique tracking links. Commissions
          are tracked in real-time and paid on a NET-30 schedule. Attribution uses a 30-day cookie
          window. Self-referrals are never eligible.
        </LegalParagraph>
        <LegalDataTable4
          headers={["Category", "Commission Rate", "Notes"]}
          rows={AFFILIATE_COMMISSION_ROWS}
        />
        <div className="mt-5">
          <LegalList items={AFFILIATE_OBLIGATIONS} />
        </div>
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function PrivacyDocument() {
  return (
    <LegalDocumentShell documentId="privacy">
      <LegalSection id="commitment" title="Our Commitment">
        <LegalParagraph>
          Jimvio is committed to protecting your privacy and handling your personal data with the
          highest standards of transparency and security.
        </LegalParagraph>
        <LegalHighlight>
          Jimvio does not sell your personal data — ever. This is a core policy, not a legal
          technicality.
        </LegalHighlight>
      </LegalSection>

      <LegalSection id="information-we-collect" index="01" title="Information We Collect">
        <LegalDataTable
          headers={["Category", "Examples", "Purpose"]}
          rows={DATA_COLLECTION_ROWS}
        />
      </LegalSection>

      <LegalSection id="how-we-use" index="02" title="How We Use Your Data">
        <LegalList items={PRIVACY_USE_ITEMS} />
      </LegalSection>

      <LegalSection id="data-sharing" index="03" title="Data Sharing & Third Parties">
        <LegalParagraph>
          We share data only with trusted third parties essential to platform operations, and only
          to the extent strictly necessary. All partners are bound by data processing agreements.
        </LegalParagraph>
        <LegalDataTable
          headers={["Recipient", "Purpose", "Data Shared"]}
          rows={DATA_SHARING_ROWS}
        />
      </LegalSection>

      <LegalSection id="privacy-rights" index="04" title="Your Privacy Rights">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {PRIVACY_RIGHTS.map((right) => (
            <div
              key={right.title}
              className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <p className="mb-1.5 text-sm font-bold tracking-tight text-[var(--color-text-primary)]">
                {right.title}
              </p>
              <p className="text-[13px] font-light leading-relaxed text-[var(--color-text-secondary)]">
                {right.description}
              </p>
            </div>
          ))}
        </div>
        <LegalParagraph className="mt-6">
          To exercise any right, contact{" "}
          <span className="font-medium text-[#C2410C]">{LEGAL_CONTACT.infoEmail}</span> or go to
          Settings → Privacy. We respond within 30 days. You can also use{" "}
          <Link href="/identity/privacy" className="font-medium text-[#C2410C] underline-offset-2 hover:underline">
            account privacy settings
          </Link>{" "}
          when signed in.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="data-security" index="05" title="Data Security">
        <LegalList items={SECURITY_ITEMS} variant="check" />
      </LegalSection>

      <LegalSection id="data-retention" index="06" title="Data Retention">
        <LegalParagraph>
          We retain your data as long as your account is active or as required by law. Upon account
          deletion, personal data is removed within 90 days. Financial transaction records are
          retained for 7 years as required by international tax regulations. Anonymized analytics
          data may be retained indefinitely.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="shopify-commerce" index="07" title="Shopify & Jimvio Commerce">
        <LegalParagraph>
          When a merchant connects a Shopify store to Jimvio Commerce OS, Jimvio acts as a processor
          of store data needed to operate Commerce features (products, inventory, orders,
          fulfillment, and optional supplier routing such as Jimvio Store). Access tokens are stored
          encrypted server-side and are never exposed in the browser.
        </LegalParagraph>
        <LegalList items={SHOPIFY_COMMERCE_ITEMS} />
      </LegalSection>
    </LegalDocumentShell>
  );
}

export function CookiesDocument() {
  return (
    <LegalDocumentShell documentId="cookies">
      <LegalSection id="what-are-cookies" title="What Are Cookies?">
        <LegalParagraph>
          Cookies are small text files placed on your device when you visit a website. They help
          websites remember your preferences, maintain login sessions, and analyze usage patterns.
          Jimvio uses cookies to keep you signed in, remember your settings, understand how the
          platform is used, and show you relevant content. You are always in control of
          non-essential cookies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="cookies-we-use" title="Cookies We Use">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {COOKIE_CARDS.map((cookie) => (
            <div
              key={cookie.name}
              className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
                  {cookie.name}
                </span>
                <span
                  className={
                    cookie.required
                      ? "rounded-full bg-[rgba(255,90,31,0.12)] px-2.5 py-0.5 text-[11px] font-semibold text-[#C2410C]"
                      : "rounded-full bg-[rgba(0,0,0,0.05)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]"
                  }
                >
                  {cookie.required ? "Required" : "Optional"}
                </span>
              </div>
              <p className="mb-2.5 text-[13px] font-light leading-relaxed text-[var(--color-text-secondary)]">
                {cookie.description}
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">Duration: {cookie.duration}</p>
              <p className="text-[12px] text-[var(--color-text-muted)]">Opt-out: {cookie.optOut}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection id="cookie-choices" title="Your Cookie Choices">
        <LegalParagraph>
          Essential cookies are required for sign-in, security, and checkout. Optional cookies and
          similar technologies can be limited through your browser. Jimvio does not currently
          provide a granular in-app cookie consent toggle.
        </LegalParagraph>
        <LegalList
          items={[
            "Visit /cookie-settings for a plain-language overview of essential vs optional cookies.",
            "Use your browser settings to block or delete cookies and site data for jimvio.com.",
            "Clearing site data may also remove affiliate attribution cookies set from referral links.",
            "Signed-in Identity privacy controls manage profile visibility — they are separate from browser cookie controls.",
          ]}
        />
        <LegalHighlight>
          Disabling required cookies (Session and Security) will prevent you from logging in and
          using account-protected features. Optional technologies are described above and may vary
          as platform features evolve.
        </LegalHighlight>
        <LegalParagraph className="mt-4">
          See also{" "}
          <Link href="/cookie-settings" className="font-medium text-[#C2410C] underline-offset-2 hover:underline">
            Cookie Settings
          </Link>{" "}
          and the{" "}
          <Link href="/privacy" className="font-medium text-[#C2410C] underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="third-party-cookies" title="Third-Party Cookies">
        <LegalParagraph>
          Some third-party services — such as analytics providers and payment processors — may set
          their own cookies on your device. These are governed by the respective third-party privacy
          policies. Jimvio ensures all partners are bound by data processing agreements that meet
          our privacy standards.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="advertising-standards" title="Advertising & Creator Disclosure">
        <LegalParagraph>
          All promotional content on Jimvio must meet these advertising standards:
        </LegalParagraph>
        <LegalList items={ADVERTISING_STANDARDS} />
        <LegalParagraph className="mt-6">
          Creator disclosure requirements (FTC & international regulations):
        </LegalParagraph>
        <LegalList items={CREATOR_DISCLOSURE_ITEMS} variant="check" />
      </LegalSection>

      <LegalSection id="copyright-dmca" title="Copyright & DMCA">
        <LegalParagraph>
          Jimvio respects intellectual property rights. To file a copyright infringement notice,
          submit the following to{" "}
          <span className="font-medium text-[#C2410C]">{LEGAL_CONTACT.copyrightEmail}</span>:
        </LegalParagraph>
        <LegalList items={DMCA_REQUIRED_FIELDS} />
        <LegalParagraph className="mt-5">
          Users with repeated valid copyright violations will have their accounts permanently
          terminated. Jimvio maintains a strike-based system aligned with DMCA safe harbor
          provisions. If you believe your content was removed in error, you may file a
          counter-notice and content will be restored after the required waiting period.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="policy-updates" title="Policy Updates">
        <LegalParagraph>
          We may update this Cookie Policy to reflect changes in our practices or applicable
          regulations. We will notify you of significant changes via platform notice or email.
          Continued use after the effective date constitutes acceptance.
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}
