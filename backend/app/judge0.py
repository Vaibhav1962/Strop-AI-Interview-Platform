import base64

import httpx

from app.config import get_settings

settings = get_settings()

# Judge0 language IDs for our self-hosted instance (v1.13.1). Only these four
# languages are wired up; extend both this map and the frontend's language
# list together when adding more.
LANGUAGE_IDS: dict[str, int] = {
    "C++": 54,  # C++ (GCC 9.2.0)
    "Java": 62,  # Java (OpenJDK 13.0.1)
    "JavaScript": 63,  # JavaScript (Node.js 12.14.0)
    "Python": 71,  # Python (3.8.1)
}


class Judge0Error(Exception):
    pass


def _b64(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def _unb64(text: str | None) -> str | None:
    if text is None:
        return None
    return base64.b64decode(text).decode("utf-8", errors="replace")


async def execute_code(language: str, source_code: str, stdin: str) -> dict:
    language_id = LANGUAGE_IDS.get(language)
    if language_id is None:
        raise Judge0Error(f"Unsupported language: {language}")

    payload = {
        "language_id": language_id,
        "source_code": _b64(source_code),
        "stdin": _b64(stdin),
    }
    headers = {"X-Auth-Token": settings.judge0_auth_token}

    async with httpx.AsyncClient(timeout=25.0) as client:
        try:
            response = await client.post(
                f"{settings.judge0_url}/submissions",
                params={"base64_encoded": "true", "wait": "true"},
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
        except httpx.TimeoutException:
            raise Judge0Error("Code execution timed out waiting for worker response.")
        except httpx.HTTPError:
            raise Judge0Error("The code execution service is temporarily unavailable.")

    data = response.json()

    return {
        "stdout": _unb64(data.get("stdout")),
        "stderr": _unb64(data.get("stderr")),
        "compile_output": _unb64(data.get("compile_output")),
        "message": _unb64(data.get("message")),
        "status": (data.get("status") or {}).get("description"),
        "time": data.get("time"),
        "memory": data.get("memory"),
    }
