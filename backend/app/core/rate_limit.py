"""Rate limiter for public authentication endpoints.

The in-process backend is a baseline only. Production deployments with multiple
workers should point SlowAPI/limits at a shared Redis storage.
"""
from slowapi import Limiter
from ipaddress import ip_address

from fastapi import Request

from app.core.config import get_settings


def client_ip(request: Request) -> str:
    peer = request.client.host if request.client else "unknown"
    settings = get_settings()
    if peer not in settings.trusted_proxy_ips:
        return peer
    forwarded = request.headers.get("x-real-ip", "")
    try:
        return str(ip_address(forwarded.strip()))
    except ValueError:
        return peer

limiter = Limiter(key_func=client_ip)
