# Webflow CMS Integration Setup Guide

This guide explains how to connect your Webflow site to the Chinese School Platform so class listings and real-time spot counts stay in sync automatically.

---

## 1. Environment Variables

Add these to your `.env.local` (and your production deployment's environment):

```env
WEBFLOW_API_TOKEN=        # Bearer token from Webflow Account Settings → Integrations → API Access
WEBFLOW_SITE_ID=          # Found in Webflow project Settings → General → Site ID
WEBFLOW_COLLECTION_ID=    # CMS Collection ID (see step 2 below)
WEBFLOW_API_KEY=          # A secret you invent; used to protect /api/webflow/* endpoints
                          # Example: openssl rand -base64 24
```

---

## 2. Create the CMS Collection in Webflow

In your Webflow project, go to **CMS → Collections → New Collection**. Name it **Classes** (slug: `classes`).

Add the following fields exactly — the **Field Slug** column must match precisely, as that is what the sync API writes to:

| Field Label        | Field Type    | Field Slug          | Notes                              |
|--------------------|---------------|---------------------|------------------------------------|
| Name *(built-in)*  | Plain Text    | `name`              | Required; used as item title       |
| Chinese Name       | Plain Text    | `chinese-name`      |                                    |
| Class Type         | Plain Text    | `class-type`        | Value: "Chinese Class" or "Arts Class" |
| Teacher Name       | Plain Text    | `teacher-name`      |                                    |
| Schedule Display   | Plain Text    | `schedule-display`  | e.g. "Every Sunday, 9:00–10:30 AM" |
| Fee                | Number        | `fee`               | Annual tuition in USD (no cents)   |
| Capacity           | Number        | `capacity`          | Total seats                        |
| Spots Remaining    | Number        | `spots-remaining`   | Updated on every sync              |
| Is Full            | Switch/Toggle | `is-full`           | `true` when spots-remaining = 0    |
| Age Range          | Plain Text    | `age-range`         | e.g. "Ages 8–9"                    |
| Description        | Plain Text    | `description`       |                                    |
| Class ID           | Plain Text    | `class-id`          | **Required** — stores the database ID for upsert matching |

> **Important:** The `class-id` field is how the sync identifies which Webflow item corresponds to which database class. Without it, every sync run creates duplicate items.

After saving the collection, copy its **Collection ID** from the address bar (`/v2/collections/<id>`) or from the CMS Collection settings, and paste it into `WEBFLOW_COLLECTION_ID`.

---

## 3. Manual Sync (Testing)

Once your environment variables are set, trigger a full sync with:

```bash
curl -X POST https://your-domain.com/api/webflow/sync \
  -H "x-api-key: YOUR_WEBFLOW_API_KEY"
```

A successful response looks like:

```json
{
  "success": true,
  "data": {
    "synced": 15,
    "errors": []
  }
}
```

If there are errors, they are returned per-class in the `errors` array so partial successes are visible.

You can also fetch the raw class data (useful for debugging or building Webflow logic):

```bash
curl https://your-domain.com/api/webflow/classes \
  -H "x-api-key: YOUR_WEBFLOW_API_KEY"
```

---

## 4. Automated Daily Sync via Make.com

Keep spot counts fresh on the public site by scheduling a nightly sync.

### Setup steps

1. Log in to [make.com](https://make.com) and create a new **Scenario**.
2. Add an **HTTP → Make a request** module with these settings:

   | Setting        | Value                                      |
   |----------------|--------------------------------------------|
   | URL            | `https://your-domain.com/api/webflow/sync` |
   | Method         | `POST`                                     |
   | Headers        | `x-api-key` → `YOUR_WEBFLOW_API_KEY`       |
   | Response type  | `JSON`                                     |

3. Optionally add an **Email** or **Slack** module after it that fires only when `data.errors` is non-empty to alert you of sync failures.
4. Click **Schedule** and set it to run **once daily** (e.g. 2:00 AM in your timezone).
5. Activate the scenario.

### Alternative: Zapier

1. Create a new Zap with **Schedule by Zapier** as the trigger (daily).
2. Add a **Webhooks by Zapier → POST** action:
   - URL: `https://your-domain.com/api/webflow/sync`
   - Headers: `x-api-key: YOUR_WEBFLOW_API_KEY`
   - Payload type: `json`
3. Turn on the Zap.

---

## 5. Real-Time vs. Scheduled Sync

The daily scheduled sync is sufficient for spot count accuracy since enrollment activity happens during registration periods. If you want near-real-time updates (e.g. when an admin confirms an enrollment), you can call `POST /api/webflow/sync` from within the relevant API routes — but this adds latency and Webflow API rate-limit risk, so it is not enabled by default.

---

## 6. Webflow API Rate Limits

The Webflow Data API v2 allows **60 requests per minute** per site. A full sync of 15 classes uses roughly 30–35 requests (list + per-item update + publish). This is well within limits. If you add many more classes, the sync batches the publish step to keep request count low.
