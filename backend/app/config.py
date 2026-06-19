from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://loanuser:loanpass@db:5432/loandb"
    UPLOAD_DIR: str = "uploads"
    SECRET_KEY: str = "supersecret-money-lending-key-2024"
    DEFAULT_INTEREST_RATE: float = 3.0  # 3% monthly

    class Config:
        env_file = ".env"

settings = Settings()
