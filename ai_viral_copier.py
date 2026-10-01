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


SYSTEM_PROMPT = """You are the Chief Viral Editor of Prime Media News (@PrimeMediaSite), a global news wire covering AI, Cinema, Tech, and Economy.
Transform the provided article details into a high-CTR, rich-context tweet package.
Rules:
1. Hook: High-stakes headline starting with an alert emoji (e.g. 🚨 BREAKING: or ⚡ INTEL:). Max 65 characters.
2. Description: 1 to 2 rich, contextual sentences (80 to 110 characters) explaining what is happening, the real-world impact, and why readers should care. DO NOT use pin emojis (📌) or bullet points. Write clean, compelling prose.
3. Hashtags: 3 relevant hashtags starting with #.
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

Generate the JSON tweet package now:"""

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
                if "hook" in parsed:
                    return parsed
    except Exception as e:
        print(f"⚠️ Ollama LLM call failed or offline ({e}), using smart editorial fallback...")

    return generate_editorial_fallback(title, summary, category)


def generate_editorial_fallback(title, summary, category):
    """Rich editorial fallback with full context and zero pin emojis"""
    cat = category.lower()
    if any(k in cat for k in ["movie", "cinema", "entertainment"]):
        hashtags = "#Movies #Cinema #PrimeMedia"
        tag = "ENTERTAINMENT ALERT"
    elif any(k in cat for k in ["ai", "tech", "gadget", "software"]):
        hashtags = "#AI #TechNews #PrimeMedia"
        tag = "TECH INTEL"
    elif any(k in cat for k in ["market", "economy", "stock", "finance"]):
        hashtags = "#StockMarket #Economy #PrimeMedia"
        tag = "MARKET SHOCK"
    else:
        hashtags = "#BreakingNews #Trending #PrimeMedia"
        tag = "GLOBAL WIRE"

    # Build meaningful context description from summary or title
    desc = ""
    if summary and len(summary) > 30:
        clean_sum = summary.strip().replace("\n", " ")
        first_sentence = clean_sum.split(". ")[0].strip()
        if len(first_sentence) > 100:
            first_sentence = first_sentence[:97] + "..."
        desc = first_sentence + ("." if not first_sentence.endswith(".") else "")
    else:
        desc = "Major developments unfold with sweeping industry implications as analysts reveal the hidden market fallout."

    return {
        "hook": f"🚨 {tag}: {title[:65]}",
        "description": desc,
        "hashtags": hashtags
    }


def format_full_viral_tweet(viral_data, article_url):
    """
    Formats the final tweet text:
    - Alert Hook
    - Rich Context Description (NO pin emojis)
    - Clean CTA + Link
    - Hashtags
    Accurately accounts for Twitter's 23-char t.co URL shortening rule to keep
    total weighted characters safely <= 260 (well within Twitter's 280-char limit).
    """
    hook = viral_data.get("hook", "").strip()
    # Support both 'description' and legacy 'bullets'
    desc = viral_data.get("description", "")
    if not desc and viral_data.get("bullets"):
        desc = " ".join([b.strip().lstrip('•-📌 ') for b in viral_data.get("bullets", [])[:2]])
    desc = desc.strip().lstrip("📌•- ")

    # Clean hashtags
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

    # Twitter counts any URL as 23 characters regardless of raw URL length
    # Target maximum weighted length: 260 (Twitter limit is 280)
    if len(hook) > 75:
        hook = hook[:72] + "..."

    fixed_weight = len(hook) + 2 + len(cta) + 1 + 23 + 2 + len(hashtags)
    avail_desc_weight = 260 - fixed_weight - 2  # -2 for \n\n before CTA

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
    formatted = format_full_viral_tweet(res, test_url)
    print("=" * 60)
    print(formatted)
    print("=" * 60)
    print(f"Total Length: {len(formatted)} chars")
