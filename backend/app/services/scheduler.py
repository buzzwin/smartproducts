"""Scheduler service for running periodic email processing."""
import os
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import httpx


class EmailScheduler:
    """Scheduler for daily email processing."""
    
    def __init__(self):
        """Initialize the scheduler."""
        self.scheduler = AsyncIOScheduler()
        self.api_url = os.getenv("API_URL", "http://localhost:8000")
        self.schedule_time = os.getenv("EMAIL_AGENT_SCHEDULE_TIME", "09:00")
        self.is_running = False
    
    def _parse_schedule_time(self) -> dict:
        """Parse schedule time string (HH:MM) into hour and minute."""
        try:
            hour, minute = map(int, self.schedule_time.split(":"))
            return {"hour": hour, "minute": minute}
        except:
            # Default to 9 AM
            return {"hour": 9, "minute": 0}
    
    async def _process_emails_job(self):
        """Job function to process emails."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/api/email-agent/process",
                    params={"max_emails": 20},
                    timeout=300.0  # 5 minute timeout
                )
                if response.status_code == 200:
                    result = response.json()
                    print(f"Email processing completed: {result.get('processed_count', 0)} emails processed")
                else:
                    print(f"Email processing failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Error in scheduled email processing: {str(e)}")
    
    def start(self):
        """Start the scheduler."""
        if self.is_running:
            return
        
        schedule_config = self._parse_schedule_time()
        
        # Schedule daily job
        self.scheduler.add_job(
            self._process_emails_job,
            trigger=CronTrigger(
                hour=schedule_config["hour"],
                minute=schedule_config["minute"]
            ),
            id="daily_email_processing",
            name="Daily Email Processing",
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        print(f"Email scheduler started. Daily processing scheduled for {self.schedule_time}")
    
    def stop(self):
        """Stop the scheduler."""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            print("Email scheduler stopped")
    
    def trigger_now(self):
        """Manually trigger email processing now."""
        asyncio.create_task(self._process_emails_job())


# Global scheduler instance
_email_scheduler = None


def get_email_scheduler() -> EmailScheduler:
    """Get the global email scheduler instance."""
    global _email_scheduler
    if _email_scheduler is None:
        _email_scheduler = EmailScheduler()
    return _email_scheduler

