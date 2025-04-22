export const serviceConfigs = {
    "aws-kb-retrieval": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-aws-kb-retrieval"],
      env: {
        AWS_ACCESS_KEY_ID: "YOUR_ACCESS_KEY_HERE",
        AWS_SECRET_ACCESS_KEY: "YOUR_SECRET_ACCESS_KEY_HERE",
        AWS_REGION: "YOUR_AWS_REGION_HERE",
      },
    },
    "brave-search": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-brave-search"],
      env: {
        BRAVE_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
    "everart": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-everart"],
      env: {
        EVERART_API_KEY: "your_key_here",
      },
    },
    "everything": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-everything"],
    },
    "filesystem": {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop",
        "/path/to/other/allowed/dir",
      ],
    },
    "github": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
      },
    },
    "gdrive": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-gdrive"],
    },
    "google-maps": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-google-maps"],
      env: {
        GOOGLE_MAPS_API_KEY: "<YOUR_API_KEY>",
      },
    },
    "postgres": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"],
    },
    "puppeteer": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    },
    "redis": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-redis", "redis://localhost:6379"],
    },
    "sequential-thinking": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    },
    "slack": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-slack"],
      env: {
        SLACK_BOT_TOKEN: "xoxb-your-bot-token",
        SLACK_TEAM_ID: "T01234567",
        SLACK_CHANNEL_IDS: "C01234567, C76543210",
      },
    },
    "memory": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-memory"],
    },
    "gitlab": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-gitlab"],
      env: {
        GITLAB_PERSONAL_ACCESS_TOKEN: ,
        GITLAB_API_URL: "https://gitlab.com/api/v4",
      },
    },
  };
  