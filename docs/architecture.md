# Architecture

Smart WAF runs as a reverse proxy in front of a backend application. Requests are parsed into the 14-field WAF model, static assets are forwarded directly, and dynamic requests are sent to the AI engine with a short timeout. High-confidence malicious responses are blocked locally. Low-confidence responses are stored for human review.
