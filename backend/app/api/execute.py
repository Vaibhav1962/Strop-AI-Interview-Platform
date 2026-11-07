from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.api.rate_limiter import execute_limiter
from app.judge0 import Judge0Error, execute_code
from app.models.user import User
from app.schemas.execute import ExecuteRequest, ExecuteResponse

router = APIRouter(prefix="/execute", tags=["execute"])


@router.post("", response_model=ExecuteResponse)
async def execute(
    payload: ExecuteRequest,
    current_user: User = Depends(get_current_user),
) -> ExecuteResponse:
    # 1. Enforce per-user execution rate limits
    execute_limiter.check(str(current_user.id))

    # 2. Execute code via server-side Judge0 proxy
    try:
        result = await execute_code(payload.language, payload.source_code, payload.stdin)
    except Judge0Error as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return ExecuteResponse(**result)
