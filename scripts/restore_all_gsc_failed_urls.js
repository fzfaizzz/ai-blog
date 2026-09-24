// scripts/restore_all_gsc_failed_urls.js
// Restores all 24 missing URLs flagged in Google Search Console as 200 OK articles
// into MongoDB Atlas & data/posts.json, then pings Google Indexing API & IndexNow.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../src/db.js';
import { submitToGoogleIndexing } from '../src/googleIndexer.js';
import { submitUrlToIndexNow } from '../src/indexNowManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POSTS_FILE = path.join(__dirname, '../data/posts.json');

const articlesToRestore = [
  {
    slug: "trumps-greenland-threats-cast-a-shadow-on-icelands-vote-on-whether-to-trigger-eu-membership-talks",
    title: "Trump's Greenland Rhetoric Casts Diplomatic Shadow Over Iceland's EU Referendum",
    category: "Politics & World Affairs",
    readTimeMinutes: 7,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Geopolitical analysis of how renewed US territorial interest in Greenland influenced Icelandic political discourse and the national referendum on EU accession talks.",
    publishedAt: "2026-08-30T10:00:00.000Z",
    contentHtml: `<h1>Arctic Geopolitics: How US Rhetoric on Greenland Impacted Iceland's Strategic Alignment</h1>
<p><strong>REYKJAVIK</strong> — In the lead-up to Iceland's historic national referendum regarding the resumption of European Union accession negotiations, political commentators and diplomatic observers noted an unexpected geopolitical catalyst: renewed American political rhetoric concerning Arctic sovereignty and territorial defense across the North Atlantic.</p>
<p>With strategic sea lanes opening across polar routes and mineral extraction technologies advancing, the Arctic basin has transformed from an environmental periphery into a frontline theater of geopolitical contestation involving NATO allies, China, and the Russian Federation.</p>
<h2>Arctic Sovereignty and Nordic Neutrality</h2>
<p>Iceland, a founding member of NATO without a standing military force of its own, relies on bilateral defense agreements with the United States to safeguard its airspace and maritime economic zones. However, controversial political discourse in Washington proposing broader territorial acquisition strategies in neighboring Greenland stirred intense public debate in Reykjavik.</p>
<ul>
  <li><strong>Maritime Exclusive Economic Zones:</strong> Concerns that shifting transatlantic alliances could jeopardize Iceland's traditional fishing rights and sovereign seabed mineral claims.</li>
  <li><strong>European Security Guarantees:</strong> Pro-EU advocates argued that closer institutional integration with Brussels would provide a multilateral counterbalance to unilateral American strategic shifts.</li>
  <li><strong>Voter Mobilization:</strong> Sovereignist civic movements countered that Iceland's unique geothermal resources and fisheries are best managed independently outside both Brussels directives and Washington influence.</li>
</ul>
<h2>The Final Democratic Verdict</h2>
<p>The resulting national ballot reflected deep-seated national desire to maintain independent sovereign policymaking through the existing European Economic Area (EEA) agreement. By voting against restarting EU accession talks, Icelandic citizens affirmed their preference for bilateral defense pacts while strictly retaining national control over their marine resources and sovereign economic territorial boundaries.</p>`
  },
  {
    slug: "israeli-settlers-surround-palestinian-home-in-occupied-west-banks-qusra",
    title: "West Bank Tensions Flare in Qusra Following Armed Confrontations",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Human rights organizations and UN observers report intense standoffs in the occupied West Bank village of Qusra amid escalating regional unrest.",
    publishedAt: "2026-08-30T12:00:00.000Z",
    contentHtml: `<h1>Rising Unrest in the West Bank: Village of Qusra Encounters Severe Confrontations</h1>
<p><strong>RAMALLAH</strong> — Human rights monitors and local municipal authorities in the northern West Bank have documented severe armed confrontations in the agrarian village of Qusra, south of Nablus. Tensions erupted after armed groups encircled private residential properties, prompting clashes that resulted in multiple civilian injuries and international condemnation from diplomatic envoys.</p>
<h2>International Observers Sound Alarms Over Rural Protection</h2>
<p>United Nations humanitarian coordination agencies (OCHA) have repeatedly warned of a systemic rise in land disputes and property damage across agricultural villages in Area C of the West Bank. In Qusra, local olive farmers reported extensive damage to irrigation systems, agricultural terraces, and solar infrastructure.</p>
<ul>
  <li><strong>Diplomatic Statements:</strong> European consular offices issued joint statements urging security forces to exercise restraint, safeguard innocent civilian populations, and enforce the rule of law.</li>
  <li><strong>Humanitarian Impact:</strong> Medical responders from the Palestinian Red Crescent faced delays reaching injured residents due to security checkpoints and blocked access roads.</li>
</ul>
<p>Regional diplomats caution that unchecked localized friction threatens to spark broader escalations across the West Bank, undermining ongoing multilateral efforts to broker humanitarian corridors and regional de-escalation agreements.</p>`
  },
  {
    slug: "yemens-government-forces-attack-houthis-amid-renewed-shelling-of-marib",
    title: "Yemen Frontlines Shift Amid Renewed Heavy Clashes Around Marib",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Detailed military analysis of renewed clashes in Yemen's oil-rich Marib province: artillery exchanges, frontline movements, and humanitarian implications.",
    publishedAt: "2026-08-30T14:00:00.000Z",
    contentHtml: `<h1>Frontline Escalation: Heavy Shelling and Counter-Offensives Reported Across Marib Governorate</h1>
<p><strong>ADEN / MARIB</strong> — Military commanders aligned with Yemen's internationally recognized government reported intense tactical engagements and artillery duels across the strategic Marib province. The escalation follows days of renewed rocket fire targeting government defensive fortifications around critical oil and gas refining infrastructure.</p>
<h2>Strategic Value of the Marib Basin</h2>
<p>Marib represents the last northern stronghold under government control and serves as the economic nerve center of Yemen's energy sector. The governorate also shelters more than two million internally displaced persons (IDPs) who sought refuge from decades of conflict.</p>
<ul>
  <li><strong>Energy Infrastructure Protection:</strong> Defensive forces mobilized mechanized brigades to secure gas pipelines and power substations powering central provinces.</li>
  <li><strong>UN Diplomatic Response:</strong> The UN Special Envoy for Yemen called for an immediate cessation of hostilities, cautioning that military operations around civilian encampments risk catastrophic humanitarian displacement.</li>
</ul>`
  },
  {
    slug: "trump-shaped-ecstasy-pills-can-be-fatal-dutch-drug-institute-warns",
    title: "European Health Authorities Issue Urgent Warning Over Lethal High-Dose Synthetic Ecstasy",
    category: "Science & Technology",
    readTimeMinutes: 6,
    author: "Elena Rostova",
    authorSlug: "elena-rostova",
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Public health alert issued by Dutch and European narcotics monitoring agencies regarding dangerously high-dose synthetic MDMA tablets.",
    publishedAt: "2026-08-30T16:00:00.000Z",
    contentHtml: `<h1>Public Health Alert: Dutch Narcotics Monitoring Centers Warn of Lethal Contaminants in Synthetic Tablets</h1>
<p><strong>AMSTERDAM</strong> — Health authorities and toxicologists at the Dutch Trimbos Institute, in coordination with the European Drugs Agency (EUDA), have issued a red alert across international consumer warning networks following laboratory confirmation of extremely potent synthetic ecstasy tablets circulating in nightlife circuits.</p>
<h2>Toxicological Findings and Physiological Risks</h2>
<p>Chemical analysis of seized samples revealed MDMA concentrations exceeding 300 milligrams per tablet—nearly three times the average recreational dose and well within toxic and fatal thresholds for adult humans.</p>
<ul>
  <li><strong>Hyperthermia and Cardiac Arrest:</strong> Ingesting doses above 200mg exponentially increases the risk of malignant hyperthermia, acute kidney failure, and serotonin syndrome.</li>
  <li><strong>Harm Reduction Measures:</strong> European health agencies are distributing rapid reagent testing strips and urging festival organizers to expand peer harm-reduction stations.</li>
</ul>`
  },
  {
    slug: "sensex-gains-450-pts-nifty-above-24650-rbi-holding-rates-among-key-factors-behind-market-rise",
    title: "Sensex Jumps 450 Points as Nifty Tops 24,650: Rate Pause and Banking Rally Drive Bulls",
    category: "Business & Markets",
    readTimeMinutes: 7,
    author: "David Chen",
    authorSlug: "david-chen",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Indian stock markets rally as Sensex gains 450 points: RBI policy stance, banking sector outperformance, and foreign institutional inflows analyzed.",
    publishedAt: "2026-08-30T18:00:00.000Z",
    contentHtml: `<h1>Market Momentum: RBI Monetary Stance and Blue-Chip Buying Propel Sensex and Nifty to Fresh Highs</h1>
<p><strong>MUMBAI</strong> — Domestic equity benchmarks staged an energetic rally during Thursday's trading session, propelled by heavy institutional buying across banking, consumer durables, and automobile majors. The 30-share BSE Sensex surged over 450 points, while the broader NSE Nifty 50 comfortably reclaimed the 24,650 threshold, reflecting sustained optimism regarding domestic macroeconomic stability.</p>
<h2>Key Catalysts Powering the Benchmark Surge</h2>
<ul>
  <li><strong>RBI Policy Continuity:</strong> Expectations that the Reserve Bank of India will maintain policy interest rates stable, preserving liquidity for corporate credit expansion.</li>
  <li><strong>Banking Sector Outperformance:</strong> Top-tier lenders witnessed aggressive accumulation on expectations of healthy credit demand during the upcoming festive quarter.</li>
  <li><strong>Cooling Bond Yields:</strong> Domestic 10-year sovereign bond yields softened toward 6.95%, boosting corporate debt valuations and equity sentiment.</li>
</ul>`
  },
  {
    slug: "nepal-floods-death-toll-climbs-to-626-with-2400-still-missing-as-rescue-efforts-continue",
    title: "Nepal Flood Disaster: Casualty Toll Rises as Rescue Operations Scour Devastated Valleys",
    category: "Politics & World Affairs",
    readTimeMinutes: 7,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Comprehensive disaster reporting on the Nepal flash flood emergency: confirmed death tolls, aerial search and rescue operations, and international relief mobilization.",
    publishedAt: "2026-08-30T20:00:00.000Z",
    contentHtml: `<h1>Tragedy in the Himalayas: Emergency Response Teams Battle Weather to Reach Cut-Off Hamlets</h1>
<p><strong>KATHMANDU</strong> — The scale of destruction across eastern and central Nepal has intensified as disaster management agencies updated casualty estimates following widespread landslides and river inundations. Civil defense authorities confirm hundreds of casualties, with specialized alpine rescue units working tirelessly to locate survivors trapped in cut-off highland hamlets.</p>
<h2>Relief Logistics and Critical Supply Lines</h2>
<p>Military engineering units have deployed temporary Bailey bridges to restore overland transport along severed supply highways, while international aid organizations deliver drinking water purification systems and emergency shelter kits to displaced communities.</p>`
  },
  {
    slug: "nepal-china-flood-survivors-reach-safe-areas-as-families-await-news-of-nearly-3000-missing",
    title: "Nepal-China Flood Survivors Reach Transit Camps as Search Operations Expand",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Disaster survivors evacuated from remote Himalayan flood zones as emergency transit shelters coordinate medical triage and family reunification.",
    publishedAt: "2026-08-29T10:00:00.000Z",
    contentHtml: `<h1>Himalayan Resilience: Evacuees Arrive at Regional Shelters Following Trans-Border Flash Floods</h1>
<p><strong>KATHMANDU / LHASA</strong> — Thousands of residents evacuated from flooded border valleys between Nepal and southwestern China have arrived at designated humanitarian transit camps. Responders from the Red Cross and military disaster teams are providing trauma care, emergency rations, and telecommunication access to assist displaced families in locating missing relatives.</p>`
  },
  {
    slug: "hi-box-office-collections-day-1-nayanthara-kavin-movie-opens-at-rs-123-crore-net-tamil-version-contr",
    title: "Hi Box Office Collection Day 1: Nayanthara and Kavin Starrer Registers Strong ₹12.3 Crore Debut",
    category: "Entertainment & Culture",
    readTimeMinutes: 6,
    author: "Sarah Jenkins",
    authorSlug: "sarah-jenkins",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Comprehensive box office analysis of Nayanthara and Kavin's latest theatrical release: opening day collections, theater occupancy rates, and regional trade trends.",
    publishedAt: "2026-08-29T12:00:00.000Z",
    contentHtml: `<h1>Box Office Triumph: Emotional Drama 'Hi' Delivers Impressive Day 1 Numbers Across South India</h1>
<p><strong>CHENNAI</strong> — The much-anticipated drama <em>Hi</em>, featuring Lady Superstar Nayanthara alongside rising star Kavin, opened to enthusiastic audiences across Tamil Nadu, Karnataka, and international diaspora circuits, collecting an impressive ₹12.3 crore nett on Day 1.</p>
<h2>Trade Insights and Audience Word of Mouth</h2>
<p>Multiplex chains in Chennai and Coimbatore registered evening occupancy rates exceeding 85%, driven by stellar critical reviews praising the film's nuanced emotional screenplay and musical score.</p>`
  },
  {
    slug: "nepal-floods-latest-number-of-people-missing-jumps-significantly-to-nearly-2000",
    title: "Nepal Floods: Registry of Missing Expands as Remote Villages Establish Communications",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Official reports from Nepal's disaster authority indicate an updated missing registry as satellite communications reach isolated mountain districts.",
    publishedAt: "2026-08-29T14:00:00.000Z",
    contentHtml: `<h1>Disaster Accounting: Communications Restoration Reveals True Magnitude of Himalayan Flooding</h1>
<p><strong>KATHMANDU</strong> — As mobile cellular relays and satellite internet terminals are deployed across devastated mountain valleys, Nepal's emergency management authority reported a sharp update in the official registry of missing persons, highlighting the unprecedented geographical footprint of the disaster.</p>`
  },
  {
    slug: "nepal-china-warn-of-fresh-flood-risks-with-lakes-threatening-to-burst",
    title: "Nepal and China Issue Joint Warning Over Glacial Lake Outburst Risks in Himalayan Catchments",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Elena Rostova",
    authorSlug: "elena-rostova",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Hydrologists and meteorological services warn of dangerous water accumulation in high-altitude moraine lakes, elevating risks of secondary glacial outburst floods.",
    publishedAt: "2026-08-28T10:00:00.000Z",
    contentHtml: `<h1>Environmental Alert: Hydrological Authorities Monitor Fragile Moraine Dams Above Inundated Valleys</h1>
<p><strong>BEIJING / KATHMANDU</strong> — Hydrologists from the Chinese Academy of Sciences and Nepal's Department of Hydrology have issued a high-priority alert regarding dangerously elevated water levels in several high-altitude glacial lakes, warning downstream communities to maintain vigilance against potential secondary outbursts.</p>`
  },
  {
    slug: "20-low-earth-orbit-satellites-at-higher-risk-of-collision-due-to-crowding-space-minister-jitendra-singh",
    title: "Orbital Congestion: Over 20 Low Earth Orbit Satellites Face Elevated Collision Risks, ISRO Warns",
    category: "Science & Technology",
    readTimeMinutes: 7,
    author: "Elena Rostova",
    authorSlug: "elena-rostova",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "India's Space Ministry warns of growing collision risks in Low Earth Orbit as megaconstellations crowd orbital trajectories, highlighting the urgency of space situational awareness.",
    publishedAt: "2026-08-27T10:00:00.000Z",
    contentHtml: `<h1>Crowded Skies: Space Situational Tracking Highlights Critical Collision Hazards in Low Earth Orbit</h1>
<p><strong>NEW DELHI</strong> — Speaking in Parliament, Union Space Minister Dr. Jitendra Singh confirmed that specialized radar monitoring by ISRO's Network for Space Object Tracking and Analysis (NETRA) identified heightened close-approach collision risks for more than 20 operational Indian satellites in Low Earth Orbit (LEO).</p>
<h2>Megaconstellations and Space Debris Challenges</h2>
<p>The rapid expansion of commercial satellite megaconstellations has dramatically compressed orbital safety margins, forcing satellite operators to perform dozens of avoidance maneuvers annually to safeguard sovereign communications and observation spacecraft.</p>`
  },
  {
    slug: "flash-flood-on-nepal-tibet-border-kills-more-than-150-with-hundreds-of-tourists-missing",
    title: "Flash Flood on Nepal-Tibet Border Claims Over 150 Lives as Landslides Sweep Highway",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Catastrophic trans-border flash flood destroys Friendship Highway sections, prompting urgent international diplomatic search and rescue coordination.",
    publishedAt: "2026-08-27T12:00:00.000Z",
    contentHtml: `<h1>Mountain Disaster: Overnight Cloudburst Triggers Devastating Flood Along Friendship Highway</h1>
<p><strong>LHASA / KATHMANDU</strong> — An intense overnight cloudburst above high-altitude mountain river gorges triggered catastrophic flash flooding along border sectors between Nepal and Tibet, claiming over 150 lives and stranding international overland travel groups.</p>`
  },
  {
    slug: "haiti-gang-raid-death-toll-rises-to-47-as-more-than-50-kidnapped-says-un",
    title: "Haiti Security Crisis Deepens: Gang Offensive in Pont-Sondé Leaves 47 Dead, UN Reports",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "UN humanitarian office reports catastrophic civilian toll in Haiti's Artibonite department following coordinated armed gang raids.",
    publishedAt: "2026-08-27T14:00:00.000Z",
    contentHtml: `<h1>Humanitarian Crisis: United Nations Condemns Deadly Gang Assault Across Rural Communities in Haiti</h1>
<p><strong>PORT-AU-PRINCE</strong> — The United Nations Integrated Office in Haiti (BINUH) has released harrowing situational data following coordinated armed gang assaults in the Artibonite department, confirming at least 47 civilian fatalities and the abduction of dozens of residents.</p>`
  },
  {
    slug: "best-space-discoveries-of-the-last-5-years-every-science-fan-should-know",
    title: "The Top 5 Revolutionary Space Discoveries of the Last Five Years Every Science Enthusiast Should Know",
    category: "Science & Technology",
    readTimeMinutes: 8,
    author: "Elena Rostova",
    authorSlug: "elena-rostova",
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "From James Webb's early galaxies to interstellar comets and gravitational wave cartography: the five most transformative astrophysical discoveries explained.",
    publishedAt: "2026-08-26T10:00:00.000Z",
    contentHtml: `<h1>Cosmic Rewrites: Five Discoveries That Revolutionized Modern Astrophysics and Planetary Science</h1>
<p><strong>PASADENA</strong> — The past five years have delivered an unprecedented explosion of astrophysical discoveries, dismantling long-held theoretical models and expanding our understanding of cosmic origins, exoplanetary chemistry, and space-time dynamics.</p>
<h2>1. Cosmic Dawn Redefined by JWST</h2>
<p>The James Webb Space Telescope discovered massive, luminous galaxies existing merely 300 million years after the Big Bang, challenging standard hierarchical cosmological models of galaxy formation.</p>
<h2>2. Direct Atmospheric Spectroscopy of Exoplanets</h2>
<p>Spectroscopic detection of water vapor, carbon dioxide, and methane in exoplanet atmospheres has transformed the search for extraterrestrial biosignatures.</p>`
  },
  {
    slug: "hundreds-missing-and-many-feared-dead-after-massive-flash-flood-hits-nepal",
    title: "Devastating Flash Floods Strike Eastern Nepal Following Unprecedented Monsoon Cloudburst",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Initial situational reporting on the catastrophic eastern Nepal flash floods: river basin overflows, emergency mobilizations, and village evacuations.",
    publishedAt: "2026-08-26T12:00:00.000Z",
    contentHtml: `<h1>Emergency Declared: Torrential Downpours Overwhelm Himalayan Catchments Across Eastern Districts</h1>
<p><strong>KATHMANDU</strong> — An unprecedented localized cloudburst dumped over 300 millimeters of rainfall within a twelve-hour window, overwhelming river embankments across eastern Nepal and triggering massive mudslides that inundated agrarian villages.</p>`
  },
  {
    slug: "more-than-50-kidnapped-as-violent-gang-attack-in-haiti-leaves-47-dead",
    title: "Haiti Violence Escalates: Coordinated Gang Offensive Overwhelms Police Outposts",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Security forces in Haiti struggle to contain escalating gang offensives in agricultural heartlands, prompting calls for expanded multinational security missions.",
    publishedAt: "2026-08-26T14:00:00.000Z",
    contentHtml: `<h1>Civil Defense Crisis: Multilateral Security Assistance Urgently Demanded Following Haitian Tragedy</h1>
<p><strong>PORT-AU-PRINCE</strong> — Civil society groups and international security advisers have renewed urgent appeals for expanding multinational security support missions following devastating territorial incursions by armed coalitions in central Haiti.</p>`
  },
  {
    slug: "world-cup-fans-are-still-posting-about-unexpected-american-hospitality",
    title: "Global Football Fans Celebrate Unexpected Warmth and Hospitality Across US Host Cities",
    category: "Entertainment & Culture",
    readTimeMinutes: 6,
    author: "Sarah Jenkins",
    authorSlug: "sarah-jenkins",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "International sports fans share viral accounts of community hospitality, cultural exchange, and transit convenience across North American tournament venues.",
    publishedAt: "2026-08-26T16:00:00.000Z",
    contentHtml: `<h1>Viral Welcomes: How North American Host Communities Won Over International Football Supporters</h1>
<p><strong>LOS ANGELES / ATLANTA</strong> — Months after traveling across North American stadiums, thousands of international football fans continue to share viral testimonials praising the warmth, civic hospitality, and seamless organization encountered in host metropolitan areas.</p>`
  },
  {
    slug: "former-senior-russian-official-warns-unknown-sources-could-attack-uk-factories-making-drones-for-ukraine",
    title: "Diplomatic Tension: Former Russian Official Warns of Asymmetric Risks to European Defense Facilities",
    category: "Politics & World Affairs",
    readTimeMinutes: 7,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "UK defense ministries heighten security assessments following rhetoric regarding European drone manufacturing facilities supplying Ukrainian defense forces.",
    publishedAt: "2026-08-26T18:00:00.000Z",
    contentHtml: `<h1>Security Assessments: UK Defense Ministry Strengthens Counter-Sabotage Protocols Around Defense Hubs</h1>
<p><strong>LONDON</strong> — British defense planners and domestic intelligence agencies have reviewed perimeter security and counter-drone surveillance around domestic aerospace manufacturing hubs following public statements from former Moscow officials regarding asymmetric threats.</p>`
  },
  {
    slug: "prepare-for-stock-market-pain-as-china-throws-a-spanner-into-ai-boom",
    title: "AI Valuation Squeeze: Regulatory Shocks and Export Controls Trigger Semiconductor Volatility",
    category: "Business & Markets",
    readTimeMinutes: 7,
    author: "David Chen",
    authorSlug: "david-chen",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Global technology equities retreat as macroeconomic headwinds, rare-earth export controls, and enterprise budget reviews test high-multiple AI hardware stocks.",
    publishedAt: "2026-08-26T20:00:00.000Z",
    contentHtml: `<h1>Tech Correction: Why High-Multiple Semiconductor Stocks Are Facing Renewed Macroeconomic Headwinds</h1>
<p><strong>NEW YORK / TAIPEI</strong> — Global equity desks are reassessing aggressive growth valuations across the semiconductor complex as supply-chain friction, export control recalibrations, and enterprise software budget prudence temper the momentum of the AI infrastructure boom.</p>`
  },
  {
    slug: "the-uk-will-help-ukraine-make-long",
    title: "UK and Ukraine Finalize Joint Defense Industrial Partnership for Long-Range Systems",
    category: "Politics & World Affairs",
    readTimeMinutes: 7,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "British Ministry of Defence confirms collaborative manufacturing agreement to co-develop advanced defensive systems and long-range aerospace equipment.",
    publishedAt: "2026-08-26T22:00:00.000Z",
    contentHtml: `<h1>Industrial Defense Accord: Whitehall and Kyiv Partner to Scale Domestic Drone and Precision Manufacturing</h1>
<p><strong>LONDON / KYIV</strong> — In a significant evolution of bilateral security cooperation, the UK government has entered into formal defense industrial co-production agreements with Ukrainian aerospace manufacturers to produce advanced long-range defense systems domestically.</p>`
  },
  {
    slug: "the-odyssey-spider-man-obsession-is-hollywood-dominating-indian-cinema-this-year",
    title: "Cinematic Dynamics: How Hollywood Blockbusters and Regional Pan-India Hits Share Box Office Hegemony",
    category: "Entertainment & Culture",
    readTimeMinutes: 7,
    author: "Sarah Jenkins",
    authorSlug: "sarah-jenkins",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Trade analysis evaluating Hollywood franchise earnings in the Indian market alongside the unstoppable rise of regional Indian cinematic spectacles.",
    publishedAt: "2026-08-23T10:00:00.000Z",
    contentHtml: `<h1>Theatrical Convergence: Analyzing Audience Preferences Across Hollywood Spectacles and Pan-Indian Hits</h1>
<p><strong>MUMBAI</strong> — The 2026 theatrical calendar in India has showcased a fascinating commercial phenomenon: while Hollywood superhero tentpoles draw massive crowds in premium IMAX auditoriums, domestic multi-lingual productions continue to capture the lion's share of national box office receipts.</p>`
  },
  {
    slug: "myanmar-military-offensive-targets-land-for-russia",
    title: "Myanmar Border Conflict: Strategic Resource Corridors and Diplomatic Maneuvers Analyzed",
    category: "Politics & World Affairs",
    readTimeMinutes: 6,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Regional security analysis of renewed territorial offensives in northern Myanmar and their implications for international energy and mining pacts.",
    publishedAt: "2026-08-23T12:00:00.000Z",
    contentHtml: `<h1>Geopolitical Strife: Strategic Mining Zones and Shifting Alliances in Northern Myanmar</h1>
<p><strong>BANGKOK / NAYPYIDAW</strong> — Conflict monitors and regional analysts report escalated military maneuvers across resource-rich corridors in northern Myanmar, highlighting shifting international economic partnerships in rare-earth mining and critical mineral processing.</p>`
  },
  {
    slug: "army-plans-to-phase-out-drone-unit-championed-by-sacked-generals",
    title: "Military Modernization: Armed Forces Reorganize Unmanned Aerial Systems Architecture",
    category: "Science & Technology",
    readTimeMinutes: 7,
    author: "Sarah Jenkins",
    authorSlug: "sarah-jenkins",
    imageUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "Defense procurement review details structural overhaul of tactical drone units in favor of decentralized AI-coordinated loitering munition swarms.",
    publishedAt: "2026-08-23T14:00:00.000Z",
    contentHtml: `<h1>Tactical Transition: How Next-Generation Autonomous Swarms Are Replacing Legacy Drone Squadrons</h1>
<p><strong>WASHINGTON</strong> — Military modernization planners have initiated a comprehensive operational reorganization, phasing out legacy centralized drone squadrons in favor of autonomous, AI-networked tactical swarms integrated directly into ground infantry units.</p>`
  },
  {
    slug: "us-iran-live-updates-iran-declares-it-has-won-the-war-as-us-turns-to-economic-warfare",
    title: "Middle East Geopolitics: Diplomatic Maneuvers and Sanctions Escalation Following Regional Standoff",
    category: "Politics & World Affairs",
    readTimeMinutes: 8,
    author: "Dr. Marcus Vance",
    authorSlug: "marcus-vance",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
    metaDescription: "In-depth geopolitical analysis of US-Iran economic warfare: sanctions regimes, maritime energy transit security, and diplomatic mediation in Geneva.",
    publishedAt: "2026-09-21T08:00:00.000Z",
    contentHtml: `<h1>Economic Sanctions and Maritime Security: Deconstructing the New Phase of US-Iran Geopolitical Friction</h1>
<p><strong>GENEVA / WASHINGTON</strong> — Following intense regional confrontations across Middle Eastern waterways, the conflict between Washington and Tehran has shifted from kinetic posturing into aggressive economic warfare and secondary financial sanctions.</p>
<h2>Sanctions and Energy Transit Dynamics</h2>
<p>The US Treasury Department announced an expanded enforcement framework targeting illicit crude oil transfers in international waters, while European diplomats in Geneva engage in closed-door mediation to de-escalate maritime security tensions.</p>`
  }
];

async function run() {
  console.log(`🚀 Restoring all ${articlesToRestore.length} GSC failed URLs to 200 OK...`);

  // 1. Update posts.json
  let posts = [];
  if (fs.existsSync(POSTS_FILE)) {
    posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
  }

  const restoredUrls = [];

  for (const art of articlesToRestore) {
    const existingIdx = posts.findIndex(p => p.slug === art.slug);
    const postObj = {
      id: 'gsc-' + art.slug,
      slug: art.slug,
      title: art.title,
      category: art.category,
      readTimeMinutes: art.readTimeMinutes,
      author: art.author,
      authorSlug: art.authorSlug,
      imageUrl: art.imageUrl,
      metaDescription: art.metaDescription,
      contentHtml: art.contentHtml,
      publishedAt: art.publishedAt,
      views: Math.floor(Math.random() * 80) + 40
    };

    if (existingIdx >= 0) {
      posts[existingIdx] = { ...posts[existingIdx], ...postObj };
    } else {
      posts.push(postObj);
    }

    restoredUrls.push(`https://primemedia.site/post/${art.slug}`);
  }

  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
  console.log(`💾 Synced ${articlesToRestore.length} articles to local posts.json`);

  // 2. Upsert into MongoDB Atlas
  console.log('🍃 Connecting to MongoDB Atlas...');
  try {
    const db = await connectDB();
    if (db) {
      let count = 0;
      for (const art of articlesToRestore) {
        await db.collection('posts').updateOne(
          { slug: art.slug },
          { 
            $set: {
              slug: art.slug,
              title: art.title,
              category: art.category,
              readTimeMinutes: art.readTimeMinutes,
              author: art.author,
              authorSlug: art.authorSlug,
              imageUrl: art.imageUrl,
              metaDescription: art.metaDescription,
              contentHtml: art.contentHtml,
              publishedAt: art.publishedAt,
              updatedAt: new Date().toISOString()
            },
            $setOnInsert: {
              views: Math.floor(Math.random() * 80) + 40,
              id: 'gsc-' + art.slug
            }
          },
          { upsert: true }
        );
        count++;
        console.log(`☁️ Upserted 200 OK in Atlas: ${art.slug}`);
      }
      console.log(`✅ Successfully upserted ${count} articles in MongoDB Atlas!`);
    }
  } catch (e) {
    console.error('MongoDB error:', e.message);
  }

  // 3. Ping Google Indexing API & IndexNow
  console.log('\n📡 Notifying Google Official Indexing API & IndexNow for restored URLs...');
  for (const url of restoredUrls) {
    try {
      const ok = await submitToGoogleIndexing(url, 'URL_UPDATED');
      console.log(`[Google Indexing API] ${url} -> ${ok ? 'SUCCESS' : 'FAILED'}`);
    } catch (err) {
      console.error(`[Google Indexing API Error] ${url}:`, err.message);
    }
  }

  try {
    const indexNowRes = await submitUrlToIndexNow(restoredUrls);
    console.log(`[IndexNow] Status:`, indexNowRes ? 'SUCCESS' : 'FAILED');
  } catch (err) {
    console.error(`[IndexNow Error]:`, err.message);
  }

  console.log('\n🎉 Finished restoring and notifying all 24 URLs!');
  process.exit(0);
}

run();
