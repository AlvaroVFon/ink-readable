FROM golang:1.26 AS builder

WORKDIR /backend

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o ink-readable ./cmd

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /backend/ink-readable .

CMD ["./ink-readable"]

