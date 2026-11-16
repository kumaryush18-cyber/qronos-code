FROM alpine AS base

# Disable the runtime transpiler cache by default inside Docker containers.
# On ephemeral containers, the cache is not useful
ARG BUN_RUNTIME_TRANSPILER_CACHE_PATH=0
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=${BUN_RUNTIME_TRANSPILER_CACHE_PATH}
RUN apk add libgcc libstdc++ ripgrep

FROM base AS build-amd64
# qronos_change start
COPY dist/@qronos-ai/cli-linux-x64-baseline-musl/bin/qronos dist/@qronos-ai/cli-linux-x64-baseline-musl/bin/bwrap /usr/local/bin/
COPY dist/@qronos-ai/cli-linux-x64-baseline-musl/bin/licenses /usr/local/share/licenses/qronos
# qronos_change end

FROM base AS build-arm64
# qronos_change start
COPY dist/@qronos-ai/cli-linux-arm64-musl/bin/qronos dist/@qronos-ai/cli-linux-arm64-musl/bin/bwrap /usr/local/bin/
COPY dist/@qronos-ai/cli-linux-arm64-musl/bin/licenses /usr/local/share/licenses/qronos
# qronos_change end

ARG TARGETARCH
# qronos_change start
FROM build-${TARGETARCH} AS openshell
RUN qronos --version
ENTRYPOINT ["qronos"]
COPY script/qronos/openshell/qronos.json /etc/qronos/qronos.json
ENV QRONOS_DISABLE_MODELS_FETCH=1 QRONOS_DISABLE_SESSION_INGEST=1 QRONOS_DISABLE_PRESENCE=1
# qronos_change end

FROM build-${TARGETARCH}
RUN qronos --version
ENTRYPOINT ["qronos"]
