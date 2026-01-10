"""AWS Cost Service for syncing costs from AWS Cost Explorer API."""
import boto3
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from botocore.exceptions import ClientError
from database.schema import CostCreate
from database.models.base_models import Cost


class AWSCostService:
    """Service for interacting with AWS Cost Explorer API."""
    
    def __init__(self, access_key_id: str, secret_access_key: str, region: str = "us-east-1"):
        """
        Initialize AWS Cost Explorer client.
        
        Args:
            access_key_id: AWS access key ID
            secret_access_key: AWS secret access key
            region: AWS region (default: us-east-1)
        """
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self.region = region
        self.client = boto3.client(
            'ce',
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region
        )
    
    async def test_connection(self) -> bool:
        """
        Test AWS credentials by making a simple API call.
        
        Returns:
            True if credentials are valid
            
        Raises:
            Exception: If credentials are invalid
        """
        try:
            # Try to get cost and usage for a small date range
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=1)
            
            response = self.client.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity='DAILY',
                Metrics=['BlendedCost']
            )
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'AccessDeniedException':
                raise Exception("Access denied. Please check IAM permissions for Cost Explorer API.")
            elif error_code == 'InvalidParameterException':
                raise Exception(f"Invalid parameters: {e.response.get('Error', {}).get('Message', '')}")
            else:
                raise Exception(f"AWS API error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to connect to AWS: {str(e)}")
    
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
        next_token = None
        
        while True:
            request_params = {
                'TimePeriod': {
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                'Granularity': 'MONTHLY',
                'Metrics': ['BlendedCost', 'UnblendedCost'],
                'GroupBy': [
                    {
                        'Type': 'DIMENSION',
                        'Key': 'SERVICE'
                    }
                ]
            }
            
            if next_token:
                request_params['NextPageToken'] = next_token
            
            try:
                response = self.client.get_cost_and_usage(**request_params)
                
                for result in response.get('ResultsByTime', []):
                    for group in result.get('Groups', []):
                        service_name = group['Keys'][0] if group['Keys'] else 'Unknown'
                        amount = float(group['Metrics']['BlendedCost']['Amount'])
                        currency = group['Metrics']['BlendedCost']['Unit']
                        
                        if amount > 0:  # Only include services with costs
                            costs.append({
                                'service_name': service_name,
                                'amount': amount,
                                'currency': currency,
                                'start_date': result['TimePeriod']['Start'],
                                'end_date': result['TimePeriod']['End']
                            })
                
                next_token = response.get('NextPageToken')
                if not next_token:
                    break
                    
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                if error_code == 'AccessDeniedException':
                    raise Exception("Access denied. Please check IAM permissions for Cost Explorer API.")
                elif error_code == 'LimitExceededException':
                    raise Exception("Rate limit exceeded. Please try again later.")
                else:
                    raise Exception(f"AWS API error: {str(e)}")
        
        return costs
    
    async def get_costs_by_dimension(
        self,
        dimension: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        Get costs grouped by a specific dimension.
        
        Args:
            dimension: Dimension to group by (e.g., 'SERVICE', 'LINKED_ACCOUNT', 'REGION')
            start_date: Start date for cost query
            end_date: End date for cost query
            
        Returns:
            List of cost data dictionaries
        """
        costs = []
        next_token = None
        
        while True:
            request_params = {
                'TimePeriod': {
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                'Granularity': 'MONTHLY',
                'Metrics': ['BlendedCost'],
                'GroupBy': [
                    {
                        'Type': 'DIMENSION',
                        'Key': dimension
                    }
                ]
            }
            
            if next_token:
                request_params['NextPageToken'] = next_token
            
            try:
                response = self.client.get_cost_and_usage(**request_params)
                
                for result in response.get('ResultsByTime', []):
                    for group in result.get('Groups', []):
                        dimension_value = group['Keys'][0] if group['Keys'] else 'Unknown'
                        amount = float(group['Metrics']['BlendedCost']['Amount'])
                        currency = group['Metrics']['BlendedCost']['Unit']
                        
                        if amount > 0:
                            costs.append({
                                'dimension': dimension,
                                'dimension_value': dimension_value,
                                'amount': amount,
                                'currency': currency,
                                'start_date': result['TimePeriod']['Start'],
                                'end_date': result['TimePeriod']['End']
                            })
                
                next_token = response.get('NextPageToken')
                if not next_token:
                    break
                    
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                if error_code == 'AccessDeniedException':
                    raise Exception("Access denied. Please check IAM permissions for Cost Explorer API.")
                elif error_code == 'LimitExceededException':
                    raise Exception("Rate limit exceeded. Please try again later.")
                else:
                    raise Exception(f"AWS API error: {str(e)}")
        
        return costs
    
    def map_aws_cost_to_cost_model(
        self,
        aws_cost_data: Dict[str, Any],
        product_id: str,
        module_id: Optional[str] = None
    ) -> CostCreate:
        """
        Map AWS cost data to Cost model.
        
        Args:
            aws_cost_data: Dictionary with AWS cost data
            product_id: Product ID to associate cost with
            module_id: Optional module ID
            
        Returns:
            CostCreate schema object
        """
        service_name = aws_cost_data.get('service_name', 'Unknown')
        amount = aws_cost_data.get('amount', 0.0)
        currency = aws_cost_data.get('currency', 'USD')
        start_date_str = aws_cost_data.get('start_date')
        end_date_str = aws_cost_data.get('end_date')
        
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
            category='run',  # All AWS costs are operational
            cost_type=cost_type,
            name=f"AWS - {service_name}",
            amount=amount,
            currency=currency,
            recurrence='monthly',
            cost_classification='run',  # Run/KTLO
            description=f"Synced from AWS Cost Explorer - {service_name}",
            time_period_start=time_period_start,
            time_period_end=time_period_end
        )
    
    def _map_service_to_scope_and_type(self, service_name: str) -> tuple:
        """
        Map AWS service name to scope and cost_type.
        
        Args:
            service_name: AWS service name
            
        Returns:
            Tuple of (scope, cost_type)
        """
        service_lower = service_name.lower()
        
        # Database services
        if any(db in service_lower for db in ['rds', 'dynamodb', 'redshift', 'elasticache', 'documentdb', 'neptune']):
            return ('database', 'infra')
        
        # Compute services (hardware)
        if any(compute in service_lower for compute in ['ec2', 'ecs', 'lambda', 'batch', 'lightsail', 'fargate']):
            return ('hardware', 'infra')
        
        # Storage/CDN services (software)
        if any(storage in service_lower for storage in ['s3', 'cloudfront', 'efs', 'glacier', 'storage gateway']):
            return ('software', 'infra')
        
        # Support services
        if 'support' in service_lower:
            return ('software', 'vendor')
        
        # Default to infrastructure/software
        return ('software', 'infra')

