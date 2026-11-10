FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/rh-venv && /opt/rh-venv/bin/pip install --no-cache-dir pypdf==5.9.0 \
    && mkdir -p /root/.ssh && chmod 700 /root/.ssh
WORKDIR /app
COPY . .
ENV NODE_ENV=production RH_PYTHON=/opt/rh-venv/bin/python
CMD ["node", "bootstrap-render.cjs"]
