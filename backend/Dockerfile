FROM golang:1.26 AS builder

WORKDIR /backend

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o ink-readable ./cmd

FROM alpine:3.22 AS app

WORKDIR /app

COPY --from=builder /backend/ink-readable .

CMD ["./ink-readable"]

FROM golang:1.26 AS migrate-builder

RUN CGO_ENABLED=0 go install -tags 'sqlite' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.19.1

FROM alpine:3.22 AS migrate

COPY --from=migrate-builder /go/bin/migrate /usr/local/bin/migrate

ENTRYPOINT ["migrate"]
