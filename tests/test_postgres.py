"""PostgreSQL Integration and CRUD Operations Test script."""

import sys
from pathlib import Path
from typing import Any, Dict, List

# Ensure root directory is in sys.path when running script directly
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError

from backend.app.core.config import settings


class PostgresCRUDTester:
    """Manager class for testing PostgreSQL CRUD operations."""

    def __init__(self, engine: Engine) -> None:
        """Initialize PostgresCRUDTester with a SQLAlchemy Engine instance."""
        self.engine: Engine = engine

    def create_table(self) -> None:
        """Create the students table if it does not exist."""
        query = text(
            "CREATE TABLE IF NOT EXISTS students ("
            "id SERIAL PRIMARY KEY, "
            "name VARCHAR(100), "
            "age INT, "
            "major VARCHAR(100))"
        )
        with self.engine.begin() as conn:
            conn.execute(query)
        print("[CRUD] Function create_table executed successfully.")

    def insert_data(
        self,
        name: str = "John Doe",
        age: int = 21,
        major: str = "AI Engineering",
    ) -> None:
        """Insert a student record into the database."""
        query = text(
            "INSERT INTO students (name, age, major) "
            "VALUES (:name, :age, :major)"
        )
        with self.engine.begin() as conn:
            conn.execute(query, {"name": name, "age": age, "major": major})
        print(f"[CRUD] Function insert_data executed successfully ({name}).")

    def fetch_all_records(self) -> List[Dict[str, Any]]:
        """Retrieve all student records from the database."""
        query = text("SELECT id, name, age, major FROM students")
        with self.engine.connect() as conn:
            result = conn.execute(query)
            return [dict(row._mapping) for row in result]

    def display_tabular_data(self, section_title: str = "Students Table") -> None:
        """Display records in a formatted tabular layout."""
        records = self.fetch_all_records()
        print(f"\n--- {section_title} ---")
        if not records:
            print("  (Table is empty)")
            return

        header = f"| {'ID':<4} | {'Name':<22} | {'Age':<5} | {'Major':<20} |"
        divider = "-" * len(header)
        print(divider)
        print(header)
        print(divider)
        for r in records:
            print(
                f"| {r['id']:<4} | {r['name']:<22} | {r['age']:<5} | {r['major']:<20} |"
            )
        print(divider)

    def update_data(
        self, name: str = "John Doe", new_age: int = 22
    ) -> None:
        """Update student age by name."""
        query = text("UPDATE students SET age = :new_age WHERE name = :name")
        with self.engine.begin() as conn:
            conn.execute(query, {"new_age": new_age, "name": name})
        print(f"[CRUD] Function update_data executed successfully (set age={new_age}).")

    def delete_data(self, name: str = "John Doe") -> None:
        """Delete student record by name."""
        query = text("DELETE FROM students WHERE name = :name")
        with self.engine.begin() as conn:
            conn.execute(query, {"name": name})
        print(f"[CRUD] Function delete_data executed successfully for '{name}'.")

    def drop_table(self) -> None:
        """Drop the students table from the database."""
        query = text("DROP TABLE IF EXISTS students")
        with self.engine.begin() as conn:
            conn.execute(query)
        print("[CRUD] Function drop_table executed successfully.")

    def run_all_tests(self) -> None:
        """Run complete CRUD test workflow sequentially."""
        print("Starting PostgreSQL test suite...")
        try:
            print("\nStep 1: Creating table...")
            self.create_table()

            print("\nStep 2: Inserting data...")
            self.insert_data()
            self.display_tabular_data("State After Insert")

            print("\nStep 3: Updating data...")
            self.update_data()
            self.display_tabular_data("State After Update")

            print("\nStep 4: Deleting data...")
            self.delete_data()
            self.display_tabular_data("State After Delete")

            print("\nStep 5: Dropping table...")
            self.drop_table()

            print("\nAll PostgreSQL tests completed successfully.")
        except OperationalError as exc:
            print("=================================================================")
            print("❌ POSTGRESQL CONNECTION ERROR DETECTED")
            print("=================================================================")
            print("  Reason: Password authentication failed or database unreachable.")
            print(f"  Detail: {exc}")
            print("-----------------------------------------------------------------")
            print("💡 Troubleshooting Tip:")
            print("  1. Open your `.env` file at project root.")
            print("  2. Update `POSTGRES_PASSWORD=<your_actual_postgres_password>`.")
            print("  3. Verify PostgreSQL service is running on localhost:5432.")
            print("=================================================================")


# Engine setup for execution
DATABASE_URL: str = (
    f"postgresql+psycopg2://{settings.postgres_user}:{settings.postgres_password}"
    f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
)
engine: Engine = create_engine(DATABASE_URL)


def run_all_tests() -> None:
    """Modular entrypoint function for executing tests."""
    tester = PostgresCRUDTester(engine)
    tester.run_all_tests()


if __name__ == "__main__":
    run_all_tests()

