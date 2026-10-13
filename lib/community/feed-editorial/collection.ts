/**
 * Curated editorial posts for the Communities feed.
 * Provenance key: attachments.jimvio.key = feed-editorial:v1:{id}
 * Authors must be existing editorial personas. No engagement is defined here.
 */
import { ALL_EDITORIAL_PERSONAS } from "@/lib/community/editorial-personas";
import { extractHashtags } from "@/lib/feed/composer-utils";

export const FEED_EDITORIAL_KEY_PREFIX = "feed-editorial:v1:";

export type FeedEditorialDraft = {
  id: string;
  category: string;
  personaKey: string;
  /** Unsplash photo id (Unsplash License). */
  photoId: string;
  title: string;
  /** Original caption. Hashtags are included in the body. */
  body: string;
  hashtags: string[];
};

export function feedEditorialKey(id: string): string {
  return `${FEED_EDITORIAL_KEY_PREFIX}${id}`;
}

export function normalizeCaption(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

const P: FeedEditorialDraft[] = [
  {
    id: "fe-001",
    category: "Business",
    personaKey: "reed",
    photoId: "photo-1521737604893-d14cc237f11d",
    title: "Alignment is a management system, not a poster",
    body: `A team can look busy and still be pulling in different directions.

The useful question is not whether everyone uses the same tools. It is whether a decision made in one room still makes sense two weeks later in another.

I have started asking three plain questions in planning:
1. What are we choosing not to do?
2. Who owns the outcome if this slips?
3. What would tell us early that the plan is wrong?

None of that is glamorous. It is how a group of capable people becomes an organization that can repeat a good result.

#Leadership #CareerGrowth #SmallBusiness`,
    hashtags: ["leadership", "careergrowth", "smallbusiness"],
  },
  {
    id: "fe-002",
    category: "Startups",
    personaKey: "eric",
    photoId: "photo-1559136555-9303baea8ebd",
    title: "The first offer should be easy to explain",
    body: `Whiteboards fill up fast when a new offer is still fuzzy.

Before another slide, write the offer in one sentence a customer could repeat. Who it is for. What changes for them. What it costs in time or money.

If that sentence needs a footnote, the product is not ready for a louder channel.

#Entrepreneurship #Startups #SmallBusiness`,
    hashtags: ["entrepreneurship", "startups", "smallbusiness"],
  },
  {
    id: "fe-003",
    category: "Technology",
    personaKey: "jordan",
    photoId: "photo-1519389950473-47ba0277781c",
    title: "Shipping smaller than the meeting",
    body: `Rooms like this produce a lot of ideas and very few owners.

A practical rule that has held up: leave with one change that can ship this week, named to a person, with a way to tell if it worked. The rest goes on a list, not into the sprint.

#Technology #Innovation #Leadership`,
    hashtags: ["technology", "innovation", "leadership"],
  },
  {
    id: "fe-004",
    category: "AI",
    personaKey: "kyle",
    photoId: "photo-1677442136019-21780ecad995",
    title: "Keep a human checkpoint",
    body: `Models are quick at a first draft. They are also confident when they are wrong.

A workable loop:
- Ask for a draft, not a decision.
- Check names, numbers, and claims against a source you trust.
- Keep the rollback path obvious.

Speed is useful. An unchecked paragraph that sounds finished is how small errors travel.

#ArtificialIntelligence #Technology #Innovation`,
    hashtags: ["artificialintelligence", "technology", "innovation"],
  },
  {
    id: "fe-005",
    category: "Programming",
    personaKey: "daniel",
    photoId: "photo-1461749280684-dccba630e2f6",
    title: "Read the failure before rewriting the function",
    body: `A red test is information. The temptation is to rewrite the whole path.

Most of the time the log already says which assumption broke. I write that assumption down, fix the smallest surface, and only then tidy the code around it.

#Programming #Technology #CareerGrowth`,
    hashtags: ["programming", "technology", "careergrowth"],
  },
  {
    id: "fe-006",
    category: "Marketing",
    personaKey: "hana",
    photoId: "photo-1460925895917-afdab827c52f",
    title: "A chart is not a strategy",
    body: `Dashboards are good at showing movement. They are poor at explaining why someone trusted you.

Before celebrating a spike, write the sentence a skeptical customer would need: what was promised, where they saw it, and what they received. If that sentence is vague, the chart is just activity.

#DigitalMarketing #Marketing #CreatorEconomy`,
    hashtags: ["digitalmarketing", "marketing", "creatoreconomy"],
  },
  {
    id: "fe-007",
    category: "Creator",
    personaKey: "zoe",
    photoId: "photo-1590602847861-f357a9332bbc",
    title: "Worth filming is a craft question",
    body: `How do you decide an idea is worth filming?

A filter I use before opening a project:
- Can I show one specific scene, not a slogan?
- Do I know who this is for?
- Is there a point I can say in one breath?

If those three are fuzzy, it stays a note. Specifics beat another generic pep talk.

#ContentCreation #CreatorEconomy #DigitalMarketing`,
    hashtags: ["contentcreation", "creatoreconomy", "digitalmarketing"],
  },
  {
    id: "fe-008",
    category: "Ecommerce",
    personaKey: "rita",
    photoId: "photo-1441986300917-64674bd600d8",
    title: "The shop floor still teaches the product page",
    body: `A rack of clothes is a reminder that online catalogs are physical decisions: fit, fabric, returns, and how long a customer waits.

The product page should answer the questions a person asks while standing in front of the item. Materials. Care. What it is not good for. Those lines reduce more support tickets than another adjective.

#Ecommerce #SmallBusiness #Fashion`,
    hashtags: ["ecommerce", "smallbusiness", "fashion"],
  },
  {
    id: "fe-009",
    category: "Education",
    personaKey: "lea",
    photoId: "photo-1434030216411-0b793f4b4173",
    title: "Notes that you will reopen",
    body: `A notebook only helps if future-you can find the decision.

I keep four headings and stop:
- What I tried
- What changed
- What I still do not know
- The next small step

Long journals feel productive. Short ones get reused.

#CareerGrowth #Education #Leadership`,
    hashtags: ["careergrowth", "education", "leadership"],
  },
  {
    id: "fe-010",
    category: "Travel",
    personaKey: "hugo",
    photoId: "photo-1469854523086-cc02fe5d8800",
    title: "A road is not a personality",
    body: `Travel photos travel well. The useful part is quieter: how a place is actually reached, what a day costs, and what you would tell a friend who has one free afternoon.

I am wary of captions that invent a personal story for a landscape. A clear observation is enough.

#Travel #Lifestyle #Photography`,
    hashtags: ["travel", "lifestyle", "photography"],
  },
  {
    id: "fe-011",
    category: "Business",
    personaKey: "ada",
    photoId: "photo-1523805009345-7448845a9e53",
    title: "Local knowledge is an operating advantage",
    body: `Landscapes like this get used as a backdrop. The business question is more ordinary: who already knows the roads, the seasons, the suppliers, and the customers.

Imported playbooks fail when they ignore that knowledge. The teams that last treat local operators as partners, not as a photo caption.

#AfricanStartups #Entrepreneurship #SmallBusiness`,
    hashtags: ["africanstartups", "entrepreneurship", "smallbusiness"],
  },
  {
    id: "fe-012",
    category: "Fitness",
    personaKey: "chris",
    photoId: "photo-1517836357463-d25dfeac3438",
    title: "Training you can repeat on a busy week",
    body: `A full gym is inspiring for about one session. The plan that survives is the one you can do when the week is messy.

Two or three movements, a weight you can control, and a note of how it felt. Consistency is the whole method.

#Fitness #Health #Lifestyle`,
    hashtags: ["fitness", "health", "lifestyle"],
  },
  {
    id: "fe-013",
    category: "Health",
    personaKey: "sofia",
    photoId: "photo-1504674900247-0877df9cc836",
    title: "A plate is a business question too",
    body: `Food photos are easy. Running a small kitchen is not.

If you cook for other people, the unglamorous list matters: sourcing, waste, a price that covers the hour, and a way for a customer to tell you what they actually liked.

What has helped a food business you respect stay consistent?

#SmallBusiness #Food #Lifestyle`,
    hashtags: ["smallbusiness", "food", "lifestyle"],
  },
  {
    id: "fe-014",
    category: "Design",
    personaKey: "maya",
    photoId: "photo-1541462608143-67571c6738dd",
    title: "One primary action",
    body: `Screens get crowded because every stakeholder wants their sentence above the fold.

The test I use: cover the page with your hand and leave one control visible. If a new person still knows what to do, the hierarchy is working. If not, the decoration is doing the talking.

#Design #Technology #ContentCreation`,
    hashtags: ["design", "technology", "contentcreation"],
  },
  {
    id: "fe-015",
    category: "Finance",
    personaKey: "omar",
    photoId: "photo-1554224155-6726b3ff858f",
    title: "A simple sheet beats a dramatic forecast",
    body: `This is not advice for your situation. It is a habit.

Separate money you must spend, money you chose to spend, and money you are pretending is profit. Update it on a calm day. The point is to see the pattern before a loud week invents a story.

#Finance #SmallBusiness #CareerGrowth`,
    hashtags: ["finance", "smallbusiness", "careergrowth"],
  },
  {
    id: "fe-016",
    category: "Marketing",
    personaKey: "sarah",
    photoId: "photo-1551836022-d5d88e9218df",
    title: "Write next to the product",
    body: `Copy drifts when it is written far from the thing being sold.

Open the product, use it for ten minutes, then write the sentence a first-time customer needs. Cut the adjectives that you would not say out loud.

#DigitalMarketing #ContentCreation #Ecommerce`,
    hashtags: ["digitalmarketing", "contentcreation", "ecommerce"],
  },
  {
    id: "fe-017",
    category: "Creator",
    personaKey: "cara",
    photoId: "photo-1574717024653-61fd2cf4d44d",
    title: "Edit for the person who will leave",
    body: `Timelines reward everything except restraint.

I watch the first 15 seconds as if I do not know the creator. If the point is still hidden, the intro is a delay. Cut until a stranger could tell a friend what the piece was about.

#ContentCreation #CreatorEconomy #Video`,
    hashtags: ["contentcreation", "creatoreconomy", "video"],
  },
  {
    id: "fe-018",
    category: "Programming",
    personaKey: "yuki",
    photoId: "photo-1515879218367-8466d910aaa4",
    title: "Release notes are a product",
    body: `A green build is not the same as a calm release.

Write what changed, who it affects, and how to undo it. Future debugging starts in that note, not in memory.

#Programming #Technology #Innovation`,
    hashtags: ["programming", "technology", "innovation"],
  },
  {
    id: "fe-019",
    category: "Startups",
    personaKey: "priya",
    photoId: "photo-1556761175-b413da4baf72",
    title: "Talk to one customer before the deck grows",
    body: `Workshops feel like progress because everyone leaves with markers on their hands.

The cheaper test is a conversation with one person who would pay. Ask what they do today, what it costs them, and what they have already tried. Then decide whether the deck still deserves another page.

#Startups #Entrepreneurship #Innovation`,
    hashtags: ["startups", "entrepreneurship", "innovation"],
  },
  {
    id: "fe-020",
    category: "Business",
    personaKey: "nena",
    photoId: "photo-1573496359142-b8d87734a5a2",
    title: "A title is not a system",
    body: `Professional photos suggest certainty. The work is usually a checklist nobody wants to own.

If a result depends on one person remembering, it is not a system yet. Write the step, name the backup, and see whether someone else can run it without a meeting.

#Leadership #CareerGrowth #WomenInBusiness`,
    hashtags: ["leadership", "careergrowth", "womeninbusiness"],
  },
  {
    id: "fe-021",
    category: "Technology",
    personaKey: "ben",
    photoId: "photo-1550751827-4bd374c3f58b",
    title: "Security is a habit, not a theme week",
    body: `Glowing diagrams make security look like a product launch.

The unfashionable version: short-lived access, a place to report something odd, and a person who will actually look. Tools help after those basics exist.

#Technology #Cybersecurity #Innovation`,
    hashtags: ["technology", "cybersecurity", "innovation"],
  },
  {
    id: "fe-022",
    category: "AI",
    personaKey: "noah",
    photoId: "photo-1485827404703-89b55fcc595e",
    title: "Automate the boring step, not the judgment",
    body: `A machine in a studio is a picture of automation. Most useful automation is dull: renaming files, sorting a queue, drafting a summary someone will still read.

Pick one repetitive step. Time it for a week. Then decide whether a tool earned a place. Do not start by replacing the decision.

#ArtificialIntelligence #Technology #Productivity`,
    hashtags: ["artificialintelligence", "technology", "productivity"],
  },
  {
    id: "fe-023",
    category: "Ecommerce",
    personaKey: "paul",
    photoId: "photo-1556742049-0cfed4f6a45d",
    title: "The counter is the whole experience",
    body: `Payment is where trust either holds or frays. A card machine, a receipt, a person who can explain a charge.

Online, the same moment is a form. If the total changes at the last step, or the return rule is hidden, you taught the customer to hesitate next time.

#Ecommerce #SmallBusiness #CustomerExperience`,
    hashtags: ["ecommerce", "smallbusiness", "customerexperience"],
  },
  {
    id: "fe-024",
    category: "Education",
    personaKey: "helen",
    photoId: "photo-1481627834876-b7833e8f5570",
    title: "Read less, finish more",
    body: `Shelves suggest that collecting books is the same as learning.

A smaller practice: one chapter, one note in your own words, one place you will use it this week. A finished page beats a saved list.

#Education #CareerGrowth #Learning`,
    hashtags: ["education", "careergrowth", "learning"],
  },
  {
    id: "fe-025",
    category: "Travel",
    personaKey: "vera",
    photoId: "photo-1507525428034-b723cf961d3e",
    title: "Light changes the place more than the filter",
    body: `Coastal light is generous. That is an observation about the scene, not a claim that a particular trip produced this frame.

If you are planning time outdoors, the hour matters more than the caption. Early and late light are kinder to both photos and plans.

#Travel #Photography #Lifestyle`,
    hashtags: ["travel", "photography", "lifestyle"],
  },
  {
    id: "fe-026",
    category: "Fashion",
    personaKey: "tessa",
    photoId: "photo-1445205170230-053b83016050",
    title: "Merchandising is editing",
    body: `A rail of clothing is a sequence. Too many stories and the eye leaves.

Editors and shop owners are doing the same job: remove the piece that does not belong so the remaining ones can be understood. Online grids need that edit even more, because there is no person nearby to explain.

#Fashion #Ecommerce #SmallBusiness`,
    hashtags: ["fashion", "ecommerce", "smallbusiness"],
  },
  {
    id: "fe-027",
    category: "Creator",
    personaKey: "bianca",
    photoId: "photo-1492691527719-9d1e07e534b4",
    title: "A setup is not a point of view",
    body: `Cameras, mics, and desks photograph well. They do not decide what you are willing to say twice.

Before buying another piece of gear, write the series you could make with what you already have. Three pieces, one audience, one promise you can keep.

#CreatorEconomy #ContentCreation #Photography`,
    hashtags: ["creatoreconomy", "contentcreation", "photography"],
  },
  {
    id: "fe-028",
    category: "Business",
    personaKey: "kwame",
    photoId: "photo-1489392191049-fc10c97e64b6",
    title: "Cities are not a single market",
    body: `A skyline is a poor summary of how people buy.

Neighborhoods differ in hours, trust, language, and what “nearby” means. A plan that treats a city as one customer will miss the block where the real demand sits.

If you operate in more than one city, what did you have to relearn?

#AfricanStartups #Entrepreneurship #Business`,
    hashtags: ["africanstartups", "entrepreneurship", "business"],
  },
  {
    id: "fe-029",
    category: "Marketing",
    personaKey: "joel",
    photoId: "photo-1557804506-669a67965ba0",
    title: "Recommend what you can stand behind",
    body: `Affiliate and partner posts age badly when the only relationship is a link.

A fair recommendation names who it helps, who should skip it, and what you were paid or given if anything was. The reader can feel the missing sentence.

#DigitalMarketing #Ecommerce #CreatorEconomy`,
    hashtags: ["digitalmarketing", "ecommerce", "creatoreconomy"],
  },
  {
    id: "fe-030",
    category: "Technology",
    personaKey: "samir",
    photoId: "photo-1454165804606-c3d57bc86b40",
    title: "Cost shows up in the quiet line items",
    body: `Spreadsheets are where cloud bills and tool subscriptions stop being abstract.

Once a month, sort by what surprised you, not by what you expected. The surprise is usually a default you never turned off.

#Technology #Finance #Operations`,
    hashtags: ["technology", "finance", "operations"],
  },
  {
    id: "fe-031",
    category: "Education",
    personaKey: "tina",
    photoId: "photo-1522202176988-66273c2fd55f",
    title: "Group work needs an owner",
    body: `Tables full of laptops look collaborative. The project still needs one person who will send the file.

If you are early in a career, volunteering to write the summary is a skill. It is also how you learn what the group actually decided.

#CareerGrowth #Education #Collaboration`,
    hashtags: ["careergrowth", "education", "collaboration"],
  },
  {
    id: "fe-032",
    category: "Fitness",
    personaKey: "tom",
    photoId: "photo-1476480862126-209bfaa8edc8",
    title: "Easy days are part of the plan",
    body: `Running photos favor the hard effort. The week is built from the easier ones.

If every session is a test, the calendar breaks. Leave room for a short run that does not need a story.

#Fitness #Health #Running`,
    hashtags: ["fitness", "health", "running"],
  },
  {
    id: "fe-033",
    category: "Sports",
    personaKey: "ibrahim",
    photoId: "photo-1574629810360-7efbbe195018",
    title: "Watch the shape, not only the score",
    body: `A pitch tells you about spacing before it tells you about a result.

I like asking what the team did when they did not have the ball. That habit transfers to any group project: what happens in the minutes nobody is celebrating.

#Sports #Leadership #Teamwork`,
    hashtags: ["sports", "leadership", "teamwork"],
  },
  {
    id: "fe-034",
    category: "Health",
    personaKey: "mira",
    photoId: "photo-1490645935967-10de6ba17061",
    title: "Meal prep is logistics",
    body: `Containers on a counter are a planning system, not a personality.

The version that lasts is the one you will actually eat on a Wednesday. Cook what keeps, label it, and stop optimizing the photo.

#Health #Food #Lifestyle`,
    hashtags: ["health", "food", "lifestyle"],
  },
  {
    id: "fe-035",
    category: "Design",
    personaKey: "fatima",
    photoId: "photo-1581291518633-83b4ebd1d83e",
    title: "Sketch the empty state",
    body: `Wireframes usually show the happy path, full of content.

The first screen a real person meets is often empty, loading, or wrong. Design that state with the same care. Tell them what happened and what they can do next.

#Design #Technology #Product`,
    hashtags: ["design", "technology", "product"],
  },
  {
    id: "fe-036",
    category: "Creator",
    personaKey: "amina",
    photoId: "photo-1478737270239-2f02b77fc618",
    title: "A microphone is a promise to be clear",
    body: `Studios photograph as luxury. The job is plainer: can a listener hear you on a phone in a noisy street?

Record a minute, play it back on the smallest speaker you own, and fix the room before you fix the script.

#ContentCreation #CreatorEconomy #Podcasting`,
    hashtags: ["contentcreation", "creatoreconomy", "podcasting"],
  },
  {
    id: "fe-037",
    category: "Ecommerce",
    personaKey: "marco",
    photoId: "photo-1586528116311-ad8dd3c8310d",
    title: "The warehouse is the brand",
    body: `Customers meet the brand in a box, not in the campaign.

Aisle labels, a pick list someone else can follow, and a way to know an item is actually there — that is the store. Marketing cannot repair a week of “it will ship soon.”

#Ecommerce #Operations #SmallBusiness`,
    hashtags: ["ecommerce", "operations", "smallbusiness"],
  },
  {
    id: "fe-038",
    category: "Startups",
    personaKey: "otto",
    photoId: "photo-1581091226825-a6a2a5aee158",
    title: "Build the thing you can test this month",
    body: `Hardware and software share a trap: the prototype that cannot be shown to anyone outside the team.

Define the smallest version a stranger can try. Time, cost, and a failure you would accept. Then stop adding features until that trial has a result.

#Innovation #Startups #Technology`,
    hashtags: ["innovation", "startups", "technology"],
  },
  {
    id: "fe-039",
    category: "Business",
    personaKey: "sam",
    photoId: "photo-1600880292203-757bb62b4baf",
    title: "Meetings should end with a verb",
    body: `Standing together is not alignment.

End with a verb and a name: call, write, ship, stop. If the note only contains themes, you had a conversation, not a decision.

#Leadership #CareerGrowth #Teamwork`,
    hashtags: ["leadership", "careergrowth", "teamwork"],
  },
  {
    id: "fe-040",
    category: "Programming",
    personaKey: "jon",
    photoId: "photo-1542831371-29b0f74f9713",
    title: "Leave the next person a map",
    body: `A laptop and a late hour are not a knowledge system.

When you touch a confusing path, add the comment you wished you had found: why this exists, what it must not do, and where the test lives. Brevity is fine. Absence is expensive.

#Programming #OpenSource #CareerGrowth`,
    hashtags: ["programming", "opensource", "careergrowth"],
  },
  {
    id: "fe-041",
    category: "Travel",
    personaKey: "davi",
    photoId: "photo-1530789253388-582c481c54b0",
    title: "Ask what a day actually costs",
    body: `Group travel looks effortless in a wide frame.

The practical version is a shared note: transport, a meal budget, and one hour that is not scheduled. People enjoy a place more when the logistics are not a surprise.

#Travel #Lifestyle #Community`,
    hashtags: ["travel", "lifestyle", "community"],
  },
  {
    id: "fe-042",
    category: "Marketing",
    personaKey: "grace",
    photoId: "photo-1514525253161-7a46d19cd819",
    title: "A crowd is not an audience",
    body: `Events photograph as proof of demand. A crowd can also be curiosity, a free ticket, or a friend of the organizer.

After the night, ask who would come back and pay, and what they would tell someone who missed it. That answer is the marketing.

#DigitalMarketing #Events #CreatorEconomy`,
    hashtags: ["digitalmarketing", "events", "creatoreconomy"],
  },
  {
    id: "fe-043",
    category: "Education",
    personaKey: "ivy",
    photoId: "photo-1427504494785-3a9ca7044f45",
    title: "Learn in public, carefully",
    body: `Books and notes are private until you try to explain them.

A short post that says what you understood, what you might have wrong, and the source you used is more useful than a quote with no link. Invite correction. Do not invent certainty.

#Education #Learning #CareerGrowth`,
    hashtags: ["education", "learning", "careergrowth"],
  },
  {
    id: "fe-044",
    category: "Finance",
    personaKey: "eli",
    photoId: "photo-1450101499163-c8848c66ca85",
    title: "Read the page you are about to sign",
    body: `Contracts are boring until they are the only record of what was agreed.

Before you sign, mark the date, the price, what happens if either side stops, and who owns the work. If a clause is unclear, ask in writing. This is a habit, not personal legal advice.

#SmallBusiness #Finance #CareerGrowth`,
    hashtags: ["smallbusiness", "finance", "careergrowth"],
  },
  {
    id: "fe-045",
    category: "AI",
    personaKey: "lucas",
    photoId: "photo-1555949963-aa79dcee981c",
    title: "Do not paste what you cannot share",
    body: `A screen full of code is a reminder: prompts and uploads leave your desk.

Customer data, keys, and unreleased work do not belong in a tool you have not checked. Summarize the problem in your own words. Keep the secrets out of the box.

#ArtificialIntelligence #Technology #Privacy`,
    hashtags: ["artificialintelligence", "technology", "privacy"],
  },
  {
    id: "fe-046",
    category: "Creator",
    personaKey: "nina",
    photoId: "photo-1516035069371-29a1b244cc32",
    title: "Gear is a means",
    body: `Lenses are satisfying objects. They are not the photograph.

Practice the boring frames: a window, a table, a person who is mid-sentence. You learn light there, without needing a new location or a new story about who pressed the shutter.

#Photography #ContentCreation #CreativePractice`,
    hashtags: ["photography", "contentcreation", "creativepractice"],
  },
  {
    id: "fe-047",
    category: "Business",
    personaKey: "reed",
    photoId: "photo-1497366216548-37526070297c",
    title: "Quiet offices still need a rhythm",
    body: `An empty desk can mean focus or it can mean nobody knows the priority.

A short written plan for the week — three outcomes, not thirty tasks — gives a quiet room a shared clock. People can work alone without working at cross purposes.

#Leadership #RemoteWork #CareerGrowth`,
    hashtags: ["leadership", "remotework", "careergrowth"],
  },
  {
    id: "fe-048",
    category: "Ecommerce",
    personaKey: "rita",
    photoId: "photo-1472851294608-062f824d29cc",
    title: "Markets teach pricing faster than slides",
    body: `A stall shows price, quality, and trust in the same glance.

Online listings hide two of those. Say what the item is made of, what a fair comparison costs, and how a buyer can reach a person. The market already does this without a brand deck.

#Ecommerce #SmallBusiness #AfricanStartups`,
    hashtags: ["ecommerce", "smallbusiness", "africanstartups"],
  },
  {
    id: "fe-049",
    category: "Startups",
    personaKey: "eric",
    photoId: "photo-1522071820081-009f0129c71c",
    title: "A small team needs fewer priorities",
    body: `Five people around a table cannot carry twelve goals.

Pick the one constraint that, if moved, makes the others easier. Write it where everyone can see it. Review it on Friday without adding a new slogan.

#Startups #Leadership #Entrepreneurship`,
    hashtags: ["startups", "leadership", "entrepreneurship"],
  },
  {
    id: "fe-050",
    category: "Technology",
    personaKey: "alex",
    photoId: "photo-1558655146-d09347e92766",
    title: "Design and engineering share the edge cases",
    body: `The interesting part of a product is rarely the hero screen. It is the moment something fails and a person still knows what to do.

Sit with the engineer who sees the errors. Design the message together. The interface is the apology and the next step, not a coat of paint.

#Design #Technology #Product`,
    hashtags: ["design", "technology", "product"],
  },
  {
    id: "fe-051",
    category: "Food",
    personaKey: "sofia",
    photoId: "photo-1414235077428-338989a2e8c0",
    title: "Hospitality is the repeat visit",
    body: `A plated dish is the advertisement. The return visit is the business.

Did the person know what they ordered, how long it would take, and whether they could change it? Restaurants and online menus fail in the same place: surprise.

What makes you go back to a small food business?

#Food #SmallBusiness #Hospitality`,
    hashtags: ["food", "smallbusiness", "hospitality"],
  },
  {
    id: "fe-052",
    category: "Fitness",
    personaKey: "mira",
    photoId: "photo-1544367567-0f2fcb009e0b",
    title: "Rest is a training decision",
    body: `Stillness photographs as wellness branding. Practically, rest is how tissue and attention recover.

If the only metric is more, the plan is incomplete. Schedule the easy day on purpose.

#Fitness #Health #Wellbeing`,
    hashtags: ["fitness", "health", "wellbeing"],
  },
  {
    id: "fe-053",
    category: "Marketing",
    personaKey: "hana",
    photoId: "photo-1540575467063-178a50c2df87",
    title: "A room full of badges is not distribution",
    body: `Conferences are useful for conversations you cannot get in a comment thread.

They are a weak plan if the only outcome is a photo. Before you go, name two people you want to learn from and one question you will ask. After, write what you will change. Otherwise it was attendance.

#DigitalMarketing #CareerGrowth #Networking`,
    hashtags: ["digitalmarketing", "careergrowth", "networking"],
  },
  {
    id: "fe-054",
    category: "Programming",
    personaKey: "ben",
    photoId: "photo-1555066931-4365d14bab8c",
    title: "Name the failure mode",
    body: `Code on a screen is the easy part to share. The useful part is what happens when the network is slow or the input is empty.

Write that case down next to the happy path. Reviewers can approve a feature faster when they can see how it fails.

#Programming #Technology #Quality`,
    hashtags: ["programming", "technology", "quality"],
  },
  {
    id: "fe-055",
    category: "Business",
    personaKey: "ada",
    photoId: "photo-1556761175-5973dc0f32e7",
    title: "Partnerships need a written next step",
    body: `Handshakes photograph as agreement. The follow-up email is the agreement.

Who does what, by when, and what “done” looks like. If that note is awkward to send, the partnership is still an idea.

#Entrepreneurship #AfricanStartups #Leadership`,
    hashtags: ["entrepreneurship", "africanstartups", "leadership"],
  },
  {
    id: "fe-056",
    category: "Education",
    personaKey: "claire",
    photoId: "photo-1524178232363-1fb2b075b655",
    title: "Teaching is a design problem",
    body: `A room of listeners does not mean the idea landed.

Check with one specific question at the end, not “any questions?” Ask someone to restate the point in their own words. You will hear the gap while you can still fix it.

#Education #Leadership #Learning`,
    hashtags: ["education", "leadership", "learning"],
  },
  {
    id: "fe-057",
    category: "Creator",
    personaKey: "caleb",
    photoId: "photo-1511671782779-c97d3d27a1d4",
    title: "Practice where nobody is watching",
    body: `Instruments reward the hours that do not become a post.

If you create in public, keep a private rep: the take you will not publish. That is where timing gets honest. The public piece can wait until it is actually ready.

#Music #CreativePractice #ContentCreation`,
    hashtags: ["music", "creativepractice", "contentcreation"],
  },
  {
    id: "fe-058",
    category: "Travel",
    personaKey: "hugo",
    photoId: "photo-1476514525535-07fb3b4ae5f1",
    title: "A view is not a guide",
    body: `Lakes and roads make strong pictures. They are a weak set of instructions.

If you share a place, add the practical layer you can verify: season, a transit option, and what the photo does not show (wind, crowds, a closed road). Leave out any story you cannot support.

#Travel #Photography #Lifestyle`,
    hashtags: ["travel", "photography", "lifestyle"],
  },
  {
    id: "fe-059",
    category: "Technology",
    personaKey: "jordan",
    photoId: "photo-1518770660439-4636190af475",
    title: "The board is not the product",
    body: `Circuits are a useful metaphor and a bad progress report.

Customers experience latency, clarity, and whether the thing did what it said. Report those. Keep the hardware photo for the people who asked for it.

#Technology #Innovation #Product`,
    hashtags: ["technology", "innovation", "product"],
  },
  {
    id: "fe-060",
    category: "Ecommerce",
    personaKey: "paul",
    photoId: "photo-1563013544-824ae1b704d3",
    title: "Unboxing is a cost",
    body: `Bags and tissue look like delight. They are also weight, waste, and a line on the invoice.

Choose packaging a customer can recycle or reuse, and say so. The brand is the decision, not the ribbon.

#Ecommerce #SmallBusiness #Sustainability`,
    hashtags: ["ecommerce", "smallbusiness", "sustainability"],
  },
  {
    id: "fe-061",
    category: "Fashion",
    personaKey: "tessa",
    photoId: "photo-1490481651871-ab68de25d43d",
    title: "Style is repetition",
    body: `Editorial fashion is a moment. A wardrobe people actually wear is a set of choices repeated until they fit a life.

If you sell clothes, describe the day they are for. Office, heat, travel, a long walk. Specific use outperforms a mood.

#Fashion #Ecommerce #Style`,
    hashtags: ["fashion", "ecommerce", "style"],
  },
  {
    id: "fe-062",
    category: "Health",
    personaKey: "chris",
    photoId: "photo-1571019614242-c5c5dee9f50b",
    title: "Strength is a skill, not a pose",
    body: `Gym photos freeze the impressive second. Training is the set before it, when the weight is honest.

Learn the movement slowly. Add load when the position stays clean. This is a general note, not a program for your body.

#Fitness #Health #Training`,
    hashtags: ["fitness", "health", "training"],
  },
  {
    id: "fe-063",
    category: "Business",
    personaKey: "lea",
    photoId: "photo-1517245386807-bb43f82c33c4",
    title: "Audiences remember the specific line",
    body: `A full room rewards confidence. It remembers a concrete example.

If you speak, bring one story you can source and one action the listener can take this week. Skip the quote that could sit on any slide.

#Leadership #CareerGrowth #PublicSpeaking`,
    hashtags: ["leadership", "careergrowth", "publicspeaking"],
  },
  {
    id: "fe-064",
    category: "Startups",
    personaKey: "priya",
    photoId: "photo-1600880292089-90a7e086ee0c",
    title: "Remote does not mean unspoken",
    body: `Laptops in a bright room still need a written decision.

When a team is split across places, the risk is not distance. It is a conclusion that lived in one call and never reached the people who will do the work. Send the note.

#Startups #RemoteWork #Leadership`,
    hashtags: ["startups", "remotework", "leadership"],
  },
  {
    id: "fe-065",
    category: "AI",
    personaKey: "noah",
    photoId: "photo-1620712943543-bcc4688e7485",
    title: "Evaluate before you expand",
    body: `Abstract images of “intelligence” skip the evaluation set.

Before a workflow spreads, keep a small pile of examples: good, bad, and ambiguous. Score the tool against those, not against a demo. If it fails the ambiguous ones, it is not ready for customers.

#ArtificialIntelligence #Technology #Product`,
    hashtags: ["artificialintelligence", "technology", "product"],
  },
  {
    id: "fe-066",
    category: "Creator",
    personaKey: "zoe",
    photoId: "photo-1598488035139-bdbb2231ce04",
    title: "A consistent corner of the week",
    body: `Studios imply a life arranged around content. Most people have a job and a Tuesday.

Block one repeatable hour. Same setup, same length, same audience. The constraint is what makes a series feel like a person, not a campaign.

#ContentCreation #CreatorEconomy #Consistency`,
    hashtags: ["contentcreation", "creatoreconomy", "consistency"],
  },
  {
    id: "fe-067",
    category: "Other",
    personaKey: "sofia",
    photoId: "photo-1567620905732-2d1ec7ab7445",
    title: "Breakfast service is a timetable",
    body: `A stack of pancakes is simple to photograph and hard to serve on time.

If you run a morning menu, the question is throughput: what can be prepared ahead, what must be finished to order, and how you tell a table the truth about the wait.

#Food #SmallBusiness #Hospitality`,
    hashtags: ["food", "smallbusiness", "hospitality"],
  },
  {
    id: "fe-068",
    category: "Travel",
    personaKey: "nina",
    photoId: "photo-1501785888041-af3ef285b470",
    title: "Weather is part of the plan",
    body: `Mountain light is brief. Any outdoor plan that ignores weather is a wish.

Check a forecast you trust, carry a dull backup (a museum, a long meal, an earlier start), and do not describe a picture as your afternoon unless it was.

#Travel #Photography #Planning`,
    hashtags: ["travel", "photography", "planning"],
  },
  {
    id: "fe-069",
    category: "Business",
    personaKey: "kwame",
    photoId: "photo-1516026672322-bc52d61a55d5",
    title: "Opportunity follows infrastructure",
    body: `Open land gets captioned as potential. Businesses need roads, power, payment, and a customer who can return.

Before a pitch about a region, list the boring dependencies. The opportunity is real when those are real. The photograph is not the evidence.

#AfricanStartups #Entrepreneurship #Infrastructure`,
    hashtags: ["africanstartups", "entrepreneurship", "infrastructure"],
  },
  {
    id: "fe-070",
    category: "Marketing",
    personaKey: "sarah",
    photoId: "photo-1557838923-2985c318be48",
    title: "Measure the sentence, not the spike",
    body: `Analytics screens are easy to share and hard to interpret.

Pair every number with the sentence you hoped would cause it. If you cannot, you measured traffic, not understanding.

#DigitalMarketing #Analytics #ContentCreation`,
    hashtags: ["digitalmarketing", "analytics", "contentcreation"],
  },
  {
    id: "fe-071",
    category: "Education",
    personaKey: "helen",
    photoId: "photo-1497633762265-9d179a990aa6",
    title: "A source belongs next to the claim",
    body: `Stacks of books do not make a post accurate.

When you share an idea from something you read, name the work and link it if you can. Summarize in your own words. Readers can tell when a paragraph is borrowed wholesale, and they should not have to.

#Education #Learning #Writing`,
    hashtags: ["education", "learning", "writing"],
  },
  {
    id: "fe-072",
    category: "Technology",
    personaKey: "yuki",
    photoId: "photo-1605379399642-870262d3d051",
    title: "Mobile is a constraint, not a shrink",
    body: `A phone in a hand is the real viewport for a lot of products.

Design the task for a thumb and a short attention span, then let the wide screen add room. Starting from the desktop and squeezing is how important actions fall below the fold.

#Technology #Design #Mobile`,
    hashtags: ["technology", "design", "mobile"],
  },
  {
    id: "fe-073",
    category: "Sports",
    personaKey: "glen",
    photoId: "photo-1519861531473-9200262188bf",
    title: "Practice shows up in the boring drill",
    body: `Game photos hide the repetition. The useful question for any craft is which drill you are willing to do when nobody is scoring it.

Name that drill. Do it on a calendar. The match, the launch, the post — those are the display, not the method.

#Sports #Practice #CareerGrowth`,
    hashtags: ["sports", "practice", "careergrowth"],
  },
  {
    id: "fe-074",
    category: "Finance",
    personaKey: "omar",
    photoId: "photo-1553729459-efe14ef6055d",
    title: "Separate the business from the person",
    body: `Cash on a table is a picture, not a model.

For a small operation, keep business money in its own place and pay yourself on purpose. Mixing the two makes every good month look like profit and every quiet month look like failure. Not personal financial advice — a bookkeeping boundary.

#Finance #SmallBusiness #Entrepreneurship`,
    hashtags: ["finance", "smallbusiness", "entrepreneurship"],
  },
  {
    id: "fe-075",
    category: "Design",
    personaKey: "maya",
    photoId: "photo-1561070791-2526d30994b5",
    title: "Color is a decision",
    body: `Palettes are fun to collect. On a product they have a job: show what is primary, what is quiet, and what is a warning.

If everything is loud, nothing is. Pick the one action that should win, and let the rest recede.

#Design #Branding #Product`,
    hashtags: ["design", "branding", "product"],
  },
  {
    id: "fe-076",
    category: "Creator",
    personaKey: "amina",
    photoId: "photo-1511379938547-c1f69419868d",
    title: "Collaboration needs a credit",
    body: `Music and media are rarely one person’s afternoon, even when the caption is.

Name the people who played, edited, or hosted. Credit is part of the work. It also teaches the audience that a polished result has a crew.

#Music #CreatorEconomy #Collaboration`,
    hashtags: ["music", "creatoreconomy", "collaboration"],
  },
  {
    id: "fe-077",
    category: "Other",
    personaKey: "hugo",
    photoId: "photo-1554118811-1e0d58224f24",
    title: "Third places still matter",
    body: `Cafés are where a lot of early work actually happens: a laptop, a limit on how long you can sit, and enough noise to stop perfectionism.

They are a poor office if you treat staff as furniture. Buy something, keep the table reasonable, and take the call outside.

#RemoteWork #Lifestyle #SmallBusiness`,
    hashtags: ["remotework", "lifestyle", "smallbusiness"],
  },
  {
    id: "fe-078",
    category: "Startups",
    personaKey: "otto",
    photoId: "photo-1509391366360-2e959784a276",
    title: "Infrastructure is a product decision",
    body: `Energy, connectivity, and maintenance decide whether a clever product can stay on.

If your plan assumes constant power and perfect logistics, write the degraded mode. What still works on a bad afternoon? That version is the one customers will meet.

#Innovation #AfricanStartups #Technology`,
    hashtags: ["innovation", "africanstartups", "technology"],
  },
];

export const FEED_EDITORIAL_POSTS: readonly FeedEditorialDraft[] = P;

const PERSONA_KEYS = new Set(ALL_EDITORIAL_PERSONAS.map((p) => p.key));

export type FeedEditorialIssue = { id: string; message: string };

export function auditFeedEditorialCollection(
  posts: readonly FeedEditorialDraft[] = FEED_EDITORIAL_POSTS
): FeedEditorialIssue[] {
  const issues: FeedEditorialIssue[] = [];
  const ids = new Set<string>();
  const photos = new Set<string>();
  const captions = new Set<string>();
  const personalClaim = /i (shot|photographed|took this)|shot on my|on my (iphone|phone|camera)|my (iphone|camera) captured/i;

  for (const post of posts) {
    if (ids.has(post.id)) issues.push({ id: post.id, message: "duplicate id" });
    ids.add(post.id);
    if (photos.has(post.photoId)) issues.push({ id: post.id, message: "duplicate photo" });
    photos.add(post.photoId);
    const norm = normalizeCaption(post.body);
    if (captions.has(norm)) issues.push({ id: post.id, message: "duplicate caption" });
    captions.add(norm);
    if (!PERSONA_KEYS.has(post.personaKey)) {
      issues.push({ id: post.id, message: `unknown persona ${post.personaKey}` });
    }
    if (post.hashtags.length < 2 || post.hashtags.length > 5) {
      issues.push({ id: post.id, message: "hashtag count out of range" });
    }
    const extracted = extractHashtags(post.body);
    for (const tag of post.hashtags) {
      if (!extracted.includes(tag.toLowerCase())) {
        issues.push({ id: post.id, message: `hashtag #${tag} missing from body` });
      }
    }
    if (personalClaim.test(post.body)) {
      issues.push({ id: post.id, message: "personal photo claim" });
    }
    if (!post.photoId.startsWith("photo-")) {
      issues.push({ id: post.id, message: "photo id shape" });
    }
    if (post.title.trim().length < 8 || post.body.trim().length < 80) {
      issues.push({ id: post.id, message: "too short" });
    }
  }
  return issues;
}
