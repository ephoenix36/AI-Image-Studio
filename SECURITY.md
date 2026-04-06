# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x.x  | ✅        |
| < 1.0.0 | ❌       |

## Architecture Security Notes

AI Image Studio is a **client-side only** static web application. There is no backend server, database, or user data collection.

- **API keys** are stored exclusively in the user's browser `localStorage` and are only transmitted directly to Google's AI API endpoints.
- **No telemetry, analytics, or tracking** of any kind is included.
- **No cookies** are set by the application.
- Generated images exist only in browser memory during the session.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following channels:

1. **GitHub Security Advisories:** Use the "Report a vulnerability" button on the [Security tab](https://github.com/ephoenix36/AI-Image-Studio/security) of this repository.
2. **Email:** Open a private security advisory on GitHub.

### What to include

- Type of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Resolution timeline:** Communicated after assessment

### Disclosure policy

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). We will work with you to understand and address the issue before any public disclosure.
