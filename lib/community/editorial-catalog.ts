/**
 * Jimvio-managed community programming catalog.
 * Used by the idempotent seeder. Not a second community system.
 */

import type { JimvioContentOrigin } from "./editorial-origin";

export type EditorialCommentSpec = {
  key: string;
  body: string;
  daysAgo: number;
  hour?: number;
};

export type EditorialPostSpec = {
  key: string;
  title: string;
  body: string;
  postType: "discussion" | "poll";
  origin: JimvioContentOrigin;
  daysAgo: number;
  hour?: number;
  pinned?: boolean;
  href?: string;
  pollOptions?: string[];
  comments?: EditorialCommentSpec[];
};

export type EditorialMessageSpec = {
  key: string;
  body: string;
  daysAgo: number;
  hour?: number;
  pinned?: boolean;
};

export type EditorialRoomSpec = {
  slug: string;
  name: string;
  description: string;
  welcomeMessage: string;
  messages: EditorialMessageSpec[];
};

export type EditorialCommunitySpec = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: string;
  tags: string[];
  createdAt: string;
  welcomeTitle: string;
  welcomeMessage: string;
  rules: string;
  extraRoom: EditorialRoomSpec;
  posts: EditorialPostSpec[];
};

export const EDITORIAL_COMMUNITY_SLUGS = [
  "news-desk",
  "entertainment-circle",
  "sports-room",
  "faith-and-inspiration",
] as const;

export const EDITORIAL_CATALOG: EditorialCommunitySpec[] = [
  {
    slug: "news-desk",
    name: "News Desk",
    tagline: "Calm discussion of current events, media, and civic questions.",
    description:
      "A Jimvio editorial room for news literacy, world and local-interest topics, technology, and business — without fabricated breaking news.",
    longDescription:
      "News Desk is a Jimvio-managed public community for people who want slower, clearer conversation about the news cycle. Posts here are editorial programming: explainers, questions, and discussion prompts. We do not invent headlines, quote public figures, or present unverified claims as fact. Bring a source, a question, or a distinction you think others will find useful.",
    category: "News",
    tags: ["news", "media", "technology", "business", "civic"],
    createdAt: "2026-06-08T09:20:00.000Z",
    welcomeTitle: "How this desk works",
    welcomeMessage:
      "Read first, then add a source or a question. Opinion is welcome when it is labeled as opinion.",
    rules:
      "No fabricated breaking news. No fake quotes. Distinguish reporting from commentary. Disagree with ideas, not people.",
    extraRoom: {
      slug: "desk-thread",
      name: "Desk Thread",
      description: "Open thread for follow-up questions and source sharing.",
      welcomeMessage:
        "Use this thread for short follow-ups. If you are sharing a story, include the outlet and what you think is still unclear.",
      messages: [
        {
          key: "news-chat-welcome",
          body: "Welcome to Desk Thread. This is an open conversation hosted by Jimvio. Start with a question or a source — not a rumor.",
          daysAgo: 72,
          hour: 9,
          pinned: true,
        },
        {
          key: "news-chat-source",
          body: "When you drop a link, add one sentence: what does the piece claim, and what would change your mind about it?",
          daysAgo: 61,
          hour: 11,
        },
        {
          key: "news-chat-local",
          body: "Local-interest prompt: which public service in your city is poorly explained in national coverage? School transport, water, housing, clinics — pick one and say what is missing.",
          daysAgo: 39,
          hour: 16,
        },
        {
          key: "news-chat-tech",
          body: "Technology desk: if a company announces a product, the useful question is usually not “is this the future?” It is “who can buy it, what does it replace, and what is still unproven?”",
          daysAgo: 18,
          hour: 10,
        },
        {
          key: "news-chat-recent",
          body: "This week’s thread: share one story you are still following, and one fact you wish reporters would keep repeating so the conversation does not reset every morning.",
          daysAgo: 2,
          hour: 8,
        },
      ],
    },
    posts: [
      {
        key: "news-welcome",
        title: "How News Desk works",
        body: "This community is Jimvio editorial programming — a public room for news literacy and civic conversation.\n\nYou will find explainers, questions, and the occasional poll. You will not find invented breaking news or quotes attributed to real people.\n\nA useful post here usually does one of three things:\n1. Separates what is known from what is still unknown.\n2. Asks a question that other members can answer from their own context.\n3. Points to a method (how to read a chart, a headline, or an earnings note).\n\nIf you want to argue a position, say so. If you are asking for sources, say that too.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 80,
        hour: 10,
        pinned: true,
        comments: [
          {
            key: "news-welcome-c1",
            body: "House style reminder: if a claim would need a reporter to stand behind it, do not present it as settled fact here.",
            daysAgo: 79,
            hour: 9,
          },
        ],
      },
      {
        key: "news-headlines",
        title: "A short method for reading headlines",
        body: "Most headlines are written to win a tap, not to survive a second read.\n\nBefore you share one, try this:\n\n• Who is doing the reporting, and is the headline matching the first three paragraphs?\n• Is the verb doing more work than the evidence? “Poised,” “set to,” and “could” are not the same as “did.”\n• What time window is implied? A one-day move is not a trend.\n• What would a more boring, more accurate headline say?\n\nYou do not need to be cynical. You need a pause. If the story still matters after that pause, it is usually worth discussing.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 64,
        hour: 14,
        comments: [
          {
            key: "news-headlines-c1",
            body: "A practical extra: search the same event on two outlets with different audiences. The overlap is often the load-bearing fact.",
            daysAgo: 63,
            hour: 11,
          },
          {
            key: "news-headlines-c2",
            body: "If you only have the headline, it is fine to say “I have not read this yet — does the piece support the claim?” That is a better post than a confident share.",
            daysAgo: 62,
            hour: 17,
          },
        ],
      },
      {
        key: "news-poll-sources",
        title: "Where do you do most of your reading?",
        body: "Not a ranking of which outlet is “best.” A snapshot of how this room actually stays informed. Answer for your main habit, not the one you wish you had.",
        postType: "poll",
        origin: "editorial",
        daysAgo: 51,
        hour: 12,
        pollOptions: [
          "National newspapers",
          "Local or regional outlets",
          "Trade / specialist newsletters",
          "Broadcast or radio",
          "A mix I cannot simplify",
        ],
      },
      {
        key: "news-local-attention",
        title: "Which local story is under-covered?",
        body: "National news compresses cities into a single image. Local life is usually about systems: clinics, buses, water, housing queues, school calendars.\n\nWhat is happening near you that deserves a clearer public explanation — and what would “clearer” look like? A map, a timeline, a budget line, a named office?\n\nStay specific. Stay kind to people who have to live the story, not just comment on it.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 44,
        hour: 16,
      },
      {
        key: "news-ai-announce",
        title: "What “we announced AI” usually means",
        body: "Technology coverage often treats a launch blog post as a finished product.\n\nA more useful split:\n\n1. Research paper or demo — interesting, not necessarily available.\n2. Limited preview — a few customers, lots of caveats.\n3. Generally available product — pricing, support, and a contract.\n4. Regulation or labor impact — the part that arrives after the keynote.\n\nIf you are discussing a company announcement in this room, try naming which of those four you are actually talking about. It prevents the thread from arguing about a future that has not been shipped.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 36,
        hour: 11,
        comments: [
          {
            key: "news-ai-c1",
            body: "Also useful: who is paying, and who is being measured. A tool that is free to try can still be expensive to run well.",
            daysAgo: 35,
            hour: 15,
          },
        ],
      },
      {
        key: "news-earnings",
        title: "How to read an earnings week without the theater",
        body: "Earnings season is loud. Most of the noise is a stock moving after a number that was already expected.\n\nIf you follow a company, keep a small notebook of four items only:\n\n• Revenue and whether it grew for a reason you can explain in one sentence.\n• Profit or cash — they are not the same.\n• Guidance: what management says next quarter will look like, in their words.\n• One risk they admitted. Companies are more honest in the risk section than in the headline.\n\nYou do not need a trading opinion to use this method. You need it if you want the conversation to stay about the business.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 29,
        hour: 13,
      },
      {
        key: "news-news-vs-commentary",
        title: "News is not the same as commentary",
        body: "A short distinction that keeps threads cleaner:\n\nNews: what happened, who said they did it, and what can be checked.\nCommentary: what it means, who should be blamed, and what should happen next.\n\nBoth belong here. Mixing them without a label is how a room becomes a shouting match. If you are writing commentary, start with “I think.” If you are writing news, start with the source.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 22,
        hour: 9,
      },
      {
        key: "news-follow-week",
        title: "How to follow one international story for a week",
        body: "Pick a single story — a negotiation, a court case, a climate season, a public-health update — and refuse to restart it every morning.\n\nA simple week plan:\n\nDay 1: write down what is actually in dispute.\nDay 2–3: collect two facts that have not changed.\nDay 4: note what new reporting added, not what social media added.\nDay 5: write one paragraph you would still stand behind if the next headline is wrong.\n\nThis is not a scoop method. It is a way to stay oriented when the internet treats every refresh as a new war.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 15,
        hour: 10,
        comments: [
          {
            key: "news-follow-c1",
            body: "If you try this, post your Day 1 dispute list. Other members can help you notice what you assumed.",
            daysAgo: 14,
            hour: 12,
          },
        ],
      },
      {
        key: "news-trust-source",
        title: "Share a source you actually use — and why",
        body: "Not a brand ranking. A working habit.\n\nName one newsletter, desk, or local outlet you return to, and one limitation you already know it has. “I trust them on X; I read someone else for Y” is more useful than “this one is the best.”\n\nIf you do not want to name a favorite, describe the format instead: morning briefing, long investigation, beat reporter on social.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 9,
        hour: 15,
      },
      {
        key: "news-promo-marketplace",
        title: "From Jimvio: find products on Marketplace",
        body: "From Jimvio — this is platform programming, not an independent review.\n\nIf you are shopping or sourcing for a project, Marketplace is where Jimvio listings live. Browse what is actually available rather than treating a social post as a storefront.\n\nOpen Marketplace: /marketplace\n\nNo earnings claims. No invented customer results. Just the catalog.",
        postType: "discussion",
        origin: "promotion",
        daysAgo: 7,
        hour: 11,
        href: "/marketplace",
      },
      {
        key: "news-promo-affiliates",
        title: "From Jimvio: ways to share products you recommend",
        body: "From Jimvio — a platform note, not a testimonial.\n\nWant to earn on Jimvio? Affiliate is the existing path for sharing products you genuinely recommend. Commission terms live on the Affiliates pages; we will not invent results or guarantees here.\n\nStart at /affiliates\n\nIf you would rather create than recommend, UGC & Clipping campaigns are listed at /ugc.",
        postType: "discussion",
        origin: "promotion",
        daysAgo: 5,
        hour: 12,
        href: "/affiliates",
      },
      {
        key: "news-civic-tone",
        title: "How to disagree about the news without wrecking the thread",
        body: "A civic conversation dies in two ways: people perform certainty they do not have, or they attack the person who asked a genuine question.\n\nTry this format when you disagree:\n\n1. Restate the other person’s point in one sentence they would accept.\n2. Name the fact you think is missing.\n3. Say what kind of source would settle it.\n\nIf you cannot do step 1, you are not ready to reply yet. That is not politeness theater. It is how a desk stays usable.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 1,
        hour: 8,
      },
    ],
  },
  {
    slug: "entertainment-circle",
    name: "Entertainment Circle",
    tagline: "Music, movies, and culture — reviews, questions, and fan talk.",
    description:
      "Jimvio editorial conversations about music, film, and trending culture. Reviews and polls welcome. No fake celebrity quotes.",
    longDescription:
      "Entertainment Circle is a Jimvio-managed public community for people who want better conversations about what they watch and hear. Write like a person who finished the album or the film. Ask better questions than “good or bad.” Do not invent interviews, box-office figures, or private lives. If you are guessing, say you are guessing.",
    category: "Entertainment",
    tags: ["music", "movies", "culture", "reviews", "fans"],
    createdAt: "2026-06-14T11:05:00.000Z",
    welcomeTitle: "Talk like you finished the work",
    welcomeMessage:
      "Spoilers get a warning. Opinions get a reason. Celebrity gossip that cannot be sourced stays out.",
    rules:
      "No fabricated celebrity quotes or private claims. Mark spoilers. Critique the work, not the audience that likes it.",
    extraRoom: {
      slug: "culture-thread",
      name: "Culture Thread",
      description: "Fast conversation about what people are watching and hearing.",
      welcomeMessage:
        "Short takes belong here. If you need more than a paragraph, turn it into a post in Discussion.",
      messages: [
        {
          key: "ent-chat-welcome",
          body: "Culture Thread is hosted by Jimvio. Bring a title, a timestamp, or a question. “You had to be there” is not a review.",
          daysAgo: 70,
          hour: 18,
          pinned: true,
        },
        {
          key: "ent-chat-spoiler",
          body: "Spoiler habit: name the title, then write “spoiler after the jump,” then wait a line. People are still catching up.",
          daysAgo: 48,
          hour: 20,
        },
        {
          key: "ent-chat-music",
          body: "Music prompt: which recent song has a bridge that is doing more work than the chorus? Name the moment, not just the artist.",
          daysAgo: 27,
          hour: 19,
        },
        {
          key: "ent-chat-film",
          body: "Film prompt: what is one craft choice (edit, costume, silence, camera distance) that changed how you felt about a scene?",
          daysAgo: 11,
          hour: 21,
        },
        {
          key: "ent-chat-recent",
          body: "This week: drop one thing you started and one thing you finished. Unfinished is allowed. Pretending you finished is not.",
          daysAgo: 1,
          hour: 19,
        },
      ],
    },
    posts: [
      {
        key: "ent-welcome",
        title: "How Entertainment Circle works",
        body: "This is Jimvio editorial space for music, movies, and culture.\n\nA good post here has a concrete object: a song, a scene, a season, a trend you can point at. A weak post is a pile-on about a person you do not know.\n\nWe will post reviews, questions, and polls. We will not invent celebrity interviews or “sources say” items.\n\nIf you are writing as a fan, say what you love. If you are writing as a critic, say the standard you are using.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 76,
        hour: 17,
        pinned: true,
      },
      {
        key: "ent-review-method",
        title: "Write a review that is not a recap",
        body: "A recap tells people what happened. A review tells them what it was like to sit with the work.\n\nTry four sentences:\n\n1. What kind of thing is this — comedy, hymn, thriller, documentary, pop single?\n2. What did it set out to do, in your words?\n3. Where did the craft help or fail that aim?\n4. Who is it for, honestly?\n\nYou can still say you loved it. You just owe the room more than a plot list and a score out of ten.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 58,
        hour: 16,
        comments: [
          {
            key: "ent-review-c1",
            body: "If you are stuck, start with the moment you leaned forward. That is usually the review hiding inside the recap.",
            daysAgo: 57,
            hour: 12,
          },
        ],
      },
      {
        key: "ent-poll-rewatch",
        title: "This month, what sounds better?",
        body: "A preference poll, not a verdict on anyone’s taste. Pick the option that matches how you actually spend evenings.",
        postType: "poll",
        origin: "editorial",
        daysAgo: 49,
        hour: 20,
        pollOptions: [
          "A comfort rewatch",
          "A new film or series",
          "A full album, start to finish",
          "Short clips and playlists",
          "Live or communal watching",
        ],
      },
      {
        key: "ent-chorus",
        title: "What makes a chorus stay in the room?",
        body: "Not every hook is loud. Some are a repeated question. Some are a harmony that arrives late. Some are a lyric you can text to a friend without explaining the verses.\n\nName a chorus that stayed with you and say which of those jobs it was doing. If you do not want to name a current chart song, pull something older. The point is the craft, not the ranking.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 41,
        hour: 18,
        comments: [
          {
            key: "ent-chorus-c1",
            body: "A useful test: can you hum it without the production? If yes, the writing is carrying more than the mix.",
            daysAgo: 40,
            hour: 10,
          },
        ],
      },
      {
        key: "ent-film-questions",
        title: "Questions that make a film discussion better",
        body: "“Did you like it?” ends in about thirty seconds.\n\nBetter prompts:\n\n• Whose point of view did the camera protect?\n• What did the film refuse to explain?\n• Which relationship changed in a way the dialogue never said out loud?\n• If you removed the score, would the scene still land?\n\nSteal any of these for your next watch party. Add your own.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 33,
        hour: 21,
      },
      {
        key: "ent-trend-taste",
        title: "Trend is not the same as taste",
        body: "A trend tells you what is circulating. Taste is what you return to when nobody is grading you.\n\nIt is fine to enjoy a trend. It is also fine to sit one out. What is less useful is treating the trend as a moral test.\n\nThis week’s question: what are you watching or hearing that is unfashionable on purpose, and why does it still work for you?",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 25,
        hour: 15,
      },
      {
        key: "ent-one-album",
        title: "One album. One question.",
        body: "Keep this short. Name an album (old or new) and ask the room one specific question about it — a lyric, a feature, a sequencing choice, a live version.\n\nIf you have not finished it, say so. Curiosity is allowed. Homework theater is not.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 19,
        hour: 19,
      },
      {
        key: "ent-fan-care",
        title: "How to be a fan without the pile-on",
        body: "Fandom is better when it is about the work and the people you share it with.\n\nA few guardrails we will keep in this community:\n\n• Do not invent personal lives or medical stories about performers.\n• Do not brigade a stranger because they liked the wrong season.\n• You can dislike a project and still leave the artist a way back.\n\nIf you want to celebrate, celebrate specifically. “Track three at 1:12” is more contagious than “this slaps.”",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 13,
        hour: 14,
        comments: [
          {
            key: "ent-fan-c1",
            body: "If a rumor cannot be sourced to the artist or their team, it does not belong in the replies.",
            daysAgo: 12,
            hour: 11,
          },
        ],
      },
      {
        key: "ent-soundtrack",
        title: "Underrated soundtrack — make a case",
        body: "Not the most streamed. The one that did quiet work: a motif that taught you who to trust, a needle-drop that changed a walk home, a score that made a small film feel large.\n\nMake the case in a paragraph. If you can, name one cue, not the whole album.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 8,
        hour: 20,
      },
      {
        key: "ent-promo-ugc",
        title: "From Jimvio: paid creator opportunities",
        body: "From Jimvio — platform programming, not a hidden ad from a random member.\n\nLooking for paid creator opportunities? Explore UGC & Clipping campaigns on Jimvio. Briefs, eligibility, and payouts are listed in the campaign itself. We do not invent earnings or guarantee selection.\n\nBrowse campaigns: /ugc",
        postType: "discussion",
        origin: "promotion",
        daysAgo: 6,
        hour: 12,
        href: "/ugc",
      },
      {
        key: "ent-promo-identity",
        title: "From Jimvio: build your creator presence",
        body: "From Jimvio — a product note.\n\nBuild your creator presence on Jimvio. Completing your Creator Profile is how the platform understands the work you do and the opportunities you can be shown. It is not a ranking and it is not a promise of deals.\n\nOpen Creator Profile: /identity",
        postType: "discussion",
        origin: "promotion",
        daysAgo: 4,
        hour: 13,
        href: "/identity",
      },
      {
        key: "ent-week-starter",
        title: "This week’s conversation starter",
        body: "Two prompts. Answer one.\n\n1. A movie or episode you would show someone to explain your taste in ten minutes.\n2. A song you only understood after the third listen — what changed?\n\nIf you answer, give the other person something to reply to. A timestamp helps.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 0,
        hour: 18,
      },
    ],
  },
  {
    slug: "sports-room",
    name: "Sports Room",
    tagline: "Football, basketball, and the arguments that do not need a fake score.",
    description:
      "Jimvio editorial sports talk: match discussion, predictions as opinions, and performance questions. No invented results.",
    longDescription:
      "Sports Room is a Jimvio-managed public community for football, basketball, and the wider sports conversation. Talk about tactics, players, and what you are looking forward to. Predictions are opinions. Do not present invented match results, injuries, or transfers as fact. If a game has not been played, write in the future tense.",
    category: "Sports",
    tags: ["football", "basketball", "predictions", "tactics"],
    createdAt: "2026-06-18T08:40:00.000Z",
    welcomeTitle: "Opinions welcome. Fake scores are not.",
    welcomeMessage:
      "Write like a fan who watched, or like a fan who is asking. Do not invent a result to win an argument.",
    rules:
      "No fabricated scores, lineups, or injuries. Label predictions as predictions. Keep rivalries sharp and personal attacks out.",
    extraRoom: {
      slug: "game-thread",
      name: "Game Thread",
      description: "Live-style discussion without invented scorelines.",
      welcomeMessage:
        "Talk about what you are watching or what you expect. If the match is in progress, say so. If you missed it, ask a specific question.",
      messages: [
        {
          key: "sports-chat-welcome",
          body: "Game Thread is hosted by Jimvio. Use it for match-day questions and tactical arguments. Do not post a final score you cannot stand behind.",
          daysAgo: 68,
          hour: 17,
          pinned: true,
        },
        {
          key: "sports-chat-predict",
          body: "Prediction format that stays honest: pick, confidence (low/medium/high), and one reason. No “trust me bro” banks.",
          daysAgo: 46,
          hour: 12,
        },
        {
          key: "sports-chat-football",
          body: "Football question for the room: when a full-back inverts, what should you watch first — the pivot’s body shape or the winger’s starting position?",
          daysAgo: 24,
          hour: 16,
        },
        {
          key: "sports-chat-basketball",
          body: "Basketball question: which coverage tells you more about a team — how they start a possession, or how they get back after a miss?",
          daysAgo: 10,
          hour: 21,
        },
        {
          key: "sports-chat-recent",
          body: "Weekend watch plan: name one game you intend to see and what you want to learn from it. Results come after the whistle, not before.",
          daysAgo: 2,
          hour: 15,
        },
      ],
    },
    posts: [
      {
        key: "sports-welcome",
        title: "How Sports Room works",
        body: "This community is Jimvio editorial sports programming.\n\nYou can preview a fixture, argue a selection, or ask how a tactic is supposed to work. You cannot invent a scoreline, an injury, or a transfer to win the thread.\n\nIf you did not watch, say that. “I only saw highlights” is a respectable sentence. A confident essay built on a clip you misunderstood is not.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 74,
        hour: 9,
        pinned: true,
        comments: [
          {
            key: "sports-welcome-c1",
            body: "House rule: future tense for games that have not happened. Past tense only for games you can actually place in time.",
            daysAgo: 73,
            hour: 10,
          },
        ],
      },
      {
        key: "sports-missed-match",
        title: "How to talk about a match you did not watch",
        body: "You will miss games. The room is still useful if you stay honest.\n\nGood versions:\n• “I saw the first half — what changed after the hour?”\n• “The highlights made it look like a transition game. Was that the whole story?”\n• “Who was asked to do a job that does not show up on the scoresheet?”\n\nWeak versions:\n• Narrating a result you only saw in a graphic.\n• Attacking a player from a 12-second clip.\n\nAsk for the missing context. Someone who watched usually wants to give it.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 55,
        hour: 20,
        comments: [
          {
            key: "sports-missed-c1",
            body: "If you only have xG or a box score, say that. Those numbers are a start, not a documentary.",
            daysAgo: 54,
            hour: 8,
          },
        ],
      },
      {
        key: "sports-poll-codes",
        title: "Which conversation do you want more of this month?",
        body: "Help us weight the editorial calendar. This is a preference poll, not a claim about which sport is “winning.”",
        postType: "poll",
        origin: "editorial",
        daysAgo: 47,
        hour: 13,
        pollOptions: [
          "Football tactics and selections",
          "Basketball offense / coverage",
          "Multi-sport weekends",
          "Player development and form",
          "Rules, referees, and fairness",
        ],
      },
      {
        key: "sports-predictions",
        title: "Predictions are opinions — write them like opinions",
        body: "A prediction is a bet you are making with your reputation, not a fact traveling from the future.\n\nA clean prediction post:\n\n• The fixture or award, in plain language.\n• Your pick.\n• One reason rooted in a pattern you can describe (availability, style matchup, schedule).\n• What would make you change the pick before kickoff.\n\nIf you are wrong later, you still taught the room how you think. That is the point. We will not archive fake “I called it” history.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 38,
        hour: 11,
      },
      {
        key: "sports-in-form",
        title: "What “in form” should mean",
        body: "Fans use “in form” to mean “scored recently.” Coaches usually mean “repeating the actions that create chances, even when the finish is ugly.”\n\nWhen you talk about a player in this room, try naming the action:\n\n• First touch under pressure\n• Shot selection, not just shot volume\n• Defensive recoveries\n• Decision speed in the last pass\n\nA cold finishing week can sit on top of good work. A lucky week can sit on top of poor work. Separate them.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 30,
        hour: 15,
        comments: [
          {
            key: "sports-form-c1",
            body: "If you are comparing two players, compare the same job. A six and a ten can both “look quiet” for opposite reasons.",
            daysAgo: 29,
            hour: 9,
          },
        ],
      },
      {
        key: "sports-short-q",
        title: "A question for the room",
        body: "When a favorite is losing the midfield, do you want your coach to add a runner or subtract a risk? Answer with a sport and a recent example you actually saw — not a fictional scoreline.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 23,
        hour: 18,
      },
      {
        key: "sports-box-score",
        title: "How to read a box score without lying to yourself",
        body: "A box score is a receipt, not a story.\n\nFootball: shots and xG can describe chance quality; they cannot tell you who was afraid to receive between the lines.\nBasketball: points can hide usage. Assists can hide a system that manufactures easy reads. Rebounds can be a scheme, not a will contest.\n\nUse the sheet to ask a better question, then go back to film or to someone who watched. If all you have is the sheet, keep your claims small.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 16,
        hour: 12,
      },
      {
        key: "sports-football-prompt",
        title: "Football: the game after the first goal",
        body: "Plenty of matches are decided by who is braver once the score is no longer 0–0 — without us inventing that score for a specific fixture.\n\nTalk generally, or talk about a match you actually watched:\n\n• Does your team chase with a second striker or with a full-back?\n• Who is allowed to take a low-percentage shot to force a save and a corner?\n• What does the bench usually change first: width, or rest defense?\n\nIf you name a club, name a pattern, not a rumor.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 11,
        hour: 19,
      },
      {
        key: "sports-basketball-prompt",
        title: "Basketball: empty possessions and what they teach",
        body: "An empty possession is not always a failure of talent. Sometimes it is a coverage you did not recognize until the catch was already late.\n\nWhat do you look at when a team stalls?\n\n• Early drag screens vs. late isolation\n• Whether the weak-side wing is a shooter or a cutter\n• Who is allowed to throw the skip, and who is only a safety valve\n\nDescribe a set you have seen. Skip the myth-making.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 7,
        hour: 21,
      },
      {
        key: "sports-promo-affiliates",
        title: "From Jimvio: Affiliate is a sharing path, not a scoreboard",
        body: "From Jimvio — platform programming.\n\nWant to earn on Jimvio? Discover Affiliate opportunities and start sharing products you genuinely recommend. Terms are on the Affiliates page. We will not invent member payouts or promised results in this community.\n\nOpen Affiliates: /affiliates",
        postType: "discussion",
        origin: "promotion",
        daysAgo: 5,
        hour: 10,
        href: "/affiliates",
      },
      {
        key: "sports-promo-live",
        title: "From Jimvio: watch and talk in community Live",
        body: "From Jimvio — a product note, not a schedule of invented fixtures.\n\nJimvio Live lives inside Communities. If a host in a community you joined goes live, you can watch and talk in the same place you already discuss the game. We are not announcing a fake match calendar here.\n\nCommunity Live: /communities/live\n\nYou can also open Live from a community you belong to at /communities.",
        postType: "discussion",
        origin: "promotion",
        daysAgo: 3,
        hour: 14,
        href: "/communities/live",
      },
      {
        key: "sports-weekend-plan",
        title: "Weekend watch plan",
        body: "No results. Just intention.\n\nWhat are you hoping to watch this weekend, and what question are you taking into it? “Can they play through pressure?” is a better plan than “we must win.”\n\nIf your weekend is highlights-only, say what you want someone who watched to tell you first.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 1,
        hour: 16,
      },
    ],
  },
  {
    slug: "faith-and-inspiration",
    name: "Faith & Inspiration",
    tagline: "Gospel, reflection, and a room that stays gentle.",
    description:
      "Jimvio editorial space for gospel music, scripture-style reflection, and encouragement. Respectful, non-deceptive, no fake testimonies.",
    longDescription:
      "Faith & Inspiration is a Jimvio-managed public community for gospel music, prayerful reflection, and encouragement. Posts are editorial prompts, not impersonations of pastors or invented miracles. Share a lyric, a verse you are sitting with, or a question that helps someone else pray or think. Do not fabricate personal testimonies or speak as if Jimvio is a church.",
    category: "Faith",
    tags: ["gospel", "faith", "inspiration", "music", "reflection"],
    createdAt: "2026-06-22T07:15:00.000Z",
    welcomeTitle: "A quiet room on purpose",
    welcomeMessage:
      "Come as you are. Leave people more whole than you found them. Do not invent a testimony to make a point.",
    rules:
      "Be respectful across traditions. No fake healings, fake quotes, or pressure. Music and reflection are welcome; scams are not.",
    extraRoom: {
      slug: "reflection-thread",
      name: "Reflection Thread",
      description: "Short prayers, lyrics, and questions for the week.",
      welcomeMessage:
        "A few sentences is enough. If a post needs more space, use Discussion.",
      messages: [
        {
          key: "faith-chat-welcome",
          body: "Reflection Thread is hosted by Jimvio. Share a lyric, a verse you are sitting with, or a hope for someone else. This is not a place to invent miracles.",
          daysAgo: 66,
          hour: 7,
          pinned: true,
        },
        {
          key: "faith-chat-music",
          body: "Gospel prompt: which song taught you a sentence you still pray when words are thin?",
          daysAgo: 43,
          hour: 19,
        },
        {
          key: "faith-chat-kindness",
          body: "If you reply, try adding one true thing and one gentle question. Correction without care is just noise.",
          daysAgo: 21,
          hour: 8,
        },
        {
          key: "faith-chat-week",
          body: "Midweek check-in: what is one ordinary faithfulness you practiced — a message sent, a meal shared, a quieter tongue?",
          daysAgo: 8,
          hour: 12,
        },
        {
          key: "faith-chat-recent",
          body: "This week’s thread: offer a blessing in one or two sentences for someone who is tired. No advice unless they ask.",
          daysAgo: 1,
          hour: 7,
        },
      ],
    },
    posts: [
      {
        key: "faith-welcome",
        title: "How this room works",
        body: "Faith & Inspiration is Jimvio editorial programming: gospel music, reflection prompts, and encouragement.\n\nIt is not a denomination, and it is not a place to perform a life you did not live. Do not invent conversions, healings, or celebrity faith stories.\n\nYou are welcome if you are sure, if you are doubting, or if you only came for the music. Say what is true in a small space. That is enough.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 71,
        hour: 7,
        pinned: true,
        comments: [
          {
            key: "faith-welcome-c1",
            body: "If someone shares a hard week, you do not have to solve it. Presence is already a reply.",
            daysAgo: 70,
            hour: 8,
          },
        ],
      },
      {
        key: "faith-reflection-prompt",
        title: "A reflection prompt for a noisy week",
        body: "Sit with this without forcing an answer:\n\nWhere did you rush past a person this week, and what would a slower version of that moment have looked like?\n\nIf a verse or a song comes to mind, share the line — not a sermon. If nothing comes, you can still say “I am listening.” That is a complete post.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 59,
        hour: 6,
        comments: [
          {
            key: "faith-reflection-c1",
            body: "A slower version is often one question: “Do you have time, or should I write this down for later?”",
            daysAgo: 58,
            hour: 9,
          },
        ],
      },
      {
        key: "faith-gospel-carry",
        title: "What a gospel song can carry",
        body: "Some songs teach doctrine. Some songs keep a person walking to the next bus. Both are ministries of a kind.\n\nName a gospel or worship song that carried you — not because it trended, but because of a job it did: courage, grief, gratitude, repentance, rest.\n\nIf you share lyrics, keep them short and attribute the song. We will not pretend Jimvio wrote it.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 50,
        hour: 18,
      },
      {
        key: "faith-poll-rhythm",
        title: "When do you actually reflect?",
        body: "A habit poll, not a holiness ranking. Pick the time that is real for you right now.",
        postType: "poll",
        origin: "editorial",
        daysAgo: 42,
        hour: 7,
        pollOptions: [
          "Early morning",
          "A quiet midday pause",
          "Evening, after the day has spoken",
          "Music first, words later",
          "It changes with the season",
        ],
      },
      {
        key: "faith-scripture-style",
        title: "Sitting with a short line",
        body: "A scripture-style reflection, offered as a prompt — not as a new translation and not as a quote from a public figure.\n\n“Be quick to listen, slow to speak, slow to anger.”\n\nQuestions, if you want them:\n• Who needs your listening this week more than your advice?\n• What sentence are you rehearsing that you do not need to say?\n• Where would slowness be a form of love?\n\nIf this line is not from your tradition, you can still use the questions. If you have another line, bring it.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 34,
        hour: 6,
        comments: [
          {
            key: "faith-scripture-c1",
            body: "If you reply with another line, say where it lives for you — book, song, or family saying — so nobody has to guess.",
            daysAgo: 33,
            hour: 10,
          },
        ],
      },
      {
        key: "faith-encouragement",
        title: "Encouragement that does not pretend",
        body: "The cheapest encouragement is a slogan. The useful kind names a weight and still offers a next step that is small enough to take.\n\nExamples that stay honest:\n• “You do not have to finish the year today.”\n• “Asking for help is not a failure of faith.”\n• “Rest can be obedience.”\n\nOffer one sentence like that for someone you will never meet. Avoid promising outcomes Jimvio cannot keep.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 26,
        hour: 8,
      },
      {
        key: "faith-hymn-question",
        title: "A hymn or song that stayed with you",
        body: "Not a chart. A companion.\n\nWhich hymn, chorus, or gospel record stayed in your mouth after the service — or after the commute — and what work was it doing?\n\nIf you are new to this music, ask the room for a starting place: lament, praise, or something you can hum while you cook.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 18,
        hour: 19,
      },
      {
        key: "faith-kind-comments",
        title: "Practicing kindness in a comment thread",
        body: "The internet trains speed. Faith communities, at their best, train attention.\n\nA short practice for this room:\n\n1. Read twice.\n2. Thank the person for the risk, if they took one.\n3. Add one true thing from your life, not a lecture.\n4. Leave a door open: “If that is not your story, ignore this.”\n\nCorrection can still happen. It should not be the first instrument you reach for.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 12,
        hour: 11,
      },
      {
        key: "faith-short-blessing",
        title: "A blessing for the week",
        body: "For the person who is tired of performing strength:\n\nMay your work be enough for today.\nMay your table have one unhurried conversation.\nMay you notice a kindness you did not have to earn.\n\nIf you want to add a blessing, keep it short. Do not attach a sales pitch.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 6,
        hour: 7,
      },
      {
        key: "faith-promo-identity",
        title: "From Jimvio: Creator Profile, if this is also your work",
        body: "From Jimvio — a platform note, not a spiritual claim.\n\nIf gospel, teaching, or encouragement is part of the work you publish, you can complete your Creator Profile so Jimvio can show you creator tools and opportunities that already exist. This is not an endorsement of theology and not a promise of income.\n\nCreator Profile: /identity",
        postType: "discussion",
        origin: "promotion",
        daysAgo: 4,
        hour: 10,
        href: "/identity",
      },
      {
        key: "faith-promo-ugc",
        title: "From Jimvio: UGC & Clipping campaigns",
        body: "From Jimvio — clearly a product post.\n\nLooking for paid creator opportunities? Explore UGC & Clipping campaigns on Jimvio. Read each brief. Apply only if the work fits your voice. We will not invent testimonies or promised campaign results.\n\nBrowse: /ugc\n\nAffiliate, if you prefer recommending products you already trust: /affiliates",
        postType: "discussion",
        origin: "promotion",
        daysAgo: 3,
        hour: 12,
        href: "/ugc",
      },
      {
        key: "faith-prayer-prompt",
        title: "A prayer and reflection prompt",
        body: "If you pray, you can use this. If you do not, treat it as a reflection.\n\n“Give me the courage to tell the truth, the patience to hear it, and the humility to change.”\n\nWhere do you need one of those three this week — courage, patience, or humility? Answer in a sentence. You do not owe the room your whole story.",
        postType: "discussion",
        origin: "editorial",
        daysAgo: 0,
        hour: 6,
      },
    ],
  },
];

export function editorialCatalogStats() {
  return EDITORIAL_CATALOG.map((community) => ({
    slug: community.slug,
    name: community.name,
    category: community.category,
    posts: community.posts.length,
    polls: community.posts.filter((post) => post.postType === "poll").length,
    promotions: community.posts.filter((post) => post.origin === "promotion").length,
    comments: community.posts.reduce(
      (sum, post) => sum + (post.comments?.length ?? 0),
      0
    ),
    chatMessages: community.extraRoom.messages.length,
  }));
}
