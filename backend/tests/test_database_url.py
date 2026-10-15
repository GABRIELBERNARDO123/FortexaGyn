from app.core.config import Settings


def test_database_url_safely_encodes_reserved_credential_characters():
    settings = Settings(
        POSTGRES_USER="fitpro app",
        POSTGRES_PASSWORD="p@ss:/%word?x#y",
        POSTGRES_DB="fitpro",
        POSTGRES_HOST="db",
        POSTGRES_PORT=5432,
        SECRET_KEY="test-only-secret-key-long-enough-32chars",
        ENV="testing",
    )
    url = settings.database_url
    assert url.username == "fitpro app"
    assert url.password == "p@ss:/%word?x#y"
    assert url.host == "db" and url.database == "fitpro"
    rendered = url.render_as_string(hide_password=False)
    assert "p%40ss%3A%2F%25word%3Fx%23y" in rendered
