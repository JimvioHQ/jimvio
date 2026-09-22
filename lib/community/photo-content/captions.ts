/**
 * Natural, non-promotional captions for editorial photo posts.
 */
import type { CaptionKind } from "./types";

const CAPTIONS: Record<string, Partial<Record<CaptionKind, string[]>>> = {
  Technology: {
    progress: [
      "Shipping a quieter part of the stack today. Less noise, clearer ownership.",
      "Refactored this flow after it failed in the messy way. Notes in the thread.",
    ],
    observation: [
      "Tools matter less than the habit of shipping small and checking the edges.",
      "Noticing how much clearer reviews get when the diff stays focused.",
    ],
    bts: [
      "Desk setup for the afternoon. Soft light, one monitor, fewer tabs.",
      "Working from a café for a bit — battery and focus both holding up.",
    ],
    question: [
      "What do you check first when a deploy looks fine but feels wrong?",
      "Curious: do you document decisions in the PR or in a separate note?",
    ],
    recommendation: [
      "Worth slowing down on naming before you speed up on features.",
      "A short runbook beats a long postmortem for this kind of issue.",
    ],
    short: ["Quiet progress today.", "Small fix, clearer path."],
  },
  AI: {
    progress: [
      "Tried a tighter prompt loop today. Still needs a human checkpoint.",
      "Automation helped on the boring part. Judgment stayed with us.",
    ],
    observation: [
      "Models are fast. Specifying the edge cases still takes the real time.",
      "Useful when the output is draft-quality, not when it pretends to be final.",
    ],
    bts: [
      "Laptop open, evaluating another workflow. Logging what actually saved time.",
      "Whiteboard first, automation second — order matters.",
    ],
    question: [
      "Where do you still insist on a human review in your AI workflow?",
      "Anyone else keeping a failure log for prompts that sounded good?",
    ],
    recommendation: [
      "Start with one repetitive task. Measure before you expand the surface.",
      "Keep a rollback path. Fancy pipelines still fail in ordinary ways.",
    ],
    short: ["Human in the loop.", "Draft, then decide."],
  },
  Programming: {
    progress: [
      "Closed a stubborn bug by reading the logs more carefully than the code.",
      "Tests caught what the happy path missed. Glad they were there.",
    ],
    observation: [
      "Readable code ages better than clever code in this codebase.",
      "The hard part was the interface, not the algorithm.",
    ],
    bts: ["Late afternoon coding session. One ticket, no context switching.", "Terminal, tea, and a smaller diff than yesterday."],
    question: ["How do you keep local setups from drifting across the team?", "Favorite way to leave breadcrumbs for the next person?"],
    recommendation: ["Prefer explicit errors over silent defaults here.", "Delete dead paths when you touch a file — future you will thank you."],
    short: ["Green tests.", "One clean PR."],
  },
  Business: {
    progress: [
      "Spent the afternoon working on the next version of this idea. Still a lot to improve, but the progress feels good.",
      "Tightened the offer wording after talking to two customers. Clearer already.",
    ],
    observation: [
      "Ops details decide whether a good idea survives the week.",
      "Growth without a simple retention loop is just noise.",
    ],
    bts: ["Laptop and a quiet corner. Mapping the next sprint without the slogans.", "Whiteboard session — fewer sticky notes than last time, better questions."],
    question: ["What metric do you trust most in the first 90 days?", "How do you decide when to stop polishing and ship?"],
    recommendation: ["Talk to one real customer before another slide deck.", "Write the operating checklist before the launch post."],
    short: ["Customers first.", "Ops over theater."],
  },
  Finance: {
    progress: ["Updated my tracking sheet. Boring, but it keeps decisions honest.", "Reviewed the plan again with quieter assumptions."],
    observation: ["Clarity beats complexity when money is involved.", "Long-term habits show up more than short-term drama."],
    bts: ["Coffee and a spreadsheet. Not glamorous — useful.", "Quiet morning reviewing numbers with fewer tabs open."],
    question: ["What do you revisit monthly without overreacting?", "Anyone else separating spending categories more strictly this year?"],
    recommendation: ["Write the rule when you are calm, not when you are reacting.", "Simple tracking you will actually open beats a fancy system."],
    short: ["Keep it simple.", "Check the plan."],
  },
  Trading: {
    progress: ["Reviewed the journal. Process held even when the day did not.", "Smaller size today. Discipline over impulse."],
    observation: ["A plan without risk limits is just hope.", "Screenshots help memory; rules help behavior."],
    bts: ["Charts open, notifications off. Trying to stay with the plan.", "End-of-day notes before closing the platform."],
    question: ["What do you write down after a good day — not only the bad ones?", "How do you keep size consistent when emotions spike?"],
    recommendation: ["Risk first. Narrative later.", "If you cannot explain the setup in one sentence, skip it."],
    short: ["Stick to the plan.", "Journal first."],
  },
  Marketing: {
    progress: ["Reworked the landing message. Shorter, more specific.", "Tested one channel with a clearer CTA. Early signal only."],
    observation: ["Honest positioning travels further than loud claims.", "Distribution fails quietly when the offer is fuzzy."],
    bts: ["Drafting copy with the product open beside me — fewer adjectives that way.", "Campaign board for the week. Three bets, not twelve."],
    question: ["What channel still works for you without burning trust?", "Do you write for skeptics or for fans first?"],
    recommendation: ["Lead with proof you can stand behind.", "Cut half the adjectives and keep the specifics."],
    short: ["Clearer copy.", "One honest CTA."],
  },
  Design: {
    progress: ["Tightened spacing and hierarchy. Feels calmer already.", "Revisited the empty state — it was doing too much talking."],
    observation: ["Clarity beats decoration when people are in a hurry.", "Constraints made the layout better than another freeform pass."],
    bts: ["Figma open, phone beside it. Checking the boring breakpoints.", "Moodboard trimmed down to what we will actually ship."],
    question: ["What do you remove first when a screen feels crowded?", "Anyone else designing the error state before the success state?"],
    recommendation: ["Design the loading and empty states early.", "One primary action per view still wins."],
    short: ["Cleaner layout.", "Less chrome."],
  },
  Photography: {
    progress: ["Testing a different angle today. Natural light made a bigger difference than I expected.", "Edited lightly — kept the grain, dropped the heavy filters."],
    observation: ["Patience with light beats another overlay.", "The frame got better when I stepped two meters back."],
    bts: ["Shot this setup on my phone today. Still experimenting with the lighting.", "Camera bag, quiet street, one hour before the light changed."],
    question: ["Do you prefer one strong frame or a short series?", "What do you check before you raise the ISO?"],
    recommendation: ["Walk the scene before you shoot. Composition shows up early.", "Keep a few frames unedited so you remember what the light actually did."],
    short: ["Natural light.", "One honest frame."],
  },
  Gaming: {
    progress: ["Practiced the same sequence until it felt boring — then it clicked.", "Session notes: fewer tilted rounds, better focus."],
    observation: ["Warm-ups matter more than another highlight clip.", "Team call clarity beats mechanical flash for us."],
    bts: ["Controller charged, notifications muted. Short session, clear goal.", "Desk setup for a ranked block — water nearby, no multitasking."],
    question: ["What do you reset after a rough match?", "Anyone else reviewing VODs with a timer so it stays useful?"],
    recommendation: ["One improvement per session. Stack them weekly.", "Stretch before long sessions. Hands last longer."],
    short: ["Good session.", "Stay focused."],
  },
  Education: {
    progress: ["Finished a chapter and wrote three questions I still cannot answer.", "Studied in shorter blocks today. Retention felt better."],
    observation: ["Teaching a concept out loud exposes the gaps quickly.", "Notes that I can revisit beat notes that look impressive."],
    bts: ["Books and a quiet table. Phone in another room for an hour.", "Library corner — wordy notes, fewer highlights."],
    question: ["How do you review without rereading everything?", "What makes a study group actually useful for you?"],
    recommendation: ["Write the question before you hunt the answer.", "Explain it simply once. That is the real test."],
    short: ["Keep learning.", "Notes first."],
  },
  Entertainment: {
    progress: ["Rewatched a scene for craft, not nostalgia. Timing still holds up.", "Finished a long series slowly on purpose."],
    observation: ["Good stories respect silence as much as spectacle.", "Recommendations stick when you say what almost did not work."],
    bts: ["Couch, low light, one episode without scrolling.", "Theater popcorn energy at home — phone face down."],
    question: ["What have you recommended lately without spoiling the turn?", "Do you prefer short reviews or long scene breakdowns?"],
    recommendation: ["Share one specific moment, not a vague five-star take.", "Leave room for people who have not seen it yet."],
    short: ["Worth the watch.", "Quiet night in."],
  },
  Health: {
    progress: ["Kept the routine simple this week. Sleep improved first.", "Cooked something basic and colorful. Felt better afterward."],
    observation: ["Small consistent choices beat dramatic resets.", "Stress shows up in the body before the calendar admits it."],
    bts: ["Morning stretch by the window. Nothing fancy.", "Grocery haul leaning toward simple meals."],
    question: ["What habit actually stuck for you this month?", "Anyone else tracking energy instead of only steps?"],
    recommendation: ["Protect sleep before you optimize workouts.", "Drink water before the third coffee."],
    short: ["Simple routine.", "Feel better."],
  },
  Fitness: {
    progress: ["Morning run done. Keeping the routine simple has been working better for me.", "Strength day was short and honest. No hero sets."],
    observation: ["Consistency looks ordinary from the outside.", "Form over load when you are rebuilding."],
    bts: ["Gym bag, water bottle, playlist with no ads.", "Outdoor session — cooler air helped more than expected."],
    question: ["What do you recover with after harder days?", "Do you prefer fixed programs or flexible weekly goals?"],
    recommendation: ["Warm up like it matters. It does.", "Log the session even when it was average."],
    short: ["Session done.", "Keep showing up."],
  },
  Sports: {
    progress: ["Watched the match with fewer hot takes and more patience.", "Training notes from today: spacing and first touch."],
    observation: ["Tactics matter, but composure decides late minutes.", "Highlights miss the boring work that made the play."],
    bts: ["Match day energy from the living room. Notebook open.", "Pitch-side light after practice — legs tired, head clear."],
    question: ["What detail do casual viewers usually miss?", "Who is actually improving quietly this season?"],
    recommendation: ["Argue with evidence, not just loyalty.", "Celebrate craft, not only the scoreline."],
    short: ["Good game.", "Still thinking about that play."],
  },
  Music: {
    progress: ["Rehearsed the bridge until the timing sat right.", "Mixed a little quieter. Dynamics came back."],
    observation: ["Silence between notes is part of the arrangement.", "Live rooms teach what headphones hide."],
    bts: ["Headphones on, window open. Drafting a loop.", "Studio corner — cable chaos, focused ears."],
    question: ["What track have you been sitting with lately?", "Do you write lyrics first or melody first these days?"],
    recommendation: ["Record a rough take early. Perfect later.", "Listen on a bad speaker once. Truth shows up."],
    short: ["Keep playing.", "One honest take."],
  },
  Faith: {
    progress: ["Quiet morning. Grateful for a slower pace.", "Sat with a short passage longer than usual."],
    observation: ["Gentle rooms still need honesty.", "Community shows up in ordinary kindness."],
    bts: ["Early light through the window. Soft start to the day.", "Gathered with people who listen more than they perform."],
    question: ["What practice helps you stay grounded this season?", "How do you keep conversations kind when opinions differ?"],
    recommendation: ["Make space for quiet before the noise of the week.", "Encourage someone without turning it into a speech."],
    short: ["Grateful today.", "Peace in the ordinary."],
  },
  Travel: {
    progress: ["Wandered without a packed itinerary. Noticed more.", "Packed lighter this time. Walked farther."],
    observation: ["Local mornings teach more than rushed landmarks.", "Maps help; asking politely helps more."],
    bts: ["Window seat light. Notebook for the small details.", "Street food stop — simple, excellent."],
    question: ["What do you refuse to over-schedule on a short trip?", "Best tip for staying present instead of collecting photos only?"],
    recommendation: ["Leave one afternoon empty on purpose.", "Learn three local phrases. Doors open differently."],
    short: ["Good light today.", "Slow travel."],
  },
  Startups: {
    progress: ["Customer call clarified the next build better than our roadmap did.", "Cut a feature we loved. Shipping got simpler."],
    observation: ["Speed without learning is just motion.", "Founders talk distribution; teams live in support tickets."],
    bts: ["Whiteboard, laptop, leftover coffee. Real planning.", "Office corner after hours — quieter thinking."],
    question: ["What did you kill this month that freed capacity?", "How do you keep team morale through ambiguous weeks?"],
    recommendation: ["Talk to users before another internal debate.", "Write the weekly update even when progress is small."],
    short: ["Ship and learn.", "Talk to users."],
  },
  Fashion: {
    progress: ["Tried a quieter palette. Feels more like me.", "Tailoring made the simplest piece look finished."],
    observation: ["Fit beats trend for everyday wear.", "Texture shows up better in natural light."],
    bts: ["Mirror check before heading out. No rush.", "Rail of options narrowed to three."],
    question: ["What piece do you reach for without thinking?", "Do you buy for season or for years?"],
    recommendation: ["Invest in fit before logos.", "Photograph outfits in daylight once — editing gets honest."],
    short: ["Clean look.", "Keep it simple."],
  },
  Ecommerce: {
    progress: ["Cleaned the product photos. Conversion clarity first.", "Rewrote shipping copy so expectations match reality."],
    observation: ["Trust is a page-speed and a return policy.", "Catalog clutter hides the products people actually want."],
    bts: ["Packing table, tape gun, better labels.", "Storefront admin open — pruning SKUs."],
    question: ["What detail reduces support tickets for you?", "How do you decide when a product photo is good enough?"],
    recommendation: ["Answer the size/fit question on the page, not in DMs.", "Show the product in use once, not only on white."],
    short: ["Clearer listing.", "Ops matters."],
  },
  Creator: {
    progress: ["Shot this setup on my phone today. Still experimenting with the lighting.", "Edited shorter. Retention felt better in the draft."],
    observation: ["Consistency beats viral luck for durable work.", "Behind-the-scenes builds more trust than polish alone."],
    bts: ["Mic check, softbox, one take for energy.", "Desk creator corner — cables managed for once."],
    question: ["What do you batch vs create live?", "How do you protect creative time from admin creep?"],
    recommendation: ["Publish the useful version, not the perfect one.", "Keep a swipe file of what almost worked."],
    short: ["Creating today.", "One more take."],
  },
  News: {
    progress: ["Read past the headline before sharing. Context changed the take.", "Compared two sources on the same story. Nuance survived."],
    observation: ["Speed without verification is just rumor with better fonts.", "Local details often correct the national framing."],
    bts: ["Coffee and the morning papers — digital and print.", "Quiet desk, two tabs, one notepad."],
    question: ["What source do you trust for first context, not last word?", "How do you avoid stacking outrage tabs?"],
    recommendation: ["Wait for the second report on breaking claims.", "Share the article, not only the screenshot."],
    short: ["Read carefully.", "Context first."],
  },
  Other: {
    progress: ["Made steady progress on something quiet but useful.", "Showed up, did the work, left room for tomorrow."],
    observation: ["Ordinary days compound when you treat them kindly.", "Community is built in replies, not announcements."],
    bts: ["Simple workspace today. Fewer distractions.", "Afternoon light through the window — good enough."],
    question: ["What are you refining this week?", "What helped you get unstuck recently?"],
    recommendation: ["Share the process, not only the outcome.", "Ask one specific question when you post."],
    short: ["Steady day.", "Keep going."],
  },
};

const FALLBACK = CAPTIONS.Other!;

const KIND_ORDER: CaptionKind[] = [
  "progress",
  "observation",
  "bts",
  "question",
  "recommendation",
  "short",
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function captionKinds(): CaptionKind[] {
  return [...KIND_ORDER];
}

export function buildPhotoCaption(input: {
  category: string;
  communityName: string;
  salt: string;
  kind?: CaptionKind;
}): { kind: CaptionKind; body: string; title: string } {
  const category = input.category?.trim() || "Other";
  const pool = CAPTIONS[category] ?? FALLBACK;
  const h = hash(input.salt);
  const kind = input.kind ?? KIND_ORDER[h % KIND_ORDER.length]!;
  const lines = pool[kind] ?? FALLBACK[kind] ?? FALLBACK.short ?? ["Steady day."];
  const body = lines[h % lines.length]!;
  const title =
    kind === "question"
      ? body.length > 72
        ? `${body.slice(0, 69)}…`
        : body
      : kind === "short"
        ? body
        : `${input.communityName}: ${body.slice(0, 48)}${body.length > 48 ? "…" : ""}`;
  return { kind, body, title: title.slice(0, 120) };
}
