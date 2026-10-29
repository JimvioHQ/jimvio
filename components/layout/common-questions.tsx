"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FaqTopicId =
  | "buyers-sellers"
  | "brands"
  | "affiliates"
  | "dropshippers"
  | "creators"
  | "streamers"
  | "community-owners"
  | "digital-sellers";

const TOPICS: { id: FaqTopicId; label: string }[] = [
  { id: "buyers-sellers", label: "Buyers & Sellers" },
  { id: "brands", label: "Brands" },
  { id: "affiliates", label: "Affiliates" },
  { id: "dropshippers", label: "Dropshippers" },
  { id: "creators", label: "Creators" },
  { id: "streamers", label: "Streamers" },
  { id: "community-owners", label: "Community Owners" },
  { id: "digital-sellers", label: "Digital Sellers" },
];

/**
 * Answers describe behavior that exists in the product.
 * No invented fees, payout clocks, countries, or commission rates.
 */
const FAQS: Record<FaqTopicId, { q: string; a: string }[]> = {
  "buyers-sellers": [
    {
      q: "Can I buy products on Jimvio?",
      a: "Yes. Browse the marketplace and check out with the payment methods shown for that order. Checkout can include card payment through Flutterwave, mobile money, Binance Pay, NowPayments, or your Jimvio wallet when that option is available for the order.",
    },
    {
      q: "How do I sell products on Jimvio?",
      a: "Open your seller tools, create a listing with a price and product details, and publish it. Buyers then find it in the marketplace and complete checkout on the product page.",
    },
    {
      q: "Can I sell both physical and digital products?",
      a: "Yes. A listing can be physical or digital. Physical products are fulfilled by the seller. Digital products grant the buyer access after a successful payment.",
    },
    {
      q: "How do payments and checkout work?",
      a: "The buyer pays on the Jimvio checkout page using a method offered for that order. Completed payments are recorded on the order. Card checkout uses Flutterwave; other methods shown at checkout include mobile money, Binance Pay, and NowPayments.",
    },
    {
      q: "How do orders and fulfillment work?",
      a: "Sellers manage orders from the vendor order tools. A physical order can be marked shipped or delivered, and you can add a tracking number. A digital order grants the buyer access after payment.",
    },
    {
      q: "How do I track my sales and orders?",
      a: "Sellers review orders and sales from the seller and commerce order views. Buyers can follow order status, including tracking when a tracking number has been added.",
    },
    {
      q: "How do I receive my seller earnings?",
      a: "Sale earnings are credited to your Jimvio wallet. From the wallet you request a withdrawal and choose a supported payout method: bank transfer, mobile money, cryptocurrency, or Binance ID. The wallet shows the processing note for the method you select.",
    },
    {
      q: "Can I sell to customers in other countries?",
      a: "You can list products for buyers in the markets Jimvio supports. Whether a specific buyer can purchase and receive the item depends on the shipping and payment options available for that product and checkout.",
    },
  ],
  brands: [
    {
      q: "How can my brand work with creators on Jimvio?",
      a: "Create a UGC or clipping campaign, publish the brief, and review creators who apply or are invited. Creators submit content against that brief for you to approve.",
    },
    {
      q: "How do I create a brand campaign?",
      a: "Start a campaign from the campaign center. Set the brief, budget, and payout rules, then publish it so creators can join.",
    },
    {
      q: "What are UGC & Clipping campaigns?",
      a: "UGC campaigns ask creators for original content. Clipping campaigns are for short clips. Both are managed in Jimvio’s UGC tools, and each campaign shows its own payment model.",
    },
    {
      q: "How do I find the right creators for my campaign?",
      a: "Browse creators in the UGC area and set the requirements on your campaign brief. Creators who match the brief can apply, and you review them before content is approved.",
    },
    {
      q: "How do creators submit campaign content?",
      a: "Creators open the campaign and submit their content for review. You approve or decline submissions in the campaign tools.",
    },
    {
      q: "How do brand campaigns get paid?",
      a: "You fund the campaign budget. Creators are paid from that budget using the model on the brief: a fixed amount per approved piece, a rate per views, or both when the campaign is set up that way. Approved earnings are credited to the creator’s Jimvio wallet.",
    },
    {
      q: "Can I track campaign performance?",
      a: "Yes. Campaign tools show the stats recorded for that campaign, including views, submissions, and budget spend.",
    },
    {
      q: "How can I grow my brand on Jimvio?",
      a: "Publish campaigns, list products, and work with creators from the same account. Results follow the briefs, listings, and budget you actually run.",
    },
  ],
  affiliates: [
    {
      q: "How does Jimvio Affiliate work?",
      a: "You share a tracked product link. When a purchase is attributed to that link, the commission for the product is recorded on your affiliate account.",
    },
    {
      q: "How do I find products to promote?",
      a: "Browse the marketplace and open a product’s affiliate tools, or create links from the affiliate link manager.",
    },
    {
      q: "How do affiliate commissions work?",
      a: "Each product has its own commission terms. After a qualifying order through your tracked link, commission moves from pending to approved, then to paid. The rate is the one shown on that product, not a single platform-wide percentage.",
    },
    {
      q: "Can I create tracked affiliate links?",
      a: "Yes. Affiliate tools generate a tracked short link for a product so clicks and qualifying sales can be attributed to you.",
    },
    {
      q: "Can I create deep links and QR codes?",
      a: "Yes. On a product’s promote page you can copy a deep link and a QR code. Both point at your tracked short link.",
    },
    {
      q: "How do I track clicks, sales, and commissions?",
      a: "The affiliate dashboard and link manager show clicks, conversions, and earnings for each link.",
    },
    {
      q: "When do I receive my affiliate earnings?",
      a: "Approved affiliate earnings are paid into your Jimvio wallet. You then request a withdrawal with a supported payout method. Approval follows order confirmation for that sale.",
    },
    {
      q: "Can I promote products on social media?",
      a: "Yes. Copy the tracked link, deep link, or QR code and share it on the social platforms you use. Attribution stays on that link.",
    },
  ],
  dropshippers: [
    {
      q: "How does dropshipping work on Jimvio?",
      a: "You import a supplier product into your Jimvio store, set your selling price, and fulfill orders through the connected supplier. Commerce is the place to manage that store.",
    },
    {
      q: "How do I find products to dropship?",
      a: "Use Commerce to browse supplier products that can be imported into your store.",
    },
    {
      q: "Can I import products into my Jimvio store?",
      a: "Yes. Importing a supplier product adds it to your Jimvio store so you can price it and sell it.",
    },
    {
      q: "How do I set my selling price and profit margin?",
      a: "You set the selling price on the imported listing. Your margin is the difference between that price and the supplier cost shown for the product.",
    },
    {
      q: "How does inventory synchronization work?",
      a: "Connected supplier listings can sync stock through Jimvio’s supplier inventory sync, including stock updates for linked variants. Older external sales-channel sync pages are no longer the active path.",
    },
    {
      q: "How are dropshipping orders fulfilled?",
      a: "Orders for imported products are fulfilled through the supplier connection and updated on the order, including tracking when the supplier or fulfillment step provides it.",
    },
    {
      q: "Can customers track their orders?",
      a: "Yes, when a tracking number is stored on the order. Buyers can see that tracking status with the order.",
    },
    {
      q: "Can I dropship internationally?",
      a: "You can sell imported products to buyers in markets Jimvio supports. Delivery depends on the shipping the supplier offers for that product.",
    },
  ],
  creators: [
    {
      q: "How can creators make money on Jimvio?",
      a: "Creators earn from UGC and clipping campaigns using the payment model on each brief. The same account can also sell products, share affiliate links, or run a community.",
    },
    {
      q: "How do I create my creator profile?",
      a: "Create your Jimvio account and complete your profile. Creator campaign tools are in the UGC area.",
    },
    {
      q: "How do I find creator opportunities?",
      a: "Open UGC campaigns and apply to briefs that match the work you do. Each brief lists its own requirements.",
    },
    {
      q: "What is UGC on Jimvio?",
      a: "UGC is original content you create for a brand campaign and submit for review.",
    },
    {
      q: "What is clipping on Jimvio?",
      a: "Clipping is short-form clip work for clipping campaigns. Those campaigns live in the clipping tools alongside other UGC campaign types.",
    },
    {
      q: "Do I need a large audience to join campaigns?",
      a: "Not always. Each campaign sets its own requirements on the brief. Read that brief before you apply.",
    },
    {
      q: "How do I submit content to a campaign?",
      a: "Open the campaign and submit your content for review. Payment follows the campaign’s model after the submission is approved.",
    },
    {
      q: "How do I track my creator earnings?",
      a: "Approved campaign earnings are credited to your Jimvio wallet. The wallet is where you see those balances and request a withdrawal.",
    },
  ],
  streamers: [
    {
      q: "How do I go live on Jimvio?",
      a: "Start a session from Jimvio Live. As the host you control the camera and the live room.",
    },
    {
      q: "Can I stream with other creators?",
      a: "Yes. A host can invite co-hosts into the live session.",
    },
    {
      q: "Can I share my screen while streaming?",
      a: "Yes. Live includes screen sharing. A new share appears as a preview, and the host chooses which screen is on the main stage.",
    },
    {
      q: "Can viewers interact with me during a live?",
      a: "Yes. Viewers can use live chat while the session status is live.",
    },
    {
      q: "Can I sell products during a live?",
      a: "The live room does not include its own checkout. You can share a product link in chat; the purchase is completed on that product’s checkout page.",
    },
    {
      q: "Can I promote products during my stream?",
      a: "Yes. Share a marketplace link or an affiliate link during the stream. Sales are completed on the product page and attributed through that link.",
    },
    {
      q: "Can I build a community around my streams?",
      a: "Yes. You can create a community and host live rooms with members there.",
    },
    {
      q: "How can I earn from streaming?",
      a: "Jimvio Live does not pay a separate streaming fee. Earnings come from the other tools you use on the same account, such as product sales, affiliate links, campaigns, or a paid community, and those balances go to your wallet.",
    },
  ],
  "community-owners": [
    {
      q: "How do I create a community on Jimvio?",
      a: "Create a community from the communities area and set its name, description, and who can join.",
    },
    {
      q: "Can my community be public or private?",
      a: "Yes. A community can be free to join or paid. Paid communities use the membership price you set.",
    },
    {
      q: "What can I do inside a Jimvio community?",
      a: "Depending on what you enable, a community can include posts, spaces, chat, live rooms, courses, events, and a community storefront.",
    },
    {
      q: "Can I host live rooms in my community?",
      a: "Yes. Community live rooms let a host or co-host run a session with members.",
    },
    {
      q: "Can I create courses and events?",
      a: "Yes. Communities include courses and events that members can open from the community.",
    },
    {
      q: "Can I monetize my community?",
      a: "Yes. You can charge a membership price, sell items from the community storefront, and turn donations on in community commerce settings.",
    },
    {
      q: "How do I manage members and community spaces?",
      a: "The owner console is where you manage members, spaces, invites, and community settings.",
    },
    {
      q: "How do I grow my community?",
      a: "Invite people with a share link or QR code, and keep the community active with posts, events, courses, and live rooms.",
    },
  ],
  "digital-sellers": [
    {
      q: "What digital products can I sell on Jimvio?",
      a: "You can sell digital listings such as online courses, templates, guides, and other items in the digital catalog. A product can be one-time access or recurring access when you set it up that way.",
    },
    {
      q: "How do I create a digital product?",
      a: "Create a product in the seller tools, mark it as digital, set the price, and add the file or access details buyers should receive.",
    },
    {
      q: "How does digital product delivery work?",
      a: "After a successful payment, Jimvio grants the buyer access to that digital product. If the product is recurring, access follows the billing period and can end when it expires.",
    },
    {
      q: "Can I sell online courses?",
      a: "Yes. Online courses are a digital product category. Communities can also host courses for members.",
    },
    {
      q: "Can I sell subscriptions or recurring access?",
      a: "Yes, when the product’s pricing type is recurring and you set a billing period. Access is renewed for that period and can be revoked when the subscription expires.",
    },
    {
      q: "How do I set pricing for my digital products?",
      a: "You set the price and currency on the product. Recurring products also use the billing period you configure.",
    },
    {
      q: "How do I track digital product sales?",
      a: "Digital sales appear with your other products and orders in the seller tools, including sale counts on each listing.",
    },
    {
      q: "How do I receive my digital product earnings?",
      a: "Digital sale earnings are credited to your Jimvio wallet. Request a withdrawal there using a supported payout method.",
    },
  ],
};

const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

export function FAQSection() {
  const [topic, setTopic] = useState<FaqTopicId>("buyers-sellers");
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  const items = FAQS[topic];

  return (
    <section
      className="jimvio-faq jimvio-home-section relative overflow-x-clip"
      aria-labelledby="jimvio-faq-title"
    >
      <div className={shell}>
        <h2
          id="jimvio-faq-title"
          className="text-[clamp(1.4rem,3.2vw,2.05rem)] font-black tracking-[-0.04em] text-[#111827]"
        >
          Common questions
        </h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#6B7280] sm:text-[16px]">
          Find answers about buying, selling, earning, creating, and growing on Jimvio.
        </p>

        <div className="mt-5 min-w-0 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-6 [&::-webkit-scrollbar]:hidden">
          <div
            role="tablist"
            aria-label="Common question topics"
            className="flex min-w-max gap-5 border-b border-[rgba(17,24,39,0.08)] sm:gap-7"
          >
            {TOPICS.map((t) => {
              const active = topic === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => {
                    setTopic(t.id);
                    setOpen(null);
                  }}
                  className={cn(
                    "shrink-0 border-b-2 pb-3 text-[13px] font-semibold tracking-[-0.01em] transition-colors duration-200 sm:text-[14.5px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
                    "motion-reduce:transition-none",
                    active
                      ? "border-[#FF5A1F] text-[#FF5A1F]"
                      : "border-transparent text-[#6B7280] hover:text-[#111827]",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${topic}`}
          className="mt-1"
        >
          {items.map((item, index) => {
            const isOpen = open === index;
            const panelId = `${baseId}-answer-${index}`;
            return (
              <div key={item.q} className="border-b border-[rgba(17,24,39,0.08)]">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left sm:py-5"
                >
                  <span className="text-[14px] font-medium leading-snug text-[#111827] sm:text-[16px]">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-[#9CA3AF] transition-transform duration-200 sm:size-[18px]",
                      isOpen && "rotate-180 text-[#111827]",
                      "motion-reduce:transition-none",
                    )}
                    aria-hidden
                  />
                </button>
                <div
                  id={panelId}
                  role="region"
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-3xl pb-5 text-[13.5px] leading-relaxed text-[#6B7280] sm:text-[15px]">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
