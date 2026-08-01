"""Shared config for ingest scripts — loads Turso credentials from env vars.

Usage:
  from _db_config import get_turso_config
  url, token = get_turso_config()

Or for HTTP API:
  from _db_config import get_http_config
  pipeline_url, headers = get_http_config()
"""

import os
import sys
from pathlib import Path


def _load_env_file():
    """Load .env file from project root or scripts/ directory.

    Looks for .env in:
      1. Current working directory
      2. Project root (parent of scripts/)
      3. /home/z/my-project/work/Panya-AI-final/

    Note: .env file values take precedence over shell env vars — this is
    intentional for ingest scripts that need the Turso DB URL, not whatever
    might be in the shell environment.
    """
    candidates = [
        Path.cwd() / '.env',
        Path(__file__).parent.parent / '.env',
        Path('/home/z/my-project/work/Panya-AI-final/.env'),
    ]
    for env_path in candidates:
        if not env_path.exists():
            continue
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#') or '=' not in line:
                        continue
                    key, _, value = line.partition('=')
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    # .env file takes precedence over shell env for ingest scripts
                    if key:
                        os.environ[key] = value
            return
        except Exception:
            continue


# Load .env on import
_load_env_file()


def get_turso_config():
    """Returns (url, token) tuple. Exits with error if not set."""
    url = os.environ.get('DATABASE_URL') or os.environ.get('TURSO_URL')
    token = os.environ.get('TURSO_AUTH_TOKEN') or os.environ.get('TURSO_TOKEN')

    if not url or not url.startswith('libsql://'):
        print('ERROR: DATABASE_URL or TURSO_URL must be set to a libsql:// URL', file=sys.stderr)
        print('Create a .env file with:', file=sys.stderr)
        print('  DATABASE_URL=libsql://your-db.turso.io', file=sys.stderr)
        print('  TURSO_AUTH_TOKEN=your-token-here', file=sys.stderr)
        sys.exit(1)

    if not token:
        print('ERROR: TURSO_AUTH_TOKEN or TURSO_TOKEN must be set', file=sys.stderr)
        print('Create a .env file with:', file=sys.stderr)
        print('  TURSO_AUTH_TOKEN=your-token-here', file=sys.stderr)
        sys.exit(1)

    return url, token


def get_http_config():
    """Returns (pipeline_url, headers_dict) for Turso HTTP API."""
    url, token = get_turso_config()
    # Convert libsql:// to https:// for HTTP API
    http_url = url.replace('libsql://', 'https://')
    pipeline_url = f"{http_url}/v2/pipeline"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    return pipeline_url, headers
