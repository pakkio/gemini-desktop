export const serviceConfigs = {
  "aws-kb-retrieval": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-aws-kb-retrieval"],
    env: {
      AWS_ACCESS_KEY_ID: "",
      AWS_SECRET_ACCESS_KEY: "",
      AWS_REGION: "",
    },
  },
  "brave-search": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: {
      BRAVE_API_KEY: "",
    },
  },
  everart: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-everart"],
    env: {
      EVERART_API_KEY: "",
    },
  },
  everything: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-everything"],
  },
  filesystem: {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/Users/username/Desktop",
      "/path/to/other/allowed/dir",
    ],
  },
  github: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: "",
    },
  },
  gdrive: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gdrive"],
  },
  "google-maps": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-google-maps"],
    env: {
      GOOGLE_MAPS_API_KEY: "",
    },
  },
  postgres: {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-postgres",
      "postgresql://localhost/mydb",
    ],
  },
  puppeteer: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
  },
  redis: {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-redis",
      "redis://localhost:6379",
    ],
  },
  "sequential-thinking": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
  },
  slack: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    env: {
      SLACK_BOT_TOKEN: "",
      SLACK_TEAM_ID: "",
      SLACK_CHANNEL_IDS: "",
    },
  },
  memory: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
  },
  gitlab: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    env: {
      GITLAB_PERSONAL_ACCESS_TOKEN: "",
      GITLAB_API_URL: "",
    },
  },
  "21st-dev/magic": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@21st-dev/magic@latest"],
    env: {
      API_KEY: "",
    },
  },
  agentql: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "agentql-mcp"],
    env: {
      AGENTQL_API_KEY: "",
    },
  },
  agentrpc: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "agentrpc", "mcp"],
    env: {
      AGENTRPC_API_SECRET: "",
    },
  },
  "actors-mcp-server": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@apify/actors-mcp-server"],
    env: {
      APIFY_TOKEN: "",
    },
  },
  "astra-db-mcp": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@datastax/astra-db-mcp"],
    env: {
      ASTRA_DB_APPLICATION_TOKEN: "",
      ASTRA_DB_API_ENDPOINT: "",
    },
  },
  "Azure MCP Server": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@azure/mcp@latest", "server", "start"],
  },
  bankless: {
    thirdParty: true,
    command: "npx",
    args: ["@bankless/onchain-mcp"],
    env: {
      BANKLESS_API_TOKEN: "",
    },
  },
  chargebee: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@chargebee/mcp"],
  },
  "circleci-mcp-server": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@circleci/mcp-server-circleci"],
    env: {
      CIRCLECI_TOKEN: "",
      CIRCLECI_BASE_URL: "", // Optional - required for on-prem customers only
    },
  },
  cloudflare: {
    thirdParty: true,
    command: "npx",
    args: ["mcp-remote", "https://observability.mcp.cloudflare.com/sse"],
  },
  codacy: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@codacy/codacy-mcp"],
    env: {
      CODACY_ACCOUNT_TOKEN: "",
    },
  },
  convex: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "convex@latest", "mcp", "start"],
  },
  dart: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "dart-mcp-server"],
    env: {
      DART_TOKEN: "",
    },
  },
  "e2b-server": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@e2b/mcp-server"],
    env: {
      E2B_API_KEY: "",
    },
  },
  edubase: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@smithery/cli"],
    env: {
      EDUBASE_API_URL: "https://domain.edubase.net/api",
      EDUBASE_API_APP: "",
      EDUBASE_API_KEY: "",
    },
  },
  "elasticsearch-mcp-server": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@elastic/mcp-server-elasticsearch"],
    env: {
      ES_URL: "",
      ES_API_KEY: "",
    },
  },
  exa: {
    thirdParty: true,
    command: "npx",
    args: ["/path/to/exa-mcp-server/build/index.js"],
    env: {
      EXA_API_KEY: "",
    },
  },
  "fibery-mcp-server": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@smithery/cli"],
  },
  "firecrawl-mcp": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "firecrawl-mcp"],
    env: {
      FIRECRAWL_API_KEY: "",
    },
  },
  gitee: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@gitee/mcp-gitee@latest"],
    env: {
      GITEE_API_BASE: "https://gitee.com/api/v5",
      GITEE_ACCESS_TOKEN: "",
    },
  },
  "gyazo-mcp-server": {
    thirdParty: true,
    command: "npx",
    args: ["@notainc/gyazo-mcp-server"],
    env: {
      GYAZO_ACCESS_TOKEN: "",
    },
  },
  graphlit: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "graphlit-mcp-server"],
    env: {
      GRAPHLIT_ORGANIZATION_ID: "",
      GRAPHLIT_ENVIRONMENT_ID: "",
      GRAPHLIT_JWT_SECRET: "",
    },
  },
  heroku: {
    thirdParty: true,
    command: {
      path: "npx",
      args: ["-y", "@heroku/mcp-server"],
    },
    env: {
      HEROKU_API_KEY: "",
    },
  },
  hyperbrowser: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "hyperbrowser-mcp"],
    env: {
      HYPERBROWSER_API_KEY: "",
    },
  },
  "integration-app-hubspot": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@integration-app/mcp-server"],
    env: {
      INTEGRATION_APP_TOKEN: "",
      INTEGRATION_KEY: "",
    },
  },
  jetbrains: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@jetbrains/mcp-proxy"],
  },
  "lara-translate": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@translated/lara-mcp@latest"],
    env: {
      LARA_ACCESS_KEY_ID: "",
      LARA_ACCESS_KEY_SECRET: "",
    },
  },
  make: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@makehq/mcp-server"],
    env: {
      MAKE_API_KEY: "",
      MAKE_ZONE: "",
      MAKE_TEAM: "",
    },
  },
  supabase: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "lingo.dev", "mcp"],
    env: {
      API_KEY: "",
    },
  },
  momento: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@gomomento/mcp-momento"],
    env: {
      MOMENTO_API_KEY: "",
      MOMENTO_CACHE_NAME: "",
      DEFAULT_TTL_SECONDS: 60,
    },
  },
  Neon: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "mcp-remote", "https://mcp.neon.tech/sse"],
  },
  notionApi: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@notionhq/notion-mcp-server"],
    env: {
      OPENAPI_MCP_HEADERS: "",
    },
  },
  "oxylabs-mcp": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@smithery/cli@latest", "run", "@oxylabs/oxylabs-mcp"],
    env: {
      OXYLABS_USERNAME: "",
      OXYLABS_PASSWORD: "",
    },
  },
  paddle: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@paddle/paddle-mcp"],
    env: {
      API_KEY: "",
      ENVIRONMENT: "",
    },
  },
  paypal: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@paypal/mcp", "--tools=all"],
    env: {
      PAYPAL_ACCESS_TOKEN: "",
      PAYPAL_ENVIRONMENT: "",
    },
  },
  "perplexity-ask": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "server-perplexity-ask"],
    env: {
      PERPLEXITY_API_KEY: "",
    },
  },
  Prisma: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "prisma", "mcp"],
  },
  pinecone: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@pinecone-database/mcp"],
    env: {
      PINECONE_API_KEY: "",
    },
  },
  raygun: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@raygun.io/mcp-server-raygun"],
    env: {
      RAYGUN_PAT_TOKEN: "",
    },
  },
  rember: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@getrember/mcp"],
    env: {
      API_KEY: "",
    },
  },
  search1api: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "search1api-mcp"],
    env: {
      SEARCH1API_KEY: "",
    },
  },
  "tavily-mcp": {
    thirdParty: true,
    command: "npx",
    args: ["-y", "tavily-mcp@0.1.4"],
    env: {
      TAVILY_API_KEY: "",
    },
    disabled: false,
    autoApprove: [],
  },
  vectorize: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@vectorize-io/vectorize-mcp-server@latest"],
    env: {
      VECTORIZE_ORG_ID: "",
      VECTORIZE_TOKEN: "",
      VECTORIZE_PIPELINE_ID: "",
    },
  },
  xero: {
    thirdParty: true,
    command: "npx",
    args: ["-y", "@xeroapi/xero-mcp-server@latest"],
    env: {
      XERO_CLIENT_ID: "",
      XERO_CLIENT_SECRET: "",
    },
  },
};
