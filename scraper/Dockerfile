# Use a lightweight Python 3.11 image
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies (needed for some Python packages)
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user (Hugging Face security requirement)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set Python to run in unbuffered mode (critical for HuggingFace logs)
ENV PYTHONUNBUFFERED=1

# Copy requirements first to leverage Docker cache
COPY --chown=user requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY --chown=user . .

# Expose port 7860 (HuggingFace default)
EXPOSE 7860

# Health check to ensure the service is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860').read()"

# Run the consolidated root daemon (binds port 7860 + uses the current Groq scraper)
CMD ["python", "run_local.py"]