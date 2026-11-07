# Import every model module here so its table is registered on `Base.metadata`
# before Alembic autogenerate or `Base.metadata.create_all` run.
from app.models.interview_session import InterviewSession  # noqa: F401
from app.models.orchestrator_session import OrchestratorSession  # noqa: F401
from app.models.question import Question  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.user_profile import UserProfile  # noqa: F401
