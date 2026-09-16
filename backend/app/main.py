from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import router as api_router
import time
import logging
from starlette.requests import Request

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] %(message)s')
logger = logging.getLogger("ArogyaPulse")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=f"ArogyaPulse AI Multi-Agent Clinical Triage Engine engineered by {settings.AUTHOR}"
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"[PIPELINE-START] {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    logger.info(f"[PIPELINE-COMPLETE] {request.method} {request.url.path} - Status: {response.status_code} - {process_time:.1f}ms")
    return response

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "system": "ArogyaPulse AI Clinical Intelligence Engine",
        "version": settings.VERSION,
        "author": settings.AUTHOR,
        "engine": "Multi-Agent Clinical Decision Support (LangGraph + Supabase pgvector)"
    }
