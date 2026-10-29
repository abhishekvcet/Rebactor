"""
GitHub App Authentication & Helper Utilities for Rebactor
Provides:
1. GitHub App JWT generation from App ID and private key (.pem)
2. Installation access token generation and caching
3. Fallback resolution order:
   - Specific user override token (header)
   - GitHub App Installation token (if configured)
   - Personal Access Token (GITHUB_TOKEN env if present)
   - Unauthenticated public mode (None)
"""

import os
import time
from typing import Optional, Dict, Any, Tuple
import httpx

try:
    import jwt
except ImportError:
    jwt = None

# In-memory cache for GitHub App installation tokens
# Key: installation_id -> {"token": str, "expires_at": float}
_APP_TOKEN_CACHE: Dict[int, Dict[str, Any]] = {}


def is_github_app_configured() -> bool:
    """Check if GitHub App environment variables are configured."""
    app_id = os.getenv("GITHUB_APP_ID")
    key_path = os.getenv("GITHUB_APP_PRIVATE_KEY_PATH")
    key_content = os.getenv("GITHUB_APP_PRIVATE_KEY")
    return bool(app_id and (key_content or (key_path and os.path.exists(key_path))))


def get_github_app_private_key() -> Optional[str]:
    """Retrieve GitHub App private RSA key from file or raw env."""
    key_content = os.getenv("GITHUB_APP_PRIVATE_KEY")
    if key_content:
        return key_content.replace("\\n", "\n")

    key_path = os.getenv("GITHUB_APP_PRIVATE_KEY_PATH")
    if key_path and os.path.exists(key_path):
        try:
            with open(key_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return None
    return None


def generate_app_jwt() -> Optional[str]:
    """Generate a short-lived RS256 JWT for GitHub App authentication."""
    if not jwt:
        return None

    app_id = os.getenv("GITHUB_APP_ID")
    private_key = get_github_app_private_key()
    if not app_id or not private_key:
        return None

    now = int(time.time())
    payload = {
        # Issued at 60s in past to allow for clock drift
        "iat": now - 60,
        # Expires in 10 minutes (maximum GitHub allows)
        "exp": now + (10 * 60),
        # GitHub App's identifier
        "iss": str(app_id),
    }

    try:
        encoded_jwt = jwt.encode(payload, private_key, algorithm="RS256")
        return encoded_jwt if isinstance(encoded_jwt, str) else encoded_jwt.decode("utf-8")
    except Exception as e:
        print(f"[GitHub App Error] Failed to generate JWT: {e}")
        return None


async def get_app_installation_token(owner: Optional[str] = None, repo: Optional[str] = None) -> Optional[str]:
    """
    Obtain a valid GitHub App installation token.
    If owner/repo are provided, resolves the installation for that specific repo.
    Otherwise uses GITHUB_APP_INSTALLATION_ID if set in env.
    """
    cached_inst_id = os.getenv("GITHUB_APP_INSTALLATION_ID")
    target_inst_id: Optional[int] = int(cached_inst_id) if cached_inst_id and cached_inst_id.isdigit() else None

    app_jwt = generate_app_jwt()
    if not app_jwt:
        return None

    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {app_jwt}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Rebactor-AI-DevOps",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        # If no installation id specified, discover installation for owner/repo
        if not target_inst_id and owner and repo:
            try:
                inst_resp = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/installation",
                    headers=headers,
                )
                if inst_resp.status_code == 200:
                    target_inst_id = inst_resp.json().get("id")
            except Exception:
                pass

        # If still no installation ID, check first available installation
        if not target_inst_id:
            try:
                insts_resp = await client.get(
                    "https://api.github.com/app/installations",
                    headers=headers,
                )
                if insts_resp.status_code == 200:
                    inst_list = insts_resp.json()
                    if inst_list and len(inst_list) > 0:
                        target_inst_id = inst_list[0].get("id")
            except Exception:
                pass

        if not target_inst_id:
            return None

        # Check in-memory cache
        now = time.time()
        cached = _APP_TOKEN_CACHE.get(target_inst_id)
        if cached and cached.get("expires_at", 0) > (now + 60):
            return cached["token"]

        # Request new installation access token
        try:
            token_resp = await client.post(
                f"https://api.github.com/app/installations/{target_inst_id}/access_tokens",
                headers=headers,
            )
            if token_resp.status_code == 201:
                token_data = token_resp.json()
                token = token_data.get("token")
                # Tokens usually expire in 1 hour
                _APP_TOKEN_CACHE[target_inst_id] = {
                    "token": token,
                    "expires_at": now + 3500,
                }
                return token
        except Exception as e:
            print(f"[GitHub App Error] Token exchange failed: {e}")
            return None

    return None


async def resolve_effective_token(
    header_token: Optional[str] = None,
    owner: Optional[str] = None,
    repo: Optional[str] = None,
) -> Tuple[Optional[str], str]:
    """
    Resolves the best available token and its authentication mode:
    Returns (token_or_none, auth_mode) where auth_mode is:
    - 'user_token'
    - 'github_app'
    - 'env_token'
    - 'unauthenticated_public'
    """
    # 1. Header override provided by user
    if header_token and header_token.strip() and header_token != "your_personal_access_token_here":
        return header_token.strip(), "user_token"

    # 2. GitHub App configured
    if is_github_app_configured():
        app_token = await get_app_installation_token(owner=owner, repo=repo)
        if app_token:
            return app_token, "github_app"

    # 3. Environment PAT
    pat = os.getenv("GITHUB_TOKEN")
    if pat and pat.strip() and pat != "your_personal_access_token_here":
        return pat.strip(), "env_token"

    # 4. Zero-token public mode
    return None, "unauthenticated_public"
