// ──────────────────────────────────────────────────────────────────────────
// lib/ugc/syncViews.ts
//
// Called by the Vercel Cron job (POST /api/ugc/views/sync) every 24 hours.
// Fetches current view counts from social APIs, computes earnings deltas,
// and credits wallets / payouts.
// ──────────────────────────────────────────────────────────────────────────

import { createServiceRoleClient } from '@/lib/supabase/service-role';

// ─── Social API helpers ───────────────────────────────────────────────────

async function fetchTikTokViews(postUrl: string): Promise<number> {
  // TikTok Research API v2 requires business account access.
  // Extract video_id from URL: https://www.tiktok.com/@user/video/123456789
  const match = postUrl.match(/\/video\/(\d+)/);
  if (!match) throw new Error(`Cannot extract TikTok video ID from ${postUrl}`);
  const videoId = match[1];

  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) {
    console.warn('[UGC Sync] TIKTOK_ACCESS_TOKEN not set — skipping TikTok count');
    return -1; // -1 = skip
  }

  const res = await fetch('https://open.tiktokapis.com/v2/research/video/query/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: { and: [{ field_name: 'video_id', operation: 'IN', field_values: [videoId] }] },
      start_date: '20200101',
      end_date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      fields: ['view_count'],
      max_count: 1,
    }),
  });
  if (!res.ok) throw new Error(`TikTok API error ${res.status}`);
  const json = await res.json();
  return json?.data?.videos?.[0]?.view_count ?? 0;
}

async function fetchInstagramViews(postUrl: string): Promise<number> {
  // Requires Instagram Graph API + media ID
  const match = postUrl.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error(`Cannot extract Instagram media shortcode from ${postUrl}`);
  const shortcode = match[1];

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.warn('[UGC Sync] INSTAGRAM_ACCESS_TOKEN not set — skipping Instagram count');
    return -1;
  }

  // Step 1: resolve shortcode → IG media ID via oEmbed
  const oembedRes = await fetch(
    `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&access_token=${token}`
  );
  if (!oembedRes.ok) throw new Error(`Instagram oEmbed error ${oembedRes.status}`);
  const oembedJson = await oembedRes.json();
  const mediaId: string | undefined = oembedJson?.media_id;
  if (!mediaId) throw new Error('Instagram: no media_id from oEmbed');

  // Step 2: fetch insights
  const insightsRes = await fetch(
    `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=video_views,impressions&access_token=${token}`
  );
  if (!insightsRes.ok) throw new Error(`Instagram Insights error ${insightsRes.status}`);
  const insightsJson = await insightsRes.json();
  const metric = insightsJson?.data?.find(
    (m: { name: string; values?: { value: number }[] }) => m.name === 'video_views' || m.name === 'impressions'
  );
  return metric?.values?.[0]?.value ?? 0;
}

async function fetchYouTubeViews(postUrl: string): Promise<number> {
  const match = postUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (!match) throw new Error(`Cannot extract YouTube video ID from ${postUrl}`);
  const videoId = match[1];

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[UGC Sync] YOUTUBE_API_KEY not set — skipping YouTube count');
    return -1;
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`
  );
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`);
  const json = await res.json();
  return Number(json?.items?.[0]?.statistics?.viewCount ?? 0);
}

async function fetchXViews(postUrl: string): Promise<number> {
  // X (Twitter) API v2: GET /2/tweets/:id?tweet.fields=public_metrics
  const match = postUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  if (!match) throw new Error(`Cannot extract tweet ID from ${postUrl}`);
  const tweetId = match[1];

  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    console.warn('[UGC Sync] X_BEARER_TOKEN not set — skipping X count');
    return -1;
  }

  const res = await fetch(
    `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
    { headers: { Authorization: `Bearer ${bearerToken}` } }
  );
  if (!res.ok) throw new Error(`X API error ${res.status}`);
  const json = await res.json();
  return json?.data?.public_metrics?.impression_count ?? 0;
}

async function getViewsFromPlatform(platform: string, postUrl: string): Promise<number> {
  switch (platform) {
    case 'tiktok':    return fetchTikTokViews(postUrl);
    case 'instagram': return fetchInstagramViews(postUrl);
    case 'youtube':   return fetchYouTubeViews(postUrl);
    case 'x':         return fetchXViews(postUrl);
    default:          throw new Error(`Unknown platform: ${platform}`);
  }
}

// ─── Main sync function ──────────────────────────────────────────────────

export async function syncAllApprovedSubmissions(): Promise<{
  processed: number;
  skipped: number;
  errors: string[];
}> {
  const db = createServiceRoleClient();
  const errors: string[] = [];
  let processed = 0;
  let skipped = 0;

  // 1. Fetch all approved submissions with their campaign data
  const { data: submissions, error: fetchError } = await db
    .from('ugc_submissions')
    .select(`
      id,
      campaign_id,
      influencer_id,
      post_url,
      platform,
      total_views_earned,
      total_earnings,
      ugc_campaigns!inner (
        id,
        rate_per_1k_views,
        max_payout_per_sub,
        total_budget,
        spent_budget,
        total_views_tracked,
        status,
        ends_at
      ),
      influencers!inner (
        id,
        user_id,
        total_earnings,
        available_balance
      )
    `)
    .eq('status', 'approved');

  if (fetchError) {
    throw new Error(`Failed to fetch approved submissions: ${fetchError.message}`);
  }
  if (!submissions || submissions.length === 0) {
    return { processed: 0, skipped: 0, errors: [] };
  }

  for (const sub of submissions) {
    try {
      const campaign = sub.ugc_campaigns as unknown as {
        id: string;
        rate_per_1k_views: number;
        max_payout_per_sub: number | null;
        total_budget: number;
        spent_budget: number;
        total_views_tracked: number;
        status: string;
        ends_at: string | null;
      };
      const influencer = sub.influencers as unknown as {
        id: string;
        user_id: string;
        total_earnings: number;
        available_balance: number;
      };

      // Skip if campaign has ended
      if (campaign.ends_at && new Date(campaign.ends_at) < new Date()) {
        skipped++;
        continue;
      }

      // Skip paused/cancelled/completed campaigns
      if (!['active'].includes(campaign.status)) {
        skipped++;
        continue;
      }

      // 2a. Fetch views from social platform
      const currentViews = await getViewsFromPlatform(sub.platform, sub.post_url);
      if (currentViews < 0) {
        // API not configured — skip silently
        skipped++;
        continue;
      }

      // 2b. Compute delta
      const delta = currentViews - (sub.total_views_earned ?? 0);
      if (delta <= 0) {
        skipped++;
        continue;
      }

      // 2c. Compute earnings for this snapshot
      const rawEarnings = (delta / 1000) * campaign.rate_per_1k_views;
      const cap = campaign.max_payout_per_sub ?? Infinity;
      const alreadyEarned = sub.total_earnings ?? 0;
      const earningsThisSync = Math.min(rawEarnings, cap - alreadyEarned);

      if (earningsThisSync <= 0) {
        skipped++;
        continue;
      }

      // 2d. Insert snapshot
      const snapshotInsert = await db.from('ugc_view_snapshots').insert({
        submission_id: sub.id,
        views_at_snapshot: currentViews,
        delta_views: delta,
        earnings_this_snapshot: earningsThisSync,
      });
      if (snapshotInsert.error) throw new Error(snapshotInsert.error.message);

      // 2e. Update submission totals
      const { error: subUpdateErr } = await db
        .from('ugc_submissions')
        .update({
          total_views_earned: (sub.total_views_earned ?? 0) + delta,
          total_earnings: alreadyEarned + earningsThisSync,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', sub.id);
      if (subUpdateErr) throw new Error(subUpdateErr.message);

      // 2f. Update campaign spent_budget + total_views_tracked
      const newSpent = (campaign.spent_budget ?? 0) + earningsThisSync;
      await db
        .from('ugc_campaigns')
        .update({
          spent_budget: newSpent,
          total_views_tracked: (campaign.total_views_tracked ?? 0) + delta,
        })
        .eq('id', campaign.id);

      // auto-pause if budget exhausted
      if (newSpent >= campaign.total_budget) {
        await db
          .from('ugc_campaigns')
          .update({ status: 'paused' })
          .eq('id', campaign.id);
      }

      // 2g. Credit influencer
      await db
        .from('influencers')
        .update({
          total_earnings: (influencer.total_earnings ?? 0) + earningsThisSync,
          available_balance: (influencer.available_balance ?? 0) + earningsThisSync,
        })
        .eq('id', influencer.id);

      // 2h. Credit wallet (manual update — no RPC required)
      const { data: walletRow } = await db
        .from('wallets')
        .select('available_balance, total_earned')
        .eq('user_id', influencer.user_id)
        .single();
      if (walletRow) {
        await db
          .from('wallets')
          .update({
            available_balance: ((walletRow as { available_balance: number }).available_balance ?? 0) + earningsThisSync,
            total_earned: ((walletRow as { total_earned: number }).total_earned ?? 0) + earningsThisSync,
          })
          .eq('user_id', influencer.user_id);
      }

      // 2i. Insert payout record
      await db.from('payouts').insert({
        user_id: influencer.user_id,
        type: 'ugc_earnings',
        amount: earningsThisSync,
        currency: 'USD',
        status: 'paid',
        notes: `UGC campaign earnings sync — submission ${sub.id}`,
      });

      // 2j. Insert notification
      await db.from('notifications').insert({
        user_id: influencer.user_id,
        type: 'influencer',
        title: 'UGC Earnings Credited',
        message: `You earned $${earningsThisSync.toFixed(2)} from your latest content sync.`,
        data: {
          submission_id: sub.id,
          campaign_id: campaign.id,
          delta_views: delta,
          earnings: earningsThisSync,
        },
      });

      processed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`submission ${sub.id}: ${msg}`);
      console.error(`[UGC Sync] Error on submission ${sub.id}:`, msg);
    }
  }

  return { processed, skipped, errors };
}
