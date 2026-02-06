"""
Zora Data Dashboard - Backend API
Aggregates data from Zora's public SDK API
"""
import asyncio
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from collections import defaultdict

import httpx
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
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
# Topic/Category Clustering
# ============================================================================

TOPIC_KEYWORDS = {
    "AI & Tech": ["ai", "gpt", "bot", "neural", "machine", "deep", "llm", "claude", "openai", "agent", "robot", "cyber", "tech", "digital", "compute", "quantum"],
    "Politics": ["trump", "biden", "maga", "democrat", "republican", "election", "president", "politics", "vote", "congress", "senate", "government", "potus", "kamala", "elon"],
    "Animals": ["dog", "cat", "doge", "shiba", "inu", "pepe", "frog", "monkey", "ape", "bear", "bull", "wolf", "bird", "fish", "penguin", "duck", "owl", "bunny"],
    "Finance": ["gold", "silver", "oil", "stock", "treasury", "reserve", "bank", "dollar", "forex", "trade", "invest", "yield", "bond", "etf", "index", "hedge"],
    "Gaming": ["game", "play", "nft", "pixel", "arcade", "quest", "guild", "rpg", "level", "boss", "loot", "battle", "hero", "warrior", "sword"],
    "Culture": ["meme", "lol", "based", "chad", "wojak", "cope", "seethe", "ratio", "wagmi", "gm", "ngmi", "hodl", "moon", "wen", "ser", "anon"],
    "Food": ["pizza", "burger", "taco", "sushi", "coffee", "beer", "wine", "food", "eat", "cook", "chef", "kitchen", "drink", "snack"],
    "Sports": ["sport", "ball", "goal", "team", "win", "champion", "nba", "nfl", "soccer", "football", "basketball", "baseball"],
    "Music & Art": ["music", "song", "art", "artist", "paint", "draw", "beat", "sound", "audio", "visual", "creative", "studio"],
    "Crypto Native": ["eth", "bitcoin", "btc", "solana", "base", "chain", "defi", "dao", "token", "swap", "pool", "stake", "yield", "vault", "bridge"],
}

def categorize_coin(coin: dict) -> str:
    """Categorize a coin based on name/description keywords."""
    text = f"{coin.get('name', '')} {coin.get('description', '')} {coin.get('symbol', '')}".lower()
    
    scores = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[topic] = score
    
    if scores:
        return max(scores, key=scores.get)
    return "Other"


def cluster_coins_by_topic(coins: List[dict]) -> Dict[str, List[dict]]:
    """Group coins by topic/category."""
    clusters = defaultdict(list)
    for coin in coins:
        topic = categorize_coin(coin)
        coin["topic"] = topic
        clusters[topic].append(coin)
    
    # Sort clusters by total volume
    sorted_clusters = {}
    for topic, topic_coins in sorted(
        clusters.items(),
        key=lambda x: sum(c.get("volume_24h", 0) or 0 for c in x[1]),
        reverse=True
    ):
        sorted_clusters[topic] = topic_coins
    
    return sorted_clusters


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


async def get_top_creators(count: int = 50) -> List[dict]:
    """Get most valuable creator coins (proxy for earnings)."""
    data = await zora_get("/explore", {"listType": "MOST_VALUABLE_CREATORS", "count": count})
    edges = data.get("exploreList", {}).get("edges", [])
    return [format_creator_coin(e.get("node", {})) for e in edges]


async def get_coin_swaps(address: str, count: int = 50) -> List[dict]:
    """Get recent swaps for a coin."""
    data = await zora_get("/coinSwaps", {"address": address, "chain": 8453, "count": count})
    swaps = data.get("zora20Token", {}).get("swapActivities", {}).get("edges", [])
    return [format_swap(e.get("node", {})) for e in swaps]


async def get_whale_trades(min_usd: float = 1000) -> List[dict]:
    """Get large trades from recently traded coins."""
    # Get recently active coins
    active = await get_last_traded(20)
    
    whales = []
    # Check top 5 most active coins for whale trades
    for coin in active[:5]:
        if not coin.get("address"):
            continue
        swaps = await get_coin_swaps(coin["address"], 20)
        for swap in swaps:
            if swap.get("amount_usd", 0) >= min_usd:
                swap["coin"] = {
                    "address": coin["address"],
                    "name": coin["name"],
                    "symbol": coin["symbol"],
                    "image": coin.get("image"),
                }
                whales.append(swap)
    
    # Sort by amount descending
    whales.sort(key=lambda x: x.get("amount_usd", 0), reverse=True)
    return whales[:50]


async def get_coin_details(address: str) -> dict:
    """Get detailed info for a specific coin."""
    data = await zora_get("/coin", {"address": address, "chain": 8453})
    return format_coin_detail(data.get("zora20Token", {}))


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
        "coin_type": node.get("coinType"),
    }


def format_coin_detail(node: dict) -> dict:
    """Format detailed coin data."""
    base = format_coin(node)
    base.update({
        "total_supply": node.get("totalSupply"),
        "token_uri": node.get("tokenUri"),
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


def format_creator_coin(node: dict) -> dict:
    """Format creator coin with earnings estimate."""
    creator = node.get("creatorProfile", {}) or {}
    avatar = get_avatar(creator)
    
    # Creator earns from total volume (fee = ~1% typically)
    total_vol = safe_float(node.get("totalVolume")) or 0
    estimated_earnings = total_vol * 0.01  # 1% creator fee estimate
    
    return {
        "handle": creator.get("handle") or node.get("name"),
        "avatar": avatar,
        "address": node.get("address"),
        "name": node.get("name"),
        "symbol": node.get("symbol"),
        "market_cap": safe_float(node.get("marketCap")),
        "total_volume": total_vol,
        "volume_24h": safe_float(node.get("volume24h")),
        "estimated_earnings": estimated_earnings,
        "unique_holders": node.get("uniqueHolders"),
        "created_at": node.get("createdAt"),
        "twitter": get_social(creator, "twitter"),
        "farcaster": get_social(creator, "farcaster"),
    }


def format_swap(node: dict) -> dict:
    """Format swap/trade data."""
    price_info = node.get("currencyAmountWithPrice", {}) or {}
    currency = price_info.get("currencyAmount", {}) or {}
    sender = node.get("senderProfile", {}) or {}
    
    amount_usd = safe_float(price_info.get("priceUsdc")) or 0
    token_amount = safe_float(currency.get("amountDecimal")) or 0
    
    # Calculate USD value of the trade
    if amount_usd > 0 and token_amount > 0:
        # priceUsdc is per token, multiply by amount
        trade_usd = amount_usd * token_amount
    else:
        trade_usd = 0
    
    return {
        "tx_hash": node.get("transactionHash"),
        "type": node.get("activityType"),  # BUY or SELL
        "amount_usd": trade_usd,
        "token_amount": token_amount,
        "timestamp": node.get("blockTimestamp"),
        "trader_address": node.get("senderAddress"),
        "trader_handle": sender.get("handle"),
    }


def get_avatar(profile: dict) -> Optional[str]:
    """Extract avatar URL from profile."""
    avatar = profile.get("avatar", {}) or {}
    preview = avatar.get("previewImage", {}) or {}
    return preview.get("small") or preview.get("medium")


def get_social(profile: dict, platform: str) -> Optional[str]:
    """Get social account from profile."""
    socials = profile.get("socialAccounts", {}) or {}
    account = socials.get(platform, {}) or {}
    return account.get("username") or account.get("handle")


def safe_float(val) -> Optional[float]:
    """Safely convert to float."""
    if val is None:
        return None
    try:
        return float(val)
    except:
        return None


# ============================================================================
# WebSocket for Real-time Whale Alerts
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()


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


@app.get("/api/coins/{address}/swaps")
async def api_coin_swaps(address: str, count: int = Query(50, ge=1, le=100)):
    """Get recent swaps for a coin."""
    return await get_coin_swaps(address, count)


# ============================================================================
# Topic Clustering
# ============================================================================

@app.get("/api/topics")
async def api_topics():
    """Get coins clustered by topic/category."""
    # Fetch top coins by volume (most active topics)
    coins = await get_top_volume(100)
    clusters = cluster_coins_by_topic(coins)
    
    # Build summary
    result = []
    for topic, topic_coins in clusters.items():
        total_vol = sum(c.get("volume_24h", 0) or 0 for c in topic_coins)
        total_mcap = sum(c.get("market_cap", 0) or 0 for c in topic_coins)
        result.append({
            "topic": topic,
            "coin_count": len(topic_coins),
            "total_volume_24h": total_vol,
            "total_market_cap": total_mcap,
            "top_coins": topic_coins[:5],
        })
    
    return result


# ============================================================================
# Creator Earnings
# ============================================================================

@app.get("/api/creators")
async def api_top_creators(count: int = Query(50, ge=1, le=100)):
    """Get top creators by estimated earnings."""
    creators = await get_top_creators(count)
    # Sort by estimated earnings
    creators.sort(key=lambda x: x.get("estimated_earnings", 0), reverse=True)
    return creators


# ============================================================================
# Whale Alerts
# ============================================================================

@app.get("/api/traders")
async def api_trader_leaderboard(count: int = Query(50, ge=1, le=100)):
    """Get trader leaderboard for this week."""
    return await get_trader_leaderboard(count)


@app.get("/api/whales")
async def api_whale_trades(min_usd: float = Query(1000, ge=100)):
    """Get recent whale trades (large transactions)."""
    return await get_whale_trades(min_usd)


@app.websocket("/ws/whales")
async def ws_whale_alerts(websocket: WebSocket):
    """WebSocket for real-time whale alerts."""
    await manager.connect(websocket)
    try:
        last_seen = set()
        while True:
            # Poll for new whale trades every 30 seconds
            whales = await get_whale_trades(1000)
            for whale in whales[:10]:
                tx = whale.get("tx_hash")
                if tx and tx not in last_seen:
                    last_seen.add(tx)
                    await websocket.send_json(whale)
            
            # Keep only last 100 tx hashes
            if len(last_seen) > 100:
                last_seen = set(list(last_seen)[-50:])
            
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/api/profile/{identifier}")
async def api_profile(identifier: str):
    """Get profile info (by handle or address)."""
    return await get_profile(identifier)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
