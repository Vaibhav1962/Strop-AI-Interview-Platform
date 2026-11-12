# Headers for the in-browser JavaScript runner (/sandbox/js-runner.js), which evaluates candidate code.
# Its own CSP is what makes that safe: the worker may eval, but the browser blocks every network request,
# script load and sub-resource from it (default-src 'none'), so candidate code cannot call out or exfiltrate.
add_header Content-Security-Policy "default-src 'none'; script-src 'unsafe-eval'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Cache-Control "public, max-age=0, must-revalidate" always;
