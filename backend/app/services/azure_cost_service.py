"""Azure Cost Service for syncing costs from Azure Cost Management API."""
import logging
from azure.identity import ClientSecretCredential
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.costmanagement.models import QueryDefinition, QueryTimePeriod, QueryDataset, QueryAggregation, QueryGrouping
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from azure.core.exceptions import HttpResponseError, ClientAuthenticationError
from database.schema import CostCreate

logger = logging.getLogger(__name__)


class AzureCostService:
    """Service for interacting with Azure Cost Management API."""
    
    def __init__(self, subscription_id: str, client_id: str, client_secret: str, tenant_id: str):
        """
        Initialize Azure Cost Management client.
        
        Args:
            subscription_id: Azure subscription ID
            client_id: Azure AD application (client) ID
            client_secret: Azure AD application secret
            tenant_id: Azure AD tenant ID
        """
        self.subscription_id = subscription_id
        self.credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret
        )
        self.client = CostManagementClient(self.credential)
        self.scope = f"/subscriptions/{subscription_id}"
    
    async def test_connection(self) -> bool:
        """
        Test Azure credentials by making a simple API call.
        
        Returns:
            True if credentials are valid
            
        Raises:
            Exception: If credentials are invalid
        """
        try:
            # Try to query costs for a small date range
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=1)
            
            query_definition = QueryDefinition(
                type="ActualCost",
                timeframe="Custom",
                time_period=QueryTimePeriod(
                    from_property=start_date,
                    to=end_date
                ),
                dataset=QueryDataset(
                    granularity="Daily",
                    aggregation={
                        "totalCost": QueryAggregation(
                            name="PreTaxCost",
                            function="Sum"
                        )
                    }
                )
            )
            
            # This will raise an exception if credentials are invalid
            # Note: Azure Cost Management API uses query.usage() method
            result = self.client.query.usage(self.scope, query_definition)
            return True
        except ClientAuthenticationError as e:
            raise Exception(f"Azure authentication failed: {str(e)}. Please check your credentials.")
        except HttpResponseError as e:
            if e.status_code == 403:
                raise Exception("Access denied. Please ensure the Service Principal has 'Cost Management Reader' role on the subscription.")
            elif e.status_code == 401:
                raise Exception("Unauthorized. Please check your Azure credentials.")
            else:
                raise Exception(f"Azure API error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to connect to Azure: {str(e)}")
    
    async def get_monthly_costs(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        Get monthly costs grouped by service.
        
        Args:
            start_date: Start date for cost query
            end_date: End date for cost query
            
        Returns:
            List of cost data dictionaries with service name and amount
        """
        costs = []
        
        logger.info(f"[AZURE DEBUG] Getting monthly costs for subscription {self.subscription_id}")
        logger.info(f"[AZURE DEBUG] Date range: {start_date.date()} to {end_date.date()}")
        logger.info(f"[AZURE DEBUG] Scope: {self.scope}")
        
        try:
            # Simplified query: Just get total cost (no grouping)
            # This is a minimal "do I get any money at all?" query
            logger.info(f"[AZURE DEBUG] Creating simplified query (total cost only, no grouping)...")
            query_definition = QueryDefinition(
                type="ActualCost",
                timeframe="Custom",
                time_period=QueryTimePeriod(
                    from_property=start_date.date(),
                    to=end_date.date()
                ),
                dataset=QueryDataset(
                    granularity="Monthly",
                    aggregation={
                        "totalCost": QueryAggregation(
                            name="PreTaxCost",
                            function="Sum"
                        )
                    }
                    # No grouping - just get total cost
                )
            )
            
            logger.info(f"[AZURE DEBUG] Query definition created:")
            logger.info(f"[AZURE DEBUG]   - type: {query_definition.type}")
            logger.info(f"[AZURE DEBUG]   - granularity: {query_definition.dataset.granularity}")
            logger.info(f"[AZURE DEBUG]   - aggregation: {query_definition.dataset.aggregation}")
            logger.info(f"[AZURE DEBUG]   - grouping: {getattr(query_definition.dataset, 'grouping', None)} (should be None for simplified query)")
            logger.info(f"[AZURE DEBUG]   - time_period: {start_date.date()} to {end_date.date()}")
            logger.info(f"[AZURE DEBUG] Calling Azure Cost Management API...")
            logger.info(f"[AZURE DEBUG] Scope: {self.scope}")
            logger.info(f"[AZURE DEBUG] Client type: {type(self.client)}")
            
            # Check if query.usage exists
            if not hasattr(self.client, 'query'):
                logger.error(f"[AZURE DEBUG] Client has no 'query' attribute!")
                raise Exception("CostManagementClient does not have 'query' attribute. Check SDK version.")
            
            if not hasattr(self.client.query, 'usage'):
                logger.error(f"[AZURE DEBUG] Client.query has no 'usage' method!")
                raise Exception("CostManagementClient.query does not have 'usage' method. Check SDK version.")
            
            logger.info(f"[AZURE DEBUG] Executing query.usage() with scope={self.scope}")
            response = self.client.query.usage(self.scope, query_definition)
            logger.info(f"[AZURE DEBUG] Query executed successfully")
            
            logger.info(f"[AZURE DEBUG] API response received")
            logger.info(f"[AZURE DEBUG] Response type: {type(response)}")
            logger.info(f"[AZURE DEBUG] Response attributes: {[attr for attr in dir(response) if not attr.startswith('_')]}")
            
            # Try to serialize response for debugging (handle non-serializable objects)
            try:
                import json
                response_dict = {
                    'type': str(type(response)),
                    'attributes': [attr for attr in dir(response) if not attr.startswith('_')]
                }
                if hasattr(response, 'properties'):
                    response_dict['has_properties'] = True
                if hasattr(response, 'rows'):
                    response_dict['has_rows'] = True
                logger.info(f"[AZURE DEBUG] Response structure: {json.dumps(response_dict, indent=2)}")
            except Exception as e:
                logger.warning(f"[AZURE DEBUG] Could not serialize response: {e}")
            
            # Process the response - Azure SDK returns QueryResult with properties.rows and properties.columns
            rows = []
            if hasattr(response, 'properties') and response.properties:
                logger.info(f"[AZURE DEBUG] Response has properties attribute")
                logger.info(f"[AZURE DEBUG] Properties type: {type(response.properties)}")
                logger.info(f"[AZURE DEBUG] Properties attributes: {[attr for attr in dir(response.properties) if not attr.startswith('_')]}")
                
                # Try different ways to access rows
                if hasattr(response.properties, 'rows'):
                    rows_attr = getattr(response.properties, 'rows')
                    logger.info(f"[AZURE DEBUG] response.properties.rows type: {type(rows_attr)}")
                    logger.info(f"[AZURE DEBUG] response.properties.rows value: {rows_attr}")
                    if rows_attr:
                        rows = rows_attr
                        logger.info(f"[AZURE DEBUG] Found {len(rows)} rows in response.properties.rows")
                
                if hasattr(response.properties, 'columns'):
                    columns_attr = getattr(response.properties, 'columns')
                    logger.info(f"[AZURE DEBUG] response.properties.columns: {columns_attr}")
                    
            elif hasattr(response, 'rows'):
                rows_attr = getattr(response, 'rows')
                logger.info(f"[AZURE DEBUG] Found rows attribute directly on response: {type(rows_attr)}")
                if rows_attr:
                    rows = rows_attr
                    logger.info(f"[AZURE DEBUG] Found {len(rows)} rows in response.rows")
            else:
                logger.warning(f"[AZURE DEBUG] Response has no rows attribute")
                # Try to print response as string
                try:
                    logger.warning(f"[AZURE DEBUG] Response string representation: {str(response)}")
                except:
                    pass
            
            logger.info(f"[AZURE DEBUG] ========== ROWS ANALYSIS ==========")
            logger.info(f"[AZURE DEBUG] Total rows to process: {len(rows)}")
            
            if len(rows) == 0:
                logger.warning(f"[AZURE DEBUG] ========== NO ROWS IN RESPONSE ==========")
                logger.warning(f"[AZURE DEBUG] Date range queried: {start_date.date()} to {end_date.date()}")
                today = datetime.now().date()
                if start_date.date() > today:
                    logger.warning(f"[AZURE DEBUG] ⚠️ WARNING: Start date is in the FUTURE! ({start_date.date()} > {today})")
                    logger.warning(f"[AZURE DEBUG] Azure costs are only available for past dates. Please select a date range from the past.")
                elif end_date.date() > today:
                    logger.warning(f"[AZURE DEBUG] ⚠️ WARNING: End date is in the FUTURE! ({end_date.date()} > {today})")
                    logger.warning(f"[AZURE DEBUG] Azure costs are only available for past dates. Please select a date range from the past.")
                else:
                    logger.warning(f"[AZURE DEBUG] This could mean:")
                    logger.warning(f"[AZURE DEBUG]   1. No costs exist for date range {start_date.date()} to {end_date.date()}")
                    logger.warning(f"[AZURE DEBUG]   2. The subscription has no usage for this period")
                    logger.warning(f"[AZURE DEBUG]   3. Azure cost data can take 24-48 hours to appear")
                    logger.warning(f"[AZURE DEBUG]   4. Try a date range from 2-3 days ago")
                logger.warning(f"[AZURE DEBUG] Full response object: {response}")
                logger.warning(f"[AZURE DEBUG] Response repr: {repr(response)}")
                # Try to get more info from response
                if hasattr(response, 'properties'):
                    logger.warning(f"[AZURE DEBUG] response.properties: {response.properties}")
                    if hasattr(response.properties, '__dict__'):
                        logger.warning(f"[AZURE DEBUG] response.properties.__dict__: {response.properties.__dict__}")
                # Try to convert to dict if possible
                try:
                    if hasattr(response, 'as_dict'):
                        response_dict = response.as_dict()
                        logger.warning(f"[AZURE DEBUG] Response as_dict: {json.dumps(response_dict, indent=2, default=str)}")
                except Exception as e:
                    logger.warning(f"[AZURE DEBUG] Could not convert response to dict: {e}")
                # Check if there are columns but no rows
                if hasattr(response, 'properties') and hasattr(response.properties, 'columns'):
                    logger.warning(f"[AZURE DEBUG] Response has columns: {response.properties.columns}")
                    logger.warning(f"[AZURE DEBUG] This suggests the query structure is correct but there's no data")
            
            # Process rows - simplified format without grouping
            # Without grouping, row format is typically: [cost_amount, billing_month, currency]
            # Or just: [cost_amount, currency] depending on granularity
            logger.info(f"[AZURE DEBUG] Processing {len(rows)} rows (simplified query - total cost only)...")
            
            # Log column structure for debugging
            if hasattr(response, 'properties') and hasattr(response.properties, 'columns'):
                column_names = [col.name for col in response.properties.columns]
                logger.info(f"[AZURE DEBUG] Column names in response: {column_names}")
            
            for idx, row in enumerate(rows):
                logger.info(f"[AZURE DEBUG] Row {idx}: {row} (length: {len(row)})")
                logger.info(f"[AZURE DEBUG] Row types: {[type(cell).__name__ for cell in row]}")
                
                # Without grouping, the row format should be simpler
                # Typically: [PreTaxCost, BillingMonth, Currency] or [PreTaxCost, Currency]
                if len(row) >= 1:
                    # Cost amount should be in first position
                    cost_amount = float(row[0]) if row[0] is not None else 0.0
                    
                    # Currency might be in different positions depending on columns
                    currency = "USD"  # default
                    if len(row) >= 3:
                        currency = row[2] if row[2] and isinstance(row[2], str) and len(row[2]) == 3 else "USD"
                    elif len(row) >= 2:
                        # Check if row[1] is currency (3-letter code)
                        if isinstance(row[1], str) and len(row[1]) == 3:
                            currency = row[1]
                    
                    logger.info(f"[AZURE DEBUG] Extracted: amount={cost_amount}, currency={currency}")
                    
                    if cost_amount > 0:
                        # For simplified query, create a single "Total Cost" entry
                        costs.append({
                            'service_name': 'Total Cost',
                            'amount': cost_amount,
                            'currency': currency,
                            'start_date': start_date.strftime('%Y-%m-%d'),
                            'end_date': end_date.strftime('%Y-%m-%d')
                        })
                        logger.info(f"[AZURE DEBUG] ✅ Added total cost: {cost_amount} {currency}")
                    else:
                        logger.info(f"[AZURE DEBUG] Skipped row {idx}: amount is zero or negative ({cost_amount})")
                else:
                    logger.warning(f"[AZURE DEBUG] Row {idx} has insufficient data: {len(row)} elements")
            
            logger.info(f"[AZURE DEBUG] Total costs extracted: {len(costs)}")
            
        except ClientAuthenticationError as e:
            raise Exception(f"Azure authentication failed: {str(e)}")
        except HttpResponseError as e:
            if e.status_code == 403:
                raise Exception("Access denied. Please ensure the Service Principal has 'Cost Management Reader' role on the subscription.")
            elif e.status_code == 401:
                raise Exception("Unauthorized. Please check your Azure credentials.")
            elif e.status_code == 429:
                raise Exception("Rate limit exceeded. Please try again later.")
            else:
                raise Exception(f"Azure API error: {str(e)}")
        
        return costs
    
    def map_azure_cost_to_cost_model(
        self,
        azure_cost_data: Dict[str, Any],
        product_id: str,
        module_id: Optional[str] = None
    ) -> CostCreate:
        """
        Map Azure cost data to Cost model.
        
        Args:
            azure_cost_data: Dictionary with Azure cost data
            product_id: Product ID to associate cost with
            module_id: Optional module ID
            
        Returns:
            CostCreate schema object
        """
        service_name = azure_cost_data.get('service_name', 'Unknown')
        amount = azure_cost_data.get('amount', 0.0)
        currency = azure_cost_data.get('currency', 'USD')
        start_date_str = azure_cost_data.get('start_date')
        end_date_str = azure_cost_data.get('end_date')
        
        # Parse dates
        time_period_start = None
        time_period_end = None
        if start_date_str:
            time_period_start = datetime.strptime(start_date_str, '%Y-%m-%d')
        if end_date_str:
            time_period_end = datetime.strptime(end_date_str, '%Y-%m-%d')
        
        # Map service to scope and cost_type
        scope, cost_type = self._map_service_to_scope_and_type(service_name)
        
        return CostCreate(
            product_id=product_id,
            module_id=module_id,
            scope=scope,
            scope_id=None,  # Service-level costs don't have a specific scope_id
            category='run',  # All Azure costs are operational
            cost_type=cost_type,
            name=f"Azure - {service_name}",
            amount=amount,
            currency=currency,
            recurrence='monthly',
            cost_classification='run',  # Run/KTLO
            description=f"Synced from Azure Cost Management - {service_name}",
            time_period_start=time_period_start,
            time_period_end=time_period_end
        )
    
    def _map_service_to_scope_and_type(self, service_name: str) -> tuple:
        """
        Map Azure service name to scope and cost_type.
        
        Args:
            service_name: Azure service name
            
        Returns:
            Tuple of (scope, cost_type)
        """
        service_lower = service_name.lower()
        
        # Database services
        if any(db in service_lower for db in ['sql database', 'cosmos db', 'database', 'redis cache', 'sql data warehouse']):
            return ('database', 'infra')
        
        # Compute services (hardware)
        if any(compute in service_lower for compute in ['virtual machines', 'app service', 'container', 'functions', 'batch', 'cloud services']):
            return ('hardware', 'infra')
        
        # Storage services (software)
        if any(storage in service_lower for storage in ['storage', 'blob', 'file', 'queue', 'table', 'data lake']):
            return ('software', 'infra')
        
        # Networking services (software)
        if any(network in service_lower for network in ['load balancer', 'vpn gateway', 'application gateway', 'traffic manager', 'cdn', 'expressroute']):
            return ('software', 'infra')
        
        # Support services
        if 'support' in service_lower or 'advisor' in service_lower:
            return ('software', 'vendor')
        
        # Default to infrastructure/software
        return ('software', 'infra')

