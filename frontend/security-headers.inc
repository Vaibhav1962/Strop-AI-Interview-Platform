# Included by every location (nginx drops inherited add_header lines when a location sets its own).
# Security headers. The CSP was checked against the real app, including the in-browser Python runner:
#  - 'wasm-unsafe-eval' + the two CDNs are for Pyodide and pdf.js
#  - connect-src allows any https API. Narrow it to your API origin once it is fixed, e.g.
#    connect-src 'self' https://api.example.com;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "microphone=(self), camera=(self), geolocation=(), payment=(), usb=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
