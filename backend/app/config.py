from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_WEAK_SECRET_MARKERS = ("change", "changeme", "secret", "password", "example", "default", "test", "12345")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "Strop API"
    api_v1_prefix: str = "/api/v1"
    # "production" turns on strict checks and hides the interactive API docs.
    environment: str = "development"
    database_url: str
    cors_origins: list[str] = ["http://localhost:5173"]
    # Only set true behind a reverse proxy you control; otherwise X-Forwarded-For is spoofable.
    trust_proxy_headers: bool = False

    secret_key: str
    algorithm: str = "HS256"
    # Access tokens are bearer tokens kept in the browser, so keep their lifetime short.
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    elevenlabs_api_key: str = ""
    gemini_api_key: str = ""
    qwen_api_key: str = ""
    groq_api_key: str = ""
    # Optional second key (another Groq account) used when the first is rate limited.
    groq2_api_key: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in ("production", "prod")

    @field_validator("secret_key")
    @classmethod
    def secret_key_must_be_long(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters (generate one with: openssl rand -hex 32)")
        return v

    @field_validator("cors_origins")
    @classmethod
    def no_wildcard_origin(cls, v: list[str]) -> list[str]:
        if any(o.strip() == "*" for o in v):
            raise ValueError("CORS_ORIGINS must list explicit origins, not '*'")
        return v

    @model_validator(mode="after")
    def production_checks(self) -> "Settings":
        if self.is_production:
            low = self.secret_key.lower()
            if any(m in low for m in _WEAK_SECRET_MARKERS):
                raise ValueError("SECRET_KEY looks like a placeholder; use a random value in production")
            if any(o.startswith("http://") and "localhost" not in o and "127.0.0.1" not in o for o in self.cors_origins):
                raise ValueError("CORS_ORIGINS must use https in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
