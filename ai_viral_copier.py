"""
Prime Media - AI Viral Copywriter Engine (Rich Context Edition)
================================================================
Generates high-CTR breaking news tweets:
- Alert hook (🚨 BREAKING: or ⚡ INTEL:)
- Rich, contextual 1-2 sentence description (NO pin emojis, gives full context for high CTR)
- Read Full Story CTA + Clean backlink
- Curated high-volume hashtags
- Strictly maintains 240-255 character limit for 100% Twitter compatibility
"""

import os
import sys
import json
import urllib.request
import re

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

OLLAMA_ENDPOINT = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434/api/generate")
DEFAULT_MODEL = os.getenv("AI_MODEL", "qwen2.5:3b")


SYSTEM_PROMPT = """You are the Lead Growth Editor of Prime Media News (@PrimeMediaSite), a global news wire covering AI, Cinema, Tech, and Economy.
Transform the provided article details into a high-CTR, viral curiosity-hook tweet package designed to maximize clicks to the publication website.

Rules:
1. Hook: High-stakes headline starting with an alert emoji (e.g. 🚨 BREAKING:, ⚡ TECH INTEL:, 🎬 CINEMA ALERT:, or 💥 MARKET SHOCK:). Max 65 characters.
2. Description: 1 to 2 gripping, curiosity-gap sentences (100 to 140 characters). Highlight the conflict, dramatic numbers, or surprise findings, leaving an intriguing open loop that compels readers to click through. DO NOT use pin emojis (📌) or bullet points. DO NOT repeat the headline.
3. Hashtags: 3 targeted high-traffic hashtags starting with #.

Return strictly valid JSON:
{
  "hook": "string",
  "description": "string",
  "hashtags": "string"
}
"""


def generate_viral_copy_with_llm(title, summary="", category="TECH", trending_topics=None):
    """Calls local Ollama Qwen 2.5 on Oracle VM to produce viral tweet copy"""
    trend_context = f"\nCurrent trending topics on X: {', '.join(trending_topics)}" if trending_topics else ""
    user_prompt = f"""Article Title: {title}
Category: {category}
Summary: {summary[:500] if summary else 'N/A'}{trend_context}

Generate the high-CTR viral JSON tweet package now:"""

    payload = {
        "model": DEFAULT_MODEL,
        "prompt": f"{SYSTEM_PROMPT}\n\n{user_prompt}",
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "num_predict": 300
        }
    }

    try:
        req = urllib.request.Request(
            OLLAMA_ENDPOINT,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            response_text = data.get("response", "{}")
            match = re.search(r"\{.*\}", response_text, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                if "hook" in parsed and "description" in parsed:
                    return parsed
    except Exception as e:
        print(f"⚠️ Ollama LLM call failed or offline ({e}), using smart editorial fallback...")

    return generate_editorial_fallback(title, summary, category)


def generate_editorial_fallback(title, summary, category):
    """Rich editorial fallback with full curiosity context and zero pin emojis"""
    cat = (category or "").lower()
    if any(k in cat for k in ["movie", "cinema", "entertainment", "film"]):
        hashtags = "#Movies #Cinema #PrimeMedia"
        tag = "CINEMA ALERT"
        default_desc = "New box office milestones and contentious streaming contract terms shake up the entertainment industry rollout."
    elif any(k in cat for k in ["ai", "tech", "gadget", "software", "silicon"]):
        hashtags = "#AI #TechNews #PrimeMedia"
        tag = "TECH INTEL"
        default_desc = "Leaked benchmark figures and custom silicon investments trigger intense debate among enterprise architects."
    elif any(k in cat for k in ["market", "economy", "stock", "finance", "business"]):
        hashtags = "#StockMarket #Economy #PrimeMedia"
        tag = "MARKET SHOCK"
        default_desc = "Surging capital flows and regulatory policy shifts caught analysts off guard as sector valuations diverge."
    else:
        hashtags = "#BreakingNews #Trending #PrimeMedia"
        tag = "GLOBAL WIRE"
        default_desc = "Key developments reveal unprecedented global consequences as eyewitness reports and internal data emerge."

    desc = ""
    if summary and len(summary) > 40:
        clean_sum = summary.strip().replace("\n", " ")
        sentences = [s.strip() for s in clean_sum.split(". ") if len(s.strip()) > 10]
        if sentences:
            desc = sentences[0]
            if len(desc) < 70 and len(sentences) > 1:
                desc += ". " + sentences[1]
            if len(desc) > 135:
                desc = desc[:132].rstrip() + "..."
            if not desc.endswith((".", "!", "?")):
                desc += "."
    if not desc:
        desc = default_desc

    return {
        "hook": f"🚨 {tag}: {title[:62]}",
        "description": desc,
        "hashtags": hashtags
    }


def format_hook_tweet(viral_data):
    """
    Formats Post 1 (The Hook):
    - Visual Hook & Curiosity context
    - Strictly NO external link to avoid X's ~75% link suppression penalty
    - Curiosity pointer to thread reply
    - High-volume hashtags & cashtags
    Maximizes 'For You' recommendation distribution score.
    """
    hook = viral_data.get("hook", "").strip()
    desc = viral_data.get("description", "")
    if not desc and viral_data.get("bullets"):
        desc = " ".join([b.strip().lstrip('•-📌 ') for b in viral_data.get("bullets", [])[:2]])
    desc = desc.strip().lstrip("📌•- ")

    raw_tags = viral_data.get("hashtags", "").strip()
    tag_list = []
    for t in raw_tags.replace(",", " ").split():
        t = t.strip()
        if not t:
            continue
        if not t.startswith("#") and not t.startswith("$"):
            t = f"#{t}"
        tag_list.append(t)
    if "#PrimeMedia" not in tag_list:
        tag_list.append("#PrimeMedia")
    hashtags = " ".join(tag_list[:3])

    pointer = "🧵 Full investigation & metrics below 👇"

    if len(hook) > 75:
        hook = hook[:72] + "..."

    fixed_len = len(hook) + 2 + len(pointer) + 2 + len(hashtags)
    avail_desc = 250 - fixed_len

    if len(desc) > avail_desc:
        desc = desc[:max(0, avail_desc - 3)].rstrip() + "..."

    if desc and len(desc) > 15:
        return f"{hook}\n\n{desc}\n\n{pointer}\n\n{hashtags}"
    else:
        return f"{hook}\n\n{pointer}\n\n{hashtags}"


def format_reply_tweet(title, article_url):
    """
    Formats Post 2 (Connected Thread Reply):
    - Carries the clickable backlink to Prime Media
    - Direct call to action and brand follow recommendation
    """
    return f"📖 Read the complete story & analysis on Prime Media:\n👉 {article_url}\n\nFollow @PrimeMediaSite for daily verified intel ⚡"


def format_full_viral_tweet(viral_data, article_url):
    """
    Formats single tweet text (Fallback mode):
    - Alert Hook
    - Rich Context Description (NO pin emojis)
    - Clean CTA + Link
    - Hashtags
    Accurately accounts for Twitter's 23-char t.co URL shortening rule.
    """
    hook = viral_data.get("hook", "").strip()
    desc = viral_data.get("description", "")
    if not desc and viral_data.get("bullets"):
        desc = " ".join([b.strip().lstrip('•-📌 ') for b in viral_data.get("bullets", [])[:2]])
    desc = desc.strip().lstrip("📌•- ")

    raw_tags = viral_data.get("hashtags", "").strip()
    tag_list = []
    for t in raw_tags.replace(",", " ").split():
        t = t.strip()
        if not t:
            continue
        if not t.startswith("#"):
            t = f"#{t}"
        tag_list.append(t)
    if "#PrimeMedia" not in tag_list:
        tag_list.append("#PrimeMedia")
    hashtags = " ".join(tag_list[:3])

    cta = "📖 Read Full Story 👇"

    if len(hook) > 75:
        hook = hook[:72] + "..."

    fixed_weight = len(hook) + 2 + len(cta) + 1 + 23 + 2 + len(hashtags)
    avail_desc_weight = 260 - fixed_weight - 2

    if len(desc) > avail_desc_weight:
        desc = desc[:max(0, avail_desc_weight - 3)].rstrip() + "..."

    if desc and len(desc) > 20:
        tweet = f"{hook}\n\n{desc}\n\n{cta}\n{article_url}\n\n{hashtags}"
    else:
        tweet = f"{hook}\n\n{cta}\n{article_url}\n\n{hashtags}"

    return tweet


if __name__ == "__main__":
    test_title = "The Silicon Shift: Why the 2026 Gaming Laptop Market Just Rewrote the Rules"
    test_url = "https://primemedia.site/post/the-silicon-shift-why-the-2026-gaming-laptop-market"
    test_summary = "Cloud hyperscalers are pouring over $80 billion into custom AI compute clusters to break legacy chip monopolies and disrupt enterprise data center economics."
    res = generate_viral_copy_with_llm(test_title, summary=test_summary, category="TECH NEWS")
    print("=== THREAD POST 1 (MAIN HOOK - NO LINK) ===")
    print(format_hook_tweet(res))
    print("\n=== THREAD POST 2 (CONNECTED REPLY LINK) ===")
    print(format_reply_tweet(test_title, test_url))

