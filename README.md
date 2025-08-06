
<img width="1852" height="1738" alt="CleanShot 2025-08-06 at 16 05 16@2x" src="https://github.com/user-attachments/assets/35c7300f-6e5f-4d08-a298-f3ad2482fc5e" />

# Kagi Search MCP

A Playwright-based Node.js tool that execute Kagi searches without API access. Suitable for people with a paid Kagi plan for a better web search experience.

Kagi is a privacy-focused, ad-free search engine that delivers high-quality search results. This tool can be used directly as a command-line tool or as a Model Context Protocol (MCP) server to provide real-time search capabilities to AI assistants like Claude.

## Prerequisites

NOTE: This tool assumes you have a paid plan from kagi.com!

Before using this tool, you need to obtain a Kagi search token:

1. Visit [Kagi.com](https://kagi.com) and log in to your account
2. On the main page, click on the hamburger icon on the top right corner, navigate to "Session Link" below the pop-up menu, click "Copy".
3. Paste your Session link to a safe place. It may look like https://kagi.com/search?token=xxxx, where "xxxx" refers to your unique token. Copy this token for later use. Please follow Kagi's rules and keep this token secure as it provides access to your Kagi search quota. 

## Installation

```bash
# Install from source
git clone https://github.com/web-agent-master/kagi-search.git
cd kagi-search

# Create a .env file and fill in your kagi token. 
echo "KAGI_TOKEN={YOUR_KAGI_TOKEN_HERE}" > .env
# Change YOUR_KAGI_TOKEN_HERE to your token

# Install dependencies
npm install
# Or using yarn
yarn
# Or using pnpm
pnpm install

# Compile TypeScript code
npm run build
# Or using yarn
yarn build
# Or using pnpm
pnpm build

# Link package globally (required for MCP functionality)
npm link
# Or using yarn
yarn link
# Or using pnpm
pnpm link
```

## ⚠️ Security Considerations

**Before uploading to GitHub or sharing this project:**

1. **Clean all state files**: Run `npm run clean:all` to remove browser state and cached authentication
2. **Verify .gitignore**: Ensure sensitive files are properly excluded
3. **Check for sensitive data**: Never commit `.env` files or browser state files

## Usage

### Command Line Tool

```bash
# Direct command line usage
kagi-search "search keywords"

# Using command line options
kagi-search --limit 5 --timeout 60000 --no-headless "search keywords"

# Or using npx
npx kagi-search-cli "search keywords"
```

#### Output Example

```json
{
  "query": "youtube",
  "results": [
    {
      "title": "YouTube",
      "link": "https://www.youtube.com/",
      "snippet": ""
    },
    {
      "title": "💭 Copyparty - YouTube",
      "link": "https://waylonwalker.com//thoughts-767",
      "snippet": ""
    },
    {
      "title": "YouTube - Wikipedia",
      "link": "https://en.wikipedia.org/wiki/YouTube",
      "snippet": ""
    },
    {
      "title": "YouTube Kids",
      "link": "https://www.youtubekids.com/?hl=en-GB",
      "snippet": ""
    },
    // more results...
  ]
}
```

### MCP Server

This project provides Model Context Protocol (MCP) server functionality, allowing AI assistants like Claude to directly use Kagi search capabilities. MCP is an open protocol that enables AI assistants to safely access external tools and data.

```bash
# Build the project
pnpm build
```

#### Integration

I've only tested this with Cherry studio, so any update on typical mcp clients like Claude Desktop / VScode / Cursor would be appreciated.

```JSON
{
  "mcpServers": {
    "kagi-search": {
      "command": "node",
      "args": [
        "your/path/to/kagi-search-mcp/dist/src/mcp-server.js"
      ],
      "env": {
        "KAGI_TOKEN": "your_kagi_token_here"
      }
    }
  }
}
```

### Final Note

This project is a fork of google-search, and I have remixed it mainly for personal use as a passionate Kagi fan. I am not a professional programmer, and this is still a work in progress, so any contributions would be appreciated.

If this project violates any rights of Kagi, please inform me, and I will take it down if I receive such a message. That said, due to the nature of the project, it cannot tolerate heavy usage, and I have not tested it beyond my regular personal searching purposes. As long as you use it in a regular way like me, it should not be an issue.
