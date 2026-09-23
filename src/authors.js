// src/authors.js
// Author Profiles, Bios, Credentials, and E-E-A-T metadata for Prime Media

export const AUTHORS = {
  "sarah-jenkins": {
    slug: "sarah-jenkins",
    name: "Sarah Jenkins",
    role: "Senior Technology & AI Correspondent",
    initials: "SJ",
    email: "s.jenkins@primemedia.site",
    bio: "Sarah Jenkins is an award-winning investigative technology journalist with over a decade of experience tracking artificial intelligence infrastructure, edge computing, semiconductor architecture, and distributed systems. Prior to joining Prime Media, Sarah contributed to leading tech outlets in Silicon Valley and authored research papers on neural network compression. She holds a B.S. in Computer Science from Carnegie Mellon University and an M.A. in Science Journalism from Columbia University.",
    education: "B.S. Computer Science (Carnegie Mellon), M.A. Science Journalism (Columbia)",
    beats: ["Artificial Intelligence", "Micro-LLMs", "Edge Computing", "Semiconductors", "Cybersecurity"],
    location: "San Francisco, California",
    articlesCount: 148,
    social: {
      twitter: "https://x.com/PrimeMediaHQ",
      linkedin: "https://www.linkedin.com/company/primemedia-news",
      muckrack: "https://muckrack.com"
    }
  },
  "david-chen": {
    slug: "david-chen",
    name: "David Chen",
    role: "Global Financial & Macroeconomic Analyst",
    initials: "DC",
    email: "d.chen@primemedia.site",
    bio: "David Chen leads Prime Media's global business, monetary policy, and fintech reporting. With a decade of prior experience as an equity research strategist and quantitative macro analyst in New York and London, David specializes in central bank liquidity flows, sovereign debt markets, foreign exchange dynamics, and emerging digital assets. He holds an M.Sc. in Quantitative Finance from the London School of Economics and is a CFA charterholder.",
    education: "M.Sc. Quantitative Finance (LSE), B.A. Economics (NYU), CFA Charterholder",
    beats: ["Macroeconomics", "Sovereign Debt", "Central Banks", "CBDCs", "Equity Markets"],
    location: "New York, New York",
    articlesCount: 156,
    social: {
      twitter: "https://x.com/PrimeMediaHQ",
      linkedin: "https://www.linkedin.com/company/primemedia-news",
      muckrack: "https://muckrack.com"
    }
  },
  "elena-rostova": {
    slug: "elena-rostova",
    name: "Elena Rostova",
    role: "Aerospace, Deep Science & Quantum Editor",
    initials: "ER",
    email: "e.rostova@primemedia.site",
    bio: "Elena Rostova oversees Prime Media's coverage of aerospace engineering, orbital dynamics, deep space exploration, and quantum information science. Formerly an astrophysics research associate at the European Southern Observatory, Elena excels at translating complex quantum mechanics and orbital mechanics into accessible, rigorously verified investigative journalism. She holds a Ph.D. in Applied Astrophysics from Heidelberg University.",
    education: "Ph.D. Applied Astrophysics (Heidelberg University), M.S. Physics (ETH Zurich)",
    beats: ["Aerospace Engineering", "Orbital Logistics", "Quantum Information Science", "Astrophysics"],
    location: "Zurich, Switzerland / Washington, D.C.",
    articlesCount: 132,
    social: {
      twitter: "https://x.com/PrimeMediaHQ",
      linkedin: "https://www.linkedin.com/company/primemedia-news",
      muckrack: "https://muckrack.com"
    }
  },
  "marcus-vance": {
    slug: "marcus-vance",
    name: "Dr. Marcus Vance",
    role: "Executive Editor & Investigative Policy Director",
    initials: "MV",
    email: "m.vance@primemedia.site",
    bio: "Dr. Marcus Vance directs Prime Media's editorial masthead, investigative verification standards, and algorithmic publication ethics. With over twenty years of investigative journalism experience across international news bureaus, Dr. Vance has covered constitutional law, geopolitical conflict, global trade supply chains, and industrial robotics. He was a Nieman Journalism Fellow at Harvard University and holds a Ph.D. in International Law and Media Ethics.",
    education: "Ph.D. International Law & Media Ethics (Oxford), Nieman Journalism Fellow (Harvard)",
    beats: ["Geopolitics & Sanctions", "Media Ethics", "Robotics Automation", "Global Trade Policy"],
    location: "London, United Kingdom",
    articlesCount: 140,
    social: {
      twitter: "https://x.com/PrimeMediaHQ",
      linkedin: "https://www.linkedin.com/company/primemedia-news",
      muckrack: "https://muckrack.com"
    }
  }
};

export const AUTHOR_LIST = Object.values(AUTHORS);

export function getAuthorBySlug(slug) {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  return AUTHORS[normalized] || null;
}

export function getAuthorForPost(post) {
  if (post && post.authorSlug && AUTHORS[post.authorSlug]) {
    return AUTHORS[post.authorSlug];
  }
  if (post && post.author) {
    const found = AUTHOR_LIST.find(a => a.name.toLowerCase() === post.author.toLowerCase());
    if (found) return found;
  }
  // Deterministic hash based on slug
  const slug = (post && post.slug) || '';
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AUTHOR_LIST.length;
  return AUTHOR_LIST[idx];
}
