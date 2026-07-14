@echo off
REM Launch the Trello MCP server, reading credentials straight from the Windows
REM registry (HKCU\Environment) instead of the process environment. This bypasses
REM the Windows OpenSSH sshd env cache, which does not serve setx vars added after
REM the sshd service last started. No secret is stored in this file.
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v TRELLO_API_KEY 2^>nul') do set "TRELLO_API_KEY=%%B"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v TRELLO_TOKEN 2^>nul') do set "TRELLO_TOKEN=%%B"
npx -y @delorenj/mcp-server-trello
