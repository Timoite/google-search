# Kagi Search Tool

A Playwright-based Node.js tool that provides access to Kagi search results, modified from web-agent-master's google-search. 

Kagi is a privacy-focused, ad-free search engine that delivers high-quality search results. This tool can be used directly as a command-line tool or as a Model Context Protocol (MCP) server to provide real-time search capabilities to AI assistants like Claude.

## Technical Features

- Developed with TypeScript, providing type safety and better development experience
- Browser automation based on Playwright, supporting multiple browser engines
- Command-line parameter support for search keywords
- MCP server support for AI assistant integration
- Returns search results with title, link, and snippet
- Option to retrieve raw HTML of search result pages for analysis
- JSON format output
- Support for both headless and headed modes (for debugging)
- Detailed logging output
- Robust error handling
- Environment variable support for secure token management

## Prerequisites

NOTE: This tool assumes you have a paid plan from kagi.com!

Before using this tool, you need to obtain a Kagi search token:

1. Visit [Kagi.com](https://kagi.com) and log in to your account
2. On the main page, click on the hamburger icon on the top right corner, navigate to "Session Link" below the pop-up menu, click "Copy".
3. Paste your Session link to a safe place. It may look like https://kagi.com/search?token=xxxx, where "xxxx" refers to your unique token. Copy this token for later use. Please follow Kagi's rules and keep this token secure as it provides access to your Kagi search quota. 
4. Clone the 

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

### Windows Environment Notes

NOTE: I've only tested this mcp server on mac. The below instruction comes from the original repository "google-search".

This tool has been specially adapted for Windows environments:

1. `.cmd` files are provided to ensure command-line tools work properly in Windows Command Prompt and PowerShell
2. Log files are stored in the system temporary directory instead of the Unix/Linux `/tmp` directory
3. Windows-specific process signal handling has been added to ensure proper server shutdown
4. Cross-platform file path handling is used to support Windows path separators

## Usage

### Command Line Tool

```bash
# Direct command line usage
kagi-search "search keywords"

# Using command line options
kagi-search --limit 5 --timeout 60000 --no-headless "search keywords"

# Or using npx
npx kagi-search-cli "search keywords"

# Run in development mode, not tested
pnpm dev "search keywords"

# Run in debug mode (showing browser interface), not tested
pnpm debug "search keywords"

# Get raw HTML of search result page, not tested
kagi-search "search keywords" --get-html

# Get HTML and save to file, not tested
kagi-search "search keywords" --get-html --save-html

# Get HTML and save to specific file, not tested
kagi-search "search keywords" --get-html --save-html --html-output "./output.html"
```

#### Command Line Options (not tested)

- `-l, --limit <number>`: Result count limit (default: 10)
- `-t, --timeout <number>`: Timeout in milliseconds (default: 60000)
- `--no-headless`: Show browser interface (for debugging)
- `--state-file <path>`: Browser state file path (default: ./browser-state.json)
- `--no-save-state`: Don't save browser state
- `--get-html`: Retrieve raw HTML of search result page instead of parsing results
- `--save-html`: Save HTML to file (used with --get-html)
- `--html-output <path>`: Specify HTML output file path (used with --get-html and --save-html)
- `-V, --version`: Display version number
- `-h, --help`: Display help information

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

#### Integration with Claude Desktop

1. **Ensure your `.env` file is set up** with your Kagi token (see Prerequisites & Installation section above)

2. Edit the Claude Desktop configuration file:
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
     - Usually located at `C:\Users\username\AppData\Roaming\Claude\claude_desktop_config.json`
     - You can access it directly by entering `%APPDATA%\Claude` in Windows Explorer address bar

3. Add server configuration and restart Claude

```json
{
  "mcpServers": {
    "kagi-search": {
      "command": "npx",
      "args": ["kagi-search"]
    }
  }
}
```

For Windows environments, you can also use the following configurations:

1. Using cmd.exe with npx:

```json
{
  "mcpServers": {
    "kagi-search": {
      "command": "cmd.exe",
      "args": ["/c", "npx", "kagi-searc"]
    }
  }
}
```

2. Using node with full path (recommended if you encounter issues with the above method):

```json
{
  "mcpServers": {
    "kagi-search": {
      "command": "node",
      "args": ["C:/path/to/your/kagi-search/dist/src/mcp-server.ts"]
    }
  }
}
```

Note: For the second method, you must replace `C:/path/to/your/kagi-search` with the actual full path to where you installed the kagi-search package.

After integration, you can directly use Kagi search functionality in Claude, such as "search for the latest AI research".

## Project Structure

```
kagi-search/
├── package.json          # Project configuration and dependencies
├── tsconfig.json         # TypeScript configuration
├── .env                  # Environment variables (Kagi token)
├── .env.example          # Environment variables template
├── src/
│   ├── index.ts          # Entry file (command line parsing and main logic)
│   ├── search.ts         # Search functionality implementation (Playwright browser automation)
│   ├── mcp-server.ts     # MCP server implementation
│   └── types.ts          # Type definitions (interfaces and type declarations)
├── dist/                 # Compiled JavaScript files
├── bin/                  # Executable files
│   └── kagi-search       # Command line entry script
├── README.md             # Project documentation
└── .gitignore            # Git ignore file
```

## Technology Stack

- **TypeScript**: Development language, providing type safety and better development experience
- **Node.js**: Runtime environment for executing JavaScript/TypeScript code
- **Playwright**: For browser automation, supporting multiple browsers
- **Commander**: For parsing command line arguments and generating help information
- **Model Context Protocol (MCP)**: Open protocol for AI assistant integration
- **MCP SDK**: Development toolkit for implementing MCP servers
- **Zod**: Schema definition library for validation and type safety
- **pnpm**: Efficient package management tool, saving disk space and installation time
- **dotenv**: Environment variable management for secure token storage

## Development Guide

All commands can be run in the project root directory:

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm run postinstall

# Set up environment variables
cp .env.example .env
# Edit .env file with your Kagi token

# Compile TypeScript code
pnpm build

# Clean compiled output
pnpm clean
```

### CLI Development

```bash
# Run in development mode
pnpm dev "search keywords"

# Run in debug mode (showing browser interface)
pnpm debug "search keywords"

# Run compiled code
pnpm start "search keywords"

# Test search functionality
pnpm test
```

### MCP Server Development

```bash
# Run MCP server in development mode
pnpm mcp

# Run compiled MCP server
pnpm mcp:build
```

## Error Handling

The tool has built-in robust error handling mechanisms:

- Friendly error messages when browser startup fails
- Automatic error status return for network connection issues
- Detailed logs for search result parsing failures
- Graceful exit and useful information return in timeout situations
- Token validation with clear error messages

## Notes

### General Notes

- This tool is for learning and research purposes only
- Please comply with Kagi's terms of service and policies
- Requires a valid Kagi token to function
- Keep your Kagi token secure and do not share it
- Do not send requests too frequently to avoid rate limiting

### State Files

- State files contain browser cookies and storage data, please keep them secure
- Using state files can improve search performance and reduce authentication overhead

### MCP Server

- MCP server requires Node.js v16 or higher
- Ensure your `.env` file with Kagi token is properly configured
- When using the MCP server, please ensure Claude Desktop is updated to the latest version
- When configuring Claude Desktop, use absolute paths to the MCP server file

### Windows-Specific Notes

- In Windows environments, you may need administrator privileges to install Playwright browsers for the first time
- If you encounter permission issues, try running Command Prompt or PowerShell as administrator
- Windows Firewall may block Playwright browser network connections; allow access when prompted
- Browser state files are saved by default in the user's home directory as `.kagi-search-browser-state.json`
- Log files are stored in the system temporary directory under the `kagi-search-logs` folder

## Comparison with Commercial SERP APIs

Compared to paid search engine results API services (such as SerpAPI), this project offers the following advantages:

- **Privacy-Focused**: Uses Kagi's privacy-first search engine
- **High-Quality Results**: Access to Kagi's ad-free, unbiased search results
- **Local Execution**: All searches are executed locally with your Kagi token
- **Customizability**: Fully open source, can be modified and extended as needed
- **MCP Integration**: Native support for integration with AI assistants like Claude
- **No Additional API Fees**: Use your existing Kagi subscription
