# Run cobalt's official image, without copying or modifying its API source.
FROM ghcr.io/imputnet/cobalt:11
COPY --chown=node:node --chmod=755 backend/start.sh /app/sebi-start.sh
CMD ["/app/sebi-start.sh"]
