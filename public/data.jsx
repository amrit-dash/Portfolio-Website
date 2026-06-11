/* global React */
const { useState, useEffect, useRef, useCallback } = React;

/* =====================================================
   DATA
   ===================================================== */

const EXPERIENCE = [
  {
    id: 'contour',
    company: 'Contour Education',
    role: 'Automation Engineer',
    sub: 'CRM ops on Monday.com',
    startedOn: 'Aug 2025',
    endedOn: '',
    short: 'Contour Education',
    current: true,
    desc: 'Automating the full operational backbone at Contour Education — 100+ workflows live across Make.com, Zapier, n8n and Apps Script, wired around a Monday.com CRM.',
    bullets: [
      'Student onboarding, class allocation and attendance — fully automated end-to-end',
      'Parent-student communication flows across texts and email',
      'Tutor scheduling and fee follow-up pipelines',
      'Internal reporting, data hygiene tooling and Hubspot CRM pipelines for the sales team',
    ],
    stack: ['Make.com', 'Zapier', 'n8n', 'Apps Script', 'Monday.com', 'Hubspot'],
  },
  {
    id: 'freelance',
    company: 'Various Project-Based Roles',
    role: 'Freelance Software Engineer',
    sub: 'AI · Flutter · Shopify · Bots',
    startedOn: 'Sep 2024',
    endedOn: 'Jul 2025',
    short: 'Freelance',
    desc: 'Five clients, five very different problems — spanning LLM/RAG, Flutter, Shopify and WhatsApp automation.',
    roles: [
      {
        id: 'begig',
        name: 'BeGig',
        date: 'Sep 2024 — Nov 2024',
        bullets: [
          'Built a custom LLM chatbot with RAG over BeGig\'s internal knowledge base',
          'Context-aware Q&A pipeline with embeddings, semantic search and grounded responses',
          'Designed prompt scaffolding tuned for hallucination resistance',
          'Delivered a deployable agent integrated with their internal tooling',
        ],
      },
      {
        id: 'cdt',
        name: 'CDT Koraput',
        date: 'Nov 2024 — Mar 2025',
        bullets: [
          'Coffee Mapper Android app for the Coffee Development Trust, Koraput',
          'Used by field agents to capture and map plantation regions in real time',
          'Flutter Web admin dashboard with map view, region reporting and agent oversight',
          'Live on the Google Play Store — currently in active field use',
        ],
      },
      {
        id: 'kunsquad',
        name: 'Kunsquad',
        date: 'Feb 2025 — Apr 2025',
        bullets: [
          'Custom Shopify Liquid section blocks for the Kunsquad storefront',
          'Reusable widget assets fitted to their brand voice and inventory model',
          'Designed and shipped the About Us and Team pages end-to-end',
          'Handed off documented patterns the in-house team can extend',
        ],
      },
      {
        id: 'nbc',
        name: 'Nothing BOT Comedy',
        date: 'Mar 2025 — Jul 2025',
        bullets: [
          'Twilio + Apps Script WhatsApp bot for spot curation at a Bangalore comedy club',
          'Comics chat the bot to claim weekly performance spots — fully self-serve',
          'Grew to 150+ active comics handling weekly venue scheduling',
          'Built and maintains the back-office Sheets-based ops layer',
        ],
      },
      {
        id: 'independent',
        name: 'Independent',
        date: 'Ongoing',
        bullets: [
          'Various Make.com and Zapier automation projects for small businesses',
          'CRM sync, onboarding flows and reporting pipelines',
          'One-off LLM and Apps Script tooling for niche use cases',
        ],
      },
    ],
    stack: ['LLM + RAG', 'Flutter', 'Firebase', 'Shopify Liquid', 'Twilio', 'Apps Script'],
  },
  {
    id: 'axelerant',
    company: 'Axelerant Technologies',
    role: 'Business Automation Engineer',
    sub: 'Internal process automation',
    startedOn: 'Jul 2023',
    endedOn: 'Aug 2024',
    short: 'Axelerant',
    desc: 'Built and maintained internal automation infrastructure across Make, Zapier, Apps Script and Zoho CRM.',
    bullets: [
      'End-to-end automation for employee onboarding, appraisals and offboarding',
      'Audited and retuned existing flows for cost efficiency and reliability',
      'Cross-tool integrations across Make, Zapier, Apps Script and Zoho',
      'Completed the Leadership Axelerator Program (LeAP)',
    ],
    stack: ['Make', 'Zapier', 'Apps Script', 'Zoho', 'Google Workspace'],
  },
  {
    id: 'highradius',
    company: 'Highradius Corporation',
    role: 'Co-op Intern → Consultant → Script Automation Lead',
    sub: 'Cash App Automation · ASAP tooling',
    startedOn: 'Apr 2020',
    endedOn: 'Jun 2023',
    short: 'Highradius',
    desc: 'Three years at Highradius — progressed from a college co-op intern, to a Cash Application Automation consultant, to Script Automation Team Lead on the technical dev team.',
    roles: [
      {
        id: 'intern',
        name: 'Co-op Intern',
        date: 'Apr 2020 — Jun 2021',
        bullets: [
          'Final-year college co-op placement on the Cash Application Automation (CAA) team',
          'Trained on SQL, CAA processes and Apps Script tooling',
          'Shadowed senior consultants on live client implementations',
          'Highflyer Intern of the Quarter (Q2 2021)',
        ],
      },
      {
        id: 'consultant',
        name: 'Consultant',
        date: 'Jul 2021 — Dec 2022',
        bullets: [
          'Took 3 enterprise CAA clients live: Zurich Insurance, CrediQ and Heritage Crystal Clean',
          'Built rule engines and reconciliation flows tailored to each client\'s ERP',
          'Managed 2 resources delivering CAA for Bureau Veritas',
          'Star Team Award (Q3 2021)',
        ],
      },
      {
        id: 'lead',
        name: 'Script Automation Lead',
        date: 'Jan 2023 — Jun 2023',
        bullets: [
          'Promoted to the technical dev team as Script Automation Team Lead',
          'Built ASAP — an Apps Script toolkit still in production company-wide',
          'Owned scoping, architecture and rollout for internal automation tooling',
          'Mentored consultants on the CAA-to-dev-team transition pathway',
        ],
      },
    ],
    stack: ['SQL', 'Apps Script', 'CAA', 'Google Sheets API', 'Firebase'],
  },
];

const EXPERTISE = [
  { num: '01', icon: 'automation', title: 'Process Automation', sub: 'Make, Zapier, n8n' },
  { num: '02', icon: 'rag',        title: 'RAG & Agentic AI',   sub: 'LLM agents, Genkit' },
  { num: '03', icon: 'gas',        title: 'Apps Script & GCP',  sub: 'Workspace + Firebase' },
  { num: '04', icon: 'flutter',    title: 'Flutter Development',sub: 'Android, iOS, web' },
  { num: '05', icon: 'bots',       title: 'WhatsApp & Twilio',  sub: 'Conversational bots' },
  { num: '06', icon: 'shopify',    title: 'Shopify Liquid',     sub: 'Custom storefronts' },
  { num: '07', icon: 'web',        title: 'Web Development',    sub: 'HTML/CSS, Next.js, React' },
  { num: '08', icon: 'ios',        title: 'iOS Development',    sub: 'SwiftUI, Broadcast Ext.' },
  { num: '09', icon: 'comedy',     title: 'Comedy Writing',     sub: 'Stand-up bits & sets' },
];

const PROJECTS = [
  {
    id: 'test-made-easy',
    title: 'Test Made Easy',
    cat: 'AI · EdTech Platform',
    type: '.ai',
    image: 'assets/projects/dtp-card.svg',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Ftest-made-easy.png?alt=media&token=42c52c9e-6112-4903-9caf-aeddc84ad22e',
    desc: 'DynamicTestPaper AI — an AI-powered platform for teachers, tutors and coaching institutes. Upload a photo or PDF of a question; the AI extracts the text, formats LaTeX equations and isolates diagrams automatically. Build a personal question bank organized by subject, chapter and difficulty, then generate professional, print-ready test papers (with auto-generated answer keys) carrying your institute\'s branding, accent color and watermark.',
    tags: ['AI Extraction', 'LaTeX', 'Next.js', 'Firebase', 'EdTech'],
    skills: ['rag', 'web'],
    links: [
      { label: 'Live Site', href: 'https://testmadeeasy.web.app' },
      { label: 'GitHub', href: 'https://github.com/amrit-dash/dtp-ai' },
    ],
  },
  {
    id: 'genkiflow',
    title: 'GenkiFlow IDE',
    cat: 'Next.js · Google Genkit',
    type: '.ide',
    image: 'assets/projects/genkiflow.svg',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Fgenkiflow.png?alt=media&token=63f02ba9-8f32-4a1d-b847-046f57488e69',
    desc: 'A web-based IDE that embeds Google Genkit\'s AI capabilities directly into the editor. Features code generation, refactoring and summarization alongside a multi-tab editor and a persistent, browser-based file system — a complete, context-aware development workflow.',
    tags: ['Next.js', 'Google Genkit', 'LLM Agent', 'TypeScript'],
    skills: ['rag', 'web'],
    links: [
      { label: 'Live Demo', href: 'https://studio--genkiflow-ide.us-central1.hosted.app/ide' },
      { label: 'GitHub', href: 'https://github.com/amrit-dash/GenkiFlow-IDE' },
    ],
  },
  {
    id: 'rx-workspace',
    title: 'Rx Workspace',
    cat: 'Next.js · SaaS App',
    type: '.tool',
    image: 'assets/projects/rx-workspace.svg',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Frx-workspace.png?alt=media&token=3af04f45-0214-48b0-8c25-8d888fc1b50e',
    desc: 'A modern, SaaS-style prescription generator for medical doctors. Smart patient management with autocomplete that tracks visit history, a fuzzy-search global medicine dictionary that learns frequently prescribed medicines, and digital signature support (draw or upload, with auto background removal). Exports fully branded hospital prescriptions as high-quality PDFs — powered by Next.js App Router, Supabase (Auth, PostgreSQL, RLS, Storage) and @react-pdf/renderer.',
    tags: ['Next.js', 'React', 'TypeScript', 'Supabase', 'Tailwind CSS', 'PDF Generation'],
    skills: ['web'],
    links: [
      { label: 'Live App', href: 'https://an-apple-a-day.web.app' },
      { label: 'GitHub', href: 'https://github.com/amrit-dash/an-apple-a-day' },
    ],
  },
  {
    id: 'overlay-recorder',
    title: 'Overlay Recorder',
    cat: 'SwiftUI · iOS App',
    type: '.ios',
    image: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Foverlay-recorder.png?alt=media&token=06634af0-e3dc-4e72-9edf-6a632038d4ef',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Foverlay-recorder-banner.jpg?alt=media&token=22b02783-97aa-494a-914c-4d39eab8f52b',
    desc: 'A SwiftUI iOS app that records the screen via a Broadcast Extension while simultaneously overlaying the front camera as a floating Picture-in-Picture window. Built for tutorials, reaction videos and gameplay — with a Library view to manage and replay past recordings.',
    tags: ['SwiftUI', 'iOS 15+', 'Broadcast Extension', 'PiP', 'Swift'],
    skills: ['ios'],
    links: [
      { label: 'GitHub', href: 'https://github.com/amrit-dash/Overlay-Recorder' },
    ],
  },
  {
    id: 'coffee-mapper',
    title: 'Coffee Mapper',
    cat: 'Flutter Android App',
    type: '.app',
    image: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2FcoffeeMapper.jpg?alt=media&token=b617b095-f310-4dea-9a89-2cf4dc81582a',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2FcoffeeMapper.jpg?alt=media&token=8fad4b83-8a3d-46cd-ad9b-96d4eabc7642',
    desc: 'An android app built for the Coffee Development Trust, Koraput. Used by field agents to login and track coffee plantations across various regions, capturing region details on the ground.',
    tags: ['Flutter', 'Android', 'Firebase', 'Maps API'],
    skills: ['flutter'],
    links: [
      { label: 'Play Store', href: 'https://play.google.com/store/apps/details?id=com.coffee.mapper' },
      { label: 'GitHub', href: 'https://github.com/amrit-dash/coffee-mapper-android' },
    ],
  },
  {
    id: 'coffee-dashboard',
    title: 'Coffee Mapper Dashboard',
    cat: 'Flutter Web Project',
    type: '.web',
    image: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2FcdtKoraput.jpg?alt=media&token=b2654baf-9b48-4d2f-9678-40c8a941e5de',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Fdashboard.jpg?alt=media&token=d83eba60-44f0-4f75-9abf-d027c6fae881',
    desc: 'A web dashboard displaying tracked plantation regions with an integrated map view. Admins generate reports of tracked regions and oversee field agent activity.',
    tags: ['Flutter Web', 'Firebase', 'Dashboard'],
    skills: ['flutter', 'web'],
    links: [
      { label: 'Live Site', href: 'https://coffee-mapper-dashboard.web.app' },
      { label: 'GitHub', href: 'https://github.com/amrit-dash/coffee-mapper-web' },
    ],
  },
  {
    id: 'miss-lily',
    title: 'Ms. Lily',
    cat: 'Actions on Google',
    type: '.aog',
    image: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fmisslily.png?alt=media&token=eddad6ee-d643-4937-8bb9-ef52a0a0e6c2',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Fmisslily.png?alt=media&token=9ab6689c-7d1f-4844-a70f-078b6d1939e6',
    desc: 'Your personal health-mate, built for Google Assistant. Ms. Lily helps you lead a healthier life — fighting specific diseases with curated diet and fitness plans (calibrated to your BMI and written by a certified dietician), scheduling medicines with timely reminders, and keeping your fitness routine on track. Built on Dialogflow with Cloud Firestore and JavaScript, deployed as an Action on Google.',
    tags: ['Actions on Google', 'Dialogflow', 'Cloud Firestore', 'JavaScript'],
    skills: ['rag', 'gas'],
    links: [
      { label: 'GitHub', href: 'https://github.com/amrit-dash/miss-lily' },
    ],
  },
  {
    id: 'nbc',
    title: 'Nothing BOT Comedy',
    cat: 'WhatsApp Bot',
    type: '.bot',
    image: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fnbc.jpg?alt=media&token=aaa4a35e-5e3d-49a4-a1f9-0926c4fbf2f8',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Fnbc.jpg?alt=media&token=63315960-5803-403a-a22a-0e86d108c133',
    desc: 'A WhatsApp bot for managing spot curation at a Bangalore comedy club. Comics chat with the bot to claim weekly spots — grew to 150+ active users handling weekly venue scheduling.',
    tags: ['WhatsApp', 'Twilio', 'Apps Script'],
    skills: ['bots', 'gas', 'comedy'],
    links: [
      { label: 'Text the Bot', href: 'https://wa.me/message/OGQRIVZ7W7JAN1' },
      { label: 'GitHub', href: 'https://github.com/amrit-dash/Nothing-BOT-Comedy' },
    ],
  },
  {
    id: 'kunsquad',
    title: 'Kunsquad Website',
    cat: 'Shopify Liquid',
    type: '.site',
    image: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fkunsquad.jpg?alt=media&token=f1cb5911-7176-40d3-b487-4f8f356eb876',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Fkunsquad.jpg?alt=media&token=50652dbb-1931-47ef-877a-505e2e871e0a',
    desc: 'Custom Liquid pages and widget assets for this Bhubaneswar-based startup. Designed reusable section blocks that fit the brand voice and inventory model.',
    tags: ['Shopify Liquid', 'E-commerce'],
    skills: ['shopify', 'web'],
    links: [
      { label: 'About Page', href: 'https://www.kunsquad.com/pages/about-us' },
      { label: 'Team Page', href: 'https://www.kunsquad.com/pages/our-team' },
    ],
  },
  {
    id: 'make',
    title: 'Make Automation Projects',
    cat: 'Workflow Engineering',
    type: '.flow',
    image: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fmake.jpg?alt=media&token=3fc55028-5b8c-4995-a345-c1bc0a93e728',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Fmake.jpg?alt=media&token=b38eaa52-876a-42dc-b657-fc624216bbde',
    desc: 'A showcase of advanced automation scenarios on Make.com paired with Apps Script and SaaS integrations. Two flagship flows: DSM Bot (daily-status automation) and Cricket Bot (prediction & engagement).',
    tags: ['Make.com', 'Apps Script', 'Slack', 'OpenAI'],
    skills: ['automation', 'gas'],
    links: [
      { label: 'GitHub', href: 'https://github.com/amrit-dash/Make-Automation-Projects' },
    ],
  },
  {
    id: 'asap-cg',
    title: 'ASAP — CG',
    cat: 'Apps Script Project',
    type: '.tool',
    image: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2FasapCG.jpg?alt=media&token=9d0c1b06-b696-4b26-8a1d-e98429bce51f',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2FasapCG.jpg?alt=media&token=15bd2a6a-2189-4d86-b5a4-19ede10358b3',
    desc: 'Apps Script Automation Projects — Customer Group Generator. Generates fuzzy customer groups by revenue, region and industry, integrated with Google Sheets and exposed via a web interface.',
    tags: ['Apps Script', 'Google Workspace', 'Firebase'],
    skills: ['gas', 'automation'],
    links: [
      { label: 'Documentation', href: 'https://docs.google.com/document/d/1omFaGxy4gHuwoJK1VQ7cvItkUfbLBPELfN9nB-xFVB8/edit?usp=sharing' },
      { label: 'Live Tool', href: 'https://fuzzy-customer-group-generator.firebaseapp.com' },
    ],
  },
  {
    id: 'gcw',
    title: 'Guwahati Comedy Week',
    cat: 'Comedy Festival · Web',
    type: '.web',
    image: 'assets/projects/comedy-writing.svg',
    gallery: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fprojects%2Fgallery%2Fcomedy-writing.jpg?alt=media&token=a597d93b-b0c2-4bac-bd1e-b7c63198aa6d',
    desc: 'Built the official website and performed at Guwahati Comedy Week — a weeklong comedy festival presented by High Time Comedy Club. 6 venues, 7 days, 12 shows, 15 comics from Guwahati and across India. Amrit performed in 7 shows including Opening Night, Hum Do Humare Duo, The Uncensored Show, and hosted The Battleground (Bangalore vs Guwahati).',
    tags: ['Comedy Festival', 'Performer', 'Web Design', 'Firebase', 'HTML/CSS'],
    skills: ['comedy', 'web'],
    links: [
      { label: 'Visit Site', href: 'https://guwahati-comedy-week.web.app' },
      { label: 'Instagram', href: 'https://www.instagram.com/_amrit_dash_' },
    ],
  },
];

const SOCIALS = [
  { label: 'WhatsApp',  icon: 'whatsapp',  href: 'https://wa.me/917978416962?text=Hey!' },
  { label: 'LinkedIn',  icon: 'linkedin',  href: 'https://linkedin.com/in/amritdash60' },
  { label: 'GitHub',    icon: 'github',    href: 'https://github.com/amrit-dash' },
  { label: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/_amrit_dash_' },
];

/* =====================================================
   CONTENT DEFAULTS — single source of truth for both the
   live site and the admin dashboard. Every field below is
   editable from /admin.html. The admin's draft is merged
   on top of these defaults at runtime.
   ===================================================== */

const DEFAULT_HERO = {
  handle: 'user@amrit.os ~ %',
  name: 'Amrit',
  nameEm: 'Dash',
  subtitle: 'AI & Automation Engineer.',
  role: '<b>5 years</b> shipping <b>process automation</b> at scale — Make.com, Apps Script, Zapier, n8n and Twilio. Building <b>RAG systems</b> and <b>agentic AI</b> workflows on Google Cloud + Firebase. Also shipping <b>Flutter</b> apps for Android & iOS. Have been doing comedy as a full-time side hustle.',
  ctas: [
    { label: 'View Projects', href: '#projects', primary: true },
    { label: "Let's Build Something Crazy", href: '#contact', primary: false },
  ],
};

const DEFAULT_ABOUT = {
  photo: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2Fabout-photo.jpg?alt=media&token=bc76e276-1a4c-4aec-bbb7-4b283c1c7113',
  photoStamp: 'PHOTO_001.JPG',
  meta: [
    { label: 'LOC', value: 'Bangalore, IN' },
    { label: 'TZ', value: 'GMT+5:30' },
    { label: 'FUEL', value: 'Filter Coffee' },
  ],
  heading: 'Logical thinker, real-world <em>builder</em>, and an after-hours <em>comedian</em>.',
  intro: "AI & Automation Engineer in Bangalore. 5 years building workflows that quietly do the boring stuff so humans don't have to.",
  impact: [
    { label: 'Now', html: 'Automating student-ops at <em>Contour Education</em> — onboarding, class allocation, attendance, parent-student comms. 100+ workflows live across Make.com, Zapier, n8n and Apps Script.' },
    { label: 'Then', html: 'Business Automation Engineer at <em>Axelerant</em> — built end-to-end flows for employee onboarding, appraisals and offboarding across Make, Zapier and Zoho.' },
    { label: 'Before', html: 'Cash App Automation consultant at <em>HighRadius</em> — took 4 enterprise clients live, then shipped ASAP, an Apps Script toolkit still in production company-wide.' },
    { label: 'On the side', html: 'Stand-up comedy as a full-time hobby — weekend shows at comedy clubs across Bangalore.' },
  ],
};

const DEFAULT_CARDS = [
  {
    id: 'education', eyebrow: 'EDUCATION', meta: '2017—2021',
    title: 'KIIT University', sub: 'B.Tech, Computer Science & Engineering',
    body: 'Developed technical skills through coursework and student developer clubs. Served as Flutter Lead for the Developer Student Club (DSC).',
    items: [], scores: [
      { label: 'CGPA', value: '7.90' }, { label: 'IELTS', value: '8.0' }, { label: 'GRE', value: '306.5' },
    ],
  },
  {
    id: 'achievements', eyebrow: 'ACHIEVEMENTS', meta: 'RECOGNITION',
    title: 'AIR 1 · Digit CTC VI', sub: 'Cryptic-hunt event, national', body: '',
    items: [
      "AIR 1, Digit CTC VI — India's toughest cryptic hunt",
      'Runners-up, Run IO Hackathon — NIT Rourkela',
      'Highflyer Intern of the Quarter (Q2 2021), Highradius',
      'Star Team Award (Q3 2021), Highradius',
      'Tech Speaker — Actions on Google at IIIT BBSR, CVRCE & DevExpo',
    ], scores: [],
  },
  {
    id: 'certifications', eyebrow: 'CERTIFICATIONS', meta: '07 ISSUED',
    title: 'Continuous Learning', sub: 'Professional development', body: '',
    items: [
      'Make Automation Expert (Levels 1–4)', 'Leadership Axelerator Program (LeAP)',
      'Google Cloud Essentials', 'Machine Learning APIs',
      'Build Interactive Apps with Google Assistant', 'Kubernetes in Google Cloud',
      'PyTorch Scholarship by Udacity',
    ], scores: [],
  },
  {
    id: 'offduty', eyebrow: 'OFF-DUTY', meta: 'HOBBY',
    title: 'Stand-up Comedy & more', sub: 'Open mics · wanderlust · good food',
    body: 'Stand-up comedy is my full-time hobby — observational and anecdotal. Almost-daily open mics and weekend shows across Bangalore. Other interests: tech, DIY, magic, Model UN, gaming.',
    items: [], scores: [],
  },
];

const DEFAULT_CONTACT = {
  email: 'amrit.dash60@gmail.com',
  phone: '+91 79784 16962',
  heading: 'Got a <em>project idea</em>?<br/>Or want to chat about <em>comedy</em>?',
  intro: "I'm available for select freelance and contract automation work, full-stack Flutter builds, and the occasional collaboration. Drop a line — I read everything.",
  socials: SOCIALS,
};

const DEFAULT_MEDIA = {
  cvLight: { name: 'Amrit Dash - CV 2025.pdf', url: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2FAmrit%20Dash%20-%20CV%202025.pdf?alt=media&token=95d6275c-3246-4c8f-8a80-ce61bf32e45d', size: '' },
  cvDark:  { name: 'Amrit Dash - CV 2025 (Dark).pdf', url: 'https://firebasestorage.googleapis.com/v0/b/amrit-dash-portfolio.firebasestorage.app/o/public%2Fsite%2Fassets%2FAmrit%20Dash%20-%20CV%202025%20(Dark).pdf?alt=media&token=4fd49af4-4856-4833-9b34-1e4a353db469', size: '' },
};

const DEFAULT_COSMETICS = {
  theme: 'dark',
  accent: '#c8e856',
  accentTone: 50,         // accent brightness slider: 0 darkest · 50 neutral · 100 lightest
  type: 'default',
  fontScale: 100,
  headingFont: 'match',   // 'match' follows `type`; else overrides --font-display only
  tracking: 'normal',     // letter-spacing on labels/headings: tight | normal | wide
  scanlines: true,
  cursorStyle: 'ring',
  cursorColor: '#c8e856',
  botIcon: 'brain-computer',
  botIconColor: 'accent',
  bgPattern: 'grid',      // wallpaper: grid | dots | scan | starfield | none
  glow: 100,              // accent glow/bloom intensity (0–160, 100 = default)
  radius: 'soft',         // UI corner style: sharp | soft | round
  vibe: 'classic',        // last-applied preset (admin convenience; front-end ignores)
};

const LLM_PROVIDERS = [
  { id: 'gemini',     label: 'Google Gemini',    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', keyHint: 'AIza…',    docs: 'https://aistudio.google.com/apikey',                  models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'openai',     label: 'OpenAI',           endpoint: 'https://api.openai.com/v1/chat/completions',                                       keyHint: 'sk-…',     docs: 'https://platform.openai.com/api-keys',                models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'anthropic',  label: 'Anthropic Claude', endpoint: 'https://api.anthropic.com/v1/messages',                                            keyHint: 'sk-ant-…', docs: 'https://console.anthropic.com/settings/keys',         models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'] },
  { id: 'openrouter', label: 'OpenRouter',       endpoint: 'https://openrouter.ai/api/v1/chat/completions',                                    keyHint: 'sk-or-…',  docs: 'https://openrouter.ai/keys',                          models: ['meta-llama/llama-3.1-70b-instruct', 'google/gemini-flash-1.5', 'anthropic/claude-3.5-sonnet', 'mistralai/mistral-large'] },
  { id: 'mistral',    label: 'Mistral',          endpoint: 'https://api.mistral.ai/v1/chat/completions',                                       keyHint: '…',        docs: 'https://console.mistral.ai/api-keys',                 models: ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-nemo'] },
  { id: 'grok',       label: 'xAI Grok',         endpoint: 'https://api.x.ai/v1/chat/completions',                                             keyHint: 'xai-…',    docs: 'https://console.x.ai',                                models: ['grok-4', 'grok-3', 'grok-3-mini'] },
  { id: 'groq',       label: 'Groq',             endpoint: 'https://api.groq.com/openai/v1/chat/completions',                                  keyHint: 'gsk_…',    docs: 'https://console.groq.com/keys',                       models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'moonshotai/kimi-k2-instruct'] },
];

const DEFAULT_BOT = {
  systemPrompt: `You are amrit-bot, a portfolio assistant for Amrit Dash. Reply in 1-3 short sentences max, casual lowercase tone, no exclamation points. Use lightweight markdown when it helps: **bold** for emphasis, *italic* for asides, \`- item\` bullets or \`1. item\` numbered lists when listing 2+ points. No HTML, headings, or code fences. Be concise and direct.

About Amrit:
- AI & Automation Engineer, 5+ years experience, based in Bangalore, India
- Currently Automation Engineer at Contour Education (Australian ed-tech) — 100+ workflows across Make.com, Zapier, n8n, Apps Script, HubSpot. Day-to-day: scoping automation with teams, building flows, troubleshooting, setting up AI email pipelines and test environments.
- Previously: Business Automation Engineer at Axelerant (employee onboarding/offboarding across Make, Zapier, Zoom)
- Previously: Cash App Automation consultant at HighRadius — went live with Zurich Insurance, CrediQ, Heritage Crystal Clean & Bureau Veritas. Highflyer Intern of the Quarter Q2 2021, Star Team Award Q3 2021.
- Got into automation at HighRadius managing interns — built Apps Script tools to auto-generate their daily task lists

Education:
- B.Tech CSE from KIIT University, Bhubaneswar
- Schooling: St. Joseph's High School, then DAV Pokhariput (Bhubaneswar)
- At DAV, co-organised Hack DAV — India's first high-school-level hackathon

Projects:
- Rx Workspace: SaaS prescription generator for doctors. Next.js, Supabase, 249k+ medicine dictionary, PDF generation. Live at an-apple-a-day.web.app
- Test Made Easy (DTP AI): extracts questions from images, auto-generates answer keys and LaTeX diagrams, built for teachers making question papers. Live at testmadeeasy.web.app
- GenkiFlow IDE: browser-based IDE with Google Genkit AI baked in — code gen, refactoring, summarization. Started as a passion project for cost-efficient AI IDEs; now somewhat outdated given open-source options.
- Nothing BOT Comedy: WhatsApp bot for spot booking at a Bangalore comedy club. 150+ active comics. Built with Twilio + Apps Script.
- Coffee Mapper: Flutter Android app for Coffee Development Trust field agents tracking plantations. Live on Play Store.
- Overlay Recorder: SwiftUI iOS app — screen recording with PiP front-camera overlay. On GitHub.
- ASAP CG: Apps Script customer-group generator, shipped and still used at HighRadius.
- Kunsquad: Shopify Liquid custom storefront for a Bhubaneswar startup.

Stack: Make.com, n8n, Zapier, Apps Script, Google Genkit, Vertex AI, Flutter, Next.js, React, TypeScript, Supabase, Firebase, Twilio, Shopify Liquid, SwiftUI

Comedy:
- Stand-up comedian doing open mics and club shows across India
- Started in Bhubaneswar → Guwahati → Zoom (COVID) → Delhi → Lucknow (longer stint) → Bangalore
- Also visited: Chandigarh, Kolkata, Kochi, Chennai for shows
- Currently performing in Bangalore at Underground Comedy Club, Big Pitcher Comedy Club, Bloom Comedy Club
- Notable venues: Laugh Club (Chandigarh), Comedy Theatre (Gurgaon), Canvas Laugh Club (Bangalore)
- Opened for: Harsh Gujral, Devesh Dikshit, Vipul Goyal, Pratyush Chaubey, Akash Mehta, Saikiran, Manik Mahna (personal favourite)
- Performed in 7 of 12 shows at Guwahati Comedy Week (also built their website)
- Observational style with a tech/work-life edge

Achievements: AIR 1 Digit CTC VI (India's hardest cryptic hunt event)

If someone asks something completely unrelated to Amrit, gently deflect and steer back to his work or comedy.`,
  intro: [
    "Hey 👋 I'm amrit-bot. ask me anything.",
    'Try /stats, /links, /work — or /help for all commands.',
  ],
  behavior: { temperature: 0.7, maxTokens: 300, tone: 'casual-lowercase', matchThreshold: 0.28 },
  qa: [
    { qs: ['hi', 'hello', 'hey', 'yo', 'namaste', 'hey there', 'good morning', 'greetings'], as: ['hey 👋 ask me anything about amrit — work, projects, automation, or comedy. or try /stats, /work, /links.', "hi! i'm amrit-bot. ask about his projects, automation work, or comedy — or hit /help."] },
    { qs: ['what do you build?', 'what kind of work do you do?', "what's your main thing?", 'what do you specialise in?'], as: ['process automation systems. Make.com, n8n, Apps Script, Twilio. plus RAG and agentic AI on Google Cloud.', 'workflows that quietly do the boring stuff — Make, n8n, Zapier, Apps Script. also shipping AI/RAG pipelines on Google Cloud + Firebase.', "automation and AI. if it's repetitive, i'm probably automating it. Make, n8n, Flutter, Genkit — whatever the job needs.", "mostly: wiring up systems that talk to each other so humans don't have to. automating ops, building AI pipelines, shipping mobile apps."] },
    { qs: ['where are you based?', 'where do you work from?', 'where are you now?', 'which city?'], as: ['Bangalore, IN — currently shipping student-ops automation at Contour Education.', 'based in Bangalore. right now: automating the full ops backbone at Contour Education — 100+ workflows live.', 'Bangalore. building automation infra at Contour Education across Make, Zapier, n8n and Apps Script.', 'Bangalore. the city has good coffee and terrible traffic — both great for a work-from-home engineer.'] },
    { qs: ['biggest win?', "what's your proudest work?", 'best project so far?', 'career highlight?'], as: ['two years as a Cash App Automation consultant — went live with Zurich Insurance, CrediQ, Heritage Crystal Clean & Bureau Veritas.', 'built Nothing BOT Comedy — a WhatsApp bot handling weekly spot curation for 150+ comics at a Bangalore club. still running.', 'the ASAP toolkit at HighRadius — an Apps Script automation suite that shipped company-wide and is still live today.', "probably the 100+ Make/n8n/Zapier workflows i've shipped at Contour. they quietly run the entire student operations backend."] },
    { qs: ["what's your stack?", 'what tools do you use?', 'what tech do you work with?', 'favourite tools?'], as: ['Make · Zapier · n8n · Apps Script · Flutter · Firebase · Twilio · Shopify Liquid. lately a lot of Genkit.', 'depends on the job. automation → Make/n8n/Zapier. AI → Genkit + Firebase. mobile → Flutter. bots → Twilio + Apps Script.', 'core: Make, n8n, Apps Script, Firebase. AI/RAG: Google Genkit + Vertex. mobile: Flutter. infra: GCP + Twilio.', 'Make is my daily driver. n8n when i need self-hosted. Genkit for AI. Flutter for mobile. Apps Script is my duct tape.'] },
    { qs: ['what do you do for fun?', 'hobbies?', 'what are you into outside work?', 'life outside code?'], as: ["stand-up comedy. when i'm not debugging workflows, i'm debugging punchlines on stage 🎤", "open mics and weekend shows at clubs across Bangalore. also built a WhatsApp bot for a comedy club — couldn't stop automating things off the clock.", 'comedy. the material comes from my work life, which turns out to be pretty weird. weekends on stage.', "i do stand-up. there's a lot of material in watching enterprise software fail in real time."] },
    { qs: ['something interesting about you?', 'tell me a fact', 'surprise me', 'fun fact?'], as: ["AIR 1 in Digit CTC VI — India's hardest cryptic-hunt event. i'm built for puzzles.", "i automated a comedy club's entire venue booking via WhatsApp. 150+ comics, zero spreadsheets.", 'i built the website for Guwahati Comedy Week and performed in 7 of the 12 shows. engineer by day, comic by night.', 'i once shipped a cricket prediction bot on Make that ran during IPL season. it was disturbingly accurate.'] },
    { qs: ["what's your most interesting project?", 'which project stands out?', "coolest thing you've built?"], as: ['Nothing BOT Comedy — Twilio + Apps Script WhatsApp bot for a Bangalore club. 150+ comics self-serve their weekly spots through it.', 'GenkiFlow IDE — a web IDE with Google Genkit baked in. code gen, refactoring, summarization, all in-browser with a persistent file system.', 'Coffee Mapper — Flutter app for field agents tracking plantation regions for the Coffee Development Trust, Koraput. live on Play Store.', 'Rx Workspace — a full SaaS prescription generator for doctors. Next.js, Supabase, PDF generation, 249k+ medicine dictionary.'] },
    { qs: ['are you available for work?', 'can i hire you?', 'do you take freelance?', 'open to projects?'], as: ['select freelance work, yes — automation builds, RAG pipelines, Flutter apps. drop a line at amrit.dash60@gmail.com.', 'available for contract automation and AI work. reach me at amrit.dash60@gmail.com or just /links.', 'open to the right projects — automation, AI/RAG, Flutter. email works best: amrit.dash60@gmail.com.', "selectively, yes. if you've got a messy ops problem or need an AI pipeline built fast, i'm interested."] },
    { qs: ['what are you working on now?', 'current projects?', "what's keeping you busy?"], as: ['at Contour: automating student onboarding, class allocation, attendance and parent comms. 100+ workflows live across Make, Zapier, n8n.', 'Rx Workspace — a SaaS prescription tool for doctors. and a few automation client builds on the side.', 'mostly deep in Make.com and n8n at work. evenings: tinkering with Genkit and writing comedy bits.'] },
    { qs: ['tell me about your AI work', "what's your AI experience?", 'do you do machine learning?'], as: ['RAG pipelines and agentic AI — mostly Google Genkit + Vertex AI. context-aware Q&A, embeddings, grounded responses.', 'not classical ML — my AI work is applied: RAG systems, LLM agents, prompt engineering. all wired into real products.', 'Genkit is my main AI framework. built RAG pipelines with semantic search, embeddings, hallucination-resistant prompting.'] },
    { qs: ["what's contour education?", 'tell me about your current job', 'where do you work?'], as: ['Contour is a tutoring and test-prep company in Australia. i run the automation backbone — student onboarding to billing, all automated.', "ed-tech company. i've wired up everything from student registration to class allocation to WhatsApp parent updates using Make + n8n + Apps Script.", 'my current gig. i build and maintain 100+ workflows that quietly power the whole ops layer — scheduling, attendance, comms, CRM.'] },
    { qs: ["how'd you get into coding?", 'how did you start?', 'programming background?'], as: ['B.Tech in CS. but coding really clicked when i started automating things i was bored of doing manually.', 'computer science degree, then a HighRadius internship that threw me into Apps Script and SQL. never looked back.', 'college CS → HighRadius internship → fell into automation consulting. somewhere along the way, comedy joined the mix.'] },
    { qs: ["what's your comedy like?", 'stand-up style?', 'tell me a joke'], as: ['observational with a tech-nerd edge. a lot of it is about enterprise software, ops disasters, and why automation still needs a human babysitter.', 'i do open mics at Canvas Laugh Club, Prangsta, and around Bangalore. the material mostly roasts the software industry.', 'no jokes in the bot — those cost extra. but catch me on stage on weekends 🎤'] },
    { qs: ['do you do flutter?', 'mobile development?', 'ios or android?'], as: ['Flutter, yes — cross-platform Android + iOS. shipped Coffee Mapper (Play Store) and a few internal tools.', 'Flutter is my mobile stack. also done some SwiftUI for iOS — built a screen recorder with PiP overlay.', "Flutter for cross-platform, SwiftUI when it needs to be native iOS. Overlay Recorder on GitHub if you're curious."] },
    { qs: ['where did you study?', "what's your education?", 'college?', 'did you do engineering?'], as: ["b.tech cse from KIIT University, Bhubaneswar. schooling at St. Joseph's and DAV Pokhariput in BBSR.", 'computer science degree from KIIT University. before that, DAV Pokhariput for 11th and 12th — where i also co-organised India\'s first high-school hackathon.', 'KIIT University, BBSR for engineering. grew up and studied entirely in Bhubaneswar.', "KIIT for my B.Tech in CSE. the hackathon bug bit me before that — Hack DAV at school, India's first high-school hackathon."] },
    { qs: ["what's hack dav?", 'tell me about hack dav', 'hackathon background?', 'did you organise any events?'], as: ["while in 11th/12th at DAV Pokhariput, me and a few friends organised Hack DAV — India's first high-school-level hackathon. pretty proud of that.", 'co-organised Hack DAV at school. first high-school hackathon in the country. built something before i even knew what i was doing.', "Hack DAV — if you're going to automate your life, might as well start early. ran it in school before most of us had GitHub accounts."] },
    { qs: ['how did you get into comedy?', 'comedy origin?', 'when did you start stand-up?', 'how long have you been doing comedy?'], as: ['started at open mics in Bhubaneswar. moved cities a lot — Guwahati, then Delhi, Lucknow, now Bangalore\'s my main scene.', 'just showed up at open mics and never stopped. been to almost 9 cities with it at this point.', 'comedy found me when i realised my day job was funnier than most people\'s material. started in BBSR, now mostly Bangalore clubs.'] },
    { qs: ['who have you opened for?', 'notable shows?', 'big gigs?', "famous comics you've worked with?"], as: ['opened for Harsh Gujral, Vipul Goyal, Devesh Dikshit, Pratyush Chaubey, Manik Mahna and a few others.', "Manik Mahna is my personal favourite i've opened for. also Harsh Gujral, Vipul Goyal, Saikiran, Akash Mehta.", 'Guwahati Comedy Week — performed in 7 of the 12 shows, also built their website. and featured for some big names: Devesh Dikshit, Vipul Goyal, Pratyush Chaubey.'] },
    { qs: ['how did you get into automation?', 'what got you started?', 'origin story?', 'how did coding start for you?'], as: ['managing interns at HighRadius — had to write their daily task lists every day. automated it with Apps Script. one script became a whole company-wide toolkit.', 'boredom, honestly. at HighRadius i kept doing the same thing repeatedly. Apps Script fixed that. now i automate things before they become boring.', 'always been into tech since school. but automation specifically clicked when i realised repetitive work is just a workflow waiting to be built.'] },
    { qs: ['what do you do at contour?', 'describe your day at work', "what's your job like?", 'day-to-day?'], as: ['meet with teams, scope what\'s slow or repetitive, build flows to fix it — Make, Apps Script, HubSpot depending on the job. then maintain and tune.', 'mostly building automation for ops: student onboarding, scheduling, attendance, parent comms, billing. plus AI experiments like LLM email routing.', 'part builder, part debugger, part advisor. ops teams bring me their headaches and i figure out what a workflow can solve.'] },
    { qs: ['tell me about test made easy', 'what is dtp ai?', 'question paper generator?'], as: ['teachers upload a photo or PDF of a question — the AI extracts it, formats LaTeX equations, generates answer options and answer key. live at testmadeeasy.web.app.', 'DTP AI — built for teachers making question papers from image scans. does the messy OCR and LaTeX formatting automatically.', 'it can even build LaTeX diagrams for complex question types. teachers focus on curation, not formatting. that was the whole point.'] },
    { qs: ['tell me about genkiflow', 'what is genkiflow?', 'genkiflow ide?'], as: ['browser IDE with Google Genkit baked in — code gen, refactoring, summarization, all in-tab. started when AI IDEs were just emerging.', 'passion project. multi-tab editor, persistent file system, Genkit AI for code tasks. a bit outdated now but taught me a lot about building with LLMs.', "genki means 'lively' in Japanese. the IDE embeds LLM flows directly into the editor. the open-source world has mostly caught up but it was fun to build."] },
  ],
  commands: [
    { id: 'whoami',   label: 'whoami',   desc: 'who is amrit',      card: 'Amrit Dash — AI & Automation Engineer based in Bangalore.' },
    { id: 'stats',    label: 'stats',    desc: 'quick numbers',     card: '5 yrs automation · 8 projects shipped · 4 CAA clients live · 150+ bot users · AIR 1 Digit CTC VI' },
    { id: 'stack',    label: 'stack',    desc: 'tech & tools',      card: 'Automation: Make · Zapier · n8n · Apps Script. AI: Genkit · Vertex. Mobile: Flutter · SwiftUI.' },
    { id: 'links',    label: 'links',    desc: 'social & contact',  card: 'LinkedIn · GitHub · Instagram · WhatsApp · Email · About.me' },
    { id: 'work',     label: 'work',     desc: 'work history',      card: 'Contour Education · HighRadius · Axelerant' },
    { id: 'comedy',   label: 'comedy',   desc: 'stand-up life',     card: 'Observational, tech & work-life edge. Bangalore clubs.' },
    { id: 'projects', label: 'projects', desc: 'shipped work',      card: 'Test Made Easy · GenkiFlow IDE · Rx Workspace · Coffee Mapper · Nothing BOT Comedy' },
    { id: 'edu',      label: 'edu',      desc: 'education',         card: 'B.Tech CSE — KIIT University. Hack DAV.' },
    { id: 'origin',   label: 'origin',   desc: 'how i got here',    card: 'Automated intern task-lists at HighRadius. never stopped.' },
    { id: 'clear',    label: 'clear',    desc: 'restart chat',      card: '' },
  ],
  providers: {
    active: 'gemini',
    byProvider: {
      gemini:     { apiKey: '', model: 'gemini-2.0-flash' },
      openai:     { apiKey: '', model: 'gpt-4o-mini' },
      anthropic:  { apiKey: '', model: 'claude-3-5-sonnet-latest' },
      openrouter: { apiKey: '', model: 'meta-llama/llama-3.1-70b-instruct' },
      mistral:    { apiKey: '', model: 'mistral-small-latest' },
      grok:       { apiKey: '', model: 'grok-3' },
      groq:       { apiKey: '', model: 'llama-3.3-70b-versatile' },
    },
  },
};

const PORTFOLIO_DEFAULTS = {
  hero:       DEFAULT_HERO,
  about:      DEFAULT_ABOUT,
  cards:      DEFAULT_CARDS,
  expertise:  EXPERTISE,
  experience: EXPERIENCE,
  projects:   PROJECTS,
  contact:    DEFAULT_CONTACT,
  media:      DEFAULT_MEDIA,
  cosmetics:  DEFAULT_COSMETICS,
  bot:        DEFAULT_BOT,
};

/* Admin override layer — the dashboard publishes content to localStorage; the
   live site reads the preview snapshot (unsaved live-preview) if present, else
   the published snapshot, else the built-in defaults above. On Firebase
   migration this single read becomes a Firestore content/published listener. */
const _isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);
/* Keys that would walk the prototype chain instead of own data. `over` is
   untrusted (parsed from localStorage), so skip them to avoid prototype
   pollution and keep the merge to plain own-properties only. */
const _UNSAFE_KEY = (k) => k === '__proto__' || k === 'constructor' || k === 'prototype';
function _deepMerge(base, over) {
  if (!_isPlain(over)) return over === undefined ? base : over;
  if (!_isPlain(base)) return JSON.parse(JSON.stringify(over));
  const out = { ...base };
  for (const k of Object.keys(over)) {
    if (_UNSAFE_KEY(k)) continue;
    out[k] = _deepMerge(base[k], over[k]);
  }
  return out;
}

function _coerceExperience(arr) {
  const fn = window.SHARED_SCHEMA && window.SHARED_SCHEMA.coerceExperienceArray;
  return fn ? fn(arr) : arr;
}
function _withExperienceNorm(content) {
  if (content && Array.isArray(content.experience)) content.experience = _coerceExperience(content.experience);
  return content;
}

/* Synchronous first paint: defaults merged with the last cached published
   snapshot (localStorage). Firestore then hydrates/streams the live copy via
   subscribeContent() below — so the page renders instantly, then updates live. */
const LIVE_CACHE = 'amritos.published.cache';
let _override = null;
try {
  _override = JSON.parse(
    localStorage.getItem('amritos.preview') ||      // admin live-preview (iframe)
    localStorage.getItem(LIVE_CACHE) ||             // last Firestore snapshot cached
    localStorage.getItem('amritos.published') ||    // legacy local publish
    'null'
  );
} catch (e) { /* keep defaults */ }
const PORTFOLIO_CONTENT = _withExperienceNorm(_override ? _deepMerge(PORTFOLIO_DEFAULTS, _override) : JSON.parse(JSON.stringify(PORTFOLIO_DEFAULTS)));

window.PORTFOLIO_DEFAULTS = PORTFOLIO_DEFAULTS;
window.PORTFOLIO_CONTENT  = PORTFOLIO_CONTENT;
window.LLM_PROVIDERS      = LLM_PROVIDERS;

/* Lighten/darken a hex accent toward white/black. tone is 0–100 (50 = neutral);
   < 50 darkens, > 50 lightens, up to ~60% toward the target. Used so the admin's
   "accent brightness" slider can fine-tune the shade for light vs dark mode. */
window.toneAccent = function (hex, tone) {
  try {
    if (typeof tone !== 'number') tone = 50;
    hex = (hex || '#c8e856').trim();
    const m = hex.replace('#', '');
    const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
    let r = parseInt(f.slice(0, 2), 16), g = parseInt(f.slice(2, 4), 16), b = parseInt(f.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    const amt = Math.min(1, Math.abs(tone - 50) / 50) * 0.6;
    const t = tone < 50 ? 0 : 255;
    const h = (n) => Math.round(n + (t - n) * amt).toString(16).padStart(2, '0');
    return '#' + h(r) + h(g) + h(b);
  } catch (e) { return hex || '#c8e856'; }
};

/* Color-changing favicons. Two distinct dynamic marks, both tint to the live
   accent:
   - buildFavicon (PORTFOLIO): a pixel "AD" monogram that ALSO follows light/dark
     mode — light: accent tile + dark initials; dark: dark tile + accent initials.
   - buildOsWindowFavicon (ADMIN): the retro terminal window — dark tile, accent
     window with traffic-light "close" dots and a >_ prompt.
   The portfolio and admin consoles each apply their own. */
window.buildFavicon = function (accent, theme) {
  // Pixel "AD" monogram (run-length merged + crispEdges so it stays sharp).
  // 6-wide glyphs with 2px stems but single-pixel bars — bold, not heavy.
  const A = ['011110', '110011', '110011', '111111', '110011', '110011', '110011'];
  const D = ['111110', '110011', '110011', '110011', '110011', '110011', '111110'];
  const p = 2, y0 = 9;
  let cells = '';
  const draw = (g, ox) => {
    for (let row = 0; row < g.length; row++) {
      let c = 0;
      while (c < g[row].length) {
        if (g[row][c] === '1') {
          let run = 1;
          while (c + run < g[row].length && g[row][c + run] === '1') run++;
          cells += "%3Crect x='" + (ox + c * p) + "' y='" + (y0 + row * p) + "' width='" + (run * p) + "' height='" + p + "'/%3E";
          c += run;
        } else c++;
      }
    }
  };
  draw(A, 3); draw(D, 3 + 7 * p);
  // Mode-dynamic: dark mode = dark tile + accent initials; light mode = accent
  // tile + dark initials.
  const dark = theme !== 'light';
  const tile = encodeURIComponent(dark ? '#0c0d0a' : (accent || '#c8e856'));
  const ink = encodeURIComponent(dark ? (accent || '#c8e856') : '#0c0d0a');
  return "data:image/svg+xml,"
    + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' shape-rendering='crispEdges'%3E"
    + "%3Crect width='32' height='32' rx='7' fill='" + tile + "'/%3E"
    + "%3Cg fill='" + ink + "'%3E" + cells + "%3C/g%3E"
    + "%3C/svg%3E";
};
window.buildOsWindowFavicon = function (accent) {
  const a = encodeURIComponent(accent || '#c8e856');
  return "data:image/svg+xml,"
    + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
    + "%3Crect width='32' height='32' rx='7' fill='%230c0d0a'/%3E"           // dark tile
    + "%3Crect x='6' y='7' width='20' height='18' rx='3' fill='" + a + "'/%3E" // accent window
    + "%3Crect x='7.6' y='12.4' width='16.8' height='11' rx='1.6' fill='%230c0d0a'/%3E" // body
    + "%3Ccircle cx='9.5' cy='9.7' r='1.05' fill='%230c0d0a'/%3E"            // close dots
    + "%3Ccircle cx='12.7' cy='9.7' r='1.05' fill='%230c0d0a'/%3E"
    + "%3Ccircle cx='15.9' cy='9.7' r='1.05' fill='%230c0d0a'/%3E"
    + "%3Cpath d='M10.3 16.4l2.2 1.9-2.2 1.9' fill='none' stroke='" + a + "' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E" // prompt
    + "%3Crect x='14' y='19.4' width='4.6' height='1.5' rx='.75' fill='" + a + "'/%3E"
    + "%3C/svg%3E";
};
window.applyFavicon = function (accent, kind, theme) {
  try {
    const build = kind === 'os-window' ? window.buildOsWindowFavicon : window.buildFavicon;
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'icon'); document.head.appendChild(link); }
    link.setAttribute('href', build(accent, theme));
  } catch (e) { /* non-fatal */ }
};

/* Apply core cosmetics to the document root synchronously, before React (and
   the boot splash) first paints — so the splash and first frame already use the
   published accent/theme instead of flashing the hardcoded default. The App
   re-applies these reactively as the live snapshot streams in. */
try {
  const _cos = (PORTFOLIO_CONTENT && PORTFOLIO_CONTENT.cosmetics) || {};
  const _root = document.documentElement;
  const _toned = window.toneAccent(_cos.accent || '#c8e856', typeof _cos.accentTone === 'number' ? _cos.accentTone : 50);
  _root.style.setProperty('--accent-raw', _toned);
  if (_cos.cursorColor || _cos.accent) _root.style.setProperty('--cursor-color', _cos.cursorColor || _toned);
  if (typeof _cos.fontScale === 'number') _root.style.setProperty('--font-scale', (_cos.fontScale / 100).toString());
  if (typeof _cos.glow === 'number') _root.style.setProperty('--glow', (_cos.glow / 100).toString());
  _root.dataset.scanlines = _cos.scanlines === false ? 'off' : 'on';
  if (_cos.type && _cos.type !== 'default') _root.dataset.type = _cos.type;
  if (_cos.headingFont && _cos.headingFont !== 'match') _root.dataset.heading = _cos.headingFont;
  if (_cos.tracking && _cos.tracking !== 'normal') _root.dataset.tracking = _cos.tracking;
  if (_cos.bgPattern) _root.dataset.bg = _cos.bgPattern;
  if (_cos.radius && _cos.radius !== 'soft') _root.dataset.radius = _cos.radius;
  // In the admin preview iframe the published default mode should always show;
  // otherwise honour an explicit visitor choice, else fall back to the default.
  let _isPreview = false;
  try { _isPreview = new URLSearchParams(location.search).has('adminpreview'); } catch (e) {}
  const _explicit = localStorage.getItem('amritos.theme.explicit') === '1';
  if (_cos.theme && (_isPreview || !_explicit)) {
    _root.dataset.theme = _cos.theme === 'light' ? 'light' : 'dark';
  }
  window.applyFavicon(_toned, null, _root.dataset.theme === 'light' ? 'light' : 'dark');
} catch (e) { /* non-fatal */ }
window.mergeContent = (over) => _withExperienceNorm(over ? _deepMerge(PORTFOLIO_DEFAULTS, over) : JSON.parse(JSON.stringify(PORTFOLIO_DEFAULTS)));

/* Live content subscription. If Firebase is present (and we're not inside the
   admin's preview iframe, which is driven by localStorage), stream
   content/published and invoke cb(mergedContent) on every change. Returns an
   unsubscribe fn. No-op (returns null) when Firebase isn't loaded. */
window.subscribeContent = function (cb) {
  try {
    const inPreview = new URLSearchParams(location.search).has('adminpreview');
    if (inPreview) {
      // Live preview: the admin console (often a *different origin*, where
      // localStorage isn't shared) streams the current draft/published snapshot
      // to this iframe via postMessage. Apply each one so theme, accent, fonts
      // and content update in real time before publishing — no reload, and no
      // reverting to the last published copy.
      const handler = (ev) => {
        const d = ev && ev.data;
        if (d && d.type === 'amritos:preview' && d.content) cb(window.mergeContent(d.content));
      };
      window.addEventListener('message', handler);
      // Tell the parent we're ready so it pushes the first snapshot immediately.
      try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'amritos:preview-ready' }, '*'); } catch (e) {}
      return () => window.removeEventListener('message', handler);
    }
    if (!window.fb || !window.fb.db) return null;
    return window.fb.db.doc('content/published').onSnapshot((snap) => {
      if (!snap.exists) return;
      const data = snap.data() || {};
      const payload = data.content || data;           // tolerate {content:{...}} or flat
      try { localStorage.setItem(LIVE_CACHE, JSON.stringify(payload)); } catch (e) {}
      cb(window.mergeContent(payload));
    }, (err) => console.warn('[content] live subscribe failed', err && err.message));
  } catch (e) { return null; }
};

/* Back-compat shim: portfolio app.jsx still destructures from PORTFOLIO_DATA. */
window.PORTFOLIO_DATA = {
  EXPERIENCE: PORTFOLIO_CONTENT.experience,
  EXPERTISE:  PORTFOLIO_CONTENT.expertise,
  PROJECTS:   PORTFOLIO_CONTENT.projects,
  SOCIALS:    (PORTFOLIO_CONTENT.contact && PORTFOLIO_CONTENT.contact.socials) || SOCIALS,
};

/* =====================================================
   HOOKS
   ===================================================== */

function useTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useReveal() {
  // Reveal logic now lives as a vanilla one-shot observer at the bottom of index.html
  // so re-renders don't cycle the observer. This hook is kept for compat but is a no-op.
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map(id => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(e.target.id);
      });
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0.1 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [ids.join(',')]);
  return active;
}

window.PORTFOLIO_HOOKS = { useTime, useReveal, useActiveSection };
