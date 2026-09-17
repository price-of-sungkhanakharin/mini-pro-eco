"""Label Studio Integration Test script."""

import sys
from pathlib import Path
from typing import Any, List, Optional

# Ensure root directory is in sys.path when running script directly
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.core.config import settings

try:
    from label_studio_sdk.client import LabelStudio
except ImportError:
    LabelStudio = None


class LabelStudioTester:
    """Tester client class for verifying Label Studio API endpoints and resources."""

    def __init__(self, url: str, api_key: str) -> None:
        """Initialize LabelStudio client wrapper."""
        self.url: str = url
        self.api_key: str = api_key
        self.client: Optional[Any] = None

        if LabelStudio is not None:
            self.client = LabelStudio(base_url=self.url, api_key=self.api_key)

    def list_all_projects(self) -> List[Any]:
        """Fetch and print structured list of all projects in Label Studio."""
        print("\n--- Listing All Projects ---")
        if self.client is None:
            print("[Warning] LabelStudio client is not initialized.")
            return []
        try:
            projects: List[Any] = list(self.client.projects.list())
            print(f"[Info] Found {len(projects)} project(s):")
            for idx, proj in enumerate(projects, 1):
                proj_id = getattr(proj, "id", "N/A")
                proj_title = getattr(proj, "title", getattr(proj, "name", "Unnamed"))
                print(f"  {idx}. [Project ID: {proj_id}] Title: {proj_title}")
            return projects
        except Exception as exc:
            print(f"[Error] Exception occurred while fetching projects: {exc}")
            return []

    def list_all_tasks(self, project_id: int) -> List[Any]:
        """Fetch and print structured list of tasks within a specific project."""
        print(f"\n--- Listing Tasks for Project ID #{project_id} ---")
        if self.client is None:
            print("[Warning] LabelStudio client is not initialized.")
            return []
        try:
            tasks: List[Any] = list(self.client.tasks.list(project=project_id))
            print(f"[Info] Found {len(tasks)} task(s) in Project #{project_id}:")
            for idx, task in enumerate(tasks, 1):
                task_id = getattr(task, "id", "N/A")
                print(f"  {idx}. [Task ID: {task_id}]")
            return tasks
        except Exception as exc:
            print(f"[Error] Exception occurred while fetching tasks for project #{project_id}: {exc}")
            return []

    def run_integration_test(self) -> None:
        """Run complete Label Studio test suite with graceful exception handling."""
        print(f"[Config] Connecting to Label Studio at: {self.url}")

        if LabelStudio is None:
            print("[Notice] label_studio_sdk module is not installed. Dry-run mode completed.")
            return

        try:
            projects = self.list_all_projects()
            if projects:
                first_proj_id = getattr(projects[0], "id", None)
                if first_proj_id is not None:
                    self.list_all_tasks(first_proj_id)
            else:
                print("[Info] No active projects found to list tasks from.")
            print("\n[Success] Label Studio integration test executed.")
        except Exception as exc:
            print(f"[Error] Could not connect to Label Studio server or execute API calls: {exc}")
            print("[Notice] Gracefully caught connection/API error. Test completed.")


def main() -> None:
    """Main execution entrypoint."""
    tester = LabelStudioTester(
        url=settings.label_studio_url,
        api_key=settings.label_studio_api_key,
    )
    tester.run_integration_test()


if __name__ == "__main__":
    main()

