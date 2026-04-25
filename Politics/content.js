/* =========================================================
   pol-ua 500 — exam #2 data
   CARDS (31) · ESSAYS (10)
   ========================================================= */

const CARDS = [
  { term:"Sincere Voting", cat:"Voting & Participation", def:"Casting your ballot for your true first-choice candidate, without considering who else is likely to win.", hint:"Opposite of strategic voting — no 'lesser evil' calculation." },
  { term:"Median Voter Theorem", cat:"Voting & Participation", def:"In a two-candidate majority-rule election with voters ranked on a single policy dimension, both candidates have an incentive to move their platform toward the voter in the exact middle of the distribution.", hint:"Both parties converge to the center — explains why platforms often look alike." },
  { term:"Strategic Voting", cat:"Voting & Participation", def:"Switching from your genuinely preferred candidate/party to vote instead for one that has a realistic chance of winning (or for a different party in order to moderate policy). In races with district magnitude = 1, this produces convergence around the top two candidates.", hint:"Strongest in majoritarian/FPTP systems; weak under proportional representation." },
  { term:"Vote Buying", cat:"Voting & Participation", def:"Exchanging material goods, money, or favors for votes; a form of electoral clientelism.", hint:"Undermines electoral integrity; studied via turnout anomalies." },
  { term:"Credible Exit Option", cat:"Voting & Participation", def:"The ability to genuinely leave a political relationship, giving citizens real leverage over the state.", hint:"Exit is credible only if leaving is actually feasible." },
  { term:"Voice (Hirschman)", cat:"Voting & Participation", def:"Using speech, protest, or political action to change an organization from within. Most forms of political participation — voting, signing petitions, calling representatives, boycotts, donations, demonstrations, attending council meetings — are forms of exerting voice.", hint:"Hirschman originally wrote about consumers facing declining product quality. Voice is chosen when exit is too costly or loyalty is high." },
  { term:"Loyalty (Hirschman)", cat:"Voting & Participation", def:"Staying attached to an organization or state despite dissatisfaction, usually out of emotional ties or hope things will improve.", hint:"Loyalty suppresses both exit and voice." },
  { term:"Collective Action Problem", cat:"Voting & Participation", def:"Individually rational behavior (free-riding) leads to a collectively suboptimal outcome — e.g., no one votes because each vote seems not to matter. Arises in participation (protests, petitions, donations, lobbying, voting) because the resulting good is typically a public good claimed from the state.", hint:"Public goods are non-excludable — you get them whether you participated or not, which invites free-riding." },
  { term:"Selective Incentives", cat:"Voting & Participation", def:"Private benefits given only to those who participate, used to overcome the collective action problem.", hint:"Olson's solution: make participation individually worthwhile." },
  { term:"Public Good", cat:"Voting & Participation", def:"A non-excludable and non-rival benefit — everyone benefits regardless of contribution.", hint:"Public goods create free-rider problems → collective action dilemma." },
  { term:"Ethnicity (Chandra 2006)", cat:"Ethnicity & Identity", def:"\"A subset of social identity categories for which eligibility is associated with (or believed to be associated with) descent.\" Examples (context-dependent): language, tribe, race, region, religion. Excludes identities siblings would not be expected to share (e.g., gender, sexual orientation).", hint:"Key: descent-based (or believed to be). Not freely chosen. Distinct from other social identities." },
  { term:"Ethnic Fractionalization", cat:"Ethnicity & Identity", def:"The probability that two randomly chosen people from a population belong to different ethnic groups. Scores range from near 0 (homogeneous) to near 1 (many small groups).", hint:"Does NOT capture inequality between groups — distinct from polarization." },
  { term:"Primordialism", cat:"Ethnicity & Identity", def:"The view that ethnic identities are ancient, fixed, and emotionally deep-rooted — treated as natural or inherited traits.", hint:"Criticized: ignores how identities shift historically." },
  { term:"Instrumentalism", cat:"Ethnicity & Identity", def:"View that ethnic identities are tools — elites manipulate them to mobilize voters and gain power.", hint:"Ethnicity as strategy, not essence." },
  { term:"Constructivism", cat:"Ethnicity & Identity", def:"View that ethnic identities are socially constructed and historically contingent — real but malleable.", hint:"Dominant modern view: identities are built, not given, but powerful once built." },
  { term:"Party Identification", cat:"Parties & Systems", def:"A voter's subjective alignment of themselves with a particular political party. Measured on surveys by questions like: \"Generally speaking, do you usually think of yourself as a Republican, a Democrat, an Independent, or what?\" with follow-ups on strength of attachment or which party an independent leans toward.", hint:"Distinct from 'who you voted for'. Scholars disagree: rational running tally (Fiorina) vs. group/social identity (Green et al.)." },
  { term:"Running Tally (Fiorina)", cat:"Parties & Systems", def:"Fiorina's view: party attachment is an ongoing retrospective summary of how each party has performed over time. Voters update it based on outcomes, so it is rational and revisable.", hint:"Partisanship is rational — you update based on what parties actually do." },
  { term:"Partisan Identity (Green, Palmquist & Schickler)", cat:"Parties & Systems", def:"The view that attachment to a party works like a team or group membership — emotional and stable, resistant even when the party changes its positions.", hint:"Explains why people don't switch parties even when their party underperforms." },
  { term:"Political Party", cat:"Parties & Systems", def:"An organization that competes in elections with the goal of placing its candidates in government office.", hint:"Distinguished from interest groups, which don't run candidates." },
  { term:"Nonpartisan System", cat:"Parties & Systems", def:"A political system (often a democracy) with no official political parties. Candidates run as individuals rather than under a party label.", hint:"Rare at the national level; more common at local/municipal level or in some small states." },
  { term:"One-Party System", cat:"Parties & Systems", def:"A system in which only one political party is legally allowed to hold power. Opposition parties are banned.", hint:"E.g., China (CCP), Soviet-era USSR, North Korea." },
  { term:"Single-Party Dominant System", cat:"Parties & Systems", def:"A system in which multiple parties may legally compete, but only one particular party has a realistic chance of gaining power across electoral cycles.", hint:"E.g., Japan (LDP), South Africa (ANC), Mexico (PRI historically), Sweden (Social Democrats historically)." },
  { term:"Two-Party System", cat:"Parties & Systems", def:"A system in which only two major political parties have a realistic chance of holding power.", hint:"E.g., USA. Often a product of FPTP electoral rules + Duverger's Law." },
  { term:"Multi-Party System", cat:"Parties & Systems", def:"A system in which more than two parties have a realistic chance of holding power.", hint:"E.g., Germany, Netherlands, Israel. Common under proportional representation." },
  { term:"Effective Number of Parties (ENP)", cat:"Parties & Systems", def:"A measure that captures both the number AND the support of parties in a country, weighting larger parties more heavily than smaller ones. Formula: 1 ÷ Σ(each party's vote share²).", hint:"10 tiny parties ≠ 10-party system. A country with two 50% parties has ENP = 2; a country with one 80% and one 20% party has ENP ≈ 1.47." },
  { term:"Reinforcing Cleavages", cat:"Parties & Systems", def:"Multiple social divisions (class, religion, ethnicity) line up — the same people are on the same side on every issue.", hint:"Creates strong, stable, polarized parties — but more conflict." },
  { term:"Cross-Cutting Cleavages", cat:"Parties & Systems", def:"Social divisions cut across each other — a person may be working-class AND religiously conservative AND an ethnic minority.", hint:"Moderate political conflict; people have cross-pressured loyalties." },
  { term:"Duverger's Law", cat:"Parties & Systems", def:"FPTP / majoritarian systems (district magnitude = 1) tend to produce two-party systems; proportional representation tends to allow multi-party systems. Majoritarian systems favor larger, geographically concentrated parties; PR allows smaller, geographically diffuse parties.", hint:"Mechanism: strategic voting + party entry decisions under FPTP squeeze out third parties." },
  { term:"Party System Institutionalization", cat:"Parties & Systems", def:"The degree to which a party system is stable, rooted in society, and follows predictable rules of competition.", hint:"Mainwaring & Scully: 4 dimensions — volatility, societal roots, legitimacy, organization." },
  { term:"Electoral Volatility", cat:"Parties & Systems", def:"The aggregate shift in vote shares between parties across elections. High volatility = unstable party system.", hint:"Pedersen Index = sum of absolute vote share changes ÷ 2." },
  { term:"Electoral Integrity", cat:"Parties & Systems", def:"The extent to which elections conform to international norms: free, fair, transparent, competitive, free from fraud/violence.", hint:"Measured via expert surveys, forensic stats, observed anomalies." },
];

const ESSAYS = [
  { q:"Under what conditions might a citizen use Voice vs. Exit vs. Loyalty?", hint:"Voice: when exit is costly, loyalty is moderate, voice feels effective.\nExit: when alternatives exist, cost of leaving is low, voice seems futile.\nLoyalty: when attachment is high, exit isn't feasible, hope remains.\nKey driver: credibility of the exit option." },
  { q:"What is the collective action dilemma? Why does it predict low individual participation?", hint:"Each individual's contribution is too small to matter alone → rational to free-ride.\nBut if everyone free-rides → collective good (political change) is not provided.\nSolution: selective incentives, social pressure, expressive benefits." },
  { q:"Why do people bother to vote at all?", hint:"1. Civic duty / expressive voting\n2. Social pressure / norms\n3. Selective incentives (party mobilization)\n4. Close elections raise perceived impact\n5. Low cost of voting (habits, proximity)\n6. Partisan identity drives turnout" },
  { q:"Why is SES often positively correlated with political participation?", hint:"Higher SES → more resources (time, money, civic skills), more political information, more policy stakes, more party mobilization." },
  { q:"Under what conditions might SES NOT be positively correlated with participation?", hint:"Authoritarian contexts: poor mobilized by clientelism or fear.\nStrong ethnic/communal mobilization: identity overrides class.\nExtreme grievance: high-intensity movements mobilize low-SES groups.\nInverse: wealthy exit (private solutions) rather than engage politically." },
  { q:"What does ethnic diversity suggest for democratic politics?", hint:"Not deterministic. Problems arise IF: reinforcing cleavages, ethnicity is politicized, weak institutions.\nLess damaging when: cross-cutting cleavages, constructivist fluidity, strong party systems.\nEthnic fractionalization alone doesn't predict democratic breakdown." },
  { q:"What evidence suggests partisanship is a social identity rather than a rational running tally?", hint:"Stability across dramatic party policy shifts.\nAffective polarization beyond policy disagreement.\nParty preference precedes policy views (not the reverse).\nIntermarriage preferences, social sorting by party." },
  { q:"Why do some countries have more parties than others?", hint:"1. Electoral system: PR → more parties (Duverger's Law)\n2. Social cleavages: more distinct groups → more parties\n3. Low legal thresholds\n4. Federalism: regional parties viable\n5. Historical path dependence" },
  { q:"How would you assess whether a country has high party system institutionalization?", hint:"1. Low electoral volatility (stable vote shares)\n2. Parties have roots in society (not just leader vehicles)\n3. Parties seen as legitimate actors\n4. Parties have strong internal organizations\n(Mainwaring & Scully's 4 dimensions)" },
  { q:"Why is electoral fraud difficult to measure?", hint:"It's hidden by definition. Methods: expert surveys (PEI), digit-based forensics (Benford's Law), turnout anomalies, precinct-level outliers, satellite imagery, observer reports.\nLimitation: forensic stats produce false positives; surveys are subjective." },
];

/* ---------------------------------------------------------
   CHEATSHEET — structured walk-through of every concept on the
   study guide. Each entry has a definition, the *underlying
   mechanism* (what it means / why it matters), how to apply it
   on the exam, and (where useful) the common trap to watch.
   The shape mirrors how the study guide groups material so a
   reader can scan top-to-bottom and have answers ready for the
   "Questions to grapple with" section.
   --------------------------------------------------------- */
const CHEATSHEET = [

  /* ============= 1. EXIT / VOICE / LOYALTY ============= */
  { kind:"section", title:"1 · Exit, Voice & Loyalty (Hirschman)",
    intro:"Hirschman's framework for what a citizen does when she's unhappy with the state. The whole framework hinges on which channel is cheapest and most credible." },

  { kind:"term", term:"Credible Exit Option",
    def:"The genuine, low-cost ability to leave a political relationship — by emigrating, switching jurisdictions, or moving capital abroad.",
    means:"Exit is leverage. The state has to listen to you only as much as it fears losing you. If you can't actually leave, the state can ignore your complaints.",
    apply:"On any 'will the citizen exit / voice / stay loyal' question, FIRST ask: is exit credible? If borders are closed, assets are frozen, or there's no alternative jurisdiction, exit is OFF the table and voice or loyalty is the answer.",
    watch:"Credible ≠ legal. North Koreans can technically flee but at huge personal cost — exit is not credible. Wealthy elites with offshore accounts have very credible exit even where exit is officially banned." },

  { kind:"term", term:"Voice",
    def:"Trying to change a state from within — voting, protesting, signing petitions, calling representatives, donating, attending council meetings, boycotts, demonstrations.",
    means:"Voice is the costly-but-collective channel. It only works when enough people exercise it AND the regime is responsive enough to listen.",
    apply:"Voice is the predicted response when (a) exit is blocked or expensive AND (b) loyalty is moderate-to-high so the citizen still wants the state to improve. Most observed political participation is a form of voice.",
    watch:"Don't confuse voice with loyalty. Voice = active complaint. Loyalty = silent attachment despite dissatisfaction." },

  { kind:"term", term:"Loyalty",
    def:"Continued attachment to a state or organization despite dissatisfaction — usually from emotional ties, identity, or hope that things will improve.",
    means:"Loyalty suppresses BOTH exit and voice. It is the 'quiet acceptance' option.",
    apply:"Predicted when attachment is very high, exit is impossible, and voice feels futile. A loyal citizen disengages politically — silence, not protest, is the signature.",
    watch:"Loyalty can co-exist with voice (loyal opposition) but at high enough loyalty it dampens action altogether." },

  /* ============= 2. VOTING CALCULUS ============= */
  { kind:"section", title:"2 · How citizens vote (and why platforms converge)",
    intro:"These four concepts explain who votes for whom and why party platforms often look indistinguishable in two-party systems." },

  { kind:"term", term:"Spatial / Sincere Voting",
    def:"Casting a ballot for your true first-choice candidate without considering who is likely to win.",
    means:"It's the baseline — what voters do when there's no strategic pressure. PR systems with low thresholds approximate sincere voting.",
    apply:"If asked which voting type dominates under PR with proportional seat allocation: sincere. Under FPTP with one seat per district: usually NOT sincere — see strategic voting.",
    watch:"'Spatial' refers to the ideological-distance model: voters pick the candidate closest to them on a left-right line. 'Sincere' is the action that follows from it absent strategy." },

  { kind:"term", term:"Median Voter Theorem",
    def:"In a two-candidate, majority-rule election where voters lie on a single policy dimension, both candidates have an incentive to position themselves at the preferences of the median voter.",
    means:"Whoever owns the median wins. Movement away from the median loses you more votes than it gains.",
    apply:"Use this to explain why two-party platforms converge to the center. Required assumptions: single-dimension issue space, two candidates, majority rule, full voter turnout, no abstention, single-peaked preferences.",
    watch:"Breaks down when (a) more than two candidates, (b) multidimensional issues, (c) low turnout that lets ideologues dominate primaries, (d) voter abstention from extreme platforms." },

  { kind:"term", term:"Strategic Voting",
    def:"Switching from your sincere first choice to a candidate with a realistic shot at winning, to avoid 'wasting' your vote.",
    means:"Mechanism behind Duverger's Law: when the system rewards only the top finisher (district magnitude = 1, FPTP), voters abandon hopeless third parties → support concentrates around top two.",
    apply:"Strongest under FPTP / majoritarian rules. Weak under PR. Cite this when explaining why FPTP systems trend toward two parties.",
    watch:"Strategic voting can ALSO mean voting for a moderate party to balance an extreme one — the unifying definition is 'voting against your sincere preference for an instrumental reason.'" },

  { kind:"term", term:"Vote Buying",
    def:"Exchanging cash, goods, jobs, or favors for a vote (or for turnout itself). A form of electoral clientelism.",
    means:"Direct violation of electoral integrity — turns the vote from a public good (selecting representation) into a private transaction.",
    apply:"On 'why might SES NOT predict participation?' questions, vote-buying is a key answer: clientelist machines mobilize POOR voters preferentially because their vote is cheaper to buy.",
    watch:"Hard to detect directly. Researchers infer it from turnout anomalies, expert surveys, or precinct-level outliers (rich precincts and poor precincts behaving very differently)." },

  /* ============= 3. COLLECTIVE ACTION ============= */
  { kind:"section", title:"3 · Collective action — the paradox of voting",
    intro:"The single most-tested cluster on Exam 2. The paradox: rational individuals shouldn't bother participating, but billions do. The resolution explains everything from why people protest to why interest groups form." },

  { kind:"term", term:"Public Good",
    def:"A benefit that is both non-excludable (you can't keep non-contributors from enjoying it) and non-rival (one person's enjoyment doesn't reduce another's). Examples: clean air, national defense, the policy outputs of an elected government.",
    means:"Non-excludability creates the free-rider incentive: why pay if you'll get the benefit anyway?",
    apply:"Define this BEFORE the collective action problem on any essay — public goods are the precondition that makes collective action a dilemma.",
    watch:"Most political outcomes are public goods (a winning candidate's policies apply to everyone in the jurisdiction), which is why participation is rational only with extra incentives." },

  { kind:"term", term:"Collective Action Problem",
    def:"Individually rational behavior — free-riding — produces a collectively suboptimal outcome. Each person's contribution is small enough that not contributing is locally rational, but if everyone reasons that way, the public good is undersupplied.",
    means:"Olson's logic: in a large group, your individual probability of being decisive ≈ 0. Cost of acting > expected benefit. Rational actors abstain. Public good fails.",
    apply:"Use it to explain why predicted voter turnout under purely rational-choice assumptions is near zero. Then layer in the four resolutions (selective incentives, civic duty, social pressure, identity) to explain observed turnout.",
    watch:"The problem is NOT that people don't WANT the good; everyone wants it. The problem is structural: the incentive to free-ride is built into the public-good payoff." },

  { kind:"term", term:"Selective Incentives",
    def:"Private rewards or punishments given ONLY to those who participate — paid staff jobs in a campaign, member-only newsletters, social shaming for non-voters, union benefits restricted to dues-payers.",
    means:"Olson's solution to the collective action problem: convert a public-good payoff into a partial private-good payoff. Now contributing has a non-zero individual return.",
    apply:"On 'why do people vote anyway?' essay: selective incentives is one of the four standard answers (alongside civic duty, social pressure, partisan identity). Cite specific examples — get-out-the-vote drives, candidate yard signs, social media badges.",
    watch:"Selective incentives need not be material. Social belonging, esteem, and 'I voted' stickers are all selective incentives — anything restricted to participants." },

  /* ============= 4. SES & PARTICIPATION ============= */
  { kind:"section", title:"4 · Why SES correlates with participation (and when it doesn't)",
    intro:"Not its own term but a recurring exam question. Build the answer from resources, mobilization, and clientelism." },

  { kind:"term", term:"SES → Participation (positive direction)",
    def:"Higher socioeconomic status is empirically associated with higher rates of voting, protesting, donating, contacting officials.",
    means:"Three drivers: (1) RESOURCES — time, money, civic skills; (2) INFORMATION — the educated have lower information costs; (3) MOBILIZATION — parties target high-propensity voters, who tend to be high-SES, creating a feedback loop.",
    apply:"This is the textbook answer for the Verba/Schlozman/Brady framework. Always name all three drivers, not just 'rich people have more time.'",
    watch:"Don't overstate it. The correlation is robust in consolidated democracies; it weakens or reverses elsewhere — see next entry." },

  { kind:"term", term:"When SES → Participation breaks down",
    def:"Conditions that flatten or invert the SES-participation relationship.",
    means:"Three classic conditions: (a) CLIENTELISM — vote-buying machines mobilize the poor first; (b) ETHNIC/COMMUNAL MOBILIZATION — identity overrides class so poor co-ethnics turn out at high rates; (c) EXTREME GRIEVANCE — high-intensity protest movements draw from the deprived.",
    apply:"This is a classic 'under what conditions' question. Pick ONE of the three mechanisms and elaborate with a real-world example (Mexico's PRI = clientelism; Indian state politics = ethnic mobilization; Arab Spring = grievance).",
    watch:"Don't say 'poor people don't vote in poor countries.' That's empirically wrong — many poor countries see HIGHER turnout among the poor due to clientelism." },

  /* ============= 5. ETHNICITY & IDENTITY ============= */
  { kind:"section", title:"5 · Ethnicity, identity & cleavage structure",
    intro:"Three competing theoretical lenses (primordialism / instrumentalism / constructivism) plus the empirical measure (fractionalization) and the connection to party systems (cleavages)." },

  { kind:"term", term:"Ethnicity (Chandra 2006)",
    def:"\"A subset of social identity categories for which eligibility is associated with (or believed to be associated with) descent.\" Examples: language, tribe, race, region, religion (in many contexts). Excludes identities like gender or sexuality that siblings would not be expected to share.",
    means:"Chandra's definition is operational. The descent test (would a person's siblings be in the same category by default?) lets you decide IF a given identity counts as ethnic in a particular case.",
    apply:"Cite Chandra by name. The key phrase is descent-based — even when the descent claim is socially constructed rather than biologically true.",
    watch:"Religion is sometimes ethnic (Northern Ireland) and sometimes not (the United States, where conversion is common). Apply the descent test case by case." },

  { kind:"term", term:"Ethnic Fractionalization",
    def:"The probability that two randomly chosen members of a population belong to different ethnic groups. Score 0 = perfectly homogeneous, score → 1 = many small groups.",
    means:"A single-number summary of ethnic diversity. Higher = more groups and/or more equal sizes.",
    apply:"Use it to QUANTIFY diversity, but never as a stand-alone predictor of political instability. Diversity matters only when paired with reinforcing cleavages and elite politicization.",
    watch:"Fractionalization does NOT equal polarization. A society of two equal-sized rival groups (low fractionalization, high polarization) is more conflict-prone than a society of twenty small groups (high fractionalization, low polarization)." },

  { kind:"term", term:"Primordialism",
    def:"The view that ethnic identities are ancient, fixed, biologically or culturally inherited, and emotionally deep-rooted.",
    means:"Identities-as-essence. Predicts ethnic conflict whenever groups are present.",
    apply:"Mention as the OLDEST of the three theoretical lenses, then critique it: it can't explain when identities shift, fuse, or are invented (Hutu/Tutsi reclassifications, the construction of 'Hindu' as a political identity).",
    watch:"Few serious scholars are pure primordialists today, but the framing still appears in journalism — recognize it and critique it." },

  { kind:"term", term:"Instrumentalism",
    def:"The view that ethnic identities are tools — elites manipulate or activate them strategically to mobilize support and gain power.",
    means:"Identity-as-strategy. Predicts ethnic salience rises when elites benefit from it (e.g., before elections).",
    apply:"Strong fit when explaining sudden activation of identities in electoral campaigns, riots timed to election cycles, or cleavages that go dormant outside politics.",
    watch:"Pure instrumentalism understates how durable identities feel from the inside — that's where constructivism fills the gap." },

  { kind:"term", term:"Constructivism",
    def:"The view that ethnic identities are socially constructed and historically contingent — real and consequential, but malleable, layered, and shaped by institutions, colonial history, and political action.",
    means:"Identity-as-built. Acknowledges instrumentalist dynamics but adds that once constructed, identities take on their own emotional weight and are not infinitely flexible.",
    apply:"Constructivism is the dominant modern view. On any 'which lens best explains X?' question, default to constructivism unless the prompt forces a contrast.",
    watch:"Don't read constructivism as 'ethnicity is fake.' Constructed ≠ unreal. Constructed identities can be just as politically lethal as primordial ones." },

  { kind:"term", term:"Reinforcing Cleavages",
    def:"Multiple social divisions (class, religion, region, ethnicity) line up on the same axis — the same people are on the same side of every important issue.",
    means:"Compounds polarization. There's no incentive to compromise because every issue maps onto the same in-group/out-group split.",
    apply:"On 'when does ethnic diversity threaten democracy?' questions, REINFORCING cleavages plus elite politicization is the danger zone.",
    watch:"Reinforcing ≠ polarized in the affective sense. Reinforcing is structural (cleavages overlap); polarization is the resulting emotional intensity." },

  { kind:"term", term:"Cross-Cutting Cleavages",
    def:"Social divisions cut across each other — a single person may be working-class AND religiously conservative AND an ethnic minority, with no two of those traits coinciding cleanly with party lines.",
    means:"Generates cross-pressures. People hold mixed loyalties, which moderates conflict and pushes parties toward broader coalitions.",
    apply:"Use as the stabilizing counterpart to reinforcing cleavages. A diverse society with cross-cutting cleavages is much less prone to ethnic conflict than one with reinforcing cleavages.",
    watch:"Cross-cutting cleavages can produce LOWER turnout among cross-pressured voters who don't know which side to back." },

  /* ============= 6. PARTISANSHIP ============= */
  { kind:"section", title:"6 · Partisanship — running tally vs. social identity",
    intro:"The central disagreement in the partisanship literature: is party ID a rational accounting summary, or a team membership?" },

  { kind:"term", term:"Party Identification (Partisanship)",
    def:"A voter's subjective alignment with a particular party. Measured on surveys: 'Generally speaking, do you think of yourself as a Republican, a Democrat, an Independent, or what?' plus follow-ups on strength.",
    means:"It is a SUBJECTIVE attachment, NOT a record of who you voted for last time. The two diverge often.",
    apply:"In any partisanship question, distinguish the IDENTITY (long-run attachment) from the VOTE (one-shot decision). Identity predicts vote, but the two aren't identical.",
    watch:"Don't confuse partisanship with ideology. Partisans of the same party can disagree on policy; ideologues of the same persuasion can vote different parties." },

  { kind:"term", term:"Running Tally Perspective (Fiorina)",
    def:"Party ID is an updated retrospective summary of how each party has performed across past elections. Voters revise it based on outcomes.",
    means:"Partisanship is RATIONAL — voters reward and punish parties for performance. It's a Bayesian-ish update, not a fixed loyalty.",
    apply:"This is the framework that PREDICTS partisanship will swing with policy shifts and economic outcomes. Cite Fiorina by name.",
    watch:"The running tally model has trouble explaining the stickiness of partisanship across major party realignments — that's the opening for the social-identity view." },

  { kind:"term", term:"Social Identity Perspective (Green, Palmquist & Schickler)",
    def:"Partisanship is a group identity — like religion or sports team membership — adopted early in life and resistant to short-run information.",
    means:"Partisanship is EXPRESSIVE, not instrumental. It gives belonging and meaning. Updates only slowly, even when the party changes positions.",
    apply:"This explains: stable partisanship across major policy shifts, partisan-motivated reasoning, affective polarization, partisan sorting in marriage and friendship, and partisan stability after dramatic candidate failures.",
    watch:"On 'what evidence shows partisanship is identity?' essays, point to STABILITY DESPITE PARTY CHANGE — that's the diagnostic Fiorina's model can't explain." },

  /* ============= 7. PARTY SYSTEMS ============= */
  { kind:"section", title:"7 · Party systems — counting and classifying",
    intro:"The vocabulary for describing how many parties matter in a country and why." },

  { kind:"term", term:"Political Party",
    def:"An organization that contests elections with the goal of placing its candidates in government office.",
    means:"What distinguishes a party from an interest group is candidate-running. NRA = interest group; Republicans = party. A think tank that lobbies but doesn't field candidates is NOT a party.",
    apply:"Use this minimal definition before classifying party systems.",
    watch:"Some 'parties' in authoritarian regimes don't truly contest — they're regime fronts. Apply the definition strictly." },

  { kind:"term", term:"One-Party System",
    def:"A regime in which only one party is legally permitted to hold power. Opposition parties are banned outright.",
    means:"Electoral competition is suppressed by law. Examples: PRC (CCP), DPRK, USSR pre-1990.",
    apply:"Distinguish from single-party DOMINANT — the legal monopoly is what defines a one-party system.",
    watch:"One-party states often hold elections (with one party on the ballot) and may have multiple internal factions, but legally there's only one party." },

  { kind:"term", term:"Single-Party Dominant System",
    def:"A regime in which multiple parties may legally compete, but only one party realistically holds power across electoral cycles.",
    means:"Competition is legal but uncompetitive — the dominant party wins repeatedly through mass appeal, incumbency advantages, electoral rules, or some mix.",
    apply:"Examples: Japan (LDP from 1955), Mexico (PRI 1929-2000), South Africa (ANC), Sweden (Social Democrats for most of the 20th c.).",
    watch:"Single-party dominant ≠ one-party. The opposition exists and can win in principle — Mexico's PRI lost in 2000, Japan's LDP lost in 2009. The system is dominant, not closed." },

  { kind:"term", term:"Two-Party System",
    def:"Only two parties have a realistic chance of winning national power.",
    means:"Usually a product of FPTP electoral rules + Duverger's Law — strategic voting and entry costs concentrate competition on two parties.",
    apply:"Canonical example: USA. Distinguish from single-party dominant (one party always wins) — in a two-party system, both parties periodically govern.",
    watch:"Third parties may exist and even win local seats; the system is two-party at the level of national power competition." },

  { kind:"term", term:"Multi-Party System",
    def:"More than two parties have a realistic chance of holding power, usually through coalition government.",
    means:"Common under proportional representation, where small parties can win seats with modest vote shares and bring them into coalitions.",
    apply:"Examples: Germany, Netherlands, Israel, most of continental Europe. Coalition formation and dissolution is a normal feature, not a sign of instability.",
    watch:"More parties does NOT mean less stable. Mature multi-party PR systems can be very stable; instability comes from low institutionalization, not from party count." },

  { kind:"term", term:"Effective Number of Parties (ENP)",
    def:"A weighted count of parties that captures both NUMBER and SIZE. Formula: 1 ÷ Σ(vote share²) — sum the squared vote shares of all parties, take the reciprocal.",
    means:"Penalizes tiny parties, rewards parties with substantial support. Two equally-sized parties → ENP = 2; one party with 80%, one with 20% → ENP ≈ 1.47.",
    apply:"You don't need to memorize the formula but you DO need to know it weights by size, not just counts. Higher ENP = more competition.",
    watch:"You can have 10 registered parties on the ballot but ENP barely above 2 if most are tiny. Don't equate registered count with ENP." },

  { kind:"term", term:"Duverger's Law",
    def:"FPTP / single-member-district systems tend to produce two-party systems; proportional representation tends to produce multi-party systems.",
    means:"Two mechanisms: (1) MECHANICAL — winner-take-all districts waste votes for third parties; (2) PSYCHOLOGICAL — voters anticipate this and switch to viable parties (strategic voting); parties also avoid hopeless entries.",
    apply:"On 'why do some countries have more parties?' essays: lead with Duverger, name BOTH mechanisms, then add cleavage structure and historical path dependence as further factors.",
    watch:"It's a tendency, not a deterministic law. Counterexamples exist (UK has FPTP but a robust third party historically; Canada has FPTP and effectively 4 parties). Use 'tends to' language." },

  /* ============= 8. INSTITUTIONALIZATION & STABILITY ============= */
  { kind:"section", title:"8 · Party system institutionalization",
    intro:"Mainwaring & Scully's framework for asking whether a country's party system is 'real' or just a rotating cast of personal vehicles." },

  { kind:"term", term:"Party System Institutionalization",
    def:"The degree to which a party system is stable, rooted in society, viewed as legitimate, and built on parties with strong organizations independent of any individual leader.",
    means:"Mainwaring & Scully's four dimensions: (1) LOW VOLATILITY — vote shares don't whipsaw; (2) SOCIETAL ROOTS — voters identify with parties; (3) LEGITIMACY — parties are seen as the proper actors in democratic competition; (4) STRONG ORGANIZATION — parties outlive their founders.",
    apply:"On 'how would you assess institutionalization?' essays, name ALL FOUR dimensions and map a country to each. The US scores high on all four; many newer democracies score low on volatility and organization.",
    watch:"Institutionalization is independent of democracy QUALITY. A highly institutionalized system can be authoritarian; a fragile democracy can have a low-IQ party system." },

  { kind:"term", term:"Electoral Volatility",
    def:"The aggregate shift in vote shares between parties from one election to the next.",
    means:"Operationalized via the Pedersen Index: sum of absolute vote-share changes across all parties, divided by 2. Higher = more flip-flopping.",
    apply:"This is the FIRST dimension of party system institutionalization. Cite the Pedersen Index by name when asked how it's measured.",
    watch:"Volatility can come from genuine voter shift or from new parties replacing old ones. Pedersen captures both — not just opinion change." },

  /* ============= 9. ELECTORAL INTEGRITY ============= */
  { kind:"section", title:"9 · Electoral integrity & measuring fraud",
    intro:"The capstone topic: how do we know elections are clean, and what tools do social scientists use when they aren't?" },

  { kind:"term", term:"Electoral Integrity",
    def:"The extent to which elections meet international standards: free, fair, transparent, competitive, free from intimidation/fraud, and administered by impartial bodies.",
    means:"It's a continuum, not a binary. Even consolidated democracies have integrity problems (gerrymandering, voter ID, registration purges); even autocracies sometimes hold partially clean elections.",
    apply:"Use Pippa Norris's Perceptions of Electoral Integrity (PEI) index as the canonical expert-survey measure. Mention multi-method triangulation when asked how to assess.",
    watch:"Electoral integrity is broader than 'no fraud.' It includes campaign financing, media access, voter registration, district drawing, and dispute resolution." },

  { kind:"term", term:"Why electoral fraud is hard to measure",
    def:"Fraud is, by definition, hidden. There is no clean ledger of fraudulent votes — researchers must triangulate.",
    means:"Five common methods: (1) EXPERT SURVEYS (PEI, V-Dem); (2) FORENSIC STATISTICS (Benford's-Law digit analysis, last-digit tests); (3) TURNOUT ANOMALIES (impossibly round numbers, near-100% turnout); (4) PRECINCT-LEVEL OUTLIERS (one precinct's results that defy regional patterns); (5) OBSERVER REPORTS / SATELLITE IMAGERY.",
    apply:"On 'how do we measure fraud?' essays, list at LEAST three methods and note the trade-offs: surveys are subjective, forensic stats produce false positives, observers can be excluded.",
    watch:"None of the methods are bulletproof on their own. Triangulation across methods is the standard." },
];

/* ---------------------------------------------------------
   STUDY_GUIDE — full walk-through of every section of the
   official "Terms and concepts" handout. The terms list mirrors
   the cheatsheet (cross-linked) and each "Question to grapple
   with" gets a structured model answer: bottom line, the key
   terms to cite, a 4–6 bullet outline you could write straight
   onto an exam, and the trap to avoid.
   --------------------------------------------------------- */
const STUDY_GUIDE_TERMS = [
  // Order matches the official handout exactly.
  "Spatial / sincere voting",
  "Median Voter Theorem",
  "Strategic voting",
  "Vote buying",
  "Credible exit option",
  "Voice",
  "Loyalty",
  "The collective action problem",
  "Selective incentives",
  "Public good",
  "Ethnicity (Chandra's definition)",
  "Ethnic fractionalization*",
  "Primordialism",
  "Instrumentalism",
  "Constructivism",
  "Party identification / partisanship",
  "Running tally perspective on partisanship",
  "Social identity perspective on partisanship",
  "Political party",
  "One-party system",
  "Single-party dominant system",
  "Two-party system",
  "Multi-party system",
  "Effective number of parties*",
  "Reinforcing cleavages",
  "Cross-cutting cleavages",
  "Duverger's law",
  "Party system institutionalization",
  "Electoral volatility*",
  "Electoral integrity",
];

const STUDY_GUIDE_QUESTIONS = [
  {
    n: 1,
    q: "Under what conditions might we expect a citizen to exert \"voice\" against a state that has in the past instituted some policy against her interests? Under what conditions might we expect the citizen to exit? To remain loyal to the state? Why?",
    bottomLine: "Hirschman's three options are governed by the credibility of the exit option, the responsiveness of the regime, and the depth of loyalty. Whichever is cheapest and most effective wins.",
    keyTerms: ["Voice", "Exit", "Loyalty", "Credible exit option"],
    outline: [
      "Define the three responses upfront: Voice = costly within-system pressure (protest, vote, petition); Exit = leave the relationship (emigrate, switch jurisdictions, move capital); Loyalty = continued attachment despite dissatisfaction.",
      "Voice predicted when (a) exit is blocked or expensive, (b) the regime is responsive enough that voice can plausibly succeed, and (c) loyalty is high enough that the citizen still wants the state to improve rather than abandon it.",
      "Exit predicted when a credible exit option exists AND voice feels futile — closed regimes with porous borders, or wealthy citizens with offshore options.",
      "Loyalty predicted when emotional/identity attachment is so high it suppresses both exit and voice — the citizen tolerates the policy and stays quiet.",
      "Concrete example: 1980s East Germany — closed border made exit non-credible, so voice + loyalty competed; once the Wall fell, exit became credible and the regime collapsed within months.",
    ],
    trap: "Don't reduce this to 'rich exit, poor voice.' Hirschman's framework is about the credibility of exit, not income directly. The three options are also not exclusive — voice and loyalty often coexist (loyal opposition).",
  },
  {
    n: 2,
    q: "What is the collective action dilemma? What does it say about the likely calculation of an individual citizen about whether to participate in voting, protest, donating to a political cause, etc?",
    bottomLine: "Individually rational free-riding produces a collectively irrational result: the public good (clean elections, policy change) is undersupplied because no one's contribution is decisive.",
    keyTerms: ["Collective action problem", "Public good", "Selective incentives"],
    outline: [
      "Define a public good: non-excludable AND non-rival. Most political outputs (policy, regime change, electoral integrity) qualify.",
      "Olson's logic: each citizen's probability of being decisive is ≈ 0, so the expected benefit of participating is tiny while the cost (time, risk) is real and immediate. Rational actors abstain.",
      "Result: predicted turnout / protest / donation under purely rational assumptions is near zero. The dilemma is that everyone wants the good, but no individual has the incentive to provide it.",
      "Resolutions: selective incentives (private rewards/punishments restricted to participants), civic duty / expressive benefits, social pressure, partisan identity that makes participation feel intrinsic, low-cost participation channels.",
      "On the exam: state the paradox FIRST, then layer in the four resolutions to explain observed (non-zero) participation.",
    ],
    trap: "Don't say people 'don't want' the public good. The logic isn't preference, it's structural — the free-rider incentive is built into the payoff structure of any public good.",
  },
  {
    n: 3,
    q: "Why do people bother to turn out to vote? What kinds of factors might lead people to vote, and generally to participate in politics?",
    bottomLine: "Once you accept Olson's paradox, observed turnout has to come from non-instrumental motives: duty, identity, mobilization, and selective incentives.",
    keyTerms: ["Collective action problem", "Selective incentives", "Party identification", "Public good"],
    outline: [
      "Restate the puzzle: rational-choice logic predicts ≈ 0 turnout because no one vote decides the election.",
      "Resolution 1 — civic duty / expressive voting: voters get utility from the act itself (Riker & Ordeshook's 'D' term).",
      "Resolution 2 — social pressure and norms: visible turnout (yard signs, 'I voted' stickers, social-media posts) attaches social rewards to participating.",
      "Resolution 3 — selective incentives from parties: GOTV operations target known partisans with rides, reminders, social belonging — a private benefit for showing up.",
      "Resolution 4 — partisan identity: when party = social identity, voting is an expression of who you are, not an instrumental calculation.",
      "Add structural factors: low cost (registration ease, mail-in ballots), close elections (perceived stakes), competitive districts, age and habit formation.",
    ],
    trap: "Don't list factors atomistically. The structure of the answer should be: paradox → why rational-choice predicts zero → the four mechanisms that explain why the prediction is wrong.",
  },
  {
    n: 4,
    q: "Why might socio-economic status often be positively correlated with political participation?",
    bottomLine: "Higher SES brings more resources, more information, and more contact from parties — three independent reinforcing channels (Verba/Schlozman/Brady).",
    keyTerms: ["Selective incentives", "Public good", "Collective action problem"],
    outline: [
      "Three drivers, name all three explicitly.",
      "RESOURCES: time off work to vote, money to donate, civic skills (writing letters, organizing) acquired through education and white-collar work.",
      "INFORMATION: lower information costs — the educated read political news more, follow campaigns, know how to register.",
      "MOBILIZATION: parties strategically target high-propensity voters, who tend to be high-SES, creating a positive feedback loop where the well-off get more voter contact.",
      "Empirical: this correlation is robust across consolidated democracies (the U.S., Western Europe).",
    ],
    trap: "Don't stop at 'rich people have more time.' The Verba model has THREE drivers — leaving out skills/information or mobilization is the easiest way to lose points.",
  },
  {
    n: 5,
    q: "Are there conditions under which socio-economic status might not be correlated with political participation, or might even be negatively correlated with political participation? Why under those conditions?",
    bottomLine: "Three classic conditions break the SES → participation link: clientelism, ethnic/communal mobilization, and high-grievance protest movements.",
    keyTerms: ["Vote buying", "Ethnicity (Chandra)", "Reinforcing cleavages", "Selective incentives"],
    outline: [
      "Lead with the empirical fact: the SES → participation correlation is contingent on context, not universal.",
      "CONDITION 1 — Clientelism / vote buying: machine politics targets the poor first because their votes are cheaper to secure and their dependence is greater. Mexico under PRI, parts of Brazil and the Philippines.",
      "CONDITION 2 — Ethnic/communal mobilization: when party competition runs on ethnic lines, identity overrides class. Poor co-ethnics turn out at high rates because the stakes are felt as group survival, not policy preference. Indian state politics, parts of sub-Saharan Africa.",
      "CONDITION 3 — High-grievance movements: deprivation itself fuels participation when grievances become acute (Arab Spring, civil-rights era). Low-SES groups can outpace the wealthy.",
      "Mechanism summary: each condition substitutes a different mobilizing logic (private payoff, identity, grievance) for the standard resource model.",
    ],
    trap: "Don't say 'poor people don't vote in poor countries.' Empirically WRONG — many poor democracies see HIGHER turnout among the poor due to clientelism. Get the direction right.",
  },
  {
    n: 6,
    q: "In the films, An African Election and The People's Choice, what did you observe about the reasons people were making different choices about whom to vote for and whether to vote?",
    bottomLine: "Voter choice in the films was driven by overlapping considerations of ethnic identity, partisan loyalty built over generations, performance evaluations, and clientelist mobilization — exactly the mix predicted by the theoretical literature.",
    keyTerms: ["Ethnicity", "Reinforcing cleavages", "Party identification", "Vote buying", "Running tally perspective"],
    outline: [
      "Frame the answer with the three lenses: identity (ethnic / partisan), instrumental performance evaluation (running tally), and clientelist exchange.",
      "ETHNIC / REGIONAL IDENTITY: voters in An African Election visibly aligned along NPP/NDC lines that overlapped with regional and ethnic cleavages — a textbook reinforcing-cleavage pattern.",
      "PARTISANSHIP AS IDENTITY: long-time party loyalists treated voting as an expression of who they were, not a calculation about platforms — Green/Palmquist/Schickler social-identity model.",
      "RUNNING TALLY / PERFORMANCE: some voters explicitly evaluated incumbent performance (corruption, jobs, services) and updated their support — Fiorina's retrospective model.",
      "CLIENTELISM: scenes of food, money, and small-favor distribution captured vote-buying as part of how mobilization happened.",
      "TURNOUT MOTIVATION: voters spoke about civic duty and a felt obligation to participate — duty + selective incentives in action.",
    ],
    trap: "If you only describe what you saw, you miss the points for connecting it to theory. Always tag each observation with the concept it illustrates.",
  },
  {
    n: 7,
    q: "Do you expect ethnic diversity to have consequences for democratic politics? Under what conditions? What kinds of consequences?",
    bottomLine: "Diversity per se is not the problem — the danger is reinforcing cleavages plus elite politicization. Cross-cutting cleavages and constructivist fluidity neutralize most of the risk.",
    keyTerms: ["Ethnic fractionalization", "Reinforcing cleavages", "Cross-cutting cleavages", "Constructivism", "Instrumentalism"],
    outline: [
      "Resist the simple 'diversity = conflict' story. The data on fractionalization alone don't predict democratic breakdown.",
      "WHEN diversity threatens democracy: (a) cleavages REINFORCE each other (ethnicity, class, religion, region all line up on the same axis); (b) elites POLITICIZE identity for electoral gain (instrumentalism); (c) institutions are weak so there are no incentives to compromise.",
      "WHEN diversity is benign: cross-cutting cleavages create cross-pressures and moderate group conflict; institutionalized parties absorb identity claims; constructivist fluidity allows identities to recombine.",
      "Possible consequences when conditions are bad: ethnic-party systems, exclusion of minorities, electoral violence, eventually civil conflict.",
      "Theoretical lens: constructivism is the dominant modern view — identities are real and can be politically lethal, but they are constructed and shapeable rather than fixed.",
    ],
    trap: "Don't cite ethnic fractionalization as a stand-alone predictor. Quoting a fractionalization score without discussing cleavage structure or politicization misses the actual mechanism.",
  },
  {
    n: 8,
    q: "What kinds of evidence might suggest that partisanship is operating as a social identity in a particular country/time period?",
    bottomLine: "Diagnostic: stability of partisanship across major party policy shifts, plus affective polarization that exceeds policy disagreement.",
    keyTerms: ["Social identity perspective", "Running tally perspective", "Party identification"],
    outline: [
      "Frame the question as a contest between Fiorina's running-tally model and Green/Palmquist/Schickler's social-identity model.",
      "EVIDENCE 1 — STABILITY DESPITE PARTY CHANGE: voters keep their party ID even after the party shifts position dramatically. The running-tally model predicts updating; the identity model predicts stickiness.",
      "EVIDENCE 2 — AFFECTIVE POLARIZATION: voters dislike the OUT-party more than they like their own — emotional, not policy-driven. Thermometer scores diverge sharply.",
      "EVIDENCE 3 — PARTISAN-MOTIVATED REASONING: factual beliefs (about the economy, scandal accusations) track partisan identity rather than evidence.",
      "EVIDENCE 4 — SOCIAL SORTING: marriage, friendship, neighborhood selection by party. People treat party like an in-group rather than a policy bundle.",
      "EVIDENCE 5 — STABILITY ACROSS GENERATIONS: party ID transmitted from parents to children, like religion or ethnicity.",
    ],
    trap: "Stability ALONE doesn't prove identity — Fiorina would say a stable record of good performance produces stable updating. The diagnostic is stability DESPITE change in party performance/positions.",
  },
  {
    n: 9,
    q: "Why do some countries exhibit a greater number of political parties than others do?",
    bottomLine: "Lead with Duverger: electoral rules drive party-system size, but cleavage structure and historical path-dependence do real work too.",
    keyTerms: ["Duverger's law", "Strategic voting", "Effective number of parties", "Reinforcing / cross-cutting cleavages", "Multi-party system"],
    outline: [
      "ELECTORAL SYSTEM (Duverger's Law): FPTP / single-member districts → 2 parties via mechanical (winner-take-all wastes votes) and psychological (strategic voting) effects. PR with low thresholds → multi-party, because small parties can win seats.",
      "DISTRICT MAGNITUDE / THRESHOLDS: the higher the magnitude and the lower the legal threshold, the more parties survive.",
      "SOCIAL CLEAVAGES: more distinct salient cleavages produce more parties IF the electoral system permits them — Lipset & Rokkan's frozen cleavages.",
      "FEDERALISM / DECENTRALIZATION: regional parties become viable when there are sub-national legislatures to compete for (Canada, Spain, Belgium).",
      "HISTORICAL / PATH DEPENDENCE: founding moments shape the party system — once two parties capture the funding, talent, and brand recognition, entry costs climb.",
      "On the exam: name the rule (Duverger) FIRST, both mechanisms (mechanical + psychological), then add cleavages and history as secondary explanations.",
    ],
    trap: "Don't treat Duverger as deterministic. UK historically has FPTP + a strong third party; Canada has FPTP and effectively 4 parties. Use 'tends to' language and acknowledge counterexamples.",
  },
  {
    n: 10,
    q: "How would you assess whether a country has high levels of party system institutionalization or not?",
    bottomLine: "Use Mainwaring & Scully's four dimensions. A country must score high on ALL FOUR to count as institutionalized.",
    keyTerms: ["Party system institutionalization", "Electoral volatility", "Political party"],
    outline: [
      "Define institutionalization upfront: parties are stable, rooted in society, viewed as legitimate, and built on organizations that outlive any one leader.",
      "DIMENSION 1 — LOW ELECTORAL VOLATILITY: vote shares between elections are stable. Operationalize via the Pedersen Index (sum of absolute vote-share changes / 2). Low Pedersen = high institutionalization.",
      "DIMENSION 2 — SOCIETAL ROOTS: voters identify with parties and parties have stable bases — surveys measuring party ID, membership, generational transmission.",
      "DIMENSION 3 — LEGITIMACY: parties are viewed as the proper actors in democratic competition, not as vehicles to be circumvented. Survey confidence-in-parties items.",
      "DIMENSION 4 — STRONG ORGANIZATION: parties have permanent staff, internal procedures, candidate selection rules — they outlive their founders rather than collapsing when the leader dies or retires.",
      "Apply: U.S. and UK score high on all four; many newer democracies score low on volatility and organization despite holding regular elections.",
    ],
    trap: "Institutionalization is independent of democracy QUALITY. A regime can have an institutionalized authoritarian party (PRI for decades) and a low-quality democracy can have a fragile party system. Don't conflate.",
  },
  {
    n: 11,
    q: "Why might some countries have a higher level of party system institutionalization than others?",
    bottomLine: "Time, electoral stability, and structural conditions that reward party-building over personalist politics drive institutionalization.",
    keyTerms: ["Party system institutionalization", "Electoral volatility", "Cross-cutting cleavages", "Single-party dominant system"],
    outline: [
      "TIME / SEQUENCE: institutions take generations to root. Older democracies have had more elections, more transmission of party ID, more chances for organizations to outlive founders.",
      "STABLE CLEAVAGE STRUCTURE: when underlying social cleavages are stable, parties have stable constituencies. Volatility falls naturally.",
      "ELECTORAL RULES: PR with moderate thresholds rewards stable mid-sized parties; pure majoritarian + weak parties produce personalist vehicles.",
      "ABSENCE OF MAJOR REGIME SHOCKS: democracies that haven't been interrupted by coups, civil wars, or ruptured transitions accumulate institutional capital.",
      "STATE CAPACITY: when the state delivers basic services, parties can run on policy rather than patronage, which favors organization-building.",
      "FOUNDING CONDITIONS: countries whose democracy was built around pre-existing mass parties (Western Europe) start from a higher base than those whose parties were assembled around individual leaders post-transition.",
    ],
    trap: "It's NOT just 'old democracies institutionalize.' Plenty of newer democracies have institutionalized fast (Chile post-1990) and old ones have de-institutionalized (Italy in the 1990s). Time is a factor, not a guarantee.",
  },
  {
    n: 12,
    q: "Why is electoral fraud difficult to measure? What are some of the ways social scientists have tried to measure it?",
    bottomLine: "Fraud is hidden by definition, so researchers triangulate across imperfect indirect methods. No single tool is conclusive.",
    keyTerms: ["Electoral integrity", "Electoral volatility"],
    outline: [
      "PROBLEM: there is no clean ledger of fraudulent votes. Perpetrators have every incentive to conceal. Direct measurement is impossible, so all methods are inferential.",
      "METHOD 1 — EXPERT SURVEYS: Pippa Norris's Perceptions of Electoral Integrity (PEI) index aggregates expert ratings across multiple election dimensions. Pros: comparable across countries. Cons: subjective, depends on which experts you ask.",
      "METHOD 2 — FORENSIC STATISTICS: Benford's-Law digit analysis, last-digit tests, looking for anomalous digit distributions in reported counts. Pros: cheap, can be run after the fact. Cons: produces false positives in messy real-world data.",
      "METHOD 3 — TURNOUT ANOMALIES: impossibly round numbers (95%, 99% turnout), turnout patterns that defy demographic expectations, identical results across very different precincts.",
      "METHOD 4 — PRECINCT-LEVEL OUTLIERS: precincts whose results diverge dramatically from regional patterns suggest manipulation.",
      "METHOD 5 — OBSERVER REPORTS / SATELLITE IMAGERY: international monitors (OSCE, Carter Center) and satellite imagery of polling-place activity. Pros: direct. Cons: observers can be excluded, monitor only sampled stations.",
      "Standard practice: triangulate across at least three methods. No single tool is bulletproof.",
    ],
    trap: "Don't list one method. The question explicitly asks for 'ways' (plural) and the trade-off discussion. Citing PEI without naming Norris and listing weaknesses is a half-answer.",
  },
  {
    n: 13,
    q: "In the films, An African Election and The People's Choice, what did you observe about how elections were administered? How did political actors try to prevent electoral malfeasance and ensure electoral integrity (or conversely, to engage in it)? What were some of the challenges to administering elections that the films raised?",
    bottomLine: "The films illustrate that electoral integrity is the OUTPUT of an active institutional system: independent commissions, observers, transparent counting, plus visible attempts at manipulation that those institutions had to detect and counter.",
    keyTerms: ["Electoral integrity", "Vote buying", "Political party", "Voice"],
    outline: [
      "Tag observations to theory rather than just describing.",
      "INTEGRITY-PROTECTING INSTITUTIONS: independent electoral commission, party agents at polling stations, observer missions, public counts at the precinct, secured ballot boxes, biometric registration.",
      "INTEGRITY-THREATENING ACTIONS: vote buying, voter intimidation, premature 'announcement' of results before counts are complete, chaos around vote-counting centers, party-aligned media spreading disinformation.",
      "THE PERIPHERAL CHALLENGES: logistics — getting ballots to remote areas, training poll workers, handling power outages during counts, managing the queue at polling stations under heat and stress.",
      "STAKEHOLDER PRESSURE: party leaders, civil society groups, and ordinary voters all played enforcement roles — calling out fraud, demanding recounts, refusing to leave count rooms. This is electoral integrity as a CONTESTED practice, not a passive property.",
      "THEORY LINK: cite the PEI framework — integrity is multi-dimensional (registration, campaign finance, vote count, dispute resolution), and the films show actors fighting on each dimension.",
    ],
    trap: "Don't describe scenes generically. The point is to NAME the dimension of integrity each scene illustrates and connect it to the academic concept.",
  },
];

/* ---------------------------------------------------------
   ESSAY_MC — one multiple-choice question per essay prompt.
   Each tests the key argument of that essay. Use for Learn
   "essay concepts" mode and for Hard quiz difficulty.
   --------------------------------------------------------- */
const ESSAY_MC = [
  { topic:"Voice / Exit / Loyalty",
    q:"A citizen living under a regime with closed borders and rigged elections, but who is deeply attached to the nation, is most likely (per Hirschman) to:",
    opts:["Exit — emigrate quietly","Use voice — protest and organize from within","Stay loyal and politically disengage","Engage in strategic voting"],
    correct:1,
    explain:"When exit is blocked and loyalty is high, voice becomes the primary channel for dissent — the credibility of the exit option is the key driver." },
  { topic:"Collective action dilemma",
    q:"Olson's collective action model predicts individual voter turnout should be near zero because:",
    opts:["Voting is usually illegal","Each individual vote rarely decides the election, so rational actors free-ride","Polling places are inaccessible","Citizens cannot tell candidates apart"],
    correct:1,
    explain:"Rational-choice logic: one vote almost never flips an election, so contributing is individually irrational even if everyone benefits from political outcomes." },
  { topic:"Why people vote anyway",
    q:"Which of the following is NOT a standard resolution of the paradox of voting?",
    opts:["Civic duty and expressive voting","Selective incentives from party mobilization","Partisan identity making voting feel intrinsic","Rational calculation that one's own vote will decide the outcome"],
    correct:3,
    explain:"The decisive-vote calculation predicts turnout near zero; the other three (duty, mobilization, identity) are the accepted work-arounds." },
  { topic:"SES and participation",
    q:"The standard positive correlation between socioeconomic status and political participation is usually explained by:",
    opts:["Legal requirements that target wealthy citizens","Higher-SES citizens having more time, civic skills, information, and mobilization contact","Parties banning low-income voters","Mandatory voting in wealthy neighborhoods"],
    correct:1,
    explain:"SES bundles together resources (time, money), civic skills, political information, and exposure to mobilization — all of which raise the likelihood of participation." },
  { topic:"When SES breaks down",
    q:"In which context is the usual positive SES–participation correlation most likely to break down?",
    opts:["A consolidated democracy with high literacy","A clientelistic regime where poor voters are mobilized by patronage","A two-party FPTP system","A proportional-representation system with low thresholds"],
    correct:1,
    explain:"Clientelism mobilizes low-SES voters directly through patronage/vote-buying, often producing equal or higher turnout among the poor." },
  { topic:"Ethnic diversity & democracy",
    q:"Ethnic diversity is most likely to threaten democratic stability when:",
    opts:["Cleavages cross-cut each other","Identities are fluid and constructivist","Cleavages reinforce AND elites politicize ethnicity","Ethnic fractionalization is very low"],
    correct:2,
    explain:"The danger comes from reinforcing cleavages (same groups on the same side of every issue) combined with elite mobilization along ethnic lines — diversity alone isn't destabilizing." },
  { topic:"Partisanship as identity",
    q:"The strongest evidence that partisanship is a social identity (Green/Palmquist/Schickler) rather than a rational running tally (Fiorina) is:",
    opts:["Voters carefully re-weight their party ID each election","Party ID remains stable even when parties make dramatic policy shifts","Voters only identify with whichever party holds power","Partisanship vanishes in polarized environments"],
    correct:1,
    explain:"A rational tally would swing with policy shifts; its stickiness despite major shifts points to identity — like team loyalty." },
  { topic:"Duverger's Law",
    q:"Duverger's Law predicts that:",
    opts:["All democracies converge on two parties","FPTP rules tend toward two parties; PR tends toward multiparty systems","PR always yields a single dominant party","Electoral rules have no effect on party systems"],
    correct:1,
    explain:"FPTP squeezes out third parties via strategic voting and entry costs; PR lets small parties win seats, producing multiparty systems." },
  { topic:"Party system institutionalization",
    q:"Which is NOT one of Mainwaring & Scully's four dimensions of party-system institutionalization?",
    opts:["Low electoral volatility","Parties rooted in society","Parties seen as legitimate actors","Parties funded primarily by the state"],
    correct:3,
    explain:"The four dimensions are: low volatility, societal roots, legitimacy, and strong party organizations — not source of funding." },
  { topic:"Measuring electoral fraud",
    q:"Why is electoral fraud hard to measure directly?",
    opts:["Fraud is fully transparent and easily quantified","Fraud is hidden by nature, so analysts rely on indirect forensic methods and expert surveys","International observers always catch every fraudulent vote","Governments publish detailed fraud reports routinely"],
    correct:1,
    explain:"Because fraud is hidden, researchers triangulate: expert surveys (PEI), Benford's-Law digit forensics, turnout anomalies, precinct-level outliers, observer reports — each with error bars." },
];
