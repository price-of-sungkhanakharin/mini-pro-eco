import logging
import json
import time
from datetime import datetime, timezone
import traceback
from functools import wraps
import os

class CustomJsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "system_name": record.name,
            "log_level": record.levelname,
            "location": f"{record.filename}:{record.lineno}",
            "operation": getattr(record, "operation", "UNKNOWN"),
            "status": getattr(record, "status", "INFO"),
            "duration_ms": getattr(record, "duration_ms", None),
            "message": record.getMessage(),
            "details": getattr(record, "details", None),
        }

        # Detailed error capture extra fields
        extra_fields = [
            "path",
            "method",
            "status_code",
            "client_ip",
            "error_type",
            "error_detail",
            "traceback",
        ]
        for field in extra_fields:
            val = getattr(record, field, None)
            if val is not None:
                log_record[field] = val

        if record.exc_info:
            if "traceback" not in log_record:
                log_record["traceback"] = self.formatException(record.exc_info)
            if "error_type" not in log_record and record.exc_info[0]:
                log_record["error_type"] = record.exc_info[0].__name__
        elif getattr(record, "exception", None):
            if "traceback" not in log_record:
                log_record["traceback"] = getattr(record, "exception")
            
        return json.dumps({k: v for k, v in log_record.items() if v is not None})


JSONFormatter = CustomJsonFormatter


def get_custom_logger(name="AIEcosystem", log_level="DEBUG", system_name=None):
    logger = logging.getLogger(name)
    logger.setLevel(log_level)
    
    # Avoid duplicate handlers if logger is already configured
    if not logger.handlers:
        os.makedirs("logs", exist_ok=True)
        
        formatter = CustomJsonFormatter()
        
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)
        
        file_handler = logging.FileHandler("logs/app.log")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        if system_name:
            system_file_handler = logging.FileHandler(f"logs/{system_name}.log")
            system_file_handler.setFormatter(formatter)
            logger.addHandler(system_file_handler)
            
    return logger


logger = get_custom_logger("AIEcosystem", system_name="backend")


def log_success(op_name, duration_ms, details=None):
    logger.info(
        f"Operation {op_name} succeeded",
        extra={"operation": op_name, "status": "SUCCESS", "duration_ms": duration_ms, "details": details}
    )


def log_fail(op_name, error, context=None):
    logger.error(
        f"Operation {op_name} failed: {str(error)}",
        extra={"operation": op_name, "status": "FAIL", "details": context, "exception": traceback.format_exc()}
    )


def log_execution(op_name):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration_ms = int((time.time() - start_time) * 1000)
                log_success(op_name, duration_ms)
                return result
            except Exception as e:
                log_fail(op_name, e, context={"args": args, "kwargs": kwargs})
                raise
        return wrapper
    return decorator


def generate_sample_logs():
    os.makedirs("logs", exist_ok=True)
    sample_log = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "system_name": "SampleSystem",
        "log_level": "INFO",
        "location": "sample.py:1",
        "operation": "sample_operation",
        "status": "SUCCESS",
        "message": "This is a sample log line."
    }
    sample_json = json.dumps(sample_log) + "\n"
    
    for filename in ["app.log.sample", "backend.log.sample", "system.log.sample", "database.log.sample", "minio.log.sample"]:
        with open(f"logs/{filename}", "w") as f:
            f.write(sample_json)
