"""Product Context API routes for AI Assistant."""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from database.database import RepositoryFactory, get_db_session
from database.config import db_config
from database.schema import ProductResponse

router = APIRouter(prefix="/api/products", tags=["product-context"])


@router.get("/{product_id}/context")
async def get_product_context(
    product_id: str,
    session: Optional[Any] = Depends(get_db_session)
) -> Dict[str, Any]:
    """Get comprehensive product context for AI assistant.
    
    Aggregates all product-related entities into a unified context object
    optimized for LLM consumption.
    """
    # Verify product exists
    product_repo = RepositoryFactory.get_product_repository(session)
    product = await product_repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Fetch all related entities in parallel
    strategies_repo = RepositoryFactory.get_strategy_repository(session)
    features_repo = RepositoryFactory.get_feature_repository(session)
    tasks_repo = RepositoryFactory.get_task_repository(session)
    problems_repo = RepositoryFactory.get_problem_repository(session)
    insights_repo = RepositoryFactory.get_insight_repository(session)
    releases_repo = RepositoryFactory.get_release_repository(session)
    stakeholders_repo = RepositoryFactory.get_stakeholder_repository(session)
    metrics_repo = RepositoryFactory.get_metric_repository(session)
    workstreams_repo = RepositoryFactory.get_workstream_repository(session)
    prioritization_models_repo = RepositoryFactory.get_prioritization_model_repository(session)
    priority_scores_repo = RepositoryFactory.get_priority_score_repository(session)
    roadmaps_repo = RepositoryFactory.get_roadmap_repository(session)
    costs_repo = RepositoryFactory.get_cost_repository(session)
    revenue_models_repo = RepositoryFactory.get_revenue_model_repository(session)
    pricing_tiers_repo = RepositoryFactory.get_pricing_tier_repository(session)
    usage_metrics_repo = RepositoryFactory.get_usage_metric_repository(session)
    decisions_repo = RepositoryFactory.get_decision_repository(session)
    resources_repo = RepositoryFactory.get_resource_repository(session)
    
    # Fetch all data
    strategies = await strategies_repo.get_by_product(product_id)
    features = await features_repo.get_by_product(product_id)
    tasks = await tasks_repo.get_by_product(product_id)
    problems = await problems_repo.get_by_product(product_id)
    insights = await insights_repo.get_by_product(product_id)
    prioritization_models = await prioritization_models_repo.get_by_product(product_id)
    priority_scores = await priority_scores_repo.get_by_product(product_id)
    roadmaps = await roadmaps_repo.get_by_product(product_id)
    costs = await costs_repo.get_by_product(product_id)
    revenue_models = await revenue_models_repo.get_by_product(product_id)
    pricing_tiers = await pricing_tiers_repo.get_by_product(product_id)
    usage_metrics = await usage_metrics_repo.get_by_product(product_id)
    decisions = await decisions_repo.get_by_product(product_id)
    releases = await releases_repo.get_by_product(product_id)
    stakeholders = await stakeholders_repo.get_by_product(product_id)
    metrics = await metrics_repo.get_by_product(product_id)
    workstreams = await workstreams_repo.get_by_product(product_id)
    
    # Format data for LLM consumption (include only essential fields)
    def format_strategy(s):
        result = {
            "id": s.id,
            "type": s.type,
            "title": s.title,
            "description": s.description,
            "status": s.status,
        }
        if s.type == "okr" and s.objectives:
            result["objectives"] = s.objectives
        if s.type == "okr" and s.key_results:
            result["key_results"] = s.key_results
        if s.target_date:
            result["target_date"] = s.target_date.isoformat() if hasattr(s.target_date, 'isoformat') else str(s.target_date)
        return result
    
    def format_feature(f):
        result = {
            "id": f.id,
            "name": f.name,
            "description": f.description,
            "owner": f.owner,
        }
        if hasattr(f, 'priority') and f.priority:
            result["priority"] = f.priority
        if hasattr(f, 'problem_ids') and f.problem_ids:
            result["problem_ids"] = f.problem_ids
        if hasattr(f, 'expected_outcomes') and f.expected_outcomes:
            result["expected_outcomes"] = f.expected_outcomes
        return result
    
    def format_task(t):
        result = {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "priority": t.priority,
        }
        if hasattr(t, 'estimated_hours') and t.estimated_hours is not None:
            result["estimated_hours"] = t.estimated_hours
        if hasattr(t, 'actual_hours') and t.actual_hours is not None:
            result["actual_hours"] = t.actual_hours
        if hasattr(t, 'due_date') and t.due_date:
            result["due_date"] = t.due_date.isoformat() if hasattr(t.due_date, 'isoformat') else str(t.due_date)
        if hasattr(t, 'blockers') and t.blockers:
            result["blockers"] = t.blockers
        if hasattr(t, 'feature_id') and t.feature_id:
            result["feature_id"] = t.feature_id
        return result
    
    def format_problem(p):
        result = {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "status": p.status,
            "priority": p.priority,
        }
        if hasattr(p, 'problem_statement') and p.problem_statement:
            result["problem_statement"] = p.problem_statement
        if hasattr(p, 'customer_segment') and p.customer_segment:
            result["customer_segment"] = p.customer_segment
        if hasattr(p, 'frequency') and p.frequency:
            result["frequency"] = p.frequency
        if hasattr(p, 'severity') and p.severity:
            result["severity"] = p.severity
        if hasattr(p, 'feature_id') and p.feature_id:
            result["feature_id"] = p.feature_id
        return result
    
    def format_insight(i):
        result = {
            "id": i.id,
            "title": i.title,
            "description": i.description,
            "source": i.source,
            "status": i.status,
            "votes": i.votes,
        }
        if hasattr(i, 'sentiment') and i.sentiment:
            result["sentiment"] = i.sentiment
        if hasattr(i, 'problem_statement') and i.problem_statement:
            result["problem_statement"] = i.problem_statement
        if hasattr(i, 'customer_segment') and i.customer_segment:
            result["customer_segment"] = i.customer_segment
        if hasattr(i, 'feature_id') and i.feature_id:
            result["feature_id"] = i.feature_id
        return result
    
    def format_release(r):
        result = {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "status": r.status,
        }
        if hasattr(r, 'target_date') and r.target_date:
            result["target_date"] = r.target_date.isoformat() if hasattr(r.target_date, 'isoformat') else str(r.target_date)
        if hasattr(r, 'feature_ids') and r.feature_ids:
            result["feature_ids"] = r.feature_ids
        return result
    
    def format_stakeholder(s):
        result = {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "role": s.role,
        }
        if hasattr(s, 'communication_preferences') and s.communication_preferences:
            result["communication_preferences"] = s.communication_preferences
        if hasattr(s, 'update_frequency') and s.update_frequency:
            result["update_frequency"] = s.update_frequency
        return result
    
    def format_metric(m):
        result = {
            "id": m.id,
            "name": m.name,
            "metric_type": m.metric_type if hasattr(m, 'metric_type') else None,
            "scope": m.scope if hasattr(m, 'scope') else None,
            "scope_id": m.scope_id if hasattr(m, 'scope_id') else None,
            "target_value": m.target_value,
            "unit": m.unit if hasattr(m, 'unit') else None,
        }
        if hasattr(m, 'current_value') and m.current_value is not None:
            result["current_value"] = m.current_value
        if hasattr(m, 'tracking_frequency') and m.tracking_frequency:
            result["tracking_frequency"] = m.tracking_frequency
        if hasattr(m, 'description') and m.description:
            result["description"] = m.description
        return result
    
    def format_workstream(w):
        return {
            "id": w.id,
            "name": w.name,
            "description": w.description,
        }
    
    def format_prioritization_model(pm):
        return {
            "id": pm.id,
            "name": pm.name,
            "type": pm.type,
            "applies_to": pm.applies_to,
            "is_active": pm.is_active,
        }
    
    def format_priority_score(ps):
        result = {
            "id": ps.id,
            "entity_type": ps.entity_type,
            "entity_id": ps.entity_id,
            "score": ps.score,
            "confidence": ps.confidence,
        }
        if hasattr(ps, 'inputs') and ps.inputs:
            result["inputs"] = ps.inputs
        if hasattr(ps, 'assumptions') and ps.assumptions:
            result["assumptions"] = ps.assumptions
        return result
    
    def format_roadmap(r):
        return {
            "id": r.id,
            "name": r.name,
            "type": r.type,
            "description": r.description,
            "is_active": r.is_active,
        }
    
    def format_cost(c):
        result = {
            "id": c.id,
            "name": c.name,
            "scope": c.scope,
            "scope_id": c.scope_id,
            "category": c.category,
            "cost_type": c.cost_type,
            "amount": c.amount,
            "currency": c.currency,
            "recurrence": c.recurrence,
        }
        if hasattr(c, 'description') and c.description:
            result["description"] = c.description
        return result
    
    def format_revenue_model(rm):
        return {
            "id": rm.id,
            "model_type": rm.model_type,
            "description": rm.description,
            "base_revenue": rm.base_revenue,
            "currency": rm.currency,
            "is_active": rm.is_active,
        }
    
    def format_pricing_tier(pt):
        return {
            "id": pt.id,
            "name": pt.name,
            "price": pt.price,
            "currency": pt.currency,
            "billing_period": pt.billing_period,
        }
    
    def format_usage_metric(um):
        result = {
            "id": um.id,
            "metric_type": um.metric_type,
            "name": um.name,
            "unit": um.unit,
            "volume": um.volume,
        }
        if hasattr(um, 'target_volume') and um.target_volume is not None:
            result["target_volume"] = um.target_volume
        return result
    
    def format_decision(d):
        result = {
            "id": d.id,
            "entity_type": d.entity_type,
            "entity_id": d.entity_id,
            "outcome": d.outcome,
            "rationale": d.rationale,
            "decision_maker": d.decision_maker,
        }
        if hasattr(d, 'decision_date') and d.decision_date:
            result["decision_date"] = d.decision_date.isoformat() if hasattr(d.decision_date, 'isoformat') else str(d.decision_date)
        return result
    
    # Build context object
    context = {
        "product": {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "tco": product.tco if hasattr(product, 'tco') else None,
            "tco_currency": product.tco_currency if hasattr(product, 'tco_currency') else None,
            "owner": product.owner if hasattr(product, 'owner') else None,
            "status": product.status if hasattr(product, 'status') else None,
        },
        "strategies": [format_strategy(s) for s in strategies],
        "features": [format_feature(f) for f in features],
        "tasks": [format_task(t) for t in tasks],
        "problems": [format_problem(p) for p in problems],
        "insights": [format_insight(i) for i in insights],
        "releases": [format_release(r) for r in releases],
        "stakeholders": [format_stakeholder(s) for s in stakeholders],
        "metrics": [format_metric(m) for m in metrics],
        "workstreams": [format_workstream(w) for w in workstreams],
        "prioritization_models": [format_prioritization_model(pm) for pm in prioritization_models],
        "priority_scores": [format_priority_score(ps) for ps in priority_scores],
        "roadmaps": [format_roadmap(r) for r in roadmaps],
        "costs": [format_cost(c) for c in costs],
        "revenue_models": [format_revenue_model(rm) for rm in revenue_models],
        "pricing_tiers": [format_pricing_tier(pt) for pt in pricing_tiers],
        "usage_metrics": [format_usage_metric(um) for um in usage_metrics],
        "decisions": [format_decision(d) for d in decisions],
    }
    
    return context

