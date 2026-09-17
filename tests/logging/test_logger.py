import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend.app.utils.logger import get_custom_logger, log_execution, generate_sample_logs
import time

logger = get_custom_logger("TestLogger", "DEBUG")
backend_logger = get_custom_logger("BackendLogger", "DEBUG", system_name="backend")
database_logger = get_custom_logger("DatabaseLogger", "DEBUG", system_name="database")
minio_logger = get_custom_logger("MinIOLogger", "DEBUG", system_name="minio")

@log_execution("test_success_operation")
def successful_function():
    time.sleep(0.1)
    return "Success"

@log_execution("test_fail_operation")
def failing_function():
    time.sleep(0.1)
    raise ValueError("This is a test error")

def main():
    logger.debug("This is a debug message", extra={"operation": "debug_test"})
    backend_logger.info("This is a backend info message", extra={"operation": "info_test"})
    database_logger.warning("This is a database warning message", extra={"operation": "warning_test"})
    minio_logger.error("This is a minio error message", extra={"operation": "error_test"})
    
    print("Testing success function...")
    successful_function()
    
    print("Testing failing function...")
    try:
        failing_function()
    except ValueError:
        pass
        
    print("Generating sample logs...")
    generate_sample_logs()
    print("Logging tests completed.")

if __name__ == "__main__":
    main()
