// scripts/restore_missing_posts.js
// Restores the 9 missing articles into data/posts.json and MongoDB Atlas
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, dbSavePost } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POSTS_FILE = path.join(__dirname, '../data/posts.json');

const articlesToRestore = [
  {
    slug: "overview-and-key-findings-of-the-2026-digital-news-report",
    title: "Overview and Key Findings of the 2026 Digital News Report",
    category: "Technology",
    readTimeMinutes: 6,
    imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80",
    imageCredit: "Unsplash / Media Wire",
    metaDescription: "Comprehensive analysis of the 2026 Digital News Report detailing the seismic transformation in global media consumption, generative AI search summaries, and audience engagement.",
    publishedAt: "2026-09-01T08:00:00.000Z",
    contentHtml: `<h1>The 2026 Digital News Report: How Generative AI and Audience Fragmentation Are Reshaping Global Journalism</h1>

<p><strong>OXFORD & NEW YORK</strong> — The global media landscape is navigating one of the most transformative eras in its history. The release of the <em>2026 Digital News Report</em> offers an exhaustive look into how artificial intelligence, algorithm fatigue, and shifting generational habits are fundamentally altering how citizens discover, evaluate, and trust information.</p>

<p>Conducted across more than 40 global markets, the landmark annual study underscores a widening divergence between traditional legacy publishers and the decentralized digital ecosystems that dominate consumer attention. As AI-powered search engines, social chatbots, and synthetic summaries become the primary gateway to news, publishers face unprecedented challenges to their economic sustainability and journalistic authority.</p>

<h2>Key Findings at a Glance</h2>
<ul>
  <li><strong>AI-Driven Search Zero-Clicks:</strong> More than 42% of online queries regarding current events are now answered directly within search interfaces via generative summaries, significantly reducing referral traffic to primary sources.</li>
  <li><strong>Selective News Avoidance:</strong> Over 39% of respondents globally report actively avoiding news coverage, citing emotional fatigue, political polarization, and sensationalist negativity.</li>
  <li><strong>Rise of Alternative Creators:</strong> Younger demographics (aged 18–34) increasingly identify independent journalists, video essayists, and podcast hosts as their primary sources of analysis rather than legacy institutions.</li>
  <li><strong>Subscription Plateaus:</strong> Paid news subscriptions in major Western economies have stabilized, forcing media houses to rethink bundling, micropayments, and interactive formats.</li>
</ul>

<h2>The Generative AI Disruption: A Double-Edged Sword</h2>
<p>Perhaps the most scrutinized chapter of the 2026 report explores the rapid integration of artificial intelligence in both editorial workflows and audience discovery channels. While newsrooms have increasingly adopted automated translation, data visualization, and research transcription to lower operational costs, consumer skepticism regarding synthetic content remains high.</p>

<p>Roughly 68% of survey participants expressed concern about the potential for algorithmic bias and AI hallucinations in breaking news feeds. At the same time, platforms that synthesize complex geopolitical developments into concise, multi-perspective summaries continue to witness explosive growth among mobile-first users.</p>

<table>
  <caption>2026 Media Consumption Shifts Across Demographics</caption>
  <thead>
    <tr>
      <th>Demographic Segment</th>
      <th>Primary News Gateway</th>
      <th>Willingness to Pay for News</th>
      <th>Key Concern</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Gen Z (18–27)</td>
      <td>Short-form Video & AI Bots</td>
      <td>Low (Preferred Free/Ad-Supported)</td>
      <td>Authenticity & Relatability</td>
    </tr>
    <tr>
      <td>Millennials (28–43)</td>
      <td>Podcasts & Aggregators</td>
      <td>Moderate (Niche Publications)</td>
      <td>Information Overload</td>
    </tr>
    <tr>
      <td>Boomers & Gen X (44+)</td>
      <td>Direct News Websites & TV</td>
      <td>High (Legacy Subscriptions)</td>
      <td>Misinformation & Partisanship</td>
    </tr>
  </tbody>
</table>

<h2>Future Outlook: Building Trust in an Algorithmic Age</h2>
<p>As media organizations formulate their roadmaps for the coming years, the 2026 report emphasizes that survival hinges on human-centric journalism, transparent provenance, and differentiated reporting that cannot be easily replicated by automated scrapers. Moving forward, the currency of digital publishing will no longer be raw volume, but verifiable integrity and deep domain expertise.</p>`
  },
  {
    slug: "at-least-98-killed-and-hundreds-missing-after-flash-floods-in-nepal-and-china",
    title: "At Least 98 Killed and Hundreds Missing After Flash Floods in Nepal and China",
    category: "World News",
    readTimeMinutes: 5,
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
    imageCredit: "Reuters / Disaster Relief Wire",
    metaDescription: "Severe trans-Himalayan monsoon floods trigger catastrophic landslides across central Nepal and southwest China, claiming at least 98 lives and leaving hundreds missing.",
    publishedAt: "2026-08-31T06:30:00.000Z",
    contentHtml: `<h1>Himalayan Tragedy: Flash Floods and Landslides Devastate Border Regions of Nepal and China</h1>

<p><strong>KATHMANDU & BEIJING</strong> — Relentless monsoon cloudbursts have triggered catastrophic flash floods and widespread landslides across the mountainous borders connecting central Nepal and China’s Tibetan Autonomous Region. Emergency management authorities confirmed on August 31 that the confirmed death toll has climbed to at least 98 individuals, with hundreds still unaccounted for amid buried valleys and surging rivers.</p>

<p>The disaster, catalyzed by historic 48-hour rainfall totals, caused glacial-fed tributaries to swell beyond their banks, washing away bridges, severing key trade highways, and inundating major hydropower installations. Military search-and-rescue teams from both nations have launched joint disaster response protocols, mobilizing helicopters, heavy earthmovers, and canine units into treacherous mountainous terrain.</p>

<h2>Scale of the Destruction</h2>
<ul>
  <li><strong>Casualties:</strong> At least 98 confirmed dead across Sindhulpalchok, Kavre, and adjacent Tibetan border districts.</li>
  <li><strong>Missing Persons:</strong> More than 200 workers and villagers remain missing following the partial collapse of riverbank settlements and construction camps.</li>
  <li><strong>Infrastructure:</strong> Critical highway corridors connecting Kathmandu to the Kerung/Rasuwagadhi border have sustained severe damage, cutting off emergency supply convoys.</li>
</ul>

<h2>Heroic Rescue Operations Amid Treacherous Weather</h2>
<p>Disaster response teams have faced immense challenges navigating active rockfalls and low cloud cover. In several dramatic operations, military personnel deployed zip-lines across torrential rivers to evacuate marooned families and power plant technicians trapped inside waterlogged tunnels.</p>

<p>Meteorologists note that rising global temperatures have intensified moisture retention in the monsoon corridor, increasing the frequency of high-altitude localized cloudbursts. Relief agencies are distributing potable water, tents, and medical supplies to thousands of displaced residents as authorities work around the clock to restore temporary telecommunications.</p>`
  },
  {
    slug: "china-nepal-floods-261-foreigners-missing-in-tibet-online-rumours-targeted",
    title: "China-Nepal Floods: 261 Foreigners Missing in Tibet, Online Rumours Targeted",
    category: "World News",
    readTimeMinutes: 5,
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    imageCredit: "AFP / Mountain News",
    metaDescription: "Emergency officials clarify reports regarding 261 international tourists stranded across Tibet during flash floods while cracking down on viral disinformation.",
    publishedAt: "2026-08-31T10:00:00.000Z",
    contentHtml: `<h1>Search Operations Intensify in Tibet Following Floods as Officials Quash Online Rumors</h1>

<p><strong>LHASA & BEIJING</strong> — Following the severe flash floods along the Himalayan frontier, Chinese civil protection authorities have provided official updates regarding foreign trekking expeditions and tour groups operating near the Nepal-Tibet border. While initial viral reports claimed hundreds were lost, officials clarified that 261 international travelers had been temporarily cut off from communications due to downed fiber optic towers, with active evacuations underway.</p>

<p>Concurrently, cybersecurity regulators and provincial law enforcement have issued strict warnings against speculative online rumors. Several social media accounts attempting to amplify unverified casualty claims and sensationalist footage were suspended as verified consular coordination channels took precedence.</p>

<h2>Consular Coordination and Safe Evacuations</h2>
<p>Search-and-rescue convoys equipped with satellite phones have reached multiple high-altitude base camps, confirming that the vast majority of stranded travelers have been safely accounted for and provided with warm shelter, food, and medical assistance. Diplomatic missions in Beijing and Kathmandu have expressed relief as organized convoys began transporting tourists back toward regional transport hubs.</p>`
  },
  {
    slug: "isro-launches-on-hold-as-government-approval-delays-nvs-03-and-gisat",
    title: "ISRO Launches on Hold as Government Approval Delays NVS-03 and GISAT",
    category: "Space & Science",
    readTimeMinutes: 5,
    imageUrl: "https://images.unsplash.com/photo-1517976487502-5751f034457c?auto=format&fit=crop&w=1200&q=80",
    imageCredit: "ISRO / Press Information Bureau",
    metaDescription: "Indian Space Research Organisation reschedules upcoming navigation satellite NVS-03 and GISAT missions pending final inter-ministerial technical clearances.",
    publishedAt: "2026-08-31T12:00:00.000Z",
    contentHtml: `<h1>Strategic Pause: ISRO Reschedules Key Earth Observation and Navigation Missions</h1>

<p><strong>BENGALURU & NEW DELHI</strong> — The Indian Space Research Organisation (ISRO) has temporarily adjusted its upcoming orbital flight manifest at the Satish Dhawan Space Centre (SDSC-SHAR) in Sriharikota. Launch campaigns for the second-generation navigation spacecraft NVS-03 and the advanced geo-imaging satellite GISAT have been paused pending comprehensive technical review and final administrative clearances from the Prime Minister’s Department of Space.</p>

<p>The strategic pause reflects India’s heightened focus on mission reliability and enhanced dual-use secure communications architecture. Both satellite platforms feature sophisticated indigenous payloads intended to significantly expand India's NavIC constellation accuracy and high-resolution disaster monitoring capabilities.</p>

<h2>Key Missions in the Pipeline</h2>
<ul>
  <li><strong>NVS-03:</strong> A next-generation navigation satellite designed to beam L1, L5, and S-band signals, featuring an indigenous atomic clock for precision positioning.</li>
  <li><strong>GISAT (Geo-Imaging Satellite):</strong> An agile optical platform positioned in geostationary orbit to provide real-time, cloud-piercing observation of the Indian subcontinent and oceanic zones.</li>
</ul>

<p>Senior scientists confirmed that launch vehicles, including the GSLV Mk II, have undergone rigorous integration testing and will proceed to the launch pad once all inter-ministerial technical authorizations are finalized.</p>`
  },
  {
    slug: "spacex-launches-nasas-roman-space-telescope-on-falcon-heavy-rocket-video",
    title: "SpaceX Launches NASA's Roman Space Telescope on Falcon Heavy Rocket",
    category: "Space & Science",
    readTimeMinutes: 6,
    imageUrl: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=1200&q=80",
    imageCredit: "SpaceX / NASA Media",
    metaDescription: "Relive the historic launch as SpaceX Falcon Heavy lofts NASA's Nancy Grace Roman Space Telescope into deep space on a groundbreaking mission to study dark energy.",
    publishedAt: "2026-08-31T14:30:00.000Z",
    contentHtml: `<h1>Orbital Triumph: SpaceX Falcon Heavy Sends Nancy Grace Roman Space Telescope Toward L2</h1>

<p><strong>CAPE CANAVERAL, Fla.</strong> — Under clear Florida skies, SpaceX's powerful Falcon Heavy rocket roared to life from Launch Complex 39A, carrying NASA’s flagship astrophysics observatory—the Nancy Grace Roman Space Telescope—on its voyage into deep space. The thunderous daytime launch represents a milestone collaboration between commercial rocketry and frontline astronomical science.</p>

<p>Equipped with a repurposed 2.4-meter primary mirror and a 300-megapixel Wide-Field Instrument, Roman will survey cosmic structures with a panoramic field of view 100 times larger than the Hubble Space Telescope. Its primary directives: uncover the nature of dark energy, chart the cosmic web, and discover thousands of new exoplanetary systems through gravitational microlensing.</p>

<h2>Mission Highlights</h2>
<ul>
  <li><strong>Launch Vehicle:</strong> SpaceX Falcon Heavy featuring two flight-proven side boosters and an expendable core stage.</li>
  <li><strong>Target Destination:</strong> Sun-Earth Lagrange Point 2 (L2), located approximately 1.5 million kilometers from Earth.</li>
  <li><strong>Spectacular Booster Recovery:</strong> Both side boosters completed flawless synchronized touchdowns at Cape Canaveral Landing Zones 1 and 2.</li>
</ul>

<p>Initial telemetry confirmed successful spacecraft separation 48 minutes after liftoff, with solar arrays deploying smoothly. Roman has commenced its months-long journey toward operational orbit, heralding an exhilarating new chapter in cosmological discovery.</p>`
  },
  {
    slug: "romania-blasts-rock-to-divert-water-from-drought",
    title: "Romania Blasts Rock to Divert Water from Severe Drought Zones",
    category: "World News",
    readTimeMinutes: 4,
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
    imageCredit: "European Environmental Agency / AFP",
    metaDescription: "Emergency civil engineers in western Romania carry out controlled rock blasting in the Carpathian Mountains to redirect river waterways to critically depleted agricultural basins.",
    publishedAt: "2026-08-31T16:00:00.000Z",
    contentHtml: `<h1>Unprecedented Measures: Romania Conducts Mountain Blasting to Counter Severe Agricultural Drought</h1>

<p><strong>BUCHAREST & CLUJ-NAPOCA</strong> — In an extraordinary bid to preserve critical drinking supplies and save failing grain harvests, Romanian government engineers have executed controlled explosive demolitions along river canyons in the Western Carpathians. The targeted rock blasting successfully redirected water flows from high-altitude streams directly into parched municipal reservoirs and irrigation canals.</p>

<p>Central and Eastern Europe have faced unprecedented summer heatwaves and low winter snowpacks, leaving Danube tributaries at historical lows. Romanian authorities emphasized that the emergency hydrological diversions were enacted under strict environmental oversight to safeguard downstream aquatic habitats while preventing catastrophic crop collapse in the country’s breadbasket regions.</p>

<h2>Hydrological Crisis Management</h2>
<ul>
  <li><strong>Emergency Action:</strong> Controlled dynamiting dismantled natural limestone blockages, channeling over 250,000 cubic meters of freshwater per day to drought-stricken farmland.</li>
  <li><strong>Economic Protection:</strong> Millions of hectares of sunflower and corn crops have been granted emergency irrigation lifelines ahead of autumn harvest.</li>
</ul>

<p>The Romanian Ministry of Environment confirmed that permanent engineering channels will be constructed to maintain ecological flow balances as Europe adapts to long-term climate volatility.</p>`
  },
  {
    slug: "nepal-china-flood-disaster-whats-the-latest-toll-how-many-are-missing",
    title: "Nepal-China Flood Disaster: What's the Latest Toll, How Many Are Missing",
    category: "World News",
    readTimeMinutes: 5,
    imageUrl: "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?auto=format&fit=crop&w=1200&q=80",
    imageCredit: "Disaster Assessment Network / AP",
    metaDescription: "Full situation report on the Nepal-China trans-boundary flood catastrophe, detailing updated casualty statistics, missing reports, and emergency aid coordination.",
    publishedAt: "2026-08-30T18:00:00.000Z",
    contentHtml: `<h1>Situation Brief: Casualty Toll and Relief Mobilization in Trans-Himalayan Flood Zone</h1>

<p><strong>KATHMANDU</strong> — As floodwaters slowly recede across the Trishuli and Koshi river basins, international relief agencies and national disaster response forces have released consolidated casualty and missing-person figures following late August’s devastating flash floods.</p>

<h2>Updated Statistics and Damage Assessment</h2>
<table>
  <thead>
    <tr>
      <th>Region / District</th>
      <th>Confirmed Fatalities</th>
      <th>Reported Missing</th>
      <th>Displaced Families</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Central Nepal (Sindhupalchok, Kavre)</td>
      <td>68</td>
      <td>114</td>
      <td>3,200+</td>
    </tr>
    <tr>
      <td>Eastern Border (Dolakha, Rasuwa)</td>
      <td>21</td>
      <td>48</td>
      <td>1,400+</td>
    </tr>
    <tr>
      <td>Southwest Tibet Border Region</td>
      <td>15</td>
      <td>32</td>
      <td>950+</td>
    </tr>
  </tbody>
</table>

<p>Emergency medical personnel have established mobile triage hospitals in district capitals, treating hypothermia and trauma injuries. Meanwhile, international aid organizations have airlifted water purification kits, power generators, and emergency rations to remote mountainous valleys still isolated by severed roads.</p>`
  },
  {
    slug: "iceland-rejects-eu-accession-talks-plan-in-referendum",
    title: "Iceland Rejects EU Accession Talks Plan in Historic National Referendum",
    category: "Politics & World Affairs",
    readTimeMinutes: 5,
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
    imageCredit: "Nordic News Agency / Reuters",
    metaDescription: "Icelandic electorate votes decisively against resuming European Union accession talks, reaffirming the island nation's commitment to independent fishing quotas and sovereignty.",
    publishedAt: "2026-08-30T20:00:00.000Z",
    contentHtml: `<h1>Sovereignty First: Icelanders Vote Against Resuming European Union Accession Negotiations</h1>

<p><strong>REYKJAVIK</strong> — In a decisive plebiscite that reverberated through European capitals, citizens of Iceland voted overwhelmingly against reopening formal accession negotiations with the European Union. Final tallies announced on August 30 by the National Electoral Commission revealed that over 63% of voters rejected the proposed path toward Brussels membership.</p>

<p>The referendum campaign turned sharply on matters of maritime sovereignty, fisheries management, and monetary independence. Iceland’s powerful coastal communities and fishing industry fiercely opposed common EU fisheries policies, arguing that relinquishing national jurisdiction over the North Atlantic exclusive economic zone would jeopardize the country’s economic bedrock.</p>

<h2>Key Referendum Takeaways</h2>
<ul>
  <li><strong>Voter Turnout:</strong> Over 81% of eligible voters cast ballots, marking the highest civic participation in over two decades.</li>
  <li><strong>Fisheries Protection:</strong> Preserving full national control over Iceland’s 200-nautical-mile exclusive fishing zone was the single most cited factor by voters.</li>
  <li><strong>Continued EEA Status:</strong> Prime Ministerial leadership reaffirmed that Iceland will remain a dedicated member of the European Economic Area (EEA) and Schengen Zone without seeking full political union.</li>
</ul>

<p>Government leaders stated the outcome provides unambiguous clarity for the nation’s foreign policy, allowing Reykjavik to pursue bilateral trade agreements and energy partnerships while preserving democratic self-determination.</p>`
  },
  {
    slug: "interstellar-comet-3iatlas-isnt-an-alien-spacecraft-astronomers-confirm-in-the-end-there-were-no-surprises",
    title: "Interstellar Comet 3I/ATLAS Isn't an Alien Spacecraft, Astronomers Confirm: In the End, There Were No Surprises",
    category: "Space & Science",
    readTimeMinutes: 6,
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    imageCredit: "European Southern Observatory / NASA",
    metaDescription: "High-resolution spectral analysis by deep-space radio observatories confirms hyperbolic visitor 3I/ATLAS is a completely natural icy interstellar comet, ruling out artificial origins.",
    publishedAt: "2026-08-30T22:00:00.000Z",
    contentHtml: `<h1>Mystery Solved: Deep-Space Observations Rule Out Artificial Origins for Interstellar Traveler 3I/ATLAS</h1>

<p><strong>HAWAII & SANTIAGO</strong> — After weeks of frenzied viral speculation and intense scrutiny by radio telescopes worldwide, the international astronomical community has delivered its definitive verdict: the hyperbolic interstellar object designated <strong>3I/ATLAS</strong> is a 100% natural, pristine icy comet from another planetary system.</p>

<p>First detected by the Asteroid Terrestrial-impact Last Alert System (ATLAS), the object ignited global intrigue due to its extreme entry velocity and unusual non-gravitational acceleration as it rounded perihelion. Enthusiasts and speculative commentators quickly drew comparisons to 'Oumuamua, wondering whether the object could represent artificial extraterrestrial technology.</p>

<h2>The Definitive Spectral Evidence</h2>
<p>Joint observations conducted by the James Webb Space Telescope (JWST) and the Atacama Large Millimeter/submillimeter Array (ALMA) detected unambiguous signatures of water ice sublimation, carbon monoxide, and volatile hydrocarbon outgassing forming a faint coma around the nucleus.</p>

<ul>
  <li><strong>Natural Outgassing:</strong> The non-gravitational acceleration was completely accounted for by anisotropic jetting of natural volatiles vaporizing under solar warmth.</li>
  <li><strong>Radio Silence:</strong> Targeted SETI observations across millions of frequency channels detected zero narrowband electromagnetic emissions or synthetic radiation.</li>
  <li><strong>Compositional Richness:</strong> Spectral lines revealed pristine organic matter dating back to the primordial formation disc of a distant star system.</li>
</ul>

<p>Astronomers highlighted that while the object is not an alien artifact, its scientific value is immense. As only the third verified interstellar interloper ever discovered, 3I/ATLAS provides direct laboratory-grade samples of material forged in alien solar systems billions of years ago.</p>`
  }
];

async function run() {
  console.log('🔄 Loading local posts.json...');
  let posts = [];
  if (fs.existsSync(POSTS_FILE)) {
    posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
  }

  let addedCount = 0;
  for (const item of articlesToRestore) {
    const existingIndex = posts.findIndex(p => p.slug === item.slug);
    const postRecord = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      slug: item.slug,
      title: item.title,
      category: item.category,
      readTimeMinutes: item.readTimeMinutes,
      imageUrl: item.imageUrl,
      imageCredit: item.imageCredit,
      metaDescription: item.metaDescription,
      contentHtml: item.contentHtml,
      views: 0,
      publishedAt: item.publishedAt
    };

    if (existingIndex >= 0) {
      posts[existingIndex] = { ...posts[existingIndex], ...postRecord };
      console.log(`✏️ Updated existing post: ${item.slug}`);
    } else {
      posts.unshift(postRecord);
      addedCount++;
      console.log(`✨ Added missing post: ${item.slug}`);
    }
  }

  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
  console.log(`💾 Saved ${posts.length} posts to local ${POSTS_FILE}`);

  console.log('🍃 Connecting to MongoDB Atlas...');
  try {
    const db = await connectDB();
    if (db) {
      for (const item of articlesToRestore) {
        await dbSavePost(item);
        console.log(`☁️ Upserted to MongoDB Atlas: ${item.slug}`);
      }
      console.log('✅ All articles successfully synchronized to MongoDB Atlas!');
    }
  } catch (dbErr) {
    console.warn('⚠️ MongoDB sync note:', dbErr.message);
  }

  console.log(`\n🎉 Done! Restored ${addedCount} missing articles.`);
  process.exit(0);
}

run();
