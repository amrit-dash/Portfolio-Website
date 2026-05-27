export const defaultContent = {
  meta: {
    defaultTheme: "dark",
    accent: "#38f8b6",
    font: "Inter",
    cv: {
      light: "assets/amrit-dash-cv-light-2025.pdf",
      dark: "assets/amrit-dash-cv-dark-2025.pdf"
    }
  },
  profile: {
    name: "Amrit Dash",
    role: "AI & Automation Engineer",
    headline: "I automate the boring parts, wire AI into real workflows, and build tools that actually ship.",
    summary: "Software Engineer with 5 years of experience implementing automation projects across Make.com, Zapier, n8n, Google Apps Script, Firebase, Flutter, React/TypeScript, and LLM agents with RAG. Currently driving automation at Contour Education while still building apps, bots, dashboards, and comedy-adjacent experiments.",
    about: "I started in consulting and cash application automation, moved into script and business automation roles, and now focus on practical AI plus automation systems. My working style is fail-first and fix-fast: understand the real-world workflow, automate the sharp edges, then keep iterating until the solution is maintainable for the people using it. Outside work, stand-up comedy, travel, food, tech DIY, gaming, and magic keep me curious.",
    tags: ["Make.com", "Zapier", "n8n", "Google Apps Script", "Firebase", "LLM agents", "Dart & Flutter", "React + TypeScript"],
    stats: [
      { value: "5+", label: "years implementing automation" },
      { value: "150+", label: "comics served by a WhatsApp bot" },
      { value: "4", label: "Make Automation Expert levels" },
      { value: "8.0", label: "IELTS score" }
    ]
  },
  skills: [
    "Google Apps Script", "Automation platforms", "Make.com", "Zapier", "n8n", "CRMs", "Monday.com", "HubSpot", "Node.js", "SQL", "C & C++", "Bot development", "WhatsApp & Twilio Flow", "Actions on Google", "LLM agents with RAG", "Dart & Flutter", "Firebase Tools", "Web development", "Client communication", "Shopify Liquid", "HTML", "CSS", "JavaScript", "Java", "React", "TypeScript"
  ],
  experience: [
    {
      company: "Contour Education",
      role: "Automation Engineer",
      timeframe: "08/2025 - Present",
      primary: true,
      summary: "Driving end-to-end automation of student onboarding, class allocation, attendance tracking, and parent-student communication.",
      bullets: ["Build workflows with Make.com, Zapier, n8n, and Google Apps Script.", "Support core CRM operations on Monday.com.", "Turn manual education operations into repeatable, observable automation systems."]
    },
    {
      company: "Freelance / Project-based roles",
      role: "Freelance Software Engineer",
      timeframe: "09/2024 - 07/2025",
      summary: "Built apps, AI tools, Shopify components, and communication bots across multiple clients and agencies.",
      bullets: ["Flutter Developer for CDT Koraput, building Coffee Mapper for coffee plantation tracking.", "AI Engineer with BeGig on a custom LLM chatbot with RAG integration.", "Shopify Developer for Kunsquad and other ecommerce widget work.", "Software Developer for Nothing Bot Comedy, a WhatsApp bot for comedy spot curation."]
    },
    {
      company: "Axelerant Technologies",
      role: "Business Automation Engineer",
      timeframe: "07/2023 - 08/2024",
      summary: "Developed business process automation with Make, Zapier, Apps Script, Zoho Automations, and related platforms.",
      bullets: ["Automated employee onboarding, appraisal, and offboarding systems.", "Maintained and optimized existing automations for reliability and cost efficiency.", "Worked across internal teams to replace manual operational workflows."]
    },
    {
      company: "HighRadius Corporation",
      role: "Script Automation Team Lead",
      timeframe: "07/2022 - 06/2023",
      summary: "Led Apps Script Automation Projects for consultant productivity and team operations.",
      bullets: ["Moved into the technical development team through SQL and automation skills.", "Built tools for project management, team management, and faster data gathering.", "Managed two resources for Bureau Veritas CAA implementation."]
    },
    {
      company: "HighRadius Corporation",
      role: "Cash Application Automation Consultant",
      timeframe: "2021 - 2022",
      summary: "Implemented CAA projects for enterprise clients after receiving a PPO during internship.",
      bullets: ["Worked with Bank of America clients to provide faster automation implementations.", "Implemented projects for Zurich Insurance, CrediQ, Heritage Crystal Clean, and Bureau Veritas.", "Received Highflyer Intern Of The Quarter and Star Team recognition."]
    }
  ],
  projects: [
    {
      title: "GenkiFlow IDE",
      category: "Next.js + Genkit AI IDE",
      color: "#38f8b6",
      description: "A browser-based IDE that embeds Google Genkit AI capabilities directly into the editor, with code generation, refactoring, summarization, multi-tab editing, and persistent browser storage.",
      tags: ["Genkit", "Next.js", "AI coding", "Web IDE"],
      links: []
    },
    {
      title: "Coffee Mapper",
      category: "Flutter Android App",
      color: "#ffd166",
      description: "An Android app for Coffee Development Trust, Koraput, used by field agents to log in, track coffee plantations across regions, and capture region-specific plantation details.",
      tags: ["Flutter", "Android", "Field operations"],
      links: [
        { label: "Play Store", url: "https://play.google.com/store/apps/details?id=com.coffee.mapper" },
        { label: "GitHub", url: "https://github.com/amrit-dash/coffee-mapper-android" }
      ]
    },
    {
      title: "Coffee Mapper Dashboard",
      category: "Flutter Web Dashboard",
      color: "#8bd3ff",
      description: "A web dashboard for tracked plantation regions, map-based views, and admin report generation for Coffee Mapper data.",
      tags: ["Flutter Web", "Dashboard", "Maps"],
      links: [
        { label: "Website", url: "https://coffee-mapper-dashboard.web.app" },
        { label: "GitHub", url: "https://github.com/amrit-dash/coffee-mapper-web" }
      ]
    },
    {
      title: "Nothing BOT Comedy",
      category: "WhatsApp Bot Project",
      color: "#ff8bd2",
      description: "A WhatsApp bot for managing comedy club spot curation in Bangalore, serving more than 150 comics who checked weekly availability through chat.",
      tags: ["WhatsApp", "Twilio", "Apps Script"],
      links: [
        { label: "Text the bot", url: "https://wa.me/message/OGQRIVZ7W7JAN1" },
        { label: "GitHub", url: "https://github.com/amrit-dash/Nothing-BOT-Comedy" }
      ]
    },
    {
      title: "Kunsquad Website",
      category: "Shopify Liquid Project",
      color: "#baff7a",
      description: "Custom pages and widget assets built with Shopify Liquid for an ecommerce startup based out of Bhubaneswar.",
      tags: ["Shopify Liquid", "Ecommerce", "Custom widgets"],
      links: [
        { label: "About page", url: "https://www.kunsquad.com/pages/about-us" },
        { label: "Team page", url: "https://www.kunsquad.com/pages/our-team" }
      ]
    },
    {
      title: "ASAP - CG",
      category: "Apps Script Automation Project",
      color: "#c7a6ff",
      description: "Apps Script Automation Project - Customer Grouping, a fuzzy customer grouping tool that recommends similar-sounding customer groups and exposes a Firebase-hosted web interface.",
      tags: ["Apps Script", "Google Sheets", "Firebase"],
      links: [
        { label: "Documentation", url: "https://docs.google.com/document/d/1omFaGxy4gHuwoJK1VQ7cvItkUfbLBPELfN9nB-xFVB8/edit?usp=sharing" },
        { label: "Website", url: "https://fuzzy-customer-group-generator.firebaseapp.com" }
      ]
    },
    {
      title: "Make Automation Projects",
      category: "Make.com Automations",
      color: "#ff9f6e",
      description: "Automation scenarios across Make.com, Google Apps Script, Slack, and ChatGPT, including DSM bot workflows and cricket prediction plus engagement automations.",
      tags: ["Make.com", "Apps Script", "Slack", "ChatGPT"],
      links: [{ label: "GitHub", url: "https://github.com/amrit-dash/Make-Automation-Projects" }]
    },
    {
      title: "Miss Lily",
      category: "Actions on Google",
      color: "#7df4ff",
      description: "A personal health-mate built on Actions on Google to help users lead healthier lives, fight disease, and schedule medicines.",
      tags: ["Actions on Google", "Voice UX", "Health assistant"],
      links: []
    },
    {
      title: "Ms. BOOKERS'",
      category: "Actions on Google Ecommerce",
      color: "#f7d36a",
      description: "A complete e-commerce presence for a book rental startup using Actions on Google, later sold with its associated user base.",
      tags: ["Actions on Google", "Ecommerce", "Startup"],
      links: []
    },
    {
      title: "DSC KIIT App",
      category: "Flutter Android App",
      color: "#8df0a6",
      description: "A Flutter app built to operate internal work for Developer Student Club KIIT.",
      tags: ["Flutter", "Android", "Community"],
      links: []
    }
  ],
  education: {
    title: "Bachelor of Technology, KIIT University",
    timeframe: "04/2017 - 04/2021",
    details: ["Course: Computer Science and Engineering", "CGPA: 7.90", "IELTS: 8.0", "GRE: 306.5"]
  },
  credentials: {
    certifications: [
      "Make Automation Expert - Levels 1 to 4 (07/2024 - 07/2026)",
      "Google Cloud Essentials",
      "Build Interactive Apps with Google Assistant",
      "Machine Learning APIs",
      "Kubernetes in Google Cloud",
      "Leadership Axelerator Program - Effective listening, empathy, acceptance, and leading with integrity"
    ],
    achievements: [
      "AIR 1 in Digit CTC VI, India's cryptic hunt event by Digit.",
      "Runner-up at Run IO Hackathon by NIT Rourkela.",
      "Tech speaker for Actions on Google sessions at IIIT Bhubaneswar, CVRCE, and DevExpo.",
      "Highflyer Intern Of The Quarter and Star Team Award at HighRadius."
    ],
    communities: ["Google Developers Group, BBSR - Volunteer", "Developer Student Club KIIT - Core Team Member", "HackDAV - organizer for India's first high school level hackathon", "United Nations Population Fund internship (07/2019 - 08/2019)"]
  },
  contact: {
    copy: "I am open to automation engineering, AI workflow, Firebase, Flutter, dashboard, and bot projects - or a good conversation about comedy and weird product ideas.",
    links: [
      { label: "Email", url: "mailto:amrit.dash60@gmail.com" },
      { label: "Phone", url: "tel:+917978416962" },
      { label: "WhatsApp", url: "https://wa.me/917978416962?text=Hey!" },
      { label: "LinkedIn", url: "https://linkedin.com/in/amritdash60" },
      { label: "GitHub", url: "https://github.com/the-AoG-guy" },
      { label: "Instagram", url: "https://www.instagram.com/_amrit_dash_" },
      { label: "About.me", url: "https://about.me/amritdash" },
      { label: "Website", url: "https://amritdash.web.app" }
    ]
  }
};
