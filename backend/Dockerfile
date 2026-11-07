FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Run as an unprivileged user: a bug in the app must not be root inside the container.
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin app
COPY --chown=app:app . .
USER app

EXPOSE 8000

# Production command: no --reload. docker-compose overrides this with --reload for local development.
# Behind a reverse proxy add: --proxy-headers --forwarded-allow-ips=<proxy address>
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
