"""Base agent class for all AI agents."""
from abc import ABC, abstractmethod
from typing import TypedDict, Any, Dict
from langgraph.graph import StateGraph


class BaseAgentState(TypedDict):
    """Base state for all agents."""
    error: str | None


class BaseAgent(ABC):
    """Abstract base class for all AI agents."""
    
    def __init__(self, name: str):
        """
        Initialize the base agent.
        
        Args:
            name: Name of the agent
        """
        self.name = name
        self.workflow: StateGraph | None = None
    
    @abstractmethod
    def build_workflow(self) -> StateGraph:
        """
        Build the LangGraph workflow for this agent.
        
        Returns:
            Compiled StateGraph workflow
        """
        pass
    
    @abstractmethod
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process input data through the agent workflow.
        
        Args:
            input_data: Input data for the agent
            
        Returns:
            Processed output data
        """
        pass
    
    def get_workflow(self) -> StateGraph:
        """Get the compiled workflow."""
        if self.workflow is None:
            self.workflow = self.build_workflow()
        return self.workflow

