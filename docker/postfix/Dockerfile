FROM alpine:latest

RUN apk add --no-cache postfix curl bash

COPY main.cf /etc/postfix/main.cf
COPY master.cf /etc/postfix/master.cf
COPY ingest-curl.sh /usr/local/bin/ingest-curl.sh
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /usr/local/bin/ingest-curl.sh && \
    chmod +x /entrypoint.sh && \
    newaliases

EXPOSE 25

ENTRYPOINT ["/entrypoint.sh"]
