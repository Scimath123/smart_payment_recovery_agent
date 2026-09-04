from typing import TypedDict, Optional, Dict, Any
from langgraph.graph import StateGraph, END

import json

from retriever import retrieve_similar_failures
from retriever_score import score_recovery_strategy
from dotenv import load_dotenv
load_dotenv()

import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_KEY"))
gemini_model = genai.GenerativeModel("gemini-2.0-flash")


class AgentState(TypedDict):
    transaction: Dict[str, Any]       # the failed transaction's features
    error_text: str                   # raw gateway error text
    rag_result: Optional[Dict]        # output of retrieve_similar_failures
    ml_result: Optional[Dict]         # output of score_recovery_strategy
    tier: Optional[str]               # "fast_path" or "llm_reasoning"
    final_decision: Optional[Dict]    # the agent's chosen action


def rag_node(state: AgentState) -> AgentState:
    result = retrieve_similar_failures(state["error_text"], k=5)
    return {"rag_result": result}

def ml_node(state: AgentState) -> AgentState:
    """Calls Tool 2 — scores every candidate retry strategy."""
    result = score_recovery_strategy(state["transaction"])
    return {"ml_result": result}
    
def decide_tier(state: AgentState) -> AgentState:
    """Looks at RAG confidence and decides which path to take."""
    rag = state["rag_result"]
    top_similarity = rag.get("top_similarity", 0)
    category_votes = rag.get("category_votes", {})

    # majority agreement check: does one category dominate the retrieved cases?
    total_votes = sum(category_votes.values()) if category_votes else 0
    max_votes = max(category_votes.values()) if category_votes else 0
    agreement_ratio = (max_votes / total_votes) if total_votes else 0

    if top_similarity >= 0.85 and agreement_ratio >= 0.8:
        tier = "fast_path"
    else:
        tier = "llm_reasoning"

    return {"tier": tier}

def route_after_tiering(state: AgentState) -> str:
    """Tells LangGraph which node to go to next, based on tier."""
    return state["tier"]

def fast_path_node(state: AgentState) -> AgentState:
    """Deterministic decision — trusts the ML model's top strategy directly."""
    best = state["ml_result"]["best_strategy"]
    decision = {
        "action": best["retry_action"],
        "delay_before_retry_min": best["delay_before_retry_min"],
        "confidence": best["predicted_success_prob"],
        "reasoning": (
            f"Fast path: RAG retrieval was highly confident "
            f"(similarity={state['rag_result']['top_similarity']}), "
            f"so the agent trusted the ML model's top strategy directly "
            f"without invoking the LLM."
        ),
        "tier_used": "fast_path",
    }
    return {"final_decision": decision}




def llm_reasoning_node(state: AgentState) -> AgentState:
    
    rag = state["rag_result"]
    ml = state["ml_result"]

    prompt = f"""You are a payment recovery agent. A transaction failed with this error:
"{state['error_text']}"

Here is what similar past failures show (retrieved via RAG):
{json.dumps(rag, indent=2)}

Here is what the ML recovery model predicts for each candidate strategy:
{json.dumps(ml['ranked_strategies'][:5], indent=2)}

Decide the single best retry action and delay (in minutes) to recover this
transaction. Respond ONLY in this JSON format, nothing else, no markdown:
{{
  "action": "<retry action>",
  "delay_before_retry_min": <int>,
  "confidence": <float 0-1>,
  "reasoning": "<1-2 sentence explanation>"
}}"""

    response = gemini_model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            max_output_tokens=300,
        ),
    )

    raw_text = response.text.strip()
    decision = json.loads(raw_text)
    decision["tier_used"] = "llm_reasoning"
    return {"final_decision": decision}


def build_agent_graph():
    graph = StateGraph(AgentState)

    graph.add_node("rag", rag_node)
    graph.add_node("ml", ml_node)
    graph.add_node("decide_tier", decide_tier)
    graph.add_node("fast_path", fast_path_node)
    graph.add_node("llm_reasoning", llm_reasoning_node)

    graph.set_entry_point("rag")
    graph.add_edge("rag", "ml")
    graph.add_edge("ml", "decide_tier")

    graph.add_conditional_edges(
        "decide_tier",
        route_after_tiering,
        {
            "fast_path": "fast_path",
            "llm_reasoning": "llm_reasoning",
        },
    )

    graph.add_edge("fast_path", END)
    graph.add_edge("llm_reasoning", END)

    return graph.compile()


if __name__ == "__main__":
    agent = build_agent_graph()

    example_transaction = {
        "category": "insufficient_funds",
        "auth_method": "3D Secure",
        "channel": "Online",
        "card_type": "Visa",
        "merchant_category": "Retail",
        "amount_usd": 450.0,
        "account_balance_usd": 300.0,
        "cvv_retry_count": 0,
        "velocity_score": 20.0,
        "merchant_risk_score": 10.0,
        "time_of_day_hour": 14,
        "day_of_week": 3,
    }

    initial_state = {
        "transaction": example_transaction,
        "error_text": "TXN_FAILED: Insufficient balance in account",
    }

    result = agent.invoke(initial_state)

    print("Tier used:", result["tier"])
    print("Final decision:", json.dumps(result["final_decision"], indent=2))