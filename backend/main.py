"""
Zora Data Dashboard - Backend API
Aggregates data from Zora's public SDK API
"""
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any

import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

# ============================================================================
# Zora API Client
# ============================================================================

ZORA_API = "https://api-sdk.zora.engineering"

async def zora_get(endpoint: str, params: dict = None) -> dict:
    """Make a GET request to Zora API."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{ZORA_API}{endpoint}", params=params, timeout=30)
            if resp.status_code == 200:
                return resp.json()
            print(f"[Zora API] {endpoint} returned {resp.status_code}")
        except Exception as e:
            print(f"[Zora API] Error: {e}")
    return {}


# ============================================================================
# Data Fetchers
# ============================================================================

async def get_top_gainers(count: int = 20) -> List[dict]:
    """Get coins with highest 24h market cap gains."""
    data = await zora_get("/explore", {"listType": "TOP_GAINERS", "count": count})
    edges = data.get("exploreList", {}).get("edges", [])
    return [format_coin(e.get("node", {})) for e in edges]


async def get_top_volume(count: int = 20) -> List[dict]:
    """Get coins with highest 24h trading volume."""
    data = await zora_get("/explore", {"listType": "TOP_VOLUME_24H", "count": count})
    edges = data.get("exploreList", {}).get("edges", [])
    return [format_coin(e.get("node", {})) for e in edges]


async def get_most_valuable(count: int = 20) -> List[dict]:
    """Get coins by market cap."""
    data = await zora_get("/explore", {"listType": "MOST_VALUABLE", "count": count})
    edges = data.get("exploreList", {}).get("edges", [])
    return [format_coin(e.get("node", {})) for e in edges]


async def get_new_coins(count: int = 20) -> List[dict]:
    """Get newly created coins."""
    data = await zora_get("/explore", {"listType": "NEW", "count": count})
    edges = data.get("exploreList", {}).get("edges", [])
    return [format_coin(e.get("node", {})) for e in edges]


async def get_last_traded(count: int = 20) -> List[dict]:
    """Get recently traded coins."""
    data = await zora_get("/explore", {"listType": "LAST_TRADED", "count": count})
    edges = data.get("exploreList", {}).get("edges", [])
    return [format_coin(e.get("node", {})) for e in edges]


async def get_trader_leaderboard(count: int = 50) -> List[dict]:
    """Get top traders this week."""
    data = await zora_get("/traderLeaderboard", {"first": count})
    edges = data.get("exploreTraderLeaderboard", {}).get("edges", [])
    return [format_trader(e.get("node", {})) for e in edges]


async def get_featured_creators(count: int = 20) -> List[dict]:
    """Get featured creators this week."""
    data = await zora_get("/featuredCreators", {"first": count})
    edges = data.get("traderLeaderboardFeaturedCreators", {}).get("edges", [])
    return [format_creator(e.get("node", {})) for e in edges]


async def get_coin_details(address: str) -> dict:
    """Get detailed info for a specific coin."""
    data = await zora_get("/coin", {"address": address, "chain": 8453})
    return format_coin_detail(data.get("data", {}).get("zora20Token", {}))


async def get_profile(identifier: str) -> dict:
    """Get profile info for a user."""
    data = await zora_get("/profile", {"identifier": identifier})
    return data


# ============================================================================
# Formatters
# ============================================================================

def format_coin(node: dict) -> dict:
    """Format coin data for frontend."""
    creator = node.get("creatorProfile", {}) or {}
    media = node.get("mediaContent", {}) or {}
    preview = media.get("previewImage", {}) or {}
    
    return {
        "address": node.get("address"),
        "name": node.get("name"),
        "symbol": node.get("symbol"),
        "description": (node.get("description") or "")[:200],
        "image": preview.get("small") or preview.get("medium"),
        "market_cap": safe_float(node.get("marketCap")),
        "market_cap_delta_24h": safe_float(node.get("marketCapDelta24h")),
        "volume_24h": safe_float(node.get("volume24h")),
        "total_volume": safe_float(node.get("totalVolume")),
        "price_usdc": safe_float(node.get("tokenPrice", {}).get("priceInUsdc") if node.get("tokenPrice") else None),
        "unique_holders": node.get("uniqueHolders"),
        "created_at": node.get("createdAt"),
        "creator_address": node.get("creatorAddress"),
        "creator_handle": creator.get("handle"),
        "creator_avatar": get_avatar(creator),
        "chain_id": node.get("chainId", 8453),
    }


def format_coin_detail(node: dict) -> dict:
    """Format detailed coin data."""
    base = format_coin(node)
    base.update({
        "total_supply": node.get("totalSupply"),
        "token_uri": node.get("tokenUri"),
        "coin_type": node.get("coinType"),
    })
    return base


def format_trader(node: dict) -> dict:
    """Format trader leaderboard entry."""
    profile = node.get("traderProfile", {}) or {}
    return {
        "handle": profile.get("handle"),
        "profile_id": profile.get("id"),
        "score": node.get("score"),
        "volume_usd": safe_float(node.get("weekVolumeUsd")),
        "trades_count": node.get("weekTradesCount"),
    }


def format_creator(node: dict) -> dict:
    """Format featured creator entry."""
    profile = node.get("profile", {}) or {}
    return {
        "handle": profile.get("handle"),
        "avatar": get_avatar(profile),
        "bio": profile.get("bio"),
        "followers": profile.get("followerCount"),
    }


def get_avatar(profile: dict) -> Optional[str]:
    """Extract avatar URL from profile."""
    avatar = profile.get("avatar", {}) or {}
    preview = avatar.get("previewImage", {}) or {}
    return preview.get("small") or preview.get("medium")


def safe_float(val) -> Optional[float]:
    """Safely convert to float."""
    if val is None:
        return None
    try:
        return float(val)
    except:
        return None


# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(title="Zora Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "online", "app": "Zora Dashboard", "chain": "Base"}


@app.get("/api/overview")
async def get_overview():
    """Get dashboard overview - all key metrics at once."""
    # Fetch all data in parallel
    gainers, volume, valuable, traders = await asyncio.gather(
        get_top_gainers(10),
        get_top_volume(10),
        get_most_valuable(10),
        get_trader_leaderboard(10),
    )
    
    # Calculate aggregate stats
    total_volume = sum(c.get("volume_24h", 0) or 0 for c in volume)
    total_mcap = sum(c.get("market_cap", 0) or 0 for c in valuable)
    
    return {
        "stats": {
            "total_volume_24h": total_volume,
            "top_coins_mcap": total_mcap,
        },
        "top_gainers": gainers[:5],
        "top_volume": volume[:5],
        "most_valuable": valuable[:5],
        "top_traders": traders[:5],
    }


@app.get("/api/coins/gainers")
async def api_top_gainers(count: int = Query(20, ge=1, le=100)):
    """Get top gaining coins (24h market cap increase)."""
    return await get_top_gainers(count)


@app.get("/api/coins/volume")
async def api_top_volume(count: int = Query(20, ge=1, le=100)):
    """Get top volume coins (24h trading volume)."""
    return await get_top_volume(count)


@app.get("/api/coins/valuable")
async def api_most_valuable(count: int = Query(20, ge=1, le=100)):
    """Get most valuable coins (by market cap)."""
    return await get_most_valuable(count)


@app.get("/api/coins/new")
async def api_new_coins(count: int = Query(20, ge=1, le=100)):
    """Get newly created coins."""
    return await get_new_coins(count)


@app.get("/api/coins/active")
async def api_last_traded(count: int = Query(20, ge=1, le=100)):
    """Get recently traded coins."""
    return await get_last_traded(count)


@app.get("/api/coins/{address}")
async def api_coin_details(address: str):
    """Get details for a specific coin."""
    return await get_coin_details(address)


@app.get("/api/traders")
async def api_trader_leaderboard(count: int = Query(50, ge=1, le=100)):
    """Get trader leaderboard for this week."""
    return await get_trader_leaderboard(count)


@app.get("/api/creators")
async def api_featured_creators(count: int = Query(20, ge=1, le=50)):
    """Get featured creators."""
    return await get_featured_creators(count)


@app.get("/api/profile/{identifier}")
async def api_profile(identifier: str):
    """Get profile info (by handle or address)."""
    return await get_profile(identifier)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
