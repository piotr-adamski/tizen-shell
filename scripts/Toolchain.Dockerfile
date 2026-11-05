# Copyright 2026 Piotr Adamski (piotr-adamski)
# SPDX-License-Identifier: Apache-2.0
FROM ubuntu:22.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 python3-distutils python-is-python3 perl make gcc g++ libxml2 cmake ca-certificates && rm -rf /var/lib/apt/lists/*
