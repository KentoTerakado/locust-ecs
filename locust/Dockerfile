#FROM python:3.11.9-slim-bookworm AS developer
FROM --platform=linux/x86_64 python:3.11.9 AS developer

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

#RUN apt-get update
RUN pip install locust

VOLUME /locust
COPY ./sinario /locust

WORKDIR /locust
# locust -f ./locustfile.py
